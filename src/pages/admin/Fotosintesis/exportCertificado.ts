/**
 * exportCertificado — capture a `<CertificadoPreview>` DOM node and emit a
 * Certificado de Origen PDF.
 *
 * Gated by `VITE_CERT_LEGAL_APPROVED`. The certificate template (Q-6) needs
 * approved legal copy from Maritza / counsel before we can ship it to a real
 * buyer. Until that flag flips to "true", `exportCertificado` throws so we
 * never accidentally produce a certificate with placeholder legal language.
 *
 * The Slice 3 confirm flow catches this error and treats it as "carnet OK,
 * certificate pending" — non-blocking.
 */

import { captureNodeToPdf, type CapturePdfOptions } from "./captureNodeToPdf";

const LEGAL_FLAG = import.meta.env.VITE_CERT_LEGAL_APPROVED;

export class CertificadoNotApprovedError extends Error {
  constructor() {
    super(
      "Certificado pendiente: la copia legal (Q-6) aún no fue aprobada por Maritza/abogado. " +
        "Activá VITE_CERT_LEGAL_APPROVED=true cuando esté firmada.",
    );
    this.name = "CertificadoNotApprovedError";
  }
}

export function isCertificadoApproved(): boolean {
  return LEGAL_FLAG === "true";
}

export async function exportCertificado(
  domNode: HTMLElement,
  filename: string,
  options?: Partial<Pick<CapturePdfOptions, "download">>,
): Promise<Blob> {
  if (!isCertificadoApproved()) {
    throw new CertificadoNotApprovedError();
  }
  return captureNodeToPdf(domNode, {
    filename,
    backgroundColor: "#FBF8F1",
    download: options?.download ?? true,
  });
}

export default exportCertificado;
