import { google } from 'googleapis';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const FEEDBACK_SPREADSHEET_ID = '1Nl2gxfZzWy4lUv_C-9xTt90MzFDIgHLvWtWtDRNzJaU';

// Color palette - Emerald/Professional theme
const COLORS = {
  // Primary emerald green
  emeraldDark: { red: 0.086, green: 0.396, blue: 0.329 },    // #166454
  emeraldMedium: { red: 0.129, green: 0.588, blue: 0.486 },  // #21967C
  emeraldLight: { red: 0.878, green: 0.949, blue: 0.929 },   // #E0F2ED

  // Status colors
  statusOpen: { red: 0.957, green: 0.878, blue: 0.878 },      // #F4E0E0 light red
  statusInProgress: { red: 1, green: 0.949, blue: 0.8 },      // #FFF2CC light yellow
  statusResolved: { red: 0.851, green: 0.918, blue: 0.827 },  // #D9EAD3 light green
  statusWontfix: { red: 0.878, green: 0.878, blue: 0.878 },   // #E0E0E0 gray
  statusDuplicate: { red: 0.812, green: 0.886, blue: 0.953 }, // #CFE2F3 light blue

  // Priority colors
  priorityCritical: { red: 0.918, green: 0.263, blue: 0.208 }, // #EA4335
  priorityHigh: { red: 0.984, green: 0.737, blue: 0.02 },      // #FBBC04
  priorityMedium: { red: 0.247, green: 0.522, blue: 0.98 },    // #3F84FA
  priorityLow: { red: 0.204, green: 0.659, blue: 0.325 },      // #34A853

  // Backgrounds
  white: { red: 1, green: 1, blue: 1 },
  lightGray: { red: 0.969, green: 0.969, blue: 0.969 },       // #F7F7F7
  headerText: { red: 1, green: 1, blue: 1 },
  darkText: { red: 0.2, green: 0.2, blue: 0.2 },

  // Dashboard sections
  sectionHeader: { red: 0.259, green: 0.522, blue: 0.957 },   // #4285F4
  sectionBg: { red: 0.933, green: 0.961, blue: 1 },           // #EEF5FF
};

