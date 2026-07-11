/**
 * exportCert — turn a CertPreview native node into a print-ready PDF or a
 * high-resolution PNG.
 *
 * The certificate preview already IS the artwork at exact dimensions, so we
 * rasterize the node and either:
 *  - embed it in a jsPDF page sized to the certificate's exact pixel
 *    dimensions (PDF, primary), or
 *  - download the canvas directly (PNG, secondary, social/preview).
 *
 * Rasterizer: snapDOM is the PRIMARY engine — it serializes the node into an
 * SVG <foreignObject> and lets the browser's own layout/paint engine draw it, so
 * object-fit:cover, CSS transforms, web fonts, word-wrap and the details auto-fit
 * render EXACTLY as the on-screen preview (no reimplemented-CSS quirks like
 * html2canvas). html2canvas remains as a runtime FALLBACK: if snapDOM throws or
 * returns a blank canvas (a known iOS-WebKit <foreignObject> first-capture
 * failure mode), we fall back to the proven html2canvas path so an export is
 * never silently blank on any device.
 *
 * We wait for every <img> (background + photo) AND the web fonts to settle first
 * — both rasterizers snapshot a moment in time, so an in-flight Drive image or
 * unloaded font would render blank / mis-laid-out.
 */

import { jsPDF } from "jspdf";
import { snapdom } from "@zumer/snapdom";
import html2canvas from "html2canvas";

const IMAGE_LOAD_TIMEOUT_MS = 10000;

/** Raised when the canvas is tainted by a cross-origin photo we couldn't inline. */
export class CertExportTaintError extends Error {
  constructor() {
    super(
      "La foto proviene de un dominio externo y no se pudo incrustar. " +
        "Subí la imagen con «Subir imagen» (o usá una URL del catálogo) y volvé a exportar.",
    );
    this.name = "CertExportTaintError";
  }
}

/**
 * Best-effort: convert any cross-origin http(s) <img> to a data URL so the
 * export canvas never taints. Same-origin and data:/blob: images are left as
 * is. If a fetch fails (e.g. the host blocks CORS) we leave the original src —
 * html2canvas `useCORS` may still succeed, and if not the taint is reported
 * with a clear message by `rasterize`.
 */
async function inlineCrossOriginImages(node: HTMLElement): Promise<void> {
  const imgs = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute("src") || "";
      if (!/^https?:\/\//i.test(src)) return; // data:, blob:, relative → safe
      try {
        const url = new URL(src, window.location.href);
        if (url.origin === window.location.origin) return; // same-origin → safe
        const res = await fetch(src, { mode: "cors", credentials: "omit" });
        if (!res.ok) return;
        const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(String(fr.result));
          fr.onerror = reject;
          fr.readAsDataURL(blob);
        });
        img.setAttribute("src", dataUrl);
      } catch {
        /* leave original src; useCORS / taint handling takes over */
      }
    }),
  );
}

async function waitForImages(node: HTMLElement): Promise<void> {
  const images = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const done = () => {
          clearTimeout(timer);
          resolve();
        };
        const timer = setTimeout(resolve, IMAGE_LOAD_TIMEOUT_MS);
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      });
    }),
  );
}

/**
 * Wait for the certificate's web fonts before rasterizing. html2canvas snapshots
 * synchronously and does NOT wait for `font-display: swap` fonts to load — if it
 * runs first, text is laid out with fallback metrics and the real glyphs paint at
 * the wrong baselines, collapsing the name/details lines into an overlapping,
 * garbled block. Loading the exact families/weights and awaiting `fonts.ready`
 * guarantees the rasterized text matches the on-screen preview.
 */
