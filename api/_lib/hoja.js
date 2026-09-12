/**
 * Partes puras de `/api/hoja`, separadas para poder probarlas sin Drive ni
 * Sheets.
 *
 * El endpoint es GENÉRICO a propósito: no sabe qué es una cotización, ni un
 * gasto, ni un inventario. Anima lee la solicitud del dueño, diseña las
 * columnas ella misma y manda `titulo` + `columnas` + `filas`. Por eso aquí no
 * hay ningún encabezado fijo ni ninguna aritmética: este módulo valida la
 * forma de lo que llega y lo convierte en una matriz de texto.
 *
 * Dos reglas que mandan sobre la comodidad:
 *
 *  1. **Aquí no se hace aritmética de dinero, ni se reinterpreta nada.** Los
 *     valores pueden llegar ya formateados en pesos colombianos
 *     (`$7'907.465` — apóstrofo para los millones, punto para los miles) y se
 *     escriben tal cual, con `valueInputOption: 'RAW'`. Con `USER_ENTERED`,
 *     Sheets se come el apóstrofo inicial (que para él significa «esto es
 *     texto») o convierte el valor en un número distinto del que dijo el bot.
 *  2. **Se rechaza en el borde, no se sanea en silencio.** Un título con `/`,
 *     una fila con más celdas que columnas o un correo que no es correo salen
 *     como 400 con el motivo en español, no como una hoja a medias que el
 *     dueño descubre tres días después.
 */
import { escapaParaQuery } from './deck-upload.js';

export const MIME_SHEETS = 'application/vnd.google-apps.spreadsheet';
export const MIME_CARPETA = 'application/vnd.google-apps.folder';

/** Nombre de la carpeta HERMANA de `cotizaciones`: mismo padre, el Shared Drive. */
export const CARPETA_HOJAS = 'hojas';

export const TITULO_MAX = 100;

/**
 * Prohibidos en el título. Es la lista que Sheets rechaza en el nombre de una
 * pestaña (`[ ] : * ? / \`); `/` y `\` además son separadores de ruta y
 * ensucian el nombre del archivo en Drive.
 */
export const CARACTERES_PROHIBIDOS = ['[', ']', ':', '*', '?', '/', '\\'];

/**
 * Patrón de correo deliberadamente simple: algo, arroba, algo, punto, algo, y
 * ningún espacio en ninguna parte. No intenta implementar RFC 5322 — intenta
 * que `permissions.create` no falle con un 400 de Google después de haber
 * escrito la hoja, y que un `emailDestino` con espacios se rechace en vez de
 * recortarse.
 */
export const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Celda aceptable: primitivo. Un objeto o un arreglo anidado sale como `[object Object]`. */
function esCeldaValida(valor) {
  return (
    valor === null ||
    valor === undefined ||
    typeof valor === 'string' ||
    typeof valor === 'number' ||
    typeof valor === 'boolean'
  );
}

function textoDe(valor) {
  return valor === null || valor === undefined ? '' : String(valor);
}

/**
 * @param {unknown} titulo
 * @returns {string | null} motivo en español, o null si es válido
 */
export function validaTitulo(titulo) {
  // El «falta o está vacío» va PRIMERO: un título de solo espacios es un título
  // ausente, y decirle al que llama que «no puede terminar con espacios» lo
  // manda a arreglar lo que no es.
  if (typeof titulo !== 'string' || titulo.trim() === '') {
    return 'titulo es obligatorio: falta o está vacío';
  }
  // Un título con salto de línea o con un espacio al borde viaja tal cual al
  // nombre en Drive, y la identidad es por título EXACTO: «Gastos » y «Gastos»
  // serían dos archivos distintos por un carácter que nadie ve. Se RECHAZA en
  // vez de recortar, porque recortar cambiaría el título que el humano aprobó
  // en la tarjeta — y el título lo genera el modelo, no alguien que lo note.
  if (titulo !== titulo.trim())
    return 'el título no puede empezar ni terminar con espacios';
  if (/[\u0000-\u001f\u007f]/.test(titulo))
    return 'el título no puede llevar saltos de línea ni caracteres de control';
  if (titulo.length > TITULO_MAX) {
    return `titulo demasiado largo: máximo ${TITULO_MAX} caracteres, llegaron ${titulo.length}`;
  }
  const malos = CARACTERES_PROHIBIDOS.filter((c) => titulo.includes(c));
  if (malos.length > 0) {
    return `titulo con caracteres prohibidos (${malos.join(' ')}): no se permiten ${CARACTERES_PROHIBIDOS.join(' ')}`;
  }
  return null;
}

/**
 * @param {unknown} columnas
 * @returns {string | null}
 */
export function validaColumnas(columnas) {
  if (!Array.isArray(columnas) || columnas.length === 0) {
    return 'columnas es obligatorio: hace falta al menos una columna';
  }
  for (let i = 0; i < columnas.length; i++) {
    const col = columnas[i];
    if (typeof col !== 'string') {
      return `columna ${i + 1} inválida: debe ser texto`;
    }
    if (textoDe(col).trim() === '') {
      return `columna ${i + 1} vacía: cada columna necesita nombre`;
    }
  }
  return null;
}

/**
 * Valida las filas CONTRA las columnas: una fila más ancha que el encabezado
 * escribiría celdas sin título, que es exactamente el dato que después nadie
 * sabe leer. Más corta sí se acepta — son celdas vacías al final.
 *
 * @param {unknown} filas
 * @param {unknown[]} columnas  ya validadas
 * @returns {string | null}
 */
