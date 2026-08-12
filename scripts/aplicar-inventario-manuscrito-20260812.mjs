/**
 * Lleva al SOT v3 / Inventario la captura física de inventario que Maritza hizo
 * a mano el 2026-08-12.
 *
 * FUENTE: scripts/.data/inventario-manuscrito-2026-08-12.json (79 updates + 7
 * altas). El payload es la fuente — acá no se transcribe nada a mano.
 *
 * QUÉ HACE:
 *   0. Rehace el autofiltro sobre A1:BE524. Hoy termina en endRowIndex 514 y
 *      hay 523 filas de datos: los ítems #525–#534 quedan fuera de todo filtro
 *      y orden. Este plan toca #528, #529, #530, #532, #533 y #534 — sin esto,
 *      al ordenar la hoja esas filas se desalinean del resto.
 *   1. Aplica los updates, ubicando SIEMPRE la columna por nombre de cabecera y
 *      la fila por itemId (columna A). Nunca por índice fijo: la pestaña mide
 *      102 columnas, el mapa del código cubre 57, y anclar a la derecha ya
 *      rompió una migración (03-ago, 21 filas basura con el itemId en AT).
 *   2. Da de alta las 7 filas nuevas (93A, 93B, 535–539) en rangos explícitos
 *      —nunca values.append, que fue justamente lo que descolocó el 03-ago—
 *      heredando del padre sólo los campos estructurales.
 *   3. Renombra C-042-G1 y C-042-G2 en la pestaña Sublotes.
 *   4. Ñapa: corrige el typo "2..3" que quedó vivo en la columna I de #219.
 *
 * REGLAS QUE NO SE NEGOCIAN (el script aborta o salta si se violan):
 *   · I "Medidas" es la medida buena; J "Medidas (valores)" está EN DESUSO y no
 *     se escribe nunca.
 *   · M "precioFinalCOP" no se toca en esta corrida (rige el remate hasta el 31-ago).
 *   · Y "mostrarEnCatalogo" es propiedad de Convex, no de la hoja. No se toca.
 *     Los 279 ítems con False acá y True en Convex son deriva esperada.
 *   · AA "observacion" se ANEXA, no se reemplaza. El payload ya trae el texto
 *     final concatenado; acá se verifica que lo que hoy vive en la celda siga
 *     contenido en el texto nuevo. Si no, se salta y se reporta: nunca se pierde
 *     un "Cono 2.1 mm" ni un "Precio especial por cierre de temporada".
 *   · Vacío no es un dato: jamás se escribe "" sobre una celda con contenido.
 *   · Σ hijos == costo del padre, exacto (el último hijo absorbe el redondeo).
 *
 * DESPUÉS DE APLICAR: correr en la hoja el menú «🔄 Convex Sync → Sincronizar
 * todo (completo)». El trigger onEdit es SIMPLE y no dispara con escrituras por
 * API, así que Convex no se entera solo.
 *
 * Uso:  node scripts/aplicar-inventario-manuscrito-20260812.mjs           # dry-run
 *       node scripts/aplicar-inventario-manuscrito-20260812.mjs --apply
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

config({ path: '.env.local' });
config({ path: '.env' });

const APPLY = process.argv.includes('--apply');
/** Sólo hace falta si una cabecera se movió de columna respecto del payload. */
const ALLOW_COL_DRIFT = process.argv.includes('--allow-col-drift');

const SOT3 = '1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U';
const TAB = 'Inventario';
const GID_INVENTARIO = 1819792669;
const TAB_SUBLOTES = 'Sublotes';

/** El autofiltro tiene que cubrir TODAS las filas de datos: A1:BE524. */
const FILTRO_COL_FIN = 57; // BE, exclusivo (0-based)

const PAYLOAD = JSON.parse(
  readFileSync(
    new URL('./.data/inventario-manuscrito-2026-08-12.json', import.meta.url),
    'utf8',
  ),
);

/**
 * Correcciones POSTERIORES a la generación del payload.
 *
 * Viven acá y no dentro del JSON a propósito: el payload es el artefacto que se
 * recibió, y así toda desviación queda a la vista en el dry-run en vez de
 * desaparecer dentro de la fuente.
 *
 * #452 — Kevin, 2026-08-12: el ítem sigue siendo las CUATRO gemas pedagógicas;
 * lo único que cambia es el nombre, las 4 piezas pasan a llamarse "Falsedad".
 * El papel traía 1,06 ct y cant 1 porque Maritza midió UNA piedra; la columna D
 * es el peso del grupo (la convención de la casa en todos los sublotes), así que
 * los 4,32 ct y la cant 4 se conservan.
 */
const OVERRIDES = [
  {
    itemId: '452',
    campo: 'Cant.',
    accion: 'omitir',
    motivo:
      'Kevin 12-ago-2026: las 4 piezas siguen ahí y todas se llaman Falsedad. Cant. se queda en 4.',
  },
  {
    itemId: '452',
    campo: 'Peso (ct)',
    accion: 'omitir',
    motivo:
      'Idem: con 4 piezas, D es el peso del grupo (4,32 ct). El 1,06 del papel es de una sola piedra.',
  },
  {
    itemId: '452',
    campo: 'observacion',
    accion: 'reemplazar',
    valor:
      'Antes: Gemas Pedagógicas Laboratorio (Marketing). Renombrado 12-ago-2026 (inventario ' +
      'manuscrito): las 4 piezas pasan a llamarse Falsedad. Cant. 4 y 4,32 ct se conservan; el ' +
      '1,06 ct del papel es el peso de una sola piedra. Consignado a Mario Gómez el 08-ago-2026 ' +
      "como 'Esmeralda de Laboratorio', $20.000.",
    motivo:
      'El texto del payload daba por hecho el cambio a 1,06 ct / cant 1, que ya no ocurre.',
  },
];

