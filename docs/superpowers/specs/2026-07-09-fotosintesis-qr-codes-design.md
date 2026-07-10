# Real QR Codes for Lotes, Items/Insumos, and Kardex/Certificate Previews

## Problem

`qrcode.react` is already wired into three places (`AdditionalInfo.tsx` product detail, `TotalsSection.tsx` cotizaciones, `InvitationGenerator.tsx`), all producing a real, scannable QR from a live URL. Everywhere else, QR codes are either absent or fake:

- **Lotes** have no QR anywhere.
- **Insumos** (and other non-gema/joya item types) have no QR — they're just `productInventory` rows tagged `categoria: "insumo"`, so nothing surfaces them.
- **`KardexPreview.tsx`**, **`MovimientoKardexPreview.tsx`**, and **`QuotationCertificate.tsx`** each render a decorative CSS grid (`repeating-linear-gradient` or a 5×5 `Box` grid) explicitly commented as a placeholder ("not a real QR — Slice 3").

This is Slice 3: replace the placeholders and add real QR codes to lotes and items, using only routes/params that already exist.

## Non-goals

- No new routes.
- No schema changes (no `qr` column writes — the existing `productInventory.qr` field stays untouched/vestigial, out of scope).
- No distinct "insumo" data model — insumos are handled identically to any other item type.
- No change to the existing three working QR sites (`AdditionalInfo.tsx`, `TotalsSection.tsx`, `InvitationGenerator.tsx`).

## Design

Every target URL is built from a route/param the component **already has in scope** — confirmed by reading each file, not assumed:

| Site           | File                                  | Existing prop used                                                          | Target URL                                                                                                   |
| -------------- | ------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Lote QR        | `KardexPreview.tsx:734-747`           | `lot.loteId` (prop `lot: KardexLot`, line 66; already read at line 673)     | `${STUDIO_BASE_URL}/admin/fotosintesis/lots/${lot.loteId}`                                                   |
| Movimiento QR  | `MovimientoKardexPreview.tsx:501-513` | `eventId` (derived from prop `kardexEventId`, line 95)                      | `${STUDIO_BASE_URL}/admin/fotosintesis/movimientos?kardexEventId=${eventId}`                                 |
| Item/insumo QR | `EditItemDrawer.tsx`                  | `loteId` (prop, line 110) + `lotItemId: Id<'lotItems'>` (prop, line 112)    | `${STUDIO_BASE_URL}/admin/fotosintesis/lots/${loteId}/items/${lotItemId}/edit`                               |
| Certificate QR | `QuotationCertificate.tsx:559-581`    | `quotationData.selectedProducts` (existing field, type `SelectedProduct[]`) | local helper mirroring `getQrCodeUrl()`'s inventory-product convention, adapted to `SelectedProduct`'s shape |

Routes referenced (all pre-existing, verified in `src/App.tsx`):

- `lots/:loteId` → `FotosintesisCapturaLote` (`ActiveLotPage`)
- `lots/:loteId/items/:lotItemId/edit` → `FotosintesisEditItem` (`EditItemPage`)
- `MovimientosKardexPage.tsx` already reads `?kardexEventId=` at mount (line 133-134) to open `MovimientoKardexPreview` — the QR reuses this exact deep-link convention, doesn't invent a new one.

### Why admin URLs, not public catalog URLs, for lote/item/movimiento

These three are internal traceability documents (kardex, item edit) used by Tierra Madre staff, not customers. The QR is there so a staff member scanning a printed Kardex or item label lands directly on the admin record. This mirrors the existing split in the codebase: `AdditionalInfo.tsx`/`TotalsSection.tsx` are customer-facing and link to `tierramadre.app/product/...`; the certificate (`QuotationCertificate.tsx`) is also customer-facing (handed to a client) and stays on the public `tierramadre.app` domain.

**Correction from initial investigation:** `QuotationCertificate.tsx`'s `quotationData.selectedProducts` is typed `SelectedProduct[]` (`{id, name, price, source: 'gallery' | 'inventory'}`), a different, leaner shape than `CotizacionProduct[]` (`{itemNumber: number, isManual?, videoUrl?, ...}`) that `getQrCodeUrl()` requires — so `getQrCodeUrl(quotationData.selectedProducts)` does not type-check and cannot be reused as-is. Instead, add a small local helper in `QuotationCertificate.tsx` that mirrors `getQrCodeUrl()`'s _convention_ (same `PRODUCTION_URL`, same `/product/:id` and `/tesoro?items=...&status=all` URL shapes) but built for `SelectedProduct`'s fields (`id` as the item number, `source === 'inventory'` in place of `!isManual`). This keeps behavior consistent with the existing cotización QR without a cross-module type mismatch.

### Rendering approach

All four sites use `<QRCodeSVG>` from `qrcode.react` (already the project's only QR component; `QRCodeCanvas` is not needed). All three PDF-preview sites (`KardexPreview`, `MovimientoKardexPreview`, `QuotationCertificate`) are rasterized via `html2canvas` in `captureNodeToPdf.ts` — an inline `<svg>` rasterizes correctly there today (proven by the cotización PDF flow), so no canvas pre-rendering step is needed.

Match the existing visual pattern from `AdditionalInfo.tsx`: `size` scaled to the placeholder it replaces (56/58/40/45px per site), `level="H"` (or `"L"` for the smaller certificate QR, matching `TotalsSection.tsx`'s existing choice), `fgColor`/`bgColor` matching each surface's ink/paper colors instead of always `emeraldCore.darkest`/white (Kardex previews use a warm paper palette — `PAPER_INK` / `PAPER_BG` — not the emerald brand colors).

### Error/edge cases

- `KardexPreview`: `lot` prop is `KardexLot | null | undefined`. When `lot` is null/undefined (e.g. no lote associated), fall back to the existing placeholder box rather than rendering a QR to `.../lots/undefined`.
- `MovimientoKardexPreview`: `eventId` already has a `'—'` fallback (line 95) when no `kardexEventId` is resolvable. In that fallback case, keep the placeholder box; only render the QR when `eventId !== '—'`.
- `EditItemDrawer`: `loteId` and `lotItemId` are required (non-optional) props, so no fallback branch is needed there — the QR always has valid data once the drawer is open.
- `QuotationCertificate`: the new local helper mirrors `getQrCodeUrl()`'s fallback (no/empty `selectedProducts` → `https://${PRODUCTION_URL}/tesoro`), so a certificate with no selected products still renders a valid QR rather than a broken link.

## Testing

No new automated tests planned — this is a rendering swap (decorative box → `<QRCodeSVG>`) with no new logic beyond URL string construction and one prop-based conditional per site. Verify manually per site:

1. Open a lote's Kardex preview → QR scans to the correct `/admin/fotosintesis/lots/:loteId` page.
2. Open a movimiento Kardex preview → QR scans to `/admin/fotosintesis/movimientos?kardexEventId=...` and correctly opens that event's preview on load.
3. Open `EditItemDrawer` for an insumo item → QR scans to that item's edit route.
4. Generate a quotation certificate → QR scans to the correct product/collection/quotation link (same as the existing cotización PDF QR).
5. Confirm each PDF export (via `captureNodeToPdf.ts`) still rasterizes the QR crisply (no blur/cutoff) at the export resolution already used for the existing cotización PDF QR.
