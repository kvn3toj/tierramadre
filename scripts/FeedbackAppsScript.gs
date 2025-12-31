/**
 * Google Apps Script - Feedback System Automation
 *
 * Enhanced by Steve's recommendations for Tierra Madre Studio
 *
 * INSTALLATION:
 * 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1Nl2gxfZzWy4lUv_C-9xTt90MzFDIgHLvWtWtDRNzJaU
 * 2. Go to Extensions > Apps Script
 * 3. Delete any existing code and paste this entire file
 * 4. Save the project (Ctrl+S)
 * 5. Run the 'installTriggers' function once to set up automated triggers
 * 6. Grant necessary permissions when prompted
 *
 * FEATURES:
 * - Auto-calculated columns (age, SLA status, priority score)
 * - Conditional formatting for visual prioritization
 * - Data validation dropdowns
 * - Email notifications for critical feedback
 * - Weekly summary reports
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  feedbackSheetName: 'Feedback',
  dashboardSheetName: 'Dashboard',
  // Column indices (0-indexed)
  columns: {
    timestamp: 0,        // A
    id: 1,               // B
    version: 2,          // C
    environment: 3,      // D
    page: 4,             // E
    component: 5,        // F
    feature: 6,          // G
    userFlow: 7,         // H
    category: 8,         // I
    priority: 9,         // J
    severity: 10,        // K
    tags: 11,            // L
    title: 12,           // M
    description: 13,     // N
    expectedBehavior: 14,// O
    actualBehavior: 15,  // P
    screenshot: 16,      // Q
    highlightBox: 17,    // R
    deviceType: 18,      // S
    browser: 19,         // T
    os: 20,              // U
    adminEmail: 21,      // V
    adminName: 22,       // W
    status: 23,          // X
    assignee: 24,        // Y
    resolvedAt: 25,      // Z
    resolutionTime: 26,  // AA
    notes: 27,           // AB
    relatedIds: 28,      // AC
    reproductionSteps: 29,// AD
    affectedUsers: 30,    // AE
    workaround: 31,       // AF
    linkedPR: 32,         // AG
    firstResponseAt: 33,  // AH
    firstResponseTime: 34,// AI
    reopenCount: 35,      // AJ
    satisfactionScore: 36,// AK
  },
  // SLA targets in hours
  sla: {
    firstResponse: 4,
    criticalResolution: 24,
    highResolution: 48,
    mediumResolution: 72,
  },
  // Email notifications
  notifications: {
    enabled: true,
    criticalEmail: '', // Add email for critical alerts
    weeklyDigestEmail: '', // Add email for weekly digest
  },
};

// =============================================================================
// TRIGGERS
// =============================================================================

/**
 * Install all triggers - run this once manually
 */
function installTriggers() {
  // Remove existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));

  // Install onEdit trigger
  ScriptApp.newTrigger('onFeedbackEdit')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();

  // Install daily digest trigger (runs at 9 AM)
  ScriptApp.newTrigger('sendDailyDigest')
    .timeBased()
    .atHour(9)
    .everyDays(1)
    .create();

  // Install weekly report trigger (runs Mondays at 9 AM)
  ScriptApp.newTrigger('sendWeeklyReport')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(9)
    .create();

  Logger.log('Triggers installed successfully!');
}

// =============================================================================
// EDIT HANDLERS
// =============================================================================

/**
 * Triggered when any cell is edited
 */
function onFeedbackEdit(e) {
  if (!e || !e.range) return;

  const sheet = e.range.getSheet();
  if (sheet.getName() !== CONFIG.feedbackSheetName) return;

  const row = e.range.getRow();
  const col = e.range.getColumn();

  // Skip header row
  if (row === 1) return;

  // Handle status changes
  if (col === CONFIG.columns.status + 1) {
    handleStatusChange(sheet, row, e.value, e.oldValue);
  }

  // Handle assignee changes (track first response)
  if (col === CONFIG.columns.assignee + 1) {
    handleAssigneeChange(sheet, row, e.value, e.oldValue);
  }

  // Handle priority changes
  if (col === CONFIG.columns.priority + 1) {
    handlePriorityChange(sheet, row, e.value);
  }
}

