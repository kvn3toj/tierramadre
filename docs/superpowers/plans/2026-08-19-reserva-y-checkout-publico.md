# Reserva de inventario y checkout público (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close both double-sell holes — the concurrency race and the fact that a paid sale never marks the stone sold — and open the app's first unauthenticated write endpoint safely.

**Architecture:** A reservation is **derived**, never stored: an item is held iff some `reservada` sale younger than 30 minutes contains its `itemId`. Convex mutations are serializable, so the check-and-insert inside `createOrder` is atomic and the race closes without locks; a new compound index bounds the read to the last 30 minutes. Payment marks the stone `VENDIDA` in Convex (guarded by `syncStatus: 'pending'` so the sheet pull cannot clobber it). The public endpoint follows the trusted-proxy model `api/vitrina.ts` already documents.

**Tech Stack:** TypeScript, Convex, Vercel serverless functions (Node runtime), Vitest.

**Spec:** `docs/superpowers/specs/2026-08-19-reserva-y-checkout-publico-design.md`

## Global Constraints

- **Reservation TTL is 30 minutes**, and the Wompi checkout link must expire with it (`expirationTime = now + TTL`). A link outliving its hold lets someone pay for a stone that was already released — a refund on money you actually collected.
- **A reservation must never be stored on `productInventory.estado`.** That field is in the sheet pull allowlist (`convex/_lib/sheetPullMaps.ts:118`); the daily pull, the manual "Resync from sheet" button, or the `/sync/foto` delta would release a stone mid-payment.
- **Marking `VENDIDA` must set `syncStatus: 'pending'`** in the same patch. That is what makes `_upsertFromSheet` skip the row's content on the next pull (`convex/products.ts:2076`).
- **Max 10 items per order**, rejected with 400 in the endpoint before Convex is touched.
- **No 2M ceiling on the public path** — explicit product decision. Reached via an opt-in `skip_limit` arg; the bot rail keeps its gate.
- **The public endpoint holds `ADMIN_SYNC_TOKEN` server-side** and calls the existing `requireServerSecret`-gated mutation. No new Convex auth surface.
- **Do not touch** `COLUMN_MAPS`, the espejo push rail, or `api/mp-webhook.ts`.
- **Never run** `npx convex deploy`, `npx convex dev`, `npx convex run`, or any `vercel` command — this repo points at a LIVE production deployment. Safe local typecheck: `npx tsc --noEmit -p convex/tsconfig.json` (currently exits 0).
- `npm run lint` is **not** clean at baseline: `api/cotizacion-deck.ts` has 2 pre-existing TS7016 errors, also present on `origin/main`. The bar is **no new errors beyond those 2**. Do not fix that file.
- Test style: Vitest, `import { describe, it, expect } from "vitest"`, `environment: node`, files in `tests/*.test.ts`. Pure functions, no mocking frameworks.
- Full suite: `npm run test:unit` (174 files / 1751 tests green at baseline).

---

### Task 1: Pure reservation module

The whole reservation decision as pure functions, so the semantics are unit-testable without Convex.

**Files:**

- Create: `convex/_lib/reservas.ts`
- Test: `tests/reservas.test.ts`

**Interfaces:**

- Consumes: nothing (leaf module).
- Produces:
  - `const RESERVA_TTL_MS = 30 * 60 * 1000`
  - `const MAX_ITEMS_POR_PEDIDO = 10`
  - `interface PendingSaleLike { clientId: string; itemIds: string[]; fechaVenta: string; estado: string }`
  - `reservaCutoffISO(now: number, ttlMs?: number): string`
  - `reservedItemIds(sales: PendingSaleLike[], now: number, ttlMs?: number): Set<string>`
  - `orderFingerprint(itemIds: string[]): string`
  - `findReusableSale<T extends PendingSaleLike>(sales: T[], clientId: string, itemIds: string[], now: number, ttlMs?: number): T | null`

- [ ] **Step 1: Write the failing test**

