/**
 * Vercel Serverless Function - Submit Admin Feedback (Enhanced)
 *
 * Receives feedback from admins and stores in a dedicated Google Sheet.
 * Enhanced with: ratings, device info, tags, version tracking, and metrics.
 *
 * Sheet Structure:
 * - Feedback: Main data (26 columns)
 * - Dashboard: Auto-calculated metrics and visualizations
 * - Tags: Reference list of available tags
 */

import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';

// Dedicated Feedback Sheet - SEPARATE from inventory to avoid overload
const FEEDBACK_SPREADSHEET_ID = process.env.FEEDBACK_SPREADSHEET_ID || '1Nl2gxfZzWy4lUv_C-9xTt90MzFDIgHLvWtWtDRNzJaU';
const FEEDBACK_SHEET_NAME = 'Feedback';
const DASHBOARD_SHEET_NAME = 'Dashboard';

// Enhanced column headers (26 columns: A-Z)
const FEEDBACK_HEADERS = [
  // Core identification (A-D)
  'timestamp',        // A: ISO timestamp
  'id',               // B: TM-XXXXXXXX
  'version',          // C: App version (e.g., "1.2.3")
  'environment',      // D: dev/staging/production

  // Context (E-H)
  'page',             // E: Route/page path
  'component',        // F: Specific component
  'feature',          // G: Feature area (inventory, cotizacion, etc.)
  'userFlow',         // H: What user was trying to do

  // Classification (I-L)
  'category',         // I: bug, feature, ux, performance, content, other
  'priority',         // J: critical, high, medium, low
  'severity',         // K: 1-5 scale (5=blocker, 1=cosmetic)
  'tags',             // L: Comma-separated tags

  // Details (M-P)
  'title',            // M: Short summary (NEW)
  'description',      // N: Full description
  'expectedBehavior', // O: What should happen (NEW)
  'actualBehavior',   // P: What actually happened (NEW)

  // Media (Q-R)
  'screenshot',       // Q: Base64 or Cloudinary URL
  'highlightBox',     // R: JSON annotation data

  // Device info (S-U)
  'deviceType',       // S: mobile/tablet/desktop
  'browser',          // T: Chrome/Safari/Firefox + version
  'os',               // U: iOS/Android/Windows/macOS

  // Author (V-W)
  'adminEmail',       // V: Reporter email
  'adminName',        // W: Reporter name

  // Tracking (X-Z)
  'status',           // X: open/in_progress/resolved/wontfix/duplicate
  'assignee',         // Y: Who's working on it (NEW)
  'resolvedAt',       // Z: Resolution timestamp

  // Extended (AA-AC) - Additional columns
  'resolutionTime',   // AA: Hours to resolve (calculated)
  'notes',            // AB: Developer notes
  'relatedIds',       // AC: Related feedback IDs (duplicates, related)
];

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
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return google.sheets({ version: 'v4', auth });
  } catch (error) {
    console.error('Error initializing Sheets client:', error);
    throw new Error('Failed to initialize Google Sheets client');
  }
}

/**
 * Get device info from user agent string
 */
function parseUserAgent(userAgent) {
  if (!userAgent) return { deviceType: 'unknown', browser: 'unknown', os: 'unknown' };

  // Device type
  let deviceType = 'desktop';
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    deviceType = /iPad|Tablet/.test(userAgent) ? 'tablet' : 'mobile';
  }

  // Browser
  let browser = 'unknown';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  // OS
  let os = 'unknown';
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';

  return { deviceType, browser, os };
}

/**
 * Ensure the Feedback sheet exists with enhanced structure
 */