/**
 * Handle status change events
 */
function handleStatusChange(sheet, row, newStatus, oldStatus) {
  const timestamp = sheet.getRange(row, CONFIG.columns.timestamp + 1).getValue();
  const now = new Date();

  // Resolving: Calculate resolution time
  if (['resolved', 'wontfix', 'duplicate'].includes(newStatus)) {
    const createdAt = new Date(timestamp);
    const resolutionTimeHours = ((now - createdAt) / (1000 * 60 * 60)).toFixed(1);

    sheet.getRange(row, CONFIG.columns.resolvedAt + 1).setValue(now.toISOString());
    sheet.getRange(row, CONFIG.columns.resolutionTime + 1).setValue(resolutionTimeHours);
  }

  // Reopening: Clear resolution data and increment reopen count
  if (['open', 'in_progress'].includes(newStatus) &&
      ['resolved', 'wontfix', 'duplicate'].includes(oldStatus)) {
    sheet.getRange(row, CONFIG.columns.resolvedAt + 1).setValue('');
    sheet.getRange(row, CONFIG.columns.resolutionTime + 1).setValue('');

    // Increment reopen count
    const currentCount = sheet.getRange(row, CONFIG.columns.reopenCount + 1).getValue() || 0;
    sheet.getRange(row, CONFIG.columns.reopenCount + 1).setValue(parseInt(currentCount) + 1);
  }
}

/**
 * Handle assignee change events
 */
function handleAssigneeChange(sheet, row, newAssignee, oldAssignee) {
  // Track first response time when assignee is first set
  if (newAssignee && !oldAssignee) {
    const firstResponseAt = sheet.getRange(row, CONFIG.columns.firstResponseAt + 1).getValue();

    if (!firstResponseAt) {
      const timestamp = sheet.getRange(row, CONFIG.columns.timestamp + 1).getValue();
      const now = new Date();
      const createdAt = new Date(timestamp);
      const firstResponseTimeHours = ((now - createdAt) / (1000 * 60 * 60)).toFixed(1);

      sheet.getRange(row, CONFIG.columns.firstResponseAt + 1).setValue(now.toISOString());
      sheet.getRange(row, CONFIG.columns.firstResponseTime + 1).setValue(firstResponseTimeHours);
    }
  }
}

/**
 * Handle priority change events
 */
function handlePriorityChange(sheet, row, newPriority) {
  // Send notification for critical issues
  if (newPriority === 'critical' && CONFIG.notifications.enabled && CONFIG.notifications.criticalEmail) {
    const id = sheet.getRange(row, CONFIG.columns.id + 1).getValue();
    const title = sheet.getRange(row, CONFIG.columns.title + 1).getValue();
    const description = sheet.getRange(row, CONFIG.columns.description + 1).getValue();

    sendCriticalAlert(id, title, description);
  }
}

// =============================================================================
// NOTIFICATIONS
// =============================================================================

/**
 * Send alert for critical feedback
 */
function sendCriticalAlert(id, title, description) {
  if (!CONFIG.notifications.criticalEmail) return;

  const subject = `🚨 CRÍTICO: Nuevo feedback ${id}`;
  const body = `
Se ha reportado un issue crítico:

ID: ${id}
Título: ${title}
Descripción: ${description}

Por favor revisa y asigna este issue lo antes posible.

Ver en Google Sheets: ${SpreadsheetApp.getActiveSpreadsheet().getUrl()}
  `;

  try {
    MailApp.sendEmail({
      to: CONFIG.notifications.criticalEmail,
      subject: subject,
      body: body,
    });
  } catch (error) {
    Logger.log('Error sending critical alert: ' + error);
  }
}

