/**
 * Can this piece be bought, and from whom?
 *
 * WHY THIS EXISTS
 *
 * `estado` was one field doing two jobs: TM's books (who owns it) and
 * sellability (can anyone buy it). Five places asked
 * `estado === 'DISPONIBLE'` independently — the browser controller, the
 * filter hook, the search sheet's count, the quotation generator and the
 * price simulator — so every new ownership case had to be remembered in five
 * places, and wasn't.
 *
 * Two consequences shipped as bugs:
 *
 *  - **CONSIGNACION pieces are hidden.** TM owns them; an ambassador merely
 *    holds them physically. They are ours to sell, and the "available" filter
 *    dropped them for staff.
 *  - **A piece an ambassador bought can never be resold through us**, even
 *    when the ambassador wants exactly that, because its estado is ASESOR or
 *    VENDIDA forever.
 *
 * So ownership and offer are modelled as the two separate facts they are:
 *
 *      ownership : TM | ambassador X          (estado + asesorActual)
 *      offer     : not for sale | for sale    (per owner, opt-in)
 *
 * `estado` keeps meaning exactly what the books say — a piece an ambassador
 * bought stays VENDIDA internally, which is what accounting needs. Whether it
 * is *offered* is a separate statement, and for an ambassador it is theirs to
 * make (ambassadorCuration.forResale) — never inferred. Inferring it would put
 * the ring someone bought for their wife on the public catalog.
 */
import type { TreasureItem } from '../types';

/** One ambassador's public offer to resell a piece they own. */
export interface ResaleOffer {
  itemId: number;
  asesorSlug: string;
  asesorName: string;
  /** The ambassador's own price, when they set one. */
  priceCOP?: number;
}

export type ResaleIndex = Map<number, ResaleOffer>;

export interface Offer {
  purchasable: boolean;
  /**
   * `unknown` is not a failure — it is a non-staff caller whose rows had
   * `estado` withheld by the catalog projection. See the invariant below.
   */
  seller: 'tm' | 'ambassador' | 'unknown';
  /** Present only when the seller is an ambassador reselling their own piece. */
  resale?: ResaleOffer;
  /** The price that governs: the ambassador's when they set one, else TM's. */
  priceCOP?: number;
}

/** TM owns it and it is for sale, whoever is physically holding it. */
const TM_SELLABLE = new Set(['DISPONIBLE', 'CONSIGNACION']);

export function getOffer(item: TreasureItem, resale?: ResaleOffer): Offer {
  // An ambassador's opt-in wins over `estado`, which is precisely the point:
  // the books say VENDIDA and the owner says "I'll sell it".
  if (resale) {
    return {
      purchasable: true,
      seller: 'ambassador',
      resale,
      priceCOP: resale.priceCOP ?? item.precioCOP,
    };
  }

  // INVARIANT — a withheld field must never remove a row.
  // `estado` is a WITHHELD_KEY, so a guest's rows do not carry it. Treating
  // "absent" as "not available" is what once made the search sheet report
  // "0 tesoros disponibles" to every guest (MoreSheetSearch.tsx:130-142) and
  // what emptied the ambassador profile. Absent means unknown, not false.
  if (typeof item.estado !== 'string' || item.estado.length === 0) {
    return { purchasable: true, seller: 'unknown', priceCOP: item.precioCOP };
  }

  if (TM_SELLABLE.has(item.estado.toUpperCase())) {
    return { purchasable: true, seller: 'tm', priceCOP: item.precioCOP };
  }

  return { purchasable: false, seller: 'tm', priceCOP: item.precioCOP };
}

/** Convenience for the many call sites that only need the boolean. */
export function isPurchasable(
  item: TreasureItem,
  resale?: ResaleOffer,
): boolean {
  return getOffer(item, resale).purchasable;
}

/** Builds the lookup the call sites pass in. */
export function buildResaleIndex(offers: ResaleOffer[]): ResaleIndex {
  return new Map(offers.map((offer) => [offer.itemId, offer]));
}
