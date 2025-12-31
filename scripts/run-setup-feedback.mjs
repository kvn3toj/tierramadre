import { google } from 'googleapis';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const FEEDBACK_SPREADSHEET_ID = '1Nl2gxfZzWy4lUv_C-9xTt90MzFDIgHLvWtWtDRNzJaU';
const FEEDBACK_SHEET_NAME = 'Feedback';
const DASHBOARD_SHEET_NAME = 'Dashboard';

// 37 columns: A-AK
const FEEDBACK_HEADERS = [
  'timestamp', 'id', 'version', 'environment',
  'page', 'component', 'feature', 'userFlow',
  'category', 'priority', 'severity', 'tags',
  'title', 'description', 'expectedBehavior', 'actualBehavior',
  'screenshot', 'highlightBox',
  'deviceType', 'browser', 'os',
  'adminEmail', 'adminName',
  'status', 'assignee', 'resolvedAt',
  'resolutionTime', 'notes', 'relatedIds',
  'reproductionSteps', 'affectedUsers', 'workaround', 'linkedPR',
  'firstResponseAt', 'firstResponseTime', 'reopenCount', 'satisfactionScore'
];

async function run() {
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
  );

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Get spreadsheet metadata
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: FEEDBACK_SPREADSHEET_ID,
  });

  const existingSheets = metadata.data.sheets.map((s) => s.properties.title);
  console.log('Existing sheets:', existingSheets);

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
    console.log('Creating Dashboard sheet...');
  }

  // Execute batch update if needed
  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: FEEDBACK_SPREADSHEET_ID,
      resource: { requests },
    });
  }

  // Get current headers
  const currentHeaders = await sheets.spreadsheets.values.get({
    spreadsheetId: FEEDBACK_SPREADSHEET_ID,
    range: `${FEEDBACK_SHEET_NAME}!1:1`,
  });

  const currentCount = currentHeaders.data.values?.[0]?.length || 0;
  console.log('Current columns:', currentCount);
  console.log('Target columns:', FEEDBACK_HEADERS.length);

  // Update headers
  await sheets.spreadsheets.values.update({
    spreadsheetId: FEEDBACK_SPREADSHEET_ID,
    range: `${FEEDBACK_SHEET_NAME}!A1:AK1`,
    valueInputOption: 'RAW',
    resource: {
      values: [FEEDBACK_HEADERS],
    },
  });
  console.log('Headers updated!');

  // Setup Dashboard
  const dashboardContent = [
    ['📊 FEEDBACK DASHBOARD', '', '', '', 'Última actualización:', '=NOW()'],
    [''],
    ['📈 RESUMEN GENERAL', '', '', '', '', ''],
    ['Total Feedback', '=COUNTA(Feedback!B:B)-1', '', 'Esta semana', '=COUNTIFS(Feedback!A:A,">="&(TODAY()-7),Feedback!A:A,"<="&TODAY())', ''],
    [''],
    ['📋 POR ESTADO', 'Cantidad', '%', '', '', ''],
    ['🔴 Abiertos', '=COUNTIF(Feedback!X:X,"open")', '=IF(B4>0,B7/B4*100,0)&"%"', '', '', ''],
    ['🟡 En Progreso', '=COUNTIF(Feedback!X:X,"in_progress")', '=IF(B4>0,B8/B4*100,0)&"%"', '', '', ''],
    ['🟢 Resueltos', '=COUNTIF(Feedback!X:X,"resolved")', '=IF(B4>0,B9/B4*100,0)&"%"', '', '', ''],
    ['⚫ No se hará', '=COUNTIF(Feedback!X:X,"wontfix")', '=IF(B4>0,B10/B4*100,0)&"%"', '', '', ''],
    ['🔵 Duplicados', '=COUNTIF(Feedback!X:X,"duplicate")', '=IF(B4>0,B11/B4*100,0)&"%"', '', '', ''],
    [''],
    ['🚨 POR PRIORIDAD', 'Cantidad', 'Abiertos', '', '', ''],
    ['🔴 Crítico', '=COUNTIF(Feedback!J:J,"critical")', '=COUNTIFS(Feedback!J:J,"critical",Feedback!X:X,"open")', '', '', ''],
    ['🟠 Alto', '=COUNTIF(Feedback!J:J,"high")', '=COUNTIFS(Feedback!J:J,"high",Feedback!X:X,"open")', '', '', ''],
    ['🟡 Medio', '=COUNTIF(Feedback!J:J,"medium")', '=COUNTIFS(Feedback!J:J,"medium",Feedback!X:X,"open")', '', '', ''],
    ['🟢 Bajo', '=COUNTIF(Feedback!J:J,"low")', '=COUNTIFS(Feedback!J:J,"low",Feedback!X:X,"open")', '', '', ''],
    [''],
    ['📁 POR CATEGORÍA', 'Cantidad', 'Abiertos', '', '', ''],
    ['🐛 Bugs', '=COUNTIF(Feedback!I:I,"bug")', '=COUNTIFS(Feedback!I:I,"bug",Feedback!X:X,"open")', '', '', ''],
    ['✨ Features', '=COUNTIF(Feedback!I:I,"feature")', '=COUNTIFS(Feedback!I:I,"feature",Feedback!X:X,"open")', '', '', ''],
    ['🎨 UX/UI', '=COUNTIF(Feedback!I:I,"ux")', '=COUNTIFS(Feedback!I:I,"ux",Feedback!X:X,"open")', '', '', ''],
    ['⚡ Performance', '=COUNTIF(Feedback!I:I,"performance")', '=COUNTIFS(Feedback!I:I,"performance",Feedback!X:X,"open")', '', '', ''],
    ['📝 Contenido', '=COUNTIF(Feedback!I:I,"content")', '=COUNTIFS(Feedback!I:I,"content",Feedback!X:X,"open")', '', '', ''],
    [''],
    ['📱 POR DISPOSITIVO', 'Cantidad', '%', '', '', ''],
    ['📱 Mobile', '=COUNTIF(Feedback!S:S,"mobile")', '=IF(B4>0,B27/B4*100,0)&"%"', '', '', ''],
    ['📲 Tablet', '=COUNTIF(Feedback!S:S,"tablet")', '=IF(B4>0,B28/B4*100,0)&"%"', '', '', ''],
    ['💻 Desktop', '=COUNTIF(Feedback!S:S,"desktop")', '=IF(B4>0,B29/B4*100,0)&"%"', '', '', ''],
    [''],
    ['⏱️ MÉTRICAS DE TIEMPO', '', '', '', '', ''],
    ['Tiempo promedio resolución (hrs)', '=IFERROR(AVERAGE(Feedback!AA:AA),"N/A")', '', '', '', ''],
    ['Tiempo promedio primera respuesta (hrs)', '=IFERROR(AVERAGE(Feedback!AI:AI),"N/A")', '', '', '', ''],
    ['Feedback más antiguo abierto', '=IFERROR(MIN(FILTER(Feedback!A:A,Feedback!X:X="open")),"Ninguno")', '', '', '', ''],
    [''],
    ['🎯 SLA TRACKING', 'Meta', 'Actual', 'Estado', '', ''],
    ['Primera respuesta (<4hrs)', '4', '=IFERROR(AVERAGE(Feedback!AI:AI),0)', '=IF(C38<=B38,"✅ OK","⚠️ LATE")', '', ''],
    ['Resolución críticos (<24hrs)', '24', '=IFERROR(AVERAGEIF(Feedback!J:J,"critical",Feedback!AA:AA),0)', '=IF(C39<=B39,"✅ OK","⚠️ LATE")', '', ''],
    ['Resolución alta (<48hrs)', '48', '=IFERROR(AVERAGEIF(Feedback!J:J,"high",Feedback!AA:AA),0)', '=IF(C40<=B40,"✅ OK","⚠️ LATE")', '', ''],
    [''],
    ['📈 TENDENCIAS SEMANALES', 'Esta semana', 'Semana pasada', 'Cambio', '', ''],
    ['Nuevos reportes', '=COUNTIFS(Feedback!A:A,">="&(TODAY()-7),Feedback!A:A,"<="&TODAY())', '=COUNTIFS(Feedback!A:A,">="&(TODAY()-14),Feedback!A:A,"<"&(TODAY()-7))', '=IF(C43>0,(B43-C43)/C43*100,0)&"%"', '', ''],
    ['Resueltos', '=COUNTIFS(Feedback!Z:Z,">="&(TODAY()-7),Feedback!Z:Z,"<="&TODAY())', '=COUNTIFS(Feedback!Z:Z,">="&(TODAY()-14),Feedback!Z:Z,"<"&(TODAY()-7))', '=IF(C44>0,(B44-C44)/C44*100,0)&"%"', '', ''],
    [''],
    ['🎯 POR FEATURE', 'Cantidad', 'Abiertos', '', '', ''],
    ['Inventario', '=COUNTIF(Feedback!G:G,"inventory")', '=COUNTIFS(Feedback!G:G,"inventory",Feedback!X:X,"open")', '', '', ''],
    ['Cotizaciones', '=COUNTIF(Feedback!G:G,"cotizacion")', '=COUNTIFS(Feedback!G:G,"cotizacion",Feedback!X:X,"open")', '', '', ''],
    ['Home', '=COUNTIF(Feedback!G:G,"home")', '=COUNTIFS(Feedback!G:G,"home",Feedback!X:X,"open")', '', '', ''],
    ['Embajadores', '=COUNTIF(Feedback!G:G,"ambassadors")', '=COUNTIFS(Feedback!G:G,"ambassadors",Feedback!X:X,"open")', '', '', ''],
    ['Cuentas', '=COUNTIF(Feedback!G:G,"accounts")', '=COUNTIFS(Feedback!G:G,"accounts",Feedback!X:X,"open")', '', '', ''],
    ['Otro', '=B4-B47-B48-B49-B50-B51', '', '', '', ''],
    [''],
    ['📊 MÉTRICAS DE CALIDAD', '', '', '', '', ''],
    ['Tasa de reapertura', '=IFERROR(COUNTIF(Feedback!AJ:AJ,">0")/B9*100,0)&"%"', '', 'Total reabiertos', '=SUMIF(Feedback!AJ:AJ,">0",Feedback!AJ:AJ)', ''],
    ['Satisfacción promedio', '=IFERROR(AVERAGE(Feedback!AK:AK),"N/A")', '', 'Respuestas', '=COUNTA(Feedback!AK:AK)-1', ''],
    [''],
    ['👥 USUARIOS AFECTADOS', 'Cantidad', '', '', '', ''],
    ['Usuario único', '=COUNTIF(Feedback!AE:AE,"single")', '', '', '', ''],
    ['Múltiples usuarios', '=COUNTIF(Feedback!AE:AE,"multiple")', '', '', '', ''],
    ['Todos los usuarios', '=COUNTIF(Feedback!AE:AE,"all")', '', '', '', ''],
    [''],
    ['👥 TOP REPORTADORES', 'Cantidad', '', '', '', ''],
    ['(Ver columna W de Feedback)', '', '', '', '', ''],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: FEEDBACK_SPREADSHEET_ID,
    range: `${DASHBOARD_SHEET_NAME}!A1:F65`,
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: dashboardContent,
    },
  });

  console.log('Dashboard updated!');
  console.log(`✅ Setup complete: ${currentCount} → ${FEEDBACK_HEADERS.length} columns`);
}

run().catch(console.error);
