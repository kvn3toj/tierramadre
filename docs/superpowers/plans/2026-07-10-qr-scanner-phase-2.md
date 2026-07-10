# QR Scanner Phase 2 — Wire Compra/Kardex/Venta Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the three currently-`disabled` action buttons (Compra / Kardex / Venta) in `EscanearPage.tsx` (branch `feat/qr-scanner`, Phase 1 already built) to their real destinations, so scanning an item's QR lets the operator jump straight into editing its purchase record, registering an entrega/devolución, or starting a sale — each pre-seeded with the scanned item.

**Architecture:** Three of the four tasks are pure navigation wiring (`navigate()` calls using routes that already exist); the fourth adds one small Convex query (`lotItems.getByItemId`) so the "Compra" button can resolve the `lotItemId` the edit route requires. A fifth task adds `?itemId=` prefill support to `MovimientosKardexPage.tsx` (the "Kardex" destination), mirroring the deep-link enrichment pattern `VentaPage.tsx` already uses for the same param.

**Tech Stack:** React 18.3 + TypeScript 5.6, React Router 7.9, Convex (queries), MUI v6.

## Global Constraints

- No new routes — reuse `/admin/fotosintesis/lots/:loteId/items/:lotItemId/edit`, `/admin/fotosintesis/movimientos`, `/admin/fotosintesis/sales/new` (all already registered in `src/App.tsx`).
- "Venta" needs zero changes to `VentaPage.tsx` — it already reads `?itemId=` (line 154) and enriches a deep-linked stub once its product query resolves (lines 231-245). Confirmed by direct reading of the file.
- The new Convex query must follow the existing `lotItems.ts` style: a `query` handler using the `by_itemId` index already defined on the `lotItems` table (`convex/schema.ts:467-468`).
- Confirmed with the user: "Compra" → open the item's edit view in its lote; "Kardex" → start a new entrega/devolución pre-seeded with this item; "Venta" → open `VentaPage` pre-seeded via `?itemId=`.

---

### Task 1: Add `lotItems.getByItemId` Convex query

**Files:**

- Modify: `convex/lotItems.ts` (add new export near the top, after imports and before `listByLote`)

**Interfaces:**

- Produces: `getByItemId` query, args `{ itemId: string }`, returns the matching `lotItems` document (`{ _id: Id<'lotItems'>, loteId: string, itemId: string, preponderancia: number, costoBaseCOP: number, ordenEnLote: number } | null`) — consumed by Task 3.

- [ ] **Step 1: Add the query**

In `convex/lotItems.ts`, insert this immediately after the `tipoItemValidator` block (after line 16, before `export const listByLote`):

```ts
/** Resolve a lotItems join row by its productInventory itemId — used by the
 *  QR scanner to jump straight to an item's edit view without the operator
 *  needing to know which lote it lives in. */
export const getByItemId = query({
  args: { itemId: v.string() },
  handler: async (ctx, { itemId }) => {
    const row = await ctx.db
      .query('lotItems')
      .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
      .first();
    return row ?? null;
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p . 2>&1 | grep lotItems`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add convex/lotItems.ts
git commit -m "feat(fotosintesis): add lotItems.getByItemId query for QR scanner"
```

---

### Task 2: Wire "Venta" button — navigate to `VentaPage` pre-seeded

**Files:**

- Modify: `src/pages/admin/Fotosintesis/EscanearPage.tsx`

**Interfaces:**

- Consumes: `navigate` (already imported, line 2/46), `scannedItemId` (already in scope, line 48).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Give `ActionButton` an optional `onClick` and drop the hardcoded `disabled`**

Replace the `ActionButton` function (lines 412-439) with:

```tsx
function ActionButton({
  icon,
  label,
  foto,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  foto: ReturnType<typeof getFoto>;
  onClick?: () => void;
}) {
  return (
    <Button
      disabled={!onClick}
      onClick={onClick}
      variant="outlined"
      sx={{
        flexDirection: 'column',
        gap: 0.5,
        py: 1.25,
        color: foto.ink.secondary,
        borderColor: foto.surfaces.rule,
        textTransform: 'none',
        fontSize: '12.5px',
      }}
    >
      {icon}
      {label}
    </Button>
  );
}
```

- [ ] **Step 2: Wire the Venta button**

Replace the `<ActionButton icon={<Tag size={18} />} label="Venta" foto={foto} />` line (line 358) with:

```tsx
<ActionButton
  icon={<Tag size={18} />}
  label="Venta"
  foto={foto}
  onClick={() =>
    navigate(`/admin/fotosintesis/sales/new?itemId=${scannedItemId}`)
  }
