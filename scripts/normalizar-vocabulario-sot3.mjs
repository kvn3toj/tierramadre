/**
 * Normaliza ortografía y vocabulario del SOT v3 (hoja `Inventario` + `Listas`).
 *
 * QUÉ HACE: corrige tildes, casing, espacios sobrantes, abreviaturas fuera de
 * vocabulario y dos entradas mal escritas de las listas canónicas. Cada celda
 * declara el valor que espera encontrar; si no coincide, el script aborta sin
 * escribir nada. Eso es a propósito: la hoja se mueve, y un fix de ortografía
 * escrito sobre una fila que cambió de significado es peor que la errata.
 *
 * QUÉ NO TOCA:
 *   - #294 "Sagitarius" y #283 "Aquarium" — decisión de marca, se dejan.
 *   - Nombres genéricos repetidos ("Baguette" ×9, "Anillo" ×3) — son insumos
 *     y topitos descritos por su forma, no erratas.
 *   - Los rangos de medida con guion (#89, #347, #348, #349) y los `±`
 *     (#371-#374) — son notación real de piezas pareadas, no typos.
 *
 * CASO APARTE — filas 419 y 420: no es ortografía sino un corrimiento de
 * columnas. El asesor quedó en N, el estado en O y el QR en P, cada uno dos
 * columnas a la izquierda de su lugar. Se reubican a P/Q/R y se vacía N.
 *
 * DESPUÉS DE APLICAR: correr en la hoja el menú «🔄 Convex Sync → Sincronizar
 * todo (completo)». El trigger onEdit es SIMPLE y no dispara con escrituras
 * por API, así que Convex no se entera solo.
 *
 * Uso:  node scripts/normalizar-vocabulario-sot3.mjs           # dry-run
 *       node scripts/normalizar-vocabulario-sot3.mjs --apply
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';
import { writeFileSync, mkdirSync } from 'node:fs';

config({ path: '.env.local' });
config({ path: '.env' });

const APPLY = process.argv.includes('--apply');
const SOT3 = '1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U';

const colName = (i) => {
  let s = '';
  i++;
  while (i > 0) {
    const m = (i - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
};

// ── El plan: [pestaña, fila, colIndex, esperado, nuevo, motivo] ────────────
// `esperado` es el valor exacto que hoy vive en la celda. Es la red de
// seguridad: si la hoja cambió, el script para antes de escribir.

const INV = 'Inventario';
const LIS = 'Listas';

/** Nombres de producto: tildes, casing inicial y erratas. */
const NOMBRES = [
  [65, 'L:II-JA Gota del Pacifico', 'L:II-JA Gota del Pacífico'],
  [86, 'Viento del Pacifico', 'Viento del Pacífico'],
  [131, 'Via lactea', 'Vía Láctea'],
  [161, 'Fuerza del Condor', 'Fuerza del Cóndor'],
  [165, 'Geminis', 'Géminis'],
  [202, 'Misterio del Rio (3-C)', 'Misterio del Río (3-C)'],
  [204, 'Boyaca (8-C)', 'Boyacá (8-C)'],
  [212, 'corazón de Fuego', 'Corazón de Fuego'],
  [223, 'lluvia Infinita', 'Lluvia Infinita'],
  [228, 'Principe de Cristal', 'Príncipe de Cristal'],
  [238, 'Andromeda', 'Andrómeda'],
  [263, 'Raiz Bambu', 'Raíz Bambú'],
  [303, 'corazón de Venus', 'Corazón de Venus'],
  [304, 'corazón de Pluton', 'Corazón de Plutón'],
  [313, 'Essencial', 'Esencial'],
  [355, 'Flora ll', 'Flora II'],
  [356, 'Florícienta', 'Floricienta'],
  [359, 'Lagrimas de Felicidad', 'Lágrimas de Felicidad'],
  [425, 'Andromeda - C010', 'Andrómeda - C010'],
  [428, 'Cinturon de Orion', 'Cinturón de Orión'],
  [498, 'lote de gemas', 'Lote de Gemas'],
  [500, 'Ecos del Río ', 'Ecos del Río'],
  [503, 'Suspiro Ancestral ', 'Suspiro Ancestral'],
  [504, 'Canto del Rïo', 'Canto del Río'],
].map(([f, a, b]) => [INV, f, 2, a, b, 'nombre']);

