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
 *
 * PATCH ownership (final whole-branch review, checkout-in-app): `update` had
 * no ownership check at all, and the multiplier gate above only fires when
 * the REQUESTED multiplier isn't 1 — so any session holder could PATCH
 * someone else's vitrina down to x1 (Tierra Madre's cost) and it would sail
 * through, on a branch where the multiplier now decides what a customer is
 * actually charged. The PATCH branch below now requires the caller to be
 * either the vitrina's `createdByEmail` or an admin, checked here (where the
 * caller's identity is already verified) rather than inside the Convex
 * mutation — same trust model as the rest of this file: Convex enforces the
 * shared secret, this proxy enforces who's allowed to call it with what.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler, sendError, sendSuccess } from './_lib/index.js';
import { convexClient, isConvexEnabled } from './_lib/convex-client.js';
import { extractBearer } from './_lib/bearer.js';
import { isSessionToken, verifySessionToken } from './_lib/sessionToken.js';
import { api } from '../convex/_generated/api.js';
import { puedeFijarMultiplicador } from '../src/utils/permisosMultiplicador.js';

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

/** Los seis idiomas que la app sabe hablar (`src/locales/index.ts`). */
const IDIOMAS = ['es', 'en', 'fr', 'it', 'zh', 'pt'] as const;
export type IdiomaVitrina = (typeof IDIOMAS)[number];

/** El único default, y es español. */
export const IDIOMA_POR_DEFECTO: IdiomaVitrina = 'es';

/**
 * `body.lang` → uno de los seis, o `undefined` si no lo es.
 *
 * Mismo patrón que `currency` unas líneas más abajo: lista cerrada, y lo que
 * no está en la lista NO se propaga. Devuelve `undefined` en vez de `'es'`
 * porque las dos ramas necesitan cosas distintas del mismo valor ausente —
 * POST lo convierte en el default (siempre graba un idioma), PATCH lo deja
 * pasar como «no tocar» (volver al español un enlace acuñado en inglés sería
 * destructivo). Un solo default, aplicado donde corresponde.
 *
 * Exportada para poder probarla sola, como `verifiedSessionEmail`.
 */
export function idiomaValido(raw: unknown): IdiomaVitrina | undefined {
  return typeof raw === 'string' && (IDIOMAS as readonly string[]).includes(raw)
    ? (raw as IdiomaVitrina)
    : undefined;
}

interface AccessLevelLookup {
  accessLevel: string;
  /**
   * True only when the roster lookup itself failed (non-2xx or network
   * error) — distinct from a genuine roster answer of "not authorized".
   * Both still reject a non-1 multiplier (fail closed — that policy does
   * NOT change, fix round 1 confirmed it), but keeping them distinguishable
   * lets the 403 vs "we couldn't verify you" cases carry different
   * messages/log lines, so a flaky /api/validate doesn't read to an admin
   * as "your permission was revoked".
   */
  lookupFailed: boolean;
}

/**
 * Verified email → roster accessLevel, via the same `/api/validate` the rest
 * of the app already trusts as the role source of truth — the exact fetch
 * `api/invitations.ts`'s `resolveInvitationCaller` and
 * `convex/_lib/authz.ts`'s `fetchRosterEntry` already perform, reused here
 * rather than a third copy of the roster lookup.
 *
 * Fails closed: a roster miss OR an unreachable roster both resolve to an
 * `accessLevel` of `''`, which `puedeFijarMultiplicador` rejects. This gate
 * decides who fixes a sale price, so a transient lookup failure must never
 * fail open into "multiplier allowed". `lookupFailed` distinguishes the two
 * so the caller-facing error and the server log can tell them apart —
 * `api/invitations.ts`'s `resolveInvitationCaller` draws the same
 * distinction (`'lookup_failed'` vs `'not_authorized'`).
 */
