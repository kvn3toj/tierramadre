/**
 * persistCert — upload a generated certificate to Drive and LINK it to the
 * product (or sale) it belongs to, so it surfaces beyond the user's download
 * folder (the product-detail page renders `certificateUrl`).
 *
 * This is the persistence twin of `exportCert.ts`: where exportCert rasterizes
 * the same CertPreview node to a downloadable PDF/PNG, persistCert rasterizes it
 * and uploads it through the EXISTING Fotosíntesis cert-upload path
 * (`uploadFotosintesisCertificado` → `/api/media-upload`, the same endpoint
 * EditItemDrawer uses), and writes the hosted URL back via the Convex media
 * mutations. No new upload endpoint is invented.
 *
 * Product-linked certs are captured as a PNG (not PDF): the product-detail
 * gallery is an image carousel, so an inline image lets the certificate show as
 * a real, zoomable slide (`category: "certificate"`) instead of only a
 * download link. The upload path re-encodes it to a ≤2000px JPEG, which stays
 * under Vercel's body limit and renders everywhere. The admin's separate
 * PDF/PNG *download* buttons are unchanged for print-fidelity needs. Sale-linked
 * documents (carnet/certificado on a venta) stay PDF — those are print/legal
 * artifacts, not carousel media.
 *
 * The legal gate (`VITE_CERT_LEGAL_APPROVED`, Q-6) is respected here exactly as
 * it gates `exportCertificado`: a legally-unapproved cert is never persisted.
 */

import { uploadFotosintesisCertificado } from '../utils/uploadItemMedia';
import { isCertificadoApproved } from '../exportCertificado';
import {
  exportCertPdf,
  renderCertPngBlob,
  type CertExportSize,
} from './exportCert';
import { convexApi } from '../../../../lib/convex-safe';
import { requireAuthTokenOrLogout } from '../../../../utils/sessionToken';
import type { ConvexReactClient } from 'convex/react';