// ─── Cabeceras ────────────────────────────────────────────────────────────
/** `campo` del payload → nombre EXACTO de la cabecera en la fila 1. */
const CAMPO_A_CABECERA = {
  Nombre: 'Nombre',
  'Peso (ct)': 'Peso (ct)',
  Color: 'Color',
  Calidad: 'Calidad',
  'Cant.': 'Cant.',
  Medidas: 'Medidas',
  costoBaseCOP: 'costoBaseCOP',
  observacion: 'observacion',
};
/** Columnas que este script no escribe jamás, aunque el payload lo pidiera. */
const CABECERAS_PROHIBIDAS = [
  'Medidas (valores)',
  'precioFinalCOP',
  'mostrarEnCatalogo',
];
/** Campos que el alta hereda del padre tal cual (nunca los de negocio). */
const CABECERAS_HEREDADAS = [
  'Corte',
  'Categoría',
  'UBICACIÓN',
  'ESTADO',
  'procedencia',
  'loteId',
  'tipoEsmeralda',
];
/** Columnas con lista desplegable: un valor fuera de la lista queda en rojo. */
const LISTAS = { Color: 'Listas!A2:A20', Calidad: 'Listas!B2:B24' };
/** Se guardan como número, no como texto. */
const CAMPOS_NUMERICOS = new Set(['Peso (ct)', 'Cant.', 'costoBaseCOP']);

// ─── Utilidades ───────────────────────────────────────────────────────────
const clean = (v) =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim();
const normHeader = (v) => clean(v).toLowerCase();
const esNumerico = (v) => /^-?[\d.,]+$/.test(clean(v)) && /\d/.test(clean(v));
/** "550,240" y 550240 son el mismo dato; "0.60" y 0.6 también. */
const aNumero = (v) => Number(clean(v).replace(/,/g, ''));
const mismoValor = (a, b) => {
  const ca = clean(a);
  const cb = clean(b);
  if (esNumerico(ca) && esNumerico(cb)) return aNumero(ca) === aNumero(cb);
  return ca === cb;
};
const colLetter = (i) => {
  let s = '';
  let n = i;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
};
const cop = (n) => '$' + Number(n).toLocaleString('es-CO');
const corta = (v, n = 78) => {
  const s = clean(v);
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
};

const avisos = [];
const aviso = (msg) => avisos.push(msg);
let abortar = false;
const fatal = (msg) => {
  console.error(`\n❌ ${msg}`);
  abortar = true;
};

// ─── Auth ─────────────────────────────────────────────────────────────────
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

// ─── Lectura de la hoja ───────────────────────────────────────────────────
const meta = await sheets.spreadsheets.get({
  spreadsheetId: SOT3,
  fields: 'sheets(properties(sheetId,title,gridProperties),basicFilter(range))',
});
const hojaInv = meta.data.sheets.find((s) => s.properties.title === TAB);
const hojaSub = meta.data.sheets.find(
  (s) => s.properties.title === TAB_SUBLOTES,
);
if (!hojaInv) {
  console.error(`No existe la pestaña "${TAB}".`);
  process.exit(1);
}
if (hojaInv.properties.sheetId !== GID_INVENTARIO)
  fatal(
    `gid inesperado para "${TAB}": ${hojaInv.properties.sheetId} (esperaba ${GID_INVENTARIO}).`,
  );

const [invRes, subRes, listasRes] = await Promise.all([
  sheets.spreadsheets.values.get({
    spreadsheetId: SOT3,
    range: `'${TAB}'!A1:CX600`,
    valueRenderOption: 'UNFORMATTED_VALUE',
  }),
  hojaSub
    ? sheets.spreadsheets.values.get({
        spreadsheetId: SOT3,
        range: `'${TAB_SUBLOTES}'!A1:Z200`,
      })
    : Promise.resolve({ data: { values: [] } }),
  sheets.spreadsheets.values.get({
    spreadsheetId: SOT3,
    range: 'Listas!A1:C40',
  }),
]);

const rows = invRes.data.values || [];
const headers = rows[0] || [];

/** Cabecera → índice 0-based. Exige coincidencia única. */
const idxDeCabecera = (nombre) => {
  const objetivo = normHeader(nombre);
  const hits = headers
    .map((h, i) => (normHeader(h) === objetivo ? i : -1))
    .filter((i) => i >= 0);
  if (hits.length !== 1) {
    fatal(
      `Cabecera "${nombre}": ${hits.length} coincidencias en la fila 1. Aborto por seguridad.`,
    );
    return -1;
  }
  return hits[0];
};

const COL = {};
for (const [campo, cabecera] of Object.entries(CAMPO_A_CABECERA))
  COL[campo] = idxDeCabecera(cabecera);
const COL_ITEM = idxDeCabecera('Item');
const COL_SUBLOTE_GRUPO = idxDeCabecera('subLote (grupo)');
const COL_QR = idxDeCabecera('QR');
const COL_PRODUCTO_URL = idxDeCabecera('Producto (URL)');
const COL_HEREDADAS = Object.fromEntries(
  CABECERAS_HEREDADAS.map((h) => [h, idxDeCabecera(h)]),
);
const IDX_PROHIBIDOS = new Set(
  CABECERAS_PROHIBIDAS.map((h) => idxDeCabecera(h)).filter((i) => i >= 0),
);

console.log(`\n╔═══ Inventario manuscrito 2026-08-12 → SOT v3 / ${TAB} ═══`);
console.log(
  `║ ${APPLY ? '⚠️  MODO --apply (ESCRIBE)' : 'DRY-RUN (no escribe nada)'}`,
);
console.log(`╚═══════════════════════════════════════════════════════════\n`);