Create `tests/reservas.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  RESERVA_TTL_MS,
  MAX_ITEMS_POR_PEDIDO,
  reservaCutoffISO,
  reservedItemIds,
  orderFingerprint,
  findReusableSale,
} from '../convex/_lib/reservas';

const NOW = Date.parse('2026-08-19T12:00:00.000Z');
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

const sale = (
  clientId: string,
  itemIds: string[],
  msAgo: number,
  estado = 'reservada',
): {
  clientId: string;
  itemIds: string[];
  fechaVenta: string;
  estado: string;
} => ({
  clientId,
  itemIds,
  fechaVenta: iso(msAgo),
  estado,
});

describe('constants', () => {
  it('holds a stone for 30 minutes', () => {
    expect(RESERVA_TTL_MS).toBe(30 * 60 * 1000);
  });

  it('caps an order at 10 items', () => {
    expect(MAX_ITEMS_POR_PEDIDO).toBe(10);
  });
});

describe('reservaCutoffISO', () => {
  it('returns the ISO timestamp one TTL before now', () => {
    expect(reservaCutoffISO(NOW)).toBe('2026-08-19T11:30:00.000Z');
  });
});

describe('reservedItemIds', () => {
  it('holds items from a sale inside the TTL', () => {
    const held = reservedItemIds([sale('c1', ['C-090', 'C-091'], 60_000)], NOW);
    expect(held).toEqual(new Set(['C-090', 'C-091']));
  });

  it('does NOT hold items from a sale older than the TTL', () => {
    const held = reservedItemIds(
      [sale('c1', ['C-090'], RESERVA_TTL_MS + 1)],
      NOW,
    );
    expect(held.size).toBe(0);
  });

  it('still holds a sale exactly at the TTL boundary', () => {
    const held = reservedItemIds([sale('c1', ['C-090'], RESERVA_TTL_MS)], NOW);
    expect(held).toEqual(new Set(['C-090']));
  });

  it('unions items across several pending sales', () => {
    const held = reservedItemIds(
      [sale('c1', ['C-090'], 1000), sale('c2', ['C-091'], 2000)],
      NOW,
    );
    expect(held).toEqual(new Set(['C-090', 'C-091']));
  });

  it('returns an empty set for no sales', () => {
    expect(reservedItemIds([], NOW).size).toBe(0);
  });

  it('does NOT hold items from a confirmada sale', () => {
    const held = reservedItemIds(
      [sale('c1', ['C-090'], 1000, 'confirmada')],
      NOW,
    );
    expect(held.size).toBe(0);
  });

  it('does NOT hold items from a cancelada sale', () => {
    const held = reservedItemIds(
      [sale('c1', ['C-090'], 1000, 'cancelada')],
      NOW,
    );
    expect(held.size).toBe(0);
  });

  it('ignores a sale with an unparseable date rather than throwing', () => {
    const held = reservedItemIds(
      [
        {
          clientId: 'c1',
          itemIds: ['C-090'],
          fechaVenta: 'no es fecha',
          estado: 'reservada',
        },
      ],
      NOW,
    );
    expect(held.size).toBe(0);
  });
});

describe('orderFingerprint', () => {
  it('is order-independent', () => {
    expect(orderFingerprint(['b', 'a'])).toBe(orderFingerprint(['a', 'b']));
  });

  it('distinguishes different item sets', () => {
    expect(orderFingerprint(['a'])).not.toBe(orderFingerprint(['a', 'b']));
  });

  it('does not mutate its input', () => {
    const items = ['b', 'a'];
    orderFingerprint(items);
    expect(items).toEqual(['b', 'a']);
  });
});

describe('findReusableSale', () => {
  it('reuses the same client ordering the same items (double-clicked Pagar)', () => {
    const existing = sale('c1', ['C-090', 'C-091'], 5000);
    expect(findReusableSale([existing], 'c1', ['C-091', 'C-090'], NOW)).toBe(
      existing,
    );
  });

  it('does NOT reuse another client with the same items', () => {
    expect(
      findReusableSale([sale('c2', ['C-090'], 5000)], 'c1', ['C-090'], NOW),
    ).toBeNull();
  });

  it('does NOT reuse the same client with a different item set', () => {
    expect(
      findReusableSale([sale('c1', ['C-090'], 5000)], 'c1', ['C-091'], NOW),
    ).toBeNull();
  });

  it('does NOT reuse a sale older than the TTL', () => {
    expect(
      findReusableSale(
        [sale('c1', ['C-090'], RESERVA_TTL_MS + 1)],
        'c1',
        ['C-090'],
        NOW,
      ),
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/reservas.test.ts`
Expected: FAIL — `Failed to resolve import "../convex/_lib/reservas"`.

- [ ] **Step 3: Write the implementation**

Create `convex/_lib/reservas.ts`:

```ts
/**
 * Reserva derivada — apartar una piedra sin guardar que está apartada.
 *
 * Un ítem está reservado si y solo si alguna venta `reservada` más joven que
 * el TTL contiene su `itemId`. No hay campo de reserva, y esa es la decisión
 * central del diseño: `productInventory.estado` está en el allowlist de pull
 * desde la hoja (`convex/_lib/sheetPullMaps.ts`), así que un `RESERVADA`
 * escrito ahí lo soltaría el siguiente pull —en mitad de un pago— y ensuciaría
 * el SOT con un estado transitorio.
 *
 * Derivarlo compra tres cosas: no hay nada que el pull pueda pisar, no hace
 * falta un reaper que pueda fallar y dejar una piedra bloqueada para siempre
 * (el vencimiento es el paso del tiempo), y la carrera se cierra sola porque
 * las mutations de Convex son serializables: leer las ventas pendientes e
 * insertar la nueva dentro de la misma mutation es atómico.
 *
 * Todo aquí es puro (ver tests/reservas.test.ts); la mutation solo aporta el IO.
 */

/** Cuánto se aparta una piedra entre que empieza el checkout y llega el pago. */
export const RESERVA_TTL_MS = 30 * 60 * 1000;

/**
 * Tope de ítems por pedido. Un pedido legítimo de esmeraldas no se acerca, y
 * acota el daño de una llamada abusiva al endpoint público.
 */
export const MAX_ITEMS_POR_PEDIDO = 10;

export interface PendingSaleLike {
  /** `sales.clientId`, como string — comparado, nunca deferenciado. */
  clientId: string;
  itemIds: string[];
  /** ISO 8601. En ISO el orden lexicográfico es el cronológico. */
  fechaVenta: string;
  /**
   * Solo `reservada` aparta. Se filtra también aquí, no solo en el rango del
   * índice, para que la función sea autocontenida: cualquiera puede leerla y
   * saber qué aparta sin ir a mirar cómo la consulta la mutation.
   */
  estado: string;
}

/**
 * El límite inferior del rango de índice que la mutation consulta. Se devuelve
 * como ISO porque `fechaVenta` es un string y el índice se recorre por rango
 * sobre ese string.
 */
export function reservaCutoffISO(
  now: number,
  ttlMs: number = RESERVA_TTL_MS,
): string {
  return new Date(now - ttlMs).toISOString();
}

/**
 * Los itemIds apartados por las ventas pendientes vigentes. Una fecha
 * ilegible se ignora en vez de lanzar: una fila corrupta no puede tumbar un
 * checkout, y no apartar de más es el lado seguro para el comprador.
 */
export function reservedItemIds(
  sales: PendingSaleLike[],
  now: number,
  ttlMs: number = RESERVA_TTL_MS,
): Set<string> {
  const cutoff = now - ttlMs;
  const held = new Set<string>();
  for (const sale of sales) {
    if (sale.estado !== 'reservada') continue;
    const t = Date.parse(sale.fechaVenta);
    if (!Number.isFinite(t) || t < cutoff) continue;
    for (const itemId of sale.itemIds) held.add(itemId);
  }
  return held;
}

/** Clave estable de un conjunto de ítems, independiente del orden. */
export function orderFingerprint(itemIds: string[]): string {
  return [...itemIds].sort().join(',');
}

/**
 * La venta pendiente que este mismo cliente ya tiene por estos mismos ítems, si
 * existe. Es lo que hace idempotente un doble clic en «Pagar»: sin esto, el
 * segundo clic chocaría contra la reserva que dejó el primero y el cliente
 * vería que su propia piedra «ya no está disponible».
 */
export function findReusableSale<T extends PendingSaleLike>(
  sales: T[],
  clientId: string,
  itemIds: string[],
  now: number,
  ttlMs: number = RESERVA_TTL_MS,
): T | null {
  const cutoff = now - ttlMs;
  const fingerprint = orderFingerprint(itemIds);
  for (const sale of sales) {
    if (sale.estado !== 'reservada') continue;
    const t = Date.parse(sale.fechaVenta);
    if (!Number.isFinite(t) || t < cutoff) continue;
    if (sale.clientId !== clientId) continue;
    if (orderFingerprint(sale.itemIds) === fingerprint) return sale;
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/reservas.test.ts`
Expected: PASS, 18 tests.

