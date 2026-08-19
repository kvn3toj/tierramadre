# Wompi Payment Rail (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Wompi as a second payment gateway on the server side, mounted on the existing GHL-bot order rail, with no UI changes and no new attack surface.

**Architecture:** Mirror the existing MercadoPago rail file-for-file — pure functions with an injectable `fetchImpl`, IO confined to the Vercel handler. A customer is redirected to Wompi's hosted Web Checkout with a server-computed integrity signature; Wompi calls back to `api/wompi-webhook.ts`, which validates the event checksum, **re-fetches the real transaction from Wompi** (never trusting the webhook body), and hands off to the already-idempotent Convex `ghl.markOrderPaid`.

**Tech Stack:** TypeScript, Vercel serverless functions (Node runtime), Convex, Vitest, Node `crypto`.

**Spec:** `docs/superpowers/specs/2026-08-19-wompi-payment-rail-design.md`

## Global Constraints

- **Currency is always `COP`.** `amount-in-cents` = `totalCOP * 100`, integer-guarded.
- **Sandbox and production credentials never cross.** Sandbox = `https://sandbox.wompi.co/v1` with `pub_test_` / `prv_test_` / `test_integrity_` / `test_events_`. Production = `https://production.wompi.co/v1` with the `_prod_` set.
- **No secret is ever committed to this repo**, and the integrity secret never reaches the frontend.
- **`PAYMENT_PROVIDER` defaults to `mercadopago`** — deploying this plan must change zero behavior until that variable is flipped.
- **Deploy order is Convex first, Vercel second.** They deploy separately; new mutation args are additive and optional so the live MP webhook survives the window between them.
- **Do not touch:** the `mp*` fields on `sales`, `COLUMN_MAPS.sales`, the Sheets mirror, or the `isOverLimit` 2M gate. All are out of scope for phase 1.
- **Test style:** Vitest, `import { describe, it, expect } from "vitest"`, `environment: node`, files in `tests/*.test.ts`. Pure functions, no mocking frameworks — inject a fake `fetchImpl` where IO is needed.
- Run the full suite with `npm run test:unit`; typecheck with `npm run lint`.

---

### Task 1: Wompi signature module

The cryptographic core: the integrity signature that authenticates our checkout URL to Wompi, and the checksum that authenticates Wompi's webhook to us. Both pure, no IO.

**Files:**

- Create: `api/_lib/wompi-signature.ts`
- Test: `tests/wompiSignature.test.ts`

**Interfaces:**

- Consumes: nothing (leaf module).
- Produces:
  - `buildIntegritySignature(input: IntegrityInput, integritySecret: string): string`
  - `validateWompiChecksum(event: WompiEvent, eventsSecret: string, headerChecksum?: string): boolean`
  - `interface IntegrityInput { reference: string; amountInCents: number; currency: string; expirationTime?: string }`
  - `interface WompiEvent { event?: string; data?: unknown; signature?: { properties?: string[]; checksum?: string }; timestamp?: number }`

- [ ] **Step 1: Write the failing test**

Create `tests/wompiSignature.test.ts`. The first vector is **Wompi's own published example**, copied verbatim from https://docs.wompi.co/docs/colombia/widget-checkout-web/ — it is the authoritative proof that our concatenation order is right (already verified to match during planning):

```ts
import { describe, it, expect } from 'vitest';
import {
  buildIntegritySignature,
  validateWompiChecksum,
} from '../api/_lib/wompi-signature';

describe('buildIntegritySignature', () => {
  // Wompi's own published worked example. If this ever fails, our
  // concatenation order drifted from theirs — not a test to "fix" by
  // updating the expected hash.
  it("reproduces the vector published in Wompi's docs", () => {
    expect(
      buildIntegritySignature(
        {
          reference: 'sk8-438k4-xmxm392-sn2m',
          amountInCents: 2490000,
          currency: 'COP',
        },
        'prod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6',
      ),
    ).toBe('37c8407747e595535433ef8f6a811d853cd943046624a0ec04662b17bbf33bf5');
  });

  it('hashes reference + amount + currency + secret, in that order', () => {
    expect(
      buildIntegritySignature(
        { reference: 'VB-0042', amountInCents: 250000000, currency: 'COP' },
        'test_integrity_SECRET',
      ),
    ).toBe('f7a3d22ff514ced04652675744db04b47d0236e3c7eb4b1b25f8735d2aeb3f81');
  });

  it('inserts expirationTime before the secret when present', () => {
    expect(
      buildIntegritySignature(
        {
          reference: 'VB-0042',
          amountInCents: 250000000,
          currency: 'COP',
          expirationTime: '2026-08-20T12:00:00.000Z',
        },
        'test_integrity_SECRET',
      ),
    ).toBe('d91de041931128e02cafea4371684783a28edcb88f46db42e172fd291fc0be6f');
  });

  it('produces a different hash for a different amount (no silent collision)', () => {
    const a = buildIntegritySignature(
      { reference: 'VB-1', amountInCents: 100, currency: 'COP' },
      's',
    );
    const b = buildIntegritySignature(
      { reference: 'VB-1', amountInCents: 200, currency: 'COP' },
      's',
    );
    expect(a).not.toBe(b);
  });
});

const EVENT = {
  event: 'transaction.updated',
  data: {
    transaction: {
      id: '1234-1699',
      status: 'APPROVED',
      amount_in_cents: 250000000,
      reference: 'VB-0042',
    },
  },
  signature: {
    properties: [
      'transaction.id',
      'transaction.status',
      'transaction.amount_in_cents',
    ],
    checksum:
      '11ed594524ab8ae1c67265fa7bb09ebb0cf12f9d4a63062e50de74bd55e7aa11',
  },
  timestamp: 1755600000,
};

describe('validateWompiChecksum', () => {
  it('accepts an event whose checksum matches the events secret', () => {
    expect(validateWompiChecksum(EVENT, 'test_events_SECRET')).toBe(true);
  });

  it('accepts an uppercase checksum (Wompi sends hex uppercased)', () => {
    const upper = {
      ...EVENT,
      signature: {
        ...EVENT.signature,
        checksum: EVENT.signature.checksum.toUpperCase(),
      },
    };
    expect(validateWompiChecksum(upper, 'test_events_SECRET')).toBe(true);
  });

  it('prefers the X-Event-Checksum header when one is supplied', () => {
    const tamperedBody = {
      ...EVENT,
      signature: { ...EVENT.signature, checksum: '0'.repeat(64) },
    };
    expect(
      validateWompiChecksum(
        tamperedBody,
        'test_events_SECRET',
        EVENT.signature.checksum,
      ),
    ).toBe(true);
  });

  it('rejects a tampered amount (the attack this exists to stop)', () => {
    const tampered = {
      ...EVENT,
      data: {
        transaction: { ...EVENT.data.transaction, amount_in_cents: 1 },
      },
    };
    expect(validateWompiChecksum(tampered, 'test_events_SECRET')).toBe(false);
  });

  it('rejects the wrong events secret', () => {
    expect(validateWompiChecksum(EVENT, 'test_events_WRONG')).toBe(false);
  });

  it('returns false (never throws) on malformed input', () => {
    expect(validateWompiChecksum({}, 's')).toBe(false);
    expect(validateWompiChecksum(EVENT, '')).toBe(false);
    expect(validateWompiChecksum({ ...EVENT, timestamp: undefined }, 's')).toBe(
      false,
    );
    expect(
      validateWompiChecksum(
        { ...EVENT, signature: { properties: [], checksum: 'x' } },
        's',
      ),
    ).toBe(false);
    expect(
      validateWompiChecksum(
        {
          ...EVENT,
          signature: {
            properties: ['transaction.nonexistent'],
            checksum: 'x'.repeat(64),
          },
        },
        'test_events_SECRET',
      ),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/wompiSignature.test.ts`