async function accessLevelFor(email: string): Promise<AccessLevelLookup> {
  const appUrl = process.env.APP_URL || 'https://tierramadre.app';
  try {
    const res = await fetch(
      `${appUrl}/api/validate?email=${encodeURIComponent(email)}&type=both`,
    );
    if (!res.ok) {
      console.warn(
        `[vitrina] Roster lookup failed for ${email}: /api/validate returned ${res.status}. Failing closed on the multiplier gate.`,
      );
      return { accessLevel: '', lookupFailed: true };
    }
    const data = (await res.json()) as {
      success?: boolean;
      isAuthorized?: boolean;
      user?: { accessLevel?: string };
    };
    const accessLevel =
      data.success && data.isAuthorized && data.user?.accessLevel
        ? data.user.accessLevel
        : '';
    return { accessLevel, lookupFailed: false };
  } catch (err) {
    console.warn(
      `[vitrina] Roster lookup threw for ${email}: ${err instanceof Error ? err.message : String(err)}. Failing closed on the multiplier gate.`,
    );
    return { accessLevel: '', lookupFailed: true };
  }
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

    // Roster access level is resolved lazily and cached per-request: the
    // multiplier gate below needs it only when the caller asks for anything
    // other than x1, and the ownership gate (PATCH) needs it only when the
    // caller isn't the vitrina's own creator. Sharing this avoids a second
    // roster round-trip when both checks apply to the same non-owner call.
    let accessLevelCache: AccessLevelLookup | null = null;
    const resolveAccessLevel = async (): Promise<AccessLevelLookup> => {
      if (!accessLevelCache) accessLevelCache = await accessLevelFor(email);
      return accessLevelCache;
    };

    const body = (req.body ?? {}) as {
      token?: unknown;
      itemIds?: unknown;
      currency?: unknown;
      multiplier?: unknown;
      senderSlug?: unknown;
      lang?: unknown;
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

    // La UI oculta el slider a quien no puede, pero el diálogo es código de
    // cliente y se puede saltar. Esta es la comprobación que cuenta —
    // corre para mint (POST) y para corrección (PATCH) por igual.
    const multiplicadorPedido = Number(body.multiplier ?? 1);
    if (multiplicadorPedido !== 1) {
      const { accessLevel, lookupFailed } = await resolveAccessLevel();
      if (!puedeFijarMultiplicador(accessLevel)) {
        if (lookupFailed) {
          return sendError(
            res,
            503,
            'No pudimos verificar tu rol en este momento. Intenta de nuevo en unos segundos.',
          );
        }
        return sendError(
          res,
          403,
          'No autorizado para fijar un multiplicador distinto de 1',
        );
      }
    }

    if (req.method === 'PATCH') {
      const token = typeof body.token === 'string' ? body.token.trim() : '';
      if (!token) {
        return sendError(res, 400, 'token requerido');
      }

      // Ownership: a caller may only PATCH a vitrina they created, unless
      // they're an admin. Without this, anyone holding a valid app session
      // could reprice someone else's vitrina down to x1 (Tierra Madre's
      // cost) — the multiplier gate above only fires when the REQUESTED
      // multiplier isn't 1, so setting it TO 1 always sailed through. This
      // check runs regardless of what's being patched, closing that hole for
      // every field, not only `multiplier`. `vitrinas.getByToken` is already
      // a public query (used by the read path), so no new Convex surface.
      const existing = await convexClient.query(api.vitrinas.getByToken, {
        token,
      });
      if (!existing) {
        return sendError(res, 404, 'Enlace no encontrado.');
      }
      const isOwner = existing.createdByEmail === email;
      if (!isOwner) {
        // A record with no `createdByEmail` (legacy, pre-audit-field) has no
        // provable owner — fail closed and require admin, same posture the
        // roster-lookup-failure branch below already takes for the
        // multiplier gate.
        const { accessLevel, lookupFailed } = await resolveAccessLevel();
        if (lookupFailed) {
          return sendError(
            res,
            503,
            'No pudimos verificar tu rol en este momento. Intenta de nuevo en unos segundos.',
          );
        }
        if (accessLevel !== 'admin') {
          return sendError(
            res,
            403,
            'No autorizado para modificar este enlace.',
          );
        }
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
          // Omitido cuando el body no trajo un idioma de los seis: en una
          // corrección, «no dijo nada» significa «dejalo como está», no
          // «devolvelo al español».
          lang: idiomaValido(body.lang),
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
      // Al acuñar sí se graba siempre un idioma, y lo que no sea uno de los
      // seis cae al único default que existe: español.
      lang: idiomaValido(body.lang) ?? IDIOMA_POR_DEFECTO,
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
