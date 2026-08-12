/**
 * Addendum al inventario manuscrito del 2026-08-12 sobre el SOT v3 / Inventario.
 *
 * FUENTE: scripts/.data/addendum-inventario-manuscrito-2026-08-12.json
 * (12 updates + 2 altas). El payload es la fuente — acá no se transcribe nada
 * a mano. Hermano de `aplicar-inventario-manuscrito-20260812.mjs`, que cubrió
 * las otras 44 filas del manuscrito; este cierra el bloque B (las dos Dinastías)
 * y los 5 campos del bloque A que se quedaron afuera.
 *
 * QUÉ HACE:
 *   1. Aplica los 12 updates, ubicando SIEMPRE la columna por nombre de
 *      cabecera y la fila por itemId (columna A). Nunca por índice fijo.
 *   2. Da de alta #540 Felicidad y #541 Alegría en rangos explícitos —nunca
 *      values.append— heredando de #218 el bloque completo de asesor.
 *   3. Extiende el autofiltro para que cubra las dos filas nuevas.
 *
 * REGLAS QUE NO SE NEGOCIAN (el script aborta o salta si se violan):
 *   · I "Medidas" es la medida buena; J "Medidas (valores)" está EN DESUSO y no
 *     se escribe nunca.
 *   · Y "mostrarEnCatalogo" es propiedad de Convex, no de la hoja. No se toca.
 *   · AA "observacion" se ANEXA, no se reemplaza. El payload trae el texto final
 *     concatenado; acá se verifica que lo que hoy vive en la celda siga contenido
 *     en el texto nuevo. Si no, se salta y se reporta.
 *   · Vacío no es un dato: jamás se escribe "" sobre una celda con contenido…
 *     salvo los dos vaciados que el addendum autoriza explícitamente y que están
 *     declarados uno por uno en VACIADOS_AUTORIZADOS. Cualquier otro se omite.
 *   · Σ hijos == padre, exacto, EN COSTO Y EN PRECIO (512.000 y 955.962).
 *
 * DIFERENCIA CON LA CORRIDA ANTERIOR: allí M "precioFinalCOP" era columna
 * prohibida (regía el remate hasta el 31-ago). Acá el addendum la habilita
 * porque #218 se retira y su precio tiene que ir a algún lado — se reparte por
 * quilataje igual que el costo, preservando el precio de remate en vez de
 * re-derivarlo con costo × 2,6.
 *
 * ⚠️ LO QUE ESTE SCRIPT **NO** PUEDE HACER — escribir la hoja NO alcanza:
 *   a) Las altas #540/#541 NO llegan a Convex por el sync. `fotoSync` sólo
 *      inserta filas nuevas para `providers` y `clients`; en `inventory` las
 *      marca «fila nueva en la hoja — créala desde la app» y las salta
 *      (convex/fotoSync.ts). Por eso el sync del 12-ago reportó 523 y no 530, y
 *      por eso existe `migrations.seedManuscrito20260812`. Para ALTAS el camino
 *      es Convex → hoja, nunca al revés: hace falta una migración hermana.
 *   b) Despublicar #218. `mostrarEnCatalogo` está excluida del pull desde el
 *      2026-07-30 (va sólo Convex → hoja), así que la columna Y no puede
 *      hacerlo. Y #218 HOY está publicado: con cant 0 seguiría visible en la
 *      vitrina — el mismo doble-venta que el retiro evita. Mismo tratamiento que
 *      recibieron #93, #501 y #504 en la corrida anterior.
 *   c) Re-apuntar el movimiento de asesor de #218. El kardex vive SÓLO en
 *      Convex (la pestaña "Movimientos Asesor" nunca recibió los pushes: las 32
 *      filas están en syncStatus 'error'). Ver el informe del addendum.
 *
 * DESPUÉS DE APLICAR: correr en la hoja el menú «🔄 Convex Sync → Sincronizar
 * todo (completo)». El trigger onEdit es SIMPLE y no dispara por API. Ese sync
 * aterriza los 12 updates; las 2 altas NO — ver (a).
 *
 * Uso:  node scripts/aplicar-addendum-inventario-20260812.mjs           # dry-run
 *       node scripts/aplicar-addendum-inventario-20260812.mjs --apply
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

/** El autofiltro tiene que cubrir TODAS las filas de datos: A1:BE<última>. */
const FILTRO_COL_FIN = 57; // BE, exclusivo (0-based)

