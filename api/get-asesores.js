/**
 * Vercel Serverless Function - Get Asesores from Google Sheets
 *
 * Extracts unique asesores from the inventory data (column P - Asesor)
 * and returns them as JSON for the ambassadors page.
 */

import { google } from 'googleapis';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

    // Find inventory sheet
    const inventorySheet = sheetNames.find(name =>
      name.toLowerCase().includes('inventario') ||
      name.toLowerCase().includes('inventory')
    ) || sheetNames[0];

    // Read all data from inventory sheet to extract asesores
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${inventorySheet}'!A:Z`,
    });

    const rows = response.data.values || [];

    if (!rows || rows.length === 0) {
      return res.status(200).json({
        success: true,
        asesores: [],
        message: 'No data found in spreadsheet',
        availableSheets: sheetNames
      });
    }

    // Find asesor column index from header row
    const headers = rows[0].map(h => h ? h.toLowerCase().trim() : '');
    const asesorColumnIndex = headers.findIndex(h =>
      h.includes('asesor') || h.includes('advisor') || h.includes('vendedor')
    );

    if (asesorColumnIndex === -1) {
      return res.status(200).json({
        success: true,
        asesores: [],
        message: 'No asesor column found in inventory',
        headers: rows[0],
        availableSheets: sheetNames
      });
    }

    // Extract unique asesores from inventory data
    const dataRows = rows.slice(1);

    // Normalize name for comparison (uppercase, keep only letters and numbers)
    const normalizeName = (name) => {
      return name
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^A-Z0-9]/g, ''); // Keep only alphanumeric
    };

    // Get unique names, keeping the best formatted version
    const nameMap = new Map();
    const debugInfo = [];

    dataRows.forEach(row => {
      const name = row[asesorColumnIndex];
      if (!name || name.trim() === '') return;

      const cleanName = name.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      const normalized = normalizeName(cleanName);

      // Debug: log ALL names (first 30)
      if (debugInfo.length < 30) {
        debugInfo.push({
          cleanName,
          normalized,
        });
      }

      // Keep the version with proper casing (not all caps if possible)
      if (!nameMap.has(normalized)) {
        nameMap.set(normalized, cleanName);
      } else {
        const existing = nameMap.get(normalized);
        // Prefer mixed case over all caps
        if (existing === existing.toUpperCase() && cleanName !== cleanName.toUpperCase()) {
          nameMap.set(normalized, cleanName);
        }
      }
    });

    const asesores = Array.from(nameMap.values())
      .sort((a, b) => a.localeCompare(b, 'es'));

    // Create asesor objects with basic info
    const asesoresData = asesores.map((name, index) => ({
      id: `asesor_${index + 1}`,
      name: name,
      slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    }));

    return res.status(200).json({
      success: true,
      asesores: asesoresData,
      count: asesoresData.length,
      sheetName: inventorySheet,
      lastUpdated: new Date().toISOString(),
      debug: debugInfo.length > 0 ? debugInfo : undefined
    });

  } catch (error) {
    console.error('Error reading asesores from Google Sheets:', error);
    return res.status(500).json({
      error: 'Failed to read asesores',
      message: error.message
    });
  }
}