- [ ] **Step 5: Commit**

```bash
git add convex/_lib/reservas.ts tests/reservas.test.ts
git commit -m "feat(reserva): la reserva se deriva de las ventas pendientes

Sin campo nuevo: productInventory.estado está en el allowlist de pull, así
que un RESERVADA escrito ahí lo soltaría el siguiente pull en mitad de un
pago. Derivarlo también evita un reaper que pueda fallar y dejar una piedra
bloqueada para siempre."
```

---

### Task 2: Reservation check, duplicate reuse, and `skip_limit` in `createOrder`

Wire the pure module into the mutation, add the compound index that bounds the read, and let the public path opt out of the 2M gate.

**Files:**

- Modify: `convex/schema.ts:1190-1194` (the `sales` index block)
- Modify: `convex/ghl.ts` — `createOrder` args and handler

**Interfaces:**

- Consumes: `RESERVA_TTL_MS`, `reservaCutoffISO`, `reservedItemIds`, `findReusableSale` (Task 1).
- Produces: `ghl.createOrder` gains optional arg `skip_limit: v.optional(v.boolean())`, and its return becomes `{ saleId: string; totalCOP: number; reused: boolean }`. It can now throw `ConvexError('ITEM_RESERVED:<sku>')`.

- [ ] **Step 1: Add the compound index**

In `convex/schema.ts`, in the `sales` table's index block (currently lines 1190-1194), add one line after `.index('by_estado', ['estado'])`:

```ts
    // Rango por (estado, fechaVenta) para que el chequeo de reserva lea SOLO
    // los últimos 30 min de ventas `reservada`, sin importar cuántos carritos
    // abandonados se hayan acumulado. `fechaVenta` es ISO, y en ISO el orden
    // lexicográfico es el cronológico, así que el rango funciona sobre el string.
    .index('by_estado_fecha', ['estado', 'fechaVenta'])
```

- [ ] **Step 2: Import the pure helpers in `convex/ghl.ts`**

Next to the existing `import { applyPaymentToSale, type PaymentProvider } from './_lib/applyPayment';` line, add:

```ts
import {
  RESERVA_TTL_MS,
  reservaCutoffISO,
  reservedItemIds,
  findReusableSale,
} from './_lib/reservas';
```

- [ ] **Step 3: Add the `skip_limit` arg**

In `createOrder`'s `args` block, immediately after `forma_pago: v.optional(v.string()),`, add:

```ts
    /**
     * El checkout in-app no lleva techo de 2M (decisión de producto). Opt-in y
     * opcional, así que el rail del bot conserva su compuerta sin tocarse.
     */
    skip_limit: v.optional(v.boolean()),
```

- [ ] **Step 4: Gate the 2M check behind it**

In `createOrder`'s handler, change the line currently at `convex/ghl.ts:317`:

```ts
if (isOverLimit(totalCOP)) throw new ConvexError('OVER_LIMIT_2M');
```

to:

```ts
if (!args.skip_limit && isOverLimit(totalCOP))
  throw new ConvexError('OVER_LIMIT_2M');
```

- [ ] **Step 5: Add the reservation + duplicate block**

The handler currently runs: price loop → 2M gate → resolve ambassador → `upsertClient` → `allocateNext` → insert.

Insert the new block **after** the `upsertClient` call (which produces `clientId`) and **before** `const seqValue = await allocateNext(...)`. It must come after `upsertClient` because reusing a duplicate order requires knowing the client.

