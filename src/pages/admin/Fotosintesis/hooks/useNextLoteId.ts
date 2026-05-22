import { useConvexQuery, convexApi } from "../../../../lib/convex-safe";

export type Sede = "B" | "C";

/**
 * Reactive peek at the next loteId the server would allocate for a given
 * sede (e.g. "B-009" for Bogotá or "C-001" for Cali).
 *
 * Returns `null` while either (a) no sede is chosen yet, or (b) Convex is
 * still resolving the first response. The form should render "—" during
 * that window so the topbar ID never blinks.
 */
export function useNextLoteId(sede: Sede | null): string | null {
  const result = useConvexQuery(
    convexApi.lots.peekNextLoteId,
    sede ? { sede } : "skip",
  );
  if (!result) return null;
  return result.preview;
}

export default useNextLoteId;