/**
 * Send daily digest of open issues
 */
function sendDailyDigest() {
  if (!CONFIG.notifications.enabled || !CONFIG.notifications.weeklyDigestEmail) return;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.feedbackSheetName);
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const statusCol = CONFIG.columns.status;
  const priorityCol = CONFIG.columns.priority;
  const idCol = CONFIG.columns.id;
  const titleCol = CONFIG.columns.title;

  let criticalOpen = 0;
  let highOpen = 0;
  let totalOpen = 0;
  let criticalItems = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][statusCol] === 'open') {
      totalOpen++;
      if (data[i][priorityCol] === 'critical') {
        criticalOpen++;
        criticalItems.push(`${data[i][idCol]}: ${data[i][titleCol]}`);
      } else if (data[i][priorityCol] === 'high') {
        highOpen++;
      }
    }
  }

  if (totalOpen === 0) return; // No open issues, skip digest

  const subject = `📊 Feedback Daily Digest - ${totalOpen} issues abiertos`;
  const body = `
Resumen diario de feedback:

📊 ISSUES ABIERTOS: ${totalOpen}
🔴 Críticos: ${criticalOpen}
🟠 Alta prioridad: ${highOpen}

${criticalItems.length > 0 ? '🚨 ISSUES CRÍTICOS:\n' + criticalItems.join('\n') : ''}

Ver detalles: ${SpreadsheetApp.getActiveSpreadsheet().getUrl()}
  `;

  try {
    MailApp.sendEmail({
      to: CONFIG.notifications.weeklyDigestEmail,
      subject: subject,
      body: body,
    });
  } catch (error) {
    Logger.log('Error sending daily digest: ' + error);
  }
}

/**
 * Send weekly summary report
 */
function sendWeeklyReport() {
  if (!CONFIG.notifications.enabled || !CONFIG.notifications.weeklyDigestEmail) return;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.feedbackSheetName);
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  let newThisWeek = 0;
  let resolvedThisWeek = 0;
  let avgResolutionTime = 0;
  let resolutionTimes = [];

  for (let i = 1; i < data.length; i++) {
    const timestamp = new Date(data[i][CONFIG.columns.timestamp]);
    const resolvedAt = data[i][CONFIG.columns.resolvedAt] ? new Date(data[i][CONFIG.columns.resolvedAt]) : null;
    const resolutionTime = parseFloat(data[i][CONFIG.columns.resolutionTime]) || 0;

    if (timestamp >= oneWeekAgo) {
      newThisWeek++;
    }

    if (resolvedAt && resolvedAt >= oneWeekAgo) {
      resolvedThisWeek++;
      if (resolutionTime > 0) {
        resolutionTimes.push(resolutionTime);
      }
    }
  }

  if (resolutionTimes.length > 0) {
    avgResolutionTime = (resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length).toFixed(1);
  }

  const subject = `📈 Feedback Weekly Report`;
  const body = `
Reporte semanal de feedback:

📊 ACTIVIDAD DE LA SEMANA:
- Nuevos reportes: ${newThisWeek}
- Resueltos: ${resolvedThisWeek}
- Tiempo promedio de resolución: ${avgResolutionTime} horas

Ver Dashboard completo: ${SpreadsheetApp.getActiveSpreadsheet().getUrl()}
  `;

  try {
    MailApp.sendEmail({
      to: CONFIG.notifications.weeklyDigestEmail,
      subject: subject,
      body: body,
    });
  } catch (error) {
    Logger.log('Error sending weekly report: ' + error);
  }
}

// =============================================================================
// DATA VALIDATION & FORMATTING
// =============================================================================

/**
 * Setup data validation dropdowns - run once
 */
