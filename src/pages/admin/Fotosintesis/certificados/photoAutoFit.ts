/**
 * photoAutoFit — compute a flattering default framing for a product photo inside
 * the certificate's fixed circular frame.
 *
 * Catalog gem shots are a small subject on a near-uniform light background, so at
 * zoom 1 the gem reads tiny with a big empty (and slightly shadowed) margin — the
 * "blank space" / "gray wedge" complaint. This detects the subject by subtracting
 * the background sampled from the image corners, then returns a {zoom, offsetX,
 * offsetY} that scales the subject to fill a target fraction of the circle and
 * recenters it.
 *
 * Coordinate model matches CertPreview.PhotoField: the <img> is `object-fit:cover`
 * centered in a square frame (side = frame px), then our transform applies
 * `scale(zoom)` and `translate(offsetX, offsetY)` (frame px) about the center.
 *
 * Safe & best-effort: a cross-origin taint (getImageData throws), a missing/empty
 * image, or a no-clear-subject result all return `null` — the caller keeps the
 * default transform. Same-origin proxied catalog images and uploaded data: URLs
 * are always readable.
 */

import {
  clampPhotoTransform,
  MAX_PHOTO_ZOOM,
  type PhotoTransform,
} from "./certTemplates";

/** Fraction of the circle diameter the detected subject should span. */
const TARGET_FILL = 0.74;
/** Per-channel distance from background that marks a pixel as "subject". */
const BG_THRESHOLD = 26;
/** Skip auto-fit when the subject already fills most of the frame. */
const ALREADY_FULL = 0.86;
/** Downscale cap for the analysis canvas (speed; placement is fraction-based). */
const ANALYSIS_MAX_DIM = 360;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

/** Median-ish background colour from the four corner patches. */
function sampleBackground(
  data: Uint8ClampedArray,
  w: number,
  h: number,
): [number, number, number] {
  const patch = Math.max(2, Math.round(Math.min(w, h) * 0.06));
  const corners: Array<[number, number]> = [
    [0, 0],
    [w - patch, 0],
    [0, h - patch],
    [w - patch, h - patch],
  ];
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (const [x0, y0] of corners) {
    for (let y = y0; y < y0 + patch; y++) {
      for (let x = x0; x < x0 + patch; x++) {
        const i = (y * w + x) * 4;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        n++;
      }
    }
  }
  return [r / n, g / n, b / n];
}

/**
 * Compute the auto-fit transform for `src` within a square frame of `frameSize`
 * px. Returns null when it can't (or shouldn't) reframe.
 */
export async function computePhotoAutoFit(
  src: string,
  frameSize: number,
): Promise<PhotoTransform | null> {
  if (!src || frameSize <= 0) return null;
  let img: HTMLImageElement;
  try {
    img = await loadImage(src);
  } catch {
    return null;
  }
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (!iw || !ih) return null;

  // Analysis canvas (downscaled). Work in this space, convert to fractions.
  const aScale = Math.min(1, ANALYSIS_MAX_DIM / Math.max(iw, ih));
  const cw = Math.max(1, Math.round(iw * aScale));
  const ch = Math.max(1, Math.round(ih * aScale));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, cw, ch);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, cw, ch).data;
  } catch {
    return null; // tainted (foreign-origin) — leave the default framing
  }

  const [br, bg, bb] = sampleBackground(data, cw, ch);

  // Subject bbox: pixels far enough from background. Track per-row/col counts so
  // we can trim sparse noise (JPEG speckle, faint shadow) before taking extents.
  let minX = cw;
  let minY = ch;
  let maxX = -1;
  let maxY = -1;
  let count = 0;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const i = (y * cw + x) * 4;
      const d =
        Math.abs(data[i] - br) +
        Math.abs(data[i + 1] - bg) +
        Math.abs(data[i + 2] - bb);
      if (d > BG_THRESHOLD * 3) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        count++;
      }
    }
  }

  // No meaningful subject (uniform image / detection failed).
  if (maxX < 0 || count < cw * ch * 0.0015) return null;

  // Subject bbox as fractions of the image.
  const sxFrac = minX / cw;
  const syFrac = minY / ch;
  const swFrac = (maxX - minX + 1) / cw;
  const shFrac = (maxY - minY + 1) / ch;

  // object-fit: cover — the shorter image side maps to the frame; the longer side
  // overflows. coverScale converts an image-fraction span to frame px.
  const coverScale = Math.max(frameSize / iw, frameSize / ih); // px per natural-px
  const swPx = swFrac * iw;
  const shPx = shFrac * ih;
  const subjectMaxPx = Math.max(swPx, shPx);
  if (subjectMaxPx <= 0) return null;

  // Already fills the frame? Don't fight a good photo.
  const subjectCoverSpan = (subjectMaxPx * coverScale) / frameSize; // at zoom 1
  if (subjectCoverSpan >= ALREADY_FULL) return null;

  let zoom = (TARGET_FILL * frameSize) / (subjectMaxPx * coverScale);
  zoom = Math.min(Math.max(zoom, 1), MAX_PHOTO_ZOOM);

  // Recenter: cancel the subject's offset from the image centre. Subject centre
  // in natural px:
  const scxPx = (sxFrac + swFrac / 2) * iw;
  const scyPx = (syFrac + shFrac / 2) * ih;
  const offsetX = -(scxPx - iw / 2) * coverScale * zoom;
  const offsetY = -(scyPx - ih / 2) * coverScale * zoom;

  return clampPhotoTransform({ zoom, offsetX, offsetY }, frameSize, frameSize);
}