Expected: FAIL — `Failed to resolve import "../api/_lib/wompi-signature"`.

- [ ] **Step 3: Write the implementation**

Create `api/_lib/wompi-signature.ts`:

```ts
/**
 * Wompi signatures — the two halves of the trust boundary.
 *
 * OUTBOUND (`buildIntegritySignature`): proves to Wompi that the amount and
 * reference in a Web Checkout URL were set by us and not edited in the
 * customer's address bar. SHA256 of
 *   <reference><amountInCents><currency>[<expirationTime>]<integritySecret>
 * The `expirationTime` segment is omitted entirely when absent. Verified
 * against the worked example published in Wompi's docs
 * (tests/wompiSignature.test.ts) — that vector is the spec.
 *
 * INBOUND (`validateWompiChecksum`): proves an incoming webhook really came
 * from Wompi. The event names, in `signature.properties`, the dot-paths whose
 * values were signed; we resolve them against `event.data` IN ORDER, append
 * `event.timestamp` and the events secret, and SHA256. Mirrors
 * `validateMpSignature`: pure, never throws, returns false on anything
 * missing or malformed, and the handler turns false into a 401.
 *
 * Both secrets are server-only and never reach the browser.
 */

import crypto from 'node:crypto';

export interface IntegrityInput {
  reference: string;
  amountInCents: number;
  currency: string;
  /** ISO8601. When present, Wompi signs it too — before the secret. */
  expirationTime?: string;
}

export interface WompiEvent {
  event?: string;
  /** Left `unknown`: resolvePath narrows it, and this accepts the handler's inline body type without an index-signature error. */
  data?: unknown;
  signature?: { properties?: string[]; checksum?: string };
  timestamp?: number;
}

const sha256Hex = (value: string): string =>
  crypto.createHash('sha256').update(value).digest('hex');

/** Build the `signature:integrity` value for a Web Checkout URL. */
export function buildIntegritySignature(
  input: IntegrityInput,
  integritySecret: string,
): string {
  const parts = [input.reference, String(input.amountInCents), input.currency];
  if (input.expirationTime) parts.push(input.expirationTime);
  parts.push(integritySecret);
  return sha256Hex(parts.join(''));
}

/** Resolve a dot-path ("transaction.status") against a nested object. */
function resolvePath(root: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === 'object'
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      root,
    );
}

/**
 * Validate a Wompi webhook against `eventsSecret`. `headerChecksum` is the
 * `X-Event-Checksum` header and takes precedence over the in-body copy — a
 * body-only check would let an attacker supply both the payload and the
 * checksum that "confirms" it.
 */
export function validateWompiChecksum(
  event: WompiEvent,
  eventsSecret: string,
  headerChecksum?: string,
): boolean {
  if (!eventsSecret) return false;

  const properties = event?.signature?.properties;
  if (!Array.isArray(properties) || properties.length === 0) return false;
  if (event.timestamp == null) return false;

  const expected = headerChecksum ?? event.signature?.checksum;
  if (!expected) return false;

  let concatenated = '';
  for (const path of properties) {
    const value = resolvePath(event.data, path);
    if (value == null) return false;
    concatenated += String(value);
  }
  concatenated += String(event.timestamp) + eventsSecret;

  // Wompi sends the checksum uppercased; digest() is lowercase.
  const computed = sha256Hex(concatenated);
  const received = expected.toLowerCase();

  // Length guard — timingSafeEqual throws on differing buffer lengths.
  if (computed.length !== received.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(received));
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/wompiSignature.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/wompi-signature.ts tests/wompiSignature.test.ts
git commit -m "feat(pagos): firma de integridad y checksum de eventos de Wompi

El vector publicado por Wompi en su documentación entra como test: si esa
aserción falla, nuestro orden de concatenación se separó del suyo."
```

---

### Task 2: Wompi checkout URL + transaction fetch

The other leaf module: building the signed redirect URL, and re-fetching a transaction from Wompi's API so the webhook never has to trust its own request body.

**Files:**

- Create: `api/_lib/wompi.ts`
- Test: `tests/wompiCheckout.test.ts`

**Interfaces:**

- Consumes: `buildIntegritySignature`, `IntegrityInput` from Task 1.
- Produces:
  - `buildCheckoutUrl(input: CheckoutInput, config: WompiConfig): string`
  - `fetchTransaction(transactionId: string, privateKey: string, baseUrl: string, fetchImpl?: FetchLike): Promise<WompiTransaction>`
  - `interface WompiConfig { publicKey: string; integritySecret: string }`
  - `interface CheckoutInput { reference: string; amountCOP: number; redirectUrl: string; customer?: { email?: string; fullName?: string; phoneNumber?: string }; expirationTime?: string }`
  - `interface WompiTransaction { id: string; status: string; reference: string; amountInCents: number; currency: string; paymentMethodType?: string }`
  - `const WOMPI_APPROVED = "APPROVED"`

- [ ] **Step 1: Write the failing test**

