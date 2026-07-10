# Real QR Codes for Lotes, Items/Insumos, and Kardex/Certificate Previews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three decorative QR placeholders (`KardexPreview.tsx`, `MovimientoKardexPreview.tsx`, `QuotationCertificate.tsx`) with real, scannable `<QRCodeSVG>` codes, and add a new real QR to `EditItemDrawer.tsx` for lote items (including insumos) — using only routes/props that already exist in the codebase.

**Architecture:** Each of the 4 tasks below is an isolated, single-file change: swap a `<Box>` placeholder (or add a new `<Box>`) for a `<QRCodeSVG>` whose `value` is a URL string built from a prop the component already receives. No new routes, no schema changes, no shared new module — each site defines its own local `STUDIO_BASE_URL`/URL-builder, matching the existing convention (`AdditionalInfo.tsx`, `useShare.ts`, `VitrinaShareDialog.tsx` each already do this independently rather than sharing one constant).

**Tech Stack:** React 18.3 + TypeScript 5.6, MUI v6, `qrcode.react` v4 (`QRCodeSVG`), `html2canvas` (via `captureNodeToPdf.ts`) for PDF rasterization of the Kardex/certificate previews.

## Global Constraints

- No new routes, no Convex schema changes.
- Reuse only routes/params that already exist: `/admin/fotosintesis/lots/:loteId`, `/admin/fotosintesis/lots/:loteId/items/:lotItemId/edit`, `/admin/fotosintesis/movimientos?kardexEventId=...`.
- Use `<QRCodeSVG>` from `qrcode.react` (never `QRCodeCanvas`) — the only QR component already used in this codebase, and `html2canvas` rasterizes inline `<svg>` correctly (proven by the existing cotización PDF flow).
- Each QR must fall back to the existing placeholder box (not render a QR to a broken/undefined URL) whenever its source data is missing — see per-task edge cases below.
- Match each surface's existing color palette for `fgColor`/`bgColor` (Kardex/Movimiento previews use `PAPER_INK`/`PAPER_BG`, not emerald brand colors).

---

### Task 1: Real QR on `KardexPreview.tsx` (lote)

**Files:**

- Modify: `src/pages/admin/Fotosintesis/components/KardexPreview.tsx:1-6` (imports), `:734-748` (placeholder block)

**Interfaces:**

- Consumes: existing prop `lot: KardexLot | null | undefined` (already defined at line 66, field `loteId?: string` at line 36), already read at line 673 as `lot?.loteId ?? "—"`.
- Produces: nothing consumed by other tasks — this task is self-contained.

- [ ] **Step 1: Add the `QRCodeSVG` import and base URL constant**

In `src/pages/admin/Fotosintesis/components/KardexPreview.tsx`, change the import block at the top of the file:

```tsx
import { Box } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import {
  fontFamilies,
  emeraldCore,
  goldAccent,
} from '../../../../design-system';

// Base URL for the Tierra Madre Studio admin app.
const STUDIO_BASE_URL = 'https://tierramadre.app';
```

- [ ] **Step 2: Replace the placeholder `Box` with a real QR (with fallback)**

Replace lines 734-748 (the `{/* QR placeholder (grid pattern, not a real QR — Slice 3) */}` block and its `<Box aria-hidden .../>`) with:

