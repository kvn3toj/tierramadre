/**
 * Vercel Serverless Function - List Providers
 *
 * Returns list of all active providers for admin dropdowns.
 * Reads from Google Sheets "Proveedores" sheet.
 */

import { google } from 'googleapis';

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';
const SHEET_NAME = 'Proveedores';

function getSheetsClient() {
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
  );

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return google.sheets({ version: 'v4', auth });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({
      success: false,
      error: 'Google Service Account not configured',
    });
  }

  try {
    const sheets = getSheetsClient();

    // Check if sheet exists
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const sheetNames = metadata.data.sheets.map(s => s.properties.title);
    const proveedoresSheet = sheetNames.find(name =>
      name.toLowerCase() === 'proveedores' ||
      name.toLowerCase().includes('proveedor')
    );

    if (!proveedoresSheet) {
      return res.status(200).json({
        success: true,
        providers: [],
        message: 'Proveedores sheet not found',
      });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${proveedoresSheet}'!A:H`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      return res.status(200).json({ success: true, providers: [] });
    }

    // Map columns
    const headers = rows[0].map(h => h ? h.toLowerCase().trim() : '');
    const idIndex = headers.findIndex(h => h === 'id');
    const nombreIndex = headers.findIndex(h => h === 'nombre' || h === 'name');
    const emailIndex = headers.findIndex(h => h === 'email' || h === 'correo');
    const contactoIndex = headers.findIndex(h => h === 'contacto' || h === 'contact');
    const whatsappIndex = headers.findIndex(h => h === 'whatsapp' || h === 'telefono');
    const especialidadIndex = headers.findIndex(h => h === 'especialidad' || h === 'specialty');
    const estadoIndex = headers.findIndex(h => h === 'estado' || h === 'status');
    const fechaIndex = headers.findIndex(h => h.includes('fecha') || h === 'registeredat');

    const providers = rows.slice(1)
      .map(row => ({
        id: idIndex !== -1 ? row[idIndex] : '',
        name: nombreIndex !== -1 ? row[nombreIndex] : '',
        email: emailIndex !== -1 ? row[emailIndex] : '',
        contactPerson: contactoIndex !== -1 ? row[contactoIndex] : '',
        whatsapp: whatsappIndex !== -1 ? row[whatsappIndex] : '',
        specialty: especialidadIndex !== -1 ? row[especialidadIndex] : '',
        status: estadoIndex !== -1 ? row[estadoIndex] : 'ACTIVO',
        registeredAt: fechaIndex !== -1 ? row[fechaIndex] : '',
      }))
      .filter(p => p.email && p.status?.toUpperCase() === 'ACTIVO');

    return res.status(200).json({ success: true, providers });

  } catch (error) {
    console.error('Error fetching providers:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch providers',
      message: error.message,
    });
  }
}
