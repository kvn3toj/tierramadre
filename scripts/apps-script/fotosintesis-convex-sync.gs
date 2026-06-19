/**
 * Google Apps Script — Sincronización Hoja → Convex (Fotosíntesis SOT)
 *
 * Doble vía: la app ya empuja Convex → Hoja. Este script cierra el otro sentido:
 * cuando editas la hoja, sincroniza ESOS cambios de vuelta a Convex.
 *
 * Cómo funciona (sólo celdas modificadas):
 *  - onEdit(e): trigger SIMPLE. NO llama a internet (no puede), sólo anota en la
 *    hoja oculta "_SyncQueue" qué filas/columnas cambiaste.
 *  - Menú "🔄 Convex Sync → Sincronizar (sólo cambios)": lee la cola y envía
 *    sólo esas celdas a Convex. El servidor lee únicamente esas filas (un
 *    batchGet por pestaña) y actualiza sólo los campos editados.
 *  - "Sincronizar todo (completo)": reconcilia pestañas enteras (respaldo por si
 *    el trigger se saltó algún evento).
 *
 * Política: las filas con una edición de admin en curso en Convex (syncStatus
 * "pending"/"error") NO se sobrescriben — se reportan como "protegidas".
 *
 * INSTALACIÓN (ver docs/runbooks/fotosintesis-convex-sync.md):
 *  1. Abre la SOT: https://docs.google.com/spreadsheets/d/18w0DcP_4CO-le9_vt_UPGCHXAVXkQ5sugLF4r_o2bVM
 *  2. Extensiones → Apps Script. Pega este archivo y el appsscript.json.
 *  3. Menú "🔄 Convex Sync → ⚙️ Configurar (una sola vez)" y pega URL + token.
 *  4. Autoriza los permisos cuando se soliciten.
 *
 * SEGURIDAD: el token vive en Script Properties, nunca en el código. Sólo
 * DISPARA una lectura del lado de Convex; no puede escribir en la hoja, así que
 * una fuga es de bajo riesgo y se rota en segundos con `npx convex env set`.
 */

// =============================================================================
// CONFIGURACIÓN
// =============================================================================

const CONFIG = {
  queueSheetName: '_SyncQueue',
  statusSheetName: '_Sync',
  timezone: 'America/Bogota',
  lockWaitMs: 10000,
  maxRowsPerFlush: 1000,
  props: { url: 'CONVEX_SYNC_URL', token: 'SHEET_SYNC_TOKEN' },
  // Etiqueta de pestaña (es) → clave de tabla del servidor. El orden = orden del menú.
  tables: {
    Inventario: 'inventory',
    Proveedores: 'providers',
    Lotes: 'lots',
    Clientes: 'clients',
    Ventas: 'sales',
    Sublotes: 'subLotes',
  },
};

const ALL_TABLE_KEYS = Object.values(CONFIG.tables);

// =============================================================================
// MENÚ
// =============================================================================

function onOpen() {
  const ui = SpreadsheetApp.getUi();

  const soloMenu = ui.createMenu('Sincronizar sólo…');
  Object.keys(CONFIG.tables).forEach(function (label) {
    soloMenu.addItem(label, 'syncOnly_' + CONFIG.tables[label]);
  });

  ui.createMenu('🔄 Convex Sync')
    .addItem('Sincronizar (sólo cambios)', 'flushDeltas')
    .addItem('Sincronizar todo (completo)', 'fullReconcile')
    .addSubMenu(soloMenu)
    .addSeparator()
    .addItem('Ver última sincronización', 'showLastSyncStatus')
    .addItem('⚙️ Configurar (una sola vez)', 'setup')
    .addToUi();
}

// Envoltorios con nombre (los ítems de menú exigen un NOMBRE de función, no un closure).
function syncOnly_inventory() { fullReconcileTable('inventory'); }
function syncOnly_providers() { fullReconcileTable('providers'); }
function syncOnly_lots() { fullReconcileTable('lots'); }
function syncOnly_clients() { fullReconcileTable('clients'); }
function syncOnly_sales() { fullReconcileTable('sales'); }
function syncOnly_subLotes() { fullReconcileTable('subLotes'); }

// =============================================================================
// CAPTURA DE CAMBIOS (trigger simple onEdit — sin red)
// =============================================================================

