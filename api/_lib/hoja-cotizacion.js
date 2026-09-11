/**
 * Partes puras de la hoja de cálculo de una cotización, separadas para poder
 * probarlas sin Drive ni Sheets.
 *
 * Hermana de `deck-upload.js`: el deck es la lámina que ve el cliente, esta hoja
 * es la tabla que el asesor manipula. Comparten carpeta de Drive, así que lo
 * primero que define este módulo es un nombre que NO colisione con el del deck
 * (ver `nombreHoja`).
 *
 * Regla que manda sobre todo lo demás: **aquí no se hace aritmética de dinero**.
 * Los precios llegan ya formateados en pesos colombianos desde el bot
 * (`$7'907.465` — apóstrofo para los millones, punto para los miles), y se
 * escriben tal cual. Es lo mismo que exige el render en Python
 * (`scripts/cotizacion_quote.py`): la hoja no puede contradecir al mensaje de
 * Telegram.
 */
import { escapaParaQuery } from './deck-upload.js';

export const MIME_SHEETS = 'application/vnd.google-apps.spreadsheet';

/**
 * Encabezado de la tabla. Exportado porque el test lo compara y porque define
 * el ancho de fila (8 columnas) que respetan tanto los ítems como el total.
 */
export const ENCABEZADOS = [
  'Línea',
  'Ítem',
  'Nombre',
  'Gemas',
  'Joya',
  'Unidades',
  'Precio por Unidad',
  'Precio Total',
];

/**
 * Nombre estable: es la llave de deduplicación cuando se re-genera la misma
 * cotización.
 *
 * El prefijo NO puede ser `Cotizacion-`: ese nombre es el del deck
 * (`nombreDeck`), vive en la MISMA carpeta del asesor, y la deduplicación del
 * deck busca por nombre SIN filtro de mimeType. Con el mismo nombre, un
 * endpoint terminaría haciendo `files.update` sobre el archivo del otro —
 * pisando un .pptx con filas de hoja de cálculo, o al revés.
 */
export function nombreHoja(quotationNumber) {
  return `Hoja-Cotizacion-${quotationNumber}`;
}

/**
 * Query `q` de Drive para encontrar una hoja previa de esta cotización.
 *
 * Dos cinturones contra la colisión con el deck: el nombre distinto (arriba) y
 * el filtro de `mimeType` de aquí. El filtro es el que sobrevive si alguien
 * algún día cambia un prefijo sin leer este comentario.
 *
 * El valor va escapado con `escapaParaQuery` del `_lib` compartido —
 * reutilizado, no recopiado: escapa la barra ANTES que la comilla, y ese orden
 * es todo el punto (ver su docstring en `deck-upload.js`).
 */
export function consultaHoja(nombre, folderId) {
  return (
    `name = '${escapaParaQuery(nombre)}' and '${folderId}' in parents and ` +
    `mimeType = '${MIME_SHEETS}' and trashed = false`
  );
}

/**
 * Rango exacto que ocupan las filas, en notación A1 SIN nombre de pestaña —
 * así apunta a la primera hoja del archivo, que es la única que crea Drive y
 * cuyo título depende del locale de la cuenta (`Sheet1` / `Hoja 1`).
 *
 * Se calcula en vez de escribir en `A1` a secas: el rango explícito deja el
 * tamaño del write dicho en el request, no dependiente de que la API lo
 * expanda.
 *
 * @param {string[][]} filas
 */
export function rangoDeEscritura(filas) {
  if (!filas.length) {
    // Sin filas no hay rango válido: 'A1:A0' es un 400 de la API de Sheets, y llegar acá
    // significa que el llamador se saltó la validación de `filasDeCotizacion`.
    throw new Error('rango de escritura sin filas');
  }
  const ancho = Math.max(1, ...filas.map((f) => f.length));
  // Base-26 de verdad. `String.fromCharCode(64 + ancho)` devolvía '[' en la columna 27, o sea
  // el rango inválido 'A1:[1'. Hoy la hoja tiene 8 columnas fijas, pero esta función es un
  // helper exportado de propósito general: la columna que alguien agregue pasada la Z no puede
  // costar un 400 que nadie sepa leer.
  let n = ancho;
  let ultimaCol = '';
  while (n > 0) {
    const resto = (n - 1) % 26;
    ultimaCol = String.fromCharCode(65 + resto) + ultimaCol;
    n = Math.floor((n - resto - 1) / 26);
  }
  return `A1:${ultimaCol}${filas.length}`;
}

