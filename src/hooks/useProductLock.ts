import { useEffect, useMemo } from "react";

import {
  convexApi,
  convexReady,
  useConvexMutation,
  useConvexQuery,
} from "../lib/convex-safe";
import { useGoogleAuth } from "../contexts/GoogleAuthContext";

export interface ProductLockHolder {
  holderEmail: string;
  holderName?: string;
  expiresAt: string;
}

/**
 * Shared `productInventory` soft-lock, keyed by `itemId`.
 *
 * Both the atelier ProductManagement `EditDrawer` and the Fotosíntesis
 * `EditItemDrawer` edit the SAME `productInventory` row (by `itemId`). Routing
 * both surfaces through this one hook means a lock claimed in one is honored in
 * the other, so the two editors can no longer silently clobber each other —
 * the root cause of audit finding C3.
 *
 * Behaviour mirrors the original inline implementation: claim a 5-minute lock
 * when `active` (and we have an `itemId` + a signed-in editor), release it on
 * cleanup, and return the holder *iff someone else currently holds it* (self is
 * filtered out, so a banner only appears for a real conflict). The `claimedHere`
 * flag covers the race where the claim resolves after the drawer already closed.
 */
export function useProductLock(
  itemId: string | undefined,
  active: boolean,
): { lockedByOther: ProductLockHolder | null } {
  const { user } = useGoogleAuth();
  const claimLock = useConvexMutation(convexApi.products.claimLock);
  const releaseLock = useConvexMutation(convexApi.products.releaseLock);

  useEffect(() => {
    if (!convexReady || !active || !itemId || !user?.email) return;

    const email = user.email;
    const name = user.name;
    let cancelled = false;
    let claimedHere = false;

    void claimLock({ itemId, holderEmail: email, holderName: name })
      .then((result) => {
        if (cancelled) {
          if (result.ok) {
            void releaseLock({ itemId, holderEmail: email }).catch(() => {});
          }
          return;
        }
        if (result.ok) {
          claimedHere = true;
        }
      })
      .catch(() => {
        // Silent — the lockStatus subscription surfaces any conflict.
      });

    return () => {
      cancelled = true;
      if (claimedHere) {
        void releaseLock({ itemId, holderEmail: email }).catch(() => {});
        claimedHere = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, itemId, user?.email, user?.name, claimLock, releaseLock]);

  const lockStatus = useConvexQuery(
    convexApi.products.lockStatus,
    convexReady && active && itemId ? { itemId } : "skip",
  ) as ProductLockHolder | null | undefined;

  const lockedByOther = useMemo(() => {
    if (!lockStatus || !user?.email) return null;
    if (lockStatus.holderEmail === user.email) return null;
    return lockStatus;
  }, [lockStatus, user?.email]);

  return { lockedByOther };
}