```ts
// 4.5 Reserva derivada. Una sola lectura por rango de índice trae solo las
// ventas `reservada` de los últimos 30 min — el histórico de carritos
// abandonados no encarece esto. Leer aquí e insertar abajo es atómico:
// las mutations de Convex son serializables, así que dos createOrder
// concurrentes chocan y la que reintenta ya ve la venta de la otra.
const now = Date.now();
const pendientes = await ctx.db
  .query('sales')
  .withIndex('by_estado_fecha', (q) =>
    q.eq('estado', 'reservada').gte('fechaVenta', reservaCutoffISO(now)),
  )
  .collect();

// Doble clic en «Pagar»: devolver la reserva que este cliente ya tiene por
// estos mismos ítems, en vez de chocar contra su propia reserva.
const reusable = findReusableSale(
  pendientes.map((s) => ({
    clientId: s.clientId as string,
    itemIds: s.itemIds,
    fechaVenta: s.fechaVenta,
    saleId: s.saleId,
    totalCOP: s.totalCOP,
  })),
  clientId as string,
  itemIds,
  now,
  RESERVA_TTL_MS,
);
if (reusable) {
  return {
    saleId: reusable.saleId,
    totalCOP: reusable.totalCOP,
    reused: true as const,
  };
}

// Otra persona la tiene apartada.
const apartados = reservedItemIds(
  pendientes.map((s) => ({
    clientId: s.clientId as string,
    itemIds: s.itemIds,
    fechaVenta: s.fechaVenta,
  })),
  now,
  RESERVA_TTL_MS,
);
for (const itemId of itemIds) {
  if (apartados.has(itemId)) {
    throw new ConvexError(`ITEM_RESERVED:${itemId}`);
  }
}
```

- [ ] **Step 6: Add `reused: false` to the success return**

At the end of `createOrder`'s handler, change:

```ts
return { saleId, totalCOP };
```

to:

```ts
return { saleId, totalCOP, reused: false as const };
```

- [ ] **Step 7: Typecheck and run the full suite**

Run: `npx tsc --noEmit -p convex/tsconfig.json && npm run test:unit`
Expected: typecheck exits 0; suite green. If a test asserts `createOrder` returns exactly `{saleId, totalCOP}`, update it to expect the added `reused` key — that is the intended contract change, not a regression to paper over.

- [ ] **Step 8: Commit**

```bash
git add convex/schema.ts convex/ghl.ts
git commit -m "feat(reserva): createOrder aparta la piedra y reusa el pedido duplicado

El chequeo lee por rango de índice solo los últimos 30 min, así que el
histórico de carritos abandonados no lo encarece. Leer e insertar en la misma
mutation es atómico —Convex serializa— así que la carrera se cierra sin
candados. skip_limit deja al checkout in-app sin techo sin tocar la compuerta
del bot."
```

---

### Task 3: Payment marks the stone `VENDIDA`

The hole that needs no concurrency at all: today a fully paid online sale leaves the emerald `DISPONIBLE` and re-sellable.

**Files:**

- Modify: `convex/ghl.ts` — `markOrderPaid` handler

**Interfaces:**

- Consumes: nothing new.
- Produces: no signature change. `markOrderPaid` now also patches `productInventory` rows.

- [ ] **Step 1: Add the marking loop**

In `markOrderPaid`, immediately after the line that flips the sale:

```ts
// Flip the sale to confirmada (paid).
await ctx.db.patch(sale._id, decision.patch);
```

insert:

```ts
// Marcar cada piedra como vendida. Sin esto una venta online PAGADA deja
// la esmeralda en DISPONIBLE y se puede volver a vender — sin carrera de
// por medio, simplemente porque nadie la marcó.
//
// `syncStatus: 'pending'` es lo que impide que el siguiente pull de la
// hoja lo pise: `_upsertFromSheet` devuelve temprano sin tocar el
// contenido de una fila `pending` o `error` (convex/products.ts). Es el
// mecanismo que el repo ya usa para toda edición nacida en Convex.
//
// OJO: nada empuja productInventory de vuelta a Sheets del lado del
// servidor (ese push sale de la UI de admin, api/admin-product-update.ts),
// así que la hoja NO se entera sola. Convex es lo que bloquea un segundo
// pedido, así que la doble venta sí queda cerrada; la reconciliación con
// la hoja es manual y está declarada en el spec.
//
// itemIds repite el sku cuando qty > 1 — de ahí el Set.
for (const itemId of new Set(sale.itemIds)) {
  const product = await ctx.db
    .query('productInventory')
    .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
    .first();
  if (!product) {
    console.warn(
      `[markOrderPaid] ${saleId}: itemId ${itemId} no está en productInventory`,
    );
    continue;
  }
  if (product.estado === 'VENDIDA') continue;
  await ctx.db.patch(product._id, {
    estado: 'VENDIDA' as const,
    syncStatus: 'pending' as const,
  });
}
```

This sits inside the existing idempotency guard — `markOrderPaid` already returned early for a replayed webhook before reaching this point, so it runs exactly once per sale.

- [ ] **Step 2: Typecheck and run the full suite**

Run: `npx tsc --noEmit -p convex/tsconfig.json && npm run test:unit`
Expected: typecheck exits 0; suite green.

- [ ] **Step 3: Commit**

```bash
git add convex/ghl.ts
git commit -m "fix(ventas): pagar marca la piedra VENDIDA

markOrderPaid nunca tocaba productInventory, así que una venta online PAGADA
dejaba la esmeralda en DISPONIBLE y se podía volver a vender. syncStatus
'pending' evita que el pull de la hoja lo pise."
```

---

### Task 4: Shared checkout-link helper, with expiry