function onEdit(e) {
  if (!e || !e.range) return;
  try {
    var sheet = e.range.getSheet();
    var tab = sheet.getName();
    if (!CONFIG.tables[tab]) return; // sólo las 6 pestañas SOT
    if (tab === CONFIG.queueSheetName || tab === CONFIG.statusSheetName) return;

    var startRow = e.range.getRow();
    var startCol = e.range.getColumn(); // 1-based
    var nRows = e.range.getNumRows();
    var nCols = e.range.getNumColumns();

    var lock = LockService.getDocumentLock();
    if (!lock.tryLock(5000)) return; // la edición ya quedó en la hoja; se recupera con "completo"
    try {
      for (var r = startRow; r < startRow + nRows; r++) {
        if (r === 1) continue; // fila de encabezados
        var naturalKey = String(sheet.getRange(r, 1).getValue()).trim();
        if (!naturalKey) continue; // columna A vacía → fila aún no real
        var changedCols = [];
        for (var c = startCol; c < startCol + nCols; c++) {
          if (c === 1) continue; // columna A = clave natural, nunca se sincroniza
          changedCols.push(c - 1); // 0-based para casar con los mapas de columnas del servidor
        }
        if (changedCols.length === 0) continue;
        queueDirty(tab, naturalKey, changedCols, r);
      }
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    // Nunca lanzar desde onEdit: rompería la edición del usuario.
    Logger.log('onEdit error: ' + err);
  }
}

/** Inserta/une una entrada de cambio en la hoja oculta _SyncQueue (dedup por tab+clave). */
function queueDirty(tab, naturalKey, colIdxs, rowIndex) {
  var qs = ensureQueueSheet();
  var data = qs.getDataRange().getValues(); // [header, ...rows]
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === tab && String(data[i][1]) === naturalKey) {
      var union = unionCsv(String(data[i][2]), colIdxs);
      qs.getRange(i + 1, 3).setValue(union);
      qs.getRange(i + 1, 4).setValue(rowIndex);
      return;
    }
  }
  qs.appendRow([
    tab,
    naturalKey,
    colIdxs.slice().sort(numAsc).join(','),
    rowIndex,
    nowStamp(),
    '', // flushToken
  ]);
}

function unionCsv(existingCsv, newIdxs) {
  var set = {};
  String(existingCsv || '')
    .split(',')
    .forEach(function (s) { if (s !== '') set[Number(s)] = true; });
  newIdxs.forEach(function (n) { set[Number(n)] = true; });
  return Object.keys(set).map(Number).sort(numAsc).join(',');
}

function numAsc(a, b) { return a - b; }

// =============================================================================
// FLUSH DE DELTAS (menú — autorización completa → UrlFetchApp permitido)
// =============================================================================

function flushDeltas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lock = LockService.getDocumentLock();
  lock.waitLock(CONFIG.lockWaitMs);

  var flushToken;
  var entries;
  try {
    flushToken = Utilities.getUuid();
    entries = readQueueRows();
    if (entries.length === 0) {
      ss.toast('No hay cambios pendientes.', '🔄 Convex Sync', 5);
      return;
    }
    if (entries.length > CONFIG.maxRowsPerFlush) {
      ss.toast(
        'Demasiados cambios (' + entries.length + '). Usa "Sincronizar todo (completo)".',
        '🔄 Convex Sync',
        8
      );
      return;
    }
    stampFlushToken(flushToken); // marca col F en las filas actuales
  } finally {
    lock.releaseLock(); // suelta el lock: las ediciones durante el fetch se siguen encolando
  }

  ss.toast('Sincronizando ' + entries.length + ' fila(s)…', '🔄 Convex Sync', -1);

  var deltas = {};
  entries.forEach(function (en) {
    var table = CONFIG.tables[en.tab];
    if (!table) return;
    if (!deltas[table]) deltas[table] = [];
    deltas[table].push({
      key: en.naturalKey,
      rowIndex: en.rowIndex,
      colIdxs: en.colIdxs,
    });
  });

  try {
    var result = callConvex({ mode: 'delta', deltas: deltas });
    var lock2 = LockService.getDocumentLock();
    lock2.waitLock(CONFIG.lockWaitMs);
    try {
      deleteQueueRowsByFlushToken(flushToken); // sólo las filas que enviamos
    } finally {
      lock2.releaseLock();
    }
    finishSync('cambios', result);
  } catch (err) {
    clearFlushToken(flushToken); // des-marca para reintentar en el próximo flush
    handleSyncError('cambios', err);
  }
}

