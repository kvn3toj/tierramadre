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
import { extractBearer, bearerMatches } from './bearer.js';
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

/**
 * Verifies a `tms1` app session token and returns its email, or null.
 *
 * ONLY session tokens — a prior version also accepted a raw Google ID token
 * verified purely against `audience`. That is NOT a roster check: the OAuth
 * client ID is public (it ships in the frontend bundle), so any Gmail user
 * could obtain a token with the right audience and pass as staff, reading
 * the unprojected catalog. A session token is already proof of roster
 * membership — `/api/validate?action=mint-session` only issues one after
 * verifying the caller against Asesores/Proveedores — so restricting to this
 * token type makes the roster check free (no network call) instead of
 * absent. Removed 2026-08 fix round; see
 * .superpowers/sdd/2026-08-05-control-de-acceso-al-catalogo/task-7-report.md.
 */
function verifiedSessionEmail(authHeader?: string | string[]): string | null {
  const token = extractBearer(authHeader);
  if (!token || !isSessionToken(token)) return null;
  return verifySessionToken(token)?.email ?? null;
}

export async function resolveGrant(
  req: VercelRequest,
  deps: ResolveGrantDeps,
): Promise<Grant> {
  try {
    // Service grant: server-to-server callers (the Convex inventory sync)
    // present the ADMIN_SYNC_TOKEN shared secret as a bearer token instead of
    // a per-user session — a credential at least as strong as any asesor's,
    // since it already gates direct Sheets writes elsewhere. Same
    // `Authorization: Bearer <secret>` + constant-time bearerMatches()
    // pattern api/ghl-*.ts uses. Checked first: it's a cheap compare with no
    // I/O, and it must win over a stale/absent session on the same request.
    if (
      bearerMatches(req.headers?.authorization, process.env.ADMIN_SYNC_TOKEN)
    ) {
      return { kind: 'staff' };
    }
    if (verifiedSessionEmail(req.headers?.authorization)) {
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

/**
 * True when the caller DID present a bearer token and it did not verify.
 * Distinguishes "never signed in" (fine, stay anonymous) from "session died"
 * (recoverable — the client should refresh and retry).
 */
export function bearerWasRejected(req: VercelRequest, grant: Grant): boolean {
  if (grant.kind === 'staff') return false;
  return extractBearer(req.headers?.authorization) !== null;
}