/** Thrown when the legal copy (Q-6) is not yet approved — caller surfaces it. */
export class CertNotApprovedError extends Error {
  constructor() {
    super(
      'Certificado pendiente: la copia legal (Q-6) aún no fue aprobada. ' +
        'Activá VITE_CERT_LEGAL_APPROVED=true para guardar/enlazar el certificado.',
    );
    this.name = 'CertNotApprovedError';
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
 * Actions must be dispatched with `client.action`, not `client.mutation` —
 * Convex routes by function type and rejects the mismatch at runtime. The
 * staff-only `lotItems.*` actions additionally verify a fresh Google ID token
 * server-side (requireAccessLevel), so every call has to carry one; this module
 * is a plain function rather than a hook, so it reads the token directly
 * instead of going through `useAuthedConvexAction`.
 */
function runAction<T>(client: Client, ref: unknown, args: unknown): Promise<T> {
  return (client.action as (r: unknown, a: unknown) => Promise<unknown>)(
    ref,
    args,
  ) as Promise<T>;
}

/**
 * Rasterize the CertPreview node to a PNG Blob (NOT downloaded) and wrap it in a
 * named `.png` File so the upload endpoint serves it as an inline image the
 * product gallery can render as a slide. Reuses renderCertPngBlob so the
 * persisted image is the same pixels as the on-screen preview and the PNG
 * download. The `.png` extension is forced regardless of the caller's filename
 * so the hosted URL is always an image.
 */
async function captureCertFile(
  node: HTMLElement,
  filename: string,
): Promise<File> {
  const blob = await renderCertPngBlob(node, { pixelRatio: 3 });
  const pngName = filename.replace(/\.[^./\\]+$/, '') + '.png';
  return new File([blob], pngName, { type: 'image/png' });
}

export interface PersistToProductArgs {
  client: Client;
  node: HTMLElement;
  /**
   * Retained for API compatibility; the product path now rasterizes to PNG
   * (which reads size from the node itself), so this is no longer required.
   */
  size?: CertExportSize;
  filename: string;
  /**
   * The selected product's lot id (TreasureItem.loteId), used ONLY to choose
   * the Drive folder. Optional: most of the catalog has no lot (the Sheets
   * pull mirrors `loteId` but plenty of items never belonged to a Fotosíntesis
   * lot at all), and a certificate is a property of the ITEM, not of its lot.
   * Lot-less items file under `SIN_LOTE_FOLDER`.
   */
  loteId?: string;
  /** The selected product's itemId (TreasureItem.item, a number → string). */
  itemId: string;
}

/** Drive folder for certificates of items that belong to no lot. */
const SIN_LOTE_FOLDER = 'sin-lote';

export interface PersistResult {
  url: string;
}

/**
 * ORIGEN flow → link the certificate to a Fotosíntesis product.
 *
 * 1. Gate on legal approval (mirrors exportCertificado).
 * 2. Capture + upload the cert → hosted Drive URL.
 * 3. Persist with `lotItems.updateMediaByItem({ itemId, certificadoUrl })`,
 *    which writes `productInventory.certificadoUrl` → the product-detail page's
 *    `certificateUrl` → and schedules the Sheets push.
 *
 * HISTORY (2026-07-24): this used to resolve a `lotItemId` first, via
 * `lotItems.listByLote(loteId)` matched on `itemId`, and threw when the item had
 * no join row. That gate was wrong twice over. It was unnecessary — the media
 * write always landed on productInventory, never on `lotItems`, so the join row
 * was pure indirection. And it was unsatisfiable for most of the catalog: the
 * Sheets pull mirrors `loteId` onto productInventory but never creates the
 * Convex-only join row, so 375 of 513 items have none. Keying on `itemId`
 * removes the hop entirely.
 *
 * The call also had three defects that made it fail even WITH a join row:
 * `updateMedia` is an action (dispatched here as a mutation), its required
 * `idToken` was never passed, and it was handed an `editorEmail` its validator
 * does not accept. The editor is now derived server-side from the token.
 *
 * HISTORY (2026-08-11): the SAME bug class survived one level up. CertGenerator
 * refused to save with «Este ítem no es de un lote Fotosíntesis» whenever
 * `loteId` was empty — but the lot was never load-bearing here: it only names
 * the Drive folder, while the link itself is written by `updateMediaByItem`,
 * keyed on `itemId`. A certificate belongs to the ITEM. `loteId` is now
 * optional and lot-less items file under `sin-lote/`.
 */
export async function persistCertToProduct(
  args: PersistToProductArgs,
): Promise<PersistResult> {
  if (!isCertificadoApproved()) throw new CertNotApprovedError();

  const { client, node, filename, loteId, itemId } = args;

  const idToken = requireAuthTokenOrLogout();
  if (!idToken) {
    throw new Error(
      'No autenticado. Volvé a iniciar sesión e intentá de nuevo.',
    );
  }

  // Upload first so a Convex failure doesn't leave us having claimed success
  // with no hosted file.
  const file = await captureCertFile(node, filename);
  const url = await uploadFotosintesisCertificado(
    file,
    loteId?.trim() || SIN_LOTE_FOLDER,
    itemId,
  );

  await runAction(client, convexApi.lotItems.updateMediaByItem, {
    idToken,
    itemId,
    certificadoUrl: url,
  });

  return { url };
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
  args: PersistToSaleArgs & { kind: 'certificado' | 'carnet' },
): Promise<{ url: string }> {
  if (!isCertificadoApproved()) throw new CertNotApprovedError();

  const { client, node, size, filename, saleId, subPath, kind } = args;

  const blob = await exportCertPdf(node, size, filename, { download: false });
  const file = new File([blob], filename, { type: 'application/pdf' });

  // Sale documents live under `ventas/YYYY/MM`; the caller may override.
  const { uploadVentaDocument } = await import('../utils/uploadItemMedia');
  const url = await uploadVentaDocument(
    file,
    subPath ? { subPath } : undefined,
  );

  const ref =
    kind === 'carnet'
      ? convexApi.sales.setCarnetUrl
      : convexApi.sales.setCertificadoUrl;
  const payload =
    kind === 'carnet'
      ? { id: saleId, carnetUrl: url }
      : { id: saleId, certificadoUrl: url };

  await runMutation(client, ref, payload);
  return { url };
}
