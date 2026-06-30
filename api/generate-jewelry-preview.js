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
 *
 * The scene/spec → prompt logic lives in api/_lib/jewelry-prompt.js so the
 * batch visualizer (scripts/jewelry-visualizer.mjs) shares the exact wording.
 */

import { Readable } from "stream";
import {
  withApiHandler,
  sendError,
  sendSuccess,
  DRIVE_FOLDERS,
} from "./_lib/index.js";
import {
  generateImage,
  isImageGenConfigured,
  imageGenUsesReference,
} from "./_lib/image-gen.js";
import { buildPrompt, SCENES } from "./_lib/jewelry-prompt.js";

export const config = { api: { bodyParser: true } };

// =============================================================================
// DRIVE HELPERS (OAuth, mirrors api/cloudinary-upload.js)
// =============================================================================

async function getOrCreateFolderOAuth(drive, parentFolderId, folderName) {
  const escaped = folderName.replace(/'/g, "\\'");
  try {
    const res = await drive.files.list({
      q: `name='${escaped}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id, name)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    if (res.data.files?.length) return res.data.files[0].id;
  } catch (e) {
    console.error(
      `[JewelryPreview] folder search "${folderName}" failed:`,
      e.message,
    );
  }

  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id",
    supportsAllDrives: true,
  });
  await drive.permissions
    .create({
      fileId: folder.data.id,
      requestBody: { role: "reader", type: "anyone" },
      supportsAllDrives: true,
    })
    .catch(() => {});
  return folder.data.id;
}

async function uploadBufferToDrive(
  drive,
  folderId,
  buffer,
  fileName,
  mimeType,
) {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);

  const file = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType, body: readable },
    fields: "id",
    supportsAllDrives: true,
  });
  await drive.permissions
    .create({
      fileId: file.data.id,
      requestBody: { role: "reader", type: "anyone" },
      supportsAllDrives: true,
    })
    .catch(() => {});
  return file.data.id;
}

/** Download a Drive file's bytes (for the reference photo). */
async function downloadDriveFile(drive, fileId) {
  const meta = await drive.files
    .get({ fileId, fields: "mimeType", supportsAllDrives: true })
    .catch(() => null);
  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" },
  );
  return {
    buffer: Buffer.from(res.data),
    mimeType: meta?.data?.mimeType || "image/jpeg",
  };
}

/** Fetch an absolute image URL into a buffer (fallback path). */
async function downloadUrl(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`reference fetch failed (${resp.status})`);
  const mimeType = resp.headers.get("content-type") || "image/jpeg";
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
        "La generación de imágenes con IA no está configurada en el servidor.",
      );
    }

    const {
      quotationId,
      itemNumber,
      productName,
      scene = "ring-woman",
      metal = "gold",
      mode = "photo",
      referenceFileId,
      referenceUrl,
      specs = {},
    } = req.body || {};

    if (!quotationId) return sendError(res, 400, "Missing quotationId");
    if (!SCENES[scene]) return sendError(res, 400, `Unknown scene: ${scene}`);

    // 1) Acquire the reference photo (photo mode only, and only when the active
    //    provider actually consumes a reference — free text-to-image providers
    //    ignore it and generate purely from the product-specs prompt).
    let referenceBase64;
    let referenceMimeType;
    if (mode !== "specs" && imageGenUsesReference()) {
      try {
        let ref = null;
        if (referenceFileId) {
          ref = await downloadDriveFile(oauthDrive, referenceFileId);
        } else if (referenceUrl && /^https?:\/\//i.test(referenceUrl)) {
          ref = await downloadUrl(referenceUrl);
        }
        if (ref) {
          referenceBase64 = ref.buffer.toString("base64");
          referenceMimeType = ref.mimeType;
        }
      } catch (e) {
        // Non-fatal: fall back to specs-only generation.
        console.warn(
          "[JewelryPreview] reference image unavailable, using specs only:",
          e.message,
        );
      }
    }

    const effectiveMode = referenceBase64 ? "photo" : "specs";
    const prompt = buildPrompt({
      scene,
      metal,
      mode: effectiveMode,
      specs,
      productName,
    });

    // 2) Generate.
    let generated;
    try {
      generated = await generateImage({
        prompt,
        referenceBase64,
        referenceMimeType,
      });
    } catch (e) {
      const status =
        e.code === "RATE_LIMIT" ? 429 : e.code === "NOT_CONFIGURED" ? 503 : 502;
      console.error("[JewelryPreview] generation failed:", e.message);
      return sendError(
        res,
        status,
        `No se pudo generar la imagen: ${e.message}`,
      );
    }

    // 3) Persist to Drive: cotizaciones/ai-previews/{quotationId}/
    let fileId;
    try {
      const cotizaciones = await getOrCreateFolderOAuth(
        oauthDrive,
        sharedDriveId,
        DRIVE_FOLDERS.COTIZACIONES,
      );
      const previews = await getOrCreateFolderOAuth(
        oauthDrive,
        cotizaciones,
        DRIVE_FOLDERS.COTIZACIONES_AI_PREVIEWS,
      );
      const target = await getOrCreateFolderOAuth(
        oauthDrive,
        previews,
        String(quotationId),
      );

      const ext = (generated.mimeType.split("/")[1] || "png").replace(
        "jpeg",
        "jpg",
      );
      const fileName = `preview-${itemNumber ?? "item"}-${scene}-${metal}-${Date.now()}.${ext}`;
      const buffer = Buffer.from(generated.base64, "base64");
      fileId = await uploadBufferToDrive(
        oauthDrive,
        target,
        buffer,
        fileName,
        generated.mimeType,
      );
    } catch (e) {
      console.error("[JewelryPreview] Drive upload failed:", e.message);
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
  {
    methods: ["POST", "OPTIONS"],
    provideOAuthDrive: true,
    errorPrefix: "JewelryPreview",
  },
);
