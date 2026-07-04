# Estrenos ↔ Fotosíntesis Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the home page "Estrenos" carousel include Fotosíntesis-captured products (not just Google-Drive-scanned legacy items), so it stops looking frozen now that all new inventory goes through Fotosíntesis.

**Architecture:** Add a `publishedAt` timestamp to `productInventory`, stamped once (idempotently) the first time an item's `mostrarEnCatalogo` flips to `true`, across all four places that flip it. Surface that timestamp through the existing `publishedCatalog` → `useFotosintesisCatalog` → `useTreasure` pipeline (already wired, no new query/endpoint). Extract the "pick the newest N across two dated sources" logic into a pure, unit-tested function and use it from `useNewestProducts`.

**Tech Stack:** Convex (schema/mutations/queries), React + TypeScript hooks, Vitest for unit tests.

## Global Constraints

- No new Convex query, no new API endpoint, no new caching layer (spec decision #4).
- Lote/sublote bundle cards (`isLote: true`) never appear in Estrenos (spec decision #3).
- `publishedAt` is stamped once and never reset by a later unpublish/republish cycle (spec §2, "first publish wins").
- Full spec: `docs/superpowers/specs/2026-07-04-estrenos-fotosintesis-integration-design.md`.
- This plan file is auto-reformatted on save (quote style/indentation inside fenced code blocks may not byte-match the real source for deeply-nested "Find" snippets). Always `Read` the target file before editing it — match by content and line anchors given in each step, not by literal whitespace/quote diffing against this plan.

---

### Task 1: `publishedAt` schema field + shared idempotent stamping helper

**Files:**

- Modify: `convex/schema.ts:163` (add field next to `mostrarEnCatalogo`)
- Create: `convex/_lib/publishState.ts`
- Test: `tests/publishState.test.ts`

**Interfaces:**

- Produces: `withPublishStamp(current: { mostrarEnCatalogo?: boolean; publishedAt?: number } | null | undefined, next: boolean): { mostrarEnCatalogo: boolean; publishedAt?: number }` — used by Tasks 2, 3, 4. The returned object omits `publishedAt` entirely when no new stamp should be written (caller must spread it into their patch object so an absent key never clobbers an existing value).

- [ ] **Step 1: Write the failing test**

Create `tests/publishState.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { withPublishStamp } from '../convex/_lib/publishState';

describe('withPublishStamp', () => {
  it('stamps publishedAt the first time an item is published', () => {
    const patch = withPublishStamp(undefined, true);
    expect(patch.mostrarEnCatalogo).toBe(true);
    expect(typeof patch.publishedAt).toBe('number');
  });

  it('does not restamp an already-published item', () => {
    const current = { mostrarEnCatalogo: true, publishedAt: 12345 };
    const patch = withPublishStamp(current, true);
    expect(patch.mostrarEnCatalogo).toBe(true);
    expect(patch.publishedAt).toBeUndefined();
  });

  it('unpublishing never sets publishedAt', () => {
    const patch = withPublishStamp(
      { mostrarEnCatalogo: true, publishedAt: 12345 },
      false,
    );
    expect(patch.mostrarEnCatalogo).toBe(false);
    expect(patch.publishedAt).toBeUndefined();
  });

  it('re-publishing after an unpublish omits publishedAt so the original timestamp survives', () => {
    // reopen() sets mostrarEnCatalogo:false but never clears publishedAt, so
    // `current.publishedAt` is still the original stamp here.
    const current = { mostrarEnCatalogo: false, publishedAt: 12345 };
    const patch = withPublishStamp(current, true);
    expect(patch.publishedAt).toBeUndefined();
  });

  it('handles a brand-new document with no prior state', () => {
    const patch = withPublishStamp(null, false);
    expect(patch).toEqual({ mostrarEnCatalogo: false });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/publishState.test.ts`
Expected: FAIL with a module-not-found error for `../convex/_lib/publishState`.

- [ ] **Step 3: Write minimal implementation**

Create `convex/_lib/publishState.ts`:

```ts
/**
 * Shared write path for the `mostrarEnCatalogo` publish flag. Every call
 * site that can flip this flag (lotItems.create, lotItems.updateGemaFields,
 * lots.publish, and the Sheet→Convex delta sync in fotoSync.ts) must route
 * through this helper instead of setting the field directly, so `publishedAt`
 * is stamped exactly once, the first time an item is published.
 *
 * "First publish wins": lots.reopen() demotes a published lot back to
 * mostrarEnCatalogo:false so it can be edited, then lots.publish() flips it
 * back to true. Without this guard, that ordinary edit-and-republish cycle
 * would push already-published items back to the top of the Estrenos
 * carousel every time. The returned patch omits `publishedAt` whenever no
 * new stamp is needed, so a caller spreading it into a db.patch() call never
 * overwrites an existing timestamp with undefined.
 */
export function withPublishStamp(
  current:
    | { mostrarEnCatalogo?: boolean; publishedAt?: number }
    | null
    | undefined,
  next: boolean,
): { mostrarEnCatalogo: boolean; publishedAt?: number } {
  const patch: { mostrarEnCatalogo: boolean; publishedAt?: number } = {
    mostrarEnCatalogo: next,
  };
  if (next && !current?.publishedAt) {
    patch.publishedAt = Date.now();
  }
  return patch;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/publishState.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Add the schema field**

In `convex/schema.ts`, find line 163:

```ts
    mostrarEnCatalogo: v.optional(v.boolean()),
```

Replace with:

```ts
    mostrarEnCatalogo: v.optional(v.boolean()),
    // ms epoch, stamped once by withPublishStamp() the first time
    // mostrarEnCatalogo flips true. Powers the Estrenos "newest" sort for
    // Fotosíntesis items — never cleared or reset by a later unpublish.
    publishedAt: v.optional(v.number()),
```

- [ ] **Step 6: Typecheck the schema change**

Run: `npx tsc --noEmit -p convex/tsconfig.json`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add convex/schema.ts convex/_lib/publishState.ts tests/publishState.test.ts
git commit -m "feat(fotosintesis): add publishedAt field + idempotent publish-stamp helper"
```

---

### Task 2: Wire the stamp helper into `lotItems.ts` (create + updateGemaFields)

**Files:**

- Modify: `convex/lotItems.ts:226` (inside `create`)
- Modify: `convex/lotItems.ts:626-635` (inside `updateGemaFields`)

**Interfaces:**

- Consumes: `withPublishStamp` from `convex/_lib/publishState.ts` (Task 1)

- [ ] **Step 1: Update `create` (around line 207-239)**

Find this block in `convex/lotItems.ts`:

```ts
    const productId = await ctx.db.insert("productInventory", {
      itemId,
      rowIndex: maxRow + 1,
      nombre: args.nombre,
      peso: args.peso,
      color: args.color,
      calidad: args.calidad,
      cantidad: args.cantidad,
      talla: args.talla,
      medidas: args.medidas,
      categoria: args.categoria,
      ubicacion: args.ubicacion,
      coleccion: args.coleccion,
      caja: args.caja,
      precioCOP: args.precioPublicoCOP,
      estado: "DISPONIBLE" as const,
      loteId: args.loteId,
      preponderancia: args.preponderancia,
      costoBaseCOP,
      mostrarEnCatalogo: args.mostrarEnCatalogo ?? false,
      tipo: args.tipo,
```

Replace the `mostrarEnCatalogo` line with a spread of the stamp helper's result (it returns both `mostrarEnCatalogo` and, when applicable, `publishedAt`):

```ts
    const productId = await ctx.db.insert("productInventory", {
      itemId,
      rowIndex: maxRow + 1,
      nombre: args.nombre,
      peso: args.peso,
      color: args.color,
      calidad: args.calidad,
      cantidad: args.cantidad,
      talla: args.talla,
      medidas: args.medidas,
      categoria: args.categoria,
      ubicacion: args.ubicacion,
      coleccion: args.coleccion,
      caja: args.caja,
      precioCOP: args.precioPublicoCOP,
      estado: "DISPONIBLE" as const,
      loteId: args.loteId,
      preponderancia: args.preponderancia,
      costoBaseCOP,
      ...withPublishStamp(null, args.mostrarEnCatalogo ?? false),
      tipo: args.tipo,
```

Add the import at the top of `convex/lotItems.ts` (alongside the existing imports):

```ts
import { withPublishStamp } from './_lib/publishState';
```

- [ ] **Step 2: Update `updateGemaFields` (lines 626-635)**

Find:

```ts
if (patch.mostrarEnCatalogo !== undefined) {
  if (patch.mostrarEnCatalogo !== (product.mostrarEnCatalogo ?? false)) {
    productPatch.mostrarEnCatalogo = patch.mostrarEnCatalogo;
    changes.push({
      field: 'mostrarEnCatalogo',
      before: product.mostrarEnCatalogo ? 1 : 0,
      after: patch.mostrarEnCatalogo ? 1 : 0,
    });
  }
}
```

Replace with:

```ts
if (patch.mostrarEnCatalogo !== undefined) {
  if (patch.mostrarEnCatalogo !== (product.mostrarEnCatalogo ?? false)) {
    Object.assign(
      productPatch,
      withPublishStamp(product, patch.mostrarEnCatalogo),
    );
    changes.push({
      field: 'mostrarEnCatalogo',
      before: product.mostrarEnCatalogo ? 1 : 0,
      after: patch.mostrarEnCatalogo ? 1 : 0,
    });
  }
}
```

(`product` here is the `productInventory` doc already fetched earlier in the handler at line 452 — it has `mostrarEnCatalogo` and, after Task 1's schema change, `publishedAt`.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p convex/tsconfig.json`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add convex/lotItems.ts
git commit -m "feat(fotosintesis): stamp publishedAt on item create + gema-field publish toggle"
```

---

### Task 3: Wire the stamp helper into `lots.ts` bulk `publish`

**Files:**

- Modify: `convex/lots.ts:481-491`

**Interfaces:**

- Consumes: `withPublishStamp` from `convex/_lib/publishState.ts` (Task 1)

- [ ] **Step 1: Update the bulk-publish loop**

Find in `convex/lots.ts`:

```ts
let flipped = 0;
for (const item of items) {
  const product = await ctx.db
    .query('productInventory')
    .withIndex('by_itemId', (q) => q.eq('itemId', item.itemId))
    .first();
  if (product && product.mostrarEnCatalogo !== true) {
    await ctx.db.patch(product._id, { mostrarEnCatalogo: true });
    flipped++;
  }
}
```

Replace with:

```ts
let flipped = 0;
for (const item of items) {
  const product = await ctx.db
    .query('productInventory')
    .withIndex('by_itemId', (q) => q.eq('itemId', item.itemId))
    .first();
  if (product && product.mostrarEnCatalogo !== true) {
    await ctx.db.patch(product._id, withPublishStamp(product, true));
    flipped++;
  }
}
```

Add the import at the top of `convex/lots.ts`:

```ts
import { withPublishStamp } from './_lib/publishState';
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p convex/tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add convex/lots.ts
git commit -m "feat(fotosintesis): stamp publishedAt on bulk lot publish"
```

---

### Task 4: Wire the stamp helper into the Sheet→Convex sync path

**Files:**

- Modify: `convex/fotoSync.ts:207-241`

**Interfaces:**

- Consumes: `withPublishStamp` from `convex/_lib/publishState.ts` (Task 1)

- [ ] **Step 1: Update the inventory patch branch in `upsertTable`**

Find in `convex/fotoSync.ts` (inside the `for (const row of rows as SyncRow[])` loop, after the `plan.action === "skip"` block):

```ts
await patchDoc(ctx, existing._id as Id<'productInventory'>, {
  ...plan.patch,
  rowIndex: row.rowIndex,
  lastPulledAt: now,
  syncStatus: 'synced',
});
patched++;
```

Replace with:

```ts
const patch: Record<string, unknown> = { ...plan.patch };
if (t === 'inventory' && patch.mostrarEnCatalogo === true) {
  const stamp = withPublishStamp(
    existing as { mostrarEnCatalogo?: boolean; publishedAt?: number },
    true,
  );
  if (stamp.publishedAt !== undefined) patch.publishedAt = stamp.publishedAt;
}
await patchDoc(ctx, existing._id as Id<'productInventory'>, {
  ...patch,
  rowIndex: row.rowIndex,
  lastPulledAt: now,
  syncStatus: 'synced',
});
patched++;
```

Add the import at the top of `convex/fotoSync.ts`:

```ts
import { withPublishStamp } from './_lib/publishState';
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p convex/tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add convex/fotoSync.ts
git commit -m "feat(fotosintesis): stamp publishedAt when the SOT sheet publishes an item directly"
```

---

### Task 5: Surface `publishedAt` through `publishedCatalog` → `TreasureItem` → `useFotosintesisCatalog`

**Files:**

- Modify: `convex/products.ts:273-311` (the `publishedCatalog` row projection)
- Modify: `src/types/index.ts:341` (add field to `TreasureItem`)
- Modify: `src/hooks/useFotosintesisCatalog.ts:35-70` (`PublishedRow` interface) and `:113-159` (`mapRowToTreasureItem`)

**Interfaces:**

- Produces: `TreasureItem.publishedAt?: number` — consumed by Task 6/7's merge logic. Present only on Fotosíntesis-sourced items; legacy/Sheets items and `isLote` group cards never set it.

- [ ] **Step 1: Project `publishedAt` in `publishedCatalog`**

In `convex/products.ts`, find (inside the `.map((row) => {...})` in `publishedCatalog`, ~line 273-296):

```ts
      return {
        itemId: row.itemId,
        nombre: row.nombre,
        peso: row.peso,
        color: row.color,
        calidad: row.calidad,
        cantidad: row.cantidad,
        talla: row.talla,
        medidas: row.medidas,
        medidasValores: row.medidasValores,
        categoria: row.categoria,
        precioEmbajadorCOP: row.precioEmbajadorCOP,
        ubicacion: row.ubicacion,
        asesor: row.asesor,
        estado: row.estado,
        qr: row.qr,
        coleccion: row.coleccion,
        caja: row.caja,
        asesorActual: row.asesorActual,
        estadoAsesor: row.estadoAsesor,
        fotoUrl: row.fotoUrl,
        certificadoUrl: row.certificadoUrl,
```

Add `publishedAt: row.publishedAt,` right after `certificadoUrl: row.certificadoUrl,`:

```ts
      return {
        itemId: row.itemId,
        nombre: row.nombre,
        peso: row.peso,
        color: row.color,
        calidad: row.calidad,
        cantidad: row.cantidad,
        talla: row.talla,
        medidas: row.medidas,
        medidasValores: row.medidasValores,
        categoria: row.categoria,
        precioEmbajadorCOP: row.precioEmbajadorCOP,
        ubicacion: row.ubicacion,
        asesor: row.asesor,
        estado: row.estado,
        qr: row.qr,
        coleccion: row.coleccion,
        caja: row.caja,
        asesorActual: row.asesorActual,
        estadoAsesor: row.estadoAsesor,
        fotoUrl: row.fotoUrl,
        certificadoUrl: row.certificadoUrl,
        publishedAt: row.publishedAt,
```

- [ ] **Step 2: Typecheck Convex**

Run: `npx tsc --noEmit -p convex/tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Add `publishedAt` to `TreasureItem`**

In `src/types/index.ts`, find line 341:

```ts
  preponderancia?: number;
```

Replace with:

```ts
  preponderancia?: number;
  // ms epoch, stamped once when a Fotosíntesis item is first published to the
  // catalog (see convex/_lib/publishState.ts). Undefined for legacy/Sheets
  // items and for isLote group cards — both are excluded from "newest" sorts.
  publishedAt?: number;
```

- [ ] **Step 4: Update `PublishedRow` and `mapRowToTreasureItem` in `useFotosintesisCatalog.ts`**

Find the `PublishedRow` interface (~line 35-70):

```ts
interface PublishedRow {
  itemId: string;
  nombre?: string;
  peso?: string;
  color?: string;
  calidad?: string;
  cantidad?: number;
  talla?: string;
  medidas?: string;
  medidasValores?: string;
  categoria?: string;
  precioEmbajadorCOP?: number;
  ubicacion?: string;
  asesor?: string;
  estado?: string;
  qr?: string;
  coleccion?: string;
  caja?: string;
  asesorActual?: string;
  estadoAsesor?: string;
  fotoUrl?: string;
  certificadoUrl?: string;
```

Add `publishedAt?: number;` right after `certificadoUrl?: string;`:

```ts
interface PublishedRow {
  itemId: string;
  nombre?: string;
  peso?: string;
  color?: string;
  calidad?: string;
  cantidad?: number;
  talla?: string;
  medidas?: string;
  medidasValores?: string;
  categoria?: string;
  precioEmbajadorCOP?: number;
  ubicacion?: string;
  asesor?: string;
  estado?: string;
  qr?: string;
  coleccion?: string;
  caja?: string;
  asesorActual?: string;
  estadoAsesor?: string;
  fotoUrl?: string;
  certificadoUrl?: string;
  publishedAt?: number;
```

Then in `mapRowToTreasureItem` (~line 113-159), find:

```ts
    // Drive image captured in the wizard; useTreasure converts it to a proxy URL.
    imagen: row.fotoUrl || undefined,
    certificateUrl: row.certificadoUrl || undefined,
```

Replace with:

```ts
    // Drive image captured in the wizard; useTreasure converts it to a proxy URL.
    imagen: row.fotoUrl || undefined,
    certificateUrl: row.certificadoUrl || undefined,
    publishedAt: row.publishedAt,
```

- [ ] **Step 5: Typecheck frontend**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add convex/products.ts src/types/index.ts src/hooks/useFotosintesisCatalog.ts
git commit -m "feat(fotosintesis): surface publishedAt through publishedCatalog to TreasureItem"
```

---

### Task 6: Pure merge function for Estrenos candidates

**Files:**

- Create: `src/utils/newestProductsMerge.ts`
- Test: `tests/newestProductsMerge.test.ts`

**Interfaces:**

- Consumes: `TreasureItem` from `../src/types` (has `publishedAt?: number` and `isLote?: boolean` as of Task 5)
- Produces:
  - `interface DriveNewestCandidate { itemNumber: number; productName: string; proxyUrl: string; imageCreatedTime: string; }`
  - `mergeNewestCandidates(driveCandidates: DriveNewestCandidate[], treasure: TreasureItem[], limit: number): TreasureItem[]` — used by Task 7's `useNewestProducts.ts`.

- [ ] **Step 1: Write the failing test**

Create `tests/newestProductsMerge.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  mergeNewestCandidates,
  type DriveNewestCandidate,
} from '../src/utils/newestProductsMerge';
import type { TreasureItem } from '../src/types';

function treasureItem(
  overrides: Partial<TreasureItem> & { item: number },
): TreasureItem {
  return {
    fechaIngreso: '',
    nombre: `Item ${overrides.item}`,
    peso: 1,
    color: '',
    calidad: '',
    cantidad: 1,
    talla: '',
    medidas: '',
    precioCOP: 0,
    ubicacion: '',
    asesor: '',
    estado: 'DISPONIBLE',
    isJewelry: false,
    ...overrides,
  } as TreasureItem;
}

function driveCandidate(
  overrides: Partial<DriveNewestCandidate> & { itemNumber: number },
): DriveNewestCandidate {
  return {
    productName: `Legacy ${overrides.itemNumber}`,
    proxyUrl: `/api/serve-drive-image?fileId=${overrides.itemNumber}`,
    imageCreatedTime: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('mergeNewestCandidates', () => {
  it('sorts legacy (Drive) and Fotosíntesis items together, newest first', () => {
    const treasure = [
      treasureItem({ item: 1 }),
      treasureItem({
        item: 2,
        publishedAt: new Date('2026-07-01T00:00:00.000Z').getTime(),
      }),
      treasureItem({
        item: 3,
        publishedAt: new Date('2026-06-01T00:00:00.000Z').getTime(),
      }),
    ];
    const drive = [
      driveCandidate({
        itemNumber: 1,
        imageCreatedTime: '2026-06-15T00:00:00.000Z',
      }),
    ];

    const result = mergeNewestCandidates(drive, treasure, 10);

    expect(result.map((i) => i.item)).toEqual([2, 1, 3]);
  });

  it('excludes lote/sublote bundle cards even if they carry publishedAt', () => {
    const treasure = [
      treasureItem({ item: 2, publishedAt: Date.now(), isLote: true }),
      treasureItem({ item: 3, publishedAt: Date.now() - 1000 }),
    ];

    const result = mergeNewestCandidates([], treasure, 10);

    expect(result.map((i) => i.item)).toEqual([3]);
  });

  it('slices to the requested limit', () => {
    const treasure = Array.from({ length: 5 }, (_, i) =>
      treasureItem({ item: i + 1, publishedAt: i }),
    );

    const result = mergeNewestCandidates([], treasure, 2);

    expect(result).toHaveLength(2);
    expect(result.map((i) => i.item)).toEqual([5, 4]);
  });

  it('falls back to a minimal stub when a Drive item has no treasure match', () => {
    const drive = [
      driveCandidate({
        itemNumber: 99,
        imageCreatedTime: '2026-06-01T00:00:00.000Z',
      }),
    ];

    const result = mergeNewestCandidates(drive, [], 10);

    expect(result).toEqual([
      expect.objectContaining({
        item: 99,
        nombre: 'Legacy 99',
        imagen: drive[0].proxyUrl,
      }),
    ]);
  });

  it('returns [] when there are no candidates from either source', () => {
    expect(mergeNewestCandidates([], [], 10)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/newestProductsMerge.test.ts`
Expected: FAIL with a module-not-found error for `../src/utils/newestProductsMerge`.

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/newestProductsMerge.ts`:

```ts
import { TreasureItem } from '../types';

export interface DriveNewestCandidate {
  itemNumber: number;
  productName: string;
  proxyUrl: string;
  imageCreatedTime: string;
}

interface DatedItem {
  item: TreasureItem;
  sortDate: number;
}

function legacyStub(product: DriveNewestCandidate): TreasureItem {
  return {
    item: product.itemNumber,
    nombre: product.productName,
    imagen: product.proxyUrl,
    fechaIngreso: '',
    peso: 0,
    color: '',
    calidad: '',
    cantidad: 1,
    talla: '',
    medidas: '',
    precioCOP: 0,
    ubicacion: '',
    asesor: '',
    estado: 'DISPONIBLE',
    isJewelry: false,
    mediaType: 'image' as const,
  } as TreasureItem;
}

/**
 * Merge Drive-scanned "newest" candidates (legacy pipeline, sorted by
 * image upload date) with Fotosíntesis items already published to the
 * catalog (sorted by publishedAt), newest-first, sliced to `limit`.
 *
 * Item numbers can't collide between the two sources — legacy and
 * Fotosíntesis items share one sequential item-number counter — so no
 * dedup step is needed. Lote/sublote bundle cards (`isLote`) are excluded:
 * they have no single natural "newest" moment.
 */
export function mergeNewestCandidates(
  driveCandidates: DriveNewestCandidate[],
  treasure: TreasureItem[],
  limit: number,
): TreasureItem[] {
  const legacyDated: DatedItem[] = driveCandidates.map((product) => {
    const treasureItem = treasure.find((t) => t.item === product.itemNumber);
    const item: TreasureItem = treasureItem
      ? {
          ...treasureItem,
          imagen: product.proxyUrl,
          nombre: treasureItem.nombre || product.productName,
        }
      : legacyStub(product);
    return { item, sortDate: new Date(product.imageCreatedTime).getTime() };
  });

  const fotosintesisDated: DatedItem[] = treasure
    .filter((t) => t.publishedAt != null && !t.isLote)
    .map((item) => ({ item, sortDate: item.publishedAt as number }));

  return [...legacyDated, ...fotosintesisDated]
    .sort((a, b) => b.sortDate - a.sortDate)
    .slice(0, limit)
    .map((d) => d.item);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/newestProductsMerge.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/newestProductsMerge.ts tests/newestProductsMerge.test.ts
git commit -m "feat(estrenos): add pure merge function for legacy + Fotosíntesis newest candidates"
```

---

### Task 7: Wire `useNewestProducts` to the new merge function

**Files:**

- Modify: `src/hooks/useNewestProducts.ts:187-220`

**Interfaces:**

- Consumes: `mergeNewestCandidates` from `../utils/newestProductsMerge` (Task 6)

- [ ] **Step 1: Replace the merge block**

Find in `src/hooks/useNewestProducts.ts`:

```ts
// Merge with treasure data for full product info
const newestProducts: TreasureItem[] = newestProductsData.map((product) => {
  // Find matching treasure item
  const treasureItem = treasure.find((t) => t.item === product.itemNumber);

  if (treasureItem) {
    return {
      ...treasureItem,
      imagen: product.proxyUrl,
      nombre: treasureItem.nombre || product.productName,
    };
  }

  // Fallback if no treasure match (shouldn't happen, but safety first)
  // Using type assertion since this is a minimal fallback for display purposes only
  return {
    item: product.itemNumber,
    nombre: product.productName,
    imagen: product.proxyUrl,
    fechaIngreso: '',
    peso: 0,
    color: '',
    calidad: '',
    cantidad: 1,
    talla: '',
    medidas: '',
    precioCOP: 0,
    ubicacion: '',
    asesor: '',
    estado: 'DISPONIBLE',
    isJewelry: false,
    mediaType: 'image' as const,
  } as TreasureItem;
});
```

Replace with:

```ts
// Merge Drive-scanned legacy candidates with published Fotosíntesis items
// (already present in `treasure` via useFotosintesisCatalog), newest first.
const newestProducts: TreasureItem[] = mergeNewestCandidates(
  newestProductsData,
  treasure,
  limit,
);
```

- [ ] **Step 2: Update imports**

At the top of `src/hooks/useNewestProducts.ts`, find:

```ts
import { useState, useEffect, useCallback } from 'react';
import { TreasureItem } from '../types';
import { createLogger } from '../utils/logger';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { fetchWithRetry } from '../utils/fetchWithRetry';
```

Replace with:

```ts
import { useState, useEffect, useCallback } from 'react';
import { TreasureItem } from '../types';
import { createLogger } from '../utils/logger';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { fetchWithRetry } from '../utils/fetchWithRetry';
import { mergeNewestCandidates } from '../utils/newestProductsMerge';
```

- [ ] **Step 3: Typecheck**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Run the full unit test suite**

Run: `npm run test:unit`
Expected: all tests pass, including the new `publishState.test.ts` and `newestProductsMerge.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useNewestProducts.ts
git commit -m "feat(estrenos): merge Fotosíntesis-published items into the newest-products carousel"
```

---

### Task 8: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck**

Run: `npm run lint && npx tsc --noEmit -p convex/tsconfig.json`
Expected: no errors from either command.

- [ ] **Step 2: Full unit test suite**

Run: `npm run test:unit`
Expected: all tests pass.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 4: Manual smoke check**

Run: `npm run dev:api` (starts the app with Vercel Functions locally, per this project's CLAUDE.md).

In a browser, open the local home page and confirm the "Estrenos" section renders without errors. Since local `.env`/`.env.local` may lack `VITE_CONVEX_URL`/`CONVEX_URL` (see spec's "Out of scope" note), the Fotosíntesis contribution may be empty locally — that's expected and not a regression to chase here. If those vars are available, publish a test item via the Fotosíntesis admin UI (`/admin/fotosintesis`) and confirm it appears in Estrenos immediately.

- [ ] **Step 5: Deploy and verify in production**

After deploying (push to `main` per this project's auto-deploy), run:

```bash
curl -s 'https://tierramadre.app/api/get-newest-products?limit=10' | head -c 500
```

This still only reflects the Drive-scan half — the real check is opening `https://tierramadre.app` and confirming the Estrenos carousel now includes items published through Fotosíntesis after this change ships (any item published from this point forward, or the next item an ops person publishes).
