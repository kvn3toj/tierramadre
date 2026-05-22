/**
 * Share the new SOT sheet with the service account, and verify
 * the service account can read all 5 tabs.
 */

import { OAuth2Client } from 'google-auth-library';
import { GoogleAuth } from 'google-auth-library';
import { drive_v3 } from '@googleapis/drive';
import { sheets_v4 } from '@googleapis/sheets';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });
// load SA key from production.local without overriding OAuth from .env.local
const prodEnv = dotenv.parse(fs.readFileSync('.env.production.local', 'utf8'));
if (prodEnv.GOOGLE_SERVICE_ACCOUNT_KEY) {
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY = prodEnv.GOOGLE_SERVICE_ACCOUNT_KEY;
}

function cleanEnv(v) {
  if (!v) return v;
  return v.replace(/^["']|["']$/g, '').replace(/\\n/g, '').replace(/[\r\n]/g, '').trim();
}

const SPREADSHEET_ID = process.argv[2] || fs.readFileSync('docs/specs/2026-05-21-fotosintesis-sot-id.txt', 'utf8').split('\n')[0].trim();
console.log('🎯 Spreadsheet:', SPREADSHEET_ID);

async function main() {
  // OAuth client (file owner)
  const clientId = cleanEnv(process.env.GOOGLE_OAUTH_CLIENT_ID);
  const clientSecret = cleanEnv(process.env.GOOGLE_OAUTH_CLIENT_SECRET);
  const refreshToken = cleanEnv(process.env.GOOGLE_OAUTH_REFRESH_TOKEN);
  const oauth = new OAuth2Client(clientId, clientSecret);
  oauth.setCredentials({ refresh_token: refreshToken });
  await oauth.refreshAccessToken();
  const driveOAuth = new drive_v3.Drive({ auth: oauth });

  // SA email
  const saKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\s+/g, '');
  if (!saKey) { console.error('❌ no SA key'); process.exit(1); }
  const saCreds = JSON.parse(Buffer.from(saKey, 'base64').toString('utf8'));
  const saEmail = saCreds.client_email;
  console.log('🤖 SA email:', saEmail);

  // 1. Share
  console.log('\n🔗 Sharing with SA as writer...');
  try {
    await driveOAuth.permissions.create({
      fileId: SPREADSHEET_ID,
      sendNotificationEmail: false,
      resource: { type: 'user', role: 'writer', emailAddress: saEmail },
    });
    console.log('   ✓ shared');
  } catch (e) {
    if (e.message.includes('already')) {
      console.log('   = already shared');
    } else {
      console.warn('   ⚠', e.message);
    }
  }

  // 2. Verify SA can read each tab
  console.log('\n🔍 Verificando lectura desde service account...');
  const saAuth = new GoogleAuth({ credentials: saCreds, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
  const sheetsSA = new sheets_v4.Sheets({ auth: saAuth });

  const tabs = ['Proveedores', 'Lotes', 'Inventario', 'Clientes', 'Ventas'];
  for (const tab of tabs) {
    try {
      const res = await sheetsSA.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${tab}'`,
      });
      const rows = res.data.values ?? [];
      console.log(`   ✓ "${tab}" → ${rows.length} rows (incl. header)`);
      if (rows.length > 0) {
        console.log(`       Headers: ${rows[0].slice(0, 6).join(' | ')}${rows[0].length > 6 ? ' …' : ''}`);
      }
    } catch (e) {
      console.error(`   ✗ "${tab}" → ${e.message}`);
    }
  }
}

main().catch((e) => {
  console.error('❌', e.message);
  if (e.response?.data) console.error(JSON.stringify(e.response.data, null, 2));
  process.exit(1);
});
