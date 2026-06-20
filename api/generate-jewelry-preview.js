/**
 * Generate Jewelry Preview API
 * ------------------------------------------------------------------
 * Turns a selected emerald (real product photo and/or its specs) into a
 * photorealistic visualization of the stone set into a piece of jewelry
 * and worn — so a Cotizacion client can imagine the finished piece.
 *
 * POST /api/generate-jewelry-preview
 *   body (application/json): {
 *     quotationId:   string,                 // groups previews in Drive
 *     itemNumber?:   number | string,
 *     productName?:  string,
 *     scene:         'ring-woman' | 'ring-man' | 'necklace' | 'earrings',
 *     metal?:        'gold' | 'silver',      // setting metal (default gold)
 *     mode?:         'photo' | 'specs',      // default 'photo'
 *     referenceFileId?: string,              // Drive id of product photo
 *     referenceUrl?:    string,              // absolute fallback URL
 *     specs?: {
 *       cut?: string,        // talla
 *       measures?: string,   // medidasValores (mm)
 *       carats?: string,     // peso
 *       color?: string,
 *       quality?: string,    // calidad
 *     },
 *   }
 *
 *   response: { success, url, fileId, scene, mode, prompt }
 *     - `url` is a same-origin /api/serve-drive-image?fileId=… proxy URL
 *       (works in the on-screen preview AND the html2canvas PDF export).
 *
 * Env: GEMINI_API_KEY (see api/_lib/image-gen.js) + the standard
 *      GOOGLE_OAUTH_* / GOOGLE_SHARED_DRIVE_ID used everywhere else.
 */

import { Readable } from 'stream';
import {
  withApiHandler,
  sendError,
  sendSuccess,
  DRIVE_FOLDERS,
} from './_lib/index.js';
import { generateImage, isImageGenConfigured } from './_lib/image-gen.js';

export const config = { api: { bodyParser: true } };

// =============================================================================
// SCENE / PROMPT DEFINITIONS
// =============================================================================

const SCENES = {
  'ring-woman': {
    subject: "an elegant woman's hand, manicured, wearing the ring",
    piece: 'a fine cocktail ring with the emerald as the single centerpiece stone, flanked by small accent diamonds',
  },
  'ring-man': {
    subject: "a refined man's hand wearing the ring",
    piece: 'a substantial signet-style ring with the emerald as the bold centerpiece stone',
  },
  necklace: {
    subject: "a woman's neckline and décolletage, the pendant resting just below the collarbone",
    piece: 'an elegant pendant necklace on a fine chain, the emerald as the hanging centerpiece stone',
  },
  earrings: {
    subject: "a woman's ear and the side of her face, hair tucked back",
    piece: 'a pair of drop earrings, each featuring an emerald as the centerpiece stone',
  },
};

const METALS = {
  gold: '18k yellow gold',
  silver: 'polished sterling silver (925)',
};

function buildPrompt({ scene, metal, mode, specs = {}, productName }) {
  const s = SCENES[scene] || SCENES['ring-woman'];
  const metalText = METALS[metal] || METALS.gold;

  const specBits = [];
  if (specs.cut) specBits.push(`${specs.cut} cut`);
  if (specs.carats) specBits.push(`${specs.carats} carats`);
  if (specs.measures) specBits.push(`approx. ${specs.measures} mm`);
  if (specs.color) specBits.push(`${specs.color} green tone`);
  if (specs.quality) specBits.push(`${specs.quality} clarity`);
  const specText = specBits.length
    ? ` The Colombian emerald is ${specBits.join(', ')}.`
    : ' The center stone is a vivid green Colombian emerald.';

  const fidelity =
    mode === 'photo'
      ? ' Use the provided reference photograph as the exact center stone: faithfully preserve its real color, saturation, cut, proportions and inclusions. Do not invent a different gem.'
      : '';

  const name = productName ? ` Inspired by the "${productName}" emerald.` : '';

  return (
    `Photorealistic luxury jewelry product photography. Create ${s.piece}, ` +
    `set in ${metalText}, worn by ${s.subject}.` +
    specText +
    fidelity +
    name +
    ' Studio lighting, shallow depth of field, soft neutral background, ' +
    'elegant and aspirational, ultra-detailed, sharp focus on the emerald, ' +
    'high-end editorial catalog aesthetic. Square composition. No text, no watermark, no logos.'
  );
}

// =============================================================================
// DRIVE HELPERS (OAuth, mirrors api/cloudinary-upload.js)
// =============================================================================

