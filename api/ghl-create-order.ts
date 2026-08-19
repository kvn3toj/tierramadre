/**
 * Web/bot → create order (the spec's `create-order` Edge Function).
 *
 * POST, `Authorization: Bearer <GHL_API_SECRET>`. Validates the body, defers the
 * ≤2M gate + price reload + sale creation to Convex `ghl.createOrder` (which
 * throws `OVER_LIMIT_2M` → 409 handoff), then builds a payment link with the
 * provider named by `PAYMENT_PROVIDER` (`mercadopago` by default, or `wompi`)
 * whose reference/external_reference is the saleId. Returns
 * `{ order_id, total_cop, checkout_url }`, plus `mp_url` as a legacy alias of
 * the same link for the GHL workflow that reads it.
 *
 * If `MP_ACCESS_TOKEN` is not yet configured (build-and-mock scope), the order is
 * still created and returned with `mp_url: null, mp_pending: true` so the flow is
 * verifiable before live payment wiring.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ConvexError } from 'convex/values';
import { withApiHandler, sendError, sendSuccess } from './_lib/index.js';
import { convexClient, isConvexEnabled } from './_lib/convex-client.js';
import { bearerMatches } from './_lib/bearer.js';
import { buildPreference, createPreference } from './_lib/mp-preference.js';
import { buildCheckoutUrl } from './_lib/wompi.js';
import { api } from '../convex/_generated/api.js';

const DEFAULT_APP_URL = 'https://tierra-madre-studio.vercel.app';

interface OrderBody {
  contact?: { celular?: string; full_name?: string; email?: string };
  items?: Array<{ sku?: string; qty?: number }>;
  promotion_code?: string | null;
  shipping_address?: {
    ciudad?: string;
    direccion?: string;
    codigoPostal?: string;
  };
  ambassador_slug?: string | null;
  canal_origen?: string | null;
}

export default withApiHandler(
  async (req: VercelRequest, res: VercelResponse) => {
    if (!process.env.GHL_API_SECRET) {
      return sendError(res, 500, 'GHL_API_SECRET not configured on server');
    }
    if (
      !bearerMatches(req.headers['authorization'], process.env.GHL_API_SECRET)
    ) {
      return sendError(res, 401, 'Unauthorized');
    }
    if (!isConvexEnabled || !convexClient) {
      return sendError(res, 503, 'Convex backend not configured');
    }

    const body = (req.body ?? {}) as OrderBody;
    if (!body.contact?.celular) {
      return sendError(res, 400, 'Missing contact.celular');
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return sendError(res, 400, 'items must be a non-empty array');
    }

    // 'mercadopago' unless explicitly switched — deploying this file must not
    // change behavior on its own. A typo (e.g. "wompy") must never fall
    // through to the MercadoPago branch while still stamping the junk value
    // into Convex/the Sheets mirror as `forma_pago` — that would make the
    // operator believe the switch happened when it silently didn't, AND
    // pollute the mirror. So validate against the known allowlist and fall
    // back to 'mercadopago' for BOTH the branch selection and the value sent
    // to Convex on anything unrecognized.
    const KNOWN_PAYMENT_PROVIDERS = ['mercadopago', 'wompi'] as const;
    const rawProvider = (process.env.PAYMENT_PROVIDER ?? 'mercadopago')
      .trim()
      .toLowerCase();
    let provider: (typeof KNOWN_PAYMENT_PROVIDERS)[number] = 'mercadopago';
    if ((KNOWN_PAYMENT_PROVIDERS as readonly string[]).includes(rawProvider)) {
      provider = rawProvider as (typeof KNOWN_PAYMENT_PROVIDERS)[number];
    } else {
      console.error(
        `[GhlCreateOrder] Unknown PAYMENT_PROVIDER="${rawProvider}" — falling back to "mercadopago" for both the branch and forma_pago.`,
      );
    }

    let order: { saleId: string; totalCOP: number };
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
        promotion_code: body.promotion_code ?? undefined,
        shipping_address: body.shipping_address ?? undefined,
        ambassador_slug: body.ambassador_slug ?? undefined,
        canal_origen: body.canal_origen ?? undefined,
        forma_pago: provider,
        secret: process.env.ADMIN_SYNC_TOKEN ?? '',
      });
    } catch (err) {
      // Convex sanitizes plain `Error` throws to a generic "Server Error" for
      // production HTTP clients; only ConvexError's `.data` survives intact.
      const msg =
        err instanceof ConvexError
          ? typeof err.data === 'string'
            ? err.data
            : String(err.data)
          : err instanceof Error
            ? err.message
            : String(err);
      if (msg.includes('OVER_LIMIT_2M')) {
        // ≤2M gate → hand off to a human asesor (golden rule #3).
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res
          .status(409)
          .json({ success: false, error: 'OVER_LIMIT_2M', handoff: true });
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

    const accessToken = process.env.MP_ACCESS_TOKEN;

    // Build-and-mock scope: no live MP token yet → return the order, no link.
    if (!accessToken) {
      return sendSuccess(res, {
        order_id: order.saleId,
        total_cop: order.totalCOP,
        checkout_url: null,
        mp_url: null,
        mp_pending: true,
      });
    }

    const pref = buildPreference({
      items: [
        {
          title: `Pedido ${order.saleId} · Tierra Madre`,
          quantity: 1,
          unit_price: order.totalCOP,
        },
      ],
      payer: {
        name: body.contact.full_name,
        email: body.contact.email,
        phone: { number: body.contact.celular },
      },
      orderId: order.saleId,
      notificationUrl: `${appUrl}/api/mp-webhook`,
      backUrls: { success: `${appUrl}/pedido-confirmado/${order.saleId}` },
    });
    // The order (sale) row already exists in Convex at this point — a failure
    // here must NOT surface as an opaque crash. Return the order with
    // mp_pending so the caller (GHL workflow) can react gracefully and the
    // sale can be retried/linked to a preference later, instead of losing it.
    try {
      const created = await createPreference(pref, accessToken);
      await convexClient.mutation(api.ghl.setMpPreference, {
        saleId: order.saleId,
        mpPreferenceId: created.id,
        secret: process.env.ADMIN_SYNC_TOKEN ?? '',
      });

      return sendSuccess(res, {
        order_id: order.saleId,
        total_cop: order.totalCOP,
        checkout_url: created.init_point,
        mp_url: created.init_point,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[GhlCreateOrder] Mercado Pago preference failed:', msg);
      return sendSuccess(
        res,
        {
          order_id: order.saleId,
          total_cop: order.totalCOP,
          mp_url: null,
          mp_pending: true,
          mp_error: msg,
        },
        201,
      );
    }
  },
  {
    methods: ['POST', 'OPTIONS'],
    requireGoogle: false,
    errorPrefix: 'GhlCreateOrder',
  },
);
