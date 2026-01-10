/**
 * Setup Feedback Sheet Script
 *
 * Creates the "Feedback" sheet with proper headers in the existing spreadsheet.
 * Run with: node scripts/setup-feedback-sheet.js
 */

import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import dotenv from 'dotenv';

dotenv.config();

const SPREADSHEET_ID = process.env.FEEDBACK_SPREADSHEET_ID || '1Nl2gxfZzWy4lUv_C-9xTt90MzFDIgHLvWtWtDRNzJaU';
const FEEDBACK_SHEET_NAME = 'Feedback';

async function setupFeedbackSheet() {
  console.log('🚀 Setting up Feedback sheet...\n');

  // Initialize Google Sheets client
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    console.error('❌ GOOGLE_SERVICE_ACCOUNT_KEY not found in environment');
    process.exit(1);
  }

  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
  );

  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = new sheets_v4.Sheets({ auth });

  try {
    // Check if Feedback sheet already exists
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const existingSheet = metadata.data.sheets.find(
      (s) => s.properties.title === FEEDBACK_SHEET_NAME
    );

    if (existingSheet) {
      console.log('⚠️  Feedback sheet already exists!');
      console.log('   Checking headers...\n');
    } else {
      // Create the sheet
      console.log('📝 Creating Feedback sheet...');
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: FEEDBACK_SHEET_NAME,
                  gridProperties: {
                    frozenRowCount: 1, // Freeze header row
                  },
                },
              },
            },
          ],
        },
      });
      console.log('✅ Feedback sheet created!\n');
    }

    // Define headers
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

    // Check current headers
    const currentData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${FEEDBACK_SHEET_NAME}!A1:N1`,
    });

    const currentHeaders = currentData.data.values?.[0] || [];

    if (currentHeaders.length === 0 || currentHeaders[0] !== 'timestamp') {
      // Add headers
      console.log('📋 Adding headers...');
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${FEEDBACK_SHEET_NAME}!A1:N1`,
        valueInputOption: 'RAW',
        resource: {
          values: [headers],
        },
      });
      console.log('✅ Headers added!\n');

      // Format header row
      console.log('🎨 Formatting header row...');

      // Get the sheet ID for formatting
      const updatedMetadata = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
      });
      const feedbackSheet = updatedMetadata.data.sheets.find(
        (s) => s.properties.title === FEEDBACK_SHEET_NAME
      );
      const sheetId = feedbackSheet.properties.sheetId;

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [
            // Bold header row
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: { bold: true },
                    backgroundColor: { red: 0, green: 0.68, blue: 0.48 }, // Emerald color
                    horizontalAlignment: 'CENTER',
                  },
                },
                fields: 'userEnteredFormat(textFormat,backgroundColor,horizontalAlignment)',
              },
            },
            // Auto-resize columns
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: 14,
                },
              },
            },
          ],
        },
      });
      console.log('✅ Formatting applied!\n');
    } else {
      console.log('✅ Headers already exist!\n');
    }

    console.log('🎉 Feedback sheet setup complete!');
    console.log(`\n📊 Spreadsheet URL: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`);
    console.log(`\n📌 Headers created:`);
    headers.forEach((h, i) => console.log(`   ${i + 1}. ${h}`));

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

setupFeedbackSheet();
