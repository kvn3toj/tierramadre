/**
 * Ítems remanentes de la hoja "Inventario 12 Agosto" → SOT v3.
 *
 * FUENTE: scripts/.data/remanentes-12ago.json (13 altas + 40 updates
 * clasificados + 6 bloqueados + prerrequisitos). El payload es la fuente —
 * acá no se transcribe nada a mano. Cuarta corrida sobre el SOT v3; hermana
 * de `aplicar-inventario-manuscrito-20260812.mjs` y
 * `aplicar-addendum-inventario-20260812.mjs`.
 *
 * QUÉ HACE, EN ORDEN (el orden importa):
 *   1. Listas: agrega a la columna "corte" los cortes del papel que falten
 *      en el vocabulario (el payload declara Octogonal, Trapecio y Esfera;
 *      se agregan SOLO los que de verdad falten hoy — Trapecio ya estaba el
 *      15-ago). Va ANTES que Inventario: si no, la validación marca en rojo.
 *   2. Lotes: crea C-090 para las 11 gemas Verde Muzo, con el patrón de los
 *      lotes "Recuperado" (C-070/C-074): estado abierto, sin proveedor ni
 *      costo, nota explicando qué falta. renombreLote queda VACÍO: el payload
 *      dice "(por definir)" y un placeholder visible en la app no es un dato.
 *   3. Altas #542–#554, en rangos explícitos — nunca values.append —
 *      ubicando cada columna por cabecera. Nacen DISPONIBLE, cant 1,
 *      OFI.CALI, preponderancia 0 y SIN costo ni precio: vacío es un hecho,
 *      no un hueco. No ofertables hasta costear.
 *   4. Updates: SOLO los de clase "SEGURO*". Los 20 con ⚠ (regresiones de
 *      medidas, reclasificaciones de calidad, saltos de peso) NO se escriben
 *      nunca desde este script: se listan para el visto bueno y punto.
 *      Los 6 bloqueados no se tocan bajo ninguna circunstancia.
 *
 * REGLAS QUE NO SE NEGOCIAN (el script aborta o salta si se violan):
 *   · I "Medidas" es la medida buena; J "Medidas (valores)" está EN DESUSO y
 *     no se escribe nunca.
 *   · Y "mostrarEnCatalogo" es propiedad de Convex, no de la hoja. No se
 *     toca: en las altas queda VACÍA aunque el payload declare FALSE (el
 *     FALSE lo estampa la migración de Convex, no este script).
 *   · AA "observacion" se ANEXA, no se reemplaza.
 *   · Vacío no es un dato: jamás se escribe "" sobre una celda con contenido,
 *     y jamás se inventa un costo, un precio ni un nombre de lote.
 *   · Todo se localiza por cabecera nombrada y por clave (itemId / loteId),
 *     nunca por índice fijo ni por conteo de filas.
 *
 * EVIDENCIA QUE SE VERIFICA ANTES DE ESCRIBIR: las dos Chivor (#542, #543)
 * van a C-070 porque las otras cinco Chivor del mismo papel (#309–#313) son
 * de C-070. El script lo comprueba contra la hoja y aborta si no es así.
 *
 * ⚠️ LO QUE ESTE SCRIPT **NO** PUEDE HACER — escribir la hoja NO alcanza:
 *   Las altas NO llegan a Convex por el sync: convex/fotoSync.ts salta toda
 *   fila nueva de 'inventory' («fila nueva en la hoja — créala desde la
 *   app»). Hace falta la migración hermana en Convex para que
 *   inventoryStats.total pase de 532 a 545. Lo mismo para que C-090 exista
 *   en la tabla lots de Convex.
 *
 * DESPUÉS DE APLICAR: correr en la hoja el menú «🔄 Convex Sync →
 * Sincronizar todo (completo)». El trigger onEdit es SIMPLE y no dispara
 * por API.
 *
 * Uso:  node scripts/aplicar-remanentes-12ago.mjs           # dry-run
 *       node scripts/aplicar-remanentes-12ago.mjs --apply
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
const TAB_INV = 'Inventario';
const TAB_LOTES = 'Lotes';
const TAB_LISTAS = 'Listas';
const GID_INVENTARIO = 1819792669;
const GID_LOTES = 1279400420;
const GID_LISTAS = 360573913;

const PAYLOAD = JSON.parse(
  readFileSync(
    new URL('./.data/remanentes-12ago.json', import.meta.url),
    'utf8',
  ),
);

// ─── Clasificación del payload ────────────────────────────────────────────
const esSeguro = (u) => /^SEGURO/.test(u.clase || '');
const UPDATES_SEGUROS = PAYLOAD.updates.filter(esSeguro);
const UPDATES_DUDOSOS = PAYLOAD.updates.filter((u) => !esSeguro(u));
const BLOQUEADOS = PAYLOAD.bloqueados;
const ALTAS = PAYLOAD.altas;
const IDS_BLOQUEADOS = new Set(BLOQUEADOS.map((b) => String(b.itemId)));

// ─── Cabeceras ────────────────────────────────────────────────────────────
/** `campo` del payload → nombre EXACTO de la cabecera en la fila 1. */
const CAMPO_A_CABECERA = {
  Nombre: 'Nombre',
  'Peso (ct)': 'Peso (ct)',
  Color: 'Color',
  Calidad: 'Calidad',
  Corte: 'Corte',
  Medidas: 'Medidas',
  observacion: 'observacion',
};
/** Columnas que este script no escribe jamás, aunque el payload lo pidiera. */
const CABECERAS_PROHIBIDAS = ['Medidas (valores)', 'mostrarEnCatalogo'];
/** Cabeceras que reciben valor en las filas nuevas (altas). */
const ALTA_A_CABECERA = {
  itemId: 'Item',
  nombre: 'Nombre',
  pesoCt: 'Peso (ct)',
  color: 'Color',
  calidad: 'Calidad',
  cantidad: 'Cant.',
  corte: 'Corte',
  medidas: 'Medidas',
  categoria: 'Categoría',
  ubicacion: 'UBICACIÓN',
  estado: 'ESTADO',
  qr: 'QR',
  preponderancia: 'preponderancia',
  loteId: 'loteId',
  observacion: 'observacion',
};
/** Columnas con lista desplegable: un valor fuera de la lista queda en rojo. */
const CAMPO_A_LISTA = { Color: 'color', Calidad: 'calidad', Corte: 'corte' };
/** Se guardan como número, no como texto. */
const CAMPOS_NUMERICOS = new Set(['Peso (ct)', 'Cant.', 'preponderancia']);

