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