export function validaFilas(filas, columnas) {
  if (!Array.isArray(filas) || filas.length === 0) {
    return 'filas es obligatorio: hace falta al menos una fila';
  }
  const ancho = columnas.length;
  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    if (!Array.isArray(fila)) {
      return `fila ${i + 1} inválida: debe ser un arreglo de celdas`;
    }
    if (fila.length > ancho) {
      return `fila ${i + 1} tiene ${fila.length} celdas y solo hay ${ancho} columnas`;
    }
    for (let j = 0; j < fila.length; j++) {
      if (!esCeldaValida(fila[j])) {
        return `celda ${j + 1} de la fila ${i + 1} inválida: debe ser texto, número o booleano`;
      }
    }
  }
  return null;
}

/**
 * @param {unknown} emailDestino
 * @returns {string | null}
 */
export function validaCorreo(emailDestino) {
  if (typeof emailDestino !== 'string' || emailDestino.trim() === '') {
    return 'emailDestino es obligatorio: falta o está vacío';
  }
  if (!PATRON_CORREO.test(emailDestino)) {
    return `emailDestino inválido: "${emailDestino}" no parece un correo`;
  }
  return null;
}

/**
 * Valida el cuerpo completo y devuelve los campos ya con tipo.
 *
 * LANZA en vez de devolver un resultado-unión: el handler traduce el mensaje a
 * un 400 tal cual, así que el motivo en español vive en un solo lugar.
 *
 * @param {Record<string, unknown>} body
 * @returns {{ titulo: string, columnas: string[], filas: unknown[][], emailDestino: string }}
 */
export function validaSolicitud(body) {
  const { titulo, columnas, filas, emailDestino } = body ?? {};
  const motivo =
    validaTitulo(titulo) ??
    validaColumnas(columnas) ??
    validaFilas(filas, /** @type {unknown[]} */ (columnas)) ??
    validaCorreo(emailDestino);
  if (motivo) throw new Error(motivo);
  return {
    titulo: /** @type {string} */ (titulo),
    columnas: /** @type {string[]} */ (columnas),
    filas: /** @type {unknown[][]} */ (filas),
    emailDestino: /** @type {string} */ (emailDestino),
  };
}

/**
 * Encabezado + filas, todo como texto, listo para `values.update` con RAW.
 *
 * @param {unknown[]} columnas
 * @param {unknown[][]} filas
 * @returns {string[][]}
 */
export function matrizDeValores(columnas, filas) {
  return [columnas.map(textoDe), ...filas.map((fila) => fila.map(textoDe))];
}

/**
 * Rango exacto que ocupa la matriz, en notación A1 SIN nombre de pestaña — así
 * apunta a la primera hoja del archivo, que es la única que crea Drive y cuyo
 * título depende del locale de la cuenta (`Sheet1` / `Hoja 1`).
 *
 * @param {string[][]} matriz
 */
export function rangoDeEscritura(matriz) {
  if (!matriz.length) {
    // Sin filas no hay rango válido: 'A1:A0' es un 400 de la API de Sheets, y
    // llegar acá significa que el llamador se saltó `validaSolicitud`.
    throw new Error('rango de escritura sin filas');
  }
  const ancho = Math.max(1, ...matriz.map((f) => f.length));
  // Base-26 de verdad. `String.fromCharCode(64 + ancho)` devuelve '[' en la
  // columna 27, o sea el rango inválido 'A1:[1'. Como las columnas las diseña
  // Anima y no una constante de este repo, pasar de la Z es cuestión de tiempo.
  let n = ancho;
  let ultimaCol = '';
  while (n > 0) {
    const resto = (n - 1) % 26;
    ultimaCol = String.fromCharCode(65 + resto) + ultimaCol;
    n = Math.floor((n - resto - 1) / 26);
  }
  return `A1:${ultimaCol}${matriz.length}`;
}

/**
 * Query `q` de Drive para la carpeta `hojas`, HERMANA de `cotizaciones`: el
 * mismo padre, el Shared Drive.
 *
 * @param {string} sharedDriveId
 */
export function consultaCarpetaHojas(sharedDriveId) {
  return (
    `name = '${escapaParaQuery(CARPETA_HOJAS)}' and ` +
    `'${escapaParaQuery(sharedDriveId)}' in parents and ` +
    `mimeType = '${MIME_CARPETA}' and trashed = false`
  );
}

/**
 * Query `q` de Drive para encontrar una hoja previa con este título EXACTO.
 *
 * El filtro de `mimeType` NO es decorativo. La deduplicación del deck
 * (`cotizacion-deck.ts`) busca por nombre sin filtrar mimeType, y por eso un
 * nombre repetido puede hacer que un endpoint le haga `files.update` al archivo
 * de otro — pisando un .pptx con filas de hoja de cálculo, o al revés. Aquí el
 * título lo elige Anima, así que la colisión es todavía más barata: se filtra.
 *
 * El valor va escapado con `escapaParaQuery` del `_lib` compartido —
 * reutilizado, no recopiado: escapa la barra ANTES que la comilla, y ese orden
 * es todo el punto (ver su docstring en `deck-upload.js`).
 *
 * @param {string} titulo
 * @param {string} folderId
 */
export function consultaHoja(titulo, folderId, solicitante) {
  return (
    `name = '${escapaParaQuery(titulo)}' and ` +
    `'${escapaParaQuery(folderId)}' in parents and ` +
    `mimeType = '${MIME_SHEETS}' and trashed = false and ` +
    // El solicitante entra en la CLAVE, no solo en el permiso. La carpeta es
    // una sola para todos y los títulos los inventa el modelo: sin esto, dos
    // personas que pidan «Gastos septiembre 2026» comparten archivo y la
    // primera queda viendo los datos de la segunda con permiso de editor.
    `appProperties has { key = 'solicitante' and value = '${escapaParaQuery(solicitante)}' }`
  );
}
