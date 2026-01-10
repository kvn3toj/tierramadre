/**
 * Vercel Serverless Function - Setup/Upgrade Feedback Sheet
 *
 * Forces the feedback sheet to update to the new 29-column structure.
 * Also creates/updates the Dashboard sheet with formulas.
 *
 * Call this endpoint once to migrate the existing sheet.
 */

import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';

// Trim to remove any trailing whitespace/newlines from env var
const FEEDBACK_SPREADSHEET_ID = (process.env.FEEDBACK_SPREADSHEET_ID || '1Nl2gxfZzWy4lUv_C-9xTt90MzFDIgHLvWtWtDRNzJaU').trim();
const FEEDBACK_SHEET_NAME = 'Feedback';
const DASHBOARD_SHEET_NAME = 'Dashboard';

// Enhanced column headers (37 columns: A-AK)
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
  'title',            // M: Short summary
  'description',      // N: Full description
  'expectedBehavior', // O: What should happen
  'actualBehavior',   // P: What actually happened

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
  'assignee',         // Y: Who's working on it
  'resolvedAt',       // Z: Resolution timestamp

  // Extended (AA-AC)
  'resolutionTime',   // AA: Hours to resolve (calculated)
  'notes',            // AB: Developer notes
  'relatedIds',       // AC: Related feedback IDs (duplicates, related)

  // Steve's Enhancements (AD-AK)
  'reproductionSteps', // AD: Steps to reproduce the issue
  'affectedUsers',     // AE: Number/type of affected users (single, multiple, all)
  'workaround',        // AF: Temporary workaround if available
  'linkedPR',          // AG: GitHub PR link for the fix
  'firstResponseAt',   // AH: Timestamp of first response/acknowledgment
  'firstResponseTime', // AI: Hours until first response (calculated)
  'reopenCount',       // AJ: Number of times issue was reopened
  'satisfactionScore', // AK: User satisfaction after resolution (1-5)
];

/**
 * Initialize Google Sheets API with service account credentials
 */