async function applyVisualDesign() {
  console.log('🎨 ARIA + STEVE: Applying professional visual design...\n');

  const cleanKey = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '').replace(/[\s"]+/g, '');
  const credentials = JSON.parse(Buffer.from(cleanKey, 'base64').toString());

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Get sheet IDs
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: FEEDBACK_SPREADSHEET_ID,
  });

  const feedbackSheetId = metadata.data.sheets.find(s => s.properties.title === 'Feedback')?.properties.sheetId;
  const dashboardSheetId = metadata.data.sheets.find(s => s.properties.title === 'Dashboard')?.properties.sheetId;

  if (!feedbackSheetId && feedbackSheetId !== 0) {
    console.error('❌ Feedback sheet not found!');
    return;
  }

  console.log(`📊 Feedback Sheet ID: ${feedbackSheetId}`);
  console.log(`📈 Dashboard Sheet ID: ${dashboardSheetId}`);

  const requests = [];

  // ============================================
  // FEEDBACK SHEET STYLING
  // ============================================
  console.log('\n🎭 Styling Feedback sheet...');

  // 1. Freeze header row
  requests.push({
    updateSheetProperties: {
      properties: {
        sheetId: feedbackSheetId,
        gridProperties: {
          frozenRowCount: 1,
        },
      },
      fields: 'gridProperties.frozenRowCount',
    },
  });

  // 2. Header row styling - Emerald dark background, white text, bold
  requests.push({
    repeatCell: {
      range: {
        sheetId: feedbackSheetId,
        startRowIndex: 0,
        endRowIndex: 1,
        startColumnIndex: 0,
        endColumnIndex: 37, // AK = 37 columns
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: COLORS.emeraldDark,
          textFormat: {
            foregroundColor: COLORS.headerText,
            bold: true,
            fontSize: 10,
          },
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
          wrapStrategy: 'WRAP',
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)',
    },
  });

  // 3. Set row height for header
  requests.push({
    updateDimensionProperties: {
      range: {
        sheetId: feedbackSheetId,
        dimension: 'ROWS',
        startIndex: 0,
        endIndex: 1,
      },
      properties: {
        pixelSize: 40,
      },
      fields: 'pixelSize',
    },
  });

  // 4. Alternating row colors for data rows
  requests.push({
    addBanding: {
      bandedRange: {
        range: {
          sheetId: feedbackSheetId,
          startRowIndex: 1,
          endRowIndex: 1000,
          startColumnIndex: 0,
          endColumnIndex: 37,
        },
        rowProperties: {
          firstBandColor: COLORS.white,
          secondBandColor: COLORS.lightGray,
        },
      },
    },
  });

  // 5. Column widths for better readability
  const columnWidths = [
    { start: 0, end: 1, width: 160 },   // A: timestamp
    { start: 1, end: 2, width: 100 },   // B: id
    { start: 2, end: 3, width: 60 },    // C: version
    { start: 3, end: 4, width: 90 },    // D: environment
    { start: 4, end: 5, width: 80 },    // E: page
    { start: 5, end: 6, width: 100 },   // F: component
    { start: 6, end: 7, width: 100 },   // G: feature
    { start: 7, end: 8, width: 100 },   // H: userFlow
    { start: 8, end: 9, width: 90 },    // I: category
    { start: 9, end: 10, width: 80 },   // J: priority
    { start: 10, end: 11, width: 70 },  // K: severity
    { start: 11, end: 12, width: 120 }, // L: tags
    { start: 12, end: 13, width: 200 }, // M: title
    { start: 13, end: 14, width: 300 }, // N: description
    { start: 14, end: 15, width: 200 }, // O: expectedBehavior
    { start: 15, end: 16, width: 200 }, // P: actualBehavior
    { start: 16, end: 17, width: 150 }, // Q: screenshot
    { start: 17, end: 18, width: 100 }, // R: highlightBox
    { start: 18, end: 19, width: 80 },  // S: deviceType
    { start: 19, end: 20, width: 80 },  // T: browser
    { start: 20, end: 21, width: 80 },  // U: os
    { start: 21, end: 22, width: 180 }, // V: adminEmail
    { start: 22, end: 23, width: 120 }, // W: adminName
    { start: 23, end: 24, width: 100 }, // X: status
    { start: 24, end: 25, width: 120 }, // Y: assignee
    { start: 25, end: 26, width: 160 }, // Z: resolvedAt
    { start: 26, end: 27, width: 100 }, // AA: resolutionTime
    { start: 27, end: 28, width: 200 }, // AB: notes
    { start: 28, end: 29, width: 100 }, // AC: relatedIds
    { start: 29, end: 30, width: 200 }, // AD: reproductionSteps
    { start: 30, end: 31, width: 100 }, // AE: affectedUsers
    { start: 31, end: 32, width: 150 }, // AF: workaround
    { start: 32, end: 33, width: 150 }, // AG: linkedPR
    { start: 33, end: 34, width: 160 }, // AH: firstResponseAt
    { start: 34, end: 35, width: 100 }, // AI: firstResponseTime
    { start: 35, end: 36, width: 80 },  // AJ: reopenCount
    { start: 36, end: 37, width: 100 }, // AK: satisfactionScore
  ];

  for (const col of columnWidths) {
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId: feedbackSheetId,
          dimension: 'COLUMNS',
          startIndex: col.start,
          endIndex: col.end,
        },
        properties: {
          pixelSize: col.width,
        },
        fields: 'pixelSize',
      },
    });
  }

  // 6. Conditional formatting for STATUS column (X = column 24, 0-indexed = 23)
  const statusColumn = 23;

  // Status: open - light red
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId: feedbackSheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: statusColumn, endColumnIndex: statusColumn + 1 }],
        booleanRule: {
          condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'open' }] },
          format: { backgroundColor: COLORS.statusOpen, textFormat: { bold: true } },
        },
      },
      index: 0,
    },
  });

  // Status: in_progress - light yellow
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId: feedbackSheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: statusColumn, endColumnIndex: statusColumn + 1 }],
        booleanRule: {
          condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'in_progress' }] },
          format: { backgroundColor: COLORS.statusInProgress, textFormat: { bold: true } },
        },
      },
      index: 1,
    },
  });

  // Status: resolved - light green
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId: feedbackSheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: statusColumn, endColumnIndex: statusColumn + 1 }],
        booleanRule: {
          condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'resolved' }] },
          format: { backgroundColor: COLORS.statusResolved, textFormat: { bold: true } },
        },
      },
      index: 2,
    },
  });

  // Status: wontfix - gray
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId: feedbackSheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: statusColumn, endColumnIndex: statusColumn + 1 }],
        booleanRule: {
          condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'wontfix' }] },
          format: { backgroundColor: COLORS.statusWontfix },
        },
      },
      index: 3,
    },
  });

  // Status: duplicate - light blue
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId: feedbackSheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: statusColumn, endColumnIndex: statusColumn + 1 }],
        booleanRule: {
          condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'duplicate' }] },
          format: { backgroundColor: COLORS.statusDuplicate },
        },
      },
      index: 4,
    },
  });

  // 7. Conditional formatting for PRIORITY column (J = column 10, 0-indexed = 9)
  const priorityColumn = 9;

  // Priority: critical - red text
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId: feedbackSheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: priorityColumn, endColumnIndex: priorityColumn + 1 }],
        booleanRule: {
          condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'critical' }] },
          format: { textFormat: { foregroundColor: COLORS.priorityCritical, bold: true } },
        },
      },
      index: 5,
    },
  });

  // Priority: high - orange text
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId: feedbackSheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: priorityColumn, endColumnIndex: priorityColumn + 1 }],
        booleanRule: {
          condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'high' }] },
          format: { textFormat: { foregroundColor: COLORS.priorityHigh, bold: true } },
        },
      },
      index: 6,
    },
  });

  // Priority: medium - blue text
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId: feedbackSheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: priorityColumn, endColumnIndex: priorityColumn + 1 }],
        booleanRule: {
          condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'medium' }] },
          format: { textFormat: { foregroundColor: COLORS.priorityMedium, bold: true } },
        },
      },
      index: 7,
    },
  });

  // Priority: low - green text
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId: feedbackSheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: priorityColumn, endColumnIndex: priorityColumn + 1 }],
        booleanRule: {
          condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'low' }] },
          format: { textFormat: { foregroundColor: COLORS.priorityLow, bold: true } },
        },
      },
      index: 8,
    },
  });

  // 8. Data validation for STATUS column
  requests.push({
    setDataValidation: {
      range: {
        sheetId: feedbackSheetId,
        startRowIndex: 1,
        endRowIndex: 1000,
        startColumnIndex: statusColumn,
        endColumnIndex: statusColumn + 1,
      },
      rule: {
        condition: {
          type: 'ONE_OF_LIST',
          values: [
            { userEnteredValue: 'open' },
            { userEnteredValue: 'in_progress' },
            { userEnteredValue: 'resolved' },
            { userEnteredValue: 'wontfix' },
            { userEnteredValue: 'duplicate' },
          ],
        },
        showCustomUi: true,
        strict: true,
      },
    },
  });

  // 9. Data validation for PRIORITY column
  requests.push({
    setDataValidation: {
      range: {
        sheetId: feedbackSheetId,
        startRowIndex: 1,
        endRowIndex: 1000,
        startColumnIndex: priorityColumn,
        endColumnIndex: priorityColumn + 1,
      },
      rule: {
        condition: {
          type: 'ONE_OF_LIST',
          values: [
            { userEnteredValue: 'critical' },
            { userEnteredValue: 'high' },
            { userEnteredValue: 'medium' },
            { userEnteredValue: 'low' },
          ],
        },
        showCustomUi: true,
        strict: true,
      },
    },
  });

  // 10. Data validation for CATEGORY column (I = 8)
  requests.push({
    setDataValidation: {
      range: {
        sheetId: feedbackSheetId,
        startRowIndex: 1,
        endRowIndex: 1000,
        startColumnIndex: 8,
        endColumnIndex: 9,
      },
      rule: {
        condition: {
          type: 'ONE_OF_LIST',
          values: [
            { userEnteredValue: 'bug' },
            { userEnteredValue: 'feature' },
            { userEnteredValue: 'ux' },
            { userEnteredValue: 'performance' },
            { userEnteredValue: 'content' },
            { userEnteredValue: 'other' },
          ],
        },
        showCustomUi: true,
        strict: true,
      },
    },
  });

  // 11. Data validation for AFFECTED USERS column (AE = 30)
  requests.push({
    setDataValidation: {
      range: {
        sheetId: feedbackSheetId,
        startRowIndex: 1,
        endRowIndex: 1000,
        startColumnIndex: 30,
        endColumnIndex: 31,
      },
      rule: {
        condition: {
          type: 'ONE_OF_LIST',
          values: [
            { userEnteredValue: 'single' },
            { userEnteredValue: 'multiple' },
            { userEnteredValue: 'all' },
            { userEnteredValue: 'unknown' },
          ],
        },
        showCustomUi: true,
        strict: true,
      },
    },
  });

  // 12. Add borders to all data
  requests.push({
    updateBorders: {
      range: {
        sheetId: feedbackSheetId,
        startRowIndex: 0,
        endRowIndex: 1000,
        startColumnIndex: 0,
        endColumnIndex: 37,
      },
      top: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
      bottom: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
      left: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
      right: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
      innerHorizontal: { style: 'SOLID', color: { red: 0.9, green: 0.9, blue: 0.9 } },
      innerVertical: { style: 'SOLID', color: { red: 0.9, green: 0.9, blue: 0.9 } },
    },
  });

  // ============================================
  // DASHBOARD SHEET STYLING
  // ============================================
  if (dashboardSheetId !== undefined) {
    console.log('\n📊 Styling Dashboard sheet...');

    // Dashboard title styling
    requests.push({
      repeatCell: {
        range: {
          sheetId: dashboardSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 6,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: COLORS.emeraldDark,
            textFormat: {
              foregroundColor: COLORS.headerText,
              bold: true,
              fontSize: 16,
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
      },
    });

    // Merge title cells
    requests.push({
      mergeCells: {
        range: {
          sheetId: dashboardSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 4,
        },
        mergeType: 'MERGE_ALL',
      },
    });

    // Set dashboard column widths
    const dashboardWidths = [
      { start: 0, end: 1, width: 200 },
      { start: 1, end: 2, width: 100 },
      { start: 2, end: 3, width: 100 },
      { start: 3, end: 4, width: 120 },
      { start: 4, end: 5, width: 100 },
      { start: 5, end: 6, width: 100 },
    ];

    for (const col of dashboardWidths) {
      requests.push({
        updateDimensionProperties: {
          range: {
            sheetId: dashboardSheetId,
            dimension: 'COLUMNS',
            startIndex: col.start,
            endIndex: col.end,
          },
          properties: {
            pixelSize: col.width,
          },
          fields: 'pixelSize',
        },
      });
    }

    // Style section headers (rows with emojis at start)
    const sectionRows = [2, 5, 12, 18, 25, 30, 35, 41, 45, 53, 57, 62];
    for (const row of sectionRows) {
      requests.push({
        repeatCell: {
          range: {
            sheetId: dashboardSheetId,
            startRowIndex: row,
            endRowIndex: row + 1,
            startColumnIndex: 0,
            endColumnIndex: 6,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: COLORS.emeraldLight,
              textFormat: {
                foregroundColor: COLORS.emeraldDark,
                bold: true,
                fontSize: 11,
              },
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat)',
        },
      });
    }
  }

  // Execute all requests
  console.log(`\n⚙️ Executing ${requests.length} formatting requests...`);

  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: FEEDBACK_SPREADSHEET_ID,
      resource: { requests },
    });
    console.log('\n✅ Visual design applied successfully!');
    console.log('\n🎨 Applied styles:');
    console.log('   • Emerald-themed header with frozen row');
    console.log('   • Alternating row colors for readability');
    console.log('   • Optimized column widths');
    console.log('   • Color-coded status (open/in_progress/resolved/wontfix/duplicate)');
    console.log('   • Color-coded priority (critical/high/medium/low)');
    console.log('   • Dropdown menus for status, priority, category, affected users');
    console.log('   • Professional borders');
    console.log('   • Dashboard section styling');
  } catch (error) {
    console.error('❌ Error applying styles:', error.message);
    if (error.errors) {
      error.errors.forEach(e => console.error('   -', e.message));
    }
  }
}

applyVisualDesign().catch(console.error);
