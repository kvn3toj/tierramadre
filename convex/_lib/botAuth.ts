/**
 * Shared-secret caller verification for the anima-bot Telegram bridge.
 *
 * The admin Convex actions (lotItems.create, lots.create, …) gate on a verified
 * Google Sign-In ID token via `requireAccessLevel` — the frontend already holds
 * one, but a headless bot cannot obtain a Google token whose `aud` matches the
 * web client. So the bot authenticates instead with a strong shared secret
 * (`ANIMA_BOT_SECRET`, set in the Convex deployment env). The `*ViaBot` action
 * wrappers call `requireBotSecret` and then reuse the exact same, already-tested
 * `internal._create` / `_updateMedia` mutation bodies — no business logic is
 * duplicated or relaxed.
 *
 * SECURITY: this is a real bypass of the Google-token gate. Keep the secret long
 * and random, present only in the Convex env and the bot's `.env` (gitignored),
 * and reachable only behind the bot's owner-only DM admission gate.
 */
export function requireBotSecret(botSecret: string): void {
  const expected = process.env.ANIMA_BOT_SECRET;
  if (!expected) {
    throw new Error(
      'No autorizado: ANIMA_BOT_SECRET no configurado en Convex.',
    );
  }
  // Length-then-constant-time-ish compare. Convex has no `crypto.timingSafeEqual`
  // in scope; a mismatched length short-circuits, equal lengths compare fully.
  if (botSecret.length !== expected.length) {
    throw new Error('No autorizado: secreto del bot inválido.');
  }
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= botSecret.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (diff !== 0) {
    throw new Error('No autorizado: secreto del bot inválido.');
  }
}

/**
 * Non-throwing counterpart to `requireBotSecret`, for `query`s that accept
 * EITHER a staff session OR the bot secret (see
 * `_lib/requireStaffSession.ts`'s `isStaffOrBotSession`). `requireBotSecret`
 * throws by design for the `*ViaBot` mutations/actions — there, a bad or
 * missing secret should hard-fail the whole call. A query instead needs a
 * plain boolean it can OR against the staff-session check without a
 * try/catch at every call site, and it must never throw (see
 * requireStaffSession.ts's contract: no credential, bad session, and bad
 * secret alike resolve to "not authorized", never an exception).
 */
export function isBotSecret(botSecret?: string): boolean {
  if (!botSecret) return false;
  try {
    requireBotSecret(botSecret);
    return true;
  } catch {
    return false;
  }
}
