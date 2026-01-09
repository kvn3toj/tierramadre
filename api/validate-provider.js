/**
 * Vercel Serverless Function - Validate Provider Email Against Google Sheets
 *
 * Checks if a user's email exists in the Proveedores sheet and returns their profile.
 * Used for Google OAuth authentication flow for providers.
 *
 * Proveedores Sheet Schema:
 * A=ID, B=Nombre, C=Email, D=Contacto, E=WhatsApp, F=Especialidad, G=Estado, H=FechaRegistro
 */

import { google } from 'googleapis';

// Sheet configuration - same spreadsheet as treasure data
const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';
const PROVEEDORES_SHEET_NAME = 'Proveedores';

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
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    return google.sheets({ version: 'v4', auth });
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

    // Get sheet metadata to check if Proveedores sheet exists
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const sheetNames = metadata.data.sheets.map(s => s.properties.title);

    // Find Proveedores sheet
    let proveedoresSheet = sheetNames.find(name =>
      name.toLowerCase() === 'proveedores' ||
      name.toLowerCase().includes('proveedor')
    );

    if (!proveedoresSheet) {
      // Sheet doesn't exist yet - no providers configured
      return res.status(200).json({
        success: true,
        isProvider: false,
        error: 'Proveedores sheet not found',
      });
    }

    // Read all data from proveedores sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${proveedoresSheet}'!A:H`,
    });

    const rows = response.data.values || [];

    if (!rows || rows.length <= 1) {
      return res.status(200).json({
        success: true,
        isProvider: false,
        error: 'No providers found in the system',
      });
    }

    // Find relevant column indices from header row
    const headers = rows[0].map(h => h ? h.toLowerCase().trim() : '');

    // Column mapping for Proveedores sheet
    const idIndex = headers.findIndex(h => h === 'id');
    const nombreIndex = headers.findIndex(h => h === 'nombre' || h === 'name');
    const emailIndex = headers.findIndex(h => h === 'email' || h === 'correo');
    const contactoIndex = headers.findIndex(h => h === 'contacto' || h === 'contact');
    const whatsappIndex = headers.findIndex(h => h === 'whatsapp' || h === 'telefono');
    const especialidadIndex = headers.findIndex(h => h === 'especialidad' || h === 'specialty');
    const estadoIndex = headers.findIndex(h => h === 'estado' || h === 'status');
    const fechaIndex = headers.findIndex(h => h.includes('fecha') || h === 'registeredat');

    // Normalize email for comparison
    const normalizedEmail = email.toLowerCase().trim();

    // Search for provider by email
    const dataRows = rows.slice(1);

    for (const row of dataRows) {
      // Get provider email from sheet
      const providerEmail = emailIndex !== -1 ? String(row[emailIndex] || '').toLowerCase().trim() : '';

      if (providerEmail === normalizedEmail) {
        // Check if provider is active
        if (estadoIndex !== -1) {
          const estado = String(row[estadoIndex] || '').toUpperCase();
          if (estado === 'INACTIVO' || estado === 'INACTIVE') {
            return res.status(200).json({
              success: true,
              isProvider: false,
              error: 'Provider account is inactive',
            });
          }
        }

        // Provider found and active
        const provider = {
          id: idIndex !== -1 ? row[idIndex] : '',
          name: nombreIndex !== -1 ? row[nombreIndex] : '',
          email: normalizedEmail,
          contactPerson: contactoIndex !== -1 ? row[contactoIndex] : '',
          whatsapp: whatsappIndex !== -1 ? row[whatsappIndex] : '',
          specialty: especialidadIndex !== -1 ? row[especialidadIndex] : '',
          status: estadoIndex !== -1 ? row[estadoIndex] : 'ACTIVO',
          registeredAt: fechaIndex !== -1 ? row[fechaIndex] : '',
        };

        return res.status(200).json({
          success: true,
          isProvider: true,
          provider,
        });
      }
    }

    // Provider email not found in the sheet
    return res.status(200).json({
      success: true,
      isProvider: false,
      error: 'Email not found in providers list',
    });

  } catch (error) {
    console.error('Error validating provider:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to validate provider',
      message: error.message,
    });
  }
}
