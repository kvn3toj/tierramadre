/**
 * /api/ambassador-curation — an ambassador's favourites and price/name overrides.
 *
 * WHY IT EXISTS
 *
 * Both lived in localStorage: `tm-ambassador-favorites-{slug}` and
 * `tm:ambassador-overrides:{slug}`. So the curation an ambassador built never
 * left the browser that built it — not their phone, not a second session, and
 * not the client the feature exists to show it to. The dialog worked, the
 * validation worked, and nobody else could ever see the result.
 *
 * AUTHORIZATION
 *
 * A write is allowed only when the caller proves an email with a signed `tms1`
 * session AND the Sheets roster says that email owns the slug being written.
 * The client's `isProfileOwner` is a rendering hint and is never trusted here —
 * it is computed from a payload the client also received, so it proves nothing
 * about who is calling.
 *
 * Staff are NOT granted blanket write access. An admin editing another
 * ambassador's showcase is a real feature request, but it is a different
 * decision with a different audit story, and quietly folding it into "staff can
 * do anything" is how ownership checks rot.
 *
 * READS
 *
 * Public, because a guest's whole reason to load the profile is to see the
 * showcase. Prices are the exception and follow the catalog's existing rule
 * exactly (`resolveGrant`): staff see them, a vitrina token sees them for the
 * items it grants, anonymous callers never do. A custom price is still a price.
 */
import type { sheets_v4 } from '@googleapis/sheets';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  sendSuccess,
  sendError,
  SPREADSHEET_ID,
  CACHE,
  withApiHandler,
  getSheetNames,
  findSheetByPattern,
} from './_lib/index.js';
import { extractBearer } from './_lib/bearer.js';
import { isSessionToken, verifySessionToken } from './_lib/sessionToken.js';
import { convexClient, isConvexEnabled } from './_lib/convex-client.js';
import { api } from '../convex/_generated/api.js';
import { loadAsesorRoster, findByEmail } from './_lib/asesorRoster.js';
import { resolveGrant } from './_lib/catalogGrant.js';
import { lookupVitrina } from './_lib/vitrinaLookup.js';
import { mapRowToTreasureItem } from './get-treasure-sheets.js';
import { validateOverrideValues } from '../src/utils/ambassadorOverrideValidation.js';

type Sheets = sheets_v4.Sheets;

interface CurationRow {
  slug: string;
  itemId: string;
  isFavorite: boolean;
  sortOrder?: number;
  customName?: string;
  customPriceCOP?: number;
  updatedAt: string;
}

export interface CurationOverride {
  customName?: string;
  customPriceCOP?: number;
}

export interface AmbassadorCurationResponse {
  slug: string;
  /** Item ids in the order the ambassador arranged them. */
  favorites: string[];
  /** Keyed by item id. `customPriceCOP` is absent unless the grant allows it. */
  overrides: Record<string, CurationOverride>;
}

/** Verifies a `tms1` session and returns its email. Only session tokens count. */
export function verifiedSessionEmail(
  authHeader?: string | string[],
): string | null {
  const token = extractBearer(authHeader);
  if (!token || !isSessionToken(token)) return null;
  return verifySessionToken(token)?.email ?? null;
}

