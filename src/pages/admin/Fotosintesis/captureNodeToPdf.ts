/**
 * Shared base for Fotosíntesis v2 paper-DOM → PDF capture.
 *
 * Both `exportCarnet` and `exportCertificado` use this helper to turn a live
 * preview node (Kardex, Certificado) into a US Letter portrait PDF. Keeping
 * it in one place avoids drift in scale/margins/dpi across the two outputs.
 *
 * Behaviour:
 *  - Waits for every `<img>` inside the node to finish decoding first
 *    (otherwise html2canvas rasterizes still-loading thumbnails as blank
 *    pixels — the root cause of "empty" archived Kardex PDFs)
 *  - `html2canvas` at 2× scale on the supplied node
 *  - Budget-aware JPEG embedded in a single-page jsPDF (Letter portrait, 48pt
 *    margins) — JPEG, not PNG, so the body stays under the upload size limit
 *  - When `download === true`, triggers `pdf.save(filename)`
 *  - Always returns the PDF Blob so the caller can upload it
 */

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const PAGE_WIDTH_PT = 612; // 8.5in × 72
const PAGE_HEIGHT_PT = 792; // 11in × 72
const MARGIN_PT = 48; // 2/3in
const IMAGE_LOAD_TIMEOUT_MS = 10000; // per-image cap so a 404 never hangs capture

/**
 * Resolve once every `<img>` under `node` is decoded (or has errored / timed
 * out). html2canvas snapshots the DOM synchronously, so any thumbnail that is
 * still in flight at capture time renders blank in the output. Mirrors the
 * proven pattern in `utils/slidePdfGenerator.ts`: already-complete images
 * resolve instantly; the rest race their `load`/`error` against a timeout so a
 * single stalled Drive image can't block the whole PDF.
 */
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
        const timer = setTimeout(() => {
          if (import.meta.env?.DEV) {
            console.warn(
              "[captureNodeToPdf] image load timeout:",
              img.src?.slice(0, 80),
            );
          }
          resolve();
        }, IMAGE_LOAD_TIMEOUT_MS);
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      });
    }),
  );
}

/**
 * Vercel serverless functions reject request bodies larger than ~4.5 MB with a
 * 413 *before* our handler runs, so the image embedded in the PDF must stay well
 * under that. A lossless PNG of a 2× Letter page that contains a real photo
 * easily exceeds it; JPEG (the comprobante has an opaque paper background, so no
 * alpha is lost) compresses ~5–10× smaller. We keep the highest quality that
 * fits a safe budget, stepping down for heavy multi-thumbnail kardexes.
 */
const MAX_EMBED_BYTES = 4_000_000; // ~4 MB, headroom under Vercel's ~4.5 MB body limit
const JPEG_QUALITY_LADDER = [0.92, 0.85, 0.75, 0.6] as const;

/** Approximate decoded byte size of a base64 data URL. Exported for testing. */
export function dataUrlByteLength(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/**
 * Encode `canvas` as the highest-quality JPEG that fits `MAX_EMBED_BYTES`. The
 * lowest rung is returned as-is if even it overshoots — a slightly soft carnet
 * beats a hard 413 with no carnet at all.
 */
function encodeJpegWithinBudget(canvas: HTMLCanvasElement): string {
  let imgData = "";
  for (const quality of JPEG_QUALITY_LADDER) {
    imgData = canvas.toDataURL("image/jpeg", quality);
    if (dataUrlByteLength(imgData) <= MAX_EMBED_BYTES) break;
  }
  return imgData;
}

export interface CapturePdfOptions {
  /** Filename used when `download` is true. */
  filename: string;
  /** Background color passed to html2canvas (matches the paper tone). */
  backgroundColor?: string;
  /** Trigger a local download via `jsPDF.save`. Defaults to `true`. */
  download?: boolean;
}

export async function captureNodeToPdf(
  domNode: HTMLElement,
  { filename, backgroundColor = "#FBF8F1", download = true }: CapturePdfOptions,
): Promise<Blob> {
  if (!domNode) {
    throw new Error("captureNodeToPdf: domNode is required");
  }

  // Block until thumbnails/logo are decoded so they aren't captured blank.
  await waitForImages(domNode);

  const canvas = await html2canvas(domNode, {
    backgroundColor,
    scale: 2,
    useCORS: true,
    logging: false,
  });

  // JPEG (not PNG): keeps the embedded image small enough to clear the upload
  // endpoint's body limit — see encodeJpegWithinBudget.
  const imgData = encodeJpegWithinBudget(canvas);

  // Fit the rasterized canvas into the usable Letter area, preserving aspect.
  const usableWidth = PAGE_WIDTH_PT - MARGIN_PT * 2;
  const usableHeight = PAGE_HEIGHT_PT - MARGIN_PT * 2;
  const canvasRatio = canvas.width / canvas.height;
  const usableRatio = usableWidth / usableHeight;

  let drawWidth: number;
  let drawHeight: number;
  if (canvasRatio > usableRatio) {
    drawWidth = usableWidth;
    drawHeight = drawWidth / canvasRatio;
  } else {
    drawHeight = usableHeight;
    drawWidth = drawHeight * canvasRatio;
  }

  const offsetX = (PAGE_WIDTH_PT - drawWidth) / 2;
  const offsetY = MARGIN_PT;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
  });
  pdf.addImage(imgData, "JPEG", offsetX, offsetY, drawWidth, drawHeight);

  if (download) {
    pdf.save(filename);
  }
  return pdf.output("blob") as Blob;
}

export default captureNodeToPdf;