/** Cabeceras de Lotes que recibe la fila de C-090. El resto queda vacío. */
const LOTE_A_CABECERA = {
  loteId: 'loteId',
  pesoTotalQuilates: 'pesoTotalQuilates',
  unidadesDeclaradas: 'unidadesDeclaradas',
  notas: 'notas',
  estado: 'estado',
  mina: 'mina',
};

// ─── Utilidades ───────────────────────────────────────────────────────────
const clean = (v) =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim();
const normHeader = (v) => clean(v).toLowerCase();
const esNumerico = (v) => /^-?[\d.,]+$/.test(clean(v)) && /\d/.test(clean(v));
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
const hojaDe = (titulo, gidEsperado) => {
  const h = meta.data.sheets.find((s) => s.properties.title === titulo);
  if (!h) {
    fatal(`No existe la pestaña "${titulo}".`);
    return null;
  }
  if (h.properties.sheetId !== gidEsperado)
    fatal(
      `gid inesperado para "${titulo}": ${h.properties.sheetId} (esperaba ${gidEsperado}).`,
    );
  return h;
};
const hojaInv = hojaDe(TAB_INV, GID_INVENTARIO);
const hojaLotes = hojaDe(TAB_LOTES, GID_LOTES);
hojaDe(TAB_LISTAS, GID_LISTAS);
if (!hojaInv || !hojaLotes) process.exit(1);
if (PAYLOAD.meta?.sot && !PAYLOAD.meta.sot.includes(SOT3))
  fatal(
    `El payload no apunta a este spreadsheet como destino: ${PAYLOAD.meta.sot}`,
  );

const [invRes, listasRes, lotesRes] = await Promise.all([
  sheets.spreadsheets.values.get({
    spreadsheetId: SOT3,
    range: `'${TAB_INV}'!A1:CX600`,
    valueRenderOption: 'UNFORMATTED_VALUE',
  }),
  sheets.spreadsheets.values.get({
    spreadsheetId: SOT3,
    range: `'${TAB_LISTAS}'!A1:H80`,
  }),
  sheets.spreadsheets.values.get({
    spreadsheetId: SOT3,
    range: `'${TAB_LOTES}'!A1:Z300`,
    valueRenderOption: 'UNFORMATTED_VALUE',
  }),
]);

const rows = invRes.data.values || [];
const headers = rows[0] || [];
const listasRows = listasRes.data.values || [];
const listasHeaders = listasRows[0] || [];
const lotesRows = lotesRes.data.values || [];
const lotesHeaders = lotesRows[0] || [];

/** Cabecera → índice 0-based, exigiendo coincidencia única. */
const idxUnico = (cabeceras, nombre, hoja) => {
  const objetivo = normHeader(nombre);
  const hits = cabeceras
    .map((h, i) => (normHeader(h) === objetivo ? i : -1))
    .filter((i) => i >= 0);
  if (hits.length !== 1) {
    fatal(
      `Cabecera "${nombre}" en ${hoja}: ${hits.length} coincidencias. Aborto por seguridad.`,
    );
    return -1;
  }
  return hits[0];
};
const idxDeCabecera = (nombre) => idxUnico(headers, nombre, TAB_INV);

const COL = {};
for (const [campo, cabecera] of Object.entries(CAMPO_A_CABECERA))
  COL[campo] = idxDeCabecera(cabecera);
const COL_ITEM = idxDeCabecera('Item');
const COL_LOTEID = idxDeCabecera('loteId');
const COL_COSTO = idxDeCabecera('costoBaseCOP');
const COL_PRECIO = idxDeCabecera('precioFinalCOP');
const COL_PRODUCTO_URL = idxDeCabecera('Producto (URL)');
const COL_ALTA = Object.fromEntries(
  Object.entries(ALTA_A_CABECERA).map(([k, h]) => [k, idxDeCabecera(h)]),
);
const IDX_PROHIBIDOS = new Set(
  CABECERAS_PROHIBIDAS.map((h) => idxDeCabecera(h)).filter((i) => i >= 0),
);
const COL_LOTE = Object.fromEntries(
  Object.entries(LOTE_A_CABECERA).map(([k, h]) => [
    k,
    idxUnico(lotesHeaders, h, TAB_LOTES),
  ]),
);
const COL_LOTE_RENOMBRE = idxUnico(lotesHeaders, 'renombreLote', TAB_LOTES);
const COL_LISTA_CORTE = idxUnico(listasHeaders, 'corte', TAB_LISTAS);

