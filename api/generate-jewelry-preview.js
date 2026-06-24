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

export const config = { api: { bodyParser: true } };

// =============================================================================
// SCENE / PROMPT DEFINITIONS
// =============================================================================

const SCENES = {
  "ring-woman": {
    piece:
      "a refined cocktail ring with the emerald as the single hero centre stone, held in a secure four-prong setting on a slim, elegant band",
    subject:
      "worn on the ring finger of a graceful woman's hand, soft natural skin and a tasteful neutral manicure, fingers gently and naturally curved",
    framing:
      "intimate close-up of the hand at a flattering three-quarter angle",
    anatomy:
      "The hand is anatomically correct, with exactly five natural fingers and realistic, flawless skin",
  },
  "ring-man": {
    piece:
      "a substantial men's signet-style ring with the emerald as the bold centre stone in a clean bezel setting on a solid polished band",
    subject:
      "worn on the hand of a refined, well-groomed man in a natural, confident pose",
    framing: "close-up of the hand at a three-quarter angle",
    anatomy:
      "The hand is anatomically correct, with exactly five natural fingers and realistic skin",
  },
  necklace: {
    piece:
      "an elegant pendant on a fine, delicate chain, the emerald as the hanging hero stone framed by a subtle halo of tiny pavé diamonds",
    subject:
      "resting just below the collarbone on a woman's bare décolletage, smooth natural skin",
    framing: "front-on beauty crop from the collarbone to the upper chest",
    anatomy: "Skin is natural and realistic under flattering soft lighting",
  },
  earrings: {
    piece:
      "a perfectly matched symmetrical pair of drop earrings, each with an emerald as the hero stone above a small accent diamond",
    subject:
      "worn by an elegant woman, shown on her ear with hair tucked back to reveal the side of her face",
    framing: "side-profile close-up of the ear and jawline",
    anatomy: "The ear and skin are natural, realistic and flawless",
  },
};

const METALS = {
  gold: "warm 18k yellow gold",
  silver: "bright polished sterling silver (925)",
};

// — Spanish (catalog) spec values → clean English gemological descriptors ——
// The product specs arrive in Spanish (talla/color/calidad). Spliced raw they
// produce broken prompts like "Verde intenso green tone" that confuse the
// text-to-image model — so normalize them to proper English here.

const CUT_MAP = [
  [/esmeralda|emerald|octag/i, "an emerald-cut (rectangular step-cut) emerald"],
  [/coj[ií]n|cushion/i, "a cushion-cut emerald"],
  [/oval/i, "an oval-cut emerald"],
  [/pera|pear|gota|teardrop/i, "a pear-cut (teardrop) emerald"],
  [/redond|round|brillante/i, "a round brilliant-cut emerald"],
  [/princes/i, "a princess-cut (square) emerald"],
  [/marqu|navette/i, "a marquise-cut emerald"],
  [/coraz[óo]n|heart/i, "a heart-cut emerald"],
  [/asscher/i, "an Asscher-cut emerald"],
  [/trill?[íi]?[óo]n|triangle|trillion/i, "a trillion-cut emerald"],
];

function describeCut(cut) {
  if (cut) {
    for (const [re, label] of CUT_MAP) if (re.test(cut)) return label;
  }
  return "an emerald-cut (rectangular step-cut) emerald";
}

function describeColor(color) {
  const c = (color || "").toLowerCase();
  if (/azul/.test(c)) return "a vivid, slightly bluish Colombian green";
  if (/oscuro|intens|profund|deep|fuerte/.test(c))
    return "a deep, richly saturated Colombian green";
  if (/claro|light|p[áa]lid|suave/.test(c))
    return "a bright, lively light Colombian green";
  return "a vivid, saturated Colombian green";
}

function describeQuality(quality) {
  const q = (quality || "").toLowerCase();
  if (/aaa|fina|premium|excele|exception|gota|insignif/.test(q))
    return "with exceptional eye-clean transparency and a luminous internal glow";
  if (/\baa\b|alta|high/.test(q))
    return "with high clarity and bright, glassy transparency";
  if (/comercial|\ba\b|natural|baja|incl/.test(q))
    return "with natural transparency and characteristic fine jardín inclusions";
  return "with glassy transparency and natural depth";
}

/** Strip unit words / stray punctuation from a carat value. */
function cleanCarats(carats) {
  return String(carats)
    .replace(/\s*(cts?|ct\.|quilates?|carats?|kt)\b/gi, "")
    .replace(/[^\d.,]/g, "")
    .replace(/[.,]$/, "")
    .trim();
}

function buildPrompt({ scene, metal, mode, specs = {}, productName }) {
  const s = SCENES[scene] || SCENES["ring-woman"];
  const metalText = METALS[metal] || METALS.gold;

  // Describe the centre stone. In photo mode the reference image governs the
  // real gem, so we keep the description light to avoid the model inventing a
  // different stone; in specs mode we paint it fully from the catalog data.
  let stone;
  if (mode === "photo") {
    stone =
      "The centre stone is the exact Colombian emerald from the provided reference photograph — " +
      "faithfully preserve its real colour, saturation, cut, proportions and natural inclusions; do not invent a different gem.";
  } else {
    const sizeBits = [];
    if (specs.carats) {
      const ct = cleanCarats(specs.carats);
      if (ct) sizeBits.push(`approximately ${ct} carats`);
    }
    if (specs.measures) sizeBits.push(`measuring about ${specs.measures} mm`);
    const size = sizeBits.length ? `, ${sizeBits.join(", ")}` : "";
    stone =
      `The centre stone is ${describeCut(specs.cut)}${size}, ` +
      `${describeColor(specs.color)} ${describeQuality(specs.quality)}, ` +
      "with crisp step facets and bright, realistic light reflections.";
  }

  const name = productName ? `Inspired by the "${productName}" emerald.` : "";

  return [
    "Professional luxury jewelry product photography, hyper-realistic, editorial catalog quality.",
    `${s.framing}: ${s.piece}, set in ${metalText}, ${s.subject}.`,
    stone,
    "The piece is in natural, believable proportion to the body — refined and comfortably wearable, not oversized.",
    name,
    `${s.anatomy}.`,
    "Shot on an 85mm macro lens at f/2.8, soft diffused studio softbox lighting, gentle highlights on the metal, shallow depth of field with the emerald in razor-sharp focus, clean softly-blurred neutral background.",
    "Square 1:1 composition. No text, no watermark, no logos, no extra jewelry.",
  ]
    .filter(Boolean)
    .join(" ");
}

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
