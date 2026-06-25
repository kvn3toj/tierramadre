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

async function rasterize(
  node: HTMLElement,
  pixelRatio: number,
): Promise<HTMLCanvasElement> {
  await waitForImages(node);
  return html2canvas(node, {
    scale: pixelRatio,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });
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
