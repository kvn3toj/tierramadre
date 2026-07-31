/**
 * Ambassador Subdomain Resolver
 *
 * Every `*.tierramadre.app` request is rewritten here by vercel.json, which
 * captures the first DNS label as `handle`. This function turns that handle
 * into a real profile path and redirects to the apex:
 *
 *   andres.tierramadre.app/916
 *     → https://tierramadre.app/ambassadors/andres-mauricio-escobar-ramirez/916
 *
 * Why a function and not a pure vercel.json redirect: a rewrite rule can only
 * substitute the captured text, so it can map `andres` → `/ambassadors/andres`
 * but never `andres` → `/ambassadors/andres-mauricio-escobar-ramirez`. The
 * handle↔slug indirection is the whole point, so it needs a lookup.
 *
 * Why redirect to the apex rather than serving the app on the subdomain:
 * every subdomain is a separate browser origin, so serving there would log
 * the visitor out (auth lives in sessionStorage, `AuthContext.tsx:44`) and
 * would need each host registered as a Google OAuth origin — wildcards are
 * not accepted there. Redirecting keeps one origin, one session.
 *
 * Resolution order:
 *   1. reserved label            → apex root
 *   2. custom handle (Sheets)    → that ambassador's current slug
 *   3. label matches a slug      → that slug (works with zero configuration)
 *   4. anything else             → /ambassadors directory
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler } from './_lib/index.js';
import {
  normalizeHandle,
  RESERVED_HANDLES,
} from '../src/utils/ambassadorHandle.js';

/** Canonical origin every subdomain funnels back into. */
const APP_ORIGIN = (process.env.APP_URL || 'https://tierramadre.app').replace(
  /\/+$/,
  '',
);

interface Asesor {
  slug: string;
  email: string | null;
}

/**
 * 307, not 308. Handles are editable, so a permanent redirect would be
 * cached in browsers indefinitely and survive the ambassador changing it.
 */
const REDIRECT_STATUS = 307;

/**
 * Preserve the sub-path so deep links keep working:
 * `andres.tierramadre.app/product/916` → `/ambassadors/<slug>/product/916`.
 * The `path` param arrives from the vercel.json `:path*` capture.
 */
function subPath(raw: unknown): string {
  const value = Array.isArray(raw) ? raw.join('/') : String(raw ?? '');
  const trimmed = value.replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}` : '';
}

export default withApiHandler(
  async (req: VercelRequest, res: VercelResponse) => {
    const handle = normalizeHandle(String(req.query.handle ?? ''));
    const tail = subPath(req.query.path);

    const redirect = (to: string) => {
      res.setHeader('Location', to);
      // Handles change; let the CDN help but never let it own the mapping.
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
      res.status(REDIRECT_STATUS);
      return res.end();
    };

    // 1. Reserved labels never belong to a person. Send them to the apex
    //    rather than 404ing, so a stray `www.` or `staging.` still lands
    //    somewhere useful.
    if (!handle || RESERVED_HANDLES.has(handle)) {
      return redirect(`${APP_ORIGIN}/`);
    }

    // The ambassador roster and the handle map are two independent reads;
    // neither is large and both are CDN-cacheable.
    const [asesoresRes, handlesRes] = await Promise.all([
      fetch(`${APP_ORIGIN}/api/get-asesores`),
      fetch(`${APP_ORIGIN}/api/ambassador-handle`),
    ]);

    if (!asesoresRes.ok) {
      // Without the roster we cannot resolve anything. Fail toward the
      // directory instead of showing an error page for a shared link.
      return redirect(`${APP_ORIGIN}/ambassadors`);
    }

    const asesoresBody = (await asesoresRes.json()) as {
      asesores?: Asesor[];
    } | null;
    const asesores: Asesor[] = asesoresBody?.asesores ?? [];

    const handlesBody = handlesRes.ok
      ? ((await handlesRes.json()) as {
          handles?: Record<string, string>;
        } | null)
      : null;
    const handles: Record<string, string> = handlesBody?.handles ?? {};

    // 2. Custom handle → email → the ambassador's *current* slug. Looking
    //    the slug up now (rather than storing it) is what lets someone fix
    //    a typo in their name without breaking their public link.
    const claimedBy = handles[handle];
    if (claimedBy) {
      const match = asesores.find(
        (a) => (a.email ?? '').trim().toLowerCase() === claimedBy,
      );
      if (match?.slug) {
        return redirect(`${APP_ORIGIN}/ambassadors/${match.slug}${tail}`);
      }
    }

    // 3. The label already is a slug — every ambassador works out of the
    //    box, before anyone sets a custom handle.
    if (asesores.some((a) => a.slug === handle)) {
      return redirect(`${APP_ORIGIN}/ambassadors/${handle}${tail}`);
    }

    // 4. Unknown handle. The directory is a better landing than an empty
    //    profile, which is what /ambassadors/<unknown> renders today.
    return redirect(`${APP_ORIGIN}/ambassadors`);
  },
  {
    methods: ['GET', 'HEAD', 'OPTIONS'],
    // A redirect needs no Google credentials of its own — it only calls two
    // sibling endpoints over HTTP. Without this the wrapper 500s whenever
    // Google config is missing, turning every shared link into an error page.
    requireGoogle: false,
    errorPrefix: 'AmbassadorSubdomain',
  },
);
