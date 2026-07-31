/**
 * Completa en el SOT v3 los dos pares de gemas para topitos del lote "Baúl
 * Comercial" — #439 «Destellos Gemelos» y #440 «Reflejos del Sol» — que quedaron
 * con el pendiente "Cargar a Fotosíntesis" desde la nota de voz del 2026-07-10.
 *
 * Escribe SOLO lo que tiene respaldo documental. Deliberadamente NO toca
 * costoBaseCOP, precioFinalCOP ni mostrarEnCatalogo: no existe factura del Baúl
 * Comercial, y los comparables del catálogo van de $155.676/ct a $1.236.685/ct —
 * inventar un costo contaminaría el activo igual que pasó con C-070/MED. Mientras
 * no haya precio, mostrarEnCatalogo se queda en FALSE (publicar un ítem en $0 es
 * peor que no publicarlo).
 *
 * LO QUE SÍ CORRIGE:
 *
 *   1. MEDIDAS — el pull a v3 dañó las dos filas. La hoja legacy (fuente,
 *      'INVENTARIO Tierra.Madre' col 8) y la nota de voz coinciden:
 *        #439  legacy "4.8 x 3 mm · 4.9 x 3 mm"   → v3 tenía "4.8 × 3 mm"
 *              (perdió la 2ª gema)
 *        #440  legacy "5.3 x 2.2 mm · 4.7 x 3.2 mm" → v3 tenía "5.3 × 3.2 mm"
 *              (CORRUPTO: mezcla el largo de la gema 1 con el ancho de la gema 2 —
 *               una medida que no corresponde a ninguna piedra real)
 *      Se restaura el formato de la fuente, con "·" separando cada gema.
 *
 *   2. FECHA INGRESO — 10-jul-2026, la fecha de la nota de voz que las dicta.
 *      Ambas filas la tenían vacía.
 *
 *   3. OBSERVACIÓN — trazabilidad completa: desglose gema por gema, procedencia,
 *      insumo consumido (con ítem y lote) y por qué C-077 no es su lote real.
 *
 *   4. NOTAS / CONFLICTOS — bandera del costo pendiente, para que el hueco quede
 *      visible en la hoja y no sólo en la cabeza de quien lo revisó.
 *
 * `procedencia` se deja vacía a propósito: en esta hoja esa columna es la MINA
 * (Boyacá/Muzo/Chivor/Cali, 89 filas), no el lote de compra. "Baúl Comercial" va
 * en la observación.
 *
 * Uso:  node scripts/completar-topitos-baul-439-440.mjs           # dry-run
 *       node scripts/completar-topitos-baul-439-440.mjs --apply
 *
 * Tras --apply, para que llegue a Fotosíntesis:
 *       node scripts/sync-sot-convex.mjs --prod
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';
import { writeFileSync } from 'node:fs';

config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

const APPLY = process.argv.includes('--apply');
const SOT3 = '1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U';
const LEGACY = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';
const HOY = '2026-07-27';

const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
if (!key) throw new Error('Falta GOOGLE_SERVICE_ACCOUNT_KEY');
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
const read = async (id, r) =>
  (await sheets.spreadsheets.values.get({ spreadsheetId: id, range: r })).data
    .values || [];

// ── Columnas (índice 0) del Inventario v3 ─────────────────────────────────
const COL = {
  item: 0,
  fecha: 1, // B
  nombre: 2,
  peso: 3,
  cant: 6,
  medidasValores: 9, // J
  categoria: 10,
  costo: 11, // L  · NO se toca
  precio: 12, // M  · NO se toca
  lote: 23,
  mostrarEnCatalogo: 24, // Y · NO se toca
  observacion: 26, // AA
  notasConflictos: 56, // BE
};

// ── Lo que se va a escribir, con su respaldo ──────────────────────────────
const PIEZAS = [
  {
    item: '439',
    nombre: 'Destellos Gemelos',
    medidas: '4.8 × 3 mm · 4.9 × 3 mm',
    medidasLegacy: '4.8 x 3 mm · 4.9 x 3 mm',
    fecha: '10-jul-2026',
    observacion:
      'Par de gemas para topitos, corte rectangular. Gema 1: 0.30 ct (4.8 × 3 mm). ' +
      'Gema 2: 0.26 ct (4.9 × 3 mm). Total 0.56 ct. Procedencia: lote "Baúl Comercial" ' +
      '(nota de voz 2026-07-10), que no existe como lote en la hoja — sin factura cargada. ' +
      'Insumo consumido: 1 par de postes Topos #4 4.3 mm (ítem #451, lote C-041, Joyería Legado) ' +
      '— era el más cercano disponible a 4 mm, que estaba agotado. ' +
      `Medidas restauradas ${HOY} desde la hoja legacy: v3 tenía sólo "4.8 × 3 mm" y había perdido la 2ª gema. ` +
      'C-077 es un cubo de reconstrucción por categoría (2026-07-24), no el lote de compra real.',
    notasConflictos:
      `PENDIENTE ${HOY}: sin costoBaseCOP ni precioFinalCOP — requiere la factura del lote "Baúl Comercial". ` +
      'mostrarEnCatalogo se mantiene FALSE hasta que tenga precio. ' +
      'Confirmar además si los postes ya están engastados (sería Joya/Topitos, no Gema suelta).',
  },
  {
    item: '440',
    nombre: 'Reflejos del Sol',
    medidas: '5.3 × 2.2 mm · 4.7 × 3.2 mm',
    medidasLegacy: '5.3 x 2.2 mm · 4.7 x 3.2 mm',
    fecha: '10-jul-2026',
    observacion:
      'Par de gemas para topitos, corte rectangular. Gema 1: 0.26 ct (5.3 × 2.2 mm). ' +
      'Gema 2: 0.26 ct (4.7 × 3.2 mm). Total 0.52 ct (cuadra exacto). ' +
      'Segundo sub-lote de gemas del lote "Baúl Comercial" (nota de voz 2026-07-10), ' +
      'que no existe como lote en la hoja — sin factura cargada. ' +
      'Insumo consumido: 1 par de postes Topos #3 3.5 mm (ítem #450, lote C-040, Joyería Legado). ' +
      `Medidas corregidas ${HOY} desde la hoja legacy: v3 tenía "5.3 × 3.2 mm", que mezclaba el largo ` +
      'de la gema 1 con el ancho de la gema 2 y no correspondía a ninguna piedra real. ' +
      'C-077 es un cubo de reconstrucción por categoría (2026-07-24), no el lote de compra real.',
    notasConflictos:
      `PENDIENTE ${HOY}: sin costoBaseCOP ni precioFinalCOP — requiere la factura del lote "Baúl Comercial". ` +
      'mostrarEnCatalogo se mantiene FALSE hasta que tenga precio. ' +
      'Confirmar además si los postes ya están engastados (sería Joya/Topitos, no Gema suelta).',
  },
];

// ── Localizar filas por itemId (nunca por número fijo) ─────────────────────
const inv = await read(SOT3, `'Inventario'!A:BE`);
const objetivos = PIEZAS.map((p) => {
  const idx = inv.findIndex((r, i) => i > 0 && c(r[COL.item]) === p.item);
  if (idx < 0) {
    console.error(
      `⛔ No encontré el ítem #${p.item} en el Inventario. Abortado.`,
    );
    process.exit(1);
  }
  const fila = idx + 1; // 1-based
  const r = inv[idx];
  if (c(r[COL.nombre]) !== p.nombre) {
    console.error(
      `⛔ El ítem #${p.item} se llama "${c(r[COL.nombre])}", esperaba "${p.nombre}". Abortado.`,
    );
    process.exit(1);
  }
  return { ...p, fila, antes: r };
});

// ── Guardarraíl: verificar las medidas contra la hoja legacy, no contra memoria ──
const lg = await read(LEGACY, `'INVENTARIO Tierra.Madre'!A:P`);
for (const o of objetivos) {
  const lr = lg.find((r) => c(r[0]) === o.item);
  if (!lr) {
    console.error(`⛔ #${o.item} no está en la hoja legacy. Abortado.`);
    process.exit(1);
  }
  if (c(lr[8]) !== o.medidasLegacy) {
    console.error(
      `⛔ Legacy #${o.item} dice "${c(lr[8])}" pero el script asume "${o.medidasLegacy}". Abortado.`,
    );
    process.exit(1);
  }
}
console.log('✔ Medidas verificadas contra la hoja legacy (fuente).\n');

// ── Guardarraíl: no pisar costo/precio si alguien ya los cargó ─────────────
for (const o of objetivos) {
  const costo = c(o.antes[COL.costo]);
  const precio = c(o.antes[COL.precio]);
  if (costo || precio) {
    console.log(
      `ℹ #${o.item} ya tiene costo="${costo}" precio="${precio}" — el script no los toca (nunca los escribe).`,
    );
  }
}

console.log(
  `=== Completar topitos Baúl Comercial · modo ${APPLY ? 'APLICAR ✍️' : 'DRY-RUN'} ===\n`,
);

const cambios = [];
for (const o of objetivos) {
  const plan = [
    { col: 'B', idx: COL.fecha, campo: 'FECHA INGRESO', nuevo: o.fecha },
    {
      col: 'J',
      idx: COL.medidasValores,
      campo: 'Medidas (valores)',
      nuevo: o.medidas,
    },
    {
      col: 'AA',
      idx: COL.observacion,
      campo: 'observacion',
      nuevo: o.observacion,
    },
    {
      col: 'BE',
      idx: COL.notasConflictos,
      campo: 'Notas / conflictos',
      nuevo: o.notasConflictos,
    },
  ];
  console.log(`▸ #${o.item} «${o.nombre}» · fila ${o.fila}`);
  for (const p of plan) {
    const antes = c(o.antes[p.idx]);
    const igual = antes === p.nuevo;
    console.log(
      `   ${p.col.padEnd(3)} ${p.campo.padEnd(19)} ${igual ? '= (sin cambio)' : `\n        antes: ${antes || '(vacío)'}\n        ahora: ${p.nuevo}`}`,
    );
    if (!igual) cambios.push({ item: o.item, fila: o.fila, ...p, antes });
  }
  console.log(
    `   —  NO se tocan: L costoBaseCOP (${c(o.antes[COL.costo]) || 'vacío'}) · ` +
      `M precioFinalCOP (${c(o.antes[COL.precio]) || 'vacío'}) · ` +
      `Y mostrarEnCatalogo (${c(o.antes[COL.mostrarEnCatalogo]) || 'vacío'}) · ` +
      `K Categoría (${c(o.antes[COL.categoria])}) · X loteId (${c(o.antes[COL.lote])})\n`,
  );
}

console.log(`Total de celdas a escribir: ${cambios.length}\n`);

// ── Backup ────────────────────────────────────────────────────────────────
writeFileSync(
  'scripts/.backup-topitos-baul-439-440.json',
  JSON.stringify(
    {
      fecha: HOY,
      spreadsheetId: SOT3,
      filasAntes: objetivos.map((o) => ({
        item: o.item,
        fila: o.fila,
        valores: o.antes,
      })),
      cambios,
    },
    null,
    2,
  ),
);
console.log('Backup: scripts/.backup-topitos-baul-439-440.json');

if (!APPLY) {
  console.log('\nDry-run. Nada escrito. Re-ejecuta con --apply.');
  process.exit(0);
}

if (!cambios.length) {
  console.log('\nNada que escribir (ya estaba aplicado). Idempotente ✔');
  process.exit(0);
}

// ── Escritura ─────────────────────────────────────────────────────────────
await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SOT3,
  requestBody: {
    valueInputOption: 'RAW',
    data: cambios.map((ch) => ({
      range: `'Inventario'!${ch.col}${ch.fila}`,
      values: [[ch.nuevo]],
    })),
  },
});
console.log(`\n✍️  ${cambios.length} celdas escritas.`);

// ── Verificación: releer y comparar ───────────────────────────────────────
const inv2 = await read(SOT3, `'Inventario'!A:BE`);
let ok = 0;
let mal = 0;
for (const o of objetivos) {
  const r = inv2.find((x) => c(x[COL.item]) === o.item) || [];
  const checks = [
    ['B  FECHA INGRESO', COL.fecha, o.fecha],
    ['J  Medidas', COL.medidasValores, o.medidas],
    ['AA observacion', COL.observacion, o.observacion],
    ['BE Notas/conflictos', COL.notasConflictos, o.notasConflictos],
  ];
  console.log(`\n▸ Verificación #${o.item}:`);
  for (const [etiqueta, idx, esperado] of checks) {
    const real = c(r[idx]);
    const bien = real === esperado;
    bien ? ok++ : mal++;
    console.log(
      `   ${bien ? '✔' : '✘'} ${etiqueta}${bien ? '' : `\n        esperado: ${esperado}\n        real:     ${real}`}`,
    );
  }
  // y que lo intocable siga intocado
  const intactos = [
    ['L  costoBaseCOP', COL.costo],
    ['M  precioFinalCOP', COL.precio],
    ['Y  mostrarEnCatalogo', COL.mostrarEnCatalogo],
    ['K  Categoría', COL.categoria],
    ['X  loteId', COL.lote],
  ];
  for (const [etiqueta, idx] of intactos) {
    const antes = c(o.antes[idx]);
    const ahora = c(r[idx]);
    const bien = antes === ahora;
    bien ? ok++ : mal++;
    console.log(
      `   ${bien ? '✔' : '✘'} ${etiqueta} intacto (${ahora || 'vacío'})${bien ? '' : ` — ¡cambió! antes "${antes}"`}`,
    );
  }
}
console.log(`\n=== ${ok} verificaciones OK, ${mal} fallidas ===`);
process.exit(mal ? 1 : 0);