// =============================================================================
// RECONCILIACIÓN COMPLETA (respaldo)
// =============================================================================

function fullReconcile() {
  runFull('todas las tablas', undefined);
}

function fullReconcileTable(tableKey) {
  var label = tableLabel(tableKey);
  runFull(label, [tableKey]);
}

function runFull(etiqueta, tables) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(CONFIG.lockWaitMs)) {
    ss.toast('Ya hay una sincronización en curso.', '🔄 Convex Sync', 5);
    return;
  }
  try {
    ss.toast('Reconciliando ' + etiqueta + '…', '🔄 Convex Sync', -1);
    var payload = { mode: 'full' };
    if (tables) payload.tables = tables;
    var result = callConvex(payload);
    finishSync(etiqueta, result);
  } catch (err) {
    handleSyncError(etiqueta, err);
  } finally {
    lock.releaseLock();
  }
}

// =============================================================================
// TRANSPORTE
// =============================================================================

function callConvex(payload) {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty(CONFIG.props.url);
  var token = props.getProperty(CONFIG.props.token);
  if (!url || !token) {
    throw new Error('Falta configuración. Abre el menú → ⚙️ Configurar (una sola vez).');
  }
  var resp = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-sheet-sync-token': token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    followRedirects: true,
  });
  var code = resp.getResponseCode();
  var body = resp.getContentText();
  Logger.log('Convex sync HTTP ' + code + ': ' + body);
  if (code < 200 || code >= 300) {
    throw new Error('Convex respondió HTTP ' + code + ': ' + body.slice(0, 300));
  }
  return JSON.parse(body); // { ok, mode, perTable, reviewFlags }
}

// =============================================================================
// RESULTADO / ESTADO
// =============================================================================

function finishSync(etiqueta, result) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var summary = summarize(result);
  ss.toast('✅ ' + etiqueta + ' · ' + summary.short, '🔄 Convex Sync', 8);
  writeStatus(etiqueta, summary, '');
  if (summary.flags.length > 0) {
    SpreadsheetApp.getUi().alert(
      'Sincronización con observaciones',
      summary.long + '\n\nRequieren revisión en la app:\n• ' + summary.flags.join('\n• '),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

function handleSyncError(etiqueta, err) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var msg = err && err.message ? err.message : String(err);
  Logger.log('Sync error (' + etiqueta + '): ' + msg);
  writeStatus(etiqueta, { short: 'ERROR', long: msg, flags: [] }, msg);
  ss.toast('❌ Falló: ' + msg.slice(0, 120), '🔄 Convex Sync', 10);
  SpreadsheetApp.getUi().alert('Error de sincronización', msg, SpreadsheetApp.getUi().ButtonSet.OK);
}

function summarize(result) {
  var perTable = (result && result.perTable) || {};
  var flags = ((result && result.reviewFlags) || []).map(function (f) {
    return (f.table || '?') + ' [' + (f.key || '?') + ']: ' + (f.reason || '');
  });
  var parts = [];
  var tP = 0, tU = 0, tProt = 0, tSkip = 0;
  Object.keys(perTable).forEach(function (t) {
    var r = perTable[t];
    if (r.error) {
      parts.push(t + ': error ' + r.error);
      return;
    }
    var ins = r.inserted ? '+' + r.inserted : '';
    parts.push(
      t + ': ' + r.patched + '✏' + ins +
      (r.protected ? ' ' + r.protected + '🔒' : '') +
      (r.flagged ? ' ' + r.flagged + '⚑' : '')
    );
    tP += r.patched || 0;
    tU += r.inserted || 0;
    tProt += r.protected || 0;
    tSkip += r.skipped || 0;
  });
  return {
    short:
      tP + ' actualizadas' +
      (tU ? ', ' + tU + ' nuevas' : '') +
      (tProt ? ', ' + tProt + ' protegidas' : ''),
    long: parts.join('\n'),
    flags: flags,
  };
}

function writeStatus(etiqueta, summary, errorText) {
  var st = ensureStatusSheet();
  st.appendRow([nowStamp(), etiqueta, summary.long || summary.short, errorText || '']);
  st.getRange('F1').setValue(
    nowStamp() + ' · ' + etiqueta + ' · ' + summary.short + (errorText ? ' · ERROR' : '')
  );
}

function showLastSyncStatus() {
  var st = ensureStatusSheet();
  var last = String(st.getRange('F1').getValue() || '(aún no se ha sincronizado)');
  SpreadsheetApp.getUi().alert('Última sincronización', last, SpreadsheetApp.getUi().ButtonSet.OK);
}

// =============================================================================
// COLA (_SyncQueue) — helpers
// =============================================================================

function ensureQueueSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var qs = ss.getSheetByName(CONFIG.queueSheetName);
  if (!qs) {
    qs = ss.insertSheet(CONFIG.queueSheetName);
    qs.appendRow(['tab', 'naturalKey', 'colIdxs', 'rowIndex', 'firstSeenAt', 'flushToken']);
    qs.hideSheet();
  }
  return qs;
}