Both order endpoints need the same provider-selection and link-building logic. Extract it once rather than let the two drift — the phase-1 review already flagged duplicated webhook fan-out as the "one gets fixed, the other forgotten" shape. This is also where the link learns to expire with the reservation.

**Files:**

- Create: `api/_lib/checkoutLink.ts`
- Modify: `api/ghl-create-order.ts` (replace its inline provider block with the helper)
- Test: `tests/checkoutLink.test.ts`

**Interfaces:**

- Consumes: `buildCheckoutUrl` from `api/_lib/wompi.js`; `buildPreference`/`createPreference` from `api/_lib/mp-preference.js`; `RESERVA_TTL_MS` from `convex/_lib/reservas.js`.
- Produces:
  - `resolveProvider(raw: string | undefined): 'mercadopago' | 'wompi'`
  - `checkoutExpirationISO(now: number): string`
  - `interface LinkInput { saleId: string; totalCOP: number; appUrl: string; contact: { celular?: string; full_name?: string; email?: string }; now: number }`
  - `buildPaymentLink(input: LinkInput, provider: 'mercadopago' | 'wompi'): Promise<{ checkoutUrl: string | null; preferenceId?: string; error?: string }>`

- [ ] **Step 1: Write the failing test**

Create `tests/checkoutLink.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  resolveProvider,
  checkoutExpirationISO,
} from '../api/_lib/checkoutLink';
import { RESERVA_TTL_MS } from '../convex/_lib/reservas';

const NOW = Date.parse('2026-08-19T12:00:00.000Z');

describe('resolveProvider', () => {
  it('defaults to mercadopago when unset', () => {
    expect(resolveProvider(undefined)).toBe('mercadopago');
  });

  it('accepts wompi', () => {
    expect(resolveProvider('wompi')).toBe('wompi');
  });

  it('is case- and whitespace-insensitive', () => {
    expect(resolveProvider('  WOMPI ')).toBe('wompi');
  });

  it('falls back to mercadopago on an unknown value', () => {
    expect(resolveProvider('wompy')).toBe('mercadopago');
  });
});

describe('checkoutExpirationISO', () => {
  it('expires exactly one reservation TTL from now', () => {
    expect(checkoutExpirationISO(NOW)).toBe(
      new Date(NOW + RESERVA_TTL_MS).toISOString(),
    );
  });

  it('matches the 30-minute hold', () => {
    expect(checkoutExpirationISO(NOW)).toBe('2026-08-19T12:30:00.000Z');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/checkoutLink.test.ts`
Expected: FAIL — `Failed to resolve import "../api/_lib/checkoutLink"`.

- [ ] **Step 3: Write the implementation**

Create `api/_lib/checkoutLink.ts`:

```ts
/**
 * Un solo lugar donde se decide el proveedor de pago y se arma el link.
 *
 * Existía duplicado en `ghl-create-order` y habría vuelto a duplicarse en el
 * endpoint público; la revisión de la fase 1 ya marcó ese patrón —dos copias
 * de la misma lógica— como la forma exacta en que se arregla una y se olvida
 * la otra.
 *
 * El link VENCE CON LA RESERVA (`RESERVA_TTL_MS`). Si sobreviviera, alguien
 * podría pagar 40 minutos después una piedra ya soltada —quizá ya vendida a
 * otro— y el resultado sería un reembolso manual sobre plata ya cobrada.
 */

import { buildCheckoutUrl } from './wompi.js';
import { buildPreference, createPreference } from './mp-preference.js';
import { RESERVA_TTL_MS } from '../../convex/_lib/reservas.js';

export type PaymentProviderName = 'mercadopago' | 'wompi';

const CONOCIDOS: PaymentProviderName[] = ['mercadopago', 'wompi'];

/**
 * Valida `PAYMENT_PROVIDER`. Un typo cae a `mercadopago` en vez de pasar el
 * string crudo: si el valor inválido llegara a `forma_pago`, se estamparía en
 * Convex y en el espejo de Sheets, y el operador creería que cambió de riel
 * cuando no cambió.
 */
export function resolveProvider(raw: string | undefined): PaymentProviderName {
  const v = (raw ?? 'mercadopago').trim().toLowerCase();
  return (CONOCIDOS as string[]).includes(v)
    ? (v as PaymentProviderName)
    : 'mercadopago';
}

/** Cuándo vence el link: exactamente cuando vence la reserva. */
export function checkoutExpirationISO(now: number): string {
  return new Date(now + RESERVA_TTL_MS).toISOString();
}

export interface LinkInput {
  saleId: string;
  totalCOP: number;
  /** Base sin slash final, p. ej. https://tierramadre.app */
  appUrl: string;
  contact: { celular?: string; full_name?: string; email?: string };
  now: number;
}

/**
 * Devuelve el link de pago, o `{checkoutUrl: null, error}` si el proveedor
 * falló. NUNCA lanza: la venta ya está comprometida en Convex cuando se llama,
 * así que perder el pedido por un fallo del proveedor sería el peor resultado.
 */
export async function buildPaymentLink(
  input: LinkInput,
  provider: PaymentProviderName,
): Promise<{
  checkoutUrl: string | null;
  preferenceId?: string;
  error?: string;
}> {
  const redirectUrl = `${input.appUrl}/pedido-confirmado/${input.saleId}`;
  const expirationTime = checkoutExpirationISO(input.now);

  try {
    if (provider === 'wompi') {
      const publicKey = process.env.WOMPI_PUBLIC_KEY;
      const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
      if (!publicKey || !integritySecret) {
        return { checkoutUrl: null, error: 'WOMPI_NOT_CONFIGURED' };
      }
      return {
        checkoutUrl: buildCheckoutUrl(
          {
            reference: input.saleId,
            amountCOP: input.totalCOP,
            redirectUrl,
            expirationTime,
            customer: {
              email: input.contact.email,
              fullName: input.contact.full_name,
              phoneNumber: input.contact.celular,
            },
          },
          { publicKey, integritySecret },
        ),
      };
    }

    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      return { checkoutUrl: null, error: 'MP_NOT_CONFIGURED' };
    }
    const pref = buildPreference({
      items: [
        {
          title: `Pedido ${input.saleId} · Tierra Madre`,
          quantity: 1,
          unit_price: input.totalCOP,
        },
      ],
      payer: {
        name: input.contact.full_name,
        email: input.contact.email,
        phone: { number: input.contact.celular },
      },
      orderId: input.saleId,
      notificationUrl: `${input.appUrl}/api/mp-webhook`,
      backUrls: { success: redirectUrl },
    });
    const created = await createPreference(pref, accessToken);
    return { checkoutUrl: created.init_point, preferenceId: created.id };
  } catch (err) {
    return {
      checkoutUrl: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/checkoutLink.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Refactor `api/ghl-create-order.ts` onto the helper**

Replace everything in the handler from `const provider = ...` through the end of the MercadoPago `try/catch` block with the helper call. Concretely:

- Delete the `import { buildCheckoutUrl } from './_lib/wompi.js';` and `import { buildPreference, createPreference } from './_lib/mp-preference.js';` lines, and add:

```ts
import { resolveProvider, buildPaymentLink } from './_lib/checkoutLink.js';
```

- Replace the inline provider-resolution block with:

```ts
const provider = resolveProvider(process.env.PAYMENT_PROVIDER);
if (
  provider !==
  (process.env.PAYMENT_PROVIDER ?? 'mercadopago').trim().toLowerCase()
) {
  console.error(
    `[GhlCreateOrder] PAYMENT_PROVIDER="${process.env.PAYMENT_PROVIDER}" no reconocido — usando "mercadopago" para el riel y para forma_pago.`,
  );
}
```

- Replace the whole Wompi branch + MercadoPago branch (everything after `const appUrl = ...`) with:

```ts
const link = await buildPaymentLink(
  {
    saleId: order.saleId,
    totalCOP: order.totalCOP,
    appUrl,
    contact: {
      celular: body.contact.celular,
      full_name: body.contact.full_name,
      email: body.contact.email,
    },
    now: Date.now(),
  },
  provider,
);

