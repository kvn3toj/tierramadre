/**
 * Cotización Deck API
 *
 * Sube el .pptx que construye el cotizador y deja que Drive lo convierta a
 * Slides nativas, dentro de la carpeta del asesor que ya usa cotizacion-save.
 *
 * A diferencia de /api/media-upload, este endpoint SÍ lleva puerta: lo llama el
 * bot, y crea archivos en el Shared Drive.
 */
import type { drive_v3 } from '@googleapis/drive';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import formidable from 'formidable';
import { readFile } from 'fs/promises';
import { withApiHandler, sendError, sendSuccess } from './_lib/index.js';
import { bearerMatches } from './_lib/bearer.js';
import { getAsesorCotizacionesFolder } from './_lib/drive-helpers.js';
import {
  construyeSubida,
  eligeOperacion,
  esNumeroValido,
  escapaParaQuery,
  nombreDeck,
} from './_lib/deck-upload.js';

export const config = { api: { bodyParser: false } };

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

    const form = formidable({ maxFileSize: 25 * 1024 * 1024 });
    const [fields, files] = await form.parse(req);
    const quotationNumber = String(fields.quotationNumber?.[0] ?? '').trim();
    const asesorEmail = String(fields.asesorEmail?.[0] ?? '').trim();
    const subido = files.deck?.[0];
    if (!quotationNumber || !asesorEmail || !subido) {
      return sendError(res, 400, 'Faltan quotationNumber, asesorEmail o deck');
    }
    if (!esNumeroValido(quotationNumber)) {
      return sendError(
        res,
        400,
        'quotationNumber inválido: solo letras, dígitos, "-" y "_"',
      );
    }

    const buffer = await readFile(subido.filepath);
    const folderId = await getAsesorCotizacionesFolder(
      oauthDrive,
      sharedDriveId,
      asesorEmail,
    );
    const nombre = nombreDeck(quotationNumber);

    // idempotente: un segundo «Sí» actualiza, no llena la carpeta de duplicados
    const previo = await oauthDrive.files.list({
      q: `name = '${escapaParaQuery(nombre)}' and '${folderId}' in parents and trashed = false`,
      fields: 'files(id)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const subida = construyeSubida(nombre, folderId, buffer);
    const op = eligeOperacion(previo.data.files ?? []);
    const r =
      op.tipo === 'actualizar'
        ? await oauthDrive.files.update({
            fileId: op.fileId,
            media: subida.media,
            supportsAllDrives: true,
            fields: 'id, webViewLink',
          })
        : await oauthDrive.files.create(subida);

    return sendSuccess(res, {
      fileId: r.data.id,
      webViewLink: r.data.webViewLink,
    });
  },
  {
    methods: ['POST', 'OPTIONS'],
    provideOAuthDrive: true,
    requireDriveId: true,
    errorPrefix: 'CotizacionDeck',
  },
);