async function getOrCreateFolderOAuth(drive, parentFolderId, folderName) {
  const escaped = folderName.replace(/'/g, "\\'");
  try {
    const res = await drive.files.list({
      q: `name='${escaped}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    if (res.data.files?.length) return res.data.files[0].id;
  } catch (e) {
    console.error(`[JewelryPreview] folder search "${folderName}" failed:`, e.message);
  }

  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id',
    supportsAllDrives: true,
  });
  await drive.permissions
    .create({ fileId: folder.data.id, requestBody: { role: 'reader', type: 'anyone' }, supportsAllDrives: true })
    .catch(() => {});
  return folder.data.id;
}

async function uploadBufferToDrive(drive, folderId, buffer, fileName, mimeType) {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);

  const file = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType, body: readable },
    fields: 'id',
    supportsAllDrives: true,
  });
  await drive.permissions
    .create({ fileId: file.data.id, requestBody: { role: 'reader', type: 'anyone' }, supportsAllDrives: true })
    .catch(() => {});
  return file.data.id;
}

/** Download a Drive file's bytes (for the reference photo). */
async function downloadDriveFile(drive, fileId) {
  const meta = await drive.files
    .get({ fileId, fields: 'mimeType', supportsAllDrives: true })
    .catch(() => null);
  const res = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'arraybuffer' }
  );
  return {
    buffer: Buffer.from(res.data),
    mimeType: meta?.data?.mimeType || 'image/jpeg',
  };
}

/** Fetch an absolute image URL into a buffer (fallback path). */
async function downloadUrl(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`reference fetch failed (${resp.status})`);
  const mimeType = resp.headers.get('content-type') || 'image/jpeg';
  const buffer = Buffer.from(await resp.arrayBuffer());
  return { buffer, mimeType };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export default withApiHandler(
  async (req, res, { oauthDrive, sharedDriveId }) => {
    if (!isImageGenConfigured()) {
      return sendError(
        res,
        503,
        'La generación de imágenes con IA no está configurada. Falta la variable de entorno GEMINI_API_KEY.'
      );
    }

    const {
      quotationId,
      itemNumber,
      productName,
      scene = 'ring-woman',
      metal = 'gold',
      mode = 'photo',
      referenceFileId,
      referenceUrl,
      specs = {},
    } = req.body || {};

    if (!quotationId) return sendError(res, 400, 'Missing quotationId');
    if (!SCENES[scene]) return sendError(res, 400, `Unknown scene: ${scene}`);

    // 1) Acquire the reference photo (photo mode only).
    let referenceBase64;
    let referenceMimeType;
    if (mode !== 'specs') {
      try {
        let ref = null;
        if (referenceFileId) {
          ref = await downloadDriveFile(oauthDrive, referenceFileId);
        } else if (referenceUrl && /^https?:\/\//i.test(referenceUrl)) {
          ref = await downloadUrl(referenceUrl);
        }
        if (ref) {
          referenceBase64 = ref.buffer.toString('base64');
          referenceMimeType = ref.mimeType;
        }
      } catch (e) {
        // Non-fatal: fall back to specs-only generation.
        console.warn('[JewelryPreview] reference image unavailable, using specs only:', e.message);
      }
    }

    const effectiveMode = referenceBase64 ? 'photo' : 'specs';
    const prompt = buildPrompt({ scene, metal, mode: effectiveMode, specs, productName });

    // 2) Generate.
    let generated;
    try {
      generated = await generateImage({ prompt, referenceBase64, referenceMimeType });
    } catch (e) {
      const status = e.code === 'RATE_LIMIT' ? 429 : e.code === 'NOT_CONFIGURED' ? 503 : 502;
      console.error('[JewelryPreview] generation failed:', e.message);
      return sendError(res, status, `No se pudo generar la imagen: ${e.message}`);
    }

    // 3) Persist to Drive: cotizaciones/ai-previews/{quotationId}/
    let fileId;
    try {
      const cotizaciones = await getOrCreateFolderOAuth(oauthDrive, sharedDriveId, DRIVE_FOLDERS.COTIZACIONES);
      const previews = await getOrCreateFolderOAuth(oauthDrive, cotizaciones, DRIVE_FOLDERS.COTIZACIONES_AI_PREVIEWS);
      const target = await getOrCreateFolderOAuth(oauthDrive, previews, String(quotationId));

      const ext = (generated.mimeType.split('/')[1] || 'png').replace('jpeg', 'jpg');
      const fileName = `preview-${itemNumber ?? 'item'}-${scene}-${metal}-${Date.now()}.${ext}`;
      const buffer = Buffer.from(generated.base64, 'base64');
      fileId = await uploadBufferToDrive(oauthDrive, target, buffer, fileName, generated.mimeType);
    } catch (e) {
      console.error('[JewelryPreview] Drive upload failed:', e.message);
      // Fall back to returning an inline data URL so the feature still works.
      return sendSuccess(res, {
        url: `data:${generated.mimeType};base64,${generated.base64}`,
        fileId: null,
        scene,
        metal,
        mode: effectiveMode,
        persisted: false,
        prompt,
      });
    }

    return sendSuccess(res, {
      url: `/api/serve-drive-image?fileId=${fileId}`,
      fileId,
      scene,
      metal,
      mode: effectiveMode,
      persisted: true,
      prompt,
    });
  },
  { methods: ['POST', 'OPTIONS'], provideOAuthDrive: true, errorPrefix: 'JewelryPreview' }
);