if (link.preferenceId) {
  await convexClient.mutation(api.ghl.setMpPreference, {
    saleId: order.saleId,
    mpPreferenceId: link.preferenceId,
    secret: process.env.ADMIN_SYNC_TOKEN ?? '',
  });
}

// `mp_url` es el campo que el workflow vivo de GHL ya lee y le manda al
// cliente. Lleva el link de pago sea cual sea el proveedor — el nombre es
// legado, el significado es «el link». Se conserva para no tocar el workflow.
if (!link.checkoutUrl) {
  return sendSuccess(
    res,
    {
      order_id: order.saleId,
      total_cop: order.totalCOP,
      checkout_url: null,
      mp_url: null,
      mp_pending: true,
      mp_error: link.error,
    },
    201,
  );
}
return sendSuccess(res, {
  order_id: order.saleId,
  total_cop: order.totalCOP,
  checkout_url: link.checkoutUrl,
  mp_url: link.checkoutUrl,
});
```

- [ ] **Step 6: Verify the refactor changed no behavior**

Read the diff of `api/ghl-create-order.ts` and confirm, for `PAYMENT_PROVIDER` unset: the same `OVER_LIMIT_2M`→409, `PRODUCT_NOT_FOUND`/`NOT_AVAILABLE`→409, `EMPTY_ITEMS`→400 mappings; the same `mp_pending` fallback shape; the same 201 status on link failure. The only intended behavior change is that the MercadoPago link now carries an expiry.

Run: `npm run lint && npx tsc --noEmit -p convex/tsconfig.json && npm run test:unit`
Expected: no new lint errors beyond the 2 known; typecheck 0; suite green.

- [ ] **Step 7: Commit**

```bash
git add api/_lib/checkoutLink.ts tests/checkoutLink.test.ts api/ghl-create-order.ts
git commit -m "refactor(checkout): un solo armador de link de pago, y el link vence con la reserva