console.log(`\n╔═══ Remanentes "Inventario 12 Agosto" → SOT v3 ═══`);
console.log(
  `║ ${APPLY ? '⚠️  MODO --apply (ESCRIBE)' : 'DRY-RUN (no escribe nada)'}`,
);
console.log(`╚═══════════════════════════════════════════════════\n`);

console.log('── Columnas resueltas por cabecera (Inventario) ──');
for (const [campo, i] of Object.entries(COL))
  console.log(
    `   ${colLetter(i).padStart(2)} (${String(i).padStart(2)})  "${headers[i]}"  ← campo "${campo}"`,
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
    `grid ${hojaInv.properties.gridProperties.rowCount}×${hojaInv.properties.gridProperties.columnCount} ──`,
);
if (duplicados.length)
  fatal(`itemIds duplicados en la hoja: ${duplicados.join(', ')}`);
if (filasDeDatos !== 532)
  aviso(
    `El payload se generó contra 532 ítems y la hoja tiene ${filasDeDatos}. ` +
      `Revisar que nadie más esté escribiendo.`,
  );

// ─── PASO 1 · Listas: cortes faltantes ────────────────────────────────────
console.log('\n═══ PASO 1 · Vocabulario de cortes (Listas) ═══');
const cortesHoy = new Set(
  listasRows
    .slice(1)
    .map((r) => clean(r?.[COL_LISTA_CORTE]))
    .filter(Boolean),
);
const cortesPedidos = PAYLOAD.prerequisitos.listas_cortes;
const cortesFaltantes = cortesPedidos.filter((c) => !cortesHoy.has(c));
const cortesYaPresentes = cortesPedidos.filter((c) => cortesHoy.has(c));
console.log(
  `   vocabulario hoy: ${cortesHoy.size} cortes en Listas!${colLetter(COL_LISTA_CORTE)}`,
);
if (cortesYaPresentes.length)
  console.log(
    `   ya presentes (nada que hacer): ${cortesYaPresentes.join(', ')}` +
      ` — el payload los daba por faltantes; alguien los agregó después del 12-ago.`,
  );
let primeraFilaListaLibre = 2;
for (let r = 1; r < Math.max(listasRows.length, 2) + 50; r++) {
  if (clean(listasRows[r]?.[COL_LISTA_CORTE])) primeraFilaListaLibre = r + 2;
}
console.log(
  cortesFaltantes.length
    ? `   a agregar: ${cortesFaltantes.join(', ')} → Listas!${colLetter(COL_LISTA_CORTE)}${primeraFilaListaLibre}:${colLetter(COL_LISTA_CORTE)}${primeraFilaListaLibre + cortesFaltantes.length - 1}`
    : '   ✓ no falta ninguno.',
);
// Los cortes que las altas y updates usan tienen que quedar cubiertos.
const cortesTrasPaso1 = new Set([...cortesHoy, ...cortesFaltantes]);
for (const a of ALTAS)
  if (!cortesTrasPaso1.has(clean(a.corte)))
    fatal(
      `Alta #${a.itemId}: corte "${a.corte}" no estará en el vocabulario ni tras el Paso 1.`,
    );

// ─── PASO 2 · Lote C-090 ──────────────────────────────────────────────────
console.log('\n═══ PASO 2 · Lote C-090 (patrón "Recuperado") ═══');
const loteNuevo = PAYLOAD.prerequisitos.lotes_a_crear[0];
const filaDeLote = new Map();
let ultimaFilaLotes = 1;
for (let r = 1; r < lotesRows.length; r++) {
  const id = clean(lotesRows[r]?.[COL_LOTE.loteId]);
  if (!id) continue;
  ultimaFilaLotes = r + 1;
  if (!filaDeLote.has(id)) filaDeLote.set(id, r + 1);
}
console.log(
  `   Lotes hoy: ${filaDeLote.size} lotes (última fila: f${ultimaFilaLotes}).`,
);
if (filaDeLote.has(loteNuevo.loteId))
  fatal(
    `El lote ${loteNuevo.loteId} YA existe en Lotes (f${filaDeLote.get(loteNuevo.loteId)}). ` +
      `Correr esto de nuevo lo duplicaría.`,
  );
for (const ref of ['C-070', 'C-074'])
  if (!filaDeLote.has(ref))
    fatal(`No encuentro el lote de referencia ${ref} en Lotes.`);
const maxLoteC = Math.max(
  ...[...filaDeLote.keys()]
    .map((k) => (k.match(/^C-(\d+)$/) || [])[1])
    .filter(Boolean)
    .map(Number),
);
if (`C-${String(maxLoteC + 1).padStart(3, '0')}` !== loteNuevo.loteId)
  fatal(
    `${loteNuevo.loteId} no es el siguiente lote C libre: el último en la hoja es C-${String(maxLoteC).padStart(3, '0')}.`,
  );
else
  console.log(
    `   ✓ ${loteNuevo.loteId} es el siguiente libre (último: C-${String(maxLoteC).padStart(3, '0')}).`,
  );

const filaLoteNuevo = ultimaFilaLotes + 1;
const valoresLote = [];
for (const [campo, idx] of Object.entries(COL_LOTE))
  if (idx >= 0 && loteNuevo[campo] !== undefined)
    valoresLote[idx] = loteNuevo[campo];
