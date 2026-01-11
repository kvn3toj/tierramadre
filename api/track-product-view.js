/**
 * Vercel Serverless Function - Track Product Views
 *
 * Records product views to a Google Sheet for analytics.
 * Includes user identity (name, email) when available.
 *
 * Sheet Structure (ProductViews):
 * A: timestamp
 * B: itemId
 * C: productName
 * D: sessionId
 * E: referrer
 * F: deviceType
 * G: browser
 * H: country (from Vercel headers)
 * I: userName (if logged in)
 * J: userEmail (if logged in)
 * K: userRole (guest/full/admin)
 */

import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';

// Use the same spreadsheet as treasure data, add a new sheet for analytics
const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';
const VIEWS_SHEET_NAME = 'ProductViews';
const DASHBOARD_SHEET_NAME = 'ViewsDashboard';

// Headers for the ProductViews sheet
const VIEWS_HEADERS = [
  'timestamp',    // A: ISO timestamp
  'itemId',       // B: Product item number
  'productName',  // C: Product name
  'sessionId',    // D: Client session ID (for dedup reference)
  'referrer',     // E: Where they came from
  'deviceType',   // F: mobile/tablet/desktop
  'browser',      // G: Browser name
  'country',      // H: Country from Vercel geo headers
  'userName',     // I: User's name (if logged in)
  'userEmail',    // J: User's email (if logged in)
  'userRole',     // K: User's role (guest/full/admin)
];

/**
 * Initialize Google Sheets API with service account credentials
 */
function getSheetsClient() {
  try {
    const cleanKey = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '').replace(/[\s"]+/g, '');
    const credentials = JSON.parse(
      Buffer.from(cleanKey, 'base64').toString()
    );

    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return new sheets_v4.Sheets({ auth });
  } catch (error) {
    console.error('Error initializing Sheets client:', error);
    throw new Error('Failed to initialize Google Sheets client');
  }
}

/**
 * Parse user agent for device type and browser
 */
function parseUserAgent(userAgent) {
  if (!userAgent) return { deviceType: 'unknown', browser: 'unknown' };

  // Device type
  let deviceType = 'desktop';
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    deviceType = /iPad|Tablet/.test(userAgent) ? 'tablet' : 'mobile';
  }

  // Browser
  let browser = 'unknown';
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Chrome';
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Edg')) browser = 'Edge';

  return { deviceType, browser };
}

/**
 * Ensure the ProductViews sheet exists with proper structure
 */
