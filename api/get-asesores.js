/**
 * Vercel Serverless Function - Get Asesores from Google Sheets
 *
 * Reads the list of asesores from Hoja 1, column Q
 * and returns them as JSON for the ambassadors page.
 */

import { google } from 'googleapis';

// Sheet configuration
const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';
const ASESORES_SHEET = 'Hoja 1';
const ASESORES_COLUMN = 'Q';

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

    // Read asesores from column Q in Hoja 1
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${ASESORES_SHEET}'!${ASESORES_COLUMN}:${ASESORES_COLUMN}`,
    });

    const rows = response.data.values || [];

    // Filter out empty values and header, get unique names
    const asesores = rows
      .flat()
      .filter((name, index) => {
        // Skip header row and empty values
        if (index === 0) return false;
        if (!name || name.trim() === '') return false;
        return true;
      })
      .map(name => name.trim())
      .filter((name, index, self) => self.indexOf(name) === index) // Unique
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