// renombreLote: el payload trae "(por definir)". Un placeholder visible en la
// app no es un dato — queda vacío y se decide cuando el lote tenga nombre.
if (clean(loteNuevo.renombreLote) && loteNuevo.renombreLote !== '(por definir)')
  valoresLote[COL_LOTE_RENOMBRE] = loteNuevo.renombreLote;
else
  aviso(
    `C-090: renombreLote queda VACÍO (el payload dice "(por definir)" y eso es un placeholder, no un nombre).`,
  );
for (let i = 0; i < valoresLote.length; i++)
  if (valoresLote[i] === undefined) valoresLote[i] = '';
console.log(
  `   f${filaLoteNuevo}  ${loteNuevo.loteId} · estado ${loteNuevo.estado} · ${loteNuevo.unidadesDeclaradas} unidades · ${loteNuevo.pesoTotalQuilates} ct · mina ${loteNuevo.mina}`,
);
console.log(
  `   sin proveedor, sin costo, sin factura — igual que C-070/C-074.`,
);
console.log(`   notas: ${corta(loteNuevo.notas, 110)}`);

// Evidencia Chivor → C-070: las otras cinco Chivor del papel son de C-070.
console.log('\n   ── Evidencia: las 2 Chivor nuevas van a C-070 ──');
const testigosChivor = ['309', '310', '311', '312', '313'];
let evidenciaOk = true;
for (const id of testigosChivor) {
  const f = filaDeItem.get(id);
  const lote = f ? clean(rows[f - 1]?.[COL_LOTEID]) : '(no existe)';
  const ok = lote === 'C-070';
  if (!ok) evidenciaOk = false;
  console.log(
    `   #${id} "${clean(rows[f - 1]?.[COL.Nombre])}" → loteId ${lote} ${ok ? '✓' : '✗'}`,
  );
}
if (!evidenciaOk)
  fatal(
    'La evidencia Chivor→C-070 NO se sostiene contra la hoja. Las altas #542/#543 no tienen lote confirmado.',
  );
else
  console.log(
    '   ✓ los 5 testigos son de C-070 ("Intuición"). La inferencia se sostiene.',
  );

// ─── PASO 3 · Las 13 altas ────────────────────────────────────────────────
console.log('\n═══ PASO 3 · Altas #542–#554 ═══');
const altasExistentes = ALTAS.filter((a) => filaDeItem.has(clean(a.itemId)));
if (altasExistentes.length)
  fatal(
    `Altas que ya existen en la hoja: ${altasExistentes.map((a) => a.itemId).join(', ')}. ` +
      `Correr esto de nuevo duplicaría filas.`,
  );
const maxItemNum = Math.max(
  ...[...filaDeItem.keys()].map(Number).filter(Number.isFinite),
);
const altasEsperadas = ALTAS.map((_, i) => String(maxItemNum + 1 + i));
if (ALTAS.map((a) => clean(a.itemId)).join(',') !== altasEsperadas.join(','))
  fatal(
    `Los itemId de las altas (${ALTAS.map((a) => a.itemId).join(', ')}) no son los ` +
      `siguientes libres (${altasEsperadas.join(', ')}). El último itemId de la hoja es ${maxItemNum}.`,
  );
else
  console.log(
    `   ✓ #542–#554 son los siguientes libres (último en la hoja: #${maxItemNum}).`,
  );

const lotesValidosParaAltas = new Set([...filaDeLote.keys(), loteNuevo.loteId]);
const primeraFilaAlta = ultimaFilaDatos + 1;
const filasAlta = [];
const pesoC090 = ALTAS.filter((a) => a.loteId === 'C-090').reduce(
  (s, a) => s + Number(a.pesoCt),
  0,
);
ALTAS.forEach((a, n) => {
  const fila = primeraFilaAlta + n;
  if (!lotesValidosParaAltas.has(clean(a.loteId)))
    fatal(
      `Alta #${a.itemId}: loteId "${a.loteId}" no existe ni se crea en esta corrida.`,
    );
  if (a.costoBaseCOP !== null || a.precioFinalCOP !== null)
    fatal(
      `Alta #${a.itemId}: el payload trae costo/precio no nulos y esta corrida nace sin costear.`,
    );
  const valores = [];
  const set = (idx, v) => {
    if (idx >= 0 && v !== null && v !== undefined) valores[idx] = v;
  };
  for (const [campo, idx] of Object.entries(COL_ALTA)) {
    if (
      campo === 'pesoCt' ||
      campo === 'cantidad' ||
      campo === 'preponderancia'
    )
      set(idx, Number(a[campo]));
    else set(idx, a[campo]);
  }
  set(COL_PRODUCTO_URL, `https://tierramadre.app/product/${a.itemId}`);
  // L costo y M precio: VACÍOS a propósito. Y mostrarEnCatalogo: NO se toca
  // (el FALSE del payload lo estampa Convex, no la hoja).
  const ancho = valores.length;
  for (let i = 0; i < ancho; i++) if (valores[i] === undefined) valores[i] = '';

  console.log(
    `   f${fila}  #${String(a.itemId).padEnd(4)} "${a.nombre}"  ` +
      `${a.pesoCt} ct · ${a.medidas} · ${a.corte} · ${a.calidad} · ${a.color} · lote ${a.loteId}`,
  );
  filasAlta.push({ fila, itemId: a.itemId, valores });
});
const nAltasC070 = ALTAS.filter((a) => a.loteId === 'C-070').length;
const nAltasC090 = ALTAS.filter((a) => a.loteId === 'C-090').length;
console.log(
  `   → ${nAltasC090} al ${loteNuevo.loteId} (Σ ${pesoC090.toFixed(2)} ct vs ${loteNuevo.pesoTotalQuilates} declarados ` +
    `${Math.abs(pesoC090 - loteNuevo.pesoTotalQuilates) < 0.005 ? '✓' : '✗'}) · ${nAltasC070} Chivor a C-070`,
);
if (Math.abs(pesoC090 - loteNuevo.pesoTotalQuilates) >= 0.005)
  fatal(
    `Los quilates de las altas de C-090 (${pesoC090.toFixed(2)}) no suman el pesoTotalQuilates del lote (${loteNuevo.pesoTotalQuilates}).`,
  );