console.log('── Columnas resueltas por cabecera ──');
for (const [campo, i] of Object.entries(COL))
  console.log(
    `   ${colLetter(i).padStart(2)} (${String(i).padStart(2)})  "${headers[i]}"  ← campo "${campo}"`,
  );
console.log(
  `   ${colLetter(COL_SUBLOTE_GRUPO)} "${headers[COL_SUBLOTE_GRUPO]}", ` +
    `${colLetter(COL_QR)} "${headers[COL_QR]}", ` +
    `${colLetter(COL_PRODUCTO_URL)} "${headers[COL_PRODUCTO_URL]}" (altas)`,
);
console.log(
  `   prohibidas: ${CABECERAS_PROHIBIDAS.map((h) => `${colLetter(idxDeCabecera(h))} "${h}"`).join(' · ')}`,
);

// ─── Índice de filas por itemId ───────────────────────────────────────────
const filaDeItem = new Map();
const duplicados = [];
let ultimaFilaDatos = 1;
for (let r = 1; r < rows.length; r++) {
  const id = clean(rows[r]?.[COL_ITEM]);
  const nombre = clean(rows[r]?.[COL.Nombre]);
  if (!id && !nombre) continue;
  ultimaFilaDatos = r + 1;
  if (!id) continue;
  if (filaDeItem.has(id)) duplicados.push(id);
  else filaDeItem.set(id, r + 1); // 1-based
}
const filasDeDatos = ultimaFilaDatos - 1;
console.log(
  `\n── Hoja: ${filasDeDatos} filas de datos (última: f${ultimaFilaDatos}), ` +
    `${hojaInv.properties.gridProperties.columnCount} columnas, ` +
    `grid de ${hojaInv.properties.gridProperties.rowCount} filas ──`,
);
if (duplicados.length)
  fatal(`itemIds duplicados en la hoja: ${duplicados.join(', ')}`);

// ─── 1. Autofiltro ────────────────────────────────────────────────────────
const filtroActual = hojaInv.basicFilter?.range;
const filtroFinActual = filtroActual?.endRowIndex ?? 0;
const necesitaFiltro = filtroFinActual !== ultimaFilaDatos;
console.log('\n── Autofiltro ──');
console.log(
  `   actual : filas 1..${filtroFinActual}, columnas 1..${filtroActual?.endColumnIndex ?? 0}`,
);
if (necesitaFiltro) {
  const fuera = ultimaFilaDatos - filtroFinActual;
  console.log(
    `   ⚠️  ${fuera} fila(s) de datos quedan FUERA del filtro ` +
      `(f${filtroFinActual + 1}..f${ultimaFilaDatos} → ítems ` +
      `${clean(rows[filtroFinActual]?.[COL_ITEM])}–${clean(rows[ultimaFilaDatos - 1]?.[COL_ITEM])}).`,
  );
  console.log(
    `   corrige: A1:${colLetter(FILTRO_COL_FIN - 1)}${ultimaFilaDatos} ANTES de escribir.`,
  );
} else {
  console.log('   ✓ ya cubre todas las filas de datos.');
}

// ─── 2. Validación del payload ────────────────────────────────────────────
const updatesInvRaw = PAYLOAD.updates.filter(
  (u) => !/\(Sublotes\)/i.test(u.campo),
);
const updatesSub = PAYLOAD.updates.filter((u) => /\(Sublotes\)/i.test(u.campo));
const altas = PAYLOAD.altas;

console.log(
  `\n── Payload: ${PAYLOAD.updates.length} updates ` +
    `(${updatesInvRaw.length} en ${TAB} + ${updatesSub.length} en ${TAB_SUBLOTES}) · ${altas.length} altas ──`,
);

// ── Overrides posteriores al payload ─────────────────────────────────────
const overridesAplicados = new Set();
const updatesInv = [];
for (const u of updatesInvRaw) {
  const ov = OVERRIDES.find(
    (o) => o.itemId === clean(u.itemId) && o.campo === u.campo,
  );
  if (!ov) {
    updatesInv.push(u);
    continue;
  }
  overridesAplicados.add(ov);
  if (ov.accion === 'omitir') continue;
  updatesInv.push({ ...u, valorNuevo: ov.valor, overridePor: ov.motivo });
}
if (OVERRIDES.length) {
  console.log(`\n── Overrides sobre el payload (${OVERRIDES.length}) ──`);
  for (const ov of OVERRIDES)
    console.log(
      `   item ${ov.itemId} · ${ov.campo} → ${ov.accion.toUpperCase()}\n      ${ov.motivo}`,
    );
}
// Un override que no encaja significa que el payload cambió bajo los pies.
const overridesHuerfanos = OVERRIDES.filter((o) => !overridesAplicados.has(o));
if (overridesHuerfanos.length)
  fatal(
    `Overrides que no encontraron su update en el payload: ` +
      overridesHuerfanos.map((o) => `${o.itemId}/${o.campo}`).join(', ') +
      `. El payload cambió — revisar antes de escribir.`,
  );

// itemIds de los updates: tienen que existir
const idsUpdate = [...new Set(updatesInv.map((u) => clean(u.itemId)))];
const faltantes = idsUpdate.filter((id) => !filaDeItem.has(id));
console.log(
  `   itemIds a modificar: ${idsUpdate.length} · encontrados: ${idsUpdate.length - faltantes.length}`,
);
if (faltantes.length) {
  fatal(
    `itemIds del payload que NO existen en la hoja: ${faltantes.join(', ')}`,
  );
  aviso(`itemIds no encontrados: ${faltantes.join(', ')}`);
}

