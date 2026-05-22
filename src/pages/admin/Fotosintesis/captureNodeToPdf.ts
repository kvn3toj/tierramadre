/**
 * Shared base for Fotosíntesis v2 paper-DOM → PDF capture.
 *
 * Both `exportCarnet` and `exportCertificado` use this helper to turn a live
 * preview node (Kardex, Certificado) into a US Letter portrait PDF. Keeping
 * it in one place avoids drift in scale/margins/dpi across the two outputs.
 *
 * Behaviour:
 *  - `html2canvas` at 2× scale on the supplied node
 *  - PNG embedded in a single-page jsPDF (Letter portrait, 48pt margins)
 *  - When `download === true`, triggers `pdf.save(filename)`
 *  - Always returns the PDF Blob so the caller can upload it
 */

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const PAGE_WIDTH_PT = 612; // 8.5in × 72
const PAGE_HEIGHT_PT = 792; // 11in × 72
const MARGIN_PT = 48; // 2/3in

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

  const canvas = await html2canvas(domNode, {
    backgroundColor,
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");

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
  pdf.addImage(imgData, "PNG", offsetX, offsetY, drawWidth, drawHeight);

  if (download) {
    pdf.save(filename);
  }
  return pdf.output("blob") as Blob;
}

export default captureNodeToPdf;
