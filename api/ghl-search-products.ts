/**
 * GHL bot → product search (the spec's `search-products` Edge Function).
 *
 * POST, authenticated by `Authorization: Bearer <GHL_API_SECRET>`. The GHL
 * Agent Studio "API tool" calls this during a conversation; it reads the REAL
 * Convex catalog (productInventory) and returns up to 3 published, available,
 * in-budget products with a deep `web_link` into the storefront.
 *
 * Body: { intent?: { categoria? }, presupuesto?, ocasion?, ciudad?, contactId? }
 * 200:  { success: true, productos: [{ sku, nombre, descripcion_corta, precio_cop, foto_url, web_link, certificado_url }],
 *         vitrina_link }  // combined /v/{id1}-{id2}-{id3} gallery of all recommendations (null if none)
 *
 * `contactId` (send `{{contact.id}}` in the workflow's webhook body) is
 * embedded as `?cid=` on `web_link`/`vitrina_link` — see convex/ghl.ts
 * `searchProducts` and /api/vitrina-select for why: it lets a client's
 * in-page product pick write straight back to THIS contact in GHL, instead
 * of relying on the bot to parse a free-text WhatsApp reply.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withApiHandler, sendError, sendSuccess } from "./_lib/index.js";
import { convexClient, isConvexEnabled } from "./_lib/convex-client.js";
import { bearerMatches } from "./_lib/bearer.js";
import { parsePresupuestoCOP, parsePriceTier } from "./_lib/parseBudget.js";
import { api } from "../convex/_generated/api.js";

const DEFAULT_APP_URL = "https://tierra-madre-studio.vercel.app";

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

    const body = (req.body ?? {}) as {
      intent?: { categoria?: string };
      // GHL merge tags render as strings; accept both and coerce below.
      presupuesto?: number | string;
      ocasion?: string;
      ciudad?: string;
      contactId?: string;
      // Optional explicit qualitative price hint; otherwise inferred from a
      // non-numeric `presupuesto` string ("precio moderado" → "moderado").
      priceTier?: string;
    };
    const baseUrl = (process.env.APP_URL ?? DEFAULT_APP_URL).trim();
    const contactId =
      typeof body.contactId === "string" && body.contactId.trim()
        ? body.contactId.trim()
        : undefined;

    const presupuesto = parsePresupuestoCOP(body.presupuesto);
    // A numeric budget is the stronger signal — only look for a qualitative
    // tier when none was parsed. Prefer an explicit `priceTier`, else read it
    // out of the free-text `presupuesto` the client actually typed.
    const priceTier = presupuesto
      ? undefined
      : (parsePriceTier(body.priceTier) ?? parsePriceTier(body.presupuesto));

    const result = await convexClient.query(api.ghl.searchProducts, {
      categoria: body.intent?.categoria,
      presupuesto,
      ocasion: body.ocasion,
      ciudad: body.ciudad,
      baseUrl,
      contactId,
      priceTier,
    });
    return sendSuccess(res, result);
  },
  {
    methods: ["POST", "OPTIONS"],
    requireGoogle: false,
    errorPrefix: "GhlSearchProducts",
  },
);
