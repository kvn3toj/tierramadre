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
import {
  resolveProvider,
  buildPaymentLink,
  WOMPI_NOT_CONFIGURED,
  MP_NOT_CONFIGURED,
} from './_lib/checkoutLink.js';
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
    const provider = resolveProvider(process.env.PAYMENT_PROVIDER);
    if (
      provider !==
      (process.env.PAYMENT_PROVIDER ?? 'mercadopago').trim().toLowerCase()
    ) {
      console.error(
        `[GhlCreateOrder] PAYMENT_PROVIDER="${process.env.PAYMENT_PROVIDER}" no reconocido — usando "mercadopago" para el riel y para forma_pago.`,
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
      if (msg.includes('ITEM_RESERVED')) {
        // Someone else is mid-checkout on this exact stone (30-min hold).
        const sku = msg.split('ITEM_RESERVED:')[1] ?? '';
        return sendError(res, 409, 'ITEM_RESERVED', sku);
      }
      if (msg.includes('EMPTY_ITEMS')) {
        return sendError(res, 400, 'items must be a non-empty array');
      }
      throw err;
    }

    const appUrl = (process.env.APP_URL ?? DEFAULT_APP_URL)
      .trim()
      .replace(/\/$/, '');

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
      // Bookkeeping only — persisting the MP preference id must never cost
      // the customer the payment link they already have. A missing/mismatched
      // ADMIN_SYNC_TOKEN throws here (`requireServerSecret`), and letting that
      // escape uncaught would turn a perfectly good `init_point` into a 500.
      try {
        await convexClient.mutation(api.ghl.setMpPreference, {
          saleId: order.saleId,
          mpPreferenceId: link.preferenceId,
          secret: process.env.ADMIN_SYNC_TOKEN ?? '',
        });
      } catch (err) {
        console.error(
          '[GhlCreateOrder] setMpPreference failed (continuing with the link the customer already has):',
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    // `mp_url` es el campo que el workflow vivo de GHL ya lee y le manda al
    // cliente. Lleva el link de pago sea cual sea el proveedor — el nombre es
    // legado, el significado es «el link». Se conserva para no tocar el workflow.
    if (!link.checkoutUrl) {
      // Credenciales no configuradas todavía (build-and-mock) es un estado
      // distinto de que el proveedor haya fallado a media llamada: el primero
      // conserva el 200 "todo bien, sin link aún" que ya devolvía este
      // endpoint; el segundo es el 201 "el pedido quedó creado pero el link
      // reventó" con `mp_error` para diagnóstico. Perder esa distinción
      // cambiaría el código de estado que ve el bot en el caso más común
      // (variables de entorno aún no cargadas).
      const notConfigured =
        link.error === WOMPI_NOT_CONFIGURED || link.error === MP_NOT_CONFIGURED;
      if (!notConfigured) {
        console.error(
          `[GhlCreateOrder] ${provider} checkout link failed:`,
          link.error,
        );
      }
      return sendSuccess(
        res,
        {
          order_id: order.saleId,
          total_cop: order.totalCOP,
          checkout_url: null,
          mp_url: null,
          mp_pending: true,
          ...(notConfigured ? {} : { mp_error: link.error }),
        },
        notConfigured ? 200 : 201,
      );
    }
    return sendSuccess(res, {
      order_id: order.saleId,
      total_cop: order.totalCOP,
      checkout_url: link.checkoutUrl,
      mp_url: link.checkoutUrl,
    });
  },
  {
    methods: ['POST', 'OPTIONS'],
    requireGoogle: false,
    errorPrefix: 'GhlCreateOrder',
  },
);