/** Vocabularios controlados: valores fuera de las listas canónicas. */
const VOCAB = [
  [499, 4, 'Verde vivido', 'Verde Vívido', 'color: tilde + casing'],
  [504, 4, 'Verde limón', 'Verde Limón', 'color: casing'],
  [505, 4, 'Verde vïvido', 'Verde Vívido', 'color: diéresis por tilde'],
  [501, 4, 'Verde claro', 'Verde Claro', 'color: casing'],
  [503, 4, 'Verde claro', 'Verde Claro', 'color: casing'],
  [442, 4, 'Verde profundo', 'Verde Profundo', 'color: casing'],
  [504, 5, 'C. SÚPER FINA', 'COMERCIAL SÚPER FINA', 'calidad: abreviatura'],
  [505, 5, 'C. SÚPER FINA', 'COMERCIAL SÚPER FINA', 'calidad: abreviatura'],
  [507, 5, 'C.  SÚPER FINA', 'COMERCIAL SÚPER FINA', 'calidad: abreviatura'],
  [266, 7, 'SemiCuadrada', 'Semicuadrada', 'corte: casing interno'],
  [308, 7, 'Marquis', 'Marquise', 'corte: grafía dejada de lado'],
  [504, 7, 'Lágrima / Pera', 'Lágrima/Pera', 'corte: espaciado'],
  [502, 7, 'Ovalada', 'Óvalo', 'corte: adjetivo por sustantivo'],
  [499, 10, 'Faceteadas', 'Gema Facetada', 'categoría fuera de vocabulario'],
  [500, 10, 'Faceteada', 'Gema Facetada', 'categoría fuera de vocabulario'],
  [
    315,
    31,
    'Murralla + Cristal',
    'Muralla + Cristal',
    'tipoEsmeralda: doble r',
  ],
  [446, 31, 'Gola - Murralla', 'Gola - Muralla', 'tipoEsmeralda: doble r'],
  [
    331,
    32,
    'LOTE DE JOYAS',
    'Lote de joyas',
    'subtipoForm: duplicado por casing',
  ],
].map(([f, c, a, b, m]) => [INV, f, c, a, b, m]);

/** `Ovalo` → `Óvalo`. El código ya usa la forma con tilde en types/index.ts. */
const OVALO = [
  14, 34, 36, 37, 76, 77, 78, 79, 80, 81, 82, 89, 94, 201, 262, 291, 295, 297,
  324, 325, 351, 431,
].map((f) => [INV, f, 7, 'Ovalo', 'Óvalo', 'corte: falta tilde']);

/** Medidas y notas con espacios sobrantes o puntuación rota. */
const LIMPIEZA = [
  // El punto doble estaba en las dos columnas. I es la viva (J quedó en
  // desuso, ver §1b de la nota de Anima), así que la que importa es I220.
  [
    220,
    8,
    '5.5 × 4.1 × 2.5 × 4.9 × 3.1 × 2..3 mm',
    '5.5 × 4.1 × 2.5 × 4.9 × 3.1 × 2.3 mm',
    'medida: punto doble',
  ],
  [
    220,
    9,
    '5.5 × 4.1 × 2.5 × 4.9 × 3.1 × 2..3 mm',
    '5.5 × 4.1 × 2.5 × 4.9 × 3.1 × 2.3 mm',
    'medida: punto doble',
  ],
  [
    488,
    8,
    '497-A: 3.6 x 2.9 x 2.2 ',
    '497-A: 3.6 x 2.9 x 2.2',
    'medidas: espacio final',
  ],
  [
    499,
    8,
    '#508-A:   4.2 x 2.2 x 1.8     #508-B: 4.0 x 3.0 x 2.2   #508-C: 4.9 x 3.5 x 2.7 ',
    '#508-A: 4.2 x 2.2 x 1.8 #508-B: 4.0 x 3.0 x 2.2 #508-C: 4.9 x 3.5 x 2.7',
    'medidas: espacios dobles',
  ],
  [
    500,
    8,
    '#509-A:  6.4 x 4.1 x 2.5  #509-B: 6.2 x 3.9 x 2.3  #509-C: 5 .0 x 3.4 x 2.5 ',
    '#509-A: 6.4 x 4.1 x 2.5 #509-B: 6.2 x 3.9 x 2.3 #509-C: 5.0 x 3.4 x 2.5',
    'medidas: espacios dobles + "5 .0"',
  ],
  [503, 8, '7 x 4.7 x 3.3 ', '7 x 4.7 x 3.3', 'medidas: espacio final'],
  [
    183,
    56,
    "Calidad difiere: legacy=Fina Esencial  vs modeloPrecios=Fina comercial | Caja (snapshot) registra comprador 'Tierra Madre' vs asesor actual 'Isa la Negra Vikinga Warrior Portocarrero' — revisar si son ventas distintas o la copia está desactualizada.",
    "Calidad difiere: legacy=Fina Esencial vs modeloPrecios=Fina comercial | Caja (snapshot) registra comprador 'Tierra Madre' vs asesor actual 'Isa la Negra Vikinga Warrior Portocarrero' — revisar si son ventas distintas o la copia está desactualizada.",
    'nota: espacio doble',
  ],
].map(([f, c, a, b, m]) => [INV, f, c, a, b, m]);

