/**
 * GET /api/resale-offers — pieces ambassadors are offering for resale.
 *
 * An ambassador who buys a piece owns it: TM's books say VENDIDA (or ASESOR)
 * and that is correct and must stay. But they may want to sell it on, through
 * us. That is a second, separate fact, and it is theirs to state — never
 * inferred from ownership, or the ring somebody bought for their wife would
 * appear on the public catalog.
 *
 * This endpoint publishes only what was deliberately offered. It is NOT the
 * ownership map: a piece an ambassador owns but has not offered appears
 * nowhere here, and `asesor` / `asesorActual` remain withheld in the catalog
 * projection exactly as before. That containment is the whole reason the
 * offer is a separate opt-in list rather than a loosened projection.
 *
 * PRICE follows the catalog's existing grant rule (`resolveGrant`) rather
 * than being published outright. Anonymous callers receive no `precioCOP`
 * anywhere in the catalog — measured 0/523 — so publishing a resale price
 * would make these the only priced items on an otherwise priceless grid.
 * The ruling ("the ambassador's price governs") is about WHICH price wins,
 * not about inventing a new class of publicly-priced item.
 */
import type { sheets_v4 } from '@googleapis/sheets';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  sendSuccess,
  CACHE,
  withApiHandler,
  getSheetNames,
} from './_lib/index.js';
import { convexClient, isConvexEnabled } from './_lib/convex-client.js';
import { api } from '../convex/_generated/api.js';
import { loadAsesorRoster } from './_lib/asesorRoster.js';
import { resolveGrant } from './_lib/catalogGrant.js';
import { lookupVitrina } from './_lib/vitrinaLookup.js';

type Sheets = sheets_v4.Sheets;

interface CurationRow {
  slug: string;
  itemId: string;
  forResale?: boolean;
  customPriceCOP?: number;
}

export interface PublicResaleOffer {
  itemId: number;
  asesorSlug: string;
  /** Display name — already public via /api/get-asesores. */
  asesorName: string;
  /** Present only when the caller is entitled to prices. */
  priceCOP?: number;
}

export async function handleResaleOffers(
  req: VercelRequest,
  res: VercelResponse,
  ctx: Record<string, unknown>,
) {
  // No store (every preview deploy: VITE_CONVEX_URL without CONVEX_URL) means
  // no offers, never an error. The catalog just shows house stock.
  if (!isConvexEnabled || !convexClient) {
    return sendSuccess(res, { offers: [] });
  }

  const rows = (await convexClient.query(
    api.ambassadorCuration.listResale,
    {},
  )) as CurationRow[];

  if (rows.length === 0) return sendSuccess(res, { offers: [] });

  const { sheets } = ctx as { sheets: Sheets };
  const sheetNames = await getSheetNames(sheets);
  const roster = await loadAsesorRoster(sheets, sheetNames);
  const nameBySlug = new Map(roster.map((entry) => [entry.slug, entry.name]));

  const grant = await resolveGrant(req, { lookupVitrina });
  const priceAllowed = (itemId: number): boolean => {
    if (grant.kind === 'staff') return true;
    if (grant.kind === 'vitrina') return grant.itemIds.includes(itemId);
    return false;
  };

  const offers: PublicResaleOffer[] = [];
  for (const row of rows) {
    const asesorName = nameBySlug.get(row.slug);
    // An offer from a slug that is no longer on the active roster is dropped:
    // we will not advertise a piece with nobody to broker it against.
    if (!asesorName) continue;
    const itemId = parseInt(row.itemId, 10);
    if (!Number.isFinite(itemId)) continue;

    offers.push({
      itemId,
      asesorSlug: row.slug,
      asesorName,
      ...(row.customPriceCOP !== undefined && priceAllowed(itemId)
        ? { priceCOP: row.customPriceCOP }
        : {}),
    });
  }

  return sendSuccess(res, { offers });
}

export default withApiHandler(handleResaleOffers, {
  methods: ['GET', 'OPTIONS'],
  cache: CACHE.NONE,
  provideSheets: true,
  errorPrefix: 'ResaleOffers',
});
