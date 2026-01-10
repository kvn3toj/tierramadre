#!/usr/bin/env node
/**
 * Create Asesores Sheet - Local Script
 *
 * Run this script locally to create the Asesores tab in Google Sheets.
 * Uses the same logic as the API endpoint.
 *
 * Usage: node scripts/create-asesores-sheet.mjs
 */

import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Sheet configuration
const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';
const ASESORES_SHEET_NAME = 'Asesores';

/**
 * Load credentials from .env.vercel, env var, or local file
 */
function getCredentials() {
  // Try .env.vercel first
  const envVercelPath = join(__dirname, '..', '.env.vercel');
  if (existsSync(envVercelPath)) {
    console.log('Loading credentials from .env.vercel');
    const content = readFileSync(envVercelPath, 'utf8');
    const match = content.match(/GOOGLE_SERVICE_ACCOUNT_KEY="([^"]+)"/s);
    if (match) {
      // Remove escaped newlines and whitespace from multiline env value
      const cleaned = match[1].replace(/\\n/g, '').replace(/\n/g, '').replace(/\s+/g, '');
      return JSON.parse(Buffer.from(cleaned, 'base64').toString());
    }
  }

  // Try environment variable
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    console.log('Using credentials from GOOGLE_SERVICE_ACCOUNT_KEY env var');
    return JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
    );
  }

  // Try local credentials file
  const credentialsPath = join(__dirname, '..', 'service-account.json');
  try {
    console.log('Using credentials from', credentialsPath);
    return JSON.parse(readFileSync(credentialsPath, 'utf-8'));
  } catch {
    console.error('No credentials found. Run "vercel env pull .env.vercel" or set GOOGLE_SERVICE_ACCOUNT_KEY');
    process.exit(1);
  }
}

/**
 * Initialize Google Sheets API
 */
function getSheetsClient() {
  const credentials = getCredentials();

  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return new sheets_v4.Sheets({ auth });
}

/**
 * Extract unique asesores from inventory data
 */
function extractAsesores(rows, asesorColumnIndex) {
  const normalizeName = (name) => {
    const str = String(name || '');
    let result = '';
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      if ((char >= 65 && char <= 90) || (char >= 97 && char <= 122)) {
        result += str[i].toUpperCase();
      }
    }
    return result;
  };

  const formatDisplayName = (name) => {
    return String(name || '')
      .replace(/\r?\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const seenNormalized = new Set();
  const asesoresMap = new Map();

  rows.forEach(row => {
    const name = row[asesorColumnIndex];
    if (!name || String(name).trim() === '') return;

    const displayName = formatDisplayName(name);
    const normalized = normalizeName(name);

    if (!seenNormalized.has(normalized)) {
      seenNormalized.add(normalized);
      asesoresMap.set(normalized, {
        name: displayName,
        productCount: 1,
      });
    } else {
      const existing = asesoresMap.get(normalized);
      existing.productCount += 1;
    }
  });

  return Array.from(asesoresMap.values())
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

/**
 * Main function
 */
async function main() {
  console.log('Creating Asesores sheet...\n');

  const sheets = getSheetsClient();

  // Get spreadsheet metadata
  console.log('Fetching spreadsheet metadata...');
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const sheetNames = metadata.data.sheets.map(s => s.properties.title);
  console.log('Available sheets:', sheetNames.join(', '));

  // Check if Asesores sheet exists
  const asesoresSheetExists = sheetNames.some(
    name => name.toLowerCase() === ASESORES_SHEET_NAME.toLowerCase()
  );

  // Find inventory sheet
  const inventorySheet = sheetNames.find(name =>
    name.toLowerCase().includes('inventario') ||
    name.toLowerCase().includes('inventory')
  ) || sheetNames[0];

  console.log('Using inventory sheet:', inventorySheet);

  // Read inventory data
  console.log('Reading inventory data...');
  const inventoryResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${inventorySheet}'!A:Z`,
  });

  const rows = inventoryResponse.data.values || [];
  console.log(`Found ${rows.length} rows in inventory`);

  if (rows.length === 0) {
    console.error('No inventory data found!');
    process.exit(1);
  }

  // Find asesor column
  const headers = rows[0].map(h => h ? h.toLowerCase().trim() : '');
  const asesorColumnIndex = headers.findIndex(h =>
    h.includes('asesor') || h.includes('advisor') || h.includes('vendedor')
  );

  if (asesorColumnIndex === -1) {
    console.error('No asesor column found in inventory!');
    console.log('Headers:', rows[0]);
    process.exit(1);
  }

  console.log(`Found asesor column at index ${asesorColumnIndex}: "${rows[0][asesorColumnIndex]}"`);

  // Extract asesores
  const dataRows = rows.slice(1);
  const asesores = extractAsesores(dataRows, asesorColumnIndex);

  console.log(`\nFound ${asesores.length} unique asesores:`);
  asesores.forEach((a, i) => console.log(`  ${i + 1}. ${a.name} (${a.productCount} products)`));

  if (asesores.length === 0) {
    console.error('No asesores found!');
    process.exit(1);
  }

  // Create or clear sheet
  if (!asesoresSheetExists) {
    console.log(`\nCreating "${ASESORES_SHEET_NAME}" sheet...`);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          addSheet: {
            properties: {
              title: ASESORES_SHEET_NAME,
              gridProperties: { rowCount: 100, columnCount: 10 },
            },
          },
        }],
      },
    });
  } else {
    console.log(`\nClearing existing "${ASESORES_SHEET_NAME}" sheet...`);
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${ASESORES_SHEET_NAME}'!A:J`,
    });
  }

  // Prepare data
  const headerRow = [
    'ID', 'Nombre', 'Slug', 'Productos', 'WhatsApp',
    'Instagram', 'Estado', 'Fecha Registro', 'Notas'
  ];

  const today = new Date().toISOString().split('T')[0];
  const dataRowsFormatted = asesores.map((asesor, index) => [
    `ASE-${String(index + 1).padStart(3, '0')}`,
    asesor.name,
    asesor.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    asesor.productCount,
    '', '', 'Activo', today, ''
  ]);

  // Write data
  console.log('Writing data...');
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${ASESORES_SHEET_NAME}'!A1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [headerRow, ...dataRowsFormatted],
    },
  });

  // Format header
  const asesoresSheetMeta = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const asesoresSheetId = asesoresSheetMeta.data.sheets.find(
    s => s.properties.title === ASESORES_SHEET_NAME
  )?.properties.sheetId;

  if (asesoresSheetId !== undefined) {
    console.log('Formatting header row...');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: { sheetId: asesoresSheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.1, green: 0.4, blue: 0.25 },
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: asesoresSheetId,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 9,
              },
            },
          },
        ],
      },
    });
  }

  console.log(`\n✅ Success! Created "${ASESORES_SHEET_NAME}" sheet with ${asesores.length} asesores`);
  console.log(`\nView at: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