async function waitForFonts(): Promise<void> {
  try {
    if (typeof document === "undefined" || !("fonts" in document)) return;
    const faces = [
      "300 16px 'Cormorant Garamond'",
      "400 16px 'Cormorant Garamond'",
      "500 16px 'Cormorant Garamond'",
      "600 16px 'Cormorant Garamond'",
      "700 16px 'Cormorant Garamond'",
      "italic 400 16px 'Cormorant Garamond'",
      "italic 500 16px 'Cormorant Garamond'",
      "italic 600 16px 'Cormorant Garamond'",
      "600 16px 'Cinzel'",
      "400 16px 'Montserrat'",
      "700 16px 'Montserrat'",
    ];
    await Promise.race([
      Promise.all([
        ...faces.map((f) => document.fonts.load(f).catch(() => undefined)),
        document.fonts.ready,
      ]),
      // Never block the export indefinitely on a font CDN hiccup.
      new Promise((resolve) => setTimeout(resolve, IMAGE_LOAD_TIMEOUT_MS)),
    ]);
  } catch {
    /* best-effort: a font failure must not block the export */
  }
}

/**
 * Largest canvas AREA Safari (desktop + iOS) will back: 16,777,216 px². Exceed
 * it and Safari yields a SILENTLY blank canvas (no throw) — toDataURL then
 * returns an empty image, so an over-scaled export "succeeds" while producing a
 * blank file (and persistCert would upload that blank to Drive). A 0.95 margin
 * covers device variance.
 */
const MAX_CANVAS_AREA = 16_777_216 * 0.95;

/**
 * Cheap "did the rasterizer produce nothing?" probe. iOS WebKit can hand back a
 * fully blank <foreignObject> capture (no throw). Downscale to 8×8 and check for
 * ANY non-white, non-transparent pixel — a real certificate (green band, photo,
 * text) always has some. A taint (getImageData throws) returns false: not blank,
 * let the taint surface at toDataURL with a clear message.
 */
