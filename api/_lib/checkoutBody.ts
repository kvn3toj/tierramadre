/**
 * Pure body validation for `api/checkout-create-order.ts` — the app's first
 * unauthenticated write endpoint.
 *
 * Split out after a security review (fix round 1) found a critical hole: the
 * inline item-cap check summed `Math.max(1, Math.floor(Number(qty)))` across
 * `items`, and a single non-numeric `qty` (e.g. `"x"`) turns that sum into
 * `NaN`. `NaN > MAX_ITEMS_POR_PEDIDO` is `false`, so the guard silently
 * passed — an anonymous caller could send thousands of poisoned line items
 * and burn exactly the Convex bandwidth the cap exists to ration, with NaN
 * surviving the wire into the mutation (`totalCOP: NaN`, zero real
 * itemIds, a `reservada` sale with nothing in it).
 *
 * This module is pure (no IO, no env reads, never throws) so the validation
 * that failed once can be unit-tested directly — see
 * `tests/checkoutBody.test.ts`. The caller (`checkout-create-order.ts`) must
 * call this BEFORE touching Convex; no rejection here may be preceded by a
 * mutation call.
 */

import { MAX_ITEMS_POR_PEDIDO } from '../../convex/_lib/reservas.js';

export interface CheckoutContact {
  celular: string;
  full_name?: string;
  email?: string;
}

export interface CheckoutItem {
  sku: string;
  qty: number;
}

export interface ParsedCheckoutBody {
  contact: CheckoutContact;
  items: CheckoutItem[];
  ambassador_slug?: string;
  canal_origen?: string;
  origen?: { tipo: 'vitrina' | 'invitacion'; token: string };
}

export interface CheckoutBodyRejected {
  ok: false;
  status: number;
  message: string;
}

export interface CheckoutBodyAccepted {
  ok: true;
  value: ParsedCheckoutBody;
}

export type CheckoutBodyResult = CheckoutBodyAccepted | CheckoutBodyRejected;

function reject(status: number, message: string): CheckoutBodyRejected {
  return { ok: false, status, message };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Validates and normalizes an untrusted request body. Enforces, in order:
 * 1. `contact.celular` is a non-empty string; every other contact field
 *    (plus `ambassador_slug`/`canal_origen`) must be a string when present —
 *    a non-string is rejected rather than forwarded (finding 3: forwarding a
 *    wrong-typed field to Convex fails its arg validator and rethrows a 500
 *    that leaks the deployment URL/function path to an anonymous caller).
 * 2. `items` is a non-empty array, and `items.length` is capped
 *    INDEPENDENTLY of the qty sum below — so a poisoned line further down
 *    the array can never keep an oversized array from being rejected
 *    (finding 1: the critical fix).
 * 3. every entry is an object with a non-empty string `sku` (finding 2:
 *    `items: [null]` used to throw inside the handler and surface as a 500).
 * 4. every `qty` coerces to a finite positive integer — `Number.isFinite`
 *    explicitly rejects NaN/Infinity before any comparison happens, closing
 *    the exact hole `Math.max(1, Math.floor(NaN))` opened.
 * 5. the total units (after coercion) are within `MAX_ITEMS_POR_PEDIDO`.
 */
export function parseCheckoutBody(body: unknown): CheckoutBodyResult {
  if (!isPlainObject(body)) {
    return reject(400, 'Invalid request body');
  }

  const contactRaw = body.contact;
  if (!isPlainObject(contactRaw)) {
    return reject(400, 'Missing contact.celular');
  }
  if (
    typeof contactRaw.celular !== 'string' ||
    contactRaw.celular.trim() === ''
  ) {
    return reject(400, 'Missing contact.celular');
  }
  if (
    contactRaw.full_name !== undefined &&
    typeof contactRaw.full_name !== 'string'
  ) {
    return reject(400, 'contact.full_name must be a string');
  }
  if (contactRaw.email !== undefined && typeof contactRaw.email !== 'string') {
    return reject(400, 'contact.email must be a string');
  }

  if (
    body.ambassador_slug !== undefined &&
    body.ambassador_slug !== null &&
    typeof body.ambassador_slug !== 'string'
  ) {
    return reject(400, 'ambassador_slug must be a string');
  }
  if (
    body.canal_origen !== undefined &&
    body.canal_origen !== null &&
    typeof body.canal_origen !== 'string'
  ) {
    return reject(400, 'canal_origen must be a string');
  }

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

  const itemsRaw = body.items;
  if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) {
    return reject(400, 'items must be a non-empty array');
  }
  // Independent of the qty sum below, on purpose: a huge array with a
  // poisoned qty in it must be rejected on shape alone, before any qty
  // parsing can go wrong (see the module header for the attack this closes).
  if (itemsRaw.length > MAX_ITEMS_POR_PEDIDO) {
    return reject(400, `Máximo ${MAX_ITEMS_POR_PEDIDO} piezas por pedido`);
  }

  const items: CheckoutItem[] = [];
  let unidades = 0;
  for (const raw of itemsRaw) {
    if (!isPlainObject(raw)) {
      return reject(400, 'Each item must be an object');
    }
    if (typeof raw.sku !== 'string' || raw.sku.trim() === '') {
      return reject(400, 'Each item requires a non-empty sku');
    }

    const qtyInput = raw.qty === undefined ? 1 : raw.qty;
    const qtyNum = Number(qtyInput);
    if (!Number.isFinite(qtyNum)) {
      return reject(400, `Invalid qty for sku ${raw.sku}`);
    }
    const qty = Math.floor(qtyNum);
    if (qty <= 0) {
      return reject(400, `Invalid qty for sku ${raw.sku}`);
    }

    unidades += qty;
    items.push({ sku: raw.sku, qty });
  }

  if (unidades > MAX_ITEMS_POR_PEDIDO) {
    return reject(400, `Máximo ${MAX_ITEMS_POR_PEDIDO} piezas por pedido`);
  }

  return {
    ok: true,
    value: {
      contact: {
        celular: contactRaw.celular,
        full_name: contactRaw.full_name as string | undefined,
        email: contactRaw.email as string | undefined,
      },
      items,
      ambassador_slug: body.ambassador_slug as string | undefined,
      canal_origen: body.canal_origen as string | undefined,
      origen,
    },
  };
}