/>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p . 2>&1 | grep EscanearPage`
Expected: no output (the other two buttons in this file still lack `onClick` at this point in the plan — that's expected and fine, they render `disabled`).

- [ ] **Step 4: Manual verification**

Run: `npm run dev`
Scan (or manually enter) a registered item at `/admin/fotosintesis/escanear`, tap "Venta". Confirm it navigates to `/admin/fotosintesis/sales/new?itemId=<id>` and the sale form shows that item pre-selected (per `VentaPage.tsx`'s existing `?itemId=` handling).

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/Fotosintesis/EscanearPage.tsx
git commit -m "feat(fotosintesis): wire Venta action from QR scanner"
```

---

### Task 3: Wire "Compra" button — navigate to the item's edit view

**Files:**

- Modify: `src/pages/admin/Fotosintesis/EscanearPage.tsx`

**Interfaces:**

- Consumes: `lotItems.getByItemId` query from Task 1 (`convexApi.lotItems.getByItemId`, args `{ itemId: string }`, returns `{ _id: Id<'lotItems'>, loteId: string, ... } | null`).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Fetch the lotItems row for the scanned item**

In `EscanearPage.tsx`, immediately after the existing `item` query (after line 80, `const item = useConvexQuery(...)`), add:

```tsx
const lotItem = useConvexQuery(
  convexApi.lotItems.getByItemId,
  scannedItemId ? { itemId: scannedItemId } : 'skip',
);
```

- [ ] **Step 2: Wire the Compra button**

Replace the `<ActionButton icon={<PackagePlus size={18} />} label="Compra" foto={foto} />` line (line 356) with:

```tsx
<ActionButton
  icon={<PackagePlus size={18} />}
  label="Compra"
  foto={foto}
  onClick={
    lotItem
      ? () =>
          navigate(
            `/admin/fotosintesis/lots/${lotItem.loteId}/items/${lotItem._id}/edit`,
          )
      : undefined
  }
/>
```