Iba a duplicarse en el endpoint público; la revisión de la fase 1 ya marcó
ese patrón como la forma en que se arregla una copia y se olvida la otra.
El link ahora vence a los 30 min junto con la reserva: si sobreviviera,
alguien pagaría una piedra ya soltada y habría que devolverle la plata."
```

---

### Task 5: The public checkout endpoint

**Files:**

- Create: `api/checkout-create-order.ts`
- Modify: `vercel.json` (add a `maxDuration` entry)

**Interfaces:**

- Consumes: `resolveProvider`, `buildPaymentLink` (Task 4); `MAX_ITEMS_POR_PEDIDO` (Task 1); `ghl.createOrder` with `skip_limit` (Task 2).
- Produces: `POST /api/checkout-create-order` → `{ order_id, total_cop, checkout_url, reused }`.

- [ ] **Step 1: Write the endpoint**

Create `api/checkout-create-order.ts`:

```ts
/**
 * Checkout público — el primer endpoint de escritura SIN AUTENTICAR de la app.
 *
 * Modelo de proxy de confianza, el mismo que documenta `api/vitrina.ts`: este
 * endpoint guarda `ADMIN_SYNC_TOKEN` del lado del servidor y llama a la
 * mutation que ya está protegida por `requireServerSecret`. No aparece ninguna
 * superficie de autenticación nueva en Convex — la mutation sigue siendo
 * inalcanzable salvo a través de aquí.
 *
 * Lo que NO trae, a propósito: no lleva techo de 2M (decisión de producto, vía
 * `skip_limit`). Un llamante anónimo puede crear un pedido arbitrariamente
 * grande; no se mueve plata hasta que pague, pero es basura que alguien
 * limpia. El escudo contra avalanchas es Vercel WAF + BotID en el edge, no
 * código — ver docs/checkout-publico-proteccion.md.
 *
 * Los precios SIEMPRE se recargan en Convex; nada de lo que manda el cliente
 * toca el monto.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ConvexError } from 'convex/values';
import { withApiHandler, sendError, sendSuccess } from './_lib/index.js';
import { convexClient, isConvexEnabled } from './_lib/convex-client.js';
import { resolveProvider, buildPaymentLink } from './_lib/checkoutLink.js';
import { MAX_ITEMS_POR_PEDIDO } from '../convex/_lib/reservas.js';
import { api } from '../convex/_generated/api.js';

const DEFAULT_APP_URL = 'https://tierramadre.app';

interface CheckoutBody {
  contact?: { celular?: string; full_name?: string; email?: string };
  items?: Array<{ sku?: string; qty?: number }>;
  ambassador_slug?: string | null;
  canal_origen?: string | null;
}

export default withApiHandler(
  async (req: VercelRequest, res: VercelResponse) => {
    if (!isConvexEnabled || !convexClient) {
      return sendError(res, 503, 'Convex backend not configured');
    }

    const body = (req.body ?? {}) as CheckoutBody;
    if (!body.contact?.celular) {
      return sendError(res, 400, 'Missing contact.celular');
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return sendError(res, 400, 'items must be a non-empty array');
    }

    // Tope antes de tocar Convex: acota el daño de una llamada abusiva sin
    // gastar el ancho de banda que la política de free-tier raciona.
    const unidades = body.items.reduce(
      (n, i) => n + Math.max(1, Math.floor(Number(i.qty ?? 1))),
      0,
    );
    if (unidades > MAX_ITEMS_POR_PEDIDO) {
      return sendError(
        res,
        400,
        `Máximo ${MAX_ITEMS_POR_PEDIDO} piezas por pedido`,
      );
    }

    const provider = resolveProvider(process.env.PAYMENT_PROVIDER);

    let order: { saleId: string; totalCOP: number; reused: boolean };
    try {
      order = await convexClient.mutation(api.ghl.createOrder, {
        contact: {
          celular: body.contact.celular,
          full_name: body.contact.full_name,
          email: body.contact.email,
        },
        items: body.items.map((i) => ({
          sku: String(i.sku ?? ''),
          qty: Number(i.qty ?? 1),
        })),
        ambassador_slug: body.ambassador_slug ?? undefined,
        canal_origen: body.canal_origen ?? 'checkout-web',
        forma_pago: provider,
        skip_limit: true,
        secret: process.env.ADMIN_SYNC_TOKEN ?? '',
      });
    } catch (err) {
      // Convex sanitiza un `Error` normal a "Server Error"; solo `.data` de un
      // ConvexError sobrevive intacto.
      const msg =
        err instanceof ConvexError
          ? typeof err.data === 'string'
            ? err.data
            : String(err.data)
          : err instanceof Error
            ? err.message
            : String(err);

      if (msg.includes('ITEM_RESERVED')) {
        const sku = msg.split('ITEM_RESERVED:')[1]?.trim() ?? '';
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.status(409).json({
          success: false,
          error: 'ITEM_RESERVED',
          sku,
          message: 'Alguien más está pagando esta pieza en este momento.',
        });
      }
      if (msg.includes('PRODUCT_NOT_FOUND') || msg.includes('NOT_AVAILABLE')) {
        return sendError(res, 409, 'PRODUCT_UNAVAILABLE', msg);
      }
      if (msg.includes('EMPTY_ITEMS')) {
        return sendError(res, 400, 'items must be a non-empty array');
      }
      throw err;
    }

    const appUrl = (process.env.APP_URL ?? DEFAULT_APP_URL)
      .trim()
      .replace(/\/$/, '');

    // La venta ya existe en Convex: un fallo del proveedor no puede perderla.
    const link = await buildPaymentLink(
      {
        saleId: order.saleId,
        totalCOP: order.totalCOP,
        appUrl,
        contact: {
          celular: body.contact.celular,
          full_name: body.contact.full_name,
          email: body.contact.email,
        },
        now: Date.now(),
      },
      provider,
    );

    if (link.preferenceId) {
      await convexClient.mutation(api.ghl.setMpPreference, {
        saleId: order.saleId,
        mpPreferenceId: link.preferenceId,
        secret: process.env.ADMIN_SYNC_TOKEN ?? '',
      });
    }

    if (!link.checkoutUrl) {
      return sendSuccess(
        res,
        {
          order_id: order.saleId,
          total_cop: order.totalCOP,
          checkout_url: null,
          pending: true,
          error: link.error,
          reused: order.reused,
        },
        201,
      );
    }

    return sendSuccess(res, {
      order_id: order.saleId,
      total_cop: order.totalCOP,
      checkout_url: link.checkoutUrl,
      reused: order.reused,
    });
  },
  {
    methods: ['POST', 'OPTIONS'],
    requireGoogle: false,
    errorPrefix: 'CheckoutCreateOrder',
  },
);
```

- [ ] **Step 2: Add the `maxDuration` entry**

In `vercel.json`, inside the `functions` object, next to the existing `"api/ghl-create-order.ts"` entry, add:

```json
    "api/checkout-create-order.ts": {
      "maxDuration": 30
    },
```

- [ ] **Step 3: Typecheck and run the full suite**

Run: `npm run lint && npx tsc --noEmit -p convex/tsconfig.json && npm run test:unit`
Expected: no new lint errors beyond the 2 known; typecheck 0; suite green.

- [ ] **Step 4: Verify the JSON is still valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('vercel.json OK')"`
Expected: `vercel.json OK`.

- [ ] **Step 5: Commit**

```bash
git add api/checkout-create-order.ts vercel.json
git commit -m "feat(checkout): endpoint público de pedido, con proxy de confianza

Primer endpoint de escritura sin autenticar de la app. Guarda
ADMIN_SYNC_TOKEN del lado del servidor y llama a la mutation ya protegida,
así que no aparece superficie de auth nueva en Convex. Tope de 10 piezas
antes de tocar Convex; precios siempre recargados del lado del servidor."
```

---

### Task 6: The abuse-protection runbook

The endpoint's real shield is edge configuration the account owner applies. Write down exactly what to apply and why, so it is not folklore.

**Files:**

- Create: `docs/checkout-publico-proteccion.md`

**Interfaces:**

- Consumes: nothing.
- Produces: documentation only.

- [ ] **Step 1: Write the runbook**

Create `docs/checkout-publico-proteccion.md`, in Spanish, matching the tone of `docs/wompi-setup.md`. It must cover:

1. **Qué expone el endpoint.** `POST /api/checkout-create-order` es el primero que cualquiera puede llamar con `curl`, sin credenciales. Cada llamada crea una venta `reservada` (que **aparta piedras 30 minutos**), hace upsert de una fila en `clients` (que fluye a GHL y al espejo de Sheets), y gasta ancho de banda de Convex — el mismo que la política de free-tier raciona a propósito (el pull de inventario se bajó de 15 min a diario justo por eso). El daño no es robo: es **denegación de venta más un CRM sucio**.

2. **La decisión: Vercel WAF + BotID**, y el porqué — bloquea en el edge, antes de que la función corra, así que una avalancha cuesta cero ancho de banda de Convex y no ensucia GHL. Sin código de aplicación y sin dependencia nueva. El contador en Convex tiene la propiedad opuesta: cada request abusivo tiene que _llegar_ a Convex para ser contado, gastando justo lo que se quiere proteger.

3. **Qué configurar, paso a paso:** en el proyecto `tierra-madre-studio` → Firewall, una regla de rate limiting sobre el path `/api/checkout-create-order` (sugerido: 5 requests por minuto por IP, y 30 por hora), y BotID activado para ese path. Indicar que la ruta es sensible a método: solo `POST` importa.

4. **Verificar primero que el plan de Vercel incluya rate limiting del WAF** — algunas funciones del firewall son de Pro en adelante. Si no lo incluye, el fallback es un contador en Convex con ventana deslizante por teléfono e IP, y hay que decir explícitamente que ese fallback **no está implementado** todavía.

5. **Las dos defensas que sí viven en el código** y no dependen del dashboard: el tope de `MAX_ITEMS_POR_PEDIDO` (10) aplicado antes de tocar Convex, y la idempotencia por `(celular + itemIds)` dentro del TTL, que evita que un doble clic en «Pagar» cree dos ventas sobre la misma piedra.

6. **Cómo saber si está funcionando:** qué mirar en los logs de Vercel (requests bloqueados por la regla) y en Convex (crecimiento de ventas `reservada` que nunca pasan a `confirmada`).

- [ ] **Step 2: Commit**

```bash
git add docs/checkout-publico-proteccion.md
git commit -m "docs(checkout): runbook de protección del endpoint público

Deja escrito por qué el escudo va en el edge y no en la mutation: un
contador en Convex obliga a que cada request abusivo LLEGUE a Convex para
ser contado, gastando justo el ancho de banda que se quiere proteger."
```

---

## Verification checklist

Phase 2 is done when all of these hold:

- [ ] `npm run test:unit` passes, including the new `reservas` and `checkoutLink` suites.
- [ ] `npx tsc --noEmit -p convex/tsconfig.json` exits 0.
- [ ] `npm run lint` shows no new errors beyond the 2 pre-existing in `api/cotizacion-deck.ts`.
- [ ] `vercel.json` still parses.
- [ ] Two orders for the same sku from **different** clients: the second gets `ITEM_RESERVED`.
- [ ] The **same** client re-submitting the same items inside 30 minutes gets the **same** `order_id` back with `reused: true`, and no second sale row exists.
- [ ] A sale flipping to `confirmada` leaves its items `estado: 'VENDIDA'`, `syncStatus: 'pending'` in Convex.
- [ ] With `PAYMENT_PROVIDER` unset, `api/ghl-create-order.ts` behaves as before apart from the link's new expiry.

## Explicitly out of scope

Deferred by the spec — do not build them here:

- Any UI, including the still-missing `/pedido-confirmado/:saleId` route — **phase 3**.
- Bre-B direct transfer with manual confirmation — **phase 4**.
- Pushing `VENDIDA` back to the spreadsheet automatically — a stated limitation, not this phase's work.
- The Convex rate-limit counter — only if the Vercel plan lacks WAF rate limiting, or real abuse appears.
- Making the legacy catalog stop _displaying_ a sold stone — it reads the sheet; ordering is already blocked by Convex.
