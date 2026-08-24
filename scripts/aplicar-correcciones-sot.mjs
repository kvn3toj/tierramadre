/**
 * Aplicador genérico de correcciones puntuales al SOT v3, pestaña "Inventario".
 *
 * Generaliza `scripts/aplicar-correcciones-546.mjs`: la lógica era la misma para
 * cada corrida, sólo cambiaba el payload. Un script por ítem multiplica el lugar
 * donde puede colarse un error en una escritura a producción.
 *
 * Reglas que hace cumplir por código, no por disciplina:
 *
 *  - **Dry-run por defecto.** Sin `--apply` no escribe nada.
 *  - **La hoja del payload tiene que ser FOTOSINTESIS_SPREADSHEET_ID.** Aborta si no.
 *  - **Localiza por cabecera nombrada y por itemId**, nunca por posición, y además
 *    verifica que la cabecera viva en la columna que el payload declara.
 *  - **`values.update` sobre rango CERRADO de una celda.** Nunca `values.append`
 *    con rango abierto: el 2026-08-03 Sheets ancló 57 columnas desde AT en vez de
 *    A y cada push siguiente volvía a appendear. Ver CLAUDE.md.
 *  - **Compara `valorActual` contra la celda viva.** Si el payload quedó viejo,
 *    aborta en vez de pisar un dato más nuevo.
 *  - **Diferidas por defecto** las celdas en modo `append` (hoy: `observacion`,
 *    cuyo texto arrastra el piso de negociación, legible sin autenticación por
 *    `products:getPublicByItem`). Requieren `--con-observacion`.
 *  - **Bloqueadas siempre** las celdas cuyo valor nuevo trae un placeholder `<…>`.
 *  - **Respaldo de la fila entera** en scripts/.backups/ antes de escribir.
 *  - **Relee y verifica** después de escribir, por cabecera nombrada.
 *
 * Uso:
 *   node scripts/aplicar-correcciones-sot.mjs --payload scripts/.data/correcciones-544.json
 *   node scripts/aplicar-correcciones-sot.mjs --payload … --apply
 *   node scripts/aplicar-correcciones-sot.mjs --payload … --campos Medidas --apply
 *   node scripts/aplicar-correcciones-sot.mjs --payload … --con-observacion --apply
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { google } from 'googleapis';
import { config } from 'dotenv';

// .env.local primero: .env.production trae FOTOSINTESIS_SPREADSHEET_ID vacío y
// dotenv no sobreescribe lo ya cargado — el primero que gana, gana.
config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

const argv = process.argv.slice(2);
const flag = (f) => argv.includes(f);
const valOf = (f) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : undefined;
};

const APPLY = flag('--apply');
const CON_OBSERVACION = flag('--con-observacion');
const SOLO = valOf('--campos')
  ?.split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const PAYLOAD_PATH = valOf('--payload');
if (!PAYLOAD_PATH) throw new Error('Falta --payload <ruta al json>');

const TAB = 'Inventario';
const payload = JSON.parse(readFileSync(PAYLOAD_PATH, 'utf8'));

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
const hasPlaceholder = (v) => /<[^>]+>/.test(String(v));

const { data } = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: TAB,
  valueRenderOption: 'UNFORMATTED_VALUE',
});
const rows = data.values ?? [];
const headers = (rows[0] ?? []).map((h) => String(h).trim());
const colItem = headers.indexOf('Item');
if (colItem < 0) throw new Error('No hay cabecera "Item" en la pestaña');

const ITEM_ID = String(payload.updates[0].itemId);
// Todo el payload se aplica contra LA fila de este ítem. Un payload con ítems
// mezclados escribiría los updates de los demás en la fila del primero — por
// diseño esto es un aplicador de UN ítem por corrida.
const mezclados = [
  ...new Set(payload.updates.map((u) => String(u.itemId))),
].filter((id) => id !== ITEM_ID);
if (mezclados.length) {
  throw new Error(
    `El payload mezcla ítems (${ITEM_ID} y ${mezclados.join(', ')}): ` +
      'este script aplica un solo ítem por corrida. Partilo en un payload por ítem.',
  );
}
const rowIdx = rows.findIndex((r, i) => i > 0 && norm(r[colItem]) === ITEM_ID);
if (rowIdx < 0) throw new Error(`Ítem ${ITEM_ID} no encontrado en ${TAB}`);
const sheetRow = rowIdx + 1;
const row = rows[rowIdx];

console.log(`\n#${ITEM_ID} · ${payload.meta.titulo}`);
console.log(
  `hoja ${TAB} · fila ${sheetRow} · ${rows.length - 1} filas · ${headers.length} columnas`,
);
console.log(
  `modo: ${APPLY ? '⚠️  APPLY (escribe)' : 'dry-run (no escribe)'}\n`,
);

const plan = payload.updates.map((u) => {
  const ci = headers.indexOf(u.campo);
  const actual = ci >= 0 ? norm(row[ci]) : null;
  const letra = ci >= 0 ? colLetter(ci) : '??';
  let estado;
  let motivo = '';

  if (ci < 0) {
    estado = 'ERROR';
    motivo = `no existe la cabecera "${u.campo}"`;
  } else if (letra !== u.col) {
    estado = 'ERROR';
    motivo = `el payload dice col ${u.col} pero "${u.campo}" está en ${letra}`;
  } else if (hasPlaceholder(u.valorNuevo)) {
    estado = 'BLOQUEADO';
    motivo = `placeholder sin resolver: ${u.valorNuevo}`;
  } else if (u.modo === 'append' && !CON_OBSERVACION) {
    estado = 'DIFERIDO';
    motivo = 'arrastra el piso de negociación — limpiar la fuga primero';
  } else if (SOLO && !SOLO.includes(u.campo)) {
    estado = 'DIFERIDO';
    motivo = 'fuera de --campos';
  } else if (actual !== norm(u.valorActual)) {
    estado = 'DESFASE';
    motivo = `la hoja dice "${actual}", el payload esperaba "${norm(u.valorActual)}"`;
  } else {
    estado = 'LISTO';
  }
  return { ...u, ci, letra, actual, estado, motivo };
});

const icon = {
  LISTO: '✅',
  DESFASE: '⚠️ ',
  BLOQUEADO: '🔒',
  DIFERIDO: '⏸️ ',
  ERROR: '❌',
};
for (const p of plan) {
  console.log(`${icon[p.estado]} ${p.letra.padEnd(3)} ${p.campo}`);
  console.log(
    p.estado === 'LISTO'
      ? `      "${p.actual}"  →  "${p.valorNuevo}"`
      : `      ${p.motivo}`,
  );
}

const errores = plan.filter(
  (p) => p.estado === 'ERROR' || p.estado === 'DESFASE',
);
const listos = plan.filter((p) => p.estado === 'LISTO');
console.log(
  `\n${listos.length} para escribir · ${plan.filter((p) => p.estado === 'DIFERIDO').length} diferidas · ` +
    `${plan.filter((p) => p.estado === 'BLOQUEADO').length} bloqueadas · ${errores.length} con problema`,
);

if (payload.noSeToca?.length) {
  console.log('\nNo se toca:');
  for (const n of payload.noSeToca) {
    const ci = headers.indexOf(n.campo);
    const viva = ci >= 0 ? norm(row[ci]) : '(no es columna de esta pestaña)';
    const bien = ci < 0 || viva === norm(n.valor);
    console.log(
      `  ${bien ? '✅' : '❌'} ${n.campo}: hoja="${viva}" payload="${n.valor}"`,
    );
  }
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

mkdirSync('scripts/.backups', { recursive: true });
const base = PAYLOAD_PATH.split('/')
  .pop()
  .replace(/\.json$/, '');
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = `scripts/.backups/${base}-ANTES-${ts}.json`;
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

await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SHEET_ID,
  requestBody: {
    valueInputOption: 'RAW',
    data: listos.map((p) => ({
      range: `${TAB}!${p.letra}${sheetRow}`,
      values: [[p.valorNuevo]],
    })),
  },
});
console.log(`Escritas ${listos.length} celdas.`);

const { data: after } = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: TAB,
  valueRenderOption: 'UNFORMATTED_VALUE',
});
const aRows = after.values ?? [];
const aHead = (aRows[0] ?? []).map((h) => String(h).trim());
const aRow =
  aRows[
    aRows.findIndex(
      (r, i) => i > 0 && norm(r[aHead.indexOf('Item')]) === ITEM_ID,
    )
  ];

console.log('\nVerificación (relectura por cabecera nombrada):');
let ok = true;
for (const p of listos) {
  const v = norm(aRow[aHead.indexOf(p.campo)]);
  const bien = v === norm(p.valorNuevo);
  if (!bien) ok = false;
  console.log(`  ${bien ? '✅' : '❌'} ${p.campo}: "${v}"`);
}
for (const n of payload.noSeToca ?? []) {
  const ci = aHead.indexOf(n.campo);
  if (ci < 0) continue;
  const v = norm(aRow[ci]);
  const bien = v === norm(n.valor);
  if (!bien) ok = false;
  console.log(`  ${bien ? '✅' : '❌'} ${n.campo} intacto: "${v}"`);
}
console.log(
  ok
    ? '\n✅ Todo aterrizó. Falta el sync a Convex: «🔄 Convex Sync → Sincronizar todo (completo)» (el onEdit no dispara por API).'
    : '\n❌ La relectura no coincide. Revisar la hoja a mano.',
);
process.exit(ok ? 0 : 1);
