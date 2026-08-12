/**
 * /api/vitrina — mint or correct a public "Vitrina" client-share link (staff only).
 *
 * POST and PATCH, authenticated by the caller's `tms1` app session token
 * (`Authorization: Bearer <session-token>`). We verify it server-side, then
 * call the Convex `vitrinas.create`/`vitrinas.update` mutation with the
 * server-only `VITRINA_SHARED_SECRET`. Because the Convex deployment URL is
 * public (and the app has no Convex-native auth), that secret is what makes
 * the mutation reachable ONLY through this proxy — mirroring the
 * trusted-proxy model the invitation flow uses, plus the authorization gate
 * invitations lack.
 *
 * Session-token-only (2026-08 fix round N1, closing the bypass F1 was meant
 * to close): this used to also accept a raw Google ID token, verified only
 * against `audience` — that proves "some Gmail account", not roster
 * membership, since the OAuth client ID is public (ships in the frontend
 * bundle). Any Gmail account could mint a vitrina token for up to 50
 * caller-chosen itemIds and read the FULL unprojected row (precioCOP,
 * costoTM, ubicacion, caja, asesor, estado) via the ordinary `getByToken`
 * read path — reachable with ~11 requests for the whole inventory. A
 * session token is only issued by `/api/validate?action=mint-session` after
 * checking the caller against Asesores/Proveedores, so requiring it here
 * closes this with the exact mechanism `api/_lib/catalogGrant.ts` already
 * uses for the catalog grant — no new concept. The READ path (`getByToken`,
 * called from `api/vitrinaLookup.ts`/Convex directly) is UNCHANGED: a client
 * opening a `/v/<token>` share link must never need a token of their own.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler, sendError, sendSuccess } from './_lib/index.js';
import { convexClient, isConvexEnabled } from './_lib/convex-client.js';
import { extractBearer } from './_lib/bearer.js';
import { isSessionToken, verifySessionToken } from './_lib/sessionToken.js';
import { api } from '../convex/_generated/api.js';

/**
 * Verifies a `tms1` app session token and returns its email, or null.
 * Exported for tests/vitrina.test.ts — this function IS the fix (N1): a raw
 * Google ID token, whatever its shape, is not a session token and returns
 * null here, which the handler below turns into a 401.
 */
export function verifiedSessionEmail(
  authHeader?: string | string[],
): string | null {
  const token = extractBearer(authHeader);
  if (!token || !isSessionToken(token)) return null;
  return verifySessionToken(token)?.email ?? null;
}

export default withApiHandler(
  async (req: VercelRequest, res: VercelResponse) => {
    const secret = process.env.VITRINA_SHARED_SECRET;
    if (!secret) {
      return sendError(
        res,
        500,
        'VITRINA_SHARED_SECRET not configured on server',
      );
    }
    if (!isConvexEnabled || !convexClient) {
      return sendError(res, 503, 'Convex backend not configured');
    }

    const email = verifiedSessionEmail(req.headers['authorization']);
    if (!email) {
      return sendError(res, 401, 'Inicia sesión para generar un enlace.');
    }

    const body = (req.body ?? {}) as {
      token?: unknown;
      itemIds?: unknown;
      currency?: unknown;
      multiplier?: unknown;
      senderSlug?: unknown;
    };

    const parseItemIds = (): number[] | undefined =>
      Array.isArray(body.itemIds)
        ? Array.from(
            new Set(
              body.itemIds
                .map((n) => Number(n))
                .filter((n) => Number.isFinite(n) && n > 0),
            ),
          )
        : undefined;

    if (req.method === 'PATCH') {
      const token = typeof body.token === 'string' ? body.token.trim() : '';
      if (!token) {
        return sendError(res, 400, 'token requerido');
      }

      const itemIds = parseItemIds();
      if (itemIds !== undefined) {
        if (itemIds.length === 0) {
          return sendError(res, 400, 'itemIds requerido');
        }
        if (itemIds.length > 50) {
          return sendError(res, 400, 'Demasiadas piezas (máximo 50).');
        }
      }

      const currency =
        body.currency === 'USD' || body.currency === 'COP'
          ? body.currency
          : undefined;
      const mult = Number(body.multiplier);
      const multiplier =
        body.multiplier !== undefined && Number.isFinite(mult)
          ? Math.min(4, Math.max(1, mult))
          : undefined;
      const senderSlug =
        typeof body.senderSlug === 'string' && body.senderSlug.trim()
          ? body.senderSlug.trim()
          : undefined;

      try {
        const result = await convexClient.mutation(api.vitrinas.update, {
          token,
          itemIds,
          currency,
          multiplier,
          senderSlug,
          secret,
        });
        return sendSuccess(res, result);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('no encontrado')) {
          return sendError(res, 404, 'Enlace no encontrado.');
        }
        throw err;
      }
    }

    const itemIds = parseItemIds() ?? [];
    if (itemIds.length === 0) {
      return sendError(res, 400, 'itemIds requerido');
    }
    if (itemIds.length > 50) {
      return sendError(res, 400, 'Demasiadas piezas (máximo 50).');
    }

    const currency = body.currency === 'USD' ? 'USD' : 'COP';
    const mult = Number(body.multiplier);
    const multiplier = Number.isFinite(mult)
      ? Math.min(4, Math.max(1, mult))
      : 1;
    const senderSlug =
      typeof body.senderSlug === 'string' && body.senderSlug.trim()
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
    methods: ['POST', 'PATCH', 'OPTIONS'],
    requireGoogle: false,
  },
);
