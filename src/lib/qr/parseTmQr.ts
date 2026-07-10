/**
 * parseTmQr — pure decoder for Tierra Mädre product QR payloads.
 *
 * The canonical product QR encodes `https://tierramadre.app/product/{itemId}`
 * (see `ProductDetail/components/AdditionalInfo.tsx` + `hooks/useShare.ts`).
 * This helper is deliberately platform-agnostic: it is the SINGLE place where
 * both the PWA camera scanner and the anima-bot Telegram bridge turn a raw scan
 * into an itemId, so the two surfaces can never drift. It never touches the
 * network or Convex — callers resolve the item via `products.getByItem`.
 *
 * Accepted inputs:
 *   - Full URL:  https://tierramadre.app/product/B-001-G1  (any scheme/host,
 *     trailing slash, query string or hash are tolerated)
 *   - No-scheme host form:  tierramadre.app/product/368
 *   - Bare id:  "B-001-G1" or "368"  (what the hand-typed fallback yields)
 *
 * Recognised-but-not-an-item → { kind: 'vitrina' } for `/v/<token>` share
 * links; everything else → { kind: 'other' }.
 */

export type TmQrResult =
  | { kind: 'item'; itemId: string; raw: string }
  | { kind: 'vitrina'; token: string; raw: string }
  | { kind: 'other'; raw: string };

/** Item ids are alphanumeric with internal dashes only (e.g. "B-001-G1", "368"). */
const ITEM_ID_RE = /^[A-Za-z0-9][A-Za-z0-9-]*$/;

function cleanSegment(seg: string): string {
  const noQueryOrHash = seg.split(/[?#]/)[0].trim();
  try {
    return decodeURIComponent(noQueryOrHash);
  } catch {
    return noQueryOrHash;
  }
}

export function parseTmQr(input: string | null | undefined): TmQrResult {
  const raw = (input ?? '').trim();
  if (!raw) return { kind: 'other', raw };

  // 1) Try to interpret as a URL (covers scheme, host, path, query, hash).
  let pathname: string | null = null;
  try {
    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw);
    const looksLikeHost =
      raw.startsWith('//') ||
      (raw.includes('/') && raw.includes('.') && !raw.includes(' '));
    const withScheme = hasScheme
      ? raw
      : raw.startsWith('//')
        ? `https:${raw}`
        : looksLikeHost
          ? `https://${raw}`
          : null;
    if (withScheme) pathname = new URL(withScheme).pathname;
  } catch {
    pathname = null;
  }

  if (pathname) {
    const segs = pathname.split('/').filter(Boolean);
    const productIdx = segs.findIndex((s) => s.toLowerCase() === 'product');
    if (productIdx >= 0 && segs[productIdx + 1]) {
      const itemId = cleanSegment(segs[productIdx + 1]);
      if (ITEM_ID_RE.test(itemId)) return { kind: 'item', itemId, raw };
    }
    const vitrinaIdx = segs.findIndex((s) => s.toLowerCase() === 'v');
    if (vitrinaIdx >= 0 && segs[vitrinaIdx + 1]) {
      return { kind: 'vitrina', token: cleanSegment(segs[vitrinaIdx + 1]), raw };
    }
    return { kind: 'other', raw };
  }

  // 2) Not a URL — accept a bare item id (plain-text QR or manual entry).
  if (ITEM_ID_RE.test(raw)) return { kind: 'item', itemId: raw, raw };

  return { kind: 'other', raw };
}
