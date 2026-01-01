import { google } from 'googleapis';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const FEEDBACK_SPREADSHEET_ID = '1Nl2gxfZzWy4lUv_C-9xTt90MzFDIgHLvWtWtDRNzJaU';
const FEEDBACK_SHEET_NAME = 'Feedback';

// Professional header labels with icons
const FEEDBACK_HEADERS_DISPLAY = [
  '📅 Timestamp',      // A
  '🆔 ID',             // B
  '📦 Version',        // C
  '🌍 Environment',    // D
  '📄 Page',           // E
  '🧩 Component',      // F
  '⭐ Feature',        // G
  '🔄 User Flow',      // H
  '📁 Category',       // I
  '🚨 Priority',       // J
  '⚠️ Severity',       // K
  '🏷️ Tags',           // L
  '📝 Title',          // M
  '📋 Description',    // N
  '✅ Expected',       // O
  '❌ Actual',         // P
  '📸 Screenshot',     // Q
  '🔲 Highlight',      // R
  '📱 Device',         // S
  '🌐 Browser',        // T
  '💻 OS',             // U
  '📧 Admin Email',    // V
  '👤 Admin Name',     // W
  '📊 Status',         // X
  '👨‍💼 Assignee',       // Y
  '✓ Resolved At',     // Z
  '⏱️ Resolution (hrs)', // AA
  '📝 Notes',          // AB
  '🔗 Related IDs',    // AC
  '📋 Repro Steps',    // AD
  '👥 Affected Users', // AE
  '💡 Workaround',     // AF
  '🔀 Linked PR',      // AG
  '⏰ First Response', // AH
  '⚡ Response (hrs)', // AI
  '🔄 Reopens',        // AJ
  '⭐ Satisfaction',   // AK
];

async function updateHeaders() {
  console.log('📝 Updating headers with professional labels...\n');

  const cleanKey = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '').replace(/[\s"]+/g, '');
  const credentials = JSON.parse(Buffer.from(cleanKey, 'base64').toString());

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.values.update({
    spreadsheetId: FEEDBACK_SPREADSHEET_ID,
    range: `${FEEDBACK_SHEET_NAME}!A1:AK1`,
    valueInputOption: 'RAW',
    resource: {
      values: [FEEDBACK_HEADERS_DISPLAY],
    },
  });

  console.log('✅ Headers updated with professional labels!');
  console.log('\nNew headers:');
  FEEDBACK_HEADERS_DISPLAY.forEach((h, i) => {
    const col = String.fromCharCode(65 + (i < 26 ? i : -1)) + (i >= 26 ? String.fromCharCode(65 + i - 26) : '');
    console.log(`   ${col.padStart(2)}: ${h}`);
  });
}

updateHeaders().catch(console.error);
