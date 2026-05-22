/**
 * Read full content of GENESIS sheet (inventario GENESIS) via Sheets API.
 * Lists ALL tabs and dumps every row, so we can design the migration map.
 *
 * Run: node scripts/read-genesis-sheet.mjs
 */

import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env. Production has the service account; fallback to .env.local
dotenv.config({ path: '.env.production.local' });
if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
  dotenv.config({ path: '.env.local' });
}
if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
  dotenv.config();
}

const GENESIS_ID = '1c6qTuf8mnQjOvi-txVuNDshzsYyyaEW1SZ54PDThaQc';

async function main() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    console.error('❌ GOOGLE_SERVICE_ACCOUNT_KEY not in env');
    process.exit(1);
  }

  // Decode base64-encoded JSON
  let keyText = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  // strip whitespace/newlines from possibly wrapped key
  keyText = keyText.replace(/\s+/g, '');
  const credentials = JSON.parse(Buffer.from(keyText, 'base64').toString('utf8'));

  console.log('📧 Service Account:', credentials.client_email);

  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = new sheets_v4.Sheets({ auth });

  // 1. Get metadata (all tabs)
  const meta = await sheets.spreadsheets.get({ spreadsheetId: GENESIS_ID });
  console.log('\n📑 Spreadsheet title:', meta.data.properties?.title);
  console.log('📋 Tabs:');
  const tabs = meta.data.sheets ?? [];
  tabs.forEach((s) => {
    console.log(`   - "${s.properties?.title}"  (sheetId=${s.properties?.sheetId}, rows=${s.properties?.gridProperties?.rowCount}, cols=${s.properties?.gridProperties?.columnCount})`);
  });

  // 2. Read each tab in full
  const dump = {};
  for (const tab of tabs) {
    const title = tab.properties?.title;
    if (!title) continue;
    const range = `'${title}'`;
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: GENESIS_ID,
        range,
      });
      dump[title] = res.data.values ?? [];
      console.log(`\n=== TAB: ${title}  (${(res.data.values ?? []).length} rows) ===`);
      const rows = res.data.values ?? [];
      rows.slice(0, 30).forEach((r, i) => {
        console.log(`  R${i + 1}: ${JSON.stringify(r).slice(0, 220)}`);
      });
      if (rows.length > 30) console.log(`  ... ${rows.length - 30} more rows omitted`);
    } catch (err) {
      console.error(`  ⚠ failed to read tab "${title}":`, err.message);
    }
  }

  // 3. Write dump to outputs for record
  const outPath = path.resolve('docs/specs/2026-05-21-genesis-dump.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ meta: { tabs: tabs.map(t => t.properties) }, data: dump }, null, 2));
  console.log(`\n💾 Dump escrito en ${outPath}`);
}

main().catch((e) => {
  console.error('❌', e.message);
  if (e.response?.data) console.error(JSON.stringify(e.response.data, null, 2));
  process.exit(1);
});