async function ensureFeedbackSheet(sheets) {
  try {
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: FEEDBACK_SPREADSHEET_ID,
    });

    const existingSheets = metadata.data.sheets.map((s) => s.properties.title);
    const requests = [];

    // Create Feedback sheet if not exists
    if (!existingSheets.includes(FEEDBACK_SHEET_NAME)) {
      requests.push({
        addSheet: {
          properties: {
            title: FEEDBACK_SHEET_NAME,
            gridProperties: { frozenRowCount: 1 },
          },
        },
      });
    }

    // Create Dashboard sheet if not exists
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
        spreadsheetId: FEEDBACK_SPREADSHEET_ID,
        resource: { requests },
      });
    }

    // Check if headers need updating (compare column count)
    const currentHeaders = await sheets.spreadsheets.values.get({
      spreadsheetId: FEEDBACK_SPREADSHEET_ID,
      range: `${FEEDBACK_SHEET_NAME}!1:1`,
    });

    const currentCount = currentHeaders.data.values?.[0]?.length || 0;

    // Update headers if missing or outdated
    if (currentCount < FEEDBACK_HEADERS.length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: FEEDBACK_SPREADSHEET_ID,
        range: `${FEEDBACK_SHEET_NAME}!A1:AC1`,
        valueInputOption: 'RAW',
        resource: {
          values: [FEEDBACK_HEADERS],
        },
      });
      console.log(`Updated Feedback headers: ${currentCount} → ${FEEDBACK_HEADERS.length} columns`);
    }

    // Setup Dashboard formulas if empty
    const dashboardData = await sheets.spreadsheets.values.get({
      spreadsheetId: FEEDBACK_SPREADSHEET_ID,
      range: `${DASHBOARD_SHEET_NAME}!A1:A1`,
    });

    if (!dashboardData.data.values?.[0]?.[0]) {
      await setupDashboard(sheets);
    }

    return true;
  } catch (error) {
    console.error('Error ensuring feedback sheet:', error);
    throw error;
  }
}

/**
 * Setup Dashboard sheet with metrics and formulas
 */
