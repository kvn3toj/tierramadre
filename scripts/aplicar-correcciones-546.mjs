/**
 * #546 Planeta Verde — correcciones desde el certificado 025893.
 *
 * Payload: scripts/.data/correcciones-546.json
 * Hoja:    FOTOSINTESIS_SPREADSHEET_ID, pestaña "Inventario"
 *
 * Reglas que este script hace cumplir por código, no por disciplina:
 *
 *  - **Dry-run por defecto.** Sin `--apply` no escribe nada.
 *  - **Localiza por cabecera nombrada y por itemId**, nunca por posición. La
 *    hoja tiene 58 columnas y el bloque AQ–BE se movió antes; confiar en un
 *    índice fijo es cómo se escribe en la celda equivocada.
 *  - **Escribe con `values.update` sobre un rango CERRADO de una sola celda.**
 *    Nunca `values.append` con rango abierto: el 2026-08-03 Sheets detectó la
 *    "tabla" a la derecha y ancló 57 columnas desde AT en vez de A, y cada push
 *    siguiente volvía a appendear. Ver CLAUDE.md.
 *  - **Verifica `valorActual` contra la celda viva antes de tocarla.** Si el
 *    payload quedó viejo, aborta en vez de pisar un dato más nuevo.
 *  - **`certificadoUrl` con placeholder se rechaza siempre**, aunque lo pidan.
 *  - **`observacion` (modo append) queda fuera del set por defecto**: su texto
 *    arrastra el piso de negociación, que hoy es legible sin autenticación por
 *    `products:getPublicByItem`. Escribirla ahora cristaliza la fuga en el
 *    texto nuevo. Requiere `--con-observacion` explícito.
 *  - **Respaldo de la fila entera** a scripts/.backups/ antes de escribir.
 *
 * Uso:
 *   node scripts/aplicar-correcciones-546.mjs                  # dry-run, 4 celdas
 *   node scripts/aplicar-correcciones-546.mjs --apply          # escribe las 4
 *   node scripts/aplicar-correcciones-546.mjs --con-observacion --apply
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { google } from 'googleapis';
import { config } from 'dotenv';

// .env.local primero: .env.production trae FOTOSINTESIS_SPREADSHEET_ID vacío
// y dotenv no sobreescribe lo ya cargado — el primero que gana, gana.
config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const CON_OBSERVACION = argv.includes('--con-observacion');

const TAB = 'Inventario';
const PAYLOAD_PATH = 'scripts/.data/correcciones-546.json';

/** Campos que se aplican por defecto. `observacion` y `certificadoUrl` no. */
const CAMPOS_POR_DEFECTO = ['Calidad', 'Color', 'Medidas', 'Corte'];

const payload = JSON.parse(readFileSync(PAYLOAD_PATH, 'utf8'));

// ── Guarda 1: la hoja del payload tiene que ser la hoja configurada ──────────
const SHEET_ID = process.env.FOTOSINTESIS_SPREADSHEET_ID;
if (!SHEET_ID) throw new Error('Falta FOTOSINTESIS_SPREADSHEET_ID');
if (payload.meta.sot !== SHEET_ID) {
  throw new Error(
    `La hoja del payload (${payload.meta.sot}) no es FOTOSINTESIS_SPREADSHEET_ID (${SHEET_ID}). Abortado.`,
  );
}

// La credencial viaja en base64 en este repo. Nunca imprimirla.
const raw = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '').trim();
if (!raw) throw new Error('Falta GOOGLE_SERVICE_ACCOUNT_KEY');
const creds = JSON.parse(
  raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'),
);
const auth = new google.auth.JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: [
    APPLY
      ? 'https://www.googleapis.com/auth/spreadsheets'
      : 'https://www.googleapis.com/auth/spreadsheets.readonly',
  ],
});
const sheets = google.sheets({ version: 'v4', auth });

const colLetter = (i) => {
  let s = '';
  let n = i + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = (n - 1 - m) / 26;
  }
  return s;
};
const norm = (v) =>
  v === undefined || v === null ? '' : String(v).replace(/\s+/g, ' ').trim();

// ── Leer la pestaña ─────────────────────────────────────────────────────────
const { data } = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: TAB,
  valueRenderOption: 'UNFORMATTED_VALUE',
});
const rows = data.values ?? [];
const headers = (rows[0] ?? []).map((h) => String(h).trim());

const colItem = headers.indexOf('Item');
if (colItem < 0) throw new Error('No hay cabecera "Item" en la pestaña');

const ITEM_ID = payload.updates[0].itemId;
const rowIdx = rows.findIndex(
  (r, i) => i > 0 && norm(r[colItem]) === String(ITEM_ID),
);
if (rowIdx < 0) throw new Error(`Ítem ${ITEM_ID} no encontrado en ${TAB}`);
const sheetRow = rowIdx + 1; // 1-based, como lo ve Sheets
const row = rows[rowIdx];

console.log(`\n#${ITEM_ID} · ${payload.meta.titulo}`);
console.log(
  `hoja ${TAB} · fila ${sheetRow} · ${rows.length - 1} filas · ${headers.length} columnas`,
);
console.log(
  `modo: ${APPLY ? '⚠️  APPLY (escribe)' : 'dry-run (no escribe)'}\n`,
);