if (nAltasC090 !== loteNuevo.unidadesDeclaradas)
  fatal(
    `C-090 declara ${loteNuevo.unidadesDeclaradas} unidades pero las altas que apuntan a él son ${nAltasC090}.`,
  );
console.log(
  `   filas f${primeraFilaAlta}..f${primeraFilaAlta + ALTAS.length - 1} · total de la hoja: ${filasDeDatos} → ${filasDeDatos + ALTAS.length}`,
);
console.log(
  `   L costo y M precio: VACÍOS (la hoja de origen no trae costos — vacío es un hecho, no un hueco).`,
);
console.log(
  `   Y mostrarEnCatalogo: NO se escribe (propiedad de Convex). No ofertables hasta costear.`,
);
console.log(
  `   #547 Tiempo y #548 Semilla ya están montadas en anillo (pestaña Joyería): esta alta las ` +
    `habilita por la Regla B, los anillos NO van en esta corrida.`,
);

// ─── PASO 4 · Updates seguros (diff) ──────────────────────────────────────
console.log(
  `\n═══ PASO 4 · Updates: ${UPDATES_SEGUROS.length} seguros (los ⚠ NO van) ═══`,
);
const escrituras = [];
const omitidos = [];
const derivas = [];

const listaDe = (nombreCabecera) => {
  const idx = idxUnico(listasHeaders, nombreCabecera, TAB_LISTAS);
  return new Set(
    listasRows
      .slice(1)
      .map((r) => clean(r?.[idx]))
      .filter(Boolean),
  );
};
const LISTA_VALIDA = Object.fromEntries(
  Object.entries(CAMPO_A_LISTA).map(([campo, cab]) => [campo, listaDe(cab)]),
);
for (const c of cortesFaltantes) LISTA_VALIDA.Corte.add(c); // tras el Paso 1

for (const u of UPDATES_SEGUROS) {
  const id = clean(u.itemId);
  if (IDS_BLOQUEADOS.has(id)) {
    fatal(`El payload trae un update "seguro" para el ítem bloqueado #${id}.`);
    continue;
  }
  const fila = filaDeItem.get(id);
  if (!fila) {
    fatal(`itemId ${id} del payload NO existe en la hoja.`);
    continue;
  }
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
  if (u.col && u.col !== colLetter(colIdx))
    aviso(
      `Item ${id} campo "${u.campo}": el payload dice columna ${u.col} pero la ` +
        `cabecera vive en ${colLetter(colIdx)}. Manda la cabecera.`,
    );

  const actual = rows[fila - 1]?.[colIdx];
  let nuevo = u.valorNuevo;
  const rec = {
    id,
    fila,
    colIdx,
    col: colLetter(colIdx),
    campo: u.campo,
    nombre: u.nombreSOT,
    actual,
    valor: nuevo,
    clase: u.clase,
  };

  // Vacío no es un dato.
  if (clean(nuevo) === '') {
    omitidos.push({
      ...rec,
      motivo: 'valorNuevo vacío — no se vacía nada en esta corrida',
    });
    continue;
  }
  // AA observacion: se ANEXA.
  if (
    u.campo === 'observacion' &&
    u.modo === 'append' &&
    clean(actual) !== ''
  ) {
    nuevo = `${clean(actual)} | ${clean(u.valorNuevo)}`;
    rec.valor = nuevo;
    rec.anexado = true;
  }
  if (mismoValor(actual, nuevo)) {
    omitidos.push({ ...rec, motivo: 'la celda ya tiene ese valor' });
    continue;
  }
  // Deriva: la hoja no dice lo que el payload esperaba encontrar.
  if (
    u.valorActual !== null &&
    u.valorActual !== undefined &&
    u.modo !== 'append' &&
    !mismoValor(actual, u.valorActual)
  )
    derivas.push({ ...rec, esperado: u.valorActual });

  if (
    LISTA_VALIDA[u.campo] &&
    clean(nuevo) &&
    !LISTA_VALIDA[u.campo].has(clean(nuevo))
  )
    aviso(
      `Item ${id} · ${u.campo}: "${clean(nuevo)}" no está en la lista desplegable. ` +
        `La celda quedaría marcada como inválida.`,
    );

  escrituras.push(rec);
}

// El texto del renombre de #492 dice "Nombre anterior: 492" — el nombre
// anterior es "Lágrima", no el número. Se reporta, no se corrige en silencio.
for (const e of escrituras)
  if (
    e.campo === 'observacion' &&
    /Nombre anterior:\s*492\b/.test(String(e.valor))
  )
    aviso(
      `#492 · observacion: el payload dice "Nombre anterior: 492" pero el nombre anterior es ` +
        `"Lágrima". Probable error de generación del payload — confirmar el texto antes de --apply.`,
    );