async function ensureViewsSheet(sheets) {
  try {
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const existingSheets = metadata.data.sheets.map((s) => s.properties.title);
    const requests = [];

    // Create ProductViews sheet if not exists
    if (!existingSheets.includes(VIEWS_SHEET_NAME)) {
      requests.push({
        addSheet: {
          properties: {
            title: VIEWS_SHEET_NAME,
            gridProperties: { frozenRowCount: 1 },
          },
        },
      });
    }

    // Create ViewsDashboard sheet if not exists
    if (!existingSheets.includes(DASHBOARD_SHEET_NAME)) {
      requests.push({
        addSheet: {
          properties: {
            title: DASHBOARD_SHEET_NAME,
            gridProperties: { frozenRowCount: 1 },
          },
        },
      });
    }

    // Execute batch update if needed
    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: { requests },
      });
    }

    // Check if headers need to be added
    const currentHeaders = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${VIEWS_SHEET_NAME}!1:1`,
    });

    const currentCount = currentHeaders.data.values?.[0]?.length || 0;

    // Add headers if missing or incomplete
    if (currentCount < VIEWS_HEADERS.length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${VIEWS_SHEET_NAME}!A1:K1`,
        valueInputOption: 'RAW',
        resource: {
          values: [VIEWS_HEADERS],
        },
      });
      console.log('ProductViews headers initialized');
    }

    // Setup Dashboard if empty
    const dashboardData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${DASHBOARD_SHEET_NAME}!A1:A1`,
    });

    if (!dashboardData.data.values?.[0]?.[0]) {
      await setupViewsDashboard(sheets);
    }

    return true;
  } catch (error) {
    console.error('Error ensuring views sheet:', error);
    throw error;
  }
}

/**
 * Setup ViewsDashboard with metrics and formulas
 */
async function setupViewsDashboard(sheets) {
  const dashboardContent = [
    // Row 1: Title
    ['PRODUCT VIEWS DASHBOARD', '', '', '', 'Última actualización:', '=NOW()'],
    [''],
    // Row 3: Summary metrics
    ['RESUMEN GENERAL', '', '', '', '', ''],
    ['Total Views', '=COUNTA(ProductViews!B:B)-1', '', 'Hoy', '=COUNTIF(ProductViews!A:A,">="&TODAY())', ''],
    ['Productos Únicos Vistos', '=COUNTA(UNIQUE(ProductViews!B2:B))', '', 'Esta semana', '=COUNTIFS(ProductViews!A:A,">="&(TODAY()-7))', ''],
    [''],
    // Row 7: Top 10 Products Header
    ['TOP 10 PRODUCTOS MÁS VISTOS', 'Views', '', '', '', ''],
    // Rows 8-17: Top 10 products (using QUERY)
    ['=IFERROR(INDEX(QUERY(ProductViews!B2:C,"SELECT C, COUNT(B) WHERE B IS NOT NULL GROUP BY C ORDER BY COUNT(B) DESC LIMIT 10"),1,1),"—")', '=IFERROR(INDEX(QUERY(ProductViews!B2:C,"SELECT C, COUNT(B) WHERE B IS NOT NULL GROUP BY C ORDER BY COUNT(B) DESC LIMIT 10"),1,2),0)', '', '', '', ''],
    ['=IFERROR(INDEX(QUERY(ProductViews!B2:C,"SELECT C, COUNT(B) WHERE B IS NOT NULL GROUP BY C ORDER BY COUNT(B) DESC LIMIT 10"),2,1),"—")', '=IFERROR(INDEX(QUERY(ProductViews!B2:C,"SELECT C, COUNT(B) WHERE B IS NOT NULL GROUP BY C ORDER BY COUNT(B) DESC LIMIT 10"),2,2),0)', '', '', '', ''],
    ['=IFERROR(INDEX(QUERY(ProductViews!B2:C,"SELECT C, COUNT(B) WHERE B IS NOT NULL GROUP BY C ORDER BY COUNT(B) DESC LIMIT 10"),3,1),"—")', '=IFERROR(INDEX(QUERY(ProductViews!B2:C,"SELECT C, COUNT(B) WHERE B IS NOT NULL GROUP BY C ORDER BY COUNT(B) DESC LIMIT 10"),3,2),0)', '', '', '', ''],
    ['=IFERROR(INDEX(QUERY(ProductViews!B2:C,"SELECT C, COUNT(B) WHERE B IS NOT NULL GROUP BY C ORDER BY COUNT(B) DESC LIMIT 10"),4,1),"—")', '=IFERROR(INDEX(QUERY(ProductViews!B2:C,"SELECT C, COUNT(B) WHERE B IS NOT NULL GROUP BY C ORDER BY COUNT(B) DESC LIMIT 10"),4,2),0)', '', '', '', ''],
    ['=IFERROR(INDEX(QUERY(ProductViews!B2:C,"SELECT C, COUNT(B) WHERE B IS NOT NULL GROUP BY C ORDER BY COUNT(B) DESC LIMIT 10"),5,1),"—")', '=IFERROR(INDEX(QUERY(ProductViews!B2:C,"SELECT C, COUNT(B) WHERE B IS NOT NULL GROUP BY C ORDER BY COUNT(B) DESC LIMIT 10"),5,2),0)', '', '', '', ''],
    [''],
    // Row 14: Device breakdown
    ['POR DISPOSITIVO', 'Views', '%', '', '', ''],
    ['Mobile', '=COUNTIF(ProductViews!F:F,"mobile")', '=IF(B4>0,B15/B4*100,0)&"%"', '', '', ''],
    ['Tablet', '=COUNTIF(ProductViews!F:F,"tablet")', '=IF(B4>0,B16/B4*100,0)&"%"', '', '', ''],
    ['Desktop', '=COUNTIF(ProductViews!F:F,"desktop")', '=IF(B4>0,B17/B4*100,0)&"%"', '', '', ''],
    [''],
    // Row 19: User breakdown
    ['POR USUARIO (Logged In)', 'Views', '', '', '', ''],
    ['=IFERROR(INDEX(QUERY(ProductViews!I2:J,"SELECT I, COUNT(I) WHERE I IS NOT NULL AND I <> \'\' GROUP BY I ORDER BY COUNT(I) DESC LIMIT 10"),1,1),"—")', '=IFERROR(INDEX(QUERY(ProductViews!I2:J,"SELECT I, COUNT(I) WHERE I IS NOT NULL AND I <> \'\' GROUP BY I ORDER BY COUNT(I) DESC LIMIT 10"),1,2),0)', '', '', '', ''],
    ['=IFERROR(INDEX(QUERY(ProductViews!I2:J,"SELECT I, COUNT(I) WHERE I IS NOT NULL AND I <> \'\' GROUP BY I ORDER BY COUNT(I) DESC LIMIT 10"),2,1),"—")', '=IFERROR(INDEX(QUERY(ProductViews!I2:J,"SELECT I, COUNT(I) WHERE I IS NOT NULL AND I <> \'\' GROUP BY I ORDER BY COUNT(I) DESC LIMIT 10"),2,2),0)', '', '', '', ''],
    ['=IFERROR(INDEX(QUERY(ProductViews!I2:J,"SELECT I, COUNT(I) WHERE I IS NOT NULL AND I <> \'\' GROUP BY I ORDER BY COUNT(I) DESC LIMIT 10"),3,1),"—")', '=IFERROR(INDEX(QUERY(ProductViews!I2:J,"SELECT I, COUNT(I) WHERE I IS NOT NULL AND I <> \'\' GROUP BY I ORDER BY COUNT(I) DESC LIMIT 10"),3,2),0)', '', '', '', ''],
    ['=IFERROR(INDEX(QUERY(ProductViews!I2:J,"SELECT I, COUNT(I) WHERE I IS NOT NULL AND I <> \'\' GROUP BY I ORDER BY COUNT(I) DESC LIMIT 10"),4,1),"—")', '=IFERROR(INDEX(QUERY(ProductViews!I2:J,"SELECT I, COUNT(I) WHERE I IS NOT NULL AND I <> \'\' GROUP BY I ORDER BY COUNT(I) DESC LIMIT 10"),4,2),0)', '', '', '', ''],
    ['=IFERROR(INDEX(QUERY(ProductViews!I2:J,"SELECT I, COUNT(I) WHERE I IS NOT NULL AND I <> \'\' GROUP BY I ORDER BY COUNT(I) DESC LIMIT 10"),5,1),"—")', '=IFERROR(INDEX(QUERY(ProductViews!I2:J,"SELECT I, COUNT(I) WHERE I IS NOT NULL AND I <> \'\' GROUP BY I ORDER BY COUNT(I) DESC LIMIT 10"),5,2),0)', '', '', '', ''],
    [''],
    // Row 26: Guest vs Logged in
    ['POR ROL', 'Views', '%', '', '', ''],
    ['Guest (anónimo)', '=COUNTIF(ProductViews!K:K,"guest")', '=IF(B4>0,B27/B4*100,0)&"%"', '', '', ''],
    ['Full (asesor)', '=COUNTIF(ProductViews!K:K,"full")', '=IF(B4>0,B28/B4*100,0)&"%"', '', '', ''],
    ['Admin', '=COUNTIF(ProductViews!K:K,"admin")', '=IF(B4>0,B29/B4*100,0)&"%"', '', '', ''],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${DASHBOARD_SHEET_NAME}!A1:F30`,
    valueInputOption: 'USER_ENTERED', // Important for formulas!
    resource: {
      values: dashboardContent,
    },
  });

  console.log('ViewsDashboard initialized with formulas');
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if service account key is configured
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({
      error: 'Google Service Account not configured',
    });
  }

  try {
    const {
      itemId,
      productName,
      sessionId,
      referrer = 'direct',
      userName = null,
      userEmail = null,
      userRole = 'guest',
    } = req.body;

    // Validate required fields
    if (!itemId) {
      return res.status(400).json({
        error: 'Missing required field: itemId',
      });
    }

    const sheets = getSheetsClient();

    // Ensure the sheet exists
    await ensureViewsSheet(sheets);

    // Parse device info from user agent
    const userAgent = req.headers['user-agent'] || '';
    const { deviceType, browser } = parseUserAgent(userAgent);

    // Get country from Vercel geo headers (if available)
    const country = req.headers['x-vercel-ip-country'] || 'unknown';

    const timestamp = new Date().toISOString();

    // Prepare row data (matching VIEWS_HEADERS)
    const rowData = [
      timestamp,                              // A: timestamp
      String(itemId),                         // B: itemId
      productName || `Item ${itemId}`,        // C: productName
      sessionId || 'unknown',                 // D: sessionId
      referrer,                               // E: referrer
      deviceType,                             // F: deviceType
      browser,                                // G: browser
      country,                                // H: country
      userName || '',                         // I: userName (empty if guest)
      userEmail || '',                        // J: userEmail (empty if guest)
      userRole || 'guest',                    // K: userRole
    ];

    // Append the row
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${VIEWS_SHEET_NAME}!A:K`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [rowData],
      },
    });

    const userDisplay = userName || 'Guest';
    console.log(`View tracked: Item ${itemId} | ${userDisplay} | ${deviceType} | ${country}`);

    return res.status(200).json({
      success: true,
      message: 'View tracked',
    });
  } catch (error) {
    console.error('Error tracking view:', error);
    return res.status(500).json({
      error: 'Failed to track view',
      message: error.message,
    });
  }
}
