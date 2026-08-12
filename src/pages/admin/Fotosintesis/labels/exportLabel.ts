/**
 * exportLabel — rasterize a LabelPreview DOM node to a PNG or raw canvas.
 *
 * Rasterizer: snapDOM is the PRIMARY engine (same choice as
 * certificados/exportCert.ts, already proven in this codebase) — it
 * serializes the node into an SVG <foreignObject> and lets the browser's own
 * layout/paint engine draw it, avoiding html2canvas's documented
 * reimplemented-CSS quirks. Those quirks are not hypothetical here: an
 * earlier version of this file used html2canvas directly and produced a
 * correctly-sized but completely BLANK canvas for LabelPreview's MUI/emotion
 * content (verified via a manual Playwright repro — see the fix commit).
 * html2canvas remains as a FALLBACK if snapDOM throws or returns a blank
 * canvas, so an export is never silently blank on any device.
 *
 * Explicit pixel `width`/`height` (measured on the LIVE node via
 * offsetWidth/offsetHeight, matching exportCert.ts's approach) are always
 * passed to both rasterizers rather than relying on the cloned/off-screen
 * node's own CSS layout to size itself — an off-screen wrapper's ambient
 * width (e.g. a block element stretching to its container, or `max-content`
 * mismeasured on a detached clone) is exactly what produced the malformed
 * export this file now guards against.
 */

import { snapdom } from '@zumer/snapdom';
import html2canvas from 'html2canvas';

// ~2.1× OVERSAMPLE for the PNG export path. Despite its `203 / 96` spelling
// this is not a DPI conversion — the label is authored at 96 CSS px for a 12mm
// tape, which already IS 203 DPI, so a true DPI match would be 1. The 2.1×
// is deliberate headroom so the PNG stays crisp when re-imported into NIIMBOT's
// own template editor at arbitrary zoom. Do not "correct" it to 1.
// The direct-print path does not use this — see renderLabelCanvas.
const DEFAULT_PIXEL_RATIO = 203 / 96;
const IMAGE_LOAD_TIMEOUT_MS = 5000;

function triggerDownload(href: string, filename: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Resolve once every `<img>` under `node` is decoded (or errored/timed
 *  out) — the logo <img> in LabelPreview needs this guard against a blank
 *  capture, matching captureNodeToPdf.ts's waitForImages. */
async function waitForImages(node: HTMLElement): Promise<void> {
  const images = Array.from(node.querySelectorAll('img'));
  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const done = () => {
          clearTimeout(timer);
          resolve();
        };
        const timer = setTimeout(done, IMAGE_LOAD_TIMEOUT_MS);
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      });
    }),
  );
}

/** Cheap "did the rasterizer produce nothing?" probe — downscale to 8×8 and
 *  check for any non-white, non-transparent pixel. Mirrors
 *  certificados/exportCert.ts's isCanvasBlank. */
function isCanvasBlank(canvas: HTMLCanvasElement): boolean {
  try {
    if (!canvas.width || !canvas.height) return true;
    const probe = document.createElement('canvas');
    probe.width = 8;
    probe.height = 8;
    const ctx = probe.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;
    ctx.drawImage(canvas, 0, 0, 8, 8);
    const { data } = ctx.getImageData(0, 0, 8, 8);
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue; // transparent
      if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Rasterize `node` to a canvas at explicit pixel dimensions. `node` is
 * measured live (offsetWidth/offsetHeight) before cloning into a sandbox
 * with those exact dimensions set inline — the sandbox's own CSS layout is
 * never trusted to self-size.
 */
async function rasterize(
  node: HTMLElement,
  scale: number,
): Promise<HTMLCanvasElement> {
  await waitForImages(node);

  const width = node.offsetWidth || 1;
  const height = node.offsetHeight || 1;

  const sandbox = document.createElement('div');
  sandbox.setAttribute('aria-hidden', 'true');
  sandbox.style.cssText =
    `position:fixed;left:-100000px;top:0;width:${width}px;height:${height}px;` +
    `margin:0;padding:0;overflow:hidden;background:#ffffff;` +
    `pointer-events:none;z-index:-1;`;
  const clone = node.cloneNode(true) as HTMLElement;
  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  try {
    await waitForImages(clone);

    try {
      const canvas = await snapdom.toCanvas(clone, {
        scale,
        dpr: 1,
        backgroundColor: '#ffffff',
        embedFonts: true,
      });
      if (!isCanvasBlank(canvas)) return canvas;
      console.warn(
        '[exportLabel] snapDOM returned a blank canvas; falling back to html2canvas.',
      );
    } catch (e) {
      console.warn(
        '[exportLabel] snapDOM failed; falling back to html2canvas.',
        e,
      );
    }

    return await html2canvas(clone, {
      scale,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
    });
  } finally {
    document.body.removeChild(sandbox);
  }
}

/** Rasterize the node to a PNG Blob (not downloaded). */
export async function renderLabelPngBlob(
  node: HTMLElement,
  opts?: { pixelRatio?: number },
): Promise<Blob> {
  const canvas = await rasterize(node, opts?.pixelRatio ?? DEFAULT_PIXEL_RATIO);
  const dataUrl = canvas.toDataURL('image/png');
  const res = await fetch(dataUrl);
  return res.blob();
}

/**
 * Rasterize the node to a raw canvas (not a Blob) — used by the direct-print
 * path, which needs an HTMLCanvasElement to hand to niimbluelib's
 * ImageEncoder.encodeCanvas, not a downloadable file.
 *
 * Here 1 canvas pixel is 1 printer dot, so `scale` must map the authored size
 * onto the CONNECTED head's resolution. Labels are authored at 203 DPI (96 CSS
 * px = 12mm), so a 203 DPI head wants scale 1 and a 300 DPI head wants ~1.478 —
 * pass `printScaleFor(head)` from labelSizes. The default of 1 keeps the
 * pre-multi-size behaviour for callers that don't know the head yet.
 *
 * The PNG-export path oversamples instead (see DEFAULT_PIXEL_RATIO), because
 * that PNG must look crisp when re-imported into NIIMBOT's own template editor
 * at arbitrary zoom — a concern that doesn't apply when driving the head.
 */
export async function renderLabelCanvas(
  node: HTMLElement,
  opts?: { scale?: number },
): Promise<HTMLCanvasElement> {
  return rasterize(node, opts?.scale ?? 1);
}

/** Rasterize the node to a PNG and trigger a browser download. */
export async function downloadLabelPng(
  node: HTMLElement,
  filename: string,
  opts?: { pixelRatio?: number },
): Promise<void> {
  const blob = await renderLabelPngBlob(node, opts);
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  URL.revokeObjectURL(url);
}
