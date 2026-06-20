/**
 * Image Generation Provider (swappable)
 * ------------------------------------------------------------------
 * Single place that knows HOW to turn a prompt (+ optional reference
 * image) into a generated PNG/JPEG. The rest of the app only depends on
 * `generateImage()`, so switching providers (Gemini → xAI Grok →
 * Replicate → fal) is a one-file change.
 *
 * Default provider: Google Gemini 2.5 Flash Image ("Nano Banana").
 *   - Supports image-to-image: pass the real product photo as a
 *     reference part so the generated jewelry keeps the actual
 *     emerald's color and cut.
 *   - REST: POST .../models/gemini-2.5-flash-image:generateContent
 *   - Response image bytes live at
 *     candidates[0].content.parts[].inlineData.data (base64).
 *
 * Provider is env-driven (no code change to switch):
 *   IMAGE_GEN_PROVIDER=gateway  → Vercel AI Gateway (free $5/30-day credit,
 *                                 no card; routes to the same Nano Banana).
 *   (unset / anything else)     → direct Google Gemini key.
 *
 * Required env (server-side, NO VITE_ prefix):
 *   GEMINI_API_KEY        (falls back to VITE_GEMINI_API_KEY) — direct path.
 *   AI_GATEWAY_API_KEY    (or the auto-injected VERCEL_OIDC_TOKEN) — gateway path.
 *   AI_GATEWAY_IMAGE_MODEL  optional override (default google/gemini-2.5-flash-image;
 *                           try bfl/flux-kontext-pro for stronger subject preservation).
 *
 * To add another provider (xAI Grok, fal, …): implement generateImageX() and
 * extend the PROVIDER switch. Nothing else in the codebase needs to change.
 */

const GEMINI_MODEL = "gemini-2.5-flash-image";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/** Resolve the API key from any of the supported env names. */
function getGeminiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    null
  );
}

// ── Vercel AI Gateway provider ──
// OpenAI-compatible endpoint that routes to image models (incl. the same
// Nano Banana family). Every Vercel team gets a recurring $5/30-day credit
// (no card) that applies to image gen — so this is the "free" image-to-image
// path. Image-to-image goes through the CHAT path (not images/generations):
// the reference photo is an image_url content part, and the generated image
// comes back at choices[0].message.images[0].image_url.url as a data: URL.
const GATEWAY_ENDPOINT = "https://ai-gateway.vercel.sh/v1/chat/completions";
const GATEWAY_MODEL =
  process.env.AI_GATEWAY_IMAGE_MODEL || "google/gemini-2.5-flash-image";

/** Resolve the AI Gateway key (static key, or the OIDC token Vercel injects). */
function getGatewayKey() {
  return (
    process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || null
  );
}

/** True when at least one provider is configured. */
export function isImageGenConfigured() {
  return Boolean(getGeminiKey() || getGatewayKey());
}

/**
 * Generate an image with Google Gemini 2.5 Flash Image.
 *
 * @param {Object}  args
 * @param {string}  args.prompt              Text prompt describing the scene.
 * @param {string} [args.referenceBase64]    Base64 (no data: prefix) of a reference photo.
 * @param {string} [args.referenceMimeType]  e.g. "image/jpeg" (defaults to image/jpeg).
 * @returns {Promise<{ base64: string, mimeType: string }>}
 */
async function generateImageGemini({
  prompt,
  referenceBase64,
  referenceMimeType,
}) {
  const key = getGeminiKey();
  if (!key) {
    const err = new Error(
      "Image generation not configured (missing GEMINI_API_KEY).",
    );
    err.code = "NOT_CONFIGURED";
    throw err;
  }

  const parts = [{ text: prompt }];
  if (referenceBase64) {
    parts.push({
      inline_data: {
        mime_type: referenceMimeType || "image/jpeg",
        data: referenceBase64,
      },
    });
  }

  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      // Ask the model to return an image modality.
      responseModalities: ["IMAGE"],
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  let resp;
  try {
    resp = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    const err = new Error(
      `Gemini image request failed (${resp.status}): ${detail.slice(0, 500)}`,
    );
    err.code = resp.status === 429 ? "RATE_LIMIT" : "PROVIDER_ERROR";
    throw err;
  }

  const json = await resp.json();
  const candidateParts = json?.candidates?.[0]?.content?.parts || [];
  const imagePart = candidateParts.find((p) => p.inlineData || p.inline_data);
  const inline = imagePart?.inlineData || imagePart?.inline_data;

  if (!inline?.data) {
    // Surface any safety/refusal text the model returned.
    const textPart = candidateParts.find((p) => p.text)?.text;
    const finishReason = json?.candidates?.[0]?.finishReason;
    const err = new Error(
      `Gemini returned no image${finishReason ? ` (finishReason: ${finishReason})` : ""}` +
        (textPart ? `: ${textPart.slice(0, 300)}` : "."),
    );
    err.code = "NO_IMAGE";
    throw err;
  }

  return {
    base64: inline.data,
    mimeType: inline.mimeType || inline.mime_type || "image/png",
  };
}