function readQueueRows() {
  var qs = ensureQueueSheet();
  var data = qs.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < data.length; i++) {
    var tab = String(data[i][0]);
    var key = String(data[i][1]);
    if (!tab || !key) continue;
    var cols = String(data[i][2])
      .split(',')
      .map(Number)
      .filter(function (n) { return !isNaN(n); });
    out.push({ row: i + 1, tab: tab, naturalKey: key, colIdxs: cols, rowIndex: Number(data[i][3]) });
  }
  return out;
}

function stampFlushToken(flushToken) {
  var qs = ensureQueueSheet();
  var data = qs.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][1] && !data[i][5]) {
      qs.getRange(i + 1, 6).setValue(flushToken);
    }
  }
}

function clearFlushToken(flushToken) {
  var qs = ensureQueueSheet();
  var data = qs.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][5]) === flushToken) qs.getRange(i + 1, 6).setValue('');
  }
}

function deleteQueueRowsByFlushToken(flushToken) {
  var qs = ensureQueueSheet();
  var data = qs.getDataRange().getValues();
  // Borra de abajo hacia arriba para no desplazar índices.
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][5]) === flushToken) qs.deleteRow(i + 1);
  }
}

// =============================================================================
// ESTADO (_Sync) — helpers
// =============================================================================

function ensureStatusSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var st = ss.getSheetByName(CONFIG.statusSheetName);
  if (!st) {
    st = ss.insertSheet(CONFIG.statusSheetName);
    st.appendRow(['Fecha', 'Tablas', 'Resultado', 'Errores']);
    st.hideSheet();
  }
  return st;
}

// =============================================================================
// CONFIGURACIÓN (una sola vez)
// =============================================================================

function setup() {
  var ui = SpreadsheetApp.getUi();
  var props = PropertiesService.getScriptProperties();

  var u = ui.prompt(
    'Configurar Convex Sync (1/2)',
    'Pega la URL del endpoint Convex (termina en /sync/foto):',
    ui.ButtonSet.OK_CANCEL
  );
  if (u.getSelectedButton() !== ui.Button.OK) return;

  var t = ui.prompt(
    'Configurar Convex Sync (2/2)',
    'Pega el token de sincronización (SHEET_SYNC_TOKEN):',
    ui.ButtonSet.OK_CANCEL
  );
  if (t.getSelectedButton() !== ui.Button.OK) return;

  props.setProperty(CONFIG.props.url, u.getResponseText().trim());
  props.setProperty(CONFIG.props.token, t.getResponseText().trim());
  ensureQueueSheet();
  ensureStatusSheet();
  ui.alert('Listo', 'Configuración guardada. Ya puedes usar "Sincronizar (sólo cambios)".', ui.ButtonSet.OK);
}

// =============================================================================
// UTILIDADES
// =============================================================================

function nowStamp() {
  return Utilities.formatDate(new Date(), CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss');
}

function tableLabel(tableKey) {
  var labels = Object.keys(CONFIG.tables);
  for (var i = 0; i < labels.length; i++) {
    if (CONFIG.tables[labels[i]] === tableKey) return labels[i];
  }
  return tableKey;
}