/** Reads one product's canonical price, for server-side override validation. */
async function readBasePrice(
  sheets: Sheets,
  sheetNames: string[],
  itemId: string,
): Promise<number | undefined> {
  const inventorySheet =
    findSheetByPattern(sheetNames, ['inventario', 'inventory']) ||
    sheetNames[0];
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${inventorySheet}!A:AP`,
  });
  const rows = response.data.values;
  if (!rows || rows.length === 0) return undefined;
  const headers = (rows[0] as unknown[]).map((c) => String(c));
  const wanted = parseInt(itemId, 10);
  for (const row of rows.slice(1)) {
    const mapped = mapRowToTreasureItem(
      (row as unknown[]).map((c) => (c == null ? '' : String(c))),
      headers,
    );
    if (mapped.item === wanted) return mapped.precioCOP;
  }
  return undefined;
}

/**
 * The slug this caller owns, or null.
 *
 * Deliberately answers "who are you" from the roster rather than "who do you
 * claim to be" from the request body.
 */
async function ownedSlug(
  sheets: Sheets,
  sheetNames: string[],
  authHeader?: string | string[],
): Promise<string | null> {
  const email = verifiedSessionEmail(authHeader);
  if (!email) return null;
  const roster = await loadAsesorRoster(sheets, sheetNames);
  return findByEmail(roster, email)?.slug ?? null;
}

export async function handleAmbassadorCuration(
  req: VercelRequest,
  res: VercelResponse,
  ctx: Record<string, unknown>,
) {
  const { sheets } = ctx as { sheets: Sheets };

  if (req.method === 'GET') {
    const raw = req.query?.slug;
    const slug = (Array.isArray(raw) ? raw[0] : raw)?.trim();
    if (!slug) return sendError(res, 400, 'Falta el parámetro slug.');

    // Convex absent (notably every preview deploy, which has VITE_CONVEX_URL
    // but no CONVEX_URL) degrades to "no curation", never to an error: the
    // profile still renders its pieces, just without the arrangement.
    if (!isConvexEnabled || !convexClient) {
      return sendSuccess(res, { slug, favorites: [], overrides: {} });
    }

    const rows = (await convexClient.query(api.ambassadorCuration.listBySlug, {
      slug,
    })) as CurationRow[];

    const grant = await resolveGrant(req, { lookupVitrina });
    const priceAllowed = (itemId: string): boolean => {
      if (grant.kind === 'staff') return true;
      if (grant.kind === 'vitrina') {
        return grant.itemIds.includes(parseInt(itemId, 10));
      }
      return false;
    };

    const favorites = rows
      .filter((row) => row.isFavorite)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((row) => row.itemId);

    const overrides: Record<string, CurationOverride> = {};
    for (const row of rows) {
      const entry: CurationOverride = {};
      if (row.customName !== undefined) entry.customName = row.customName;
      if (row.customPriceCOP !== undefined && priceAllowed(row.itemId)) {
        entry.customPriceCOP = row.customPriceCOP;
      }
      if (Object.keys(entry).length > 0) overrides[row.itemId] = entry;
    }

    const payload: AmbassadorCurationResponse = { slug, favorites, overrides };
    return sendSuccess(res, payload);
  }

  if (req.method !== 'PUT' && req.method !== 'DELETE') {
    return sendError(res, 405, 'Método no permitido.');
  }

  // ─── Writes ────────────────────────────────────────────────────────
  const sheetNames = await getSheetNames(sheets);
  const caller = await ownedSlug(
    sheets,
    sheetNames,
    req.headers['authorization'],
  );
  if (!caller) {
    return sendError(res, 401, 'Inicia sesión para editar tu perfil.');
  }

  const body = (
    typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  ) as
    | {
        slug?: string;
        itemId?: string | number;
        favorites?: string[];
        customName?: string | null;
        customPriceCOP?: number | null;
        isFavorite?: boolean;
      }
    | undefined;

  const targetSlug = body?.slug?.trim();
  if (!targetSlug) return sendError(res, 400, 'Falta el slug.');
  if (targetSlug !== caller) {
    // 403, not 404: the caller is authenticated and this profile exists — they
    // simply do not own it.
    return sendError(res, 403, 'Sólo puedes editar tu propio perfil.');
  }

  if (!isConvexEnabled || !convexClient) {
    // Fail loudly on writes. A silent success here is how an ambassador
    // rearranges their showcase, sees it work, and loses it on reload.
    return sendError(res, 503, 'El almacenamiento no está disponible ahora.');
  }

  const email = verifiedSessionEmail(req.headers['authorization']) ?? undefined;

  if (req.method === 'DELETE') {
    const itemId = body?.itemId !== undefined ? String(body.itemId) : undefined;
    if (!itemId) return sendError(res, 400, 'Falta el itemId.');
    await convexClient.mutation(api.ambassadorCuration.remove, {
      slug: targetSlug,
      itemId,
    });
    return sendSuccess(res, { slug: targetSlug, itemId, removed: true });
  }

  // Reordering the whole favourites row is one statement, so it is one call.
  if (Array.isArray(body?.favorites)) {
    await convexClient.mutation(api.ambassadorCuration.setFavorites, {
      slug: targetSlug,
      itemIds: body.favorites.map((id) => String(id)),
      updatedByEmail: email,
    });
    return sendSuccess(res, { slug: targetSlug, favorites: body.favorites });
  }

  const itemId = body?.itemId !== undefined ? String(body.itemId) : undefined;
  if (!itemId) return sendError(res, 400, 'Falta el itemId.');

  // Server-side validation against the CANONICAL price, read here. The client
  // validates too, but that check is a courtesy to the user, not the gate:
  // this is the only place the base price is not attacker-supplied.
  if (body?.customPriceCOP !== undefined && body.customPriceCOP !== null) {
    const basePriceCOP = await readBasePrice(sheets, sheetNames, itemId);
    const validation = validateOverrideValues({
      basePriceCOP,
      customName: body.customName ?? undefined,
      customPriceCOP: body.customPriceCOP,
    });
    if (!validation.ok) {
      return sendError(res, 400, validation.errors[0].message);
    }
  } else if (body?.customName !== undefined && body.customName !== null) {
    const validation = validateOverrideValues({
      basePriceCOP: undefined,
      customName: body.customName,
    });
    if (!validation.ok) {
      return sendError(res, 400, validation.errors[0].message);
    }
  }

  await convexClient.mutation(api.ambassadorCuration.upsert, {
    slug: targetSlug,
    itemId,
    isFavorite: body?.isFavorite,
    customName: body?.customName ?? undefined,
    customPriceCOP: body?.customPriceCOP ?? undefined,
    updatedByEmail: email,
  });

  return sendSuccess(res, { slug: targetSlug, itemId, saved: true });
}

export default withApiHandler(handleAmbassadorCuration, {
  methods: ['GET', 'PUT', 'DELETE', 'OPTIONS'],
  cache: CACHE.NONE,
  provideSheets: true,
  errorPrefix: 'AmbassadorCuration',
});
