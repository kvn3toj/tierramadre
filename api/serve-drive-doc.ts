/**
 * Stream a Drive-archived PDF under our own origin.
 *
 * `serve-drive-image` is image-only, so an archived kardex comprobante has no
 * proxy. The anima-bot needs the actual bytes: a consignment recipient has no
 * Drive access, so a share link is useless to them — the PDF has to travel as
 * a Telegram document.
 *
 * Mime is checked AFTER fetching metadata, against an allowlist: this serves
 * bytes from our own origin, so an html/svg passthrough would be stored XSS.
 */
import type { drive_v3 } from '@googleapis/drive';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler, sendError } from './_lib/index.js';
import { isAllowedDocMime } from './_lib/driveDoc.js';

export default withApiHandler(
  async (
    req: VercelRequest,
    res: VercelResponse,
    ctx: Record<string, unknown>,
  ) => {
    const { oauthDrive } = ctx as { oauthDrive: drive_v3.Drive | null };
    if (!oauthDrive) {
      return sendError(res, 500, 'OAuth Drive no está configurado');
    }

    const raw = req.query.fileId;
    const fileId = Array.isArray(raw) ? raw[0] : raw;
    // Drive ids are [A-Za-z0-9_-]; anything else is a caller bug or an
    // injection attempt, and never reaches the Drive API.
    if (!fileId || !/^[A-Za-z0-9_-]+$/.test(fileId)) {
      return sendError(res, 400, 'fileId inválido o ausente');
    }

    const meta = await oauthDrive.files.get({
      fileId,
      fields: 'id,name,mimeType,size',
      supportsAllDrives: true,
    });
    const mimeType = String(meta.data.mimeType ?? '');
    if (!isAllowedDocMime(mimeType)) {
      return sendError(res, 415, `Tipo no permitido: ${mimeType}`);
    }

    const file = await oauthDrive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' },
    );

    const name = String(meta.data.name ?? 'comprobante.pdf').replace(/"/g, '');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${name}"`);
    // private: this is an internal comprobante, never a CDN-cacheable asset.
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.status(200).send(Buffer.from(file.data as ArrayBuffer));
  },
  {
    methods: ['GET', 'OPTIONS'],
    provideOAuthDrive: true,
    errorPrefix: 'ServeDriveDoc',
  },
);