/**
 * Filas 419/420: el bloque asesor/estado/QR quedó dos columnas a la izquierda.
 * Se devuelve cada valor a su columna y se vacía N («sin uso»).
 */
const CORRIMIENTO = [419, 420].flatMap((f) => [
  [INV, f, 13, 'Mauricio Echeverry', '', 'corrimiento: N no lleva asesor'],
  [INV, f, 14, 'DISPONIBLE', '', 'corrimiento: O es UBICACIÓN, no estado'],
  [
    INV,
    f,
    15,
    `https://tierramadre.app/p/${f}`,
    'Mauricio Echeverry',
    'corrimiento: P es ASESOR',
  ],
  [INV, f, 16, '', 'DISPONIBLE', 'corrimiento: Q es ESTADO'],
  [INV, f, 17, '', `https://tierramadre.app/p/${f}`, 'corrimiento: R es QR'],
]);

/** Las listas canónicas también traen erratas propias. */
const LISTAS = [
  [19, 2, 'Ovalo', 'Óvalo', 'corte: falta tilde'],
  [4, 2, 'Cabuchon', 'Cabujón', 'corte: falta tilde (0 usos)'],
  [
    16,
    2,
    'Marquis',
    'Lágrima/Pera',
    'corte: se reemplaza el duplicado de Marquise por el valor realmente en uso',
  ],
  [9, 10, 'Gola - Murralla', 'Gola - Muralla', 'tipoEsmeralda: doble r'],
  [11, 10, 'Murralla + Cristal', 'Muralla + Cristal', 'tipoEsmeralda: doble r'],
  [12, 11, 'LOTE DE JOYAS', '', 'subtipoForm: duplicado de "Lote de joyas"'],
  [17, 0, 'Verde claro', 'Verde Claro', 'color: casing'],
  [19, 0, 'Verde profundo', 'Verde Profundo', 'color: casing'],
].map(([f, c, a, b, m]) => [LIS, f, c, a, b, m]);

const PLAN = [
  ...NOMBRES,
  ...VOCAB,
  ...OVALO,
  ...LIMPIEZA,
  ...CORRIMIENTO,
  ...LISTAS,
];

// ── Auth ──────────────────────────────────────────────────────────────────
const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
if (!key) {
  console.error('Falta GOOGLE_SERVICE_ACCOUNT_KEY');
  process.exit(1);
}
const rawKey = key.trim().startsWith('{')
  ? key
  : Buffer.from(key, 'base64').toString();
const sheets = new sheets_v4.Sheets({
  auth: new GoogleAuth({
    credentials: JSON.parse(rawKey),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  }),
});

// ── Leer estado actual ────────────────────────────────────────────────────
const read = async () => {
  const snap = {};
  for (const [tab, range] of [
    [INV, 'A1:BF1000'],
    [LIS, 'A1:Z200'],
  ]) {
    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId: SOT3,
      range: `'${tab}'!${range}`,
    });
    snap[tab] = data.values || [];
  }
  return snap;
};

const cellOf = (snap, tab, fila, ci) => String(snap[tab][fila - 1]?.[ci] ?? '');

const before = await read();

// La hoja es un espejo posicional. Si los encabezados se movieron, las
// coordenadas del plan apuntan a otra cosa: se aborta antes de tocar nada.
const ESPERA_HEADERS = {
  2: 'Nombre',
  4: 'Color',
  5: 'Calidad',
  7: 'Corte',
  8: 'Medidas',
  9: 'Medidas (valores)',
  10: 'Categoría',
  13: '(sin uso)',
  14: 'UBICACIÓN',
  15: 'ASESOR',
  16: 'ESTADO',
  17: 'QR',
  31: 'tipoEsmeralda',
  32: 'subtipoForm',
  56: 'Notas / conflictos',
};
for (const [ci, esperado] of Object.entries(ESPERA_HEADERS)) {
  const real = String(before[INV][0]?.[ci] ?? '').trim();
  if (real !== esperado) {
    console.error(
      `Encabezado ${colName(+ci)}1 esperaba "${esperado}" y trae "${real}". Aborto.`,
    );
    process.exit(1);
  }
}
const LIS_HEADERS = {
  0: 'color',
  2: 'corte',
  10: 'tipoEsmeralda',
  11: 'subtipoForm',
};
for (const [ci, esperado] of Object.entries(LIS_HEADERS)) {
  const real = String(before[LIS][0]?.[ci] ?? '').trim();
  if (real !== esperado) {
    console.error(
      `Listas!${colName(+ci)}1 esperaba "${esperado}" y trae "${real}". Aborto.`,
    );
    process.exit(1);
  }
}