// itemIds de las altas: NO tienen que existir
const altasExistentes = altas.filter((a) => filaDeItem.has(clean(a.itemId)));
console.log(
  `   itemIds a crear: ${altas.map((a) => a.itemId).join(', ')} · ` +
    (altasExistentes.length
      ? `⚠️ YA EXISTEN: ${altasExistentes.map((a) => a.itemId).join(', ')}`
      : 'ninguno existe ✓'),
);
if (altasExistentes.length)
  fatal(
    `Altas que ya existen en la hoja: ${altasExistentes.map((a) => a.itemId).join(', ')}. ` +
      `Correr esto de nuevo duplicaría filas.`,
  );

// ─── 3. Invariante de costos: Σ hijos == costo del padre ──────────────────
console.log(
  '\n── Invariante de costos (Σ hijos == costo del padre, exacto) ──',
);
const costoNuevoDe = (id) => {
  const u = updatesInv.find(
    (x) => clean(x.itemId) === id && x.campo === 'costoBaseCOP',
  );
  return u ? aNumero(u.valorNuevo) : null;
};
for (const padreId of ['93', '501', '504']) {
  const fila = filaDeItem.get(padreId);
  const costoHoy = aNumero(rows[fila - 1]?.[COL.costoBaseCOP] ?? 0);
  const costoNuevo = costoNuevoDe(padreId);
  // El padre #93 se corrige antes de repartir ($469.120 del papel); #501 y #504
  // se retiran a 0 y lo que se reparte es el costo que tenían.
  const base = costoNuevo ? costoNuevo : costoHoy;
  const hijos = altas.filter((a) =>
    new RegExp(`^#${padreId}\\b`).test(a.padre),
  );
  const suma = hijos.reduce((s, a) => s + Number(a.costoBaseCOP), 0);
  const ok = suma === base;
  console.log(
    `   #${padreId}: ${hijos.map((h) => `${h.itemId} ${cop(h.costoBaseCOP)}`).join(' + ')} ` +
      `= ${cop(suma)} vs base ${cop(base)}  ${ok ? '✓' : '✗'}`,
  );
  if (!ok)
    fatal(
      `El reparto de #${padreId} no cierra: Σ hijos ${cop(suma)} ≠ ${cop(base)}.`,
    );
}

// ─── 4. Diff completo ─────────────────────────────────────────────────────
const escrituras = []; // {fila, colIdx, valor, ...}
const omitidos = [];
const derivas = [];

/** Valores admitidos por los desplegables de Color y Calidad. */
const listasCols = listasRes.data.values || [];
const valoresDeLista = (rango) => {
  const col = rango.startsWith('Listas!A') ? 0 : 1;
  return new Set(
    listasCols
      .slice(1)
      .map((r) => clean(r?.[col]))
      .filter(Boolean),
  );
};
const LISTA_VALIDA = Object.fromEntries(
  Object.entries(LISTAS).map(([campo, r]) => [campo, valoresDeLista(r)]),
);

for (const u of updatesInv) {
  const id = clean(u.itemId);
  const fila = filaDeItem.get(id);
  if (!fila) continue; // ya reportado como fatal
  const colIdx = COL[u.campo];
  if (colIdx === undefined || colIdx < 0) {
    fatal(`Campo "${u.campo}" del payload sin cabecera resuelta (item ${id}).`);
    continue;
  }
  if (IDX_PROHIBIDOS.has(colIdx)) {
    fatal(
      `El payload pide escribir en "${headers[colIdx]}" (item ${id}) — columna prohibida.`,
    );
    continue;
  }
  // La letra declarada en el payload es informativa; manda la cabecera.
  if (u.col && u.col !== colLetter(colIdx)) {
    aviso(
      `Item ${id} campo "${u.campo}": el payload dice columna ${u.col} pero la ` +
        `cabecera "${headers[colIdx]}" vive en ${colLetter(colIdx)}. Manda la cabecera.`,
    );
  }

  const actual = rows[fila - 1]?.[colIdx];
  const nuevo = u.valorNuevo;
  const rec = {
    id,
    fila,
    colIdx,
    col: colLetter(colIdx),
    campo: u.campo,
    actual,
    valor: nuevo,
    nota: u.nota,
    modo: u.modo,
  };

  // Vacío no es un dato: nunca se borra contenido escribiendo "".
  if (clean(nuevo) === '' && clean(actual) !== '') {
    omitidos.push({ ...rec, motivo: 'valorNuevo vacío sobre celda con dato' });
    continue;
  }
  if (mismoValor(actual, nuevo)) {
    omitidos.push({ ...rec, motivo: 'la celda ya tiene ese valor' });
    continue;
  }

  // AA observacion: se ANEXA. El texto nuevo tiene que contener lo que hay hoy.
  if (u.campo === 'observacion' && clean(actual) !== '') {
    if (!clean(nuevo).includes(clean(actual))) {
      omitidos.push({
        ...rec,
        motivo:
          '⚠️ CONFLICTO: la observación actual NO está contenida en el texto nuevo — se perdería. Revisar a mano.',
      });
      aviso(
        `Item ${id} · observacion: la celda cambió respecto del payload y el texto ` +
          `nuevo no la contiene. NO se escribe.\n      hoy   : ${corta(actual, 120)}\n      nuevo : ${corta(nuevo, 120)}`,
      );
      continue;
    }
    if (u.modo !== 'append')
      aviso(
        `Item ${id} · observacion viene con modo "${u.modo}", pero el texto nuevo ` +
          `sí conserva la observación previa. Se escribe.`,
      );
  }

  // Deriva: la hoja no dice lo que el payload esperaba encontrar.
  if (u.valorActual !== null && !mismoValor(actual, u.valorActual)) {
    derivas.push({ ...rec, esperado: u.valorActual });
  }

  // Los desplegables marcan en rojo cualquier valor fuera de lista.
  if (LISTA_VALIDA[u.campo] && !LISTA_VALIDA[u.campo].has(clean(nuevo))) {
    aviso(
      `Item ${id} · ${u.campo}: "${clean(nuevo)}" no está en la lista desplegable ` +
        `(${LISTAS[u.campo]}). La celda quedaría marcada como inválida.`,
    );
  }

  escrituras.push(rec);
}