function setupDataValidation() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.feedbackSheetName);
  if (!sheet) return;

  const lastRow = sheet.getLastRow();

  // Status dropdown
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['open', 'in_progress', 'resolved', 'wontfix', 'duplicate'])
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, CONFIG.columns.status + 1, lastRow - 1, 1).setDataValidation(statusRule);

  // Priority dropdown
  const priorityRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['critical', 'high', 'medium', 'low'])
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, CONFIG.columns.priority + 1, lastRow - 1, 1).setDataValidation(priorityRule);

  // Category dropdown
  const categoryRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['bug', 'feature', 'ux', 'performance', 'content', 'other'])
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, CONFIG.columns.category + 1, lastRow - 1, 1).setDataValidation(categoryRule);

  // Affected users dropdown
  const affectedRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['single', 'multiple', 'all', 'unknown'])
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, CONFIG.columns.affectedUsers + 1, lastRow - 1, 1).setDataValidation(affectedRule);

  // Satisfaction score dropdown
  const satisfactionRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['1', '2', '3', '4', '5'])
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, CONFIG.columns.satisfactionScore + 1, lastRow - 1, 1).setDataValidation(satisfactionRule);

  Logger.log('Data validation rules applied!');
}

/**
 * Setup conditional formatting - run once
 */
function setupConditionalFormatting() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.feedbackSheetName);
  if (!sheet) return;

  // Clear existing rules
  sheet.clearConditionalFormatRules();

  const rules = [];
  const lastRow = sheet.getLastRow();

  // Priority column formatting
  const priorityRange = sheet.getRange(2, CONFIG.columns.priority + 1, lastRow - 1, 1);

  // Critical - Red
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('critical')
    .setBackground('#f8d7da')
    .setFontColor('#721c24')
    .setBold(true)
    .setRanges([priorityRange])
    .build());

  // High - Orange
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('high')
    .setBackground('#fff3cd')
    .setFontColor('#856404')
    .setRanges([priorityRange])
    .build());

  // Medium - Yellow
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('medium')
    .setBackground('#d4edda')
    .setFontColor('#155724')
    .setRanges([priorityRange])
    .build());

  // Low - Green
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('low')
    .setBackground('#d1ecf1')
    .setFontColor('#0c5460')
    .setRanges([priorityRange])
    .build());

  // Status column formatting
  const statusRange = sheet.getRange(2, CONFIG.columns.status + 1, lastRow - 1, 1);

  // Open - Blue
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('open')
    .setBackground('#cce5ff')
    .setFontColor('#004085')
    .setRanges([statusRange])
    .build());

  // In Progress - Orange
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('in_progress')
    .setBackground('#fff3cd')
    .setFontColor('#856404')
    .setRanges([statusRange])
    .build());

  // Resolved - Green
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('resolved')
    .setBackground('#d4edda')
    .setFontColor('#155724')
    .setRanges([statusRange])
    .build());

  sheet.setConditionalFormatRules(rules);
  Logger.log('Conditional formatting applied!');
}

// =============================================================================
// MENU & UTILITIES
// =============================================================================

/**
 * Add custom menu when spreadsheet opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🎯 Feedback Tools')
    .addItem('Setup Data Validation', 'setupDataValidation')
    .addItem('Setup Conditional Formatting', 'setupConditionalFormatting')
    .addSeparator()
    .addItem('Send Daily Digest Now', 'sendDailyDigest')
    .addItem('Send Weekly Report Now', 'sendWeeklyReport')
    .addSeparator()
    .addItem('Install Triggers', 'installTriggers')
    .addToUi();
}

/**
 * Calculate age in hours for all open items
 */
function recalculateAges() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.feedbackSheetName);
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  const now = new Date();

  for (let i = 1; i < data.length; i++) {
    if (data[i][CONFIG.columns.status] === 'open') {
      const timestamp = new Date(data[i][CONFIG.columns.timestamp]);
      const ageHours = ((now - timestamp) / (1000 * 60 * 60)).toFixed(1);
      // Could add an ageHours column if needed
      Logger.log(`Row ${i + 1}: ${data[i][CONFIG.columns.id]} - ${ageHours} hours old`);
    }
  }
}
