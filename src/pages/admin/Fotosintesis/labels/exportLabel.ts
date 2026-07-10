/**
 * exportLabel — rasterize a LabelPreview DOM node to a PNG, for either a
 * single-file download or (via renderLabelPngBlob) inclusion in a batch zip.
 *
 * Simpler than certificados/exportCert.ts's dual-rasterizer setup: labels
 * have no photos/cross-origin images (just an inline QR SVG + plain text), so
 * there's no taint risk to guard against — a direct html2canvas capture is
 * sufficient, matching the plainer captureNodeToPdf.ts pattern used for the
 * Kardex/movimiento previews.
 */

import html2canvas from 'html2canvas';

// 203 DPI is the NIIMBOT D11's native print resolution — matching pixelRatio
// here keeps the exported PNG crisp at the label's real physical size when
// imported into NIIMBOT's own template editor.
const DEFAULT_PIXEL_RATIO = 203 / 96; // native DPI ÷ CSS-px label height

function triggerDownload(href: string, filename: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Rasterize the node to a PNG Blob (not downloaded). */
export async function renderLabelPngBlob(
  node: HTMLElement,
  opts?: { pixelRatio?: number },
): Promise<Blob> {
  const canvas = await html2canvas(node, {
    backgroundColor: '#FFFFFF',
    scale: opts?.pixelRatio ?? DEFAULT_PIXEL_RATIO,
    useCORS: true,
    logging: false,
  });
  const dataUrl = canvas.toDataURL('image/png');
  const res = await fetch(dataUrl);
  return res.blob();
}

/**
 * Rasterize the node to a raw canvas (not a Blob) — used by the direct-print
 * path, which needs an HTMLCanvasElement to hand to niimbluelib's
 * ImageEncoder.encodeCanvas, not a downloadable file.
 *
 * scale: 1 (not the 203/96 DPI-matching scale renderLabelPngBlob uses) is
 * intentional here — the label is authored at 96 CSS px, which already
 * equals the printer head's native ~96 dots for a 12mm label at 203 DPI, so
 * scale:1 gives native print resolution directly. The PNG-export path scales
 * UP instead, because that PNG needs to look crisp when re-imported into
 * NIIMBOT's own template editor at arbitrary zoom levels — a concern that
 * doesn't apply when printing straight to the print head.
 */
export async function renderLabelCanvas(
  node: HTMLElement,
  opts?: { scale?: number },
): Promise<HTMLCanvasElement> {
  return html2canvas(node, {
    backgroundColor: '#FFFFFF',
    scale: opts?.scale ?? 1,
    useCORS: true,
    logging: false,
  });
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