function isCanvasBlank(canvas: HTMLCanvasElement): boolean {
  try {
    if (!canvas.width || !canvas.height) return true;
    const probe = document.createElement("canvas");
    probe.width = 8;
    probe.height = 8;
    const ctx = probe.getContext("2d", { willReadFrequently: true });
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

async function rasterize(
  node: HTMLElement,
  pixelRatio: number,
): Promise<HTMLCanvasElement> {
  // Inline cross-origin images + wait for decode + fonts on the LIVE node first,
  // so the clone below inherits same-origin data: URLs (never taints) and the
  // text is laid out with the real fonts.
  await inlineCrossOriginImages(node);
  await waitForImages(node);
  await waitForFonts();

  // offsetWidth/Height are layout px, immune to the `transform: scale()` wrapper
  // CertPreview puts around this node. Capturing a clone OUTSIDE that wrapper
  // frees the rasterizer from the scaled-ancestor geometry that otherwise makes
  // it measure (and crop) the node at the on-screen scaled size.
  const width = node.offsetWidth || 1;
  const height = node.offsetHeight || 1;

  // Clamp the DPI so the backing canvas stays under Safari's area cap.
  const areaScale = Math.sqrt(MAX_CANVAS_AREA / (width * height));
  const scale = Math.max(1, Math.min(pixelRatio, areaScale));

  const sandbox = document.createElement("div");
  sandbox.setAttribute("aria-hidden", "true");
  sandbox.style.cssText =
    `position:fixed;left:-100000px;top:0;width:${width}px;height:${height}px;` +
    `margin:0;padding:0;overflow:hidden;background:#ffffff;` +
    `pointer-events:none;z-index:-1;`;
  const clone = node.cloneNode(true) as HTMLElement;
  clone.style.transform = "none";
  // The card boxShadow is an on-screen affordance, not part of the print artwork;
  // strip it so neither rasterizer bleeds a shadow into the captured box.
  clone.style.boxShadow = "none";
  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  try {
    await waitForImages(clone);

    // PRIMARY: snapDOM — browser-native rendering, so the export matches the
    // preview exactly (object-fit, transforms, fonts, auto-fit). dpr:1 makes
    // `scale` the sole resolution multiplier so the area clamp holds.
    try {
      const canvas = await snapdom.toCanvas(clone, {
        scale,
        dpr: 1,
        backgroundColor: "#ffffff",
        embedFonts: true,
      });
      if (!isCanvasBlank(canvas)) return canvas;
      console.warn(
        "[CertExport] snapDOM returned a blank canvas; falling back to html2canvas.",
      );
    } catch (e) {
      console.warn(
        "[CertExport] snapDOM failed; falling back to html2canvas.",
        e,
      );
    }

    // FALLBACK: html2canvas (proven path) — protects iOS where snapDOM's
    // <foreignObject> capture can blank. Explicit window dims avoid viewport crop.
    try {
      return await html2canvas(clone, {
        scale,
        useCORS: true,
        backgroundColor: "#ffffff",
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
    } catch (err) {
      if (err instanceof DOMException && err.name === "SecurityError") {
        throw new CertExportTaintError();
      }
      throw err;
    }
  } finally {
    document.body.removeChild(sandbox);
  }
}

export interface CertExportSize {
  /** native px dimensions of the certificate (= template.print) */
  w: number;
  h: number;
  orientation: "portrait" | "landscape";
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Read the canvas out as a data URL, mapping the cross-origin taint failure to a
 * clear, actionable error. snapDOM's `toCanvas` (drawImage of a data: SVG) does
 * not throw on taint — the SecurityError only surfaces here, at `toDataURL`.
 */
function canvasToDataUrl(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): string {
  try {
    return canvas.toDataURL(type, quality);
  } catch (err) {
    if (err instanceof DOMException && err.name === "SecurityError") {
      throw new CertExportTaintError();
    }
    throw err;
  }
}

/**
 * Export the node as a single-page PDF sized exactly to the certificate.
 * Returns the PDF Blob (also downloaded when `download !== false`).
 */
export async function exportCertPdf(
  node: HTMLElement,
  size: CertExportSize,
  filename: string,
  opts?: { download?: boolean; pixelRatio?: number },
): Promise<Blob> {
  const canvas = await rasterize(node, opts?.pixelRatio ?? 3);

  // jsPDF page units in px so 1 unit = 1 certificate pixel — exact size.
  const pdf = new jsPDF({
    orientation: size.orientation,
    unit: "px",
    format: [size.w, size.h],
    hotfixes: ["px_scaling"],
  });
  const dataUrl = canvasToDataUrl(canvas, "image/jpeg", 0.95);
  pdf.addImage(dataUrl, "JPEG", 0, 0, size.w, size.h, undefined, "FAST");

  if (opts?.download !== false) pdf.save(filename);
  return pdf.output("blob");
}

/**
 * Rasterize the node to a high-resolution PNG and return it as a Blob (NOT
 * downloaded). Shared by the download button (`exportCertPng`) and the
 * persist-to-product path, so the on-screen cert, the downloaded PNG, and the
 * product-linked image are all the same pixels. The cross-origin taint failure
 * is mapped to the same clear error as the other exporters via canvasToDataUrl.
 */
export async function renderCertPngBlob(
  node: HTMLElement,
  opts?: { pixelRatio?: number },
): Promise<Blob> {
  const canvas = await rasterize(node, opts?.pixelRatio ?? 3);
  const dataUrl = canvasToDataUrl(canvas, "image/png");
  // dataURL → Blob without a network round-trip (fetch on a data: URL is
  // synchronous-ish and avoids manual base64 decoding).
  const res = await fetch(dataUrl);
  return res.blob();
}

/** Export the node as a high-resolution PNG (download). */
export async function exportCertPng(
  node: HTMLElement,
  filename: string,
  opts?: { pixelRatio?: number },
): Promise<void> {
  const canvas = await rasterize(node, opts?.pixelRatio ?? 3);
  triggerDownload(canvasToDataUrl(canvas, "image/png"), filename);
}
