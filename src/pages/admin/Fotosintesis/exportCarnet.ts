/**
 * exportCarnet — capture a `<KardexPreview>` DOM node and emit a Kardex PDF.
 *
 * Thin wrapper over `captureNodeToPdf`. Slice 3 keeps the local-download
 * default for the "Descargar Kardex (vista previa)" button on the sale page,
 * and the confirm flow passes `download: false` so the Blob is uploaded to
 * Drive without also nuking the user's Downloads folder.
 */

import { captureNodeToPdf, type CapturePdfOptions } from "./captureNodeToPdf";

export async function exportCarnet(
  domNode: HTMLElement,
  filename: string,
  options?: Partial<Pick<CapturePdfOptions, "download">>,
): Promise<Blob> {
  return captureNodeToPdf(domNode, {
    filename,
    backgroundColor: "#FBF8F1",
    download: options?.download ?? true,
  });
}

export default exportCarnet;
