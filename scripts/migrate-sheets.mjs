#!/usr/bin/env node
/**
 * Migration Script: Copy writable sheets from inventory spreadsheet to APP spreadsheet
 *
 * This script:
 * 1. Reads data from the old (inventory) spreadsheet
 * 2. Creates matching sheets in the new (APP) spreadsheet
 * 3. Copies all data over
 *
 * Usage:
 *   node scripts/migrate-sheets.mjs [--dry-run]
 *
 * Requires GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN
 * env vars (or .env file at project root)
 */

import { OAuth2Client } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env if present
try {
  const envPath = resolve(process.cwd(), '.env');
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  }
} catch { /* no .env file */ }

// Spreadsheet IDs
const OLD_SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';
const APP_SPREADSHEET_ID = '1DuOhuPcHFBhliGJG_imKWA_Yyx4dAmvmmKr4Dp2TXoM';

// Sheets to migrate (name -> column range)
const SHEETS_TO_MIGRATE = [
  { name: 'ProductViews', range: 'A:L' },
  { name: 'SolicitudesProducto', range: 'A:Y' },
  { name: 'UserPreferences', range: 'A:B' },
  { name: 'CotizacionesAsesores', range: 'A:L' },
  { name: 'CotizacionProducts', range: 'A:F' },
  { name: 'CotizacionReports', range: 'A:J' },
  { name: 'CotizacionesProveedor', range: 'A:P' },
  { name: 'SolicitudesCotizacion', range: 'A:O' },
];

const DRY_RUN = process.argv.includes('--dry-run');

function cleanEnvValue(value) {
  if (!value) return value;
  return value
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '')
    .replace(/[\r\n]/g, '')
    .trim();
}

function getSheetsClient() {
  const clientId = cleanEnvValue(process.env.GOOGLE_OAUTH_CLIENT_ID);
  const clientSecret = cleanEnvValue(process.env.GOOGLE_OAUTH_CLIENT_SECRET);
  const refreshToken = cleanEnvValue(process.env.GOOGLE_OAUTH_REFRESH_TOKEN);

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, or GOOGLE_OAUTH_REFRESH_TOKEN');
  }

  const auth = new OAuth2Client(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });

  return new sheets_v4.Sheets({ auth });
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== LIVE MIGRATION ===');
  console.log(`Source: ${OLD_SPREADSHEET_ID}`);
  console.log(`Target: ${APP_SPREADSHEET_ID}\n`);

  const sheets = getSheetsClient();

  // Get existing sheets in target spreadsheet
  const targetMeta = await sheets.spreadsheets.get({
    spreadsheetId: APP_SPREADSHEET_ID,
  });
  const existingSheets = targetMeta.data.sheets.map(s => s.properties.title);
  console.log(`Existing sheets in target: [${existingSheets.join(', ')}]\n`);

  for (const { name, range } of SHEETS_TO_MIGRATE) {
    console.log(`--- ${name} ---`);

    // 1. Read data from old spreadsheet
    let rows = [];
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: OLD_SPREADSHEET_ID,
        range: `'${name}'!${range}`,
      });
      rows = response.data.values || [];
      console.log(`  Source: ${rows.length} rows (including header)`);
    } catch (err) {
      if (err.message?.includes('Unable to parse range') || err.code === 400) {
        console.log(`  Source: Sheet "${name}" does not exist in old spreadsheet. Skipping.`);
        continue;
      }
      throw err;
    }

    if (rows.length === 0) {
      console.log(`  Source: Empty. Will create sheet with no data.`);
    }

    // 2. Create sheet in target if it doesn't exist
    if (!existingSheets.includes(name)) {
      console.log(`  Target: Creating sheet "${name}"...`);
      if (!DRY_RUN) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: APP_SPREADSHEET_ID,
          requestBody: {
            requests: [{
              addSheet: { properties: { title: name } },
            }],
          },
        });
      }
      existingSheets.push(name);
    } else {
      console.log(`  Target: Sheet "${name}" already exists.`);
    }

    // 3. Copy data if we have any
    if (rows.length > 0) {
      // Check if target already has data
      let targetRows = [];
      try {
        const targetResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: APP_SPREADSHEET_ID,
          range: `'${name}'!${range}`,
        });
        targetRows = targetResponse.data.values || [];
      } catch { /* new sheet, no data yet */ }

      if (targetRows.length > 1) {
        console.log(`  Target: Already has ${targetRows.length} rows. SKIPPING to avoid duplicates.`);
        console.log(`  (Delete target sheet data manually if you want to re-migrate.)\n`);
        continue;
      }

      console.log(`  Copying ${rows.length} rows to target...`);
      if (!DRY_RUN) {
        // Determine the last column letter
        const maxCols = Math.max(...rows.map(r => r.length));
        const lastCol = maxCols <= 26
          ? String.fromCharCode(64 + maxCols)
          : 'A' + String.fromCharCode(64 + (maxCols - 26));

        await sheets.spreadsheets.values.update({
          spreadsheetId: APP_SPREADSHEET_ID,
          range: `'${name}'!A1:${lastCol}${rows.length}`,
          valueInputOption: 'RAW',
          requestBody: { values: rows },
        });
        console.log(`  Done! Copied ${rows.length} rows.`);
      } else {
        console.log(`  [DRY RUN] Would copy ${rows.length} rows.`);
      }
    }
    console.log('');
  }

  console.log('=== Migration complete ===');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
