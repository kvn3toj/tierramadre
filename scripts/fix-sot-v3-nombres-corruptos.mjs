/**
 * Repara los nombres corruptos del Inventario de SOT v3.
 *
 * Contexto (2026-07-22): al migrar a SOT v3, los ítems del grupo "LOTE X CT"
 * — cuyo nombre en el legacy es un código numérico de posición en el lote
 * (1.6, 2.3, 3.9, 4.4 …) — se corrompieron de dos formas:
 *
 *   a) el número se coercionó a fecha y quedó como TEXTO
 *      "1.6" → "1900-01-01 14:24:00"   (0.6 de día = 14:24)
 *   b) se reemplazó por un placeholder con código EQUIVOCADO
 *      "2.3" → "Gema 1.1"
 *
 * Además esas filas perdieron el ESTADO (legacy: "LOTE X CT").
 *
 * Fuente de verdad para restaurar: SOT v2 · 'Sintesis_Inventario' col B
 * (conserva los códigos limpios como texto), con Inventario #3 ·
 * 'INVENTARIO Tierra.Madre' col C como verificación cruzada.
 *
 * Uso:
 *   node scripts/fix-sot-v3-nombres-corruptos.mjs           # dry-run
 *   node scripts/fix-sot-v3-nombres-corruptos.mjs --apply   # escribe
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';
import { writeFileSync } from 'node:fs';

config({ path: '.env.local' });
config({ path: '.env' });

const APPLY = process.argv.includes('--apply');

const SOT3 = '1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U';
const SOT2 = '18w0DcP_4CO-le9_vt_UPGCHXAVXkQ5sugLF4r_o2bVM';
const INV3 = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

const COL_ITEM = 0; // A
const COL_NOMBRE = 2; // C
const COL_ESTADO = 16; // Q
const ESTADO_LEGACY = 'LOTE X CT';

// Un nombre está corrupto si es una fecha serial de 1900 o un placeholder "Gema N.N"
const isCorrupt = (name) =>
  /^1900-01-\d{2}[ T]/.test(name) || /^Gema\s+\d+(\.\d+)?$/i.test(name);

// El nombre legacy sólo se acepta como restaurable si es un código numérico
const isCode = (name) => /^\d+(\.\d+)?$/.test(name);

const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
if (!key) {
  console.error('Falta GOOGLE_SERVICE_ACCOUNT_KEY');
  process.exit(1);
}
const rawKey = key.trim().startsWith('{')
  ? key
  : Buffer.from(key, 'base64').toString();
const auth = new GoogleAuth({
  credentials: JSON.parse(rawKey),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = new sheets_v4.Sheets({ auth });

const clean = (v) =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim();

async function read(id, range) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range,
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  return res.data.values || [];
}

// --- Fuentes legacy -------------------------------------------------------
const v2 = await read(SOT2, `'Sintesis_Inventario'!A:B`);
const legacyV2 = new Map(v2.slice(1).map((r) => [clean(r[0]), clean(r[1])]));

const i3 = await read(INV3, `'INVENTARIO Tierra.Madre'!A:O`);
const legacyI3 = new Map(i3.slice(1).map((r) => [clean(r[0]), clean(r[2])]));
const estadoI3 = new Map(i3.slice(1).map((r) => [clean(r[0]), clean(r[14])]));

// --- SOT v3 ---------------------------------------------------------------
const v3 = await read(SOT3, `'Inventario'!A:AP`);

const fixes = [];
const skipped = [];

for (let i = 1; i < v3.length; i++) {
  const row = v3[i];
  const item = clean(row[COL_ITEM]);
  if (!item) continue;
  const nombre = clean(row[COL_NOMBRE]);
  if (!isCorrupt(nombre)) continue;

  const fila = i + 1;
  const fromV2 = legacyV2.get(item) || '';
  const fromI3 = legacyI3.get(item) || '';
  const candidato = isCode(fromV2) ? fromV2 : isCode(fromI3) ? fromI3 : '';

  if (!candidato) {
    skipped.push({
      fila,
      item,
      nombre,
      fromV2,
      fromI3,
      motivo: 'sin código legacy válido',
    });
    continue;
  }
  if (fromV2 && fromI3 && fromV2 !== fromI3) {
    skipped.push({
      fila,
      item,
      nombre,
      fromV2,
      fromI3,
      motivo: 'SOT v2 y #3 no coinciden',
    });
    continue;
  }

  const estadoActual = clean(row[COL_ESTADO]);
  const estadoLegacy = estadoI3.get(item) || '';
  const fixEstado =
    !estadoActual && estadoLegacy.replace(/\s+/g, ' ') === ESTADO_LEGACY;

  fixes.push({
    fila,
    item,
    antes: nombre,
    despues: candidato,
    fixEstado,
    estadoLegacy,
  });
}

// --- Reporte --------------------------------------------------------------
console.log(`\n=== Nombres corruptos en SOT v3 · Inventario ===`);
console.log(`Modo: ${APPLY ? 'APLICAR ✍️' : 'DRY-RUN (sin escribir)'}\n`);
console.log(
  `${'fila'.padEnd(6)}${'item'.padEnd(7)}${'nombre actual'.padEnd(26)}→  ${'nombre real'.padEnd(12)} estado`,
);
for (const f of fixes) {
  console.log(
    `${String(f.fila).padEnd(6)}${f.item.padEnd(7)}${f.antes.padEnd(26)}→  ${f.despues.padEnd(12)} ${f.fixEstado ? `+ "${ESTADO_LEGACY}"` : '(sin cambio)'}`,
  );
}
console.log(`\nTotal a corregir: ${fixes.length}`);

if (skipped.length) {
  console.log(`\n--- NO tocados (${skipped.length}) ---`);
  skipped.forEach((s) =>
    console.log(
      `  fila ${s.fila} · item ${s.item} · "${s.nombre}" · ${s.motivo} (v2="${s.fromV2}" #3="${s.fromI3}")`,
    ),
  );
}

if (!fixes.length) {
  console.log('\nNada que hacer.');
  process.exit(0);
}

// --- Backup ---------------------------------------------------------------
const backup = fixes.map((f) => ({
  fila: f.fila,
  item: f.item,
  nombreAntes: f.antes,
  estadoAntes: clean(v3[f.fila - 1]?.[COL_ESTADO]),
}));
const backupPath = `scripts/.backup-sot-v3-nombres.json`;
writeFileSync(backupPath, JSON.stringify(backup, null, 2));
console.log(`\nBackup de los valores previos → ${backupPath}`);

if (!APPLY) {
  console.log('\nDry-run. Re-ejecuta con --apply para escribir.');
  process.exit(0);
}

// --- Escritura ------------------------------------------------------------
// USER_ENTERED + apóstrofo inicial fuerza celda de TEXTO, de modo que Sheets
// no vuelva a interpretar "1.6" como número/fecha.
const data = [];
for (const f of fixes) {
  data.push({ range: `'Inventario'!C${f.fila}`, values: [[`'${f.despues}`]] });
  if (f.fixEstado) {
    data.push({ range: `'Inventario'!Q${f.fila}`, values: [[ESTADO_LEGACY]] });
  }
}

const res = await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SOT3,
  requestBody: { valueInputOption: 'USER_ENTERED', data },
});
console.log(`\n✅ Celdas actualizadas: ${res.data.totalUpdatedCells}`);

// --- Verificación ---------------------------------------------------------
const after = await read(SOT3, `'Inventario'!A:Q`);
const byItem = new Map(after.slice(1).map((r) => [clean(r[COL_ITEM]), r]));
let ok = 0;
for (const f of fixes) {
  const r = byItem.get(f.item) || [];
  const nombre = clean(r[COL_NOMBRE]);
  const tipo = typeof (r[COL_NOMBRE] ?? '');
  const bien = nombre === f.despues && tipo === 'string';
  if (bien) ok++;
  else
    console.log(
      `  ⚠️ item ${f.item}: quedó "${nombre}" (${tipo}), esperado "${f.despues}" (string)`,
    );
}
console.log(`Verificados OK: ${ok}/${fixes.length}`);
