/**
 * Asigna lotes a los ítems del Inventario (SOT v3) que hoy están SIN loteId.
 *
 * Estrategia (decidida 2026-07-23, ver análisis en la conversación / nota de Anima):
 *   - SOLO se tocan los ítems ASIGNABLES: estado DISPONIBLE / CONSIGNACION / Retornado.
 *     Se dejan intactos los VENDIDA (histórico cerrado) y los "LOTE X CT" (pendiente físico).
 *   - Eje primario  → Colección  = lote de recepción reconstruido  → loteId `LC-NN`.
 *   - Sin colección → se agrupan por fecha de ingreso                → loteId `LR-AAAAMMDD`.
 *   - Sin colección NI fecha → quedan sin asignar y se reportan.
 *
 * Estos lotes son RECONSTRUIDOS (no facturas originales): no llevan proveedor ni
 * numeroFactura, su costoTotalCOP = Σ costoBaseCOP de sus ítems, y estado='reconstruido'.
 * El prefijo LC/LR los distingue a propósito de los lotes de compra reales (C-/MED-/S-/B-).
 *
 * Idempotente: solo escribe loteId en celdas vacías de ítems asignables, y solo
 * crea filas de lote que aún no existen. Re-ejecutable sin duplicar.
 *
 * Uso:
 *   node scripts/asignar-lotes-items-sin-lote.mjs           # dry-run + CSV
 *   node scripts/asignar-lotes-items-sin-lote.mjs --apply    # escribe en SOT v3
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';
import { writeFileSync } from 'node:fs';

config({ path: '.env.local' });
config({ path: '.env' });

const APPLY = process.argv.includes('--apply');
const SOT3 = '1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U';

const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
const rawKey = key.trim().startsWith('{')
  ? key
  : Buffer.from(key, 'base64').toString();
const sheets = new sheets_v4.Sheets({
  auth: new GoogleAuth({
    credentials: JSON.parse(rawKey),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  }),
});

const c = (v) =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim();
const money = (s) => Number(String(s ?? '').replace(/[^\d.-]/g, '')) || 0;
const fmt = (n) => '$' + Number(n || 0).toLocaleString('es-CO');
const read = async (r) =>
  (await sheets.spreadsheets.values.get({ spreadsheetId: SOT3, range: r })).data
    .values || [];

// --- Parseo de fecha en español → AAAAMMDD (para lotes de recepción) -------
const MES = {
  ene: '01',
  feb: '02',
  mar: '03',
  abr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  ago: '08',
  sep: '09',
  set: '09',
  oct: '10',
  nov: '11',
  dic: '12',
};
const fechaKey = (raw) => {
  const t = c(raw).toLowerCase();
  if (!t) return null;
  // 24-ene-2026 | 5-may-2026
  let m = t.match(/(\d{1,2})[-/ ]([a-z]{3})[a-z]*[-/ ](\d{4})/);
  if (m && MES[m[2]]) return `${m[3]}${MES[m[2]]}${m[1].padStart(2, '0')}`;
  // 2026-01-24 | 2026/1/24
  m = t.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}${m[2].padStart(2, '0')}${m[3].padStart(2, '0')}`;
  // 24/01/2026
  m = t.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return `${m[3]}${m[2].padStart(2, '0')}${m[1].padStart(2, '0')}`;
  return null;
};

// --- Lectura ---------------------------------------------------------------
const inv = await read(`'Inventario'!A:AZ`);
const lotes = await read(`'Lotes'!A:U`);
const H = inv[0].map(c);
const iLike = (n) =>
  H.findIndex((h) => h.toLowerCase().includes(n.toLowerCase()));
const COL = {
  item: 0,
  fecha: 1,
  nombre: 2,
  peso: 3,
  cat: iLike('categor'),
  costo: iLike('costobase') >= 0 ? iLike('costobase') : 11,
  estado: iLike('estado'),
  col: iLike('colecci'),
  lote: iLike('loteid'),
};
const LOTE_COL_LETTER = String.fromCharCode(65 + COL.lote); // X

const ASIGNABLE = /^(DISPONIBLE|CONSIGNAC|Retorn)/i;

// lotes existentes (para idempotencia)
const lotesExistentes = new Set(
  lotes
    .slice(1)
    .map((r) => c(r[0]))
    .filter(Boolean),
);
const primeraFilaLibre = lotes.length + 1; // append después de la última fila

// --- Selección de asignables sin lote --------------------------------------
const filas = [];
for (let i = 1; i < inv.length; i++) {
  const r = inv[i];
  if (!r || !r.some((x) => c(x) !== '')) continue;
  if (c(r[COL.lote]) !== '') continue; // ya tiene lote
  if (!ASIGNABLE.test(c(r[COL.estado]))) continue; // no asignable
  filas.push({
    fila: i + 1,
    item: c(r[COL.item]),
    nombre: c(r[COL.nombre]),
    cat: c(r[COL.cat]),
    calidad: '',
    estado: c(r[COL.estado]),
    coleccion: c(r[COL.col]),
    fechaRaw: c(r[COL.fecha]),
    fechaKey: fechaKey(r[COL.fecha]),
    peso: money(r[COL.peso]),
    costo: money(r[COL.costo]),
  });
}

// --- Agrupación → clave de lote --------------------------------------------
const sinAsignar = [];
for (const f of filas) {
  if (f.coleccion) {
    f.grupo = `COL::${f.coleccion}`;
  } else if (f.fechaKey) {
    f.grupo = `FECHA::${f.fechaKey}`;
  } else {
    f.grupo = null;
    sinAsignar.push(f);
  }
}
const asignables = filas.filter((f) => f.grupo);

// orden estable de grupos: colecciones primero (por # desc), luego fechas
const grupos = new Map();
for (const f of asignables) {
  if (!grupos.has(f.grupo)) grupos.set(f.grupo, []);
  grupos.get(f.grupo).push(f);
}
const ordenGrupos = [...grupos.entries()].sort((a, b) => {
  const ak = a[0].startsWith('COL::') ? 0 : 1;
  const bk = b[0].startsWith('COL::') ? 0 : 1;
  if (ak !== bk) return ak - bk;
  return b[1].length - a[1].length;
});

// --- Asignación de loteId (con búsqueda del siguiente correlativo libre) ----
let lcSeq = 0;
const nextLC = () => {
  let id;
  do {
    lcSeq++;
    id = `LC-${String(lcSeq).padStart(2, '0')}`;
  } while (lotesExistentes.has(id));
  lotesExistentes.add(id);
  return id;
};

const nuevosLotes = [];
for (const [clave, items] of ordenGrupos) {
  const esCol = clave.startsWith('COL::');
  const nombreGrupo = clave.split('::')[1];
  const loteId = esCol ? nextLC() : `LR-${nombreGrupo}`;
  if (lotesExistentes.has(loteId) && !esCol) {
    // LR ya existía (re-run): reutiliza, no recrea
  } else {
    lotesExistentes.add(loteId);
  }
  const costoTotal = items.reduce((a, f) => a + f.costo, 0);
  const pesoTotal = items.reduce((a, f) => a + f.peso, 0);
  const fechaRecepcion = esCol
    ? items
        .map((f) => f.fechaKey)
        .filter(Boolean)
        .sort()[0] || ''
    : nombreGrupo;
  const renombre = esCol
    ? nombreGrupo
    : `Recepción ${nombreGrupo.slice(0, 4)}-${nombreGrupo.slice(4, 6)}-${nombreGrupo.slice(6, 8)}`;
  items.forEach((f) => (f.loteId = loteId));
  nuevosLotes.push({
    loteId,
    renombre,
    costoTotal,
    pesoTotal,
    unidades: items.length,
    fechaRecepcion,
    yaExiste: !esCol && lotes.slice(1).some((r) => c(r[0]) === loteId),
    items,
  });
}

// --- Reporte ---------------------------------------------------------------
console.log(`\n=== Asignación de lotes a ítems sin lote — SOT v3 ===`);
console.log(`Modo: ${APPLY ? 'APLICAR ✍️' : 'DRY-RUN'}`);
console.log(
  `Asignables detectados: ${filas.length} · con lote propuesto: ${asignables.length} · sin poder asignar: ${sinAsignar.length}`,
);
console.log(
  `Lotes nuevos a crear: ${nuevosLotes.filter((l) => !l.yaExiste).length}\n`,
);

console.log(
  `${'loteId'.padEnd(14)}${'renombre'.padEnd(26)}${'uds'.padEnd(6)}${'costoTotal'.padEnd(16)}fechaRecep`,
);
for (const l of nuevosLotes) {
  console.log(
    `${l.loteId.padEnd(14)}${l.renombre.slice(0, 24).padEnd(26)}${String(l.unidades).padEnd(6)}${fmt(l.costoTotal).padEnd(16)}${l.fechaRecepcion}`,
  );
}
console.log(
  `\nΣ ítems asignados: ${asignables.length} · Σ costo reagrupado: ${fmt(nuevosLotes.reduce((a, l) => a + l.costoTotal, 0))}`,
);

if (sinAsignar.length) {
  console.log(`\n⚠️ Sin colección ni fecha (quedan sin lote):`);
  for (const f of sinAsignar)
    console.log(`   fila ${f.fila} · #${f.item} · ${f.nombre} · ${f.estado}`);
}

// --- CSV de auditoría ------------------------------------------------------
const csv = [
  'item,nombre,categoria,estado,coleccion,fechaIngreso,costoBaseCOP,loteIdAsignado',
  ...asignables.map((f) =>
    [
      f.item,
      `"${f.nombre.replace(/"/g, "'")}"`,
      `"${f.cat}"`,
      f.estado,
      `"${f.coleccion}"`,
      `"${f.fechaRaw}"`,
      f.costo,
      f.loteId,
    ].join(','),
  ),
].join('\n');
writeFileSync('scripts/.propuesta-lotes-sin-lote.csv', csv);
console.log(`\nCSV escrito: scripts/.propuesta-lotes-sin-lote.csv`);

// --- Backup ----------------------------------------------------------------
writeFileSync(
  'scripts/.backup-asignar-lotes.json',
  JSON.stringify(
    {
      fecha: '2026-07-23',
      loteColIndex: COL.lote,
      loteColLetter: LOTE_COL_LETTER,
      itemsAntes: asignables.map((f) => ({
        fila: f.fila,
        item: f.item,
        loteAntes: '',
      })),
      lotesTabAntes: lotes,
    },
    null,
    2,
  ),
);
console.log(`Backup escrito: scripts/.backup-asignar-lotes.json`);

if (!APPLY) {
  console.log(
    '\nDry-run. Revisa el CSV y re-ejecuta con --apply para escribir.',
  );
  process.exit(0);
}

// --- Escritura -------------------------------------------------------------
// 1) loteId en Inventario (solo celdas vacías de asignables)
const dataInv = asignables.map((f) => ({
  range: `'Inventario'!${LOTE_COL_LETTER}${f.fila}`,
  values: [[f.loteId]],
}));

// 2) filas nuevas en Lotes (solo las que no existen)
//    Lotes cols: 0 loteId · 2 fechaRecepcion · 3 pesoTotalQuilates · 4 costoTotalCOP
//    · 5 unidadesDeclaradas · 12 notas · 13 estado · 14 renombreLote · 20 mostrarComoLote
const filasLote = nuevosLotes.filter((l) => !l.yaExiste);
const N = 21; // A:U
let cursor = primeraFilaLibre;
const dataLotes = [];
for (const l of filasLote) {
  const row = new Array(N).fill('');
  row[0] = l.loteId;
  row[2] = l.fechaRecepcion;
  row[3] = l.pesoTotal || '';
  row[4] = l.costoTotal;
  row[5] = l.unidades;
  row[12] = `Lote RECONSTRUIDO 2026-07-23 desde ${l.loteId.startsWith('LC') ? 'colección' : 'fecha de ingreso'} "${l.renombre}". costoTotalCOP = Σ costoBaseCOP de sus ítems (no es factura original: sin proveedor ni número de factura).`;
  row[13] = 'reconstruido';
  row[14] = l.renombre;
  row[20] = 'FALSE';
  dataLotes.push({ range: `'Lotes'!A${cursor}:U${cursor}`, values: [row] });
  cursor++;
}

const res = await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SOT3,
  requestBody: {
    valueInputOption: 'USER_ENTERED',
    data: [...dataInv, ...dataLotes],
  },
});
console.log(`\n✅ Celdas actualizadas: ${res.data.totalUpdatedCells}`);
console.log(
  `   ítems con loteId: ${dataInv.length} · filas de lote creadas: ${dataLotes.length}`,
);

// --- Verificación ----------------------------------------------------------
const after = await read(`'Inventario'!A:AZ`);
const byFila = new Map(after.map((r, i) => [i + 1, r]));
let ok = 0;
for (const f of asignables) {
  if (c(byFila.get(f.fila)?.[COL.lote]) === f.loteId) ok++;
  else
    console.log(
      `  ⚠️ fila ${f.fila} (#${f.item}): quedó "${c(byFila.get(f.fila)?.[COL.lote])}", esperado ${f.loteId}`,
    );
}
const lotesAfter = await read(`'Lotes'!A:U`);
const nuevosOk = filasLote.filter((l) =>
  lotesAfter.slice(1).some((r) => c(r[0]) === l.loteId),
).length;
console.log(
  `Verificados: ítems ${ok}/${asignables.length} · lotes nuevos presentes ${nuevosOk}/${filasLote.length}`,
);
