/**
 * Partes puras de la subida del deck, separadas para poder probarlas sin Drive.
 *
 * La conversión a Slides nativas la dispara que el mimeType del requestBody
 * (Slides) sea distinto al del media (pptx). Es lo que deja los cuadros de
 * texto editables, que es el motivo de subir un .pptx y no un PDF.
 */
import { Readable } from 'stream';

export const MIME_SLIDES = 'application/vnd.google-apps.presentation';
export const MIME_PPTX =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

/** Nombre estable: es la llave de deduplicación cuando se re-genera la misma cotización. */
export function nombreDeck(quotationNumber) {
  return `Cotizacion-${quotationNumber}`;
}

/**
 * Escapa backslashes y comillas simples antes de interpolar en un query `q`
 * de Drive.
 *
 * El orden importa: hay que escapar `\` ANTES que `'`. Dentro de un string
 * `'...'` de la sintaxis de Drive, `\'` es una comilla literal y `\\` es una
 * barra literal. Si solo se escapara la comilla, un valor que termine en `\`
 * (p. ej. `a\`) produciría `name = 'a\'` — ese `\'` final se interpretaría
 * como comilla escapada y el string nunca cerraría, dejando el query
 * malformado (y, con más input detrás, inyectable). Escapar la comilla sin
 * escapar antes la barra es el bypass clásico.
 *
 * `nombreDeck` en sí no cambia (es el nombre real del archivo); esto solo se
 * aplica al valor que va dentro del string `q`. Ver también la validación en
 * `esNumeroValido` — capa primaria: rechazar en el borde en vez de confiar
 * solo en el escapado.
 */
export function escapaParaQuery(valor) {
  return valor.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Valida que un quotationNumber sea un identificador seguro (letras, dígitos,
 * guion y guion bajo) antes de usarlo en nombres de archivo o queries de
 * Drive.
 *
 * Capa primaria de defensa: rechazar en el borde es más fuerte que escapar
 * río abajo, y evita que basura (o un intento de inyección) llegue a crear
 * archivos con nombres raros en el Drive del dueño. El caller debe rechazar
 * (400), nunca sanear/recortar en silencio.
 */
export function esNumeroValido(quotationNumber) {
  return /^[A-Za-z0-9_-]+$/.test(quotationNumber);
}

export function construyeSubida(nombre, folderId, buffer) {
  return {
    requestBody: { name: nombre, mimeType: MIME_SLIDES, parents: [folderId] },
    media: { mimeType: MIME_PPTX, body: Readable.from(buffer) },
    supportsAllDrives: true,
    fields: 'id, webViewLink',
  };
}

/**
 * Crear o actualizar, según lo que ya haya en la carpeta.
 *
 * Un segundo «Sí» debe actualizar el mismo deck y no llenar la carpeta del
 * asesor de duplicados. Separado del handler para poder probarlo sin Drive.
 *
 * @param {Array<{id?: string | null}>} existentes  lo que devolvió files.list
 */
export function eligeOperacion(existentes) {
  const id = existentes?.[0]?.id;
  return id ? { tipo: 'actualizar', fileId: id } : { tipo: 'crear' };
}
