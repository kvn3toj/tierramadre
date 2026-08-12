/**
 * Server-side "is this caller staff" gate for INTERNAL-ONLY Convex `query`
 * functions — clients, providers, sales, lots, lotItems, asesorMovements,
 * fotosintesisAi, and the raw `products.list` — none of which are part of
 * the public catalog surface (see products.publishedCatalog et al, which
 * this file does NOT touch).
 *
 * Why not `requireAccessLevel` (./authz.ts): that verifies a Google ID token
 * against Google's `tokeninfo` endpoint via `fetch`, which only works inside
 * a Convex `action` — a `query` has no network access, so it would throw at
 * import/call time if used here.
 *
 * Why a bare signature check IS enough authorization: a valid `tms1` session
 * token is only ever minted by `/api/validate?action=mint-session`, and only
 * for a caller who already passed the Asesores/Proveedores roster check
 * there (see src/utils/sessionToken.ts, api/_lib/sessionToken.ts). So a
 * token that verifies (correct HMAC, not expired) already proves the caller
 * is staff — no separate roster lookup is needed, and none would be
 * possible from a query anyway.
 *
 * Fails closed: missing, malformed, tampered, expired, or unverifiable
 * (e.g. ADMIN_SYNC_TOKEN unset) all resolve to `false`. This function must
 * NEVER throw — callers use it as a plain boolean gate, and a query that
 * throws surfaces as a broken screen instead of an empty one.
 */

import { isSessionToken, verifySessionToken } from './sessionToken';
import { isBotSecret } from './botAuth';

export async function isStaffSession(sessionToken?: string): Promise<boolean> {
  if (!sessionToken) return false;
  try {
    if (!isSessionToken(sessionToken)) return false;
    const payload = await verifySessionToken(sessionToken);
    return payload !== null;
  } catch {
    return false;
  }
}

/**
 * Combined gate for the small subset of internal-only queries the anima-bot
 * Telegram bridge ALSO reads directly (verified 2026-08-05 against
 * anima-bot/src/fotosintesis/client.ts: `lots.list`, `lots.peekNextLoteId`,
 * `lotItems.search`, `lotItems.sumPreponderancia`, `lotItems.getByItemId`,
 * `providers.list`, `products.list` — no other query in this lockdown has a
 * confirmed bot caller). The bot cannot obtain a staff session token (that
 * requires a Google Sign-In roster check it has no UI for), but it already
 * holds `ANIMA_BOT_SECRET` — the same shared secret `_lib/botAuth.ts`'s
 * `*ViaBot` mutations/actions accept. Authorized when EITHER credential is
 * valid; like `isStaffSession`, this never throws — a missing, wrong, or
 * malformed credential of either kind resolves to `false`.
 *
 * Do NOT reuse this for `clients`/`sales`/`asesorMovements`/`fotosintesisAi`
 * or any other query — those hold customer PII the bot has no evidence of
 * needing, and a `botSecret` there would hand it blanket read access to
 * cédulas it never asked for. Use `isStaffSession` alone for those.
 */
export async function isStaffOrBotSession(opts: {
  sessionToken?: string;
  botSecret?: string;
}): Promise<boolean> {
  if (await isStaffSession(opts.sessionToken)) return true;
  return isBotSecret(opts.botSecret);
}

/**
 * `isStaffOrBotSession`, pero que GRITA cuando la credencial existe y no sirve.
 *
 * El problema que resuelve: un gate que devuelve `[]` es indistinguible de un
 * inventario vacío. El 2026-08-11 eso costó que `buscar_comparables` (anima-bot)
 * reportara 0 comparables sobre 523 ítems durante días — el cliente no mandaba
 * `botSecret`, `products.list` devolvía `[]`, y nada en la cadena podía notar la
 * diferencia entre «no autenticado» y «no hay nada».
 *
 * El corte NO es «autorizado o no», es «¿ofreciste credencial?»:
 *
 * - **Ninguna credencial** → `false`. El llamador devuelve `[]` como siempre. Es
 *   el estado normal de la UI deslogueada: `readFreshSessionToken()` filtra los
 *   tokens vencidos en el cliente y manda `undefined`, así que una sesión
 *   expirada llega acá como «ninguna» y sigue mostrando pantalla vacía, no rota.
 *   Esto es lo que preserva el contrato del docstring de arriba.
 * - **Credencial presente que no verifica** → lanza. Un `botSecret` errado o
 *   rotado, un token manipulado, o `ADMIN_SYNC_TOKEN` sin definir en el server:
 *   ninguno es un estado normal, y todos son exactamente el fallo silencioso que
 *   este helper existe para volver ruidoso.
 *
 * Devuelve `true` autorizado, `false` cuando no hubo credencial que evaluar.
 */
export async function requireStaffOrBotSession(opts: {
  sessionToken?: string;
  botSecret?: string;
}): Promise<boolean> {
  if (await isStaffOrBotSession(opts)) return true;
  const ofrecio =
    opts.sessionToken !== undefined || opts.botSecret !== undefined;
  if (ofrecio) {
    // Sin decir CUÁL credencial falló ni por qué: esto viaja al cliente.
    throw new Error(
      'No autorizado: la credencial suministrada no es válida. ' +
        'Esto NO significa que no haya datos — es un fallo de autenticación.',
    );
  }
  return false;
}