function getSheetsClient() {
  try {
    // Clean the base64 key (remove embedded newlines, spaces, and quotes from env var)
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
 * Setup Dashboard sheet with metrics and formulas (Enhanced by Steve)
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
    // Row 31: Performance metrics (Enhanced)
    ['⏱️ MÉTRICAS DE TIEMPO', '', '', '', '', ''],
    ['Tiempo promedio resolución (hrs)', '=IFERROR(AVERAGE(Feedback!AA:AA),"N/A")', '', '', '', ''],
    ['Tiempo promedio primera respuesta (hrs)', '=IFERROR(AVERAGE(Feedback!AI:AI),"N/A")', '', '', '', ''],
    ['Feedback más antiguo abierto', '=IFERROR(MIN(FILTER(Feedback!A:A,Feedback!X:X="open")),"Ninguno")', '', '', '', ''],
    [''],
    // Row 36: SLA Tracking (Steve's Enhancement)
    ['🎯 SLA TRACKING', 'Meta', 'Actual', 'Estado', '', ''],
    ['Primera respuesta (<4hrs)', '4', '=IFERROR(AVERAGE(Feedback!AI:AI),0)', '=IF(C38<=B38,"✅ OK","⚠️ LATE")', '', ''],
    ['Resolución críticos (<24hrs)', '24', '=IFERROR(AVERAGEIF(Feedback!J:J,"critical",Feedback!AA:AA),0)', '=IF(C39<=B39,"✅ OK","⚠️ LATE")', '', ''],
    ['Resolución alta (<48hrs)', '48', '=IFERROR(AVERAGEIF(Feedback!J:J,"high",Feedback!AA:AA),0)', '=IF(C40<=B40,"✅ OK","⚠️ LATE")', '', ''],
    [''],
    // Row 42: Weekly Trends (Steve's Enhancement)
    ['📈 TENDENCIAS SEMANALES', 'Esta semana', 'Semana pasada', 'Cambio', '', ''],
    ['Nuevos reportes', '=COUNTIFS(Feedback!A:A,">="&(TODAY()-7),Feedback!A:A,"<="&TODAY())', '=COUNTIFS(Feedback!A:A,">="&(TODAY()-14),Feedback!A:A,"<"&(TODAY()-7))', '=IF(C43>0,(B43-C43)/C43*100,0)&"%"', '', ''],
    ['Resueltos', '=COUNTIFS(Feedback!Z:Z,">="&(TODAY()-7),Feedback!Z:Z,"<="&TODAY())', '=COUNTIFS(Feedback!Z:Z,">="&(TODAY()-14),Feedback!Z:Z,"<"&(TODAY()-7))', '=IF(C44>0,(B44-C44)/C44*100,0)&"%"', '', ''],
    [''],
    // Row 46: Feature breakdown
    ['🎯 POR FEATURE', 'Cantidad', 'Abiertos', '', '', ''],
    ['Inventario', '=COUNTIF(Feedback!G:G,"inventory")', '=COUNTIFS(Feedback!G:G,"inventory",Feedback!X:X,"open")', '', '', ''],
    ['Cotizaciones', '=COUNTIF(Feedback!G:G,"cotizacion")', '=COUNTIFS(Feedback!G:G,"cotizacion",Feedback!X:X,"open")', '', '', ''],
    ['Home', '=COUNTIF(Feedback!G:G,"home")', '=COUNTIFS(Feedback!G:G,"home",Feedback!X:X,"open")', '', '', ''],
    ['Embajadores', '=COUNTIF(Feedback!G:G,"ambassadors")', '=COUNTIFS(Feedback!G:G,"ambassadors",Feedback!X:X,"open")', '', '', ''],
    ['Cuentas', '=COUNTIF(Feedback!G:G,"accounts")', '=COUNTIFS(Feedback!G:G,"accounts",Feedback!X:X,"open")', '', '', ''],
    ['Otro', '=B4-B47-B48-B49-B50-B51', '', '', '', ''],
    [''],
    // Row 54: Quality Metrics (Steve's Enhancement)
    ['📊 MÉTRICAS DE CALIDAD', '', '', '', '', ''],
    ['Tasa de reapertura', '=IFERROR(COUNTIF(Feedback!AJ:AJ,">0")/B9*100,0)&"%"', '', 'Total reabiertos', '=SUMIF(Feedback!AJ:AJ,">0",Feedback!AJ:AJ)', ''],
    ['Satisfacción promedio', '=IFERROR(AVERAGE(Feedback!AK:AK),"N/A")', '', 'Respuestas', '=COUNTA(Feedback!AK:AK)-1', ''],
    [''],
    // Row 58: Affected Users (Steve's Enhancement)
    ['👥 USUARIOS AFECTADOS', 'Cantidad', '', '', '', ''],
    ['Usuario único', '=COUNTIF(Feedback!AE:AE,"single")', '', '', '', ''],
    ['Múltiples usuarios', '=COUNTIF(Feedback!AE:AE,"multiple")', '', '', '', ''],
    ['Todos los usuarios', '=COUNTIF(Feedback!AE:AE,"all")', '', '', '', ''],
    [''],
    // Row 63: Top reporters
    ['👥 TOP REPORTADORES', 'Cantidad', '', '', '', ''],
    ['(Ver columna W de Feedback)', '', '', '', '', ''],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: FEEDBACK_SPREADSHEET_ID,
    range: `${DASHBOARD_SHEET_NAME}!A1:F65`,
    valueInputOption: 'USER_ENTERED', // Important for formulas!
    resource: {
      values: dashboardContent,
    },
  });

  console.log('Dashboard sheet initialized with enhanced formulas');
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check if service account key is configured
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return res.status(500).json({
      error: 'Google Service Account not configured',
      message: 'Please set up GOOGLE_SERVICE_ACCOUNT_KEY environment variable',
    });
  }

  try {
    const sheets = getSheetsClient();
    const results = {
      spreadsheetId: FEEDBACK_SPREADSHEET_ID,
      feedbackSheet: { updated: false },
      dashboardSheet: { updated: false },
    };

    // Get spreadsheet metadata
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: FEEDBACK_SPREADSHEET_ID,
    });

    const existingSheets = metadata.data.sheets.map((s) => s.properties.title);
    const requests = [];

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
      results.dashboardSheet.created = true;
    }

    // Execute batch update if needed
    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: FEEDBACK_SPREADSHEET_ID,
        resource: { requests },
      });
    }

    // Get current Feedback headers
    const currentHeaders = await sheets.spreadsheets.values.get({
      spreadsheetId: FEEDBACK_SPREADSHEET_ID,
      range: `${FEEDBACK_SHEET_NAME}!1:1`,
    });

    const currentCount = currentHeaders.data.values?.[0]?.length || 0;
    results.feedbackSheet.currentColumns = currentCount;
    results.feedbackSheet.targetColumns = FEEDBACK_HEADERS.length;

    // Force update headers
    await sheets.spreadsheets.values.update({
      spreadsheetId: FEEDBACK_SPREADSHEET_ID,
      range: `${FEEDBACK_SHEET_NAME}!A1:AK1`,
      valueInputOption: 'RAW',
      resource: {
        values: [FEEDBACK_HEADERS],
      },
    });
    results.feedbackSheet.updated = true;
    results.feedbackSheet.newHeaders = FEEDBACK_HEADERS;

    // Setup/Update Dashboard
    await setupDashboard(sheets);
    results.dashboardSheet.updated = true;

    console.log(`Feedback sheet upgraded: ${currentCount} → ${FEEDBACK_HEADERS.length} columns`);

    return res.status(200).json({
      success: true,
      message: `Sheet upgraded from ${currentCount} to ${FEEDBACK_HEADERS.length} columns`,
      results,
    });
  } catch (error) {
    console.error('Error setting up feedback sheet:', error);
    return res.status(500).json({
      error: 'Failed to setup feedback sheet',
      message: error.message,
    });
  }
}