// Ñapa: el typo "2..3" que la normalización del 11-ago dejó vivo en I.
console.log('\n── Ñapa: typo "N..N" en la columna I ──');
const typos = [];
for (let r = 1; r < rows.length; r++) {
  const v = clean(rows[r]?.[COL.Medidas]);
  if (/\d\.\.\d/.test(v))
    typos.push({ fila: r + 1, id: clean(rows[r]?.[COL_ITEM]), valor: v });
}
if (!typos.length) {
  console.log('   ✓ no queda ningún "N..N" en la columna I (tampoco en #219).');
} else {
  for (const t of typos) {
    const corregido = t.valor.replace(/(\d)\.\.(\d)/g, '$1.$2');
    console.log(`   f${t.fila} item ${t.id}: "${t.valor}" → "${corregido}"`);
    escrituras.push({
      id: t.id,
      fila: t.fila,
      colIdx: COL.Medidas,
      col: colLetter(COL.Medidas),
      campo: 'Medidas',
      actual: t.valor,
      valor: corregido,
      nota: 'Ñapa: typo de la normalización del 11-ago (corrigió J, que está muerta).',
      modo: 'replace',
    });
  }
}

// ─── 5. Sublotes ──────────────────────────────────────────────────────────
const subRows = subRes.data.values || [];
const subHeaders = subRows[0] || [];
const subIdx = (nombre) =>
  subHeaders.findIndex((h) => normHeader(h) === normHeader(nombre));
const SUB_COL_ID = subIdx('subLoteId');
const SUB_COL_NOMBRE = subIdx('nombre');
const escriturasSub = [];
console.log(`\n── ${TAB_SUBLOTES} ──`);
if (!hojaSub) {
  fatal(`No existe la pestaña "${TAB_SUBLOTES}" en el SOT v3.`);
} else if (SUB_COL_ID < 0 || SUB_COL_NOMBRE < 0) {
  fatal(
    `Cabeceras "subLoteId"/"nombre" no encontradas en ${TAB_SUBLOTES}: ${subHeaders.join(' | ')}`,
  );
} else {
  console.log(
    `   columnas: ${colLetter(SUB_COL_ID)} "subLoteId" · ${colLetter(SUB_COL_NOMBRE)} "nombre"`,
  );
  for (const u of updatesSub) {
    const id = clean(u.itemId);
    const r = subRows.findIndex(
      (row, i) => i > 0 && clean(row?.[SUB_COL_ID]) === id,
    );
    if (r < 0) {
      fatal(`subLoteId "${id}" no existe en la pestaña ${TAB_SUBLOTES}.`);
      aviso(`subLoteId no encontrado: ${id}`);
      continue;
    }
    const actual = subRows[r]?.[SUB_COL_NOMBRE];
    if (mismoValor(actual, u.valorNuevo)) {
      omitidos.push({
        id,
        fila: r + 1,
        col: colLetter(SUB_COL_NOMBRE),
        campo: u.campo,
        actual,
        valor: u.valorNuevo,
        motivo: 'la celda ya tiene ese valor',
      });
      continue;
    }
    escriturasSub.push({
      id,
      fila: r + 1,
      colIdx: SUB_COL_NOMBRE,
      col: colLetter(SUB_COL_NOMBRE),
      campo: u.campo,
      actual,
      valor: u.valorNuevo,
    });
  }
}

