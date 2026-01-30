/**
 * Email Notification API for Tierra Madre Quotation System
 *
 * Uses Resend for email delivery with branded templates.
 *
 * Environment Variables Required:
 * - RESEND_API_KEY: Your Resend API key
 * - APP_URL: Production URL (defaults to Vercel URL)
 * - ADMIN_EMAILS: Comma-separated list of admin emails
 * - EMAIL_FROM: Sender email (must be verified in Resend)
 */

import emailTemplates from './_lib/email-templates.js';
import {
  getSheetsClient,
  isGoogleConfigured,
  SPREADSHEET_ID,
  getSheetNames,
  findColumnIndex,
} from './_lib/index.js';

// Default configuration
const DEFAULT_FROM = 'Tierra Madre <notificaciones@tierramadre.studio>';
const DEFAULT_APP_URL = 'https://tierra-madre-studio.vercel.app';

// Email types for easy reference
export const EMAIL_TYPES = {
  NEW_QUOTATION_REQUEST: 'newQuotationRequest',
  PROVIDER_SUBMITTED_QUOTATION: 'providerSubmittedQuotation',
  QUOTATION_STATUS_CHANGED: 'quotationStatusChanged',
  QUOTATION_REQUEST_CANCELLED: 'quotationRequestCancelled',
  PRODUCT_REQUEST_FORWARDED: 'productRequestForwarded',
  PRODUCT_REQUEST_STATUS_UPDATE: 'productRequestStatusUpdate',
};

/**
 * Send an email using Resend
 */
async function sendWithResend(to, subject, html, from) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not configured - email not sent');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: from || process.env.EMAIL_FROM || DEFAULT_FROM,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Email] Resend error:', data);
      return { success: false, error: data.message || 'Failed to send email' };
    }

    console.log('[Email] Sent successfully:', { to, subject, id: data.id });
    return { success: true, id: data.id };
  } catch (error) {
    console.error('[Email] Send error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get admin email addresses
 */
function getAdminEmails() {
  const adminEmails = process.env.ADMIN_EMAILS;
  if (!adminEmails) {
    console.warn('[Email] ADMIN_EMAILS not configured');
    return [];
  }
  return adminEmails.split(',').map(email => email.trim()).filter(Boolean);
}

/**
 * Get app URL for links in emails
 */
function getAppUrl() {
  return process.env.APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : DEFAULT_APP_URL;
}

/**
 * Get provider email from Asesores sheet
 * Looks up the unique provider (role = "Proveedor") and returns their email from column F (Instagram)
 *
 * @returns {Promise<{email: string, name: string} | null>} Provider info or null if not found
 */
async function getProviderFromSheet() {
  if (!isGoogleConfigured()) {
    console.warn('[Email] Google not configured - cannot lookup provider email');
    return null;
  }

  try {
    const sheets = getSheetsClient();
    const sheetNames = await getSheetNames(sheets);

    // Use sheet 3 (index 2) for asesores data
    let asesoresSheet = sheetNames[2];
    if (!asesoresSheet) {
      asesoresSheet = sheetNames.find(name =>
        name.toLowerCase().includes('asesor') ||
        name.toLowerCase().includes('embajador')
      ) || sheetNames[0];
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${asesoresSheet}'!A:Z`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      console.warn('[Email] No asesores data found');
      return null;
    }

    const headers = rows[0];
    const nameIndex = findColumnIndex(headers, ['nombre', 'name', 'asesor']);
    const roleIndex = findColumnIndex(headers, ['datos', 'rol', 'role', 'tipo']);
    const emailIndex = findColumnIndex(headers, ['instagram', 'ig', 'email']);

    if (roleIndex === -1 || emailIndex === -1) {
      console.warn('[Email] Role or email column not found in Asesores sheet');
      return null;
    }

    // Find the provider (role = "Proveedor")
    const dataRows = rows.slice(1);
    for (const row of dataRows) {
      const role = String(row[roleIndex] || '').toLowerCase().trim();
      if (role === 'proveedor') {
        const email = row[emailIndex];
        const name = nameIndex !== -1 ? row[nameIndex] : '';
        if (email) {
          console.log('[Email] Found provider:', { name, email });
          return { email: email.trim(), name: name.trim() };
        }
      }
    }

    console.warn('[Email] No provider found in Asesores sheet');
    return null;
  } catch (error) {
    console.error('[Email] Error looking up provider:', error);
    return null;
  }
}

/**
 * Get provider email (convenience wrapper)
 * @returns {Promise<string | null>} Provider email or null
 */
async function getProviderEmail() {
  const provider = await getProviderFromSheet();
  return provider?.email || null;
}

/**
 * Send notification email
 *
 * @param {string} type - Email type from EMAIL_TYPES
 * @param {object} data - Template data
 * @param {string|string[]} to - Recipient email(s)
 */
export async function sendNotificationEmail(type, data, to) {
  const templateFn = emailTemplates[type];

  if (!templateFn) {
    console.error(`[Email] Unknown template type: ${type}`);
    return { success: false, error: `Unknown template: ${type}` };
  }

  const appUrl = getAppUrl();
  const { subject, html } = templateFn({ ...data, appUrl });

  return sendWithResend(to, subject, html);
}

/**
 * API Handler for direct email sending
 * Can be called internally by other API routes
 */
export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, data, to, toAdmins } = req.body;

  // Validate required fields
  if (!type) {
    return res.status(400).json({ error: 'Missing email type' });
  }

  if (!data) {
    return res.status(400).json({ error: 'Missing email data' });
  }

  // Determine recipients
  let recipients = to;

  if (toAdmins) {
    const adminEmails = getAdminEmails();
    if (adminEmails.length === 0) {
      return res.status(500).json({ error: 'No admin emails configured' });
    }
    recipients = to ? [...(Array.isArray(to) ? to : [to]), ...adminEmails] : adminEmails;
  }

  if (!recipients || (Array.isArray(recipients) && recipients.length === 0)) {
    return res.status(400).json({ error: 'No recipients specified' });
  }

  // Send email
  const result = await sendNotificationEmail(type, data, recipients);

  if (result.success) {
    return res.status(200).json({ success: true, id: result.id });
  } else {
    return res.status(500).json({ success: false, error: result.error });
  }
}

// Export helper for other API files to use
export { sendWithResend, getAdminEmails, getAppUrl, getProviderEmail, getProviderFromSheet };
