/**
 * Vercel Serverless Function - Validate User Email Against Google Sheets
 *
 * Checks if a user's email exists in the Asesores sheet and returns their role.
 * Used for Google OAuth authentication flow.
 */

import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';

// Sheet configuration
const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

/**
 * Initialize Google Sheets API with service account credentials
 */
function getSheetsClient() {
  try {
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
    );

    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    return new sheets_v4.Sheets({ auth });
  } catch (error) {
    console.error('Error initializing Sheets client:', error);
    throw new Error('Failed to initialize Google Sheets client');
  }
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get email from query params (GET) or body (POST)
  const email = req.method === 'GET' ? req.query.email : req.body?.email;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email is required',
    });
  }

  // Check if service account key is configured
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({
      success: false,
      error: 'Google Service Account not configured',
    });
  }

  try {
    const sheets = getSheetsClient();

    // Get sheet metadata to find correct sheet name
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const sheetNames = metadata.data.sheets.map(s => s.properties.title);

    // Use sheet 3 (index 2) for asesores data
    let asesoresSheet = sheetNames[2];

    if (!asesoresSheet) {
      asesoresSheet = sheetNames.find(name =>
        name.toLowerCase().includes('asesor') ||
        name.toLowerCase().includes('embajador')
      ) || sheetNames[0];
    }

    // Read all data from asesores sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${asesoresSheet}'!A:Z`,
    });

    const rows = response.data.values || [];

    if (!rows || rows.length === 0) {
      return res.status(200).json({
        success: false,
        error: 'No users found in the system',
        isAuthorized: false,
      });
    }

    // Find relevant column indices from header row
    const headers = rows[0].map(h => h ? h.toLowerCase().trim() : '');

    // Column mapping for Asesores sheet:
    // A=ID, B=Nombre, C=Datos(rol), D=WhatsApp, E=Especialidad, F=Instagram/Email, G=Estado
    const nameColumnIndex = headers.findIndex(h =>
      h === 'nombre' || h === 'name' || h.includes('asesor')
    );
    const roleIndex = headers.findIndex(h =>
      h === 'datos' || h === 'rol' || h === 'role' || h === 'tipo'
    );
    const emailIndex = headers.findIndex(h =>
      h.includes('email') || h.includes('correo') || h.includes('instagram')
    );
    const estadoIndex = headers.findIndex(h => h === 'estado' || h === 'status');

    // Normalize email for comparison
    const normalizedEmail = email.toLowerCase().trim();

    // Search for user by email
    const dataRows = rows.slice(1);

    for (const row of dataRows) {
      // Check if user is active
      if (estadoIndex !== -1) {
        const estado = String(row[estadoIndex] || '').toLowerCase();
        if (estado === 'inactivo' || estado === 'inactive') continue;
      }

      // Get user email from sheet
      const userEmail = emailIndex !== -1 ? String(row[emailIndex] || '').toLowerCase().trim() : '';

      if (userEmail === normalizedEmail) {
        const name = nameColumnIndex !== -1 ? row[nameColumnIndex] : '';
        const role = roleIndex !== -1 ? (row[roleIndex] || 'Asesor').trim() : 'Asesor';

        // Determine access level based on role
        let accessLevel = 'full'; // Default for authenticated users
        const roleLower = role.toLowerCase();

        if (roleLower.includes('admin') || roleLower.includes('administrador')) {
          accessLevel = 'admin';
        } else if (roleLower.includes('embajador') || roleLower.includes('ambassador')) {
          accessLevel = 'full';
        } else if (roleLower.includes('asesor') || roleLower.includes('vendedor')) {
          accessLevel = 'full';
        }

        return res.status(200).json({
          success: true,
          isAuthorized: true,
          user: {
            name: name || email.split('@')[0],
            email: normalizedEmail,
            role,
            accessLevel,
          },
        });
      }
    }

    // User email not found in the sheet
    return res.status(200).json({
      success: true,
      isAuthorized: false,
      error: 'Email not found in authorized users list',
    });

  } catch (error) {
    console.error('Error validating user:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to validate user',
      message: error.message,
    });
  }
}
