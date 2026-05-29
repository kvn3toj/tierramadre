/**
 * Push a Convex client's fields to GoHighLevel (the spec's `ghl-sync` helper).
 *
 * POST, `Authorization: Bearer <GHL_API_SECRET>`. Resolves the client by phone,
 * upserts the GHL contact (totals + optional tags) and links the returned
 * `ghlContactId` back onto the Convex client so future writes target it directly.
 * One-writer-per-field (golden rule #6): we push Convex-owned totals; we never
 * write GHL-owned `lead_score` from here.
 *
 * Body: { celular: string, tags?: string[] }
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withApiHandler, sendError, sendSuccess } from "./_lib/index.js";
import { convexClient, isConvexEnabled } from "./_lib/convex-client.js";
import { bearerMatches } from "./_lib/bearer.js";
import { upsertContact, type GhlConfig } from "./_lib/ghl-client.js";
import { api } from "../convex/_generated/api.js";

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

    const ghlToken = process.env.GHL_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;
    if (!ghlToken || !locationId) {
      return sendError(res, 503, "GHL credentials not configured");
    }

    const body = (req.body ?? {}) as { celular?: string; tags?: string[] };
    if (!body.celular) return sendError(res, 400, "Missing celular");

    const client = await convexClient.query(api.ghl.getClientByPhone, {
      celular: body.celular,
    });
    if (!client) return sendError(res, 404, "Client not found");

    const cfg: GhlConfig = { token: ghlToken, locationId };
    const up = await upsertContact(cfg, {
      phone: client.telefono ?? undefined,
      email: client.email ?? undefined,
      name: client.nombre,
      tags: body.tags,
      customFields: [
        {
          key: "total_comprado_cop",
          field_value: client.totalCompradoCOP ?? 0,
        },
      ],
      source: "ghl-sync-contact",
    });

    if (up.contactId) {
      await convexClient.mutation(api.ghl.linkGhlContact, {
        clientId: client._id,
        ghlContactId: up.contactId,
      });
    }

    return sendSuccess(res, { contactId: up.contactId, isNew: up.isNew });
  },
  {
    methods: ["POST", "OPTIONS"],
    requireGoogle: false,
    errorPrefix: "GhlSyncContact",
  },
);