// ─── 6. Altas ─────────────────────────────────────────────────────────────
const primeraFilaAlta = ultimaFilaDatos + 1;
const filasAlta = [];
console.log(
  '\n── Altas (filas nuevas, en rangos explícitos: nunca values.append) ──',
);
altas.forEach((a, n) => {
  const fila = primeraFilaAlta + n;
  const padreId = (a.padre.match(/#(\d+)/) || [])[1];
  const filaPadre = padreId ? filaDeItem.get(padreId) : null;
  if (!filaPadre)
    fatal(`No encuentro el padre "${a.padre}" del alta ${a.itemId}.`);

  const valores = [];
  const set = (idx, v) => {
    if (idx >= 0) valores[idx] = v;
  };
  set(COL_ITEM, a.itemId);
  set(COL.Nombre, a.nombre);
  set(COL['Peso (ct)'], a.pesoCt === '' ? '' : Number(a.pesoCt));
  set(COL.Color, a.color);
  set(COL.Calidad, a.calidad);
  set(COL['Cant.'], Number(a.cant));
  set(COL.Medidas, a.medidas);
  set(COL.costoBaseCOP, Number(a.costoBaseCOP));
  set(COL_SUBLOTE_GRUPO, a.subLote);
  set(COL_QR, `https://tierramadre.app/p/${a.itemId}`);
  set(COL_PRODUCTO_URL, `https://tierramadre.app/product/${a.itemId}`);
  const observacion =
    `Sublote ${a.subLote} de ${a.padre} (subdivisión 12-ago-2026, inventario manuscrito). ` +
    `Costo repartido ${a.reparto}.` +
    (a.nota ? ` ${a.nota}` : '');
  set(COL.observacion, observacion);

  const heredados = {};
  for (const [cab, idx] of Object.entries(COL_HEREDADAS)) {
    const v = filaPadre ? rows[filaPadre - 1]?.[idx] : '';
    if (clean(v) !== '') {
      set(idx, v);
      heredados[cab] = v;
    }
  }
  for (const [campo, lista] of Object.entries(LISTA_VALIDA)) {
    const v = clean(valores[COL[campo]]);
    if (v && !lista.has(v))
      aviso(
        `Alta ${a.itemId} · ${campo}: "${v}" no está en la lista desplegable (${LISTAS[campo]}).`,
      );
  }

  console.log(
    `   f${fila}  ${String(a.itemId).padEnd(4)} "${a.nombre}"  ${a.subLote}  ` +
      `cant ${a.cant} · ${a.pesoCt || '(sin peso)'} ct · ${a.medidas} · ${a.calidad} · ${a.color} · ${cop(a.costoBaseCOP)}`,
  );
  console.log(
    `         hereda de #${padreId} (f${filaPadre}): ` +
      Object.entries(heredados)
        .map(([k, v]) => `${k}="${clean(v)}"`)
        .join(' · '),
  );
  console.log(`         AA: ${corta(observacion, 110)}`);
  if (/⚠️/.test(a.nota || ''))
    aviso(`Alta ${a.itemId} "${a.nombre}": ${a.nota}`);

  // Se rellena hasta la última columna escrita (BA); el resto de la fila queda
  // fuera del rango. Las celdas intermedias sin dato van como "" — son filas
  // nuevas, así que ni J ni M ni Y pisan nada: nacen vacías y Convex las llena.
  const ancho = valores.length;
  for (let i = 0; i < ancho; i++) if (valores[i] === undefined) valores[i] = '';
  filasAlta.push({ fila, itemId: a.itemId, valores });
});
console.log(
  `   → filas f${primeraFilaAlta}..f${primeraFilaAlta + altas.length - 1} · ` +
    `total de la hoja: ${filasDeDatos} → ${filasDeDatos + altas.length}`,
);
console.log(
  `   Y "mostrarEnCatalogo" y M "precioFinalCOP" quedan VACÍAS en las altas ` +
    `(propiedad de Convex / fuera de alcance).`,
);

// ─── 7. Diff a la vista ───────────────────────────────────────────────────
console.log(
  `\n\n═══ DIFF COMPLETO — ${escrituras.length + escriturasSub.length} escrituras ═══\n`,
);
const GRUPOS = [
  ['Renombres', (e) => e.campo === 'Nombre'],
  ['Medidas', (e) => e.campo === 'Medidas'],
  ['Pesos', (e) => e.campo === 'Peso (ct)'],
  ['Colores', (e) => e.campo === 'Color'],
  ['Calidades', (e) => e.campo === 'Calidad'],
  ['Costos', (e) => e.campo === 'costoBaseCOP'],
  ['Cantidades', (e) => e.campo === 'Cant.'],
  ['Observaciones (col AA — se anexa)', (e) => e.campo === 'observacion'],
];
const resumen = {};
for (const [titulo, test] of GRUPOS) {
  const lista = escrituras.filter(test);
  resumen[titulo] = lista.length;
  if (!lista.length) continue;
  console.log(`── ${titulo} (${lista.length}) ──`);
  for (const e of lista) {
    console.log(
      `   item ${String(e.id).padEnd(5)} f${String(e.fila).padEnd(4)} ${e.col.padStart(2)} ${e.campo}`,
    );
    console.log(`      actual : ${corta(e.actual) || '(vacío)'}`);
    console.log(`      nuevo  : ${corta(e.valor)}`);
  }
  console.log('');
}
if (escriturasSub.length) {
  console.log(`── ${TAB_SUBLOTES} (${escriturasSub.length}) ──`);
  for (const e of escriturasSub)
    console.log(
      `   ${e.id}  f${e.fila} ${e.col} nombre : "${clean(e.actual)}" → "${e.valor}"`,
    );
  console.log('');
}

// ─── 8. Resumen, omitidos y advertencias ──────────────────────────────────
console.log('═══ RESUMEN ═══');
for (const [t, n] of Object.entries(resumen))
  if (n) console.log(`   ${t}: ${n}`);
if (escriturasSub.length)
  console.log(`   Sublotes (renombres de grupo): ${escriturasSub.length}`);
console.log(
  `   Altas: ${filasAlta.length} filas nuevas (${altas.map((a) => a.itemId).join(', ')})`,
);
const retirados = [
  ...new Set(
    escrituras
      .filter((e) => e.campo === 'Cant.' && aNumero(e.valor) === 0)
      .map((e) => e.id),
  ),
];
console.log(
  `   Retiros (padres subdivididos, cant 0 · fila y QR vivos): ${retirados.join(', ')}`,
);
console.log(
  `   Autofiltro: ${necesitaFiltro ? `A1:${colLetter(FILTRO_COL_FIN - 1)}${filtroFinActual} → A1:${colLetter(FILTRO_COL_FIN - 1)}${ultimaFilaDatos}` : 'sin cambios'}` +
    ` (y a A1:${colLetter(FILTRO_COL_FIN - 1)}${ultimaFilaDatos + altas.length} tras las altas)`,
);

if (omitidos.length) {
  console.log(
    `\n── Updates del payload que NO se escriben (${omitidos.length}) ──`,
  );
  for (const o of omitidos)
    console.log(
      `   item ${String(o.id).padEnd(5)} ${o.col} ${o.campo}: ${o.motivo}\n` +
        `      actual : ${corta(o.actual) || '(vacío)'}\n` +
        `      payload: ${corta(o.valor) || '(vacío)'}`,
    );
}

if (derivas.length) {
  console.log(
    `\n── ⚠️ Deriva: la hoja no dice lo que el payload esperaba (${derivas.length}) ──`,
  );
  for (const d of derivas)
    console.log(
      `   item ${String(d.id).padEnd(5)} ${d.col} ${d.campo}\n` +
        `      payload esperaba : ${corta(d.esperado) || '(vacío)'}\n` +
        `      la hoja dice     : ${corta(d.actual) || '(vacío)'}\n` +
        `      se escribirá     : ${corta(d.valor)}`,
    );
}

console.log('\n═══ ADVERTENCIAS ═══');
aviso(
  '#452 "Falsedad": el 08-ago se autorizó la consignación de Mario Gómez sobre este ítem ' +
    'siendo "Gemas Pedagógicas Laboratorio (Marketing)", 4,32 ct, cant 4, a $20.000 (pieza 3 de 13). ' +
    'Por decisión de Kevin (12-ago) sólo cambia el nombre: las 4 piezas se conservan y pasan a ' +
    'llamarse Falsedad. Queda por decidir si el catálogo vivo con QR muestra el nombre entregado ' +
    '("Esmeralda de Laboratorio") o el nuevo.',
);
aviso(
  '#93 conserva precioFinalCOP $1.574.300 y se queda sin unidades (cant 0). El precio de ' +
    '93A/93B se define aparte: hasta el 31-ago rige el remate (K × 1,3), no el costo × 2,6.',
);
const calidad452 = clean(rows[(filaDeItem.get('452') || 1) - 1]?.[COL.Calidad]);
if (calidad452 === 'F1')
  aviso(
    '#452 tiene Calidad "F1" en la hoja: es el dato inventado que metía ' +
      '`normalizeCalidadForSheet` cuando la calidad venía vacía. Este plan NO lo toca ' +
      '(no está en el payload), pero conviene vaciarlo — vacío se queda vacío.',
  );
aviso(
  `Los sublotes nuevos (${[...new Set(altas.map((a) => a.subLote))].join(', ')}) NO se registran en la ` +
    `pestaña ${TAB_SUBLOTES}: fuera del alcance de esta corrida (sólo se renombran C-042-G1 y C-042-G2).`,
);
avisos.forEach((a, i) => console.log(`   ${i + 1}. ${a}`));

if (abortar) {
  console.error(
    '\n❌ Hay condiciones que impiden escribir. No se aplica nada.\n',
  );
  process.exit(1);
}

if (!APPLY) {
  console.log(
    '\n\nDRY-RUN: no se escribió nada.\n' +
      'Para aplicar: node scripts/aplicar-inventario-manuscrito-20260812.mjs --apply\n',
  );
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────────────────
// A PARTIR DE ACÁ SE ESCRIBE
// ─────────────────────────────────────────────────────────────────────────
if (avisos.some((a) => a.includes('Manda la cabecera.')) && !ALLOW_COL_DRIFT) {
  console.error(
    '\n❌ Una cabecera se movió respecto de la columna que declara el payload. ' +
      'Revisá el aviso y volvé a correr con --allow-col-drift si es esperado.\n',
  );
  process.exit(1);
}

// ── Backup: filas completas antes de tocar nada ───────────────────────────
const ts = new Date().toISOString().replace(/[:.]/g, '-');
mkdirSync(new URL('./.backups/', import.meta.url), { recursive: true });
const backupPath = new URL(
  `./.backups/inventario-manuscrito-${ts}.json`,
  import.meta.url,
);
const filasTocadas = [...new Set(escrituras.map((e) => e.fila))].sort(
  (a, b) => a - b,
);
writeFileSync(
  backupPath,
  JSON.stringify(
    {
      proposito:
        'Estado PREVIO de todo lo que toca aplicar-inventario-manuscrito-20260812.mjs',
      spreadsheetId: SOT3,
      generado: new Date().toISOString(),
      cabeceras: headers,
      autofiltroPrevio: filtroActual,
      filasInventario: filasTocadas.map((f) => ({
        fila: f,
        itemId: clean(rows[f - 1]?.[COL_ITEM]),
        valores: rows[f - 1],
      })),
      filasSublotes: escriturasSub.map((e) => ({
        fila: e.fila,
        valores: subRows[e.fila - 1],
      })),
      altasCreadas: filasAlta.map((f) => ({ fila: f.fila, itemId: f.itemId })),
      escriturasPlaneadas: escrituras.map((e) => ({
        itemId: e.id,
        fila: e.fila,
        columna: e.col,
        campo: e.campo,
        actual: e.actual ?? '',
        nuevo: e.valor,
      })),
    },
    null,
    2,
  ),
);
console.log(`\nBackup → ${backupPath.pathname}`);

// ── 1. Autofiltro sobre todas las filas de datos, ANTES de escribir ───────
const setFiltro = async (endRowIndex) => {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SOT3,
    requestBody: {
      requests: [
        {
          setBasicFilter: {
            filter: {
              range: {
                sheetId: GID_INVENTARIO,
                startRowIndex: 0,
                endRowIndex,
                startColumnIndex: 0,
                endColumnIndex: FILTRO_COL_FIN,
              },
            },
          },
        },
      ],
    },
  });
  console.log(
    `  autofiltro → A1:${colLetter(FILTRO_COL_FIN - 1)}${endRowIndex}`,
  );
};
await setFiltro(ultimaFilaDatos);

// ── 2. Updates del Inventario, celda por celda ───────────────────────────
const valorParaHoja = (e) =>
  CAMPOS_NUMERICOS.has(e.campo) && esNumerico(e.valor)
    ? aNumero(e.valor)
    : e.valor;
const CHUNK = 80;
for (let i = 0; i < escrituras.length; i += CHUNK) {
  const slice = escrituras.slice(i, i + CHUNK);
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SOT3,
    requestBody: {
      valueInputOption: 'RAW',
      data: slice.map((e) => ({
        range: `'${TAB}'!${e.col}${e.fila}`,
        values: [[valorParaHoja(e)]],
      })),
    },
  });
  console.log(
    `  ${TAB}: ${Math.min(i + CHUNK, escrituras.length)}/${escrituras.length} celdas`,
  );
}