const PAYLOAD = JSON.parse(
  readFileSync(
    new URL(
      './.data/addendum-inventario-manuscrito-2026-08-12.json',
      import.meta.url,
    ),
    'utf8',
  ),
);

// ─── Cabeceras ────────────────────────────────────────────────────────────
/** `campo` del payload → nombre EXACTO de la cabecera en la fila 1. */
const CAMPO_A_CABECERA = {
  Nombre: 'Nombre',
  Color: 'Color',
  Calidad: 'Calidad',
  'Cant.': 'Cant.',
  Medidas: 'Medidas',
  costoBaseCOP: 'costoBaseCOP',
  precioFinalCOP: 'precioFinalCOP',
  observacion: 'observacion',
};
/** Columnas que este script no escribe jamás, aunque el payload lo pidiera. */
const CABECERAS_PROHIBIDAS = ['Medidas (valores)', 'mostrarEnCatalogo'];
/**
 * "Vacío no es un dato" sigue en pie: la ÚNICA excepción son estos dos, que el
 * addendum autoriza por escrito (un padre con cant 0 y precio vivo puede
 * colarse como ofertable). Declarados uno por uno para que la excepción se vea
 * en el dry-run en vez de esconderse detrás de una regla laxa.
 */
const VACIADOS_AUTORIZADOS = new Set([
  '93/precioFinalCOP',
  '218/precioFinalCOP',
]);
/**
 * Campos que las altas heredan del padre TAL CUAL. El bloque de asesor va acá
 * a propósito: el addendum dice que los hijos nacen heredando el estado
 * completo de la consignación, y heredarlo de la fila del padre (en vez de
 * transcribirlo) evita que un nombre mal tipeado rompa el ledger.
 */
const CABECERAS_HEREDADAS = [
  'Corte',
  'UBICACIÓN',
  'ASESOR',
  'ESTADO',
  'ASESOR ACTUAL',
  'ESTADO ASESOR',
  'Colección',
  'loteId',
  'procedencia',
  'tipoEsmeralda',
];
/**
 * Lo que el payload declara explícitamente para cada alta y que se CONTRASTA
 * contra lo heredado del padre. Si difieren, no es un error: es una decisión
 * del addendum y se reporta como tal (p. ej. Categoría "Lote de Gemas" → "Gema":
 * el padre eran dos piedras en un lote, cada hijo es una gema suelta).
 */
const ALTA_A_CABECERA = {
  categoria: 'Categoría',
  coleccion: 'Colección',
  loteId: 'loteId',
  ubicacion: 'UBICACIÓN',
  estado: 'ESTADO',
  asesor: 'ASESOR',
  asesorActual: 'ASESOR ACTUAL',
  estadoAsesor: 'ESTADO ASESOR',
  corte: 'Corte',
};
/** Columnas con lista desplegable: un valor fuera de la lista queda en rojo. */
const LISTAS = { Color: 'Listas!A2:A20', Calidad: 'Listas!B2:B24' };
/** Se guardan como número, no como texto. */
const CAMPOS_NUMERICOS = new Set([
  'Peso (ct)',
  'Cant.',
  'costoBaseCOP',
  'precioFinalCOP',
]);

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
if (!hojaInv) {
  console.error(`No existe la pestaña "${TAB}".`);
  process.exit(1);
}
if (hojaInv.properties.sheetId !== GID_INVENTARIO)
  fatal(
    `gid inesperado para "${TAB}": ${hojaInv.properties.sheetId} (esperaba ${GID_INVENTARIO}).`,
  );
