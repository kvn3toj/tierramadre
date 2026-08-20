# Checkout in-app y autoridad de precio (Phase 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a customer pay inside the app, charging the price they were actually shown — resolved server-side from the record that decided what to show them, never from the browser.

**Architecture:** The checkout sends an `origen` (a vitrina token or an invitation shortCode), never a price or a multiplier. Convex resolves the multiplier from `vitrinas.multiplier` / `invitations.guestMultiplier` and charges `Math.round(precioCOP × multiplicador)`. A claimed-but-unresolvable origin **rejects the order** rather than falling back to base price. A shared `<CheckoutSheet>` serves the two surfaces that have such a record, and a new public route shows the order's state after payment.

**Tech Stack:** React 18 + TypeScript, MUI v6, Convex, Vercel functions, Vitest (+ jsdom for `.test.tsx`).

**Spec:** `docs/superpowers/specs/2026-08-20-checkout-in-app-design.md`

## Global Constraints

- **The browser never supplies a price or a multiplier.** Only an `origen` identifier travels. The multiplier is resolved server-side.
- **Absent origin ≠ invalid origin.** Absent → multiplier 1 (that is the bot rail, which must keep charging `precioCOP`). Claimed but unresolvable → **reject the order**. Treating a garbage token as "no markup" would make the field itself the way to buy at cost.
- **The charge is always `Math.round(precioCOP × multiplicador)` in COP**, even when the vitrina displays USD — Wompi collects only in COP. The checkout must show that COP amount before the customer confirms.
- **Optional contact fields are OMITTED, never `null`.** `api/_lib/checkoutBody.ts` rejects `null` with a 400 (`full_name !== undefined && typeof !== 'string'`), as does the Convex validator.
- `canUseMultiplier: isAdmin || isEmbajador || isInvitadoEspecial` — the asesor is excluded, the special guest included. Product-owner decision, recorded deliberately.
- New `sales` fields are Convex-only and stay **out of `COLUMN_MAPS`**, like the phase-1 payment fields.
- **Never run** `npx convex deploy`, `npx convex dev`, `npx convex run`, or any `vercel` command — this repo points at a LIVE production deployment. Safe local typecheck: `npx tsc --noEmit -p convex/tsconfig.json` (exits 0 today).
- `npm run lint` is **not** clean at baseline: `api/cotizacion-deck.ts` has 2 pre-existing TS7016 errors, also on `origin/main`. The bar is **no new errors**. Do not fix that file.
- Full suite: `npm run test:unit` (177 files / 1790 tests green at baseline).
- This branch is stacked on `feat/reserva-y-checkout-publico` (phase 2, PR #133, unmerged). Do not rebase it onto `main`.

## Nota sobre los pasos de UI (Tareas 5, 6 y 7)

Este plan da **código literal** para todo lo que decide dinero o corrección:
la resolución del precio, la validación del origen, la compuerta de permisos y
el mapeo de errores. Esos son los pasos donde un implementador no debe
improvisar.

Los tres pasos que construyen componentes React (`CheckoutSheet`, los botones,
la página de confirmación) están descritos con **requisitos precisos y el
archivo vecino a imitar**, no con JSX literal. Es una desviación deliberada de
«todo paso de código lleva su bloque»: este repo tiene una migración de design
system a medio camino (DS3, ver `DESIGN-SYSTEM-V3.md`), y un JSX escrito sin
mirar los componentes vecinos saldría con el estilo equivocado y habría que
rehacerlo. Cada uno de esos pasos nombra el archivo concreto a leer primero y
enumera el comportamiento exigido, que es lo verificable en revisión.

Lo que NO es negociable en esos pasos está escrito como requisito, no como
sugerencia: omitir los campos opcionales vacíos en vez de mandar `null`,
mostrar el monto en COP que se va a cobrar, bloquear el botón mientras la
petición vuela, y tratar `reservada` como «confirmando» y no como error.

---

### Task 1: Pure price resolution

The whole markup decision as pure functions, testable without Convex.

**Files:**

- Create: `convex/_lib/precioVitrina.ts`
- Test: `tests/precioVitrina.test.ts`

**Interfaces:**

- Consumes: nothing (leaf module).
- Produces:
  - `type OrigenTipo = 'vitrina' | 'invitacion'`
  - `interface Origen { tipo: OrigenTipo; token: string }`
  - `const MULTIPLICADOR_POR_DEFECTO = 1`
  - `esMultiplicadorValido(v: unknown): v is number`
  - `resolverMultiplicador(origen: Origen | undefined, registro: { multiplicador?: number } | null): { ok: true; multiplicador: number } | { ok: false; razon: 'origen-invalido' }`
  - `precioConMarkup(precioCOP: number, multiplicador: number): number`

- [ ] **Step 1: Write the failing test**

Create `tests/precioVitrina.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  MULTIPLICADOR_POR_DEFECTO,
  esMultiplicadorValido,
  resolverMultiplicador,
  precioConMarkup,
} from '../convex/_lib/precioVitrina';

describe('MULTIPLICADOR_POR_DEFECTO', () => {
  it('es 1 — la ausencia de markup, no un markup elegido', () => {
    expect(MULTIPLICADOR_POR_DEFECTO).toBe(1);
  });
});

describe('esMultiplicadorValido', () => {
  it('acepta el rango real del slider', () => {
    expect(esMultiplicadorValido(1)).toBe(true);
    expect(esMultiplicadorValido(2.6)).toBe(true);
    expect(esMultiplicadorValido(4)).toBe(true);
  });

  it('rechaza fuera de rango', () => {
    expect(esMultiplicadorValido(0.9)).toBe(false);
    expect(esMultiplicadorValido(4.1)).toBe(false);
  });

  it('rechaza lo que no es un número finito', () => {
    expect(esMultiplicadorValido(NaN)).toBe(false);
    expect(esMultiplicadorValido(Infinity)).toBe(false);
    expect(esMultiplicadorValido('2')).toBe(false);
    expect(esMultiplicadorValido(null)).toBe(false);
    expect(esMultiplicadorValido(undefined)).toBe(false);
  });
});

describe('resolverMultiplicador', () => {
  it('sin origen usa el default — ese es el riel del bot', () => {
    expect(resolverMultiplicador(undefined, null)).toEqual({
      ok: true,
      multiplicador: 1,
    });
  });

  it('con origen resuelto usa el multiplicador del registro', () => {
    expect(
      resolverMultiplicador(
        { tipo: 'vitrina', token: 'AB3K9P' },
        {
          multiplicador: 2.6,
        },
      ),
    ).toEqual({ ok: true, multiplicador: 2.6 });
  });

  it('SEGURIDAD: origen afirmado que no resuelve se RECHAZA, no cae a 1', () => {
    expect(
      resolverMultiplicador({ tipo: 'vitrina', token: 'basura' }, null),
    ).toEqual({ ok: false, razon: 'origen-invalido' });
  });

  it('SEGURIDAD: un registro con multiplicador corrupto se rechaza, no se cobra a 1', () => {
    expect(
      resolverMultiplicador(
        { tipo: 'invitacion', token: 'XY12' },
        {
          multiplicador: 99,
        },
      ),
    ).toEqual({ ok: false, razon: 'origen-invalido' });
  });

  it('un registro sin multiplicador (invitación vieja) vale 1, porque existe', () => {
    expect(
      resolverMultiplicador({ tipo: 'invitacion', token: 'XY12' }, {}),
    ).toEqual({ ok: true, multiplicador: 1 });
  });
});

describe('precioConMarkup', () => {
  it('redondea al peso', () => {
    expect(precioConMarkup(1_000_000, 2.6)).toBe(2_600_000);
    expect(precioConMarkup(333_333, 1.1)).toBe(366_666);
  });

  it('x1 devuelve el precio base intacto', () => {
    expect(precioConMarkup(1_980_000, 1)).toBe(1_980_000);
  });

  it('un precio de 0 sigue en 0', () => {
    expect(precioConMarkup(0, 2.6)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/precioVitrina.test.ts`
Expected: FAIL — `Failed to resolve import "../convex/_lib/precioVitrina"`.

- [ ] **Step 3: Write the implementation**

Create `convex/_lib/precioVitrina.ts`:

```ts
/**
 * Autoridad de precio: quién decide cuánto se cobra.
 *
 * El precio que ve el cliente NO es `precioCOP`, es `precioCOP × multiplicador`
 * (x1–x4). Ese multiplicador vive en `vitrinas.multiplier` o en
 * `invitations.guestMultiplier` — del lado del servidor, y a propósito: el
 * comentario del esquema dice que se guarda ahí «para que el markup nunca
 * quede expuesto ni editable por el destinatario». En el navegador vive sólo
 * una copia para MOSTRAR, y una copia que el cliente puede editar no puede
 * decidir un cobro.
 *
 * De ahí que aquí nunca entre un multiplicador mandado por la red: entra un
 * ORIGEN (a qué registro pertenece esta compra) y el registro que el llamante
 * ya leyó de la base.
 *
 * Todo es puro; la mutation aporta el IO. Ver tests/precioVitrina.test.ts.
 */

export type OrigenTipo = 'vitrina' | 'invitacion';

export interface Origen {
  tipo: OrigenTipo;
  /**
   * Vitrina → el `:code` de `/v/:code`.
   * Invitación → lo que el invitado guarda bajo `INVITATION_STORAGE_KEYS.TOKEN`,
   * que pese al nombre es el **shortCode** (ver InvitationPage.tsx).
   */
  token: string;
}

/** El slider va de 1 a 4 en pasos de 0,1 (CurrencyContext). */
const MULT_MIN = 1;
const MULT_MAX = 4;

/** Ausencia de markup. NO es «no se pudo resolver»: son cosas distintas. */
export const MULTIPLICADOR_POR_DEFECTO = 1;

export function esMultiplicadorValido(v: unknown): v is number {
  return (
    typeof v === 'number' &&
    Number.isFinite(v) &&
    v >= MULT_MIN &&
    v <= MULT_MAX
  );
}

export type ResolucionMultiplicador =
  | { ok: true; multiplicador: number }
  | { ok: false; razon: 'origen-invalido' };

/**
 * Decide el multiplicador de una compra.
 *
 * La distinción que sostiene todo: **origen AUSENTE y origen INVÁLIDO no son
 * lo mismo**. Sin origen (el riel del bot) se cobra sin markup. Pero un origen
 * que se AFIRMA y no resuelve se rechaza — si cayera a 1, mandar un token
 * inventado sería la forma de comprar al costo, y este archivo existe para
 * impedir exactamente eso.
 *
 * `registro` es lo que el llamante encontró en la base: `null` si no encontró
 * nada.
 */
export function resolverMultiplicador(
  origen: Origen | undefined,
  registro: { multiplicador?: number } | null,
): ResolucionMultiplicador {
  if (!origen) {
    return { ok: true, multiplicador: MULTIPLICADOR_POR_DEFECTO };
  }
  if (!registro) {
    return { ok: false, razon: 'origen-invalido' };
  }
  // Un registro que existe pero no eligió markup vale 1: la ausencia de
  // elección es una elección válida. Un valor presente pero absurdo, no.
  if (registro.multiplicador === undefined) {
    return { ok: true, multiplicador: MULTIPLICADOR_POR_DEFECTO };
  }
  if (!esMultiplicadorValido(registro.multiplicador)) {
    return { ok: false, razon: 'origen-invalido' };
  }
  return { ok: true, multiplicador: registro.multiplicador };
}

/** Lo que se cobra por una pieza, en pesos enteros. */
export function precioConMarkup(
  precioCOP: number,
  multiplicador: number,
): number {
  return Math.round(precioCOP * multiplicador);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/precioVitrina.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add convex/_lib/precioVitrina.ts tests/precioVitrina.test.ts
git commit -m "feat(precio): la autoridad del multiplicador, pura y probada

Origen ausente y origen inválido no son lo mismo: sin origen se cobra sin
markup (el riel del bot), pero un origen que se afirma y no resuelve se
rechaza. Si cayera a 1, mandar un token inventado sería la forma de comprar
al costo."
```

---

### Task 2: `createOrder` cobra con markup y guarda el desglose

**Files:**

- Modify: `convex/schema.ts` — `sales`, junto a los campos de pago de la fase 1
- Modify: `convex/ghl.ts` — `createOrder`

**Interfaces:**

- Consumes: `Origen`, `resolverMultiplicador`, `precioConMarkup` (Task 1); `vitrinas` (índice `by_token`), `invitations` (índice `by_shortCode`, `convex/schema.ts:45`).
- Produces: `ghl.createOrder` gains an optional `origen` arg and returns `{ saleId, totalCOP, reused, reservedAt }` unchanged in shape. It can now throw `ConvexError('ORIGEN_INVALIDO')`.

- [ ] **Step 1: Add the two sale fields**

In `convex/schema.ts`, immediately after the `paymentProvider` / `providerTxId` / `providerStatus` trio in `sales`, add:

```ts
    /**
     * Desglose del precio de una venta online. `totalCOP` es lo COBRADO; estos
     * dos dicen de dónde salió. Sin ellos no se puede auditar después si una
     * venta salió a x1 o a x2,6, y reconstruirlo es imposible porque el
     * multiplicador de la vitrina pudo cambiar.
     *
     * Convex-only, FUERA de COLUMN_MAPS — igual que los campos de pago.
     */
    precioBaseCOP: v.optional(v.number()),
    multiplicador: v.optional(v.number()),
```

- [ ] **Step 2: Add the `origen` arg**

In `createOrder`'s `args`, immediately after `skip_limit`, add:

```ts
    /**
     * De qué registro viene esta compra. NO lleva precio ni multiplicador:
     * el servidor los resuelve. Ausente = riel del bot = sin markup.
     */
    origen: v.optional(
      v.object({
        tipo: v.union(v.literal('vitrina'), v.literal('invitacion')),
        token: v.string(),
      }),
    ),
```

- [ ] **Step 3: Resolve the multiplier before the price loop**

In `createOrder`'s handler, immediately after `if (!args.items.length) throw new ConvexError('EMPTY_ITEMS');` and BEFORE the price loop, insert:

```ts
// Resolver el markup ANTES de sumar, porque decide cada precio.
let registroOrigen: { multiplicador?: number } | null = null;
if (args.origen?.tipo === 'vitrina') {
  const v0 = await ctx.db
    .query('vitrinas')
    .withIndex('by_token', (q) => q.eq('token', args.origen!.token))
    .first();
  registroOrigen = v0 ? { multiplicador: v0.multiplier } : null;
} else if (args.origen?.tipo === 'invitacion') {
  // La clave que el invitado guarda como TOKEN contiene el shortCode
  // (InvitationPage.tsx). `invitations` NO tiene índice por boundToken,
  // así que resolver «por token» literalmente sería un full-scan.
  const inv = await ctx.db
    .query('invitations')
    .withIndex('by_shortCode', (q) => q.eq('shortCode', args.origen!.token))
    .first();
  registroOrigen = inv ? { multiplicador: inv.guestMultiplier } : null;
}

const resolucion = resolverMultiplicador(args.origen, registroOrigen);
if (!resolucion.ok) throw new ConvexError('ORIGEN_INVALIDO');
const multiplicador = resolucion.multiplicador;
```

Add to the imports at the top of `convex/ghl.ts`, next to the `./_lib/reservas` import:

```ts
import { resolverMultiplicador, precioConMarkup } from './_lib/precioVitrina';
```

- [ ] **Step 4: Apply the markup in the price loop**

In the price loop, change the accumulation line from:

```ts
totalCOP += (product.precioCOP ?? 0) * qty;
```

to:

```ts
const base = product.precioCOP ?? 0;
precioBaseCOP += base * qty;
totalCOP += precioConMarkup(base, multiplicador) * qty;
```

and declare `precioBaseCOP` next to the existing `let totalCOP = 0;`:

```ts
let precioBaseCOP = 0;
```

- [ ] **Step 5: Persist the breakdown on the new sale**

In the `ctx.db.insert('sales', { … })` call, add two fields next to `totalCOP`:

```ts
      precioBaseCOP,
      multiplicador,
```

- [ ] **Step 6: Typecheck and run the full suite**

Run: `npx tsc --noEmit -p convex/tsconfig.json && npm run test:unit`
Expected: typecheck exits 0; suite green. If a test asserts a sale's exact field set, add the two new keys — that is the intended contract change.

- [ ] **Step 7: Commit**

```bash
git add convex/schema.ts convex/ghl.ts
git commit -m "feat(precio): createOrder cobra el precio que el cliente vio

Hasta ahora cobraba precioCOP pelado: una vitrina compartida a 2,6× mostraba
un número y vendía al costo. El multiplicador se resuelve contra el registro
—vitrina o invitación— nunca contra lo que manda el navegador, y la venta
guarda base y multiplicador para poder auditar el margen después."
```

---

### Task 3: El endpoint acepta y reenvía el origen

**Files:**

- Modify: `api/_lib/checkoutBody.ts` — validar `origen`
- Modify: `api/checkout-create-order.ts` — reenviarlo y mapear `ORIGEN_INVALIDO`
- Test: `tests/checkoutBody.test.ts` (extender)

**Interfaces:**

- Consumes: `parseCheckoutBody` (phase 2), `Origen` (Task 1), `ORIGEN_INVALIDO` thrown by `createOrder` (Task 2).
- Produces: `parseCheckoutBody`'s success value gains `origen?: { tipo: 'vitrina' | 'invitacion'; token: string }`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/checkoutBody.test.ts`, inside the existing top-level `describe`:

```ts
it('acepta un origen de vitrina', () => {
  const r = parseCheckoutBody({
    contact: { celular: '3001234567' },
    items: [{ sku: 'C-090', qty: 1 }],
    origen: { tipo: 'vitrina', token: 'AB3K9P' },
  });
  expect(r.ok).toBe(true);
  if (r.ok)
    expect(r.value.origen).toEqual({
      tipo: 'vitrina',
      token: 'AB3K9P',
    });
});

it('acepta la ausencia de origen — es el riel del bot', () => {
  const r = parseCheckoutBody({
    contact: { celular: '3001234567' },
    items: [{ sku: 'C-090', qty: 1 }],
  });
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.value.origen).toBeUndefined();
});

it('rechaza un tipo de origen desconocido', () => {
  const r = parseCheckoutBody({
    contact: { celular: '3001234567' },
    items: [{ sku: 'C-090', qty: 1 }],
    origen: { tipo: 'inventado', token: 'X' },
  });
  expect(r.ok).toBe(false);
});

it('rechaza un origen sin token utilizable', () => {
  for (const token of ['', '   ', 5, null, undefined]) {
    const r = parseCheckoutBody({
      contact: { celular: '3001234567' },
      items: [{ sku: 'C-090', qty: 1 }],
      origen: { tipo: 'vitrina', token },
    });
    expect(r.ok).toBe(false);
  }
});

it('rechaza un origen que no es objeto', () => {
  const r = parseCheckoutBody({
    contact: { celular: '3001234567' },
    items: [{ sku: 'C-090', qty: 1 }],
    origen: 'vitrina',
  });
  expect(r.ok).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/checkoutBody.test.ts`
Expected: FAIL — `origen` is not yet returned, and the unknown-tipo case passes when it should not.

- [ ] **Step 3: Validate `origen` in `parseCheckoutBody`**

In `api/_lib/checkoutBody.ts`, add the field to the parsed result type, then validate it after the contact checks and before the items loop:

```ts
let origen: { tipo: 'vitrina' | 'invitacion'; token: string } | undefined;
if (body.origen !== undefined) {
  if (!isPlainObject(body.origen)) {
    return reject(400, 'origen must be an object');
  }
  const tipo = body.origen.tipo;
  if (tipo !== 'vitrina' && tipo !== 'invitacion') {
    return reject(400, 'origen.tipo must be vitrina or invitacion');
  }
  const token = body.origen.token;
  if (typeof token !== 'string' || token.trim() === '') {
    return reject(400, 'origen.token must be a non-empty string');
  }
  origen = { tipo, token: token.trim() };
}
```

and include `origen` in the returned value object.

- [ ] **Step 4: Forward it and map the new error**

In `api/checkout-create-order.ts`, pass `origen: parsed.value.origen` in the `api.ghl.createOrder` mutation args, and add a branch to the error mapping — placed with the other mapped codes, before the generic 500:

```ts
if (msg.includes('ORIGEN_INVALIDO')) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(409).json({
    success: false,
    error: 'ORIGEN_INVALIDO',
    message:
      'El enlace por el que llegaste ya no es válido. Escríbenos y te ayudamos.',
  });
}
```

- [ ] **Step 5: Run the tests and typecheck**

Run: `npx vitest run tests/checkoutBody.test.ts && npm run lint && npx tsc --noEmit -p convex/tsconfig.json`
Expected: tests pass; no new lint errors beyond the 2 known; typecheck 0.

- [ ] **Step 6: Commit**

```bash
git add api/_lib/checkoutBody.ts api/checkout-create-order.ts tests/checkoutBody.test.ts
git commit -m "feat(checkout): el endpoint acepta un origen validado

Y mapea ORIGEN_INVALIDO a 409 con un mensaje que el cliente entiende, en vez
de dejarlo caer al 500 genérico."
```

---

### Task 4: La compuerta del multiplicador

**Files:**

- Modify: `src/hooks/usePermissions.ts:33-38`
- Modify: `api/vitrina.ts` — rechazar multiplicador ≠ 1 sin permiso
- Test: `tests/permisosMultiplicador.test.ts`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces: `usePermissions()` returns `canUseMultiplier: boolean`; `puedeFijarMultiplicador(accessLevel: string): boolean` exported from `src/hooks/usePermissions.ts` for server-side reuse.

- [ ] **Step 1: Write the failing test**

Create `tests/permisosMultiplicador.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { puedeFijarMultiplicador } from '../src/hooks/usePermissions';

describe('puedeFijarMultiplicador', () => {
  it('admin y embajador pueden', () => {
    expect(puedeFijarMultiplicador('admin')).toBe(true);
    expect(puedeFijarMultiplicador('embajador')).toBe(true);
  });

  it('el invitado especial puede — decisión explícita del dueño', () => {
    expect(puedeFijarMultiplicador('invitado_especial')).toBe(true);
  });

  it('el asesor NO puede, aunque sí pueda compartir vitrinas', () => {
    expect(puedeFijarMultiplicador('asesor')).toBe(false);
  });

  it('invitado y proveedor no pueden', () => {
    expect(puedeFijarMultiplicador('guest')).toBe(false);
    expect(puedeFijarMultiplicador('provider')).toBe(false);
  });

  it('un nivel desconocido no puede', () => {
    expect(puedeFijarMultiplicador('')).toBe(false);
    expect(puedeFijarMultiplicador('otra-cosa')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/permisosMultiplicador.test.ts`
Expected: FAIL — `puedeFijarMultiplicador` is not exported.

- [ ] **Step 3: Add the predicate and the permission**

In `src/hooks/usePermissions.ts`, add above the hook:

```ts
/**
 * Quién puede fijar un markup. Separado del hook para que el proxy del
 * servidor pueda usar la MISMA regla — la comprobación de la UI es cortesía,
 * la del servidor es la que cuenta, y dos copias de esta regla acabarían
 * divergiendo.
 *
 * El asesor queda fuera aunque `canShareVitrina` lo incluya: compartir una
 * vitrina y ponerle precio dejan de ser el mismo permiso.
 */
export function puedeFijarMultiplicador(accessLevel: string): boolean {
  return (
    accessLevel === 'admin' ||
    accessLevel === 'embajador' ||
    accessLevel === 'invitado_especial'
  );
}
```

and inside the returned object, next to `canUseManualProduct`:

```ts
      canUseMultiplier: puedeFijarMultiplicador(accessLevel),
```

- [ ] **Step 4: Enforce it server-side in the vitrina proxy**

`api/vitrina.ts` already verifies the caller's session token and records `createdByEmail` (`api/vitrina.ts:161`). After the caller's identity is resolved and before calling `vitrinas.create`, reject a markup the caller may not set:

```ts
// La UI oculta el slider a quien no puede, pero el diálogo es código de
// cliente y se puede saltar. Esta es la comprobación que cuenta.
const multiplicadorPedido = Number(body.multiplier ?? 1);
if (
  multiplicadorPedido !== 1 &&
  !puedeFijarMultiplicador(await accessLevelFor(email))
) {
  return sendError(
    res,
    403,
    'No autorizado para fijar un multiplicador distinto de 1',
  );
}
```

Read `api/vitrina.ts` to find how the caller's role is already determined and use that mechanism for `accessLevelFor` rather than inventing one. If the file resolves only an email and not a role, add the smallest lookup that reuses the existing roster check the file already performs, and say in your report which mechanism you used.

- [ ] **Step 5: Hide the control in the sharing dialog**

In `src/components/vitrina/VitrinaShareDialog.tsx`, read `canUseMultiplier` from `usePermissions()` and render the multiplier slider only when it is true. When false, keep the value pinned at 1 so the request body matches what the server will accept.

- [ ] **Step 6: Run tests, typecheck and lint**

Run: `npx vitest run tests/permisosMultiplicador.test.ts && npm run test:unit && npm run lint`
Expected: new tests pass; full suite green; no new lint errors.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/usePermissions.ts api/vitrina.ts src/components/vitrina/VitrinaShareDialog.tsx tests/permisosMultiplicador.test.ts
git commit -m "feat(permisos): compartir una vitrina y ponerle precio dejan de ser el mismo permiso

Quien acuña la vitrina fija el precio de venta desde que el checkout cobra
vitrinas.multiplier, así que la compuerta va en el servidor. El asesor puede
seguir compartiendo; sus vitrinas salen a x1."
```

---

### Task 5: `<CheckoutSheet>`

**Files:**

- Create: `src/components/checkout/CheckoutSheet.tsx`
- Create: `src/components/checkout/mensajesCheckout.ts`
- Test: `tests/mensajesCheckout.test.ts`

**Interfaces:**

- Consumes: `POST /api/checkout-create-order` (Task 3).
- Produces:
  - `mensajeDeRespuesta(status: number, body: unknown): { tono: 'error' | 'aviso' | 'exito'; texto: string; url?: string }`
  - `<CheckoutSheet open piezas origen onClose />` where `piezas: Array<{ sku: string; nombre: string; precioMostrado: string }>`, `origen: { tipo: 'vitrina' | 'invitacion'; token: string }`.

- [ ] **Step 1: Write the failing test**

Create `tests/mensajesCheckout.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mensajeDeRespuesta } from '../src/components/checkout/mensajesCheckout';