// ── 3. Sublotes ──────────────────────────────────────────────────────────
if (escriturasSub.length) {
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SOT3,
    requestBody: {
      valueInputOption: 'RAW',
      data: escriturasSub.map((e) => ({
        range: `'${TAB_SUBLOTES}'!${e.col}${e.fila}`,
        values: [[e.valor]],
      })),
    },
  });
  console.log(`  ${TAB_SUBLOTES}: ${escriturasSub.length} celdas`);
}

// ── 4. Altas en rangos explícitos ────────────────────────────────────────
// values.append busca los bordes de la "tabla" y el 03-ago metió el itemId en
// AT en vez de A, dejando 21 filas basura. Acá se escribe A<fila>:<fin><fila>.
const filasFaltantes =
  primeraFilaAlta +
  altas.length -
  1 -
  hojaInv.properties.gridProperties.rowCount;
if (filasFaltantes > 0) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SOT3,
    requestBody: {
      requests: [
        {
          appendDimension: {
            sheetId: GID_INVENTARIO,
            dimension: 'ROWS',
            length: filasFaltantes,
          },
        },
      ],
    },
  });
  console.log(`  grid: +${filasFaltantes} filas`);
}
await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SOT3,
  requestBody: {
    valueInputOption: 'RAW',
    data: filasAlta.map((f) => ({
      range: `'${TAB}'!A${f.fila}:${colLetter(f.valores.length - 1)}${f.fila}`,
      values: [f.valores],
    })),
  },
});
console.log(`  ${TAB}: ${filasAlta.length} filas nuevas`);