This keeps the button disabled (via `ActionButton`'s `disabled={!onClick}` from Task 2) until `lotItem` resolves, rather than navigating to a broken URL.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p . 2>&1 | grep EscanearPage`
Expected: no output.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`
Scan an item, tap "Compra". Confirm it navigates to `/admin/fotosintesis/lots/<loteId>/items/<lotItemId>/edit` and opens that exact item's edit view (`EditItemPage`/`EditItemDrawer`).

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/Fotosintesis/EscanearPage.tsx
git commit -m "feat(fotosintesis): wire Compra action from QR scanner"
```

---

### Task 4: Add `?itemId=` prefill to `MovimientosKardexPage.tsx`

**Files:**

- Modify: `src/pages/admin/Fotosintesis/MovimientosKardexPage.tsx`

**Interfaces:**

- Consumes: existing `candidatePool: CandidateItem[]` (line 248-265, `{itemId, nombre, precioSugerido?}`), existing `rows`/`setRows` state (line 148), existing `mode` (defaults to `'entrega'`, line 136).
- Produces: nothing consumed elsewhere — this is the last task, and Task 5 (below) wires the caller.

- [ ] **Step 1: Read the `?itemId=` param**

In `MovimientosKardexPage.tsx`, immediately after the existing `lookupKardexEventId` line (line 134), add:

```tsx
// Deep-link seed from the QR scanner: /admin/fotosintesis/movimientos?itemId=B-001-G1
// pre-fills row 1 with this item once its candidate data resolves — same
// "enrich a deep-linked stub" pattern VentaPage.tsx uses for the same param.
const seedItemId = searchParams.get('itemId')?.trim() || null;
```

- [ ] **Step 2: Seed the first row once the candidate pool resolves**

Add this `useEffect` after the `candidatePool` `useMemo` (after line 265, before the `outcome`/`activeKardexEventId` block at line ~267). It needs `useEffect` imported — check the existing React import at the top of the file and add `useEffect` to it if missing.

```tsx
const seededRef = useRef(false);
useEffect(() => {
  if (!seedItemId || seededRef.current || mode !== 'entrega') return;
  const match = candidatePool.find((c) => c.itemId === seedItemId);
  if (!match) return;
  seededRef.current = true;
  setRows([
    {
      key: newRowKey(),
      itemId: match.itemId,
      nombre: match.nombre,
      cantidad: '',
      precio: match.precioSugerido ? String(match.precioSugerido) : '',
      notas: '',
    },
  ]);
}, [seedItemId, mode, candidatePool]);
```

`useRef` is already imported (line 28: `import { useMemo, useRef, useState } from 'react';`) but `useEffect` is not — change that line to:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p . 2>&1 | grep MovimientosKardexPage`
Expected: no output.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`
Navigate directly to `/admin/fotosintesis/movimientos?itemId=<a DISPONIBLE item's id>`. Confirm mode stays "entrega" and row 1 auto-fills with that item's nombre/precio once the `disponibles` query resolves — no manual Autocomplete pick needed.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/Fotosintesis/MovimientosKardexPage.tsx
git commit -m "feat(fotosintesis): prefill movimiento row from ?itemId= deep link"
```

---

### Task 5: Wire "Kardex" button in `EscanearPage.tsx`

**Files:**

- Modify: `src/pages/admin/Fotosintesis/EscanearPage.tsx`

**Interfaces:**

- Consumes: Task 4's `?itemId=` support on `MovimientosKardexPage`.
- Produces: nothing consumed elsewhere — final task.

- [ ] **Step 1: Wire the Kardex button**

Replace the `<ActionButton icon={<Receipt size={18} />} label="Kardex" foto={foto} />` line (line 357) with:

```tsx
<ActionButton
  icon={<Receipt size={18} />}
  label="Kardex"
  foto={foto}
  onClick={() =>
    navigate(`/admin/fotosintesis/movimientos?itemId=${scannedItemId}`)
  }
/>
```

- [ ] **Step 2: Remove the now-stale "Fase 2" notice**

The line `Los movimientos se activan en la Fase 2.` (around line 361, inside the `REGISTRAR MOVIMIENTO` block) is no longer accurate once all three buttons are wired. Delete that `<Typography>` block:

```tsx
<Typography
  sx={{
    fontSize: '11px',
    color: foto.ink.tertiary,
    mt: 1,
    textAlign: 'center',
  }}
>
  Los movimientos se activan en la Fase 2.
</Typography>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p . 2>&1 | grep EscanearPage`
Expected: no output.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`
Scan an item, tap "Kardex". Confirm it navigates to `/admin/fotosintesis/movimientos?itemId=<id>` and (per Task 4) the row pre-fills. Re-check "Compra" and "Venta" still work (Tasks 2-3) — all three buttons should now be enabled and functional with no residual "Fase 2" copy on screen.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/Fotosintesis/EscanearPage.tsx
git commit -m "feat(fotosintesis): wire Kardex action from QR scanner, drop Fase 2 notice"
```

## Self-Review Notes

- **Spec coverage:** all three buttons (Compra/Kardex/Venta) are wired (Tasks 2, 3, 5); the one piece of new backend logic they need (`lotItems.getByItemId` for Compra, `?itemId=` prefill for Kardex) are their own tasks (1, 4) so each has an independent test/commit cycle. Venta needed no supporting change — confirmed by reading `VentaPage.tsx` directly rather than assuming.
- **Type consistency:** `ActionButton`'s `onClick?: () => void` (Task 2) is consumed identically by Tasks 3 and 5 — same prop name, same optional-disables-button behavior. `lotItem` (Task 3) and `getByItemId`'s return shape (Task 1) match exactly (`{_id, loteId, itemId, preponderancia, costoBaseCOP, ordenEnLote} | null`).
- **Known gap, out of scope:** the `notFound` branch in `EscanearPage.tsx` (item not yet registered) still has no action — per the existing code comment, that's explicitly Phase 3 (NIIMBOT label printing / new-item registration), not this phase.
