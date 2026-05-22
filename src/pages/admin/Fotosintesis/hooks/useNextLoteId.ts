import { useConvexQuery, convexApi } from "../../../../lib/convex-safe";

/**
 * Reactive peek at the next loteId the server would allocate (e.g. "B-009").
 *
 * Wraps `convexApi.lots.peekNextLoteId` so the page doesn't repeat the
 * `{ preview }` destructuring — and so a future change to the underlying
 * shape only needs to be threaded through here.
 *
 * Returns `null` while Convex is still resolving; the page should render a
 * skeleton or "—" during that brief window so the topbar ID never blinks.
 */
export function useNextLoteId(): string | null {
  const result = useConvexQuery(convexApi.lots.peekNextLoteId, {});
  if (!result) return null;
  return result.preview;
}

export default useNextLoteId;