// ── 5. El filtro vuelve a cubrir todo, ahora con las altas dentro ────────
await setFiltro(ultimaFilaDatos + altas.length);

// ── 6. Verificación: releer y localizar por cabecera ─────────────────────
// `syncStatus: 'synced'` no prueba aterrizaje — el criterio quedó escrito en
// CLAUDE.md después del 03-ago.
const verif = await sheets.spreadsheets.values.get({
  spreadsheetId: SOT3,
  range: `'${TAB}'!A1:CX600`,
  valueRenderOption: 'UNFORMATTED_VALUE',
});
const rows2 = verif.data.values || [];
const headers2 = rows2[0] || [];
const desalineada = Object.entries(CAMPO_A_CABECERA).find(
  ([campo, cab]) => normHeader(headers2[COL[campo]]) !== normHeader(cab),
);
if (desalineada)
  console.error(
    `\n❌ Las cabeceras se movieron durante la corrida (${desalineada[1]}). Verificá a mano.`,
  );

const filaDeItem2 = new Map();
for (let r = 1; r < rows2.length; r++) {
  const id = clean(rows2[r]?.[COL_ITEM]);
  if (id && !filaDeItem2.has(id)) filaDeItem2.set(id, r + 1);
}
let fallas = 0;
for (const e of escrituras) {
  const f = filaDeItem2.get(e.id);
  const leido = f ? rows2[f - 1]?.[e.colIdx] : undefined;
  if (!mismoValor(leido, e.valor)) {
    fallas++;
    console.error(
      `  ✗ item ${e.id} ${e.col} ${e.campo}: esperaba "${corta(e.valor)}" y leí "${corta(leido)}"`,
    );
  }
}
for (const a of altas) {
  const f = filaDeItem2.get(clean(a.itemId));
  if (!f) {
    fallas++;
    console.error(`  ✗ alta ${a.itemId}: no aparece al releer.`);
    continue;
  }
  if (!mismoValor(rows2[f - 1]?.[COL.costoBaseCOP], a.costoBaseCOP)) {
    fallas++;
    console.error(`  ✗ alta ${a.itemId}: costoBaseCOP no aterrizó.`);
  }
}
const totalFilas = [...filaDeItem2.keys()].length;
console.log(
  `\n── Verificación (releyendo y ubicando por cabecera) ──\n` +
    `   escrituras verificadas : ${escrituras.length - fallas}/${escrituras.length}\n` +
    `   altas verificadas      : ${altas.filter((a) => filaDeItem2.has(clean(a.itemId))).length}/${altas.length}\n` +
    `   ítems en la hoja       : ${filasDeDatos} → ${totalFilas} (esperado ${filasDeDatos + altas.length})`,
);
if (fallas) {
  console.error(
    `\n❌ ${fallas} escritura(s) no aterrizaron. Revisar con el backup.\n`,
  );
  process.exit(1);
}

console.log(
  '\n✅ Listo.\n' +
    '   1. En la hoja: menú «🔄 Convex Sync → Sincronizar todo (completo)».\n' +
    '      El trigger onEdit es simple y NO dispara con escrituras por API.\n' +
    '   2. Confirmar en Convex: inventoryStats.total = ' +
    `${filasDeDatos + altas.length} y que #93, #501 y #504 quedan fuera de publishedCatalog.\n` +
    '   3. Las sumas ya se verificaron acá: 93A+93B = $469.120 · 501-A+B+C = $91.875 · 504-A+B = $30.625.\n',
);