/**
 * Generate an image via the Vercel AI Gateway (OpenAI-compatible chat path).
 * Same args/return contract as generateImageGemini. Uses the reference photo
 * for true image-to-image (preserves the real emerald).
 *
 * @param {Object}  args
 * @param {string}  args.prompt
 * @param {string} [args.referenceBase64]    Base64 (no data: prefix).
 * @param {string} [args.referenceMimeType]  e.g. "image/jpeg".
 * @returns {Promise<{ base64: string, mimeType: string }>}
 */
async function generateImageVercelGateway({
  prompt,
  referenceBase64,
  referenceMimeType,
}) {
  const key = getGatewayKey();
  if (!key) {
    const err = new Error(
      "Image generation not configured (missing AI_GATEWAY_API_KEY).",
    );
    err.code = "NOT_CONFIGURED";
    throw err;
  }

  const content = [{ type: "text", text: prompt }];
  if (referenceBase64) {
    content.push({
      type: "image_url",
      image_url: {
        url: `data:${referenceMimeType || "image/jpeg"};base64,${referenceBase64}`,
      },
    });
  }

  const body = {
    model: GATEWAY_MODEL,
    messages: [{ role: "user", content }],
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  let resp;
  try {
    resp = await fetch(GATEWAY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    const err = new Error(
      `AI Gateway image request failed (${resp.status}): ${detail.slice(0, 500)}`,
    );
    err.code = resp.status === 429 ? "RATE_LIMIT" : "PROVIDER_ERROR";
    throw err;
  }

  const json = await resp.json();
  const message = json?.choices?.[0]?.message;

  // Documented shape: message.images[0].image_url.url (a data: URL). Fall back
  // to inline content parts or a bare data: string for router variations.
  let dataUrl =
    message?.images?.[0]?.image_url?.url || message?.images?.[0]?.url || null;
  if (!dataUrl && Array.isArray(message?.content)) {
    dataUrl =
      message.content.find((p) => p?.type === "image_url" && p.image_url?.url)
        ?.image_url?.url || null;
  }
  if (
    !dataUrl &&
    typeof message?.content === "string" &&
    message.content.startsWith("data:")
  ) {
    dataUrl = message.content;
  }

  if (!dataUrl) {
    // Surface any refusal/safety text the model returned.
    const refusal = typeof message?.content === "string" ? message.content : "";
    const finishReason = json?.choices?.[0]?.finish_reason;
    const err = new Error(
      `AI Gateway returned no image${finishReason ? ` (finish_reason: ${finishReason})` : ""}` +
        (refusal ? `: ${refusal.slice(0, 300)}` : "."),
    );
    err.code = "NO_IMAGE";
    throw err;
  }

  const match = dataUrl.match(/^data:(.+?);base64,(.*)$/s);
  if (!match) {
    const err = new Error("AI Gateway returned an unexpected image format.");
    err.code = "NO_IMAGE";
    throw err;
  }

  return { base64: match[2], mimeType: match[1] || "image/png" };
}

/**
 * Public entry point. Provider is env-driven so it can flip without code
 * changes: set IMAGE_GEN_PROVIDER=gateway to route through the Vercel AI
 * Gateway (free $5/30-day credit), else the direct Gemini key is used.
 */
const generateImage =
  process.env.IMAGE_GEN_PROVIDER === "gateway"
    ? generateImageVercelGateway
    : generateImageGemini;

export { generateImage, generateImageGemini, generateImageVercelGateway };
