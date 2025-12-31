/**
 * Create New Feedback Spreadsheet
 *
 * Creates a completely new Google Spreadsheet for feedback storage.
 * Run with: node scripts/create-feedback-spreadsheet.js
 */

import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

async function createFeedbackSpreadsheet() {
  console.log('🚀 Creating new Feedback spreadsheet...\n');

  // Initialize Google Sheets client
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    console.error('❌ GOOGLE_SERVICE_ACCOUNT_KEY not found in environment');
    process.exit(1);
  }

  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
  );

  console.log('📧 Service Account:', credentials.client_email);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });

  try {
    // Create new spreadsheet
    console.log('\n📝 Creating spreadsheet...');
    const spreadsheet = await sheets.spreadsheets.create({
      resource: {
        properties: {
          title: 'TM-Feedback - Admin UI Reports',
        },
        sheets: [
          {
            properties: {
              title: 'Feedback',
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
        ],
      },
    });

    const spreadsheetId = spreadsheet.data.spreadsheetId;
    const spreadsheetUrl = spreadsheet.data.spreadsheetUrl;

    console.log('✅ Spreadsheet created!');
    console.log(`   ID: ${spreadsheetId}`);

    // Add headers
    const headers = [
      'timestamp',
      'id',
      'page',
      'component',
      'category',
      'priority',
      'description',
      'screenshot',
      'highlightBox',
      'adminEmail',
      'adminName',
      'status',
      'resolvedAt',
      'notes',
    ];

    console.log('\n📋 Adding headers...');
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Feedback!A1:N1',
      valueInputOption: 'RAW',
      resource: {
        values: [headers],
      },
    });

    // Format header row
    console.log('🎨 Formatting...');
    const sheetId = spreadsheet.data.sheets[0].properties.sheetId;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          // Bold header with emerald background
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                  backgroundColor: { red: 0, green: 0.68, blue: 0.48 },
                  horizontalAlignment: 'CENTER',
                },
              },
              fields: 'userEnteredFormat(textFormat,backgroundColor,horizontalAlignment)',
            },
          },
          // Set column widths
          {
            updateDimensionProperties: {
              range: { sheetId, dimension: 'COLUMNS', startIndex: 6, endIndex: 7 }, // description
              properties: { pixelSize: 300 },
              fields: 'pixelSize',
            },
          },
          {
            updateDimensionProperties: {
              range: { sheetId, dimension: 'COLUMNS', startIndex: 7, endIndex: 8 }, // screenshot
              properties: { pixelSize: 150 },
              fields: 'pixelSize',
            },
          },
        ],
      },
    });

    // Share with your email (optional - add your email here)
    console.log('\n🔗 Sharing spreadsheet...');

    // Share with anyone who has the link (for easier access)
    await drive.permissions.create({
      fileId: spreadsheetId,
      resource: {
        type: 'anyone',
        role: 'writer',
      },
    });

    console.log('\n' + '='.repeat(60));
    console.log('🎉 FEEDBACK SPREADSHEET READY!');
    console.log('='.repeat(60));
    console.log(`\n📊 URL: ${spreadsheetUrl}`);
    console.log(`\n🔑 Spreadsheet ID: ${spreadsheetId}`);
    console.log('\n📌 Add this to your .env file:');
    console.log(`   FEEDBACK_SPREADSHEET_ID=${spreadsheetId}`);
    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

createFeedbackSpreadsheet();
