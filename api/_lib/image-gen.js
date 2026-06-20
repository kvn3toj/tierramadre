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
 * Required env (server-side, NO VITE_ prefix):
 *   GEMINI_API_KEY   (falls back to VITE_GEMINI_API_KEY for convenience)
 *
 * To switch to xAI Grok later: implement generateImageGrok() and point
 * PROVIDER at it. Nothing else in the codebase needs to change.
 */

const GEMINI_MODEL = 'gemini-2.5-flash-image';
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

/** True when at least one provider is configured. */
export function isImageGenConfigured() {
  return Boolean(getGeminiKey());
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
async function generateImageGemini({ prompt, referenceBase64, referenceMimeType }) {
  const key = getGeminiKey();
  if (!key) {
    const err = new Error('Image generation not configured (missing GEMINI_API_KEY).');
    err.code = 'NOT_CONFIGURED';
    throw err;
  }

  const parts = [{ text: prompt }];
  if (referenceBase64) {
    parts.push({
      inline_data: {
        mime_type: referenceMimeType || 'image/jpeg',
        data: referenceBase64,
      },
    });
  }

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      // Ask the model to return an image modality.
      responseModalities: ['IMAGE'],
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  let resp;
  try {
    resp = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    const err = new Error(
      `Gemini image request failed (${resp.status}): ${detail.slice(0, 500)}`
    );
    err.code = resp.status === 429 ? 'RATE_LIMIT' : 'PROVIDER_ERROR';
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
      `Gemini returned no image${finishReason ? ` (finishReason: ${finishReason})` : ''}` +
        (textPart ? `: ${textPart.slice(0, 300)}` : '.')
    );
    err.code = 'NO_IMAGE';
    throw err;
  }

  return {
    base64: inline.data,
    mimeType: inline.mimeType || inline.mime_type || 'image/png',
  };
}

/**
 * Public entry point. Today this is Gemini; swap the assignment to
 * change providers globally.
 */
export const generateImage = generateImageGemini;

export { generateImageGemini };