async function setupDashboard(sheets) {
  const dashboardContent = [
    // Row 1: Title
    ['📊 FEEDBACK DASHBOARD', '', '', '', 'Última actualización:', '=NOW()'],
    [''],
    // Row 3: Summary metrics
    ['📈 RESUMEN GENERAL', '', '', '', '', ''],
    ['Total Feedback', '=COUNTA(Feedback!B:B)-1', '', 'Esta semana', '=COUNTIFS(Feedback!A:A,">="&(TODAY()-7),Feedback!A:A,"<="&TODAY())', ''],
    [''],
    // Row 6: Status breakdown
    ['📋 POR ESTADO', 'Cantidad', '%', '', '', ''],
    ['🔴 Abiertos', '=COUNTIF(Feedback!X:X,"open")', '=IF(B4>0,B7/B4*100,0)&"%"', '', '', ''],
    ['🟡 En Progreso', '=COUNTIF(Feedback!X:X,"in_progress")', '=IF(B4>0,B8/B4*100,0)&"%"', '', '', ''],
    ['🟢 Resueltos', '=COUNTIF(Feedback!X:X,"resolved")', '=IF(B4>0,B9/B4*100,0)&"%"', '', '', ''],
    ['⚫ No se hará', '=COUNTIF(Feedback!X:X,"wontfix")', '=IF(B4>0,B10/B4*100,0)&"%"', '', '', ''],
    ['🔵 Duplicados', '=COUNTIF(Feedback!X:X,"duplicate")', '=IF(B4>0,B11/B4*100,0)&"%"', '', '', ''],
    [''],
    // Row 13: Priority breakdown
    ['🚨 POR PRIORIDAD', 'Cantidad', 'Abiertos', '', '', ''],
    ['🔴 Crítico', '=COUNTIF(Feedback!J:J,"critical")', '=COUNTIFS(Feedback!J:J,"critical",Feedback!X:X,"open")', '', '', ''],
    ['🟠 Alto', '=COUNTIF(Feedback!J:J,"high")', '=COUNTIFS(Feedback!J:J,"high",Feedback!X:X,"open")', '', '', ''],
    ['🟡 Medio', '=COUNTIF(Feedback!J:J,"medium")', '=COUNTIFS(Feedback!J:J,"medium",Feedback!X:X,"open")', '', '', ''],
    ['🟢 Bajo', '=COUNTIF(Feedback!J:J,"low")', '=COUNTIFS(Feedback!J:J,"low",Feedback!X:X,"open")', '', '', ''],
    [''],
    // Row 19: Category breakdown
    ['📁 POR CATEGORÍA', 'Cantidad', 'Abiertos', '', '', ''],
    ['🐛 Bugs', '=COUNTIF(Feedback!I:I,"bug")', '=COUNTIFS(Feedback!I:I,"bug",Feedback!X:X,"open")', '', '', ''],
    ['✨ Features', '=COUNTIF(Feedback!I:I,"feature")', '=COUNTIFS(Feedback!I:I,"feature",Feedback!X:X,"open")', '', '', ''],
    ['🎨 UX/UI', '=COUNTIF(Feedback!I:I,"ux")', '=COUNTIFS(Feedback!I:I,"ux",Feedback!X:X,"open")', '', '', ''],
    ['⚡ Performance', '=COUNTIF(Feedback!I:I,"performance")', '=COUNTIFS(Feedback!I:I,"performance",Feedback!X:X,"open")', '', '', ''],
    ['📝 Contenido', '=COUNTIF(Feedback!I:I,"content")', '=COUNTIFS(Feedback!I:I,"content",Feedback!X:X,"open")', '', '', ''],
    [''],
    // Row 26: Device breakdown
    ['📱 POR DISPOSITIVO', 'Cantidad', '%', '', '', ''],
    ['📱 Mobile', '=COUNTIF(Feedback!S:S,"mobile")', '=IF(B4>0,B27/B4*100,0)&"%"', '', '', ''],
    ['📲 Tablet', '=COUNTIF(Feedback!S:S,"tablet")', '=IF(B4>0,B28/B4*100,0)&"%"', '', '', ''],
    ['💻 Desktop', '=COUNTIF(Feedback!S:S,"desktop")', '=IF(B4>0,B29/B4*100,0)&"%"', '', '', ''],
    [''],
    // Row 31: Performance metrics
    ['⏱️ MÉTRICAS DE TIEMPO', '', '', '', '', ''],
    ['Tiempo promedio resolución (hrs)', '=IFERROR(AVERAGE(Feedback!AA:AA),"N/A")', '', '', '', ''],
    ['Feedback más antiguo abierto', '=IFERROR(MIN(FILTER(Feedback!A:A,Feedback!X:X="open")),"Ninguno")', '', '', '', ''],
    [''],
    // Row 35: Feature breakdown
    ['🎯 POR FEATURE', 'Cantidad', 'Abiertos', '', '', ''],
    ['Inventario', '=COUNTIF(Feedback!G:G,"inventory")', '=COUNTIFS(Feedback!G:G,"inventory",Feedback!X:X,"open")', '', '', ''],
    ['Cotizaciones', '=COUNTIF(Feedback!G:G,"cotizacion")', '=COUNTIFS(Feedback!G:G,"cotizacion",Feedback!X:X,"open")', '', '', ''],
    ['Home', '=COUNTIF(Feedback!G:G,"home")', '=COUNTIFS(Feedback!G:G,"home",Feedback!X:X,"open")', '', '', ''],
    ['Embajadores', '=COUNTIF(Feedback!G:G,"ambassadors")', '=COUNTIFS(Feedback!G:G,"ambassadors",Feedback!X:X,"open")', '', '', ''],
    ['Cuentas', '=COUNTIF(Feedback!G:G,"accounts")', '=COUNTIFS(Feedback!G:G,"accounts",Feedback!X:X,"open")', '', '', ''],
    ['Otro', '=B4-B36-B37-B38-B39-B40', '', '', '', ''],
    [''],
    // Row 43: Top reporters
    ['👥 TOP REPORTADORES', 'Cantidad', '', '', '', ''],
    ['(Ver columna W de Feedback)', '', '', '', '', ''],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: FEEDBACK_SPREADSHEET_ID,
    range: `${DASHBOARD_SHEET_NAME}!A1:F45`,
    valueInputOption: 'USER_ENTERED', // Important for formulas!
    resource: {
      values: dashboardContent,
    },
  });

  console.log('Dashboard sheet initialized with formulas');
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, User-Agent');

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
      message: 'Please set up GOOGLE_SERVICE_ACCOUNT_KEY environment variable',
    });
  }

  try {
    const {
      // Core identification
      version = '1.0.0',
      environment = 'production',

      // Context
      page,
      component = 'general',
      feature = '',
      userFlow = '',

      // Classification
      category,
      priority = 'medium',
      severity = 3,
      tags = '',

      // Details
      title = '',
      description,
      expectedBehavior = '',
      actualBehavior = '',

      // Media
      screenshot,
      highlightBox,

      // Device info (can be auto-detected from user agent)
      deviceType: providedDeviceType,
      browser: providedBrowser,
      os: providedOS,
      userAgent,

      // Author
      adminEmail,
      adminName,
    } = req.body;

    // Validate required fields
    if (!page || !category || !description) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'page, category, and description are required',
      });
    }

    const sheets = getSheetsClient();

    // Ensure the feedback sheet exists with enhanced structure
    await ensureFeedbackSheet(sheets);

    // Generate unique ID
    const feedbackId = `TM-${uuidv4().slice(0, 8).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    // Parse device info from user agent if not provided
    const ua = userAgent || req.headers['user-agent'] || '';
    const parsedDevice = parseUserAgent(ua);
    const deviceInfo = {
      deviceType: providedDeviceType || parsedDevice.deviceType,
      browser: providedBrowser || parsedDevice.browser,
      os: providedOS || parsedDevice.os,
    };

    // Auto-detect feature from page path if not provided
    const detectedFeature = feature || detectFeatureFromPage(page);

    // Prepare row data (29 columns: A-AC)
    const rowData = [
      // Core identification (A-D)
      timestamp,                                    // A: timestamp
      feedbackId,                                   // B: id
      version,                                      // C: version
      environment,                                  // D: environment

      // Context (E-H)
      page,                                         // E: page
      component,                                    // F: component
      detectedFeature,                              // G: feature
      userFlow,                                     // H: userFlow

      // Classification (I-L)
      category,                                     // I: category
      priority,                                     // J: priority
      String(severity),                             // K: severity (1-5)
      tags,                                         // L: tags

      // Details (M-P)
      title || description.substring(0, 50),        // M: title (auto from description if empty)
      description,                                  // N: description
      expectedBehavior,                             // O: expectedBehavior
      actualBehavior,                               // P: actualBehavior

      // Media (Q-R)
      screenshot || '',                             // Q: screenshot
      highlightBox ? JSON.stringify(highlightBox) : '', // R: highlightBox

      // Device info (S-U)
      deviceInfo.deviceType,                        // S: deviceType
      deviceInfo.browser,                           // T: browser
      deviceInfo.os,                                // U: os

      // Author (V-W)
      adminEmail || 'unknown',                      // V: adminEmail
      adminName || 'Admin',                         // W: adminName

      // Tracking (X-Z)
      'open',                                       // X: status
      '',                                           // Y: assignee
      '',                                           // Z: resolvedAt

      // Extended (AA-AC)
      '',                                           // AA: resolutionTime (calculated on resolve)
      '',                                           // AB: notes
      '',                                           // AC: relatedIds
    ];

    // Append the row
    await sheets.spreadsheets.values.append({
      spreadsheetId: FEEDBACK_SPREADSHEET_ID,
      range: `${FEEDBACK_SHEET_NAME}!A:AC`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [rowData],
      },
    });

    console.log(`Feedback ${feedbackId} submitted by ${adminEmail} | ${category} | ${priority} | ${deviceInfo.deviceType}`);

    return res.status(200).json({
      success: true,
      id: feedbackId,
      message: `Feedback ${feedbackId} submitted successfully`,
      data: {
        id: feedbackId,
        timestamp,
        category,
        priority,
        severity,
        feature: detectedFeature,
        device: deviceInfo,
      },
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return res.status(500).json({
      error: 'Failed to submit feedback',
      message: error.message,
    });
  }
}

/**
 * Auto-detect feature area from page path
 */
function detectFeatureFromPage(page) {
  if (!page) return 'other';

  const path = page.toLowerCase();

  if (path.includes('treasure') || path.includes('inventory') || path.includes('product')) {
    return 'inventory';
  }
  if (path.includes('cotizacion') || path.includes('quotation')) {
    return 'cotizacion';
  }
  if (path.includes('ambassador') || path.includes('asesor')) {
    return 'ambassadors';
  }
  if (path.includes('cuentas') || path.includes('simulator') || path.includes('receipt')) {
    return 'accounts';
  }
  if (path.includes('home') || path === '/') {
    return 'home';
  }
  if (path.includes('vault') || path.includes('boveda')) {
    return 'vault';
  }
  if (path.includes('admin') || path.includes('analytics') || path.includes('feedback')) {
    return 'admin';
  }
  if (path.includes('guide')) {
    return 'guide';
  }

  return 'other';
}
