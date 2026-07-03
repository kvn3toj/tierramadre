/**
 * /api/vitrina — mint a public "Vitrina" client-share link (staff only).
 *
 * POST, authenticated by the caller's Google ID token
 * (`Authorization: Bearer <google-id-token>`). We verify it server-side with
 * google-auth-library (same pattern as api/fotosintesis-ai) to confirm a real,
 * signed-in Google user, then call the Convex `vitrinas.create` mutation with
 * the server-only `VITRINA_SHARED_SECRET`. Because the Convex deployment URL is
 * public (and the app has no Convex-native auth), that secret is what makes the
 * mutation reachable ONLY through this proxy — mirroring the trusted-proxy model
 * the invitation flow uses, plus the authorization gate invitations lack.
 *
 * Body: { itemIds:number[], currency:'COP'|'USD', multiplier:number, senderSlug?:string }
 * 200:  { success:true, token:string }
 * 401:  not signed in / invalid or expired Google token
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withApiHandler, sendError, sendSuccess } from "./_lib/index.js";
import { convexClient, isConvexEnabled } from "./_lib/convex-client.js";
import { extractBearer } from "./_lib/bearer.js";
import { api } from "../convex/_generated/api.js";

/** Verify the caller's Google ID token → returns the verified email, or null. */
async function verifyGoogleEmail(
  authHeader?: string | string[],
): Promise<string | null> {
  const token = extractBearer(authHeader);
  if (!token) return null;
  const audiences = [
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.VITE_GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_ID,
  ].filter((a): a is string => !!a && a.trim().length > 0);
  if (audiences.length === 0) return null;
  try {
    const { OAuth2Client } = await import("google-auth-library");
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: audiences,
    });
    const payload = ticket.getPayload();
    return payload?.email && payload.email_verified
      ? payload.email.toLowerCase().trim()
      : null;
  } catch {
    // Invalid or expired token — treat as unauthenticated.
    return null;
  }
}

export default withApiHandler(
  async (req: VercelRequest, res: VercelResponse) => {
    const secret = process.env.VITRINA_SHARED_SECRET;
    if (!secret) {
      return sendError(
        res,
        500,
        "VITRINA_SHARED_SECRET not configured on server",
      );
    }
    if (!isConvexEnabled || !convexClient) {
      return sendError(res, 503, "Convex backend not configured");
    }

    const email = await verifyGoogleEmail(req.headers["authorization"]);
    if (!email) {
      return sendError(res, 401, "Inicia sesión para generar un enlace.");
    }

    const body = (req.body ?? {}) as {
      itemIds?: unknown;
      currency?: unknown;
      multiplier?: unknown;
      senderSlug?: unknown;
    };

    const itemIds = Array.isArray(body.itemIds)
      ? Array.from(
          new Set(
            body.itemIds
              .map((n) => Number(n))
              .filter((n) => Number.isFinite(n) && n > 0),
          ),
        )
      : [];
    if (itemIds.length === 0) {
      return sendError(res, 400, "itemIds requerido");
    }
    if (itemIds.length > 50) {
      return sendError(res, 400, "Demasiadas piezas (máximo 50).");
    }

    const currency = body.currency === "USD" ? "USD" : "COP";
    const mult = Number(body.multiplier);
    const multiplier = Number.isFinite(mult)
      ? Math.min(4, Math.max(1, mult))
      : 1;
    const senderSlug =
      typeof body.senderSlug === "string" && body.senderSlug.trim()
        ? body.senderSlug.trim()
        : undefined;

    const result = await convexClient.mutation(api.vitrinas.create, {
      itemIds,
      currency,
      multiplier,
      senderSlug,
      secret,
      createdByEmail: email,
    });

    return sendSuccess(res, result);
  },
  {
    methods: ["POST", "OPTIONS"],
    requireGoogle: false,
  },
);