Create `tests/wompiCheckout.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  buildCheckoutUrl,
  fetchTransaction,
  WOMPI_APPROVED,
} from '../api/_lib/wompi';
import { buildIntegritySignature } from '../api/_lib/wompi-signature';

const CONFIG = {
  publicKey: 'pub_test_ABC',
  integritySecret: 'test_integrity_SECRET',
};

describe('buildCheckoutUrl', () => {
  it("points at Wompi's hosted checkout with COP and cents", () => {
    const url = new URL(
      buildCheckoutUrl(
        {
          reference: 'VB-0042',
          amountCOP: 2500000,
          redirectUrl: 'https://tierramadre.app/pedido-confirmado/VB-0042',
        },
        CONFIG,
      ),
    );
    expect(url.origin + url.pathname).toBe('https://checkout.wompi.co/p/');
    expect(url.searchParams.get('public-key')).toBe('pub_test_ABC');
    expect(url.searchParams.get('currency')).toBe('COP');
    expect(url.searchParams.get('amount-in-cents')).toBe('250000000');
    expect(url.searchParams.get('reference')).toBe('VB-0042');
    expect(url.searchParams.get('redirect-url')).toBe(
      'https://tierramadre.app/pedido-confirmado/VB-0042',
    );
  });

  it('signs the amount it actually sends', () => {
    const url = new URL(
      buildCheckoutUrl(
        {
          reference: 'VB-0042',
          amountCOP: 2500000,
          redirectUrl: 'https://x.co/ok',
        },
        CONFIG,
      ),
    );
    expect(url.searchParams.get('signature:integrity')).toBe(
      buildIntegritySignature(
        { reference: 'VB-0042', amountInCents: 250000000, currency: 'COP' },
        'test_integrity_SECRET',
      ),
    );
  });

  it('passes customer data through when provided', () => {
    const url = new URL(
      buildCheckoutUrl(
        {
          reference: 'VB-1',
          amountCOP: 1000,
          redirectUrl: 'https://x.co/ok',
          customer: {
            email: 'ana@example.com',
            fullName: 'Ana Ruiz',
            phoneNumber: '3001234567',
          },
        },
        CONFIG,
      ),
    );
    expect(url.searchParams.get('customer-data:email')).toBe('ana@example.com');
    expect(url.searchParams.get('customer-data:full-name')).toBe('Ana Ruiz');
    expect(url.searchParams.get('customer-data:phone-number')).toBe(
      '3001234567',
    );
  });

  it('omits customer-data keys entirely when absent', () => {
    const url = new URL(
      buildCheckoutUrl(
        { reference: 'VB-1', amountCOP: 1000, redirectUrl: 'https://x.co/ok' },
        CONFIG,
      ),
    );
    expect(url.searchParams.has('customer-data:email')).toBe(false);
  });

  it('rejects a non-integer amount rather than signing a rounded one', () => {
    expect(() =>
      buildCheckoutUrl(
        {
          reference: 'VB-1',
          amountCOP: 1000.5,
          redirectUrl: 'https://x.co/ok',
        },
        CONFIG,
      ),
    ).toThrow(/integer/i);
  });

  it('rejects a non-positive amount', () => {
    expect(() =>
      buildCheckoutUrl(
        { reference: 'VB-1', amountCOP: 0, redirectUrl: 'https://x.co/ok' },
        CONFIG,
      ),
    ).toThrow(/positive/i);
  });
});

describe('fetchTransaction', () => {
  const BODY = {
    data: {
      id: '1234-1699',
      status: 'APPROVED',
      reference: 'VB-0042',
      amount_in_cents: 250000000,
      currency: 'COP',
      payment_method_type: 'NEQUI',
    },
  };

  it("normalizes Wompi's snake_case response", async () => {
    const fake = async () => ({
      ok: true,
      status: 200,
      json: async () => BODY,
    });
    expect(
      await fetchTransaction(
        '1234-1699',
        'prv_test_X',
        'https://sandbox.wompi.co/v1',
        fake,
      ),
    ).toEqual({
      id: '1234-1699',
      status: 'APPROVED',
      reference: 'VB-0042',
      amountInCents: 250000000,
      currency: 'COP',
      paymentMethodType: 'NEQUI',
    });
  });

  it('calls the transactions endpoint with a bearer private key', async () => {
    let seenUrl = '';
    let seenAuth = '';
    const fake = async (url: string, init?: any) => {
      seenUrl = url;
      seenAuth = init?.headers?.Authorization ?? '';
      return { ok: true, status: 200, json: async () => BODY };
    };
    await fetchTransaction(
      '1234-1699',
      'prv_test_X',
      'https://sandbox.wompi.co/v1',
      fake,
    );
    expect(seenUrl).toBe('https://sandbox.wompi.co/v1/transactions/1234-1699');
    expect(seenAuth).toBe('Bearer prv_test_X');
  });

  it('throws on a non-ok response so the webhook can 500 and be retried', async () => {
    const fake = async () => ({
      ok: false,
      status: 404,
      json: async () => ({}),
    });
    await expect(
      fetchTransaction(
        'nope',
        'prv_test_X',
        'https://sandbox.wompi.co/v1',
        fake,
      ),
    ).rejects.toThrow(/404/);
  });

  it('exports the approved sentinel Wompi actually uses', () => {
    expect(WOMPI_APPROVED).toBe('APPROVED');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/wompiCheckout.test.ts`
Expected: FAIL — `Failed to resolve import "../api/_lib/wompi"`.

- [ ] **Step 3: Write the implementation**

Create `api/_lib/wompi.ts`:

```ts
/**
 * Wompi Web Checkout + transaction read.
 *
 * `buildCheckoutUrl` is the mirror of `mp-preference.ts`'s `buildPreference`:
 * pure, and the `reference` it embeds is our Convex `saleId`, exactly as MP's
 * `external_reference` is. The customer is redirected to the returned URL.
 * After payment, `api/wompi-webhook.ts` calls `fetchTransaction` to read the
 * REAL transaction from Wompi and treats only `status === "APPROVED"` as paid
 * — the webhook body is never trusted, same rule as the MP rail.
 *
 * We use the hosted Web Checkout (redirect) rather than the embedded Widget:
 * it replicates MP's `init_point` flow exactly, adds no third-party script or
 * CSP work, and behaves identically on iOS Safari. The server half — signature
 * and webhook, where the risk lives — is the same either way.
 *
 * `fetchImpl` is injectable so the whole module is unit-testable without IO.
 */

import { buildIntegritySignature } from './wompi-signature.js';

type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string> },
) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>;

const CHECKOUT_URL = 'https://checkout.wompi.co/p/';
const CURRENCY = 'COP';

/** The only Wompi transaction status that means "paid". */
export const WOMPI_APPROVED = 'APPROVED';

export interface WompiConfig {
  publicKey: string;
  integritySecret: string;
}

export interface CheckoutInput {
  /** Our Convex saleId — Wompi echoes it back on the webhook. */
  reference: string;
  /** Whole Colombian pesos; converted to cents here, once. */
  amountCOP: number;
  redirectUrl: string;
  customer?: { email?: string; fullName?: string; phoneNumber?: string };
  /** ISO8601; signed too when present. */
  expirationTime?: string;
}

export interface WompiTransaction {
  id: string;
  status: string;
  reference: string;
  amountInCents: number;
  currency: string;
  paymentMethodType?: string;
}

/**
 * Build the signed Web Checkout URL. Throws rather than signing an amount
 * Wompi would round differently than we did — a mismatch between the signed
 * amount and the charged amount is exactly what the signature exists to
 * prevent, so a bad amount must fail loudly here, not quietly there.
 */
export function buildCheckoutUrl(
  input: CheckoutInput,
  config: WompiConfig,
): string {
  if (!Number.isInteger(input.amountCOP)) {
    throw new Error(
      `Wompi amountCOP must be an integer number of pesos, got ${input.amountCOP}`,
    );
  }
  if (input.amountCOP <= 0) {
    throw new Error(`Wompi amountCOP must be positive, got ${input.amountCOP}`);
  }

  const amountInCents = input.amountCOP * 100;
  const signature = buildIntegritySignature(
    {
      reference: input.reference,
      amountInCents,
      currency: CURRENCY,
      expirationTime: input.expirationTime,
    },
    config.integritySecret,
  );

  const params = new URLSearchParams({
    'public-key': config.publicKey,
    currency: CURRENCY,
    'amount-in-cents': String(amountInCents),
    reference: input.reference,
    'signature:integrity': signature,
    'redirect-url': input.redirectUrl,
  });
  if (input.expirationTime) {
    params.set('expiration-time', input.expirationTime);
  }
  if (input.customer?.email) {
    params.set('customer-data:email', input.customer.email);
  }
  if (input.customer?.fullName) {
    params.set('customer-data:full-name', input.customer.fullName);
  }
  if (input.customer?.phoneNumber) {
    params.set('customer-data:phone-number', input.customer.phoneNumber);
  }

  return `${CHECKOUT_URL}?${params.toString()}`;
}

/**
 * Read the real transaction from Wompi. Throws on a non-ok response so the
 * webhook handler can answer 500 and let Wompi retry (up to 3 times / 24h).
 */
export async function fetchTransaction(
  transactionId: string,
  privateKey: string,
  baseUrl: string,
  fetchImpl: FetchLike = globalThis.fetch as unknown as FetchLike,
): Promise<WompiTransaction> {
  const res = await fetchImpl(`${baseUrl}/transactions/${transactionId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${privateKey}` },
  });
  if (!res.ok) {
    throw new Error(`Wompi fetchTransaction failed: ${res.status}`);
  }
  const body = await res.json();
  const t = body?.data ?? {};
  return {
    id: String(t.id),
    status: t.status,
    reference: t.reference,
    amountInCents: t.amount_in_cents,
    currency: t.currency,
    paymentMethodType: t.payment_method_type,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/wompiCheckout.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/wompi.ts tests/wompiCheckout.test.ts
git commit -m "feat(pagos): URL firmada de Web Checkout y lectura de transacción Wompi

buildCheckoutUrl lanza ante un monto no entero en vez de firmar uno
redondeado: una firma que no corresponde al monto cobrado es justo lo que
la firma existe para impedir."
```

---

### Task 3: Make the webhook truth-table provider-neutral

`decideWebhookOutcome` documents the branch semantics both webhooks share, and is imported **only by its test** — each handler inlines the branches (see `api/mp-webhook.ts:17`). It is almost provider-neutral already, except it hardcodes `type !== "payment"`. Give it an additive `actionableType` parameter defaulting to `"payment"`, so MercadoPago's behavior is bit-for-bit unchanged.

**Files:**

- Rename: `api/_lib/mpWebhookLogic.ts` → `api/_lib/webhookLogic.ts`
- Rename: `tests/mpWebhookLogic.test.ts` → `tests/webhookLogic.test.ts`
- Modify: `api/mp-webhook.ts:17` (doc comment reference only)

**Interfaces:**

- Consumes: nothing.
- Produces: `decideWebhookOutcome(input: WebhookDecisionInput): { httpStatus: number; outcome: WebhookOutcome; fanOut: boolean; reason?: string }`, where `WebhookDecisionInput` gains one optional field: `actionableType?: string` (default `"payment"`).

- [ ] **Step 1: Rename both files with git so history follows**

```bash
git mv api/_lib/mpWebhookLogic.ts api/_lib/webhookLogic.ts
git mv tests/mpWebhookLogic.test.ts tests/webhookLogic.test.ts
```

- [ ] **Step 2: Update the import in the renamed test, and add the Wompi rows**

In `tests/webhookLogic.test.ts`, change line 2 to:

```ts
import { decideWebhookOutcome } from '../api/_lib/webhookLogic';
```

Then append these cases inside the existing `describe("decideWebhookOutcome", …)` block:

```ts
it('ignores a Wompi event that is not transaction.updated', () => {
  const r = decideWebhookOutcome({
    signatureValid: true,
    actionableType: 'transaction.updated',
    type: 'nequi_token.updated',
    dataId: '1234-1699',
  });
  expect(r.httpStatus).toBe(200);
  expect(r.outcome).toBe('ignored');
  expect(r.reason).toBe('not-payment-notification');
});

it('fans out on an approved Wompi transaction', () => {
  expect(
    decideWebhookOutcome({
      signatureValid: true,
      actionableType: 'transaction.updated',
      type: 'transaction.updated',
      dataId: '1234-1699',
      paymentApproved: true,
      externalReference: 'VB-0042',
      saleUpdated: true,
    }),
  ).toEqual({ httpStatus: 200, outcome: 'fan-out', fanOut: true });
});

it("still defaults to MercadoPago's 'payment' when no actionableType is given", () => {
  const r = decideWebhookOutcome({
    signatureValid: true,
    type: 'payment',
    dataId: '1',
    paymentApproved: true,
    externalReference: 'VB-1',
    saleUpdated: true,
  });
  expect(r.fanOut).toBe(true);
});
```

- [ ] **Step 3: Run tests to verify the new Wompi rows fail**

Run: `npx vitest run tests/webhookLogic.test.ts`
Expected: FAIL — the `transaction.updated` fan-out case returns `outcome: "ignored"`, because the function still compares against the literal `"payment"`.

- [ ] **Step 4: Add the `actionableType` parameter**

In `api/_lib/webhookLogic.ts`, add the field to `WebhookDecisionInput`:

```ts
  /**
   * The notification type this provider considers actionable. MercadoPago
   * sends "payment"; Wompi sends "transaction.updated". Defaults to
   * MercadoPago's so its call sites are unchanged.
   */
  actionableType?: string;
```

and change the second branch of `decideWebhookOutcome` from `if (input.type !== "payment" || !input.dataId)` to:

```ts
  if (input.type !== (input.actionableType ?? "payment") || !input.dataId) {
```

Also update the module's doc comment: it currently says "the Mercado Pago webhook handler (api/mp-webhook.ts)" — make it read "the payment webhook handlers (api/mp-webhook.ts, api/wompi-webhook.ts)".

- [ ] **Step 5: Update the stale reference in the MP handler's doc comment**

In `api/mp-webhook.ts:17`, change `tests/mpWebhookLogic.test.ts` to `tests/webhookLogic.test.ts`.

- [ ] **Step 6: Run the full suite and typecheck**

Run: `npx vitest run tests/webhookLogic.test.ts && npm run lint`
Expected: PASS (all original cases plus 3 new), and a clean typecheck.

- [ ] **Step 7: Commit**

```bash
git add api/_lib/webhookLogic.ts tests/webhookLogic.test.ts api/mp-webhook.ts
git commit -m "refactor(pagos): la tabla de decisión del webhook deja de ser sólo de MP

actionableType es aditivo y su default es 'payment', así que el
comportamiento de MercadoPago no cambia en un solo bit."
```

---

### Task 4: Convex — provider-neutral payment fields

Generalize the payment reducer and the mutation off MercadoPago-only naming, so a Wompi payment (and later a Bre-B manual confirmation) lands in the same columns. Schema, reducer and its single call site move together so the build never goes red.

**Files:**

- Modify: `convex/schema.ts` (the `sales` table, after `mpStatus` at line 1167)
- Modify: `convex/_lib/applyPayment.ts` (whole file)
- Modify: `convex/ghl.ts:348` (`formaPago`), `convex/ghl.ts:376-404` (`markOrderPaid`)
- Test: `tests/applyPayment.test.ts` (extend)

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces:
  - `type PaymentProvider = "mercadopago" | "wompi" | "breb-manual"`
  - `applyPaymentToSale(sale: SaleLike, payment: PaymentInfo, now: string): ApplyPaymentResult`
  - `interface PaymentInfo { provider: PaymentProvider; id: string; status: string; approved: boolean }`
  - Convex mutation `ghl.markOrderPaid` gains optional args `provider`, `paymentId`, `status`, `approved`; existing `mpPaymentId` / `mpStatus` become optional.

- [ ] **Step 1: Write the failing tests**

Replace the whole of `tests/applyPayment.test.ts` with:

```ts
import { describe, it, expect } from 'vitest';
import { applyPaymentToSale } from '../convex/_lib/applyPayment';

const NOW = '2026-05-28T12:00:00.000Z';

const MP_OK = {
  provider: 'mercadopago' as const,
  id: 'mp-999',
  status: 'approved',
  approved: true,
};
const WOMPI_OK = {
  provider: 'wompi' as const,
  id: '1234-1699',
  status: 'APPROVED',
  approved: true,
};

describe('applyPaymentToSale', () => {
  it('flips a reservada sale to confirmada on an approved MP payment', () => {
    const r = applyPaymentToSale({ estado: 'reservada' }, MP_OK, NOW);
    expect(r.changed).toBe(true);
    if (r.changed) {
      expect(r.patch).toEqual({
        estado: 'confirmada',
        paidAt: NOW,
        paymentProvider: 'mercadopago',
        providerTxId: 'mp-999',
        providerStatus: 'approved',
        mpPaymentId: 'mp-999',
        mpStatus: 'approved',
      });
    }
  });

  it('flips a reservada sale to confirmada on an approved Wompi transaction', () => {
    const r = applyPaymentToSale({ estado: 'reservada' }, WOMPI_OK, NOW);
    expect(r.changed).toBe(true);
    if (r.changed) {
      expect(r.patch).toEqual({
        estado: 'confirmada',
        paidAt: NOW,
        paymentProvider: 'wompi',
        providerTxId: '1234-1699',
        providerStatus: 'APPROVED',
      });
    }
  });

  it('does NOT write mp* fields for a non-MercadoPago payment', () => {
    const r = applyPaymentToSale({ estado: 'reservada' }, WOMPI_OK, NOW);
    if (r.changed) {
      expect(r.patch).not.toHaveProperty('mpPaymentId');
      expect(r.patch).not.toHaveProperty('mpStatus');
    }
  });

  it('is idempotent: an already-confirmada sale does not change (replay guard)', () => {
    expect(applyPaymentToSale({ estado: 'confirmada' }, WOMPI_OK, NOW)).toEqual(
      { changed: false, reason: 'already-paid' },
    );
  });

  it('never revives a cancelada sale from a late webhook', () => {
    expect(applyPaymentToSale({ estado: 'cancelada' }, WOMPI_OK, NOW)).toEqual({
      changed: false,
      reason: 'cancelled',
    });
  });

  it("ignores a non-approved payment, whatever the provider's wording", () => {
    expect(
      applyPaymentToSale(
        { estado: 'reservada' },
        {
          provider: 'mercadopago',
          id: 'mp-1',
          status: 'pending',
          approved: false,
        },
        NOW,
      ),
    ).toEqual({ changed: false, reason: 'not-approved' });
    expect(
      applyPaymentToSale(
        { estado: 'reservada' },
        { provider: 'wompi', id: 'w-1', status: 'DECLINED', approved: false },
        NOW,
      ),
    ).toEqual({ changed: false, reason: 'not-approved' });
    expect(
      applyPaymentToSale(
        { estado: 'reservada' },
        { provider: 'wompi', id: 'w-1', status: 'VOIDED', approved: false },
        NOW,
      ),
    ).toEqual({ changed: false, reason: 'not-approved' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/applyPayment.test.ts`
Expected: FAIL — the reducer still reads `payment.status !== "approved"` and emits only `mpPaymentId`/`mpStatus`.

- [ ] **Step 3: Rewrite the reducer**

Replace the body of `convex/_lib/applyPayment.ts` below its header comment. Update the header's first paragraph to say "payment→sale reducer for the payment webhook paths" instead of "for the Mercado Pago webhook path", then:

```ts
export type SaleEstado = 'reservada' | 'confirmada' | 'cancelada';

/** Every rail that can mark a sale paid. `breb-manual` lands in phase 4. */
export type PaymentProvider = 'mercadopago' | 'wompi' | 'breb-manual';

export interface PaymentInfo {
  provider: PaymentProvider;
  /** The provider's payment/transaction id, as a string. */
  id: string;
  /**
   * The provider's raw status, stored verbatim for audit — "approved" in
   * MercadoPago, "APPROVED" in Wompi. Never compared here.
   */
  status: string;
  /**
   * Normalized by the adapter, because each provider spells success
   * differently. Keeping the comparison out of this reducer is what lets one
   * function serve every rail.
   */
  approved: boolean;
}

export interface SaleLike {
  estado: SaleEstado;
}

export interface SalePaymentPatch {
  estado: 'confirmada';
  paidAt: string;
  paymentProvider: PaymentProvider;
  providerTxId: string;
  providerStatus: string;
  /** Legacy MercadoPago mirror — written only for that provider. */
  mpPaymentId?: string;
  mpStatus?: string;
}

export type ApplyPaymentResult =
  | { changed: false; reason: 'not-approved' | 'already-paid' | 'cancelled' }
  | { changed: true; patch: SalePaymentPatch };

/**
 * Decide how a payment transitions a sale. `now` is injected (ISO string) to
 * keep the function pure/deterministic — the mutation passes
 * `new Date().toISOString()`.
 */
export function applyPaymentToSale(
  sale: SaleLike,
  payment: PaymentInfo,
  now: string,
): ApplyPaymentResult {
  if (!payment.approved) return { changed: false, reason: 'not-approved' };
  if (sale.estado === 'confirmada') {
    return { changed: false, reason: 'already-paid' };
  }
  if (sale.estado === 'cancelada') {
    return { changed: false, reason: 'cancelled' };
  }

  const patch: SalePaymentPatch = {
    estado: 'confirmada',
    paidAt: now,
    paymentProvider: payment.provider,
    providerTxId: payment.id,
    providerStatus: payment.status,
  };
  // Keep the historical MP columns populated so nothing that reads them
  // regresses; other providers leave them untouched.
  if (payment.provider === 'mercadopago') {
    patch.mpPaymentId = payment.id;
    patch.mpStatus = payment.status;
  }
  return { changed: true, patch };
}
```

- [ ] **Step 4: Add the three schema fields**

In `convex/schema.ts`, immediately after `mpStatus: v.optional(v.string()),` (line 1167), add:

```ts
    /**
     * Provider-neutral payment snapshot. Additive + optional like the mp*
     * fields above, so legacy Fotosíntesis sales validate untouched. NOT in
     * COLUMN_MAPS.sales — Convex-only, the Sheets mirror never sees them.
     * `paymentProvider` is 'mercadopago' | 'wompi' | 'breb-manual'.
     */
    paymentProvider: v.optional(v.string()),
    providerTxId: v.optional(v.string()),
    providerStatus: v.optional(v.string()),
```

- [ ] **Step 5: Update `markOrderPaid` with additive, deploy-skew-safe args**

In `convex/ghl.ts`, replace the `args` block of `markOrderPaid` with:

```ts
  args: {
    saleId: v.string(),
    // Legacy MercadoPago shape. Optional so the new Wompi caller can omit it,
    // and still ACCEPTED so the currently-deployed api/mp-webhook.ts keeps
    // working during the window between the Convex and Vercel deploys.
    // A follow-up commit drops these once both are live.
    mpPaymentId: v.optional(v.string()),
    mpStatus: v.optional(v.string()),
    // Provider-neutral shape.
    provider: v.optional(v.string()),
    paymentId: v.optional(v.string()),
    status: v.optional(v.string()),
    approved: v.optional(v.boolean()),
    secret: v.string(),
  },
```

and change the head of its handler — everything from `handler: async (ctx, { saleId, mpPaymentId, mpStatus, secret }) => {` down to and including the `applyPaymentToSale(...)` call — to:

```ts
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const { saleId } = args;
    const sale = await ctx.db
      .query('sales')
      .withIndex('by_saleId', (q) => q.eq('saleId', saleId))
      .first();
    if (!sale) return { updated: false as const, reason: 'sale-not-found' };

    // Resolve the two accepted arg shapes into one.
    const provider = (args.provider ?? 'mercadopago') as PaymentProvider;
    const paymentId = args.paymentId ?? args.mpPaymentId;
    const status = args.status ?? args.mpStatus;
    if (!paymentId || !status) {
      return { updated: false as const, reason: 'missing-payment' };
    }
    // Legacy callers send no `approved`; MercadoPago's word for it is
    // "approved", so derive it rather than defaulting to false and silently
    // dropping a real payment.
    const approved = args.approved ?? status === 'approved';

    const decision = applyPaymentToSale(
      { estado: sale.estado },
      { provider, id: paymentId, status, approved },
      new Date().toISOString(),
    );
```

The rest of the handler (the `if (!decision.changed)` early return, the `ctx.db.patch`, the client total, the commission insert, and the return object) is unchanged.

Add `PaymentProvider` to the existing import on `convex/ghl.ts:37`:

```ts
import { applyPaymentToSale, type PaymentProvider } from './_lib/applyPayment';
```

- [ ] **Step 6: Make `formaPago` follow the configured provider**

In `convex/ghl.ts`, `createOrder` hardcodes `formaPago: 'mercadopago'` at line 348. Add an optional arg to the mutation's `args` block, right before `secret: v.string(),`:

```ts
    forma_pago: v.optional(v.string()),
```

and change line 348 to:

```ts
      formaPago: args.forma_pago ?? 'mercadopago',
```

Note: `createOrder`'s handler destructures its args as `args`, so `args.forma_pago` is correct there. `formaPago` **is** mirrored to Sheets (`COLUMN_MAPS.sales`), and `'wompi'` is a new value in that column — nothing in `src/`, `api/` or `convex/` branches on the string, so this is safe, but it is the one field in this task the mirror will carry.

- [ ] **Step 7: Run the tests and typecheck**

Run: `npx vitest run tests/applyPayment.test.ts && npm run lint`
Expected: PASS, 6 tests, clean typecheck.

- [ ] **Step 8: Run the whole suite to catch anything that read the old shape**

Run: `npm run test:unit`
Expected: PASS. If a test fails referencing `mpPaymentId` on a Wompi path, it is asserting the old contract — update it to the new one.

- [ ] **Step 9: Commit**

```bash
git add convex/schema.ts convex/_lib/applyPayment.ts convex/ghl.ts tests/applyPayment.test.ts
git commit -m "feat(pagos): campos de pago neutrales respecto del proveedor en Convex

applyPaymentToSale recibe un 'approved' ya normalizado por el adaptador —
MercadoPago dice 'approved' y Wompi dice 'APPROVED', y sacar esa
comparación del reducer es lo que permite que una sola función sirva a los
dos rieles. markOrderPaid acepta las dos formas de argumentos para
sobrevivir la ventana entre el deploy de Convex y el de Vercel."
```

---

### Task 5: The Wompi webhook handler

Wire Tasks 1, 2 and 4 into a Vercel function that mirrors `api/mp-webhook.ts` step for step.

**Files:**

- Create: `api/wompi-webhook.ts`

**Interfaces:**

- Consumes: `validateWompiChecksum` (Task 1); `fetchTransaction`, `WOMPI_APPROVED` (Task 2); `ghl.markOrderPaid` new args (Task 4).
- Produces: `POST /api/wompi-webhook`.

- [ ] **Step 1: Write the handler**

Create `api/wompi-webhook.ts`:

```ts
/**
 * Wompi payment webhook — the Wompi twin of api/mp-webhook.ts, step for step.
 *
 * Flow:
 *   1. Validate the event checksum (WOMPI_EVENTS_SECRET) → 401 on failure.
 *   2. Ignore anything that is not `transaction.updated` (200).
 *   3. Re-fetch the real transaction from Wompi (never trust the body) → 500
 *      so Wompi retries (up to 3 times in 24h).
 *   4. Only `APPROVED` transactions with a `reference` (our saleId) proceed.
 *   5. Convex `ghl.markOrderPaid` flips the sale idempotently; a replay
 *      returns `updated:false` → no double commission, no duplicate fan-out.
 *   6. GHL fan-out is best-effort: a failure flags `pendingGhlSync` and still
 *      returns 200 (the sale is committed).
 *
 * Unlike Stripe, Wompi's checksum is computed over named properties plus the
 * timestamp — not over the raw request bytes — so the default JSON body
 * parsing is fine and no raw-body config is needed.
 *
 * The branch table is unit-tested in tests/webhookLogic.test.ts; the checksum
 * in tests/wompiSignature.test.ts.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler, sendError, sendSuccess } from './_lib/index.js';
import { convexClient, isConvexEnabled } from './_lib/convex-client.js';
import { validateWompiChecksum } from './_lib/wompi-signature.js';
import { fetchTransaction, WOMPI_APPROVED } from './_lib/wompi.js';
import {
  upsertContact,
  addTags,
  addToWorkflow,
  updateContactFields,
  type GhlConfig,
} from './_lib/ghl-client.js';
import { api } from '../convex/_generated/api.js';

const ACTIONABLE_EVENT = 'transaction.updated';

export default withApiHandler(
  async (req: VercelRequest, res: VercelResponse) => {
    const eventsSecret = process.env.WOMPI_EVENTS_SECRET;
    const privateKey = process.env.WOMPI_PRIVATE_KEY;
    const baseUrl = process.env.WOMPI_BASE_URL;

    const body = (req.body ?? {}) as {
      event?: string;
      data?: { transaction?: { id?: string } };
      signature?: { properties?: string[]; checksum?: string };
      timestamp?: number;
    };

    // 1. Checksum. The header copy wins over the in-body one.
    const headerChecksum = Array.isArray(req.headers['x-event-checksum'])
      ? req.headers['x-event-checksum'][0]
      : req.headers['x-event-checksum'];
    const valid =
      !!eventsSecret &&
      validateWompiChecksum(body, eventsSecret, headerChecksum);
    if (!valid) return sendError(res, 401, 'Invalid checksum');

    // 2. Only transaction updates are actionable.
    const transactionId = body.data?.transaction?.id
      ? String(body.data.transaction.id)
      : null;
    if (body.event !== ACTIONABLE_EVENT || !transactionId) {
      return sendSuccess(res, { ignored: true, reason: 'not-transaction' });
    }
    if (!privateKey || !baseUrl) {
      return sendError(res, 500, 'Wompi credentials not configured');
    }

    // 3. Re-fetch the real transaction — never trust the webhook body.
    let transaction: Awaited<ReturnType<typeof fetchTransaction>>;
    try {
      transaction = await fetchTransaction(transactionId, privateKey, baseUrl);
    } catch (err) {
      console.error('[WompiWebhook] fetchTransaction failed:', err);
      return sendError(res, 500, 'transaction fetch failed'); // Wompi retries
    }

    // 4. Only approved transactions carrying our saleId proceed.
    if (transaction.status !== WOMPI_APPROVED) {
      return sendSuccess(res, {
        ignored: true,
        reason: 'not-approved',
        status: transaction.status,
      });
    }
    const saleId = transaction.reference;
    if (!saleId) {
      return sendSuccess(res, { ignored: true, reason: 'no-reference' });
    }
    if (!isConvexEnabled || !convexClient) {
      return sendError(res, 503, 'Convex backend not configured');
    }

    // 5. Idempotent mark-paid.
    const result = await convexClient.mutation(api.ghl.markOrderPaid, {
      saleId,
      provider: 'wompi',
      paymentId: transaction.id,
      status: transaction.status,
      approved: true,
      secret: process.env.ADMIN_SYNC_TOKEN ?? '',
    });
    if (!result.updated) {
      return sendSuccess(res, {
        ok: true,
        alreadyProcessed: true,
        reason: result.reason,
      });
    }

    // 6. Best-effort GHL fan-out (sale already committed).
    const ghlToken = process.env.GHL_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;
    const workflowId = process.env.WF_POSTVENTA_ID;
    if (ghlToken && locationId) {
      try {
        const cfg: GhlConfig = { token: ghlToken, locationId };
        let contactId = result.ghlContactId ?? undefined;
        if (!contactId && (result.clientPhone || result.clientEmail)) {
          const up = await upsertContact(cfg, {
            phone: result.clientPhone ?? undefined,
            email: result.clientEmail ?? undefined,
            name: result.clientName ?? undefined,
            source: 'wompi-webhook',
          });
          contactId = up.contactId;
          if (contactId) {
            await convexClient.mutation(api.ghl.linkGhlContact, {
              clientId: result.clientId,
              ghlContactId: contactId,
              secret: process.env.ADMIN_SYNC_TOKEN ?? '',
            });
          }
        }
        if (contactId) {
          await updateContactFields(cfg, contactId, [
            { key: 'total_comprado_cop', field_value: result.totalCOP },
            {
              key: 'ultima_compra_fecha',
              field_value: new Date().toISOString(),
            },
          ]);
          await addTags(cfg, contactId, ['cliente-pago-confirmado']);
          if (workflowId) await addToWorkflow(cfg, contactId, workflowId);
        }
      } catch (err) {
        console.error('[WompiWebhook] GHL fan-out failed (will retry):', err);
        await convexClient.mutation(api.ghl.flagGhlSyncPending, {
          saleId,
          pending: true,
          secret: process.env.ADMIN_SYNC_TOKEN ?? '',
        });
      }
    }

    return sendSuccess(res, { ok: true, saleId, processed: true });
  },
  {
    // Wompi posts the webhook; no preflight/bearer. The checksum is the auth.
    methods: ['POST'],
    requireGoogle: false,
    errorPrefix: 'WompiWebhook',
  },
);
```

- [ ] **Step 2: Typecheck**

Run: `npm run lint`
Expected: clean. (`npm run lint` covers `api/tsconfig.json` as well as the app.)

- [ ] **Step 3: Run the full suite**

Run: `npm run test:unit`
Expected: PASS — nothing should regress; this task adds a handler, not new pure logic.

- [ ] **Step 4: Commit**

```bash
git add api/wompi-webhook.ts
git commit -m "feat(pagos): endpoint del webhook de Wompi

Reconsulta la transacción real contra Wompi en vez de creerle al cuerpo de
la notificación, igual que el riel de MercadoPago. El checksum de Wompi se
calcula sobre propiedades nombradas más el timestamp, no sobre los bytes
crudos, así que no hace falta configuración de raw body."
```

---

### Task 6: Route the order rail through the configured provider

Make `api/ghl-create-order.ts` build a Wompi checkout URL when `PAYMENT_PROVIDER=wompi`, and keep MercadoPago as the default so deploying this changes nothing until the variable is flipped.

**Files:**
- Modify: `api/ghl-create-order.ts` (imports, and the block from `const appUrl` to the end of the handler)

**Interfaces:**
- Consumes: `buildCheckoutUrl`, `WompiConfig` (Task 2); `ghl.createOrder`'s new optional `forma_pago` arg (Task 4).
- Produces: `POST /api/ghl-create-order` response gains a provider-neutral `checkout_url`.

- [ ] **Step 1: Add the import**

In `api/ghl-create-order.ts`, below the existing `mp-preference.js` import, add:

```ts
import { buildCheckoutUrl } from './_lib/wompi.js';
```

- [ ] **Step 2: Pass the provider into `createOrder` so `formaPago` matches reality**

Near the top of the handler, before the `convexClient.mutation(api.ghl.createOrder, …)` call, add:

```ts
    // 'mercadopago' unless explicitly switched — deploying this file must not
    // change behavior on its own.
    const provider = (process.env.PAYMENT_PROVIDER ?? 'mercadopago')
      .trim()
      .toLowerCase();
```

and add one line to the mutation's argument object, right before `secret:`:

```ts
        forma_pago: provider,
```

- [ ] **Step 3: Branch to Wompi before the MercadoPago block**

Immediately after the existing `const appUrl = …` assignment and **before** `const accessToken = process.env.MP_ACCESS_TOKEN;`, insert:

```ts
    if (provider === 'wompi') {
      const publicKey = process.env.WOMPI_PUBLIC_KEY;
      const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;

      // Credentials not wired yet → return the order, no link, same graceful
      // shape the MercadoPago branch uses below.
      if (!publicKey || !integritySecret) {
        return sendSuccess(res, {
          order_id: order.saleId,
          total_cop: order.totalCOP,
          checkout_url: null,
          mp_url: null,
          mp_pending: true,
        });
      }

      // The sale row already exists in Convex at this point, so a failure here
      // must not surface as an opaque crash and lose the order.
      try {
        const checkoutUrl = buildCheckoutUrl(
          {
            reference: order.saleId,
            amountCOP: order.totalCOP,
            redirectUrl: `${appUrl}/pedido-confirmado/${order.saleId}`,
            customer: {
              email: body.contact.email,
              fullName: body.contact.full_name,
              phoneNumber: body.contact.celular,
            },
          },
          { publicKey, integritySecret },
        );
        return sendSuccess(res, {
          order_id: order.saleId,
          total_cop: order.totalCOP,
          checkout_url: checkoutUrl,
          // `mp_url` is the field the live GHL workflow already reads and
          // sends to the customer. It carries whatever link this order should
          // be paid with, whoever the provider is — the name is legacy, the
          // meaning is "the pay link". Kept so the workflow needs no edit.
          mp_url: checkoutUrl,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[GhlCreateOrder] Wompi checkout URL failed:', msg);
        return sendSuccess(
          res,
          {
            order_id: order.saleId,
            total_cop: order.totalCOP,
            checkout_url: null,
            mp_url: null,
            mp_pending: true,
            mp_error: msg,
          },
          201,
        );
      }
    }
```

- [ ] **Step 4: Also return `checkout_url` from the MercadoPago branch**

So callers can migrate to the neutral field name. In the existing success return, change:

```ts
      return sendSuccess(res, {
        order_id: order.saleId,
        total_cop: order.totalCOP,
        mp_url: created.init_point,
      });
```

to:

```ts
      return sendSuccess(res, {
        order_id: order.saleId,
        total_cop: order.totalCOP,
        checkout_url: created.init_point,
        mp_url: created.init_point,
      });
```

- [ ] **Step 5: Update the file's header comment**

Its second paragraph currently promises a Mercado Pago preference unconditionally. Replace the sentence beginning "then creates a Mercado Pago preference" with:

```
 * then builds a payment link with the provider named by `PAYMENT_PROVIDER`
 * (`mercadopago` by default, or `wompi`) whose reference/external_reference is
 * the saleId. Returns `{ order_id, total_cop, checkout_url }`, plus `mp_url`
 * as a legacy alias of the same link for the GHL workflow that reads it.
```

- [ ] **Step 6: Typecheck and run the suite**

Run: `npm run lint && npm run test:unit`
Expected: both clean.

- [ ] **Step 7: Verify the default really is inert**

Confirm by reading the diff that with `PAYMENT_PROVIDER` unset, the only behavioral change is the extra `checkout_url` key in the response and `forma_pago: 'mercadopago'` (which resolves to the same literal that was hardcoded before).

Run: `git diff --stat`
Expected: only `api/ghl-create-order.ts` modified.

- [ ] **Step 8: Commit**

```bash
git add api/ghl-create-order.ts
git commit -m "feat(pagos): el rail de órdenes elige proveedor por PAYMENT_PROVIDER

Default 'mercadopago', así que este deploy no cambia comportamiento hasta
que se cambie la variable. mp_url se conserva como alias del link de pago
para que el workflow de GHL que ya lo lee no necesite tocarse."
```

---

### Task 7: Sandbox end-to-end verification and documentation

Nothing above proves money moves. This task does, in Wompi's **sandbox**, and resolves the one question the spec left open: whether Wompi accepts a repeated `reference`.

**Files:**
- Create: `docs/wompi-setup.md`
- Modify: `docs/superpowers/specs/2026-08-19-wompi-payment-rail-design.md` (record the reference-uniqueness answer)

**Interfaces:**
- Consumes: everything from Tasks 1-6.
- Produces: a verified rail and a runbook for the production cutover.

- [ ] **Step 1: Configure sandbox credentials in Vercel**

In the Vercel dashboard for `tierra-madre-studio`, Production environment, add these marked **Sensitive**, using the **sandbox** (`test_`) values:

| Variable | Sandbox value |
| --- | --- |
| `WOMPI_PUBLIC_KEY` | `pub_test_…` |
| `WOMPI_PRIVATE_KEY` | `prv_test_…` |
| `WOMPI_INTEGRITY_SECRET` | `test_integrity_…` |
| `WOMPI_EVENTS_SECRET` | `test_events_…` |
| `WOMPI_BASE_URL` | `https://sandbox.wompi.co/v1` |
| `PAYMENT_PROVIDER` | `wompi` |

Never mix a `test_` key with the production base URL or vice versa — Wompi rejects the pairing by design.

- [ ] **Step 2: Deploy Convex first, then Vercel**

```bash
npx convex deploy
```

Then push the branch and let Vercel deploy. **This order matters:** `markOrderPaid`'s new args must exist in Convex before any Vercel function sends them, and the old args stay accepted so the currently-live MP webhook survives the gap.

Verify the function signature landed before deploying Vercel:

```bash
npx convex function-spec --prod | grep -A2 markOrderPaid
```

Expected: the arg list includes `provider`, `paymentId`, `status`, `approved`.

- [ ] **Step 3: Register the webhook in Wompi**

In the Wompi dashboard → sandbox environment → webhook/events URL, set:

```
https://tierramadre.app/api/wompi-webhook
```

- [ ] **Step 4: Create a test order**

Requires a product in Convex `productInventory` with `estado: 'DISPONIBLE'` and a `precioCOP`, and the `GHL_API_SECRET` value.

```bash
curl -sS -X POST https://tierramadre.app/api/ghl-create-order \
  -H "Authorization: Bearer $GHL_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"contact":{"celular":"3001234567","full_name":"Prueba Wompi","email":"prueba@example.com"},"items":[{"sku":"<ITEM_ID_DISPONIBLE>","qty":1}]}' | jq
```

Expected: `{"order_id":"VB-…","total_cop":…,"checkout_url":"https://checkout.wompi.co/p/?…"}`.

- [ ] **Step 5: Pay it with a Wompi test card**

Open `checkout_url` in a browser and complete the payment using the test data from https://docs.wompi.co/docs/en/datos-de-prueba-en-sandbox. Confirm the browser lands on `/pedido-confirmado/<saleId>`.

**Expect a 404 on that redirect** — the route does not exist yet and is phase 3's job. The payment itself is unaffected; the webhook is what confirms the sale.

- [ ] **Step 6: Verify the sale landed correctly**

In the Convex dashboard, find the sale by `saleId` and confirm:

- `estado` = `confirmada`
- `paymentProvider` = `wompi`, `providerTxId` = the Wompi transaction id, `providerStatus` = `APPROVED`
- `paidAt` is set
- `mpPaymentId` and `mpStatus` are **absent** (a Wompi payment must not write MP's columns)
- exactly **one** row in `commissions` for this `saleId` (only if the order carried an `ambassador_slug`)

- [ ] **Step 7: Replay the webhook and confirm idempotency**

Use the **integration debugger** in the Wompi dashboard to inspect the event that was sent and re-send it.

Expected: HTTP 200 with `{"alreadyProcessed":true,"reason":"already-paid"}`, and **still exactly one** row in `commissions`. This is the single most important assertion in the task — a second commission row here means the idempotency guard is broken.

- [ ] **Step 8: Answer the open reference-uniqueness question**

Create a second order for the same `saleId` reference by re-running Step 4's curl and noting whether Wompi's checkout accepts a `reference` it has already seen (it will, if it does not error on load), then attempting a second payment against the first order's `checkout_url`.

Record the result in the spec under the `reference` = `saleId` paragraph, replacing the "**Esto se verifica en sandbox…**" sentence with what actually happened. If Wompi **rejects** a duplicate reference, implement the documented fallback: `reference` becomes `${saleId}~${n}`, `n` is persisted on the sale, and `api/wompi-webhook.ts` recovers the saleId with `transaction.reference.split('~')[0]` before calling `markOrderPaid`.

- [ ] **Step 9: Write the setup runbook**

Create `docs/wompi-setup.md`, modeled on the existing `docs/mercadopago-setup-and-swap.md`, covering: the four credential types and where they live in the Wompi dashboard; the sandbox↔production variable table from Step 1; the webhook URL; the Convex-then-Vercel deploy order and why; and the production cutover checklist (swap the four `test_` values for `prod_`, set `WOMPI_BASE_URL` to `https://production.wompi.co/v1`, re-register the webhook in the production environment, redeploy, and verify with one real low-value payment). State explicitly that no secret is copied into the repo.

Also record the finding that **Wompi does not support Bre-B for collecting payments** — only for dispersions, and those marked "Próximamente" — so the next person does not go looking for a setting that does not exist.

- [ ] **Step 10: Commit**

```bash
git add docs/wompi-setup.md docs/superpowers/specs/2026-08-19-wompi-payment-rail-design.md
git commit -m "docs(pagos): runbook de Wompi y resultado de la verificación en sandbox

Deja asentado el orden de deploy (Convex antes que Vercel), el resultado
real de la pregunta de unicidad de 'reference', y que Wompi no cobra por
Bre-B — para que nadie vuelva a buscar una opción que no existe."
```

---

## Verification checklist

Phase 1 is done when all of these hold:

- [ ] `npm run test:unit` passes, including the Wompi vector published in Wompi's own docs.
- [ ] `npm run lint` is clean.
- [ ] A sandbox payment moves a sale from `reservada` to `confirmada` with `paymentProvider: 'wompi'`.
- [ ] A replayed webhook returns `alreadyProcessed` and creates no second commission.
- [ ] `mp*` columns are untouched by a Wompi payment.
- [ ] With `PAYMENT_PROVIDER` unset, the MercadoPago rail behaves exactly as before.
- [ ] No secret appears anywhere in the repo (`git log -p | grep -iE 'prv_|test_integrity_|prod_integrity_|test_events_|prod_events_'` finds nothing).

## Explicitly out of scope

Deferred to later phases by the spec — do not build them here:

- Inventory reservation / the double-sell race (`convex/ghl.ts:304`) — **phase 2**, and a hard prerequisite for any public Pay button.
- The unauthenticated `api/checkout-create-order.ts` endpoint — **phase 2**.
- Any UI, including the missing `/pedido-confirmado/:saleId` route — **phase 3**.
- Bre-B direct transfer with manual staff confirmation — **phase 4**.
- Removing the 2M gate (`isOverLimit`, `convex/ghl.ts:312`) — decided in **phase 3**.
- Dropping the legacy `mpPaymentId`/`mpStatus` args from `markOrderPaid` — a follow-up commit once both deploys are live.
