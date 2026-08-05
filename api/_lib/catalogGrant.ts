/**
 * Resolves exactly one grant per catalog request: staff | vitrina | anon.
 *
 * NEVER THROWS. Anything malformed, expired, forged, or unreachable resolves
 * to `anon` — catalog reads stay available, they just carry less.
 *
 * A numeric id-list is NOT a credential: `/v/368,412` is guessable by anyone,
 * and `/p/368` is literally a one-item stateless vitrina (VitrinaPage.tsx:198).
 * Only an unguessable stateful Convex token grants price visibility.
 */
import type { VercelRequest } from '@vercel/node';
import { extractBearer } from './bearer.js';
import { isSessionToken, verifySessionToken } from './sessionToken.js';
import type { Grant } from './catalogProjection.js';

/** Same shape check VitrinaContent uses (VitrinaPage.tsx:57). */
const ID_LIST_RE = /^\d+([-,]\d+)*$/;

export type VitrinaLookup = (
  token: string,
) => Promise<{ itemIds: number[] } | null>;

export interface ResolveGrantDeps {
  lookupVitrina: VitrinaLookup;
}

/** Accepts a `tms1` session token OR a raw Google ID token (api/vitrina.ts:42). */
async function verifiedEmail(
  authHeader?: string | string[],
): Promise<string | null> {
  const token = extractBearer(authHeader);
  if (!token) return null;
  if (isSessionToken(token)) {
    return verifySessionToken(token)?.email ?? null;
  }
  const audiences = [
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.VITE_GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_ID,
  ].filter((a): a is string => !!a && a.trim().length > 0);
  if (audiences.length === 0) return null;
  try {
    const { OAuth2Client } = await import('google-auth-library');
    const ticket = await new OAuth2Client().verifyIdToken({
      idToken: token,
      audience: audiences,
    });
    const payload = ticket.getPayload();
    return payload?.email && payload.email_verified
      ? payload.email.toLowerCase().trim()
      : null;
  } catch {
    return null;
  }
}

export async function resolveGrant(
  req: VercelRequest,
  deps: ResolveGrantDeps,
): Promise<Grant> {
  try {
    if (await verifiedEmail(req.headers?.authorization)) {
      return { kind: 'staff' };
    }
  } catch {
    /* fall through to anon */
  }

  const raw = req.query?.vitrina;
  const code = Array.isArray(raw) ? raw[0] : raw;
  if (typeof code === 'string' && code && !ID_LIST_RE.test(code)) {
    try {
      const doc = await deps.lookupVitrina(code);
      if (doc && Array.isArray(doc.itemIds)) {
        return { kind: 'vitrina', itemIds: doc.itemIds };
      }
    } catch {
      /* convex unreachable — degrade, don't break the page */
    }
  }

  return { kind: 'anon' };
}
