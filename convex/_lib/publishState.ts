/**
 * Shared write path for the `mostrarEnCatalogo` publish flag. Every call
 * site that can flip this flag (lotItems.create, lotItems.updateGemaFields,
 * lots.publish, and the Sheet→Convex delta sync in fotoSync.ts) must route
 * through this helper instead of setting the field directly, so `publishedAt`
 * is stamped exactly once, the first time an item is published.
 *
 * "First publish wins": lots.reopen() demotes a published lot back to
 * mostrarEnCatalogo:false so it can be edited, then lots.publish() flips it
 * back to true. Without this guard, that ordinary edit-and-republish cycle
 * would push already-published items back to the top of the Estrenos
 * carousel every time. The returned patch omits `publishedAt` whenever no
 * new stamp is needed, so a caller spreading it into a db.patch() call never
 * overwrites an existing timestamp with undefined.
 */
export function withPublishStamp(
  current:
    | { mostrarEnCatalogo?: boolean; publishedAt?: number }
    | null
    | undefined,
  next: boolean,
): { mostrarEnCatalogo: boolean; publishedAt?: number } {
  const patch: { mostrarEnCatalogo: boolean; publishedAt?: number } = {
    mostrarEnCatalogo: next,
  };
  if (next && !current?.publishedAt) {
    patch.publishedAt = Date.now();
  }
  return patch;
}