if (PAYLOAD.meta?.sot && PAYLOAD.meta.sot !== SOT3)
  fatal(`El payload apunta a otro spreadsheet: ${PAYLOAD.meta.sot}`);

const [invRes, listasRes] = await Promise.all([
  sheets.spreadsheets.values.get({
    spreadsheetId: SOT3,
    range: `'${TAB}'!A1:CX600`,
    valueRenderOption: 'UNFORMATTED_VALUE',
  }),
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
const COL_PESO = idxDeCabecera('Peso (ct)');
const COL_SUBLOTE_GRUPO = idxDeCabecera('subLote (grupo)');
const COL_QR = idxDeCabecera('QR');
const COL_PRODUCTO_URL = idxDeCabecera('Producto (URL)');
const COL_HEREDADAS = Object.fromEntries(
  CABECERAS_HEREDADAS.map((h) => [h, idxDeCabecera(h)]),
);
const COL_ALTA = Object.fromEntries(
  Object.entries(ALTA_A_CABECERA).map(([k, h]) => [k, idxDeCabecera(h)]),
);
const IDX_PROHIBIDOS = new Set(
  CABECERAS_PROHIBIDAS.map((h) => idxDeCabecera(h)).filter((i) => i >= 0),
);

console.log(
  `\n╔═══ Addendum inventario manuscrito 2026-08-12 → SOT v3 / ${TAB} ═══`,
);
console.log(
  `║ ${APPLY ? '⚠️  MODO --apply (ESCRIBE)' : 'DRY-RUN (no escribe nada)'}`,
);
console.log(
  `╚══════════════════════════════════════════════════════════════════\n`,
);

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
console.log(
  `   ⚠️ M "precioFinalCOP" SÍ se escribe en esta corrida (el addendum la habilita).`,
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
if (filasDeDatos !== 530)
  aviso(
    `El addendum se escribió contra 530 filas de datos y la hoja tiene ${filasDeDatos}. ` +
      `Revisar que nadie más esté escribiendo.`,
  );

// ─── Autofiltro ───────────────────────────────────────────────────────────
const filtroActual = hojaInv.basicFilter?.range;
const filtroFinActual = filtroActual?.endRowIndex ?? 0;
console.log('\n── Autofiltro ──');
console.log(
  `   actual : filas 1..${filtroFinActual}, columnas 1..${filtroActual?.endColumnIndex ?? 0}`,
);
if (filtroFinActual !== ultimaFilaDatos) {
  console.log(
    `   ⚠️  ${ultimaFilaDatos - filtroFinActual} fila(s) de datos fuera del filtro. Se corrige antes de escribir.`,
  );
} else {
  console.log(
    '   ✓ ya cubre todas las filas de datos (el addendum lo daba por bueno).',
  );
}

// ─── Validación del payload ───────────────────────────────────────────────
const updates = PAYLOAD.updates;
const altas = PAYLOAD.altas;
console.log(
  `\n── Payload: ${updates.length} updates · ${altas.length} altas ──`,
);

const idsUpdate = [...new Set(updates.map((u) => clean(u.itemId)))];
const faltantes = idsUpdate.filter((id) => !filaDeItem.has(id));
console.log(
  `   itemIds a modificar: ${idsUpdate.join(', ')} · encontrados: ${idsUpdate.length - faltantes.length}/${idsUpdate.length}`,
);
if (faltantes.length)
  fatal(
    `itemIds del payload que NO existen en la hoja: ${faltantes.join(', ')}`,
  );

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
// Los itemId tienen que ser los siguientes libres: si alguien creó #540 entre
// medias, el addendum ya no aplica.
const maxItemNum = Math.max(
  ...[...filaDeItem.keys()]
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n)),
);
const primerLibre = maxItemNum + 1;
const altasEsperadas = altas.map((_, i) => String(primerLibre + i));
if (altas.map((a) => clean(a.itemId)).join(',') !== altasEsperadas.join(','))
  fatal(
    `Los itemId de las altas (${altas.map((a) => a.itemId).join(', ')}) no son los ` +
      `siguientes libres (${altasEsperadas.join(', ')}). El último itemId de la hoja es ${maxItemNum}.`,
  );
else
  console.log(
    `   ✓ ${altas.map((a) => a.itemId).join(' y ')} son los siguientes libres (último en la hoja: #${maxItemNum}).`,
  );

// ─── Invariantes: Σ hijos == padre, en COSTO y en PRECIO ──────────────────
console.log('\n── Invariantes del reparto (Σ hijos == padre, exacto) ──');
const filaPadre218 = filaDeItem.get('218');
const hijos218 = altas.filter((a) => /^#218\b/.test(a.padre));
for (const [etiqueta, colCampo, campoAlta, esperado] of [
  ['costo', 'costoBaseCOP', 'costoBaseCOP', 512000],
  ['precio', 'precioFinalCOP', 'precioFinalCOP', 955962],
]) {
  const enHoja = aNumero(rows[filaPadre218 - 1]?.[COL[colCampo]] ?? 0);
  const suma = hijos218.reduce((s, a) => s + Number(a[campoAlta]), 0);
  const ok = suma === enHoja && suma === esperado;
  console.log(
    `   #218 ${etiqueta.padEnd(6)}: ` +
      hijos218.map((h) => `${h.itemId} ${cop(h[campoAlta])}`).join(' + ') +
      ` = ${cop(suma)} vs padre ${cop(enHoja)} (addendum: ${cop(esperado)})  ${ok ? '✓' : '✗'}`,
  );
  if (!ok)
    fatal(
      `El reparto de #218 en ${etiqueta} no cierra: Σ hijos ${cop(suma)} · padre en la hoja ${cop(enHoja)} · addendum ${cop(esperado)}.`,
    );
}
const pesoPadre = aNumero(rows[filaPadre218 - 1]?.[COL_PESO] ?? 0);
const sumaCt = hijos218.reduce((s, a) => s + Number(a.pesoCt), 0);
console.log(
  `   #218 peso  : ${hijos218.map((h) => `${h.pesoCt} ct`).join(' + ')} = ${sumaCt.toFixed(2)} ct ` +
    `vs padre ${pesoPadre} ct  ${Math.abs(sumaCt - pesoPadre) < 0.005 ? '✓' : '✗'}`,
);
if (Math.abs(sumaCt - pesoPadre) >= 0.005)
  fatal(
    `Los quilates de los hijos (${sumaCt}) no suman los del padre (${pesoPadre}).`,
  );

// ─── Diff de los updates ──────────────────────────────────────────────────
const escrituras = [];
const omitidos = [];
const derivas = [];

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

for (const u of updates) {
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
  if (u.col && u.col !== colLetter(colIdx))
    aviso(
      `Item ${id} campo "${u.campo}": el payload dice columna ${u.col} pero la ` +
        `cabecera "${headers[colIdx]}" vive en ${colLetter(colIdx)}. Manda la cabecera.`,
    );

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

  // Vacío no es un dato — salvo los vaciados que el addendum autoriza.
  if (clean(nuevo) === '' && clean(actual) !== '') {
    if (!VACIADOS_AUTORIZADOS.has(`${id}/${u.campo}`)) {
      omitidos.push({
        ...rec,
        motivo: 'valorNuevo vacío sobre celda con dato (no autorizado)',
      });
      continue;
    }
    rec.vaciadoAutorizado = true;
  }
  if (mismoValor(actual, nuevo) && !rec.vaciadoAutorizado) {
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
  }

  // Deriva: la hoja no dice lo que el payload esperaba encontrar.
  if (
    u.valorActual !== null &&
    u.valorActual !== undefined &&
    !mismoValor(actual, u.valorActual)
  )
    derivas.push({ ...rec, esperado: u.valorActual });

  // Los desplegables marcan en rojo cualquier valor fuera de lista.
  if (
    LISTA_VALIDA[u.campo] &&
    clean(nuevo) &&
    !LISTA_VALIDA[u.campo].has(clean(nuevo))
  )
    aviso(
      `Item ${id} · ${u.campo}: "${clean(nuevo)}" no está en la lista desplegable ` +
        `(${LISTAS[u.campo]}). La celda quedaría marcada como inválida.`,
    );

  escrituras.push(rec);
}

// ─── Altas ────────────────────────────────────────────────────────────────
const primeraFilaAlta = ultimaFilaDatos + 1;
const filasAlta = [];
console.log(
  '\n── Altas (filas nuevas, en rangos explícitos: nunca values.append) ──',
);
altas.forEach((a, n) => {
  const fila = primeraFilaAlta + n;
  const padreId = (a.padre.match(/#(\d+)/) || [])[1];
  const filaPadre = padreId ? filaDeItem.get(padreId) : null;
  if (!filaPadre) {
    fatal(`No encuentro el padre "${a.padre}" del alta ${a.itemId}.`);
    return;
  }

  const valores = [];
  const set = (idx, v) => {
    if (idx >= 0) valores[idx] = v;
  };
  set(COL_ITEM, a.itemId);
  set(COL.Nombre, a.nombre);
  set(COL_PESO, a.pesoCt === '' ? '' : Number(a.pesoCt));
  set(COL.Color, a.color);
  set(COL.Calidad, a.calidad);
  set(COL['Cant.'], Number(a.cant));
  set(COL.Medidas, a.medidas);
  set(COL.costoBaseCOP, Number(a.costoBaseCOP));
  set(COL.precioFinalCOP, Number(a.precioFinalCOP));
  set(COL_SUBLOTE_GRUPO, a.subLote);
  set(COL_QR, `https://tierramadre.app/p/${a.itemId}`);
  set(COL_PRODUCTO_URL, `https://tierramadre.app/product/${a.itemId}`);
  const observacion =
    `Sublote ${a.subLote} de ${a.padre} (subdivisión 12-ago-2026, inventario manuscrito). ` +
    `Costo y precio repartidos ${a.reparto}. ` +
    `Nace en ${a.estado} con ${a.asesorActual}: hereda la consignación del padre.` +
    (a.nota ? ` ${a.nota}` : '');
  set(COL.observacion, observacion);

  // 1) Hereda del padre tal cual.
  const heredados = {};
  for (const [cab, idx] of Object.entries(COL_HEREDADAS)) {
    const v = rows[filaPadre - 1]?.[idx];
    if (clean(v) !== '') {
      set(idx, v);
      heredados[cab] = v;
    }
  }
  // 2) Lo que el payload declara explícito manda, pero la diferencia se reporta.
  const divergencias = [];
  for (const [campoAlta, idx] of Object.entries(COL_ALTA)) {
    const declarado = a[campoAlta];
    if (declarado === undefined || idx < 0) continue;
    const delPadre = clean(rows[filaPadre - 1]?.[idx]);
    if (delPadre && !mismoValor(delPadre, declarado))
      divergencias.push(
        `${ALTA_A_CABECERA[campoAlta]}: padre "${delPadre}" → alta "${declarado}"`,
      );
    set(idx, declarado);
  }

  for (const [campo, lista] of Object.entries(LISTA_VALIDA)) {
    const v = clean(valores[COL[campo]]);
    if (v && !lista.has(v))
      aviso(
        `Alta ${a.itemId} · ${campo}: "${v}" no está en la lista desplegable (${LISTAS[campo]}).`,
      );
  }

  console.log(
    `   f${fila}  #${String(a.itemId).padEnd(4)} "${a.nombre}"  ${a.subLote}  ` +
      `cant ${a.cant} · ${a.pesoCt} ct · ${a.medidas} · ${a.calidad} · ${a.color} · ${a.corte}`,
  );
  console.log(
    `         costo ${cop(a.costoBaseCOP)} · precio ${cop(a.precioFinalCOP)} (${a.reparto})`,
  );
  console.log(
    `         hereda de #${padreId} (f${filaPadre}): ` +
      Object.entries(heredados)
        .map(([k, v]) => `${k}="${clean(v)}"`)
        .join(' · '),
  );
  if (divergencias.length)
    console.log(
      `         ⚠️ el payload sobrescribe lo heredado: ${divergencias.join(' · ')}`,
    );
  console.log(`         AA: ${corta(observacion, 110)}`);
  if (/⚠️/.test(a.nota || ''))
    aviso(`Alta ${a.itemId} "${a.nombre}": ${a.nota}`);

  const ancho = valores.length;
  for (let i = 0; i < ancho; i++) if (valores[i] === undefined) valores[i] = '';
  filasAlta.push({ fila, itemId: a.itemId, valores });
});
console.log(
  `   → filas f${primeraFilaAlta}..f${primeraFilaAlta + altas.length - 1} · ` +
    `total de la hoja: ${filasDeDatos} → ${filasDeDatos + altas.length}`,
);
console.log(
  `   Y "mostrarEnCatalogo" queda VACÍA en las altas (propiedad de Convex). ` +
    `M "precioFinalCOP" SÍ se escribe.`,
);

// ─── Diff a la vista ──────────────────────────────────────────────────────
console.log(`\n\n═══ DIFF COMPLETO — ${escrituras.length} escrituras ═══\n`);
const GRUPOS = [
  ['Renombres', (e) => e.campo === 'Nombre'],
  ['Medidas', (e) => e.campo === 'Medidas'],
  ['Colores', (e) => e.campo === 'Color'],
  ['Calidades', (e) => e.campo === 'Calidad'],
  ['Costos', (e) => e.campo === 'costoBaseCOP'],
  [
    'Precios (col M — habilitada por el addendum)',
    (e) => e.campo === 'precioFinalCOP',
  ],
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
      `   item ${String(e.id).padEnd(5)} f${String(e.fila).padEnd(4)} ${e.col.padStart(2)} ${e.campo}` +
        (e.vaciadoAutorizado ? '   [VACIADO AUTORIZADO]' : ''),
    );
    console.log(`      actual : ${corta(e.actual) || '(vacío)'}`);
    console.log(`      nuevo  : ${corta(e.valor) || '(vacío)'}`);
    if (e.nota) console.log(`      por qué: ${corta(e.nota, 110)}`);
  }
  console.log('');
}

// ─── Resumen, omitidos y advertencias ─────────────────────────────────────
console.log('═══ RESUMEN POR TIPO ═══');
for (const [t, n] of Object.entries(resumen))
  if (n) console.log(`   ${t}: ${n}`);
console.log(
  `   Altas: ${filasAlta.length} filas nuevas (${altas.map((a) => '#' + a.itemId).join(', ')})`,
);
const retirados = [
  ...new Set(
    escrituras
      .filter((e) => e.campo === 'Cant.' && aNumero(e.valor) === 0)
      .map((e) => e.id),
  ),
];
console.log(
  `   Retiros (padre subdividido, cant 0 · fila y QR vivos · ESTADO intacto): ${retirados.map((r) => '#' + r).join(', ') || '(ninguno)'}`,
);
console.log(
  `   Autofiltro: A1:${colLetter(FILTRO_COL_FIN - 1)}${filtroFinActual} → ` +
    `A1:${colLetter(FILTRO_COL_FIN - 1)}${ultimaFilaDatos + altas.length}`,
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
        `      se escribirá     : ${corta(d.valor) || '(vacío)'}`,
    );
}

// ─── Lo que la hoja NO puede hacer ────────────────────────────────────────
console.log(
  '\n═══ LO QUE ESTA CORRIDA **NO** RESUELVE (hace falta Convex) ═══',
);
console.log(
  `   1. Las altas #${altas.map((a) => a.itemId).join(' y #')} NO llegan a Convex por el sync.\n` +
    `      convex/fotoSync.ts salta toda fila nueva de 'inventory' con el motivo\n` +
    `      «fila nueva en la hoja — créala desde la app». Sólo providers y clients se insertan.\n` +
    `      → inventoryStats.total se queda en ${filasDeDatos}, NO llega a ${filasDeDatos + altas.length}.\n` +
    `      → hace falta una migración hermana de migrations.seedManuscrito20260812.`,
);
console.log(
  `   2. Despublicar #218. mostrarEnCatalogo está excluida del pull (sólo Convex → hoja).\n` +
    `      #218 hoy está mostrarEnCatalogo:true; con cant 0 seguiría ofertable en la vitrina.\n` +
    `      publishedCatalog filtra por mostrarEnCatalogo y loteId, NO por cantidad — el mismo\n` +
    `      motivo por el que la corrida anterior despublicó #93, #501 y #504.`,
);
console.log(
  `   3. Re-apuntar el movimiento de asesor de #218 (kardex). Vive sólo en Convex.\n` +
    `      Ver el informe del addendum antes de correr --apply.`,
);

console.log('\n═══ ADVERTENCIAS ═══');
aviso(
  '#171 TAMBIÉN está con Isa la Negra Vikinga Warrior Portocarrero (mismo evento de kardex ' +
    'KDX-1785178014410-d8b0hq, 27-jul-2026, comprobante firmado que cubre 5 ítems: #382, #427, ' +
    '#218, #171, #484). El addendum no lo menciona. Renombrarlo a "Dinastía Celestial" deja el ' +
    'catálogo con un nombre distinto al del comprobante firmado — la misma pregunta abierta que ' +
    'quedó con #452. El renombre en sí es seguro: itemNombre en el kardex es un snapshot histórico.',
);
aviso(
  '#218 conserva en la hoja Caja: precio venta / valor pagado / saldo = $1.331.200 (cols AU/AV/AW) ' +
    'y los hijos nacen sin bloque de Caja. Fuera del alcance del addendum, pero deja el ledger ' +
    'contable apuntando a un ítem con cant 0. Conviene decidirlo aparte.',
);
aviso(
  '#218 conserva precioEmbajadorCOP $1.730.560 en Convex (no hay columna en la hoja). Un padre ' +
    'retirado con precio de embajador vivo puede colarse por esa vía aunque M quede vacía.',
);
aviso(
  'Los sublotes nuevos (' +
    [...new Set(altas.map((a) => a.subLote))].join(', ') +
    ') NO se registran en la pestaña Sublotes: mismo alcance que la corrida anterior.',
);
aviso(
  'Pendiente heredado: cuando las altas entren a Convex, RE-CORRER ' +
    'migrations:backfillLotProvenance — los hijos se publican sin mina/tratamiento ' +
    'denormalizados y no hay republish automático que los estampe. (Esa migración todavía ' +
    'no está en main: vive en perf/convex-db-io-20260812 y fix/catalog-sentinel-sale-bump.)',
);
avisos.forEach((a, i) => console.log(`   ${i + 1}. ${a}`));

console.log('\n═══ PENDIENTES DEL ADDENDUM (no se resuelven acá) ═══');
console.log(
  '   1. Medida de #540 Felicidad: el papel dice 5,9 × 3,9; la col I del padre traía',
);
console.log(
  '      "5.6 × 7.0 × 5.7" para la 2ª piedra. Se usa la del papel — confirmar contra la piedra.',
);
console.log(
  '   2. Color de #171: papel "Chivor" (→ Verde Chivor) vs hoja "Verde Vívido". NO se escribe.',
);
console.log(
  '   3. Segunda medida de #171: el papel da 4,9 × 3,5 y la hoja 6.4 × 3.5 × 2.3 — posible 6,4 leído como 4,9.',
);
console.log(
  '   4. Calidad de #528 Eco del Río: papel "S. Fina" vs hoja "COMERCIAL SUPERIOR". NO se toca.',
);
console.log(
  '   5. Costo de #513 Suspiro Ancestral: papel $193.000 vs hoja $193.200. No se toca.',
);
console.log(
  '   6. #452 Falsedad: se conserva 4,32 ct / cant 4. Queda así hasta nueva orden.',
);
console.log(
  '   7. #499 sigue sin subdividir: faltan los datos de "Cuatro Elementos" y 2 de sus 8 unidades.',
);

if (abortar) {
  console.error(
    '\n❌ Hay condiciones que impiden escribir. No se aplica nada.\n',
  );
  process.exit(1);
}

if (!APPLY) {
  console.log(
    '\n\nDRY-RUN: no se escribió nada.\n' +
      'Para aplicar: node scripts/aplicar-addendum-inventario-20260812.mjs --apply\n',
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
  `./.backups/addendum-inventario-${ts}.json`,
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
        'Estado PREVIO de todo lo que toca aplicar-addendum-inventario-20260812.mjs',
      spreadsheetId: SOT3,
      generado: new Date().toISOString(),
      cabeceras: headers,
      autofiltroPrevio: filtroActual,
      filasInventario: filasTocadas.map((f) => ({
        fila: f,
        itemId: clean(rows[f - 1]?.[COL_ITEM]),
        valores: rows[f - 1],
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
if (filtroFinActual !== ultimaFilaDatos) await setFiltro(ultimaFilaDatos);

// ── Updates, celda por celda ─────────────────────────────────────────────
const valorParaHoja = (e) =>
  CAMPOS_NUMERICOS.has(e.campo) && esNumerico(e.valor)
    ? aNumero(e.valor)
    : e.valor;
await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SOT3,
  requestBody: {
    valueInputOption: 'RAW',
    data: escrituras.map((e) => ({
      range: `'${TAB}'!${e.col}${e.fila}`,
      values: [[valorParaHoja(e)]],
    })),
  },
});
console.log(`  ${TAB}: ${escrituras.length} celdas`);

// ── Altas en rangos explícitos ───────────────────────────────────────────
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

await setFiltro(ultimaFilaDatos + altas.length);

// ── Verificación: releer y localizar por cabecera ────────────────────────
// `syncStatus: 'synced'` no prueba aterrizaje.
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
  for (const [campo, esperado] of [
    ['costoBaseCOP', a.costoBaseCOP],
    ['precioFinalCOP', a.precioFinalCOP],
  ]) {
    if (!mismoValor(rows2[f - 1]?.[COL[campo]], esperado)) {
      fallas++;
      console.error(`  ✗ alta ${a.itemId}: ${campo} no aterrizó.`);
    }
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
  '\n✅ La hoja quedó lista. FALTA LA MITAD EN CONVEX:\n' +
    '   1. En la hoja: menú «🔄 Convex Sync → Sincronizar todo (completo)».\n' +
    '      Aterriza los 12 updates. Las 2 altas NO — fotoSync las salta.\n' +
    `   2. Correr la migración hermana: crea #${altas.map((a) => a.itemId).join(' y #')} en Convex,\n` +
    '      despublica #218 y re-apunta el kardex de Isa.\n' +
    `   3. Recién ahí: inventoryStats.total ${filasDeDatos} → ${filasDeDatos + altas.length}.\n` +
    '   4. Re-correr migrations:backfillLotProvenance cuando esté en main.\n',
);
