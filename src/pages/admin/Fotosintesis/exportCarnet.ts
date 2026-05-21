/**
 * exportCarnet — capture a `<KardexPreview>` DOM node and emit a PDF.
 *
 * Slice 1: PDF is downloaded locally via `jsPDF.save()` and the Blob is
 * returned to the caller so the existing flow can keep going (no Drive
 * upload yet — see TODO below).
 *
 * Slice 3 will pipe the returned Blob through `/api/media-upload` and
 * call `sales.setCarnetUrl({ id, carnetUrl })` to persist the link.
 */

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

/** US Letter portrait in points (72pt = 1in). */
const PAGE_WIDTH_PT = 612; // 8.5in × 72
const PAGE_HEIGHT_PT = 792; // 11in × 72
const MARGIN_PT = 48; // 2/3in

/**
 * Capture `domNode` with html2canvas, render it into a Letter-portrait PDF
 * preserving aspect ratio, trigger a download via `pdf.save(filename)`, and
 * return the PDF Blob so callers can optionally upload it.
 *
 * @throws if html2canvas or jsPDF fails. Callers should catch + surface a toast.
 */
export async function exportCarnet(
  domNode: HTMLElement,
  filename: string,
): Promise<Blob> {
  if (!domNode) {
    throw new Error("exportCarnet: domNode is required");
  }

  // 1) Rasterize the live DOM at 2× for crisp PDFs.
  const canvas = await html2canvas(domNode, {
    backgroundColor: "#FBF8F1",
    scale: 2,
    useCORS: true,
    // Logging gets noisy in dev; opt out.
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");

  // 2) Compute target dimensions: fit canvas into the usable Letter area,
  // preserving aspect ratio. Center horizontally; top-align.
  const usableWidth = PAGE_WIDTH_PT - MARGIN_PT * 2;
  const usableHeight = PAGE_HEIGHT_PT - MARGIN_PT * 2;

  const canvasRatio = canvas.width / canvas.height;
  const usableRatio = usableWidth / usableHeight;

  let drawWidth: number;
  let drawHeight: number;
  if (canvasRatio > usableRatio) {
    // wider than usable → constrain by width
    drawWidth = usableWidth;
    drawHeight = drawWidth / canvasRatio;
  } else {
    // taller → constrain by height
    drawHeight = usableHeight;
    drawWidth = drawHeight * canvasRatio;
  }

  const offsetX = (PAGE_WIDTH_PT - drawWidth) / 2;
  const offsetY = MARGIN_PT;

  // 3) Build the PDF.
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
  });

  pdf.addImage(imgData, "PNG", offsetX, offsetY, drawWidth, drawHeight);

  // 4) Trigger local download (Slice 1 behavior).
  pdf.save(filename);

  // 5) Return the Blob so the caller can do more with it.
  // TODO(Slice 3): pipe this Blob through `/api/media-upload`, then call
  // `sales.setCarnetUrl({ id, carnetUrl })` to persist the Drive link.
  const blob = pdf.output("blob") as Blob;
  return blob;
}

export default exportCarnet;