// ── Clasificar cada update ──────────────────────────────────────────────────
const plan = [];
for (const u of payload.updates) {
  const ci = headers.indexOf(u.campo);
  const actual = ci >= 0 ? norm(row[ci]) : null;
  const esperado = norm(u.valorActual);
  const letra = ci >= 0 ? colLetter(ci) : '??';

  let estado;
  let motivo = '';

  if (ci < 0) {
    estado = 'ERROR';
    motivo = `no existe la cabecera "${u.campo}"`;
  } else if (letra !== u.col) {
    // La columna declarada en el payload no es donde vive la cabecera.
    estado = 'ERROR';
    motivo = `el payload dice col ${u.col} pero "${u.campo}" está en ${letra}`;
  } else if (
    String(u.valorNuevo).includes('<') &&
    String(u.valorNuevo).includes('>')
  ) {
    estado = 'BLOQUEADO';
    motivo = `placeholder sin resolver: ${u.valorNuevo}`;
  } else if (u.modo === 'append' && !CON_OBSERVACION) {
    estado = 'DIFERIDO';
    motivo = 'arrastra el piso de negociación — limpiar la fuga primero';
  } else if (!CAMPOS_POR_DEFECTO.includes(u.campo) && u.modo !== 'append') {
    estado = 'DIFERIDO';
    motivo = 'fuera del set por defecto';
  } else if (actual !== esperado) {
    estado = 'DESFASE';
    motivo = `la hoja dice "${actual}", el payload esperaba "${esperado}"`;
  } else {
    estado = 'LISTO';
  }

  plan.push({ ...u, ci, letra, actual, estado, motivo });
}

// ── Reporte ─────────────────────────────────────────────────────────────────
const icon = {
  LISTO: '✅',
  DESFASE: '⚠️ ',
  BLOQUEADO: '🔒',
  DIFERIDO: '⏸️ ',
  ERROR: '❌',
};
for (const p of plan) {
  console.log(`${icon[p.estado]} ${p.letra.padEnd(3)} ${p.campo}`);
  if (p.estado === 'LISTO') {
    console.log(`      "${p.actual}"  →  "${p.valorNuevo}"`);
  } else if (p.estado === 'DIFERIDO' || p.estado === 'BLOQUEADO') {
    console.log(`      ${p.motivo}`);
  } else {
    console.log(`      ${p.motivo}`);
  }
}

const errores = plan.filter(
  (p) => p.estado === 'ERROR' || p.estado === 'DESFASE',
);
const listos = plan.filter((p) => p.estado === 'LISTO');

console.log(
  `\n${listos.length} para escribir · ${plan.filter((p) => p.estado === 'DIFERIDO').length} diferidas · ` +
    `${plan.filter((p) => p.estado === 'BLOQUEADO').length} bloqueadas · ${errores.length} con problema`,
);

// No se toca
console.log('\nNo se toca:');
for (const n of payload.noSeToca) {
  const ci = headers.indexOf(n.campo);
  const viva = ci >= 0 ? norm(row[ci]) : '(no es columna de esta pestaña)';
  console.log(`  ${n.campo}: hoja="${viva}" payload="${n.valor}"`);
}

if (errores.length) {
  console.error(
    '\n❌ Hay desfases o errores. No se escribe nada. Revisá el payload.',
  );
  process.exit(1);
}

if (!APPLY) {
  console.log('\nDry-run. Nada escrito. Para aplicar: --apply');
  process.exit(0);
}

if (!listos.length) {
  console.log('\nNada que escribir.');
  process.exit(0);
}

// ── Respaldo de la fila entera ──────────────────────────────────────────────
mkdirSync('scripts/.backups', { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = `scripts/.backups/correcciones-546-ANTES-${ts}.json`;
writeFileSync(
  backupPath,
  JSON.stringify(
    {
      spreadsheetId: SHEET_ID,
      tab: TAB,
      sheetRow,
      itemId: ITEM_ID,
      celdas: Object.fromEntries(
        headers.map((h, i) => [`${colLetter(i)} ${h}`, row[i] ?? '']),
      ),
    },
    null,
    2,
  ),
);
console.log(`\nRespaldo: ${backupPath}`);

// ── Escribir celda por celda, rango CERRADO ─────────────────────────────────
const dataUpdates = listos.map((p) => ({
  range: `${TAB}!${p.letra}${sheetRow}`,
  values: [[p.valorNuevo]],
}));
await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SHEET_ID,
  requestBody: { valueInputOption: 'RAW', data: dataUpdates },
});
console.log(`Escritas ${dataUpdates.length} celdas.`);

// ── Verificar releyendo, por cabecera nombrada ──────────────────────────────
const { data: after } = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: TAB,
  valueRenderOption: 'UNFORMATTED_VALUE',
});
const afterRows = after.values ?? [];
const afterHeaders = (afterRows[0] ?? []).map((h) => String(h).trim());
const afterIdx = afterRows.findIndex(
  (r, i) => i > 0 && norm(r[afterHeaders.indexOf('Item')]) === String(ITEM_ID),
);
const afterRow = afterRows[afterIdx];

console.log('\nVerificación (relectura por cabecera nombrada):');
let ok = true;
for (const p of listos) {
  const ci = afterHeaders.indexOf(p.campo);
  const v = norm(afterRow[ci]);
  const bien = v === norm(p.valorNuevo);
  if (!bien) ok = false;
  console.log(`  ${bien ? '✅' : '❌'} ${p.campo}: "${v}"`);
}
for (const n of payload.noSeToca) {
  const ci = afterHeaders.indexOf(n.campo);
  if (ci < 0) continue;
  const v = norm(afterRow[ci]);
  const bien = String(v) === String(n.valor);
  if (!bien) ok = false;
  console.log(`  ${bien ? '✅' : '❌'} ${n.campo} intacto: "${v}"`);
}

console.log(
  ok
    ? '\n✅ Todo aterrizó. Falta el sync a Convex: «🔄 Convex Sync → Sincronizar todo (completo)» (el onEdit no dispara por API).'
    : '\n❌ La relectura no coincide. Revisar la hoja a mano.',
);
process.exit(ok ? 0 : 1);
