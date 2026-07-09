/**
 * exportMovimientoKardexPdf — capture a `<MovimientoKardexPreview>` DOM node
 * and archive it to Drive as the digital comprobante for one "kardex de
 * movimientos con asesores" event (see convex/asesorMovements.ts).
 *
 * Thin wrapper over the EXISTING `captureNodeToPdf` (same rasterizer
 * `KardexPreview`'s `exportCarnet` uses) + `uploadVentaDocument` (the same
 * Drive-upload transport the sale carnet/certificado flows use, via
 * `/api/media-upload`). No new capture or upload logic is invented here —
 * this module only supplies the filename/subPath conventions for this
 * document type.
 */

import { captureNodeToPdf } from './captureNodeToPdf';
import { uploadVentaDocument } from './utils/uploadItemMedia';

/**
 * Drive folder a movimiento comprobante is filed under:
 * `movimientos-asesor/YYYY/MM` for the given date — mirrors `ventasSubPath`'s
 * shape but keeps this document family in its own top-level folder rather
 * than mixing it into `ventas/`. Falls back to the current month for an
 * invalid/missing date.
 */
export function movimientosAsesorSubPath(date: Date = new Date()): string {
  const d = Number.isNaN(date.getTime()) ? new Date() : date;
  return `movimientos-asesor/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export interface ExportMovimientoKardexPdfOptions {
  /** Trigger a local download via `jsPDF.save`, in addition to returning the
   *  Blob. Defaults to `false` — this helper's primary use is archiving to
   *  Drive, not a manual download. */
  download?: boolean;
}

/**
 * Rasterize the given `<MovimientoKardexPreview>` DOM node to a PDF Blob.
 * Pure capture — does NOT upload. Use `exportAndUploadMovimientoKardexPdf`
 * for the full capture-then-archive flow.
 */
export async function exportMovimientoKardexPdf(
  domNode: HTMLElement,
  filename: string,
  options?: ExportMovimientoKardexPdfOptions,
): Promise<Blob> {
  return captureNodeToPdf(domNode, {
    filename,
    backgroundColor: '#FBF8F1',
    download: options?.download ?? false,
  });
}

export interface UploadMovimientoKardexPdfOptions {
  /** Overrides the default `movimientos-asesor/YYYY/MM` Drive subPath. */
  subPath?: string;
  /** Date the event happened — feeds the default subPath's YYYY/MM. Defaults
   *  to "now" when omitted. */
  fecha?: Date;
}

/**
 * Capture `domNode` (a mounted `<MovimientoKardexPreview>`) to a PDF and
 * upload it to Drive via `uploadVentaDocument`. Returns the hosted URL so the
 * caller can persist it (e.g. patch it onto the `asesorMovements` rows or
 * surface it as a link) — this helper does not write to Convex itself, same
 * division of concerns as `exportCarnet` + the `setCarnetUrl` call site in
 * `VentaDetailPage`.
 */
export async function exportAndUploadMovimientoKardexPdf(
  domNode: HTMLElement,
  filename: string,
  options?: UploadMovimientoKardexPdfOptions,
): Promise<string> {
  const blob = await exportMovimientoKardexPdf(domNode, filename, {
    download: false,
  });
  const file = new File([blob], filename, { type: 'application/pdf' });
  const subPath = options?.subPath ?? movimientosAsesorSubPath(options?.fecha);
  return uploadVentaDocument(file, { subPath });
}

export default exportMovimientoKardexPdf;
