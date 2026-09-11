/**
 * Cotización Hoja API
 *
 * Hermana de `cotizacion-deck.ts`: recibe la cotización como JSON y deja una
 * hoja de cálculo de Google (Sheets nativo) en la MISMA carpeta del asesor que
 * ya usan el deck y `cotizacion-save`. El deck es lo que ve el cliente; esta
 * hoja es la tabla que el asesor manipula.
 *
 * Tres cosas que parecen detalle y no lo son:
 *
 *  1. El archivo se llama `Hoja-Cotizacion-<n>`, NUNCA `Cotizacion-<n>`: ese
 *     nombre es del deck, comparten carpeta, y la deduplicación del deck busca
 *     por nombre sin filtrar mimeType. Con el mismo nombre, un endpoint le hace
 *     `files.update` al archivo del otro.
 *  2. NO lleva `export const config = { api: { bodyParser: false } }`. Eso
 *     existe en el deck solo porque formidable necesita el stream crudo; aquí
 *     apagaría el parser y `req.body` llegaría `undefined`, con todos los
 *     campos leyéndose como ausentes en silencio.
 *  3. Se escribe con `valueInputOption: 'RAW'`. Los precios llegan ya
 *     formateados en pesos colombianos (`$7'907.465`); con `USER_ENTERED`
 *     Sheets los reinterpreta.
 *
 * Igual que el deck: lo llama el bot y crea archivos en el Shared Drive, así que
 * lleva puerta (bearer con `ANIMA_BOT_SECRET`).
 */
import type { drive_v3 } from '@googleapis/drive';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler, sendError, sendSuccess } from './_lib/index.js';
import { bearerMatches } from './_lib/bearer.js';
import { getAsesorCotizacionesFolder } from './_lib/drive-helpers.js';
import { getOAuthSheetsClient } from './_lib/oauth-drive-client.js';
import { eligeOperacion, esNumeroValido } from './_lib/deck-upload.js';
import {
  MIME_SHEETS,
  consultaHoja,
  filasDeCotizacion,
  nombreHoja,
  rangoDeEscritura,
} from './_lib/hoja-cotizacion.js';

/** Rango de limpieza al actualizar: la hoja previa puede tener MÁS filas. */
const RANGO_LIMPIEZA = 'A1:Z1000';

interface HojaBody {
  quotationNumber?: string;
  asesorEmail?: string;
  quote?: unknown;
}

export default withApiHandler(
  async (
    req: VercelRequest,
    res: VercelResponse,
    ctx: Record<string, unknown>,
  ) => {
    if (
      !bearerMatches(req.headers['authorization'], process.env.ANIMA_BOT_SECRET)
    ) {
      return sendError(res, 401, 'No autorizado');
    }

    const { oauthDrive, sharedDriveId } = ctx as {
      oauthDrive: drive_v3.Drive | null;
      sharedDriveId: string;
    };
    if (!oauthDrive) {
      return sendError(res, 500, 'OAuth Drive no está configurado');
    }

    const body = (req.body ?? {}) as HojaBody;
    const quotationNumber = String(body.quotationNumber ?? '').trim();
    const asesorEmail = String(body.asesorEmail ?? '').trim();
    const quote = body.quote;
    if (!quotationNumber || !asesorEmail || !quote) {
      return sendError(res, 400, 'Faltan quotationNumber, asesorEmail o quote');
    }
    // Rechazar en el borde, nunca sanear en silencio (misma regla que el deck).
    if (!esNumeroValido(quotationNumber)) {
      return sendError(
        res,
        400,
        'quotationNumber inválido: solo letras, dígitos, "-" y "_"',
      );
    }

    let filas: string[][];
    try {
      filas = filasDeCotizacion(quote);
    } catch (err) {
      return sendError(res, 400, 'Cotización inválida', (err as Error).message);
    }

    const folderId = await getAsesorCotizacionesFolder(
      oauthDrive,
      sharedDriveId,
      asesorEmail,
    );
    const nombre = nombreHoja(quotationNumber);

    // idempotente: un segundo «Sí» actualiza la misma hoja y no llena la
    // carpeta del asesor de duplicados.
    const previo = await oauthDrive.files.list({
      q: consultaHoja(nombre, folderId),
      fields: 'files(id, webViewLink)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    const existentes = previo.data.files ?? [];
    const op = eligeOperacion(existentes);
    const sheets = await getOAuthSheetsClient();

    let fileId: string | null | undefined;
    let webViewLink: string | null | undefined;
    if (op.tipo === 'actualizar') {
      fileId = op.fileId;
      // `eligeOperacion` se queda con el primero: es el mismo de `existentes[0]`,
      // así que el link ya vino en el listado y no hace falta un `files.get`.
      webViewLink = existentes[0]?.webViewLink;
      await sheets.spreadsheets.values.clear({
        spreadsheetId: fileId as string,
        range: RANGO_LIMPIEZA,
      });
    } else {
      // El archivo se crea por Drive (no por `spreadsheets.create`) porque solo
      // Drive sabe ponerlo dentro de la carpeta del asesor del Shared Drive.
      const creada = await oauthDrive.files.create({
        requestBody: {
          name: nombre,
          mimeType: MIME_SHEETS,
          parents: [folderId],
        },
        fields: 'id, webViewLink',
        supportsAllDrives: true,
      });
      fileId = creada.data.id;
      webViewLink = creada.data.webViewLink;
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: fileId as string,
      range: rangoDeEscritura(filas),
      // RAW: los pesos ya llegan formateados desde el bot. Ver el módulo puro.
      valueInputOption: 'RAW',
      requestBody: { values: filas },
    });

    return sendSuccess(res, { fileId, webViewLink });
  },
  {
    methods: ['POST', 'OPTIONS'],
    provideOAuthDrive: true,
    requireDriveId: true,
    errorPrefix: 'CotizacionHoja',
  },
);