console.log(
  `\n── Diff de los ${escrituras.length} updates seguros que SÍ se escriben ──\n`,
);
const GRUPOS = [
  ['Pesos (col D)', (e) => e.campo === 'Peso (ct)'],
  ['Medidas (col I)', (e) => e.campo === 'Medidas'],
  ['Colores (col E)', (e) => e.campo === 'Color'],
  ['Cortes (col H)', (e) => e.campo === 'Corte'],
  ['Renombres (col C)', (e) => e.campo === 'Nombre'],
  ['Observaciones (col AA — se anexa)', (e) => e.campo === 'observacion'],
];
for (const [titulo, test] of GRUPOS) {
  const lista = escrituras.filter(test);
  if (!lista.length) continue;
  console.log(`── ${titulo} (${lista.length}) ──`);
  for (const e of lista) {
    console.log(
      `   #${String(e.id).padEnd(4)} ${String(e.nombre).padEnd(20)} f${String(e.fila).padEnd(4)} ${e.col.padStart(2)}  ` +
        `${corta(e.actual, 34) || '(vacío)'}  →  ${corta(e.valor, 40)}   [${e.clase}]`,
    );
  }
  console.log('');
}

if (omitidos.length) {
  console.log(`── Seguros que NO se escriben (${omitidos.length}) ──`);
  for (const o of omitidos)
    console.log(
      `   #${String(o.id).padEnd(4)} ${o.col} ${o.campo}: ${o.motivo}\n` +
        `      actual : ${corta(o.actual) || '(vacío)'}\n      payload: ${corta(o.valor) || '(vacío)'}`,
    );
}
if (derivas.length) {
  console.log(
    `\n── ⚠️ Deriva: la hoja no dice lo que el payload esperaba (${derivas.length}) ──`,
  );
  for (const d of derivas)
    console.log(
      `   #${String(d.id).padEnd(4)} ${d.col} ${d.campo}\n` +
        `      payload esperaba : ${corta(d.esperado) || '(vacío)'}\n` +
        `      la hoja dice     : ${corta(d.actual) || '(vacío)'}\n` +
        `      se escribiría    : ${corta(d.valor) || '(vacío)'}`,
    );
}

// ─── Los 20 que NO van sin visto bueno ────────────────────────────────────
console.log(
  `\n═══ ⚠️ ${UPDATES_DUDOSOS.length} updates que NO van sin visto bueno (este script NUNCA los escribe) ═══\n`,
);
const RAZONES = [
  [
    'REGRESIÓN de medidas (el SOT tiene 3 ejes, el papel 2 — se perdería la profundidad)',
    /REGRESIÓN/,
  ],
  [
    'Cambio de calidad (mueve CALIDAD_FACTORS y con él el precio sugerido)',
    /factor de precio/,
  ],
  ['Salto de peso grande', /Δ grande/],
];
for (const [titulo, re] of RAZONES) {
  const lista = UPDATES_DUDOSOS.filter((u) => re.test(u.clase));
  if (!lista.length) continue;
  console.log(`── ${titulo} (${lista.length}) ──`);
  for (const u of lista) {
    const f = filaDeItem.get(clean(u.itemId));
    const enHoja = f ? rows[f - 1]?.[COL[u.campo]] : undefined;
    const notaDeriva = mismoValor(enHoja, u.valorActual)
      ? ''
      : `   ⚠ hoy la hoja dice "${corta(enHoja, 30)}"`;
    console.log(
      `   #${String(u.itemId).padEnd(4)} ${String(u.nombreSOT).padEnd(20)} ${u.col} ${u.campo}: ` +
        `${corta(u.valorActual, 32) || '(vacío)'}  →  ${corta(u.valorNuevo, 32)}${notaDeriva}`,
    );
  }
  console.log('');
}

// ─── Las 6 filas bloqueadas ───────────────────────────────────────────────
console.log(`═══ ⛔ ${BLOQUEADOS.length} filas bloqueadas — no se tocan ═══\n`);
for (const b of BLOQUEADOS) {
  const f = filaDeItem.get(String(b.itemId));
  const nombre = f ? clean(rows[f - 1]?.[COL.Nombre]) : '(no está en la hoja)';
  const estado = f ? clean(rows[f - 1]?.[idxDeCabecera('ESTADO')]) : '';
  console.log(
    `   papel f${String(b.fila).padEnd(3)} → #${String(b.itemId).padEnd(4)} "${nombre}" ${estado ? `[${estado}] ` : ''}· ${b.motivo}`,
  );
}

// ─── Autofiltro ───────────────────────────────────────────────────────────
const filtroActual = hojaInv.basicFilter?.range;
const filtroFinActual = filtroActual?.endRowIndex ?? 0;
const filtroColFin = filtroActual?.endColumnIndex ?? 57;
console.log(
  `\n── Autofiltro: filas 1..${filtroFinActual} → 1..${ultimaFilaDatos + ALTAS.length} (columnas 1..${filtroColFin}, se conservan) ──`,
);

// ─── Resumen ──────────────────────────────────────────────────────────────
console.log('\n═══ RESUMEN ═══');
console.log(
  `   Paso 1 · Listas: +${cortesFaltantes.length} cortes (${cortesFaltantes.join(', ') || 'ninguno'})`,
);
console.log(`   Paso 2 · Lotes: +1 (${loteNuevo.loteId} en f${filaLoteNuevo})`);
console.log(
  `   Paso 3 · Altas: ${filasAlta.length} filas (#542–#554) · hoja ${filasDeDatos} → ${filasDeDatos + ALTAS.length}`,
);
console.log(
  `   Paso 4 · Updates seguros: ${escrituras.length} celdas (${omitidos.length} omitidos)`,
);
console.log(
  `   En espera de visto bueno: ${UPDATES_DUDOSOS.length} · Bloqueados: ${BLOQUEADOS.length}`,
);

