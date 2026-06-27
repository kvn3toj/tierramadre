/**
 * exportCert — turn a CertPreview native node into a print-ready PDF or a
 * high-resolution PNG.
 *
 * The certificate preview already IS the artwork at exact dimensions, so we
 * rasterize the node with html2canvas and either:
 *  - embed it in a jsPDF page sized to the certificate's exact pixel
 *    dimensions (PDF, primary), or
 *  - download the canvas directly (PNG, secondary, social/preview).
 *
 * We wait for every <img> (background + photo) to decode first — html2canvas
 * snapshots synchronously, so an in-flight Drive image would rasterize blank.
 * Mirrors the proven pattern in captureNodeToPdf.ts.
 */

import { jsPDF } from "jspdf";
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

async function rasterize(
  node: HTMLElement,
  pixelRatio: number,
): Promise<HTMLCanvasElement> {
  // Inline cross-origin images + wait for decode on the LIVE node first, so the
  // clone below inherits same-origin data: URLs and never taints.
  await inlineCrossOriginImages(node);
  await waitForImages(node);
  await waitForFonts();

  // offsetWidth/Height are layout px, immune to the `transform: scale()` wrapper
  // CertPreview puts around this node. Capturing a clone OUTSIDE that wrapper
  // also frees html2canvas from the scaled-ancestor geometry that otherwise
  // makes it measure (and crop) the node at the on-screen scaled size.
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
  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  try {
    await waitForImages(clone);
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
    // html2canvas throws a SecurityError when the canvas was tainted by an
    // image it could not read cross-origin. Surface a clear, actionable error.
    if (err instanceof DOMException && err.name === "SecurityError") {
      throw new CertExportTaintError();
    }
    throw err;
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
  const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
  pdf.addImage(dataUrl, "JPEG", 0, 0, size.w, size.h, undefined, "FAST");

  if (opts?.download !== false) pdf.save(filename);
  return pdf.output("blob");
}

/** Export the node as a high-resolution PNG (download). */
export async function exportCertPng(
  node: HTMLElement,
  filename: string,
  opts?: { pixelRatio?: number },
): Promise<void> {
  const canvas = await rasterize(node, opts?.pixelRatio ?? 3);
  triggerDownload(canvas.toDataURL("image/png"), filename);
}
