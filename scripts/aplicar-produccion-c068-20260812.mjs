/**
 * C-068 · corrección del peso del lote y registro del envío a producción.
 * Tercera corrida sobre el SOT v3, hermana de
 * `aplicar-inventario-manuscrito-20260812.mjs` y `aplicar-addendum-inventario-20260812.mjs`.
 *
 * FUENTE: scripts/.data/produccion-c068-2026-08-12.json — el payload manda,
 * acá no se transcribe ningún valor a mano.
 *
 * QUÉ HACE (6 updates, CERO altas):
 *   · Lotes / C-068 : pesoTotalQuilates 8.20 → 10.71 (replace) y notas (append).
 *   · Inventario/506: Cant. 2 → 0 (replace), mostrarEnCatalogo → FALSE,
 *                     observacion (append).
 *   · Inventario/485: Peso (ct) "0,74" (TEXTO) → 0.74 (número).
 *
 * ⛔ LA FASE 2 (RECOSTEO) NO SE ESCRIBE. Vive en el payload bajo
 *    `fase2_recosteo_BLOQUEADO` y este script sólo la IMPRIME. Sólo 16 de las 48
 *    unidades de C-068 tienen peso medido: recostear esas 8 filas con la tarifa
 *    nueva dejaría ~$536.000 del lote sin repartir y rompería Σ ítems == costo
 *    del lote, que hoy cierra EXACTO en $735.000. El script aborta si alguna vez
 *    alguien mete esos itemIds en `fase1_updates`.
 *
 * REGLAS QUE NO SE NEGOCIAN (el script aborta o salta si se violan):
 *   · Toda columna se ubica por NOMBRE DE CABECERA y toda fila por su clave
 *     natural (`Item` en Inventario, `loteId` en Lotes). Nunca por índice fijo.
 *     La letra que declara el payload es informativa: manda la cabecera.
 *   · J "Medidas (valores)" está EN DESUSO: no se escribe jamás.
 *   · `observacion` y `notas` se ANEXAN, nunca se reemplazan. Si el texto del
 *     payload no contiene lo que hoy vive en la celda, se CONCATENA
 *     (actual + separador + nuevo). Nada se pierde.
 *   · Vacío no es un dato: nunca se escribe "" sobre una celda con contenido.
 *     OJO: el 0 de `Cant.` NO es vacío y tiene que llegar como 0 LITERAL — ver
 *     la nota sobre coerceCell más abajo.
 *   · Σ costoBaseCOP de los ítems de C-068 == costoTotalCOP del lote, exacto,
 *     ANTES y DESPUÉS. Esta corrida no toca ningún costo: si la suma se mueve,
 *     algo salió mal.
 *
 * ⚠️ EXCEPCIÓN DECLARADA — Y "mostrarEnCatalogo":
 *   En las dos corridas anteriores era columna PROHIBIDA. Acá el prompt la
 *   habilita explícitamente "por consistencia", sabiendo que NO despublica nada:
 *   la columna está EXCLUIDA del pull hoja→Convex desde el 2026-07-30
 *   (convex/_lib/sheetPullMaps.ts, spec INVENTORY) y la dirección del espejo es
 *   Convex → hoja. Se escribe como BOOLEANO, no como el string "FALSE", porque
 *   la columna guarda booleanos reales (#485 hoy vale `true`, no "TRUE").
 *
 * ✅ LO QUE SÍ ATERRIZA EN CONVEX CON EL SYNC (verificado en la fuente):
 *   · lots.pesoTotalQuilates → { coerce: 'num' }  ✓ en el allowlist.
 *   · lots.notas             → { coerce: 'str' }  ✓
 *   · inventory.cantidad     → { coerce: 'num' }  ✓ …con una trampa: coerceCell
 *     saltea la celda VACÍA (`if (t === '') return { skip: true }`, "never clear
 *     a number from a blanked cell") pero acepta el 0 porque es finito. Si esta
 *     corrida dejara la celda G de #506 en blanco en vez de poner un 0, el
 *     cambio NO llegaría a Convex y #506 seguiría en cantidad 2 allá, sin error
 *     visible. Por eso el 0 se escribe como número y se verifica releyendo.
 *   · inventory.observacion  → { coerce: 'str' }  ✓
 *   · inventory.peso         → { coerce: 'str' }  ✓ (el schema guarda el peso
 *     como string; 0.74 aterriza como "0.74" y reemplaza al "0,74" con coma).
 *
 * ❌ LO QUE **NO** ATERRIZA, Y ESTÁ BIEN QUE NO:
 *   · inventory.mostrarEnCatalogo — EXCLUIDA del pull. Escribir la col Y no
 *     despublica. Se despublica desde la app o no se despublica.
 *
 * DESPUÉS DE APLICAR: en la hoja, menú «🔄 Convex Sync → Sincronizar todo
 * (completo)». El trigger onEdit es SIMPLE y no dispara por API.
 * ⚠️ Producción se mudó de proyecto Convex la madrugada del 13-ago: el
 * deployment vivo es `valuable-mule-753`, NO `grand-hippopotamus-162`. El viejo
 * sigue encendido y responde con datos casi idénticos, así que consultarlo por
 * error no da error: da una respuesta plausible y equivocada. Para verificar:
 *   npx convex run products:getByItem '{"itemId":"506"}' --deployment-name valuable-mule-753
 *
 * Uso:  node scripts/aplicar-produccion-c068-20260812.mjs                 # dry-run
 *       node scripts/aplicar-produccion-c068-20260812.mjs --apply
 *       …--allow-col-drift   sólo si una cabecera se movió de columna a propósito.
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

config({ path: '.env.local' });
config({ path: '.env' });

const APPLY = process.argv.includes('--apply');
const ALLOW_COL_DRIFT = process.argv.includes('--allow-col-drift');

const SOT3 = '1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U';
const TAB_INV = 'Inventario';
const TAB_LOTES = 'Lotes';
const GID_INVENTARIO = 1819792669;
const LOTE = 'C-068';

const PAYLOAD = JSON.parse(
  readFileSync(
    new URL('./.data/produccion-c068-2026-08-12.json', import.meta.url),
    'utf8',
  ),
);

// ─── Mapa campo → cabecera, por tabla ─────────────────────────────────────
/** Clave natural de cada tabla (columna A en ambas). */
const CLAVE = { Inventario: 'Item', Lotes: 'loteId' };
const CAMPO_A_CABECERA = {
  Inventario: {
    'Cant.': 'Cant.',
    'Peso (ct)': 'Peso (ct)',
    mostrarEnCatalogo: 'mostrarEnCatalogo',
    observacion: 'observacion',
  },
  Lotes: {
    pesoTotalQuilates: 'pesoTotalQuilates',
    notas: 'notas',
  },
};
/** Columnas que este script no escribe jamás, aunque el payload lo pidiera. */
const CABECERAS_PROHIBIDAS = { Inventario: ['Medidas (valores)'], Lotes: [] };
/**
 * La excepción del prompt, declarada una por una para que se vea en el dry-run
 * en vez de esconderse detrás de una regla laxa. Y "mostrarEnCatalogo" era
 * columna prohibida en las dos corridas anteriores.
 */
