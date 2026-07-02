/**
 * Web/bot → create order (the spec's `create-order` Edge Function).
 *
 * POST, `Authorization: Bearer <GHL_API_SECRET>`. Validates the body, defers the
 * ≤2M gate + price reload + sale creation to Convex `ghl.createOrder` (which
 * throws `OVER_LIMIT_2M` → 409 handoff), then creates a Mercado Pago preference
 * whose `notification_url` is this app's `api/mp-webhook` and `external_reference`
 * is the saleId. Returns `{ order_id, mp_url }`.
 *
 * If `MP_ACCESS_TOKEN` is not yet configured (build-and-mock scope), the order is
 * still created and returned with `mp_url: null, mp_pending: true` so the flow is
 * verifiable before live payment wiring.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withApiHandler, sendError, sendSuccess } from "./_lib/index.js";
import { convexClient, isConvexEnabled } from "./_lib/convex-client.js";
import { bearerMatches } from "./_lib/bearer.js";
import { buildPreference, createPreference } from "./_lib/mp-preference.js";
import { api } from "../convex/_generated/api.js";

const DEFAULT_APP_URL = "https://tierra-madre-studio.vercel.app";

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
      return sendError(res, 500, "GHL_API_SECRET not configured on server");
    }
    if (
      !bearerMatches(req.headers["authorization"], process.env.GHL_API_SECRET)
    ) {
      return sendError(res, 401, "Unauthorized");
    }
    if (!isConvexEnabled || !convexClient) {
      return sendError(res, 503, "Convex backend not configured");
    }

    const body = (req.body ?? {}) as OrderBody;
    if (!body.contact?.celular) {
      return sendError(res, 400, "Missing contact.celular");
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return sendError(res, 400, "items must be a non-empty array");
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
          sku: String(i.sku ?? ""),
          qty: Number(i.qty ?? 1),
        })),
        promotion_code: body.promotion_code ?? undefined,
        shipping_address: body.shipping_address ?? undefined,
        ambassador_slug: body.ambassador_slug ?? undefined,
        canal_origen: body.canal_origen ?? undefined,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("OVER_LIMIT_2M")) {
        // ≤2M gate → hand off to a human asesor (golden rule #3).
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res
          .status(409)
          .json({ success: false, error: "OVER_LIMIT_2M", handoff: true });
      }
      if (msg.includes("PRODUCT_NOT_FOUND") || msg.includes("NOT_AVAILABLE")) {
        return sendError(res, 409, "PRODUCT_UNAVAILABLE", msg);
      }
      if (msg.includes("EMPTY_ITEMS")) {
        return sendError(res, 400, "items must be a non-empty array");
      }
      throw err;
    }

    const appUrl = (process.env.APP_URL ?? DEFAULT_APP_URL)
      .trim()
      .replace(/\/$/, "");
    const accessToken = process.env.MP_ACCESS_TOKEN;

    // Build-and-mock scope: no live MP token yet → return the order, no link.
    if (!accessToken) {
      return sendSuccess(res, {
        order_id: order.saleId,
        total_cop: order.totalCOP,
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
      });

      return sendSuccess(res, {
        order_id: order.saleId,
        total_cop: order.totalCOP,
        mp_url: created.init_point,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[GhlCreateOrder] Mercado Pago preference failed:", msg);
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
    methods: ["POST", "OPTIONS"],
    requireGoogle: false,
    errorPrefix: "GhlCreateOrder",
  },
);