describe('mensajeDeRespuesta', () => {
  it('éxito: entrega la url de pago', () => {
    const r = mensajeDeRespuesta(200, {
      success: true,
      data: { checkout_url: 'https://checkout.wompi.co/p/?x=1', reused: false },
    });
    expect(r.tono).toBe('exito');
    expect(r.url).toBe('https://checkout.wompi.co/p/?x=1');
  });

  it('reused NO es un error — sigue al mismo link', () => {
    const r = mensajeDeRespuesta(200, {
      success: true,
      data: { checkout_url: 'https://checkout.wompi.co/p/?x=1', reused: true },
    });
    expect(r.tono).toBe('exito');
    expect(r.url).toBe('https://checkout.wompi.co/p/?x=1');
  });

  it('pedido guardado sin link: aviso, nunca "error"', () => {
    const r = mensajeDeRespuesta(201, {
      success: true,
      data: { order_id: 'VB-0007', checkout_url: null, pending: true },
    });
    expect(r.tono).toBe('aviso');
    expect(r.texto).toMatch(/VB-0007/);
    expect(r.url).toBeUndefined();
  });

  it('ITEM_RESERVED nombra la pieza', () => {
    const r = mensajeDeRespuesta(409, {
      success: false,
      error: 'ITEM_RESERVED',
      sku: 'C-090',
    });
    expect(r.tono).toBe('error');
    expect(r.texto).toMatch(/C-090/);
  });

  it('PRODUCT_UNAVAILABLE dice que ya se vendió', () => {
    const r = mensajeDeRespuesta(409, {
      success: false,
      error: 'PRODUCT_UNAVAILABLE',
    });
    expect(r.tono).toBe('error');
    expect(r.texto).toMatch(/vendi/i);
  });

  it('ORIGEN_INVALIDO no ofrece reintentar sin markup', () => {
    const r = mensajeDeRespuesta(409, {
      success: false,
      error: 'ORIGEN_INVALIDO',
    });
    expect(r.tono).toBe('error');
    expect(r.texto).toMatch(/enlace/i);
  });

  it('400 muestra el mensaje del campo', () => {
    const r = mensajeDeRespuesta(400, {
      success: false,
      error: 'Missing contact.celular',
    });
    expect(r.tono).toBe('error');
    expect(r.texto).toMatch(/celular/i);
  });

  it('500 es genérico y no filtra nada', () => {
    const r = mensajeDeRespuesta(500, {
      success: false,
      error: 'Internal server error',
    });
    expect(r.tono).toBe('error');
    expect(r.texto).not.toMatch(/convex|http|stack/i);
  });

  it('un cuerpo irreconocible no revienta', () => {
    expect(mensajeDeRespuesta(200, null).tono).toBe('error');
    expect(mensajeDeRespuesta(200, 'texto').tono).toBe('error');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/mensajesCheckout.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `mensajesCheckout.ts`**

Create `src/components/checkout/mensajesCheckout.ts`:

```ts
/**
 * De una respuesta del endpoint a algo que una persona entiende.
 *
 * Está separado del componente porque los estados de error son la mitad del
 * trabajo y merecen prueba propia. Dos que se rompen si nadie los piensa:
 * `reused: true` NO es un error (es el doble clic, y todo salió bien), y un
 * 201 con `checkout_url: null` significa que el PEDIDO EXISTE aunque el
 * proveedor de pago fallara — decirle «error» a alguien cuyo pedido sí quedó
 * lo empuja a pedirlo otra vez.
 */

export interface MensajeCheckout {
  tono: 'error' | 'aviso' | 'exito';
  texto: string;
  /** Sólo en éxito: a dónde mandar al cliente a pagar. */
  url?: string;
}

const GENERICO =
  'No pudimos completar el pedido. Intenta de nuevo en un momento.';

function comoObjeto(v: unknown): Record<string, unknown> | null {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

export function mensajeDeRespuesta(
  status: number,
  body: unknown,
): MensajeCheckout {
  const raiz = comoObjeto(body);
  if (!raiz) return { tono: 'error', texto: GENERICO };

  const data = comoObjeto(raiz.data) ?? raiz;
  const error = typeof raiz.error === 'string' ? raiz.error : '';

  if (status >= 200 && status < 300 && raiz.success === true) {
    const url = typeof data.checkout_url === 'string' ? data.checkout_url : '';
    if (url) return { tono: 'exito', texto: 'Te llevamos a pagar…', url };

    // El pedido quedó; sólo falta el link. Nunca «error».
    const pedido =
      typeof data.order_id === 'string' ? data.order_id : 'tu pedido';
    return {
      tono: 'aviso',
      texto: `Guardamos ${pedido}, pero no pudimos abrir el pago. Te escribimos por WhatsApp para completarlo.`,
    };
  }

  if (error === 'ITEM_RESERVED') {
    const sku =
      typeof raiz.sku === 'string' && raiz.sku ? raiz.sku : 'la pieza';
    return {
      tono: 'error',
      texto: `Alguien más está pagando ${sku} en este momento. Vuelve a intentar en unos minutos.`,
    };
  }
  if (error === 'PRODUCT_UNAVAILABLE') {
    return { tono: 'error', texto: 'Esta pieza ya se vendió.' };
  }
  if (error === 'ORIGEN_INVALIDO') {
    return {
      tono: 'error',
      texto:
        'El enlace por el que llegaste ya no es válido. Escríbenos y te ayudamos.',
    };
  }
  if (status === 400 && error) {
    return { tono: 'error', texto: error };
  }
  return { tono: 'error', texto: GENERICO };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/mensajesCheckout.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Write the component**

Create `src/components/checkout/CheckoutSheet.tsx`. Follow the repo's existing MUI v6 + design-system conventions — read `src/components/cart/AdminSelectDialog.tsx` first and match its import style, its use of `@/design-system` tokens, and its dialog structure. The component must:

- Show each piece with the price label the customer was already seeing, plus **the COP total that will actually be charged** (per the spec's §2 — Wompi collects only in COP even when the vitrina shows USD).
- Collect `celular` (required) and optional `full_name` / `email`. **Omit empty optional fields from the request body entirely — never send `null`**, which the server rejects with a 400.
- POST to `/api/checkout-create-order` with `{ contact, items, origen }`.
- Disable the submit button while in flight, so a double click cannot fire two requests.
- Render the result of `mensajeDeRespuesta`, and on `tono === 'exito'` navigate to `url`.

- [ ] **Step 6: Typecheck and run the full suite**

Run: `npm run lint && npm run test:unit`
Expected: no new lint errors; suite green.

- [ ] **Step 7: Commit**

```bash
git add src/components/checkout/ tests/mensajesCheckout.test.ts
git commit -m "feat(checkout): la hoja de pago y sus mensajes

Los estados de error son la mitad del trabajo, así que viven en un módulo
puro con pruebas: reused:true no es un error, y un 201 sin link significa que
el pedido SÍ quedó."
```

---

### Task 6: Los dos botones «Pagar»

**Files:**

- Modify: `src/pages/vitrina/PublicProductView.tsx`
- Modify: `src/pages/CartPage.tsx`

**Interfaces:**

- Consumes: `<CheckoutSheet>` (Task 5).
- Produces: nothing later tasks rely on.

- [ ] **Step 1: Add «Pagar» to the vitrina view**

In `src/pages/vitrina/PublicProductView.tsx`, next to the existing consult-by-WhatsApp button, render a «Pagar» button that opens `<CheckoutSheet>` with `origen: { tipo: 'vitrina', token: code }`.

**Show it only when the `:code` is a vitrina token, never for the stateless id-list form.** `VitrinaPage.tsx` already distinguishes them with `ID_LIST_RE`; a `/v/324-323-370` link has no record, so it has no chosen markup and must keep the WhatsApp flow. Pass a prop down rather than re-deriving the regex in two places.

- [ ] **Step 2: Add «Pagar» to the guest cart**

In `src/pages/CartPage.tsx`, alongside the existing inquiry button, render «Pagar» **only for a guest whose session carries an invitation**, opening `<CheckoutSheet>` with `origen: { tipo: 'invitacion', token: <the value of INVITATION_STORAGE_KEYS.TOKEN> }`.

Staff carts keep the current WhatsApp behavior untouched — the staff member is not the buyer, and their multiplier lives only in `localStorage` with no server record to price against.

- [ ] **Step 3: Typecheck and run the full suite**

Run: `npm run lint && npm run test:unit`
Expected: no new lint errors; suite green.

- [ ] **Step 4: Commit**

```bash
git add src/pages/vitrina/PublicProductView.tsx src/pages/CartPage.tsx
git commit -m "feat(checkout): botón Pagar en la vitrina con token y en el carrito de invitado

Las superficies sin registro —lista de ids, carrito de staff, /p/:itemId—
conservan WhatsApp: ahí no sabes a qué precio ofreciste la pieza."
```

---

### Task 7: `/pedido-confirmado/:saleId`

**Files:**

- Create: `src/pages/PedidoConfirmadoPage.tsx`
- Modify: `src/App.tsx` — la ruta pública
- Modify: `convex/sales.ts` — query pública acotada

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces: Convex query `sales.estadoPublico({ saleId: string })` returning `{ saleId, estado, totalCOP } | null`.

- [ ] **Step 1: Add the narrow public query**

`convex/sales.ts` already has a `get` query, but it is staff-gated (`isStaffSession`) and keyed by `v.id('sales')` — neither works here. Add a separate one:

```ts
/**
 * Estado de un pedido para la página de confirmación. PÚBLICA a propósito:
 * quien pagó no tiene sesión. Por eso devuelve el mínimo —estado, número y
 * total— y NUNCA el cliente, la comisión, el embajador ni los itemIds:
 * cualquiera con el link la puede llamar, y un saleId es adivinable.
 */
export const estadoPublico = query({
  args: { saleId: v.string() },
  handler: async (ctx, { saleId }) => {
    const sale = await ctx.db
      .query('sales')
      .withIndex('by_saleId', (q) => q.eq('saleId', saleId))
      .first();
    if (!sale) return null;
    return {
      saleId: sale.saleId,
      estado: sale.estado,
      totalCOP: sale.totalCOP,
    };
  },
});
```

- [ ] **Step 2: Write the page**

Create `src/pages/PedidoConfirmadoPage.tsx`. Read `src/pages/vitrina/VitrinaPage.tsx` first for how this repo reads a Convex query from a public, unauthenticated page, and follow that pattern.

The states, and the one that matters:

- `confirmada` → confirmation with the order number and total.
- `reservada` → **«Estamos confirmando tu pago»**, re-querying every few seconds. The payment is confirmed by webhook, asynchronously, so the customer routinely lands here BEFORE the webhook arrives. Showing an error to someone who just paid is the failure this page exists to avoid.
- `cancelada` → clear state plus a contact route.
- `null` (unknown saleId) → a neutral "no encontramos ese pedido", never a stack trace.

- [ ] **Step 3: Register the route**

In `src/App.tsx`, add `/pedido-confirmado/:saleId` **alongside the other public routes** (`/v/:code`, `/g/:shortCode`), not inside the authenticated tree. Whoever just paid may have no session at all. Note `src/App.tsx:1132` maintains a list of public path prefixes — add this one there too if that list gates rendering.

- [ ] **Step 4: Typecheck and run the full suite**

Run: `npm run lint && npx tsc --noEmit -p convex/tsconfig.json && npm run test:unit`
Expected: no new lint errors; typecheck 0; suite green.

- [ ] **Step 5: Commit**

```bash
git add src/pages/PedidoConfirmadoPage.tsx src/App.tsx convex/sales.ts
git commit -m "feat(checkout): la página de confirmación que hasta hoy era un 404

Los dos rieles de pago ya redirigían aquí. Trata `reservada` como
«confirmando», no como error: el webhook es asíncrono y el cliente aterriza
antes de que llegue."
```

---

## Verification checklist

- [ ] `npm run test:unit` passes, including `precioVitrina`, `permisosMultiplicador` and `mensajesCheckout`.
- [ ] `npx tsc --noEmit -p convex/tsconfig.json` exits 0.
- [ ] `npm run lint` shows no new errors beyond the 2 pre-existing in `api/cotizacion-deck.ts`.
- [ ] A checkout from a vitrina at x2.6 charges `round(precioCOP × 2.6)`, and the sale stores `precioBaseCOP` and `multiplicador`.
- [ ] A checkout carrying a garbage `origen.token` is **rejected**, not charged at base price.
- [ ] An order with no `origen` (the bot rail) still charges `precioCOP` exactly as before.
- [ ] An asesor minting a vitrina cannot set a multiplier ≠ 1, verified against the API and not only the UI.
- [ ] `/pedido-confirmado/:saleId` renders for a `reservada` sale without showing an error.

## Explicitly out of scope

- Bre-B manual transfer — **phase 4**.
- Redesigning how commission is computed — the spec flags that `totalCOP` now includes markup, so an ambassador earns on the markup too. Named, not resolved.
- Gating the ungated multiplier slider in `IOSSettingsSheet.tsx` — display only; this phase makes it irrelevant to money by never trusting the browser.
- Checkout on `/p/:itemId`, on the stateless `/v/324-323-370` form, or in a staff cart.
- Pushing `VENDIDA` to the spreadsheet — a phase-2 declared limitation.