const PROHIBICIONES_LEVANTADAS = new Set(['Inventario/mostrarEnCatalogo']);
/** Se guardan como número, no como texto. */
const CAMPOS_NUMERICOS = new Set(['Cant.', 'Peso (ct)', 'pesoTotalQuilates']);
/** Se guardan como booleano real (la columna guarda booleanos, no strings). */
const CAMPOS_BOOLEANOS = new Set(['mostrarEnCatalogo']);
/** Se ANEXAN, nunca se reemplazan. */
const CAMPOS_ANEXABLES = new Set(['observacion', 'notas']);
const SEPARADOR_ANEXO = ' ';
/** itemIds de la Fase 2: si aparecen en fase1_updates, es un error grave. */
const ITEMS_FASE2 = new Set(
  (PAYLOAD.fase2_recosteo_BLOQUEADO?.preview || []).map((p) =>
    String(p.itemId),
  ),
);

// ─── Utilidades ───────────────────────────────────────────────────────────
const clean = (v) =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim();
const normHeader = (v) => clean(v).toLowerCase();
const esNumerico = (v) => /^-?[\d.,]+$/.test(clean(v)) && /\d/.test(clean(v));
/** "550,240" y 550240 son el mismo dato; "0,74" y 0.74 también. */
const aNumero = (v) => {
  const s = clean(v);
  // "0,74" es un decimal con coma; "550,240" es un miles con coma.
  if (/^-?\d+,\d{1,2}$/.test(s)) return Number(s.replace(',', '.'));
  return Number(s.replace(/,/g, ''));
};
const esBooleano = (v) =>
  typeof v === 'boolean' || /^(true|false|verdadero|falso)$/i.test(clean(v));
const aBooleano = (v) =>
  typeof v === 'boolean' ? v : /^(true|verdadero)$/i.test(clean(v));
