/**
 * Vercel Serverless Function - Get Asesores from Google Sheets
 *
 * Extracts unique asesores from the inventory data (column P - Asesor)
 * and returns them as JSON for the ambassadors page.
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Prevent caching - always fetch fresh data from Google Sheets
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if service account key is configured
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({
      error: 'Google Service Account not configured',
      message: 'Please set up GOOGLE_SERVICE_ACCOUNT_KEY environment variable'
    });
  }

  try {
    const sheets = getSheetsClient();

    // Get sheet metadata to find correct sheet name
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const sheetNames = metadata.data.sheets.map(s => s.properties.title);

    // Use sheet 3 (index 2) for asesores data, or find sheet with "asesor" in name
    let asesoresSheet = sheetNames[2]; // Sheet 3 (0-indexed)

    // Fallback: look for sheet with "asesor" or "embajador" in name
    if (!asesoresSheet) {
      asesoresSheet = sheetNames.find(name =>
        name.toLowerCase().includes('asesor') ||
        name.toLowerCase().includes('embajador') ||
        name.toLowerCase().includes('ambassador')
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
        success: true,
        asesores: [],
        message: 'No data found in asesores sheet',
        sheetName: asesoresSheet,
        availableSheets: sheetNames
      });
    }

    // Find relevant column indices from header row
    const headers = rows[0].map(h => h ? h.toLowerCase().trim() : '');

    // Look for name column (Nombre, Name, Asesor)
    const nameColumnIndex = headers.findIndex(h =>
      h === 'nombre' || h === 'name' || h.includes('asesor') || h.includes('vendedor')
    );

    if (nameColumnIndex === -1) {
      return res.status(200).json({
        success: true,
        asesores: [],
        message: 'No name column found in sheet',
        headers: rows[0],
        availableSheets: sheetNames
      });
    }

    // Find optional columns for additional data
    // Hoja Asesores: A=ID, B=Nombre, C=Datos(rol), D=WhatsApp, E=Especialidad, F=Instagram, G=Estado, H=Fecha
    const roleIndex = headers.findIndex(h => h === 'datos' || h === 'rol' || h === 'role' || h === 'tipo');
    const whatsappIndex = headers.findIndex(h => h.includes('whatsapp') || h.includes('telefono') || h.includes('phone'));
    const especialidadIndex = headers.findIndex(h => h.includes('especialidad') || h.includes('specialty'));
    const instagramIndex = headers.findIndex(h => h.includes('instagram') || h.includes('ig') || h.includes('email'));
    const estadoIndex = headers.findIndex(h => h === 'estado' || h === 'status');

    // Extract asesores from dedicated sheet
    const dataRows = rows.slice(1);

    // Format display name (clean but preserve original style)
    const formatDisplayName = (name) => {
      return String(name || '')
        .replace(/\r?\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    // Build asesor objects with all available data
    const asesoresData = [];

    dataRows.forEach((row, index) => {
      const name = row[nameColumnIndex];
      if (!name || String(name).trim() === '') return;

      // Check if asesor is active (if estado column exists)
      if (estadoIndex !== -1) {
        const estado = String(row[estadoIndex] || '').toLowerCase();
        if (estado === 'inactivo' || estado === 'inactive') return;
      }

      const displayName = formatDisplayName(name);

      asesoresData.push({
        id: `asesor_${index + 1}`,
        name: displayName,
        slug: displayName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        role: roleIndex !== -1 ? (row[roleIndex] || 'Asesor').trim() : 'Asesor',
        whatsapp: whatsappIndex !== -1 ? row[whatsappIndex] || null : null,
        especialidad: especialidadIndex !== -1 ? row[especialidadIndex] || null : null,
        email: instagramIndex !== -1 ? row[instagramIndex] || null : null,
      });
    });

    // Sort by name
    asesoresData.sort((a, b) => a.name.localeCompare(b.name, 'es'));

    return res.status(200).json({
      success: true,
      asesores: asesoresData,
      count: asesoresData.length,
      sheetName: asesoresSheet,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error reading asesores from Google Sheets:', error);
    return res.status(500).json({
      error: 'Failed to read asesores',
      message: error.message
    });
  }
}
