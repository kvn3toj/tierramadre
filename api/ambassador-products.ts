/**
 * GET /api/ambassador-products?slug=<asesor-slug>
 *
 * WHY THIS ENDPOINT EXISTS
 *
 * The ambassador profile decides which pieces belong to an ambassador on the
 * CLIENT, by filtering the catalog on `item.asesor` / `item.asesorActual`
 * (src/utils/asesorProductOwnership.ts:67). Both of those are WITHHELD_KEYS —
 * the 2026-08 access-control round strips them for every non-staff caller.
 * Measured against production on 2026-08-11: an anonymous
 * `GET /api/get-treasure-sheets` returns 523 rows carrying 11 keys, and
 * `asesor` / `asesorActual` / `estado` / `precioCOP` appear in 0 of them.
 *
 * So the filter matched nothing and every public profile rendered empty —
 * 0 pieces, $0, no categories — while still inviting visitors to share it.
 * Staff saw a full profile, which is why it survived nine PRs of review.
 *
 * The ownership data is not secret from the server, only from the browser.
 * This endpoint answers the one question the page actually needs — "which
 * item numbers belong to this ambassador?" — and answers it with numbers.
 *
 * WHAT IT DELIBERATELY DOES NOT RETURN
 *
 * No prices. No `asesor` / `asesorActual` strings. No raw `estado`. The
 * response is item numbers plus counts; the client joins them against the
 * already-public catalog for name, photo and weight. `precioCOP` stays
 * withheld exactly as the lockdown left it (ruling, 2026-08-11: a guest sees
 * pieces and counts, not prices), so this widens the public surface by
 * "which pieces are on this ambassador's public profile" and nothing else —
 * which is the stated purpose of a public profile page.
 *
 * It is intentionally unauthenticated: the profile is a public marketing
 * page, reachable at /ambassadors/:slug with no session (App.tsx:441).
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
import { loadAsesorRoster, findBySlug } from './_lib/asesorRoster.js';
import { FOTO_INVENTARIO_LAST_COL } from './_lib/fotosintesis-inventory-columns.js';
import { mapRowToTreasureItem } from './get-treasure-sheets.js';
import { getAsesorProducts } from '../src/utils/asesorProductOwnership.js';
import { getOffer, type ResaleOffer } from '../src/utils/productOffer.js';
import { convexClient, isConvexEnabled } from './_lib/convex-client.js';
import { api } from '../convex/_generated/api.js';

type Sheets = sheets_v4.Sheets;

export interface AmbassadorProductsResponse {
  slug: string;
  /** Display name, already public via /api/get-asesores. */
  name: string;
  /** Every piece attributable to this ambassador, original owner or current. */
  itemIds: number[];
  /** The subset whose effective estado is DISPONIBLE. */
  availableItemIds: number[];
  counts: {
    total: number;
    disponible: number;
    vendida: number;
    loose: number;
    jewelry: number;
  };
}

/** Exported for tests — same idiom as api/cotizacion-reports.ts. */
export async function handleAmbassadorProducts(
  req: VercelRequest,
  res: VercelResponse,
  ctx: Record<string, unknown>,
) {
  const raw = req.query?.slug;
  const slug = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  if (!slug) {
    return sendError(res, 400, 'Falta el parámetro slug.');
  }

  const { sheets } = ctx as { sheets: Sheets };
  const sheetNames = await getSheetNames(sheets);

  const roster = await loadAsesorRoster(sheets, sheetNames);
  const name = findBySlug(roster, slug)?.name ?? null;
  if (!name) {
    // 404 rather than an empty list: "this ambassador does not exist" and
    // "this ambassador has no pieces" are different answers, and the page
    // renders a different thing for each.
    return sendError(res, 404, 'No encontramos a este embajador.');
  }

  const inventorySheet =
    findSheetByPattern(sheetNames, ['inventario', 'inventory']) ||
    sheetNames[0];
  const inventoryResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    // Mismo rango derivado que get-treasure-sheets: comparte `mapRowToTreasureItem`,
    // así que un rango corto acá deja columnas vacías exactamente igual.
    range: `${inventorySheet}!A:${FOTO_INVENTARIO_LAST_COL}`,
  });

  const rows = inventoryResponse.data.values;
  if (!rows || rows.length === 0) {
    return sendSuccess(res, emptyResponse(slug, name));
  }

  const headers = (rows[0] as unknown[]).map((c) => String(c));
  const items = rows
    .slice(1)
    .filter((row) => row.length > 0 && row.some((cell) => cell))
    .map((row) =>
      mapRowToTreasureItem(
        (row as unknown[]).map((c) => (c == null ? '' : String(c))),
        headers,
      ),
    )
    .filter((item) => item.item > 0);

  // The SAME function the profile calls, so server and client can never
  // disagree about who owns what or about how a transfer reads.
  const owned = getAsesorProducts(items, name);

  // Pieces this ambassador bought and has offered back for resale. Without
  // them the profile would keep answering a DIFFERENT question from the rest
  // of the app — which is the exact defect PR #98 removed from five call
  // sites, and which this endpoint still had.
  const resaleByItem = await loadResaleOffers(slug, name);

  const available = owned.filter(
    (p) =>
      // `effectiveEstado`, not `estado`: on a profile the owner-facing state
      // is what counts, so a piece transferred away reads as sold even when
      // its own row still says DISPONIBLE.
      getOffer({ ...p, estado: p.effectiveEstado }, resaleByItem.get(p.item))
        .purchasable,
  );

  const payload: AmbassadorProductsResponse = {
    slug,
    name,
    itemIds: owned.map((p) => p.item),
    availableItemIds: available.map((p) => p.item),
    counts: {
      total: owned.length,
      disponible: available.length,
      vendida: owned.length - available.length,
      loose: owned.filter((p) => !p.isJewelry).length,
      jewelry: owned.filter((p) => p.isJewelry).length,
    },
  };

  return sendSuccess(res, payload);
}

/**
 * Resale opt-ins for one ambassador, keyed by item number.
 *
 * Empty when Convex is unavailable (every preview deploy) — the profile then
 * counts only house-sellable stock, which is what it did before resale
 * existed. Never an error: a missing store must not empty a profile.
 */
async function loadResaleOffers(
  slug: string,
  name: string,
): Promise<Map<number, ResaleOffer>> {
  if (!isConvexEnabled || !convexClient) return new Map();
  try {
    const rows = (await convexClient.query(
      api.ambassadorCuration.listBySlug,
      { slug },
    )) as { itemId: string; forResale?: boolean; customPriceCOP?: number }[];

    const offers = new Map<number, ResaleOffer>();
    for (const row of rows) {
      if (row.forResale !== true) continue;
      const itemId = parseInt(row.itemId, 10);
      if (!Number.isFinite(itemId)) continue;
      offers.set(itemId, {
        itemId,
        asesorSlug: slug,
        asesorName: name,
        priceCOP: row.customPriceCOP,
      });
    }
    return offers;
  } catch {
    return new Map();
  }
}

export default withApiHandler(handleAmbassadorProducts, {
  methods: ['GET', 'OPTIONS'],
  cache: CACHE.NONE,
  provideSheets: true,
  errorPrefix: 'AmbassadorProducts',
});

function emptyResponse(slug: string, name: string): AmbassadorProductsResponse {
  return {
    slug,
    name,
    itemIds: [],
    availableItemIds: [],
    counts: { total: 0, disponible: 0, vendida: 0, loose: 0, jewelry: 0 },
  };
}