console.log(
  '\n═══ LO QUE ESTA CORRIDA **NO** RESUELVE (hace falta Convex) ═══',
);
console.log(
  `   1. Las 13 altas NO llegan a Convex por el sync: convex/fotoSync.ts salta toda fila\n` +
    `      nueva de 'inventory' («fila nueva en la hoja — créala desde la app»).\n` +
    `      → inventoryStats.total se queda en ${filasDeDatos}; para llegar a ${filasDeDatos + ALTAS.length} hace falta la\n` +
    `      migración hermana (patrón migrations.seedManuscrito20260812).\n` +
    `   2. C-090 en la tabla lots de Convex: mismo camino, migración o alta desde la app.\n` +
    `   3. mostrarEnCatalogo=false de las 13: lo estampa Convex, no la hoja.`,
);

if (avisos.length) {
  console.log('\n═══ ADVERTENCIAS ═══');
  avisos.forEach((a, i) => console.log(`   ${i + 1}. ${a}`));
}

if (abortar) {
  console.error(
    '\n❌ Hay condiciones que impiden escribir. No se aplica nada.\n',
  );
  process.exit(1);
}

if (!APPLY) {
  console.log(
    '\n\nDRY-RUN: no se escribió nada.\n' +
      'Para aplicar: node scripts/aplicar-remanentes-12ago.mjs --apply\n',
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

// ── Backup: estado previo de todo lo que se toca ──────────────────────────
const ts = new Date().toISOString().replace(/[:.]/g, '-');
mkdirSync(new URL('./.backups/', import.meta.url), { recursive: true });
const backupPath = new URL(
  `./.backups/remanentes-12ago-${ts}.json`,
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
        'Estado PREVIO de todo lo que toca aplicar-remanentes-12ago.mjs',
      spreadsheetId: SOT3,
      generado: new Date().toISOString(),
      cabecerasInventario: headers,
      autofiltroPrevio: filtroActual,
      listasCortesPrevio: [...cortesHoy],
      lotesCabeceras: lotesHeaders,
      ultimaFilaLotesPrevia: ultimaFilaLotes,
      filasInventario: filasTocadas.map((f) => ({
        fila: f,
        itemId: clean(rows[f - 1]?.[COL_ITEM]),
        valores: rows[f - 1],
      })),
      altasCreadas: filasAlta.map((f) => ({ fila: f.fila, itemId: f.itemId })),
      loteCreado: { fila: filaLoteNuevo, loteId: loteNuevo.loteId },
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

// ── Paso 1: Listas ────────────────────────────────────────────────────────
if (cortesFaltantes.length) {
  const colL = colLetter(COL_LISTA_CORTE);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SOT3,
    range: `'${TAB_LISTAS}'!${colL}${primeraFilaListaLibre}:${colL}${primeraFilaListaLibre + cortesFaltantes.length - 1}`,
    valueInputOption: 'RAW',
    requestBody: { values: cortesFaltantes.map((c) => [c]) },
  });
  console.log(`  ${TAB_LISTAS}: +${cortesFaltantes.length} cortes`);
}

// ── Paso 2: Lotes ─────────────────────────────────────────────────────────
await sheets.spreadsheets.values.update({
  spreadsheetId: SOT3,
  range: `'${TAB_LOTES}'!A${filaLoteNuevo}:${colLetter(Math.max(valoresLote.length, lotesHeaders.length) - 1)}${filaLoteNuevo}`,
  valueInputOption: 'RAW',
  requestBody: { values: [valoresLote] },
});
console.log(`  ${TAB_LOTES}: ${loteNuevo.loteId} en f${filaLoteNuevo}`);

// ── Paso 3: altas en rangos explícitos ────────────────────────────────────
const filasFaltantes =
  primeraFilaAlta +
  ALTAS.length -
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
  console.log(`  grid ${TAB_INV}: +${filasFaltantes} filas`);
}
await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SOT3,
  requestBody: {
    valueInputOption: 'RAW',
    data: filasAlta.map((f) => ({
      range: `'${TAB_INV}'!A${f.fila}:${colLetter(f.valores.length - 1)}${f.fila}`,
      values: [f.valores],
    })),
  },
});
console.log(`  ${TAB_INV}: ${filasAlta.length} filas nuevas`);

// ── Paso 4: updates, celda por celda ──────────────────────────────────────
const valorParaHoja = (e) =>
  CAMPOS_NUMERICOS.has(e.campo) && esNumerico(e.valor)
    ? aNumero(e.valor)
    : e.valor;
if (escrituras.length) {
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SOT3,
    requestBody: {
      valueInputOption: 'RAW',
      data: escrituras.map((e) => ({
        range: `'${TAB_INV}'!${e.col}${e.fila}`,
        values: [[valorParaHoja(e)]],
      })),
    },
  });
  console.log(`  ${TAB_INV}: ${escrituras.length} celdas actualizadas`);
}

// ── Autofiltro cubre las filas nuevas ─────────────────────────────────────
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
              endRowIndex: ultimaFilaDatos + ALTAS.length,
              startColumnIndex: 0,
              endColumnIndex: filtroColFin,
            },
          },
        },
      },
    ],
  },
});
console.log(
  `  autofiltro → A1:${colLetter(filtroColFin - 1)}${ultimaFilaDatos + ALTAS.length}`,
);