// ── Verificar cada celda contra su valor esperado ──────────────────────────
const listo = [];
const yaHecho = [];
const roto = [];
for (const [tab, fila, ci, esperado, nuevo, motivo] of PLAN) {
  const actual = cellOf(before, tab, fila, ci);
  if (actual === nuevo) {
    yaHecho.push(`${tab}!${colName(ci)}${fila}`);
    continue;
  }
  if (actual !== esperado) {
    roto.push(
      `${tab}!${colName(ci)}${fila}: esperaba ${JSON.stringify(esperado)} y trae ${JSON.stringify(actual)}`,
    );
    continue;
  }
  listo.push({ tab, fila, ci, antes: actual, nuevo, motivo });
}

console.log(`\n=== Normalización de vocabulario · SOT v3 ===`);
console.log(`  Celdas en el plan     : ${PLAN.length}`);
console.log(`  A escribir            : ${listo.length}`);
console.log(`  Ya correctas          : ${yaHecho.length}`);
console.log(`  Desalineadas          : ${roto.length}`);

if (roto.length) {
  console.log('\n❌ La hoja no coincide con el plan. No se escribe nada:');
  roto.forEach((r) => console.log(`    ${r}`));
  process.exit(1);
}

const porMotivo = new Map();
listo.forEach((c) => {
  const k = c.motivo.split(':')[0];
  porMotivo.set(k, (porMotivo.get(k) || 0) + 1);
});
console.log('\n  Por tipo de corrección:');
[...porMotivo.entries()]
  .sort((a, b) => b[1] - a[1])
  .forEach(([k, n]) => console.log(`    ${String(n).padStart(3)}  ${k}`));

console.log('\n  Detalle:');
listo.forEach((c) =>
  console.log(
    `    ${c.tab}!${colName(c.ci)}${c.fila}  ${JSON.stringify(c.antes)} → ${JSON.stringify(c.nuevo)}`,
  ),
);

if (!listo.length) {
  console.log('\nNada que hacer.');
  process.exit(0);
}

if (!APPLY) {
  console.log('\nDRY-RUN. Volvé a correr con --apply para escribir.');
  process.exit(0);
}

// ── Backup ────────────────────────────────────────────────────────────────
mkdirSync(new URL('./.backups/', import.meta.url), { recursive: true });
const backupPath = new URL(
  './.backups/normalizar-vocabulario-sot3.json',
  import.meta.url,
);
writeFileSync(
  backupPath,
  JSON.stringify(
    {
      spreadsheetId: SOT3,
      nota: 'Estado previo de cada celda tocada por la normalización.',
      celdas: listo,
    },
    null,
    2,
  ),
);
console.log(`\nBackup → ${backupPath.pathname}`);

// ── Escribir ──────────────────────────────────────────────────────────────
const CHUNK = 100;
for (let i = 0; i < listo.length; i += CHUNK) {
  const slice = listo.slice(i, i + CHUNK);
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SOT3,
    requestBody: {
      valueInputOption: 'RAW',
      data: slice.map((c) => ({
        range: `'${c.tab}'!${colName(c.ci)}${c.fila}`,
        values: [[c.nuevo]],
      })),
    },
  });
  console.log(
    `  escritas ${Math.min(i + CHUNK, listo.length)}/${listo.length}`,
  );
}

// ── Verificar releyendo ───────────────────────────────────────────────────
const after = await read();
let ok = 0;
const mal = [];
listo.forEach((c) => {
  const v = cellOf(after, c.tab, c.fila, c.ci);
  if (v === c.nuevo) ok++;
  else mal.push(`${c.tab}!${colName(c.ci)}${c.fila} = ${JSON.stringify(v)}`);
});
console.log(
  `\n  Verificación: ${ok}/${listo.length} celdas con el valor nuevo`,
);
if (mal.length) mal.forEach((m) => console.log(`  ⚠️  ${m}`));

if (ok === listo.length) {
  console.log(
    '\n✅ Listo. Siguiente paso en la hoja: menú «🔄 Convex Sync → Sincronizar todo (completo)».',
  );
} else {
  console.log(
    '\n❌ La verificación no cerró. Revisar antes de sincronizar a Convex.',
  );
  process.exit(1);
}