```tsx
{
  /* Real QR: scans to the lote's admin detail page (/admin/fotosintesis/lots/:loteId). */
}
{
  lot?.loteId ? (
    <Box
      sx={{
        width: 58,
        height: 58,
        borderRadius: '4px',
        border: `1px solid ${PAPER_RULE}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: PAPER_BG,
      }}
    >
      <QRCodeSVG
        value={`${STUDIO_BASE_URL}/admin/fotosintesis/lots/${lot.loteId}`}
        size={50}
        level="M"
        fgColor={PAPER_INK}
        bgColor={PAPER_BG}
        style={{ display: 'block' }}
      />
    </Box>
  ) : (
    <Box
      aria-hidden
      sx={{
        width: 58,
        height: 58,
        borderRadius: '4px',
        background: `
                repeating-linear-gradient(0deg, ${PAPER_INK} 0 2px, transparent 2px 6px),
                repeating-linear-gradient(90deg, ${PAPER_INK} 0 2px, transparent 2px 6px)
              `,
        opacity: 0.18,
        border: `1px solid ${PAPER_RULE}`,
      }}
    />
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p . 2>&1 | grep KardexPreview`
Expected: no output (no errors referencing `KardexPreview.tsx`).

- [ ] **Step 4: Manual verification**

Run: `npm run dev`
Navigate to a Kardex preview for a sale linked to a lote (Fotosíntesis → a lote → "Kardex"/venta flow that renders `KardexPreview`). Confirm the QR renders (not the grid placeholder) and scanning it (or copying `value` into a browser) opens `/admin/fotosintesis/lots/<that loteId>`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/Fotosintesis/components/KardexPreview.tsx
git commit -m "feat(fotosintesis): real QR on Kardex preview linking to lote admin page"
```

---

### Task 2: Real QR on `MovimientoKardexPreview.tsx` (movimiento)

**Files:**

- Modify: `src/pages/admin/Fotosintesis/components/MovimientoKardexPreview.tsx:1-6` (imports), `:501-515` (placeholder block)

**Interfaces:**

- Consumes: existing local variable `eventId` (line 95: `const eventId = kardexEventId ?? first?.kardexEventId ?? '—';`), derived from prop `kardexEventId?: string` (line 46).
- Produces: nothing consumed by other tasks — self-contained.

- [ ] **Step 1: Add the `QRCodeSVG` import and base URL constant**

In `src/pages/admin/Fotosintesis/components/MovimientoKardexPreview.tsx`, change the import block:

```tsx
import { Box } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import {
  fontFamilies,
  emeraldCore,
  goldAccent,
} from '../../../../design-system';

// Base URL for the Tierra Madre Studio admin app.
const STUDIO_BASE_URL = 'https://tierramadre.app';
```

- [ ] **Step 2: Replace the placeholder `Box` with a real QR (with fallback)**

Replace lines 501-515 (the `{/* QR placeholder (grid pattern, not a real QR). */}` block and its `<Box aria-hidden .../>`) with:

```tsx
{
  /* Real QR: scans to this movement event's admin deep link
            (/admin/fotosintesis/movimientos?kardexEventId=...), matching the
            deep-link convention MovimientosKardexPage already reads on mount. */
}
{
  eventId !== '—' ? (
    <Box
      sx={{
        width: 58,
        height: 58,
        borderRadius: '4px',
        border: `1px solid ${PAPER_RULE}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: PAPER_BG,
      }}
    >
      <QRCodeSVG
        value={`${STUDIO_BASE_URL}/admin/fotosintesis/movimientos?kardexEventId=${eventId}`}
        size={50}
        level="M"
        fgColor={PAPER_INK}
        bgColor={PAPER_BG}
        style={{ display: 'block' }}
      />
    </Box>
  ) : (
    <Box
      aria-hidden
      sx={{
        width: 58,
        height: 58,
        borderRadius: '4px',
        background: `
                repeating-linear-gradient(0deg, ${PAPER_INK} 0 2px, transparent 2px 6px),
                repeating-linear-gradient(90deg, ${PAPER_INK} 0 2px, transparent 2px 6px)
              `,
        opacity: 0.18,
        border: `1px solid ${PAPER_RULE}`,
      }}
    />
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p . 2>&1 | grep MovimientoKardexPreview`
Expected: no output.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`
Navigate to Fotosíntesis → Movimientos Kardex, open a movement's preview (or via `?kardexEventId=...`). Confirm the QR renders and its `value` opens the same preview via `/admin/fotosintesis/movimientos?kardexEventId=...`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/Fotosintesis/components/MovimientoKardexPreview.tsx
git commit -m "feat(fotosintesis): real QR on movimiento Kardex preview"
```

---

### Task 3: Real QR on `EditItemDrawer.tsx` (item / insumo)

**Files:**

- Modify: `src/pages/admin/Fotosintesis/components/EditItemDrawer.tsx` (imports near top; header block at lines 647-730)

**Interfaces:**

- Consumes: existing required props `loteId: string` (line 110) and `lotItemId: Id<'lotItems'>` (line 112) on `EditItemDrawerProps`.
- Produces: nothing consumed by other tasks — self-contained. Covers insumos automatically since insumo is just one `tipo` value on the same `productInventory`/`lotItems` row this drawer already edits — no insumo-specific branching needed.

- [ ] **Step 1: Add the `QRCodeSVG` import and base URL constant**

In `src/pages/admin/Fotosintesis/components/EditItemDrawer.tsx`, add to the top import block (after the existing `import { Box, Dialog, Switch } from '@mui/material';` on line 2):

```tsx
import { QRCodeSVG } from 'qrcode.react';
```

Then, near the top of the file (after the last top-level import, before the component definition), add:

```tsx
// Base URL for the Tierra Madre Studio admin app.
const STUDIO_BASE_URL = 'https://tierramadre.app';
```

- [ ] **Step 2: Render the QR in the drawer header**

In the `HEADER` block (lines 647-730), the header is a flex row: a left `Box` (ticket label + title + subtitle, lines 658-697) and a right-side close button (lines 700-729, only rendered `isPage ? null : ...`). Add a QR `Box` between them, rendered in both drawer and page mode (unlike the close button), by inserting this immediately after the closing `</Box>` of the left content block (after line 697, before the `{isPage ? null : (...)}` close-button block):

```tsx
<Box
  sx={{
    flexShrink: 0,
    width: 44,
    height: 44,
    borderRadius: '8px',
    border: `1px solid ${foto.surfaces.edge}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: foto.surfaces.canvas,
  }}
  title={`Ítem #${itemId} · lote ${loteId}`}
>
  <QRCodeSVG
    value={`${STUDIO_BASE_URL}/admin/fotosintesis/lots/${loteId}/items/${lotItemId}/edit`}
    size={36}
    level="M"
    fgColor={foto.ink.primary}
    bgColor="#FFFFFF"
    style={{ display: 'block' }}
  />
</Box>
```

`itemId`, `loteId`, and `lotItemId` are all already in scope as component props/destructured values (lines 159-161) — no fallback branch is needed since `loteId`/`lotItemId` are required (non-optional) props.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p . 2>&1 | grep EditItemDrawer`
Expected: no output.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`
Open Fotosíntesis → a lote → click an item row (including an insumo-tagged item) to open `EditItemDrawer`. Confirm the QR renders in the header and its `value` opens `/admin/fotosintesis/lots/<loteId>/items/<lotItemId>/edit` for that exact item. Repeat via the routed page variant (`EditItemPage`, `/admin/fotosintesis/lots/:loteId/items/:lotItemId/edit`) to confirm it also renders there (`isPage` mode).

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/Fotosintesis/components/EditItemDrawer.tsx
git commit -m "feat(fotosintesis): real QR on item edit drawer, covers insumos"
```

---

### Task 4: Real QR on `QuotationCertificate.tsx` (client certificate)

**Files:**

- Modify: `src/pages/cuentas/cotizaciones/components/QuotationCertificate.tsx:1-30` (imports/types area), `:559-581` (placeholder block)

**Interfaces:**

- Consumes: existing field `quotationData.selectedProducts?: SelectedProduct[]` (line 51), where `SelectedProduct` is `{id: string; name: string; price: number; source: 'gallery' | 'inventory'}` (lines 37-42). Existing import `PRODUCTION_URL` from `'../../../../components/cotizacion/constants'` (line 25, value `'tierramadre.app'`).
- Produces: a new local helper `getCertificateQrUrl(products: SelectedProduct[] | undefined): string`, used only within this file.

- [ ] **Step 1: Add the `QRCodeSVG` import**

In `src/pages/cuentas/cotizaciones/components/QuotationCertificate.tsx`, add near the top imports (alongside the existing `brandColors, PRODUCTION_URL` import on line 25):

```tsx
import { QRCodeSVG } from 'qrcode.react';
```

- [ ] **Step 2: Add the local URL-builder helper**

Immediately after the `SelectedProduct` interface (after line 42), add:

```tsx
/**
 * Builds the certificate's QR target URL from the selected products.
 * Mirrors `getQrCodeUrl()` in `src/components/cotizacion/utils.ts` (same
 * PRODUCTION_URL, same /product/:id and /tesoro?items=...&status=all shapes),
 * adapted for `SelectedProduct`'s leaner shape (no `itemNumber`/`isManual`
 * fields — `id` stands in for the item number, `source === 'inventory'`
 * stands in for `!isManual`).
 */
function getCertificateQrUrl(products: SelectedProduct[] | undefined): string {
  const inventoryProducts = (products ?? []).filter(
    (p) => p.source === 'inventory',
  );

  if (inventoryProducts.length === 1) {
    return `https://${PRODUCTION_URL}/product/${inventoryProducts[0].id}`;
  }

  if (inventoryProducts.length > 1) {
    const itemNumbers = inventoryProducts.map((p) => p.id).join(',');
    return `https://${PRODUCTION_URL}/tesoro?items=${itemNumbers}&status=all`;
  }

  return `https://${PRODUCTION_URL}/tesoro`;
}
```

- [ ] **Step 3: Replace the placeholder `Box` with a real QR**

Replace lines 559-581 (the `{/* QR Placeholder */}` comment and its `<Box>` grid of 25 cells) with:

```tsx
{
  /* Real QR: scans to the quotation's product/collection page. */
}
<Box
  sx={{
    width: 40,
    height: 40,
    border: `1px solid ${brandColors.lightGray}`,
    borderRadius: 0.5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    p: 0.5,
  }}
>
  <QRCodeSVG
    value={getCertificateQrUrl(quotationData.selectedProducts)}
    size={32}
    level="M"
    fgColor={brandColors.textPrimary}
    bgColor="#FFFFFF"
    style={{ display: 'block' }}
  />
</Box>;
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p . 2>&1 | grep QuotationCertificate`
Expected: no output.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`
Generate a quotation certificate (Cuentas → Cotizaciones → a quotation with at least one inventory product selected → certificate view/export). Confirm the QR renders and its `value` opens the correct `/product/:id` (single product) or `/tesoro?items=...` (multiple) link. Also generate a certificate with zero selected products and confirm it falls back to `/tesoro` rather than crashing.

- [ ] **Step 6: Commit**

```bash
git add src/pages/cuentas/cotizaciones/components/QuotationCertificate.tsx
git commit -m "feat(cotizaciones): real QR on quotation certificate"
```

---

## Self-Review Notes

- **Spec coverage:** Problem statement's 3 gaps (lotes, insumos, 3 placeholders) map to Tasks 1-4 — lote → Task 1, insumo → Task 3 (via generic item edit, no insumo-specific code needed per spec's non-goal), 3 placeholders → Tasks 1, 2, 4. Non-goals (no new routes, no schema changes, no insumo data model, no change to the 3 working QR sites) are respected — no task touches `AdditionalInfo.tsx`, `TotalsSection.tsx`, `InvitationGenerator.tsx`, `src/App.tsx`, or `convex/schema.ts`.
- **Type consistency:** `STUDIO_BASE_URL` is defined locally per file (Tasks 1-3), matching the existing convention (`AdditionalInfo.tsx`, `useShare.ts`, `VitrinaShareDialog.tsx` each do the same — no shared constant exists today, so introducing one would be an unrelated refactor). Task 4 correctly uses the _existing_ `PRODUCTION_URL` import instead, since `QuotationCertificate.tsx` already imports it and it's a bare domain (`tierramadre.app`), not a full `https://` URL — the helper's template strings account for this (`https://${PRODUCTION_URL}/...`), matching `getQrCodeUrl()`'s exact pattern.
- **Fallback behavior:** Tasks 1-2 keep the original grid-placeholder `<Box>` for the missing-data case (no lote / no eventId); Task 3 needs no fallback (props required); Task 4's helper has a built-in fallback (`/tesoro`) rather than a conditional render, matching `getQrCodeUrl()`'s own fallback-return style.