// ── Verificación: releer y localizar por cabecera ─────────────────────────
// `syncStatus: 'synced'` no prueba aterrizaje — se relee TODO.
const [verifInv, verifListas, verifLotes] = await Promise.all([
  sheets.spreadsheets.values.get({
    spreadsheetId: SOT3,
    range: `'${TAB_INV}'!A1:CX600`,
    valueRenderOption: 'UNFORMATTED_VALUE',
  }),
  sheets.spreadsheets.values.get({
    spreadsheetId: SOT3,
    range: `'${TAB_LISTAS}'!A1:H80`,
  }),
  sheets.spreadsheets.values.get({
    spreadsheetId: SOT3,
    range: `'${TAB_LOTES}'!A1:Z300`,
    valueRenderOption: 'UNFORMATTED_VALUE',
  }),
]);
const rows2 = verifInv.data.values || [];
const headers2 = rows2[0] || [];
let fallas = 0;
const desalineada = Object.entries(CAMPO_A_CABECERA).find(
  ([campo, cab]) => normHeader(headers2[COL[campo]]) !== normHeader(cab),
);
if (desalineada) {
  fallas++;
  console.error(
    `  ✗ las cabeceras se movieron durante la corrida (${desalineada[1]}).`,
  );
}
const filaDeItem2 = new Map();
for (let r = 1; r < rows2.length; r++) {
  const id = clean(rows2[r]?.[COL_ITEM]);
  if (id && !filaDeItem2.has(id)) filaDeItem2.set(id, r + 1);
}
for (const e of escrituras) {
  const f = filaDeItem2.get(e.id);
  const leido = f ? rows2[f - 1]?.[e.colIdx] : undefined;
  if (!mismoValor(leido, e.valor)) {
    fallas++;
    console.error(
      `  ✗ #${e.id} ${e.col} ${e.campo}: esperaba "${corta(e.valor)}" y leí "${corta(leido)}"`,
    );
  }
}
for (const a of ALTAS) {
  const f = filaDeItem2.get(clean(a.itemId));
  if (!f) {
    fallas++;
    console.error(`  ✗ alta #${a.itemId}: no aparece al releer.`);
    continue;
  }
  for (const [campo, idx] of [
    ['nombre', COL.Nombre],
    ['loteId', COL_LOTEID],
  ]) {
    if (!mismoValor(rows2[f - 1]?.[idx], a[campo])) {
      fallas++;
      console.error(`  ✗ alta #${a.itemId}: ${campo} no aterrizó.`);
    }
  }
  for (const [etiqueta, idx] of [
    ['costoBaseCOP', COL_COSTO],
    ['precioFinalCOP', COL_PRECIO],
  ])
    if (clean(rows2[f - 1]?.[idx]) !== '') {
      fallas++;
      console.error(
        `  ✗ alta #${a.itemId}: ${etiqueta} debía quedar VACÍO y tiene valor.`,
      );
    }
}
const cortes2 = new Set(
  (verifListas.data.values || [])
    .slice(1)
    .map((r) => clean(r?.[COL_LISTA_CORTE]))
    .filter(Boolean),
);
for (const c of cortesPedidos)
  if (!cortes2.has(c)) {
    fallas++;
    console.error(`  ✗ Listas: el corte "${c}" no aparece al releer.`);
  }
const lotes2 = (verifLotes.data.values || [])
  .slice(1)
  .map((r) => clean(r?.[COL_LOTE.loteId]));
if (!lotes2.includes(loteNuevo.loteId)) {
  fallas++;
  console.error(`  ✗ Lotes: ${loteNuevo.loteId} no aparece al releer.`);
}
const totalItems = filaDeItem2.size;
console.log(
  `\n── Verificación (releyendo y ubicando por cabecera) ──\n` +
    `   updates verificados : ${escrituras.length}\n` +
    `   altas verificadas   : ${ALTAS.filter((a) => filaDeItem2.has(clean(a.itemId))).length}/${ALTAS.length}\n` +
    `   ítems en la hoja    : ${filasDeDatos} → ${totalItems} (esperado ${filasDeDatos + ALTAS.length})\n` +
    `   C-090 en Lotes      : ${lotes2.includes(loteNuevo.loteId) ? '✓' : '✗'}\n` +
    `   cortes en Listas    : ${cortesPedidos.filter((c) => cortes2.has(c)).length}/${cortesPedidos.length}`,
);
if (totalItems !== filasDeDatos + ALTAS.length) {
  fallas++;
  console.error(`  ✗ el conteo de ítems no cierra.`);
}
if (fallas) {
  console.error(
    `\n❌ ${fallas} escritura(s) no aterrizaron. Revisar con el backup.\n`,
  );
  process.exit(1);
}

console.log(
  '\n✅ La hoja quedó lista. FALTA LA MITAD EN CONVEX:\n' +
    '   1. En la hoja: menú «🔄 Convex Sync → Sincronizar todo (completo)».\n' +
    '      Aterriza los updates. Las 13 altas NO — fotoSync las salta.\n' +
    '   2. Migración hermana en Convex: crea #542–#554 y C-090, estampa\n' +
    `      mostrarEnCatalogo=false. Recién ahí inventoryStats.total ${filasDeDatos} → ${filasDeDatos + ALTAS.length}.\n` +
    '   3. Las 13 nuevas quedan sin costo: verificar que NO aparecen como ofertables.\n',
);
