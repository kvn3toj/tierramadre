/**
 * Vercel Serverless Function - Generate Invitation Link
 *
 * Creates a unique invitation token for Embajadores/Admins to share.
 * Token is stored in Google Sheets "Invitaciones" tab.
 * The 1-hour timer starts when the guest opens the link, not when created.
 */

import { google } from 'googleapis';
import crypto from 'crypto';

// Sheet configuration
const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';
const INVITATIONS_SHEET = 'Invitaciones';

/**
 * Initialize Google Sheets API with service account credentials
 */
function getSheetsClient() {
  try {
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
    );

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return google.sheets({ version: 'v4', auth });
  } catch (error) {
    console.error('Error initializing Sheets client:', error);
    throw new Error('Failed to initialize Google Sheets client');
  }
}

/**
 * Verify user is authorized to create invitations (Embajador or Admin)
 */
async function verifyCreator(sheets, email) {
  try {
    // Get sheet metadata to find asesores sheet
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const sheetNames = metadata.data.sheets.map(s => s.properties.title);
    let asesoresSheet = sheetNames[2]; // Third sheet is typically asesores

    if (!asesoresSheet) {
      asesoresSheet = sheetNames.find(name =>
        name.toLowerCase().includes('asesor') ||
        name.toLowerCase().includes('embajador')
      ) || sheetNames[0];
    }

    // Read asesores data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${asesoresSheet}'!A:Z`,
    });

    const rows = response.data.values || [];
    if (!rows || rows.length === 0) {
      return { authorized: false, error: 'No users found' };
    }

    // Find column indices
    const headers = rows[0].map(h => h ? h.toLowerCase().trim() : '');
    const roleIndex = headers.findIndex(h =>
      h === 'datos' || h === 'rol' || h === 'role' || h === 'tipo'
    );
    const emailIndex = headers.findIndex(h =>
      h.includes('email') || h.includes('correo') || h.includes('instagram')
    );
    const nameIndex = headers.findIndex(h =>
      h === 'nombre' || h === 'name' || h.includes('asesor')
    );
    const estadoIndex = headers.findIndex(h => h === 'estado' || h === 'status');

    const normalizedEmail = email.toLowerCase().trim();
    const dataRows = rows.slice(1);

    for (const row of dataRows) {
      // Check if active
      if (estadoIndex !== -1) {
        const estado = String(row[estadoIndex] || '').toLowerCase();
        if (estado === 'inactivo' || estado === 'inactive') continue;
      }

      const userEmail = emailIndex !== -1 ? String(row[emailIndex] || '').toLowerCase().trim() : '';

      if (userEmail === normalizedEmail) {
        const role = roleIndex !== -1 ? (row[roleIndex] || '').trim() : '';
        const name = nameIndex !== -1 ? row[nameIndex] : email.split('@')[0];
        const roleLower = role.toLowerCase();

        // Only Embajadores and Admins can create invitations
        if (roleLower.includes('embajador') || roleLower.includes('ambassador') ||
            roleLower.includes('admin') || roleLower.includes('administrador')) {
          return { authorized: true, name, role };
        } else {
          return { authorized: false, error: 'Only Embajadores and Admins can create invitations' };
        }
      }
    }

    return { authorized: false, error: 'User not found' };
  } catch (error) {
    console.error('Error verifying creator:', error);
    return { authorized: false, error: 'Verification failed' };
  }
}

/**
 * Ensure Invitaciones sheet exists with headers
 */
async function ensureInvitationsSheet(sheets) {
  try {
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const sheetNames = metadata.data.sheets.map(s => s.properties.title);

    if (!sheetNames.includes(INVITATIONS_SHEET)) {
      // Create the sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [{
            addSheet: {
              properties: { title: INVITATIONS_SHEET }
            }
          }]
        }
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${INVITATIONS_SHEET}'!A1:G1`,
        valueInputOption: 'RAW',
        resource: {
          values: [['Token', 'CreatorEmail', 'CreatorName', 'CreatedAt', 'ActivatedAt', 'ExpiresAt', 'Status']]
        }
      });
    }

    return true;
  } catch (error) {
    console.error('Error ensuring invitations sheet:', error);
    throw error;
  }
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email is required',
    });
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({
      success: false,
      error: 'Google Service Account not configured',
    });
  }

  try {
    const sheets = getSheetsClient();

    // Verify the creator is authorized
    const verification = await verifyCreator(sheets, email);
    if (!verification.authorized) {
      return res.status(403).json({
        success: false,
        error: verification.error,
      });
    }

    // Ensure invitations sheet exists
    await ensureInvitationsSheet(sheets);

    // Generate unique token
    const token = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // Append to invitations sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${INVITATIONS_SHEET}'!A:G`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [[
          token,
          email,
          verification.name,
          createdAt,
          '', // ActivatedAt - empty until guest opens
          '', // ExpiresAt - empty until guest opens
          'pending'
        ]]
      }
    });

    // Generate the invitation URL
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://tierra-madre-studio.vercel.app';
    const inviteUrl = `${baseUrl}/invite/${token}`;

    return res.status(200).json({
      success: true,
      token,
      url: inviteUrl,
      createdAt,
      createdBy: {
        email,
        name: verification.name,
        role: verification.role,
      },
    });

  } catch (error) {
    console.error('Error generating invitation:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate invitation',
      message: error.message,
    });
  }
}
