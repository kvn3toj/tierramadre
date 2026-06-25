/**
 * persistCert — upload a generated certificate to Drive and LINK it to the
 * product (or sale) it belongs to, so it surfaces beyond the user's download
 * folder (the product-detail page renders `certificateUrl`).
 *
 * This is the persistence twin of `exportCert.ts`: where exportCert rasterizes
 * the same CertPreview node to a downloadable PDF/PNG, persistCert rasterizes it
 * to a PDF Blob, uploads it through the EXISTING Fotosíntesis cert-upload path
 * (`uploadFotosintesisCertificado` → `/api/media-upload`, the same endpoint
 * EditItemDrawer uses), and writes the hosted URL back via the Convex media
 * mutations. No new upload endpoint is invented.
 *
 * The legal gate (`VITE_CERT_LEGAL_APPROVED`, Q-6) is respected here exactly as
 * it gates `exportCertificado`: a legally-unapproved cert is never persisted.
 */

import { uploadFotosintesisCertificado } from "../utils/uploadItemMedia";
import { isCertificadoApproved } from "../exportCertificado";
import { exportCertPdf, type CertExportSize } from "./exportCert";
import { convexApi } from "../../../../lib/convex-safe";
import type { ConvexReactClient } from "convex/react";

/** Thrown when the legal copy (Q-6) is not yet approved — caller surfaces it. */
export class CertNotApprovedError extends Error {
  constructor() {
    super(
      "Certificado pendiente: la copia legal (Q-6) aún no fue aprobada. " +
        "Activá VITE_CERT_LEGAL_APPROVED=true para guardar/enlazar el certificado.",
    );
    this.name = "CertNotApprovedError";
  }
}

/** Re-export so the page can short-circuit before doing any work. */
export { isCertificadoApproved };

// ── loose imperative client helpers ──────────────────────────────────────────
// Mirror the pattern in copilot/executeAction.ts: the generated query/mutation
// refs are strongly typed but we dispatch loosely so this module doesn't have to
// re-declare the mutation signatures. A wrong arg surfaces as a Convex runtime
// rejection (caught + shown), never silent.
type Client = ConvexReactClient;
function runQuery<T>(client: Client, ref: unknown, args: unknown): Promise<T> {
  return (client.query as (r: unknown, a: unknown) => Promise<unknown>)(
    ref,
    args,
  ) as Promise<T>;
}
function runMutation<T>(
  client: Client,
  ref: unknown,
  args: unknown,
): Promise<T> {
  return (client.mutation as (r: unknown, a: unknown) => Promise<unknown>)(
    ref,
    args,
  ) as Promise<T>;
}

/**
 * Rasterize the CertPreview node to a PDF Blob (NOT downloaded) and wrap it in a
 * named File so the upload endpoint preserves the `.pdf` extension. Reuses
 * exportCertPdf so the persisted artifact is byte-identical to the exported one.
 */
async function captureCertFile(
  node: HTMLElement,
  size: CertExportSize,
  filename: string,
): Promise<File> {
  const blob = await exportCertPdf(node, size, filename, { download: false });
  return new File([blob], filename, { type: "application/pdf" });
}

export interface PersistToProductArgs {
  client: Client;
  node: HTMLElement;
  size: CertExportSize;
  filename: string;
  /** The selected product's lot id (TreasureItem.loteId). */
  loteId: string;
  /** The selected product's itemId (TreasureItem.item, a number → string). */
  itemId: string;
  editorEmail?: string;
}

export interface PersistResult {
  url: string;
  /** The lotItems join-row id we linked the cert to. */
  lotItemId: string;
}

/**
 * ORIGEN flow → link the certificate to a Fotosíntesis lot product.
 *
 * 1. Gate on legal approval (mirrors exportCertificado).
 * 2. Capture + upload the cert → hosted Drive URL.
 * 3. Resolve the product's `lotItemId` from its `loteId` via
 *    `lotItems.listByLote`, matching `itemId`.
 * 4. Persist with `lotItems.updateMedia({ lotItemId, certificadoUrl, ... })`,
 *    which mirrors to `productInventory.certificadoUrl` → the product-detail
 *    page's `certificateUrl`.
 *
 * Throws a clear, human message when the item is not part of a lot (no
 * lotItem row) so the caller can surface it without crashing.
 */
export async function persistCertToProduct(
  args: PersistToProductArgs,
): Promise<PersistResult> {
  if (!isCertificadoApproved()) throw new CertNotApprovedError();

  const { client, node, size, filename, loteId, itemId, editorEmail } = args;

  // Upload first so a Convex resolution failure doesn't leave us having
  // claimed success with no hosted file.
  const file = await captureCertFile(node, size, filename);
  const url = await uploadFotosintesisCertificado(file, loteId, itemId);

  // Resolve itemId → lotItemId via the lot's join rows.
  const rows = await runQuery<Array<{ _id: string; itemId: string }>>(
    client,
    convexApi.lotItems.listByLote,
    { loteId },
  );
  const found = rows.find((r) => r.itemId === itemId);
  if (!found) {
    throw new Error(
      `No encontré el ítem ${itemId} en el lote ${loteId}; no puedo enlazar el certificado.`,
    );
  }

  await runMutation(client, convexApi.lotItems.updateMedia, {
    lotItemId: found._id,
    certificadoUrl: url,
    ...(editorEmail ? { editorEmail } : {}),
  });

  return { url, lotItemId: found._id };
}

export interface PersistToSaleArgs {
  client: Client;
  node: HTMLElement;
  size: CertExportSize;
  filename: string;
  /** Convex `sales` document id this cert/carnet belongs to. */
  saleId: string;
  subPath?: string;
}

/**
 * SALE-LINKED flow → attach the document to a venta.
 *
 * `kind: "certificado"` → `sales.setCertificadoUrl`; `kind: "carnet"` →
 * `sales.setCarnetUrl`. Both upload through the same Drive endpoint.
 *
 * NOTE: the current generator has NO sale context (the embajador/carnet flows
 * are driven by an `Asesor`, not a `venta`). This helper is scaffolded for when
 * the generator is opened from a sale — wire `saleId` in then. We deliberately
 * do NOT fabricate a sale id here.
 *
 * TODO(sale-context): pass a real `sales` doc id from the venta detail / kardex
 * entry point and call `persistCertToSale` from the page's "Guardar" action.
 */
export async function persistCertToSale(
  args: PersistToSaleArgs & { kind: "certificado" | "carnet" },
): Promise<{ url: string }> {
  if (!isCertificadoApproved()) throw new CertNotApprovedError();

  const { client, node, size, filename, saleId, subPath, kind } = args;

  const blob = await exportCertPdf(node, size, filename, { download: false });
  const file = new File([blob], filename, { type: "application/pdf" });

  // Sale documents live under `ventas/YYYY/MM`; the caller may override.
  const { uploadVentaDocument } = await import("../utils/uploadItemMedia");
  const url = await uploadVentaDocument(
    file,
    subPath ? { subPath } : undefined,
  );

  const ref =
    kind === "carnet"
      ? convexApi.sales.setCarnetUrl
      : convexApi.sales.setCertificadoUrl;
  const payload =
    kind === "carnet"
      ? { id: saleId, carnetUrl: url }
      : { id: saleId, certificadoUrl: url };

  await runMutation(client, ref, payload);
  return { url };
}