/**
 * Unidades de un ítem: ausente = 1, igual que el render en Python.
 *
 * RECHAZA en vez de convertir. `Number('')` es 0, `Number(true)` es 1 y `Number([3])` es 3:
 * pasar por `Number.isFinite` a secas dejaba entrar los tres, y un `unidades: ''` salía como
 * una hoja que dice «0 unidades» —y un plan de unidades entero mal sumado— en vez de un 400.
 * La regla es la misma que `quote.ts` aplica del lado del bot: no se inventa una cantidad.
 */
function unidadesDe(item) {
  const crudo = item.unidades;
  if (crudo === undefined || crudo === null) return 1;
  const invalido =
    typeof crudo !== 'number' || !Number.isInteger(crudo) || crudo <= 0;
  if (invalido) {
    throw new Error(
      `unidades inválidas en el ítem ${item.nombre ?? item.itemNumber ?? '?'}: ${JSON.stringify(crudo)}`,
    );
  }
  return crudo;
}

function textoDe(valor) {
  return valor == null ? '' : String(valor);
}

/**
 * Cotización → filas de la hoja: encabezado + un ítem por fila + fila de total.
 *
 * Todas las celdas son strings, y se escriben con `valueInputOption: 'RAW'`
 * justamente porque los precios ya vienen formateados: con `USER_ENTERED`,
 * Sheets reinterpreta `$7'907.465` (lo toma como texto raro, o peor, se come el
 * apóstrofo inicial que en Sheets significa «esto es texto»).
 *
 * Lanza en vez de inventar: una cotización sin ítems, un ítem sin precio o un
 * total ausente no producen una hoja a medias — el handler lo traduce a 400.
 *
 * @param {object} quote  el mismo `quote.json` que consume el render del deck
 * @returns {string[][]}
 */
export function filasDeCotizacion(quote) {
  const items = quote?.items ?? [];
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('cotización sin ítems: no hay nada que cotizar');
  }

  const total = textoDe(quote?.total).trim();
  if (!total) {
    throw new Error('cotización sin total: no se escribe una hoja a medias');
  }

  // COPIA, no la constante exportada: devolverla por referencia deja que cualquiera que
  // toque una celda del encabezado corrompa `ENCABEZADOS` para todas las llamadas siguientes
  // del mismo lambda tibio — y vuelve tautológica cualquier prueba que compare las dos.
  const filas = [[...ENCABEZADOS]];
  let unidadesPlan = 0;

  items.forEach((item, i) => {
    const nombre = textoDe(item?.nombre).trim();
    const unitario = textoDe(item?.unitario).trim();
    const totalLinea = textoDe(item?.total).trim();
    const etiqueta = nombre || textoDe(item?.itemNumber) || `#${i + 1}`;

    if (!nombre) {
      throw new Error(`ítem ${i + 1} sin nombre: no se escribe la fila`);
    }
    if (!unitario || !totalLinea) {
      throw new Error(`ítem ${etiqueta} sin precio: no se escribe la fila`);
    }

    const unidades = unidadesDe(item ?? {});
    unidadesPlan += unidades;

    filas.push([
      String(i + 1).padStart(2, '0'),
      textoDe(item?.itemNumber),
      nombre,
      textoDe(item?.gemas),
      textoDe(item?.joya),
      String(unidades),
      unitario,
      totalLinea,
    ]);
  });

  // Fila de cierre: el total viaja tal cual llegó. Las unidades sí se suman —
  // eso es conteo, no dinero, y no puede contradecir ningún precio.
  filas.push(['', '', 'TOTAL', '', '', String(unidadesPlan), '', total]);

  return filas;
}