const mismoValor = (a, b) => {
  if (esBooleano(a) && esBooleano(b)) return aBooleano(a) === aBooleano(b);
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

/**
 * Valor TIPADO que va a la celda. Es la única fuente de verdad: el diff compara
 * contra esto y la escritura manda exactamente esto, así que no puede haber
 * deriva entre lo que el dry-run muestra y lo que se escribe.
 */
const valorTipado = (campo, valor) => {
  if (CAMPOS_BOOLEANOS.has(campo)) return aBooleano(valor);
  if (CAMPOS_NUMERICOS.has(campo) && esNumerico(valor)) return aNumero(valor);
  return valor;
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

// ─── Lectura ──────────────────────────────────────────────────────────────
const metaHoja = await sheets.spreadsheets.get({
  spreadsheetId: SOT3,
  fields: 'sheets(properties(sheetId,title,gridProperties))',
});
const hojaDe = (t) =>
  metaHoja.data.sheets.find((s) => s.properties.title === t);
for (const t of [TAB_INV, TAB_LOTES])
  if (!hojaDe(t)) {
    console.error(`No existe la pestaña "${t}".`);
    process.exit(1);
  }
if (hojaDe(TAB_INV).properties.sheetId !== GID_INVENTARIO)
  fatal(
    `gid inesperado para "${TAB_INV}": ${hojaDe(TAB_INV).properties.sheetId} (esperaba ${GID_INVENTARIO}).`,
  );
if (PAYLOAD.meta?.sot && PAYLOAD.meta.sot !== SOT3)
  fatal(`El payload apunta a otro spreadsheet: ${PAYLOAD.meta.sot}`);
if (
  PAYLOAD.meta?.gidInventario &&
  PAYLOAD.meta.gidInventario !== GID_INVENTARIO
)
  fatal(
    `El payload declara otro gid de Inventario: ${PAYLOAD.meta.gidInventario}`,
  );

const [invRes, lotesRes] = await Promise.all([
  sheets.spreadsheets.values.get({
    spreadsheetId: SOT3,
    range: `'${TAB_INV}'!A1:CX600`,
    valueRenderOption: 'UNFORMATTED_VALUE',
  }),
  sheets.spreadsheets.values.get({
    spreadsheetId: SOT3,
    range: `'${TAB_LOTES}'!A1:BZ300`,
    valueRenderOption: 'UNFORMATTED_VALUE',
  }),
]);

/** Estado de una pestaña: filas, cabeceras, índice por clave natural. */
const cargarTabla = (tab, res) => {
  const rows = res.data.values || [];
  const headers = rows[0] || [];
  const idxDeCabecera = (nombre) => {
    const objetivo = normHeader(nombre);
    const hits = headers
      .map((h, i) => (normHeader(h) === objetivo ? i : -1))
      .filter((i) => i >= 0);
    if (hits.length !== 1) {
      fatal(
        `${tab} · cabecera "${nombre}": ${hits.length} coincidencias en la fila 1. Aborto por seguridad.`,
      );
      return -1;
    }
    return hits[0];
  };
  const colClave = idxDeCabecera(CLAVE[tab]);
  const filaDe = new Map();
  const duplicados = [];
  let ultima = 1;
  for (let r = 1; r < rows.length; r++) {
    const id = clean(rows[r]?.[colClave]);
    if (!id) continue;
    ultima = r + 1;
    if (filaDe.has(id)) duplicados.push(id);
    else filaDe.set(id, r + 1); // 1-based
  }
  if (duplicados.length)
    fatal(`${tab} · claves duplicadas: ${[...new Set(duplicados)].join(', ')}`);
  const COL = {};
  for (const [campo, cab] of Object.entries(CAMPO_A_CABECERA[tab]))
    COL[campo] = idxDeCabecera(cab);
  const prohibidos = new Set(
    CABECERAS_PROHIBIDAS[tab].map(idxDeCabecera).filter((i) => i >= 0),
  );
  return {
    tab,
    rows,
    headers,
    COL,
    colClave,
    filaDe,
    ultima,
    prohibidos,
    idxDeCabecera,
  };
};

const T = {
  Inventario: cargarTabla(TAB_INV, invRes),
  Lotes: cargarTabla(TAB_LOTES, lotesRes),
};

console.log(
  `\n╔═══ C-068 · corrección de peso + envío a producción → SOT v3 ═══`,
);
console.log(
  `║ ${APPLY ? '⚠️  MODO --apply (ESCRIBE)' : 'DRY-RUN (no escribe nada)'}`,
);
console.log(`║ ${PAYLOAD.meta?.titulo ?? ''}`);
console.log(
  `╚═══════════════════════════════════════════════════════════════\n`,
);

console.log('── Columnas resueltas por cabecera (nunca por posición) ──');
for (const tab of [TAB_LOTES, TAB_INV]) {
  const t = T[tab];
  console.log(
    `   ${tab} (gid ${hojaDe(tab).properties.sheetId}) · clave ${colLetter(t.colClave)} "${t.headers[t.colClave]}" · ${t.filaDe.size} filas de datos`,
  );
  for (const [campo, i] of Object.entries(t.COL))
    console.log(
      `      ${colLetter(i).padStart(2)} (${String(i).padStart(2)})  "${t.headers[i]}"  ← campo "${campo}"` +
        (PROHIBICIONES_LEVANTADAS.has(`${tab}/${campo}`)
          ? '   ⚠️ PROHIBICIÓN LEVANTADA POR ESTA CORRIDA'
          : ''),
    );
  if (CABECERAS_PROHIBIDAS[tab].length)
    console.log(
      `      prohibidas: ${CABECERAS_PROHIBIDAS[tab]
        .map((h) => `${colLetter(t.idxDeCabecera(h))} "${h}"`)
        .join(' · ')}`,
    );
}

// ─── Validación del payload ───────────────────────────────────────────────
const updates = PAYLOAD.fase1_updates || [];
console.log(`\n── Payload: ${updates.length} updates · 0 altas ──`);
if (!Array.isArray(updates) || !updates.length) {
  fatal('El payload no trae `fase1_updates`.');
}
// El pull hoja→Convex NO crea filas (convex/fotoSync.ts: "fila nueva en la hoja
// — créala desde la app"). Si alguna vez aparece un alta acá, no se mete por la
// hoja: el camino para altas es Convex → hoja.
if (PAYLOAD.altas?.length)
  fatal(
    `El payload trae ${PAYLOAD.altas.length} alta(s). Esta corrida es SÓLO updates: ` +
      `el pull hoja→Convex no crea filas (convex/fotoSync.ts). Las altas van por Convex.`,
  );
// El recosteo no se escribe. Nunca.
for (const u of updates)
  if (u.tabla === 'Inventario' && ITEMS_FASE2.has(clean(u.clave)))
    fatal(
      `El update sobre #${u.clave} toca un ítem de la Fase 2 BLOQUEADA. ` +
        `El recosteo espera a que se pesen las 17 baguettes de anillo.`,
    );

// ─── Diff ─────────────────────────────────────────────────────────────────
const escrituras = [];
const omitidos = [];
const derivas = [];

for (const u of updates) {
  const t = T[u.tabla];
  if (!t) {
    fatal(`Update con tabla desconocida "${u.tabla}" (clave ${u.clave}).`);
    continue;
  }
  const id = clean(u.clave);
  const fila = t.filaDe.get(id);
  if (!fila) {
    fatal(`${u.tabla} · la clave "${id}" no existe en la hoja.`);
    continue;
  }
  const colIdx = t.COL[u.campo];
  if (colIdx === undefined || colIdx < 0) {
    fatal(
      `Campo "${u.campo}" del payload sin cabecera resuelta (${u.tabla}/${id}).`,
    );
    continue;
  }
  if (t.prohibidos.has(colIdx)) {
    fatal(
      `El payload pide escribir en "${t.headers[colIdx]}" (${u.tabla}/${id}) — columna prohibida.`,
    );
    continue;
  }
  // La letra declarada en el payload es informativa; manda la cabecera.
  if (u.col && u.col !== colLetter(colIdx))
    aviso(
      `${u.tabla}/${id} campo "${u.campo}": el payload dice columna ${u.col} pero la ` +
        `cabecera "${t.headers[colIdx]}" vive en ${colLetter(colIdx)}. Manda la cabecera.`,
    );

  const actual = t.rows[fila - 1]?.[colIdx];
  let valor = u.valorNuevo;
  const rec = {
    tabla: u.tabla,
    id,
    fila,
    colIdx,
    col: colLetter(colIdx),
    campo: u.campo,
    actual,
    nota: u.nota,
    modo: u.modo,
  };

  // ── Anexado: nada se pierde, nunca ──
  if (CAMPOS_ANEXABLES.has(u.campo)) {
    if (u.modo !== 'append')
      fatal(
        `${u.tabla}/${id} · "${u.campo}" se ANEXA siempre, y el payload pide modo "${u.modo}".`,
      );
    const hoy = clean(actual);
    const nuevo = clean(valor);
    if (hoy === '') {
      rec.anexo = 'celda vacía → se escribe el texto del payload tal cual';
    } else if (nuevo.includes(hoy)) {
      // El payload ya trae el texto final concatenado (convención del addendum).
      rec.anexo =
        'el texto del payload YA contiene lo que hay hoy → se escribe tal cual';
    } else if (hoy.includes(nuevo)) {
      // IDEMPOTENCIA. El fragmento del payload YA está anexado: esto es una
      // corrida repetida. Sin esta rama, `nuevo.includes(hoy)` da false (hoy es
      // más largo) y se concatenaría otra vez, duplicando el párrafo en cada
      // --apply. Y la segunda corrida no es hipotética: si la verificación
      // posterior falla, el proceso sale con exit 1 DESPUÉS de haber escrito, y
      // lo natural es volver a correr --apply.
      rec.valor = valor;
      omitidos.push({
        ...rec,
        motivo:
          'el fragmento del payload YA está anexado en la celda (corrida repetida) → no se re-anexa',
      });
      continue;
    } else {
      // El payload trae SÓLO el fragmento nuevo → se concatena.
      valor = `${hoy}${SEPARADOR_ANEXO}${nuevo}`;
      rec.anexo =
        'el texto del payload NO contiene lo de hoy → se CONCATENA (actual + nuevo)';
      aviso(
        `${u.tabla}/${id} · ${u.campo}: la celda NO estaba vacía y el payload trae sólo el ` +
          `fragmento nuevo. Se concatena para no perder nada.\n` +
          `      hoy   : ${corta(hoy, 130)}\n` +
          `      queda : ${corta(valor, 130)}`,
      );
    }
  }
  rec.valor = valor;

  // ── Vacío no es un dato. OJO: el 0 de `Cant.` NO es vacío. ──
  if (clean(valor) === '' && clean(actual) !== '') {
    omitidos.push({ ...rec, motivo: 'valorNuevo vacío sobre celda con dato' });
    continue;
  }
  // ── Igualdad de VALOR no alcanza: también tiene que coincidir el TIPO ──
  // El update de #485 es exactamente esto: la celda dice "0,74" (TEXTO, con
  // coma) y tiene que decir 0.74 (NÚMERO). Numéricamente son el mismo dato, y
  // comparar sólo el valor lo daría por hecho y saltearía la única corrección
  // que ese update pide. Un texto numérico se cuela en cualquier suma de la
  // hoja, y en Convex `peso` es string: "0,74" y "0.74" no son el mismo string.
  rec.objetivo = valorTipado(u.campo, valor);
  const tipoActual = clean(actual) === '' ? 'vacío' : typeof actual;
  const tipoObjetivo = typeof rec.objetivo;
  if (mismoValor(actual, valor)) {
    if (clean(actual) === '' || tipoActual === tipoObjetivo) {
      omitidos.push({
        ...rec,
        motivo: 'la celda ya tiene ese valor y ese tipo',
      });
      continue;
    }
    rec.correccionDeTipo = `${tipoActual} → ${tipoObjetivo}`;
  }

  // ── Deriva: la hoja no dice lo que el payload esperaba encontrar ──
  // `valorActual` a veces trae una ANOTACIÓN humana copiada de la tabla del
  // documento — el caso vivo es #485: "0,74 (TEXTO)", donde "(TEXTO)" describe
  // el tipo, no forma parte del valor. Comparar el string entero declararía una
  // deriva que no existe, y una deriva falsa entrena a ignorar las verdaderas.
  const anotacion = /^(.*?)\s*\((TEXTO|texto|NÚMERO|numero|número)\)$/.exec(
    String(u.valorActual ?? ''),
  );
  const esperadoLimpio = anotacion ? anotacion[1] : u.valorActual;
  if (
    u.valorActual !== null &&
    u.valorActual !== undefined &&
    !mismoValor(actual, esperadoLimpio)
  )
    derivas.push({ ...rec, esperado: u.valorActual });
  else if (anotacion)
    rec.anotacionPayload = `el payload anota el tipo actual como "(${anotacion[2]})" — coincide con la hoja`;
  // El payload NO declara valorActual para los campos anexables, pero el
  // documento sí los daba por vacíos: si no lo están, es una deriva igual.
  if (
    CAMPOS_ANEXABLES.has(u.campo) &&
    u.valorActual === undefined &&
    clean(actual) !== ''
  )
    derivas.push({
      ...rec,
      esperado: '(el documento decía «(vacío)»)',
      soloAviso: true,
    });

  escrituras.push(rec);
}

// ─── Invariantes del lote ─────────────────────────────────────────────────
console.log(
  `\n── Invariantes de ${LOTE} (leídos de la hoja, no del payload) ──`,
);
const inv = T.Inventario;
const colLoteId = inv.idxDeCabecera('loteId');
const colCosto = inv.idxDeCabecera('costoBaseCOP');
const colCant = inv.COL['Cant.'];
const colPeso = inv.COL['Peso (ct)'];
const colItem = inv.colClave;
const filasLote = [];
for (let r = 1; r < inv.rows.length; r++)
  if (clean(inv.rows[r]?.[colLoteId]) === LOTE)
    filasLote.push({
      fila: r + 1,
      item: clean(inv.rows[r][colItem]),
      cant: aNumero(inv.rows[r][colCant]) || 0,
      peso: clean(inv.rows[r][colPeso]) ? aNumero(inv.rows[r][colPeso]) : null,
      costo: aNumero(inv.rows[r][colCosto]) || 0,
    });

const lotes = T.Lotes;
const filaLote = lotes.filaDe.get(LOTE);
const costoLote = aNumero(
  lotes.rows[filaLote - 1]?.[lotes.idxDeCabecera('costoTotalCOP')],
);
const unidadesDeclaradas = aNumero(
  lotes.rows[filaLote - 1]?.[lotes.idxDeCabecera('unidadesDeclaradas')],
);
const sumaCosto = filasLote.reduce((s, f) => s + f.costo, 0);
const sumaCant = filasLote.reduce((s, f) => s + f.cant, 0);
const medidos = filasLote.filter((f) => f.peso !== null);
const ctMedidos = medidos.reduce((s, f) => s + f.peso, 0);
const udsMedidas = medidos.reduce((s, f) => s + f.cant, 0);

console.log(
  `   ${LOTE} vive en '${TAB_LOTES}' f${filaLote} · ${filasLote.length} ítems en '${TAB_INV}'`,
);
console.log(
  `   Σ costoBaseCOP ítems = ${cop(sumaCosto)} vs costoTotalCOP del lote ${cop(costoLote)}  ` +
    `${sumaCosto === costoLote ? '✓ CIERRA EXACTO' : '✗ NO CIERRA'}`,
);
if (sumaCosto !== costoLote)
  fatal(
    `Σ costoBaseCOP de los ítems (${cop(sumaCosto)}) no cierra contra el lote (${cop(costoLote)}) ` +
      `ANTES de escribir. Esta corrida no toca costos: arreglá eso primero.`,
  );
console.log(
  `   Σ Cant. ítems = ${sumaCant} vs unidadesDeclaradas ${unidadesDeclaradas}  ` +
    `${sumaCant === unidadesDeclaradas ? '✓' : '⚠️'}`,
);
console.log(
  `   ítems con peso medido: ${medidos.length} filas = ${udsMedidas} unidades = ${ctMedidos.toFixed(2)} ct ` +
    `(tasa ${(ctMedidos / udsMedidas).toFixed(5)} ct/unidad)`,
);

// El peso nuevo tiene que ser el que el payload declara, y su descomposición
// tiene que cerrar: 7.24 medidos + 3.47 estimados = 10.71.
const updPeso = updates.find((u) => u.campo === 'pesoTotalQuilates');
const pesoNuevo = Number(updPeso?.valorNuevo);
const MEDIDO_TOPITOS = 7.24;
const ESTIMADO_RESTO = 3.47;
console.log(
  `   peso nuevo: ${MEDIDO_TOPITOS} ct medidos (29 topitos) + ${ESTIMADO_RESTO} ct estimados ` +
    `(19 uds restantes) = ${(MEDIDO_TOPITOS + ESTIMADO_RESTO).toFixed(2)} ct vs payload ${pesoNuevo}  ` +
    `${Math.abs(MEDIDO_TOPITOS + ESTIMADO_RESTO - pesoNuevo) < 0.005 ? '✓' : '✗'}`,
);
if (Math.abs(MEDIDO_TOPITOS + ESTIMADO_RESTO - pesoNuevo) >= 0.005)
  fatal(
    `La descomposición del peso no cierra: ${MEDIDO_TOPITOS} + ${ESTIMADO_RESTO} ≠ ${pesoNuevo}.`,
  );

// ── ¿De dónde sale el 3.47? Reconstruirlo desde la hoja, no creerle al texto ──
// La nota que se ANEXA al lote dice «el resto ESTIMADO a 0.01703 ct/mm²». Eso
// vale para las 2 de #506, pero NO para las 17 baguettes: se reconstruyen
// exactamente con la tasa POR UNIDAD (2.90 ct / 16 uds), no por área — y las
// filas candidatas a ser esas baguettes ni siquiera tienen medidas cargadas.
// Se imprime para que el método quede auditable y la discrepancia, a la vista.
/** Área de una fila: suma L×W de cada piedra listada en "Medidas". */
const areaDeMedidas = (txt) =>
  clean(txt)
    .split('·')
    .reduce((s, seg) => {
      const n = (seg.match(/\d+(?:[.,]\d+)?/g) || []).map((x) =>
        Number(x.replace(',', '.')),
      );
      return s + (n.length >= 2 ? n[0] * n[1] : 0);
    }, 0);
const colMedidas = inv.idxDeCabecera('Medidas');
const areaMedidos = medidos.reduce(
  (s, f) => s + areaDeMedidas(inv.rows[f.fila - 1]?.[colMedidas]),
  0,
);
const tasaArea = ctMedidos / areaMedidos;
const tasaUnidad = ctMedidos / udsMedidas;
const area506 = areaDeMedidas(
  inv.rows[inv.filaDe.get('506') - 1]?.[colMedidas],
);
const CT_506 = 2 * area506 * tasaArea;
const BAGUETTES = 17;
const estimadoReconstruido = CT_506 + BAGUETTES * tasaUnidad;
console.log(
  `   ¿de dónde sale el ${ESTIMADO_RESTO}? reconstruido desde la hoja, en DOS tramos:\n` +
    `      · tasa por ÁREA  : ${ctMedidos.toFixed(2)} ct / ${areaMedidos.toFixed(2)} mm² = ` +
    `${tasaArea.toFixed(5)} ct/mm² (el payload declara 0.01703 ` +
    `${Math.abs(tasaArea - 0.01703) < 0.00005 ? '✓' : '✗'})\n` +
    `      · las 2 de #506  : 2 × ${area506.toFixed(2)} mm² × ${tasaArea.toFixed(5)} = ${CT_506.toFixed(2)} ct  ← por área ✓\n` +
    `      · las ${BAGUETTES} baguettes: ${BAGUETTES} × ${tasaUnidad.toFixed(5)} ct/ud = ` +
    `${(BAGUETTES * tasaUnidad).toFixed(2)} ct  ← por UNIDAD, no por área\n` +
    `      · total          : ${estimadoReconstruido.toFixed(2)} ct vs ${ESTIMADO_RESTO} declarado ` +
    `${Math.abs(estimadoReconstruido - ESTIMADO_RESTO) < 0.005 ? '✓' : '✗'}`,
);
if (Math.abs(estimadoReconstruido - ESTIMADO_RESTO) >= 0.005)
  fatal(
    `El ${ESTIMADO_RESTO} estimado no se reconstruye desde los pesos medidos de la hoja ` +
      `(da ${estimadoReconstruido.toFixed(3)}). Si cambiaron los pesos medidos, el 10.71 hay que rehacerlo.`,
  );
const sinMedidas = filasLote.filter(
  (f) => f.peso === null && !clean(inv.rows[f.fila - 1]?.[colMedidas]),
);
// ¿El texto que se va a ANEXAR describe el método real, o dice que TODO el resto
// salió por mm²? Se chequea contra el texto, no se asume: si alguien vuelve a
// editar el payload, el aviso reaparece solo.
const textoNotas = clean(
  updates.find((u) => u.tabla === 'Lotes' && u.campo === 'notas')?.valorNuevo,
);
const declaraPorUnidad = /POR UNIDAD/i.test(textoNotas);
if (sinMedidas.length && !declaraPorUnidad)
  aviso(
    `⚠️ La nota que se ANEXA al lote atribuye TODO el resto a 0.01703 ct/mm², pero sólo las 2 de ` +
      `#506 salen por área: las ${BAGUETTES} baguettes se reconstruyen exacto con la tasa POR UNIDAD ` +
      `(${tasaUnidad.toFixed(5)} ct/ud = ${ctMedidos.toFixed(2)}/${udsMedidas}), y ` +
      `${sinMedidas.reduce((s, f) => s + f.cant, 0)} unidades de C-068 (#${sinMedidas.map((f) => f.item).join(', #')}) ` +
      `NO tienen medidas cargadas, así que por área no se las podría estimar ni queriendo. ` +
      `El número 10.71 está bien; el MÉTODO quedaría mal escrito en el SOT. Decidilo antes del --apply.`,
  );
else if (declaraPorUnidad)
  aviso(
    `La nota que se ANEXA declara los DOS tramos del estimado (área para #506, por unidad para las ` +
      `${BAGUETTES} baguettes) y ambos se reconstruyen desde la hoja, así que el 10.71 queda auditable. ` +
      `Queda en pie que ${sinMedidas.reduce((s, f) => s + f.cant, 0)} unidades ` +
      `(#${sinMedidas.map((f) => f.item).join(', #')}) siguen SIN medidas cargadas: cargarlas es lo que ` +
      `permitiría estimar por área de verdad el día que haga falta.`,
  );
const tarifaNueva = costoLote / pesoNuevo;
console.log(
  `   tarifa resultante: ${cop(costoLote)} / ${pesoNuevo} ct = ${cop(Math.round(tarifaNueva))}/ct ` +
    `(el payload declara ${cop(PAYLOAD.fase2_recosteo_BLOQUEADO?.tarifa ?? 0)}/ct)`,
);
console.log(
  `   reparto de hoy: ${cop(costoLote)} / ${unidadesDeclaradas} uds = ` +
    `${cop(costoLote / unidadesDeclaradas)} por unidad, parejo`,
);

// ─── Diff a la vista ──────────────────────────────────────────────────────
console.log(`\n\n═══ DIFF COMPLETO — ${escrituras.length} escrituras ═══\n`);
const GRUPOS = [
  ['Lotes · peso', (e) => e.campo === 'pesoTotalQuilates'],
  ['Lotes · notas (se ANEXA)', (e) => e.campo === 'notas'],
  ['Inventario · cantidades', (e) => e.campo === 'Cant.'],
  ['Inventario · pesos', (e) => e.campo === 'Peso (ct)'],
  [
    'Inventario · mostrarEnCatalogo (col Y — NO despublica)',
    (e) => e.campo === 'mostrarEnCatalogo',
  ],
  [
    'Inventario · observaciones (col AA — se ANEXA)',
    (e) => e.campo === 'observacion',
  ],
];
const resumen = {};
for (const [titulo, test] of GRUPOS) {
  const lista = escrituras.filter(test);
  resumen[titulo] = lista.length;
  if (!lista.length) continue;
  console.log(`── ${titulo} (${lista.length}) ──`);
  for (const e of lista) {
    console.log(
      `   ${e.tabla}/${String(e.id).padEnd(6)} f${String(e.fila).padEnd(4)} ${e.col.padStart(2)} ${e.campo}`,
    );
    console.log(
      `      actual : ${corta(e.actual) || '(vacío)'}   [${clean(e.actual) === '' ? 'vacío' : typeof e.actual}]`,
    );
    console.log(
      `      nuevo  : ${corta(e.objetivo) || '(vacío)'}   [${typeof e.objetivo}]`,
    );
    if (e.correccionDeTipo)
      console.log(
        `      ⚠️ CORRECCIÓN DE TIPO: ${e.correccionDeTipo} — el valor numérico no cambia, el tipo sí.`,
      );
    if (e.anexo) console.log(`      anexo  : ${e.anexo}`);
    if (e.campo === 'notas' || e.campo === 'observacion')
      console.log(`      TEXTO FINAL COMPLETO:\n         ${clean(e.valor)}`);
    if (e.nota) console.log(`      por qué: ${corta(e.nota, 120)}`);
  }
  console.log('');
}

// ─── Resumen por tipo ─────────────────────────────────────────────────────
console.log('═══ RESUMEN POR TIPO ═══');
for (const [t, n] of Object.entries(resumen))
  if (n) console.log(`   ${t}: ${n}`);
console.log(`   Altas: 0 (esta corrida es sólo updates)`);
console.log(
  `   Fase 2 (recosteo): ${(PAYLOAD.fase2_recosteo_BLOQUEADO?.preview || []).length} filas ` +
    `BLOQUEADAS — no se escribe ninguna.`,
);
const retiros = escrituras.filter(
  (e) => e.campo === 'Cant.' && aNumero(e.objetivo) === 0,
);
console.log(
  `   Consumos totales (cant → 0 · fila y QR vivos · costo intacto): ` +
    `${retiros.map((r) => '#' + r.id).join(', ') || '(ninguno)'}`,
);

// Efecto sobre los invariantes DESPUÉS de escribir.
const cantDespues = new Map(filasLote.map((f) => [f.item, f.cant]));
for (const e of retiros) cantDespues.set(e.id, 0);
const sumaCantDespues = [...cantDespues.values()].reduce((a, b) => a + b, 0);
console.log(
  `   Σ Cant. de ${LOTE}: ${sumaCant} → ${sumaCantDespues} (unidadesDeclaradas sigue en ${unidadesDeclaradas})`,
);
console.log(
  `   Σ costoBaseCOP de ${LOTE}: ${cop(sumaCosto)} → ${cop(sumaCosto)} (sin cambios: ninguna escritura toca costos) ✓`,
);

if (omitidos.length) {
  console.log(
    `\n── Updates del payload que NO se escriben (${omitidos.length}) ──`,
  );
  for (const o of omitidos)
    console.log(
      `   ${o.tabla}/${String(o.id).padEnd(6)} ${o.col} ${o.campo}: ${o.motivo}\n` +
        `      actual : ${corta(o.actual) || '(vacío)'}\n` +
        `      payload: ${corta(o.valor) || '(vacío)'}`,
    );
}

if (derivas.length) {
  console.log(
    `\n── ⚠️ Deriva: la hoja no dice lo que el documento esperaba (${derivas.length}) ──`,
  );
  for (const d of derivas)
    console.log(
      `   ${d.tabla}/${String(d.id).padEnd(6)} ${d.col} ${d.campo}\n` +
        `      se esperaba  : ${corta(d.esperado) || '(vacío)'}\n` +
        `      la hoja dice : ${corta(d.actual) || '(vacío)'}\n` +
        `      se escribirá : ${corta(d.valor) || '(vacío)'}`,
    );
}

// ─── Fase 2 — se imprime, NO se escribe ───────────────────────────────────
const f2 = PAYLOAD.fase2_recosteo_BLOQUEADO;
if (f2) {
  console.log(`\n═══ ⛔ FASE 2 · RECOSTEO — BLOQUEADA, NO SE ESCRIBE ═══`);
  console.log(`   motivo    : ${f2.motivo}`);
  console.log(`   desbloquea: ${f2.desbloquea}`);
  console.log(
    `\n   ${'item'.padEnd(6)}${'ct'.padEnd(7)}${'costo hoy'.padStart(12)}${'con tarifa'.padStart(13)}${'delta'.padStart(11)}`,
  );
  let sCt = 0;
  let sHoy = 0;
  let sNuevo = 0;
  for (const p of f2.preview) {
    sCt += p.ct;
    sHoy += p.costoActual;
    sNuevo += p.costoNuevo;
    console.log(
      `   #${String(p.itemId).padEnd(5)}${String(p.ct).padEnd(7)}${cop(p.costoActual).padStart(12)}` +
        `${cop(p.costoNuevo).padStart(13)}${cop(p.delta).padStart(11)}`,
    );
  }
  console.log(
    `   ${'Σ'.padEnd(6)}${sCt.toFixed(2).padEnd(7)}${cop(sHoy).padStart(12)}${cop(sNuevo).padStart(13)}${cop(sNuevo - sHoy).padStart(11)}`,
  );
  console.log(
    `   → quedarían ${cop(costoLote - sNuevo)} del lote SIN REPARTIR entre las ` +
      `${unidadesDeclaradas - udsMedidas} unidades restantes.`,
  );
  // Los ct del preview tienen que ser los que la hoja ya tiene medidos.
  const desalineados = f2.preview.filter((p) => {
    const f = filasLote.find((x) => x.item === String(p.itemId));
    return !f || f.peso === null || Math.abs(f.peso - p.ct) > 0.0005;
  });
  console.log(
    `   contraste con la hoja: ${f2.preview.length - desalineados.length}/${f2.preview.length} ` +
      `ítems del preview tienen ese mismo ct medido en '${TAB_INV}' ` +
      `${desalineados.length ? '⚠️ ' + desalineados.map((d) => '#' + d.itemId).join(', ') : '✓'}`,
  );
}

// ─── El envío a producción — para el registro, no para escribir ───────────
const env = PAYLOAD.envioProduccion;
if (env) {
  console.log(
    `\n═══ ENVÍO A PRODUCCIÓN ${env.fecha} — REGISTRO, NO SE ESCRIBE ═══`,
  );
  let piezas = 0;
  for (const d of env.destinos) {
    piezas += d.piezas;
    console.log(
      `   ${String(d.piezas).padStart(3)} pz  ${String(d.pesoCt ?? '—').padStart(5)} ct  ` +
        `${d.destino}\n        ${d.detalle}`,
    );
  }
  console.log(
    `   ${String(piezas).padStart(3)} pz  del lote ${env.lote} ` +
      `(unidadesDeclaradas ${unidadesDeclaradas} ${piezas === unidadesDeclaradas ? '✓ el lote entero sale a producción' : '⚠️ no coincide'})`,
  );
  console.log(
    `   + 1 pz  MATERIAL DE TERCERO — ${env.materialDeTercero.descripcion}\n` +
      `        ${env.materialDeTercero.regla}`,
  );
  console.log(`   = ${env.totalPiezas} piezas físicas en el taller.`);
  console.log(
    `\n   Aparte del lote (NO se toca en esta corrida): el dije lleva #${env.dijeAparte.items.join(' y #')}.\n` +
      `        ${env.dijeAparte.detalle}`,
  );
}

// ─── Avisos ───────────────────────────────────────────────────────────────
aviso(
  `Σ Cant. de ${LOTE} queda en ${sumaCantDespues} mientras unidadesDeclaradas sigue en ` +
    `${unidadesDeclaradas}. Es DELIBERADO y es la cara visible del pendiente 4: las ${piezasEnvio()} ` +
    `piezas del envío son el lote ENTERO, pero sólo #506 se descuenta porque es el único consumo ` +
    `del que se sabe qué fila lo aporta. Hasta resolver el pendiente 4, la hoja va a decir que ` +
    `quedan ${sumaCantDespues} unidades de un lote que está entero en el taller.`,
);
function piezasEnvio() {
  return (env?.destinos || []).reduce((s, d) => s + d.piezas, 0);
}
aviso(
  `#506 conserva costoBaseCOP ${cop(30625)} con Cant. 0 — es a propósito: la fila es la única ` +
    `traza del costo de esas 2 piedras y por eso Σ costoBaseCOP sigue cerrando exacto contra ` +
    `${cop(costoLote)}. No la borres ni le pongas costo 0.`,
);
aviso(
  `El peso pasa a ${pesoNuevo} ct pero los costos por ítem NO se re-derivan: el lote sigue ` +
    `repartido por unidad a ${cop(costoLote / unidadesDeclaradas)}. Mientras la Fase 2 esté ` +
    `bloqueada, pesoTotalQuilates y costoBaseCOP cuentan historias distintas. Es el estado ` +
    `intermedio que el prompt eligió a propósito.`,
);
aviso(
  `Y "mostrarEnCatalogo" se escribe como BOOLEANO false, no como el string "FALSE": la columna ` +
    `guarda booleanos reales (#485 hoy vale true). Escribir el string dejaría un tipo distinto al ` +
    `del resto de la columna. Y NO despublica nada — ver el bloque de Convex más abajo.`,
);
if (avisos.length) {
  console.log('\n═══ ADVERTENCIAS ═══');
  avisos.forEach((a, i) => console.log(`   ${i + 1}. ${a}`));
}

// ─── Lo que la hoja NO puede hacer ────────────────────────────────────────
console.log('\n═══ LO QUE ESTA CORRIDA **NO** RESUELVE ═══');
console.log(
  `   1. Publicación. mostrarEnCatalogo está EXCLUIDA del pull desde el 2026-07-30\n` +
    `      (convex/_lib/sheetPullMaps.ts, spec INVENTORY): la dirección es Convex → hoja.\n` +
    `      Escribir la col Y es cosmético. Se publica/despublica DESDE LA APP, o no pasa nada.\n` +
    `\n` +
    `      ESTADO REAL verificado el 2026-08-13 contra el deployment NUEVO valuable-mule-753,\n` +
    `      leyendo la TABLA CRUDA (npx convex data productInventory), no una query:\n` +
    `        · #506 → mostrarEnCatalogo: false. NO está publicado. No hay nada que despublicar.\n` +
    `        · pero 13 filas de ${LOTE} SÍ están publicadas, 42 unidades en total:\n` +
    `          #496(10) #498(2) #499(8) #500(6) #531(1) #532(3) #533(2) #534(2)\n` +
    `          #535(1) #536(1) #537(2) #538(2) #539(2)\n` +
    `        · y las 48 piezas del lote están FÍSICAMENTE EN EL TALLER (ver el envío arriba).\n` +
    `\n` +
    `      ⚠️ Eso es catálogo vendible sobre piedras que ya no están: el mismo riesgo de\n` +
    `      doble venta que motivó despublicar #93, #501, #504 y #218 en las corridas previas.\n` +
    `      publishedCatalog filtra por mostrarEnCatalogo y loteId, NO por cantidad, así que\n` +
    `      bajar Cant. no las saca de la vitrina. Esta corrida NO lo toca — está fuera de su\n` +
    `      alcance y no se arregla desde la hoja — pero es la decisión más urgente del lote.\n` +
    `\n` +
    `      OJO al verificar: products:publishedCatalog NO devuelve loteId (lo filtra pero no lo\n` +
    `      proyecta), así que filtrar su salida por loteId da CERO y parece que no hay nada\n` +
    `      publicado. Verificá contra la tabla cruda o por itemId.`,
);
console.log(
  `   2. El recosteo (Fase 2). Espera a que se pesen las 17 baguettes de anillo.`,
);
console.log(
  `   3. Descontar cantidad de #496 / #499 / #500. Falta saber qué fila aporta\n` +
    `      cuántas piedras a cada destino — pendiente 4.`,
);
console.log(
  `   4. Registrar el envío en algún lado del sistema. No hay concepto de "envío a\n` +
    `      producción" ni de material de tercero: la piedra de Isa vive sólo en esta nota.`,
);

// ─── Pendientes: se reproducen, NO se resuelven ───────────────────────────
console.log(
  '\n═══ PENDIENTES (se reproducen tal cual, no se resuelven acá) ═══',
);
console.log(
  `   1. Pesar las 17 baguettes de anillo. Es lo único que desbloquea la Fase 2.\n` +
    `      Hoy la hoja tiene peso medido en ${medidos.length} filas (${udsMedidas} de ` +
    `${unidadesDeclaradas} unidades): #${medidos.map((m) => m.item).join(', #')}.`,
);
console.log(
  `   2. ¿De qué destino salieron las 2 que pasaron a topitos? Eran 6 artesanal + 13 Joshua = 19;\n` +
    `      ahora son 17. Para el total da igual, para el descuento fila por fila no.`,
);
console.log(
  `   3. #505 es casi gemelo de #506 — confirmar que se agarró el que era.\n` +
    `      Contraste leído de la hoja ahora mismo:`,
);
for (const id of ['505', '506']) {
  const f = inv.filaDe.get(id);
  const val = (cab) =>
    clean(inv.rows[f - 1]?.[inv.idxDeCabecera(cab)]) || '(vacío)';
  console.log(
    `        #${id} f${f}: "${val('Nombre')}" · ${val('Medidas')} · cant ${val('Cant.')} · ` +
      `${val('Categoría')} · ${val('Calidad')} · ${cop(aNumero(inv.rows[f - 1]?.[colCosto]))}`,
  );
}
console.log(
  `      Lo único que los distingue en la hoja son 0,1 mm y el Nombre. Decidir por la piedra, no por la fila.`,
);
console.log(
  `   4. Qué fila de C-068 aporta cuántas piedras a cada destino. Sin eso no se puede\n` +
    `      descontar cantidad de #496 (10 uds), #499 (8) y #500 (6).`,
);
console.log(
  `   5. El precio también baja. Si esos ítems tienen precioFinalCOP derivado de un costo\n` +
    `      inflado, bajar el costo sin revisar el precio deja un margen que no era el previsto.\n` +
    `      Estado de precio de los 8 ítems de la Fase 2, leído de la hoja ahora mismo:`,
);
{
  const colPrecio = inv.idxDeCabecera('precioFinalCOP');
  let conPrecio = 0;
  for (const p of PAYLOAD.fase2_recosteo_BLOQUEADO?.preview || []) {
    const f = inv.filaDe.get(String(p.itemId));
    const precio = f ? aNumero(inv.rows[f - 1]?.[colPrecio]) || 0 : 0;
    if (precio) conPrecio++;
    console.log(
      `        #${String(p.itemId).padEnd(4)} costo ${cop(p.costoActual).padStart(9)} · ` +
        `precio ${precio ? cop(precio).padStart(10) : '(vacío)'.padStart(10)}` +
        (precio ? ` · múltiplo ${(precio / p.costoActual).toFixed(2)}×` : ''),
    );
  }
  console.log(
    `      → ${conPrecio}/8 tienen precioFinalCOP cargado. ` +
      (conPrecio
        ? `Esos son los que hay que revisar si la Fase 2 se desbloquea.\n` +
          `        OJO con el enunciado del pendiente: esos precios NO están "derivados del costo".\n` +
          `        Los múltiplos van de 3,57× a 17,51×, así que son precios puestos a mano, no\n` +
          `        costo × 2,6. Bajar el costo no los rompe mecánicamente — cambia el margen que\n` +
          `        reportan, que es harina de otro costal y hay que decidirlo pieza por pieza.\n` +
          `        Los ${8 - conPrecio} sin precio son el caso limpio: ponerles precio ANTES de recostear\n` +
          `        sería derivarlo de un costo que ya se sabe inflado.`
        : `NINGUNO tiene precio, así que hoy el pendiente 5 no muerde: no hay margen que revisar\n` +
          `        todavía. Muerde el día que se les ponga precio — ponerlo ANTES de recostear\n` +
          `        significa derivarlo de un costo que ya se sabe inflado.`),
  );
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
      'Para aplicar: node scripts/aplicar-produccion-c068-20260812.mjs --apply\n',
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

// Con el anexado idempotente, una segunda corrida deja `escrituras` vacío.
// Cortar acá evita mandarle `data: []` al batchUpdate.
if (!escrituras.length) {
  console.log(
    '\nNo hay nada que escribir: la hoja ya está en el estado que pide el payload.\n' +
      'Si esperabas cambios, revisá el bloque de omitidos de arriba.\n',
  );
  process.exit(0);
}

// ── Backup: filas COMPLETAS de ambas pestañas antes de tocar nada ─────────
const ts = new Date().toISOString().replace(/[:.]/g, '-');
mkdirSync(new URL('./.backups/', import.meta.url), { recursive: true });
const backupPath = new URL(
  `./.backups/produccion-c068-${ts}.json`,
  import.meta.url,
);
const filasPorTabla = {};
for (const tab of [TAB_LOTES, TAB_INV]) {
  const t = T[tab];
  filasPorTabla[tab] = [
    ...new Set(escrituras.filter((e) => e.tabla === tab).map((e) => e.fila)),
  ]
    .sort((a, b) => a - b)
    .map((f) => ({
      fila: f,
      clave: clean(t.rows[f - 1]?.[t.colClave]),
      valores: t.rows[f - 1],
    }));
}
writeFileSync(
  backupPath,
  JSON.stringify(
    {
      proposito:
        'Estado PREVIO de todo lo que toca aplicar-produccion-c068-20260812.mjs',
      spreadsheetId: SOT3,
      generado: new Date().toISOString(),
      cabeceras: { Lotes: T.Lotes.headers, Inventario: T.Inventario.headers },
      filas: filasPorTabla,
      invariantesPrevios: {
        loteCostoTotalCOP: costoLote,
        sumaCostoItems: sumaCosto,
        sumaCantItems: sumaCant,
        unidadesDeclaradas,
        pesoTotalQuilatesPrevio: aNumero(
          lotes.rows[filaLote - 1]?.[lotes.COL.pesoTotalQuilates],
        ),
      },
      escriturasPlaneadas: escrituras.map((e) => ({
        tabla: e.tabla,
        clave: e.id,
        fila: e.fila,
        columna: e.col,
        campo: e.campo,
        actual: e.actual ?? '',
        nuevo: e.objetivo,
      })),
    },
    null,
    2,
  ),
);
console.log(`\nBackup → ${backupPath.pathname}`);

// ── Escritura, celda por celda ───────────────────────────────────────────
// Se manda `e.objetivo`, el MISMO valor tipado que el diff mostró arriba: no
// hay una segunda conversión que pueda diferir de lo que se revisó.
// RAW, no USER_ENTERED: el 0 tiene que llegar como el número 0 y el booleano
// como booleano, sin que la hoja reinterprete nada por el camino.
await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SOT3,
  requestBody: {
    valueInputOption: 'RAW',
    data: escrituras.map((e) => ({
      range: `'${e.tabla}'!${e.col}${e.fila}`,
      values: [[e.objetivo]],
    })),
  },
});
for (const tab of [TAB_LOTES, TAB_INV])
  console.log(
    `  ${tab}: ${escrituras.filter((e) => e.tabla === tab).length} celdas`,
  );

// ── Verificación: releer y ubicar por cabecera ───────────────────────────
// `syncStatus: 'synced'` no prueba aterrizaje; leer la hoja de vuelta, sí.
const [invV, lotesV] = await Promise.all([
  sheets.spreadsheets.values.get({
    spreadsheetId: SOT3,
    range: `'${TAB_INV}'!A1:CX600`,
    valueRenderOption: 'UNFORMATTED_VALUE',
  }),
  sheets.spreadsheets.values.get({
    spreadsheetId: SOT3,
    range: `'${TAB_LOTES}'!A1:BZ300`,
    valueRenderOption: 'UNFORMATTED_VALUE',
  }),
]);
const V = {
  Inventario: cargarTabla(TAB_INV, invV),
  Lotes: cargarTabla(TAB_LOTES, lotesV),
};

let fallas = 0;
for (const e of escrituras) {
  const t = V[e.tabla];
  // Re-resolver la columna por cabecera al releer: si se movió, lo detectamos.
  const colIdx2 = t.COL[e.campo];
  if (colIdx2 !== e.colIdx) {
    fallas++;
    console.error(
      `  ✗ ${e.tabla} · la cabecera "${e.campo}" se movió de ${colLetter(e.colIdx)} a ${colLetter(colIdx2)} durante la corrida.`,
    );
    continue;
  }
  const f = t.filaDe.get(e.id);
  const leido = f ? t.rows[f - 1]?.[colIdx2] : undefined;
  if (!mismoValor(leido, e.objetivo)) {
    fallas++;
    console.error(
      `  ✗ ${e.tabla}/${e.id} ${e.col} ${e.campo}: esperaba "${corta(e.objetivo)}" y leí "${corta(leido)}"`,
    );
    continue;
  }
  // El valor puede coincidir y el TIPO no: es justo el caso de #485 ("0,74"
  // texto vs 0.74 número). Verificar sólo el valor daría por buena la corrección
  // que no ocurrió.
  if (typeof leido !== typeof e.objetivo) {
    fallas++;
    console.error(
      `  ✗ ${e.tabla}/${e.id} ${e.col} ${e.campo}: el valor coincide pero el TIPO no — ` +
        `esperaba ${typeof e.objetivo} y leí ${typeof leido} (${JSON.stringify(leido)}).`,
    );
  }
}

// Los dos hechos que el prompt pide confirmar, chequeados uno por uno.
const pesoLeido =
  V.Lotes.rows[V.Lotes.filaDe.get(LOTE) - 1]?.[V.Lotes.COL.pesoTotalQuilates];
const cantLeida =
  V.Inventario.rows[V.Inventario.filaDe.get('506') - 1]?.[
    V.Inventario.COL['Cant.']
  ];
const cantEsCeroLiteral = typeof cantLeida === 'number' && cantLeida === 0;
console.log(
  `\n── Verificación (releyendo y ubicando por cabecera) ──\n` +
    `   escrituras verificadas : ${escrituras.length - fallas}/${escrituras.length}\n` +
    `   ${LOTE} pesoTotalQuilates : ${pesoLeido} ${mismoValor(pesoLeido, pesoNuevo) ? '✓' : '✗'}\n` +
    `   #506 Cant.               : ${JSON.stringify(cantLeida)} ` +
    `${cantEsCeroLiteral ? '✓ es un 0 LITERAL (no una celda en blanco)' : '✗ NO es un 0 numérico — el pull lo va a SALTEAR'}`,
);
if (!cantEsCeroLiteral) {
  fallas++;
  console.error(
    `  ✗ La celda G de #506 no quedó como el número 0. coerceCell saltea la celda vacía\n` +
      `    ("never clear a number from a blanked cell"), así que el cambio NO llegaría a Convex\n` +
      `    y #506 seguiría en cantidad 2 allá, sin error visible.`,
  );
}
// Σ costoBaseCOP tiene que seguir cerrando: esta corrida no toca costos.
const invV2 = V.Inventario;
const sumaCostoDespues = invV2.rows
  .slice(1)
  .filter((r) => clean(r?.[invV2.idxDeCabecera('loteId')]) === LOTE)
  .reduce(
    (s, r) => s + (aNumero(r[invV2.idxDeCabecera('costoBaseCOP')]) || 0),
    0,
  );
console.log(
  `   Σ costoBaseCOP de ${LOTE} : ${cop(sumaCostoDespues)} vs lote ${cop(costoLote)} ` +
    `${sumaCostoDespues === costoLote ? '✓ sigue cerrando exacto' : '✗ SE ROMPIÓ'}`,
);
if (sumaCostoDespues !== costoLote) fallas++;

if (fallas) {
  console.error(
    `\n❌ ${fallas} verificación(es) fallaron. Revisar con el backup.\n`,
  );
  process.exit(1);
}

console.log(
  '\n✅ La hoja quedó lista. FALTA LA MITAD EN CONVEX:\n' +
    '   1. En la hoja: menú «🔄 Convex Sync → Sincronizar todo (completo)».\n' +
    '      El trigger onEdit es SIMPLE y no dispara por API.\n' +
    '      Aterrizan: pesoTotalQuilates, notas, Cant., observacion, Peso (ct).\n' +
    '      NO aterriza: mostrarEnCatalogo (excluida del pull).\n' +
    '   2. Verificar en Convex — en el deployment NUEVO, `valuable-mule-753`.\n' +
    '      El viejo (grand-hippopotamus-162) sigue encendido y contesta datos casi\n' +
    '      idénticos: preguntarle por error no da error, da una respuesta equivocada.\n' +
    `      npx convex run products:getByItem '{"itemId":"506"}' --deployment-name valuable-mule-753\n` +
    '      → tiene que decir cantidad: 0.\n' +
    '      npx convex data lots --deployment-name valuable-mule-753 --limit 200 --format json\n' +
    `      → ${LOTE} tiene que decir pesoTotalQuilates: ${pesoNuevo}.\n` +
    '   3. Despublicar #506 DESDE LA APP si estuviera publicado. La col Y no lo hace.\n',
);
