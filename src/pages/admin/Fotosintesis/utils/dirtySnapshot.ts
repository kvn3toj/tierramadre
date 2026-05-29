/**
 * Shallow equality for a flat snapshot of a drawer's editable fields. The
 * Fotosíntesis item/lot drawers capture a baseline snapshot when they open and
 * compare the live field values against it to decide `dirty` — comparing against
 * a captured baseline (not the live Convex prop) avoids a false discard prompt
 * when another admin edits the same row in the background. (ISO-audit C4.)
 *
 * Pure so it is unit-testable (tests/dirtySnapshot.test.ts). `undefined` and
 * `""` are intentionally distinct so a seeded blank field doesn't read as dirty.
 */
export type DirtySnapshot = Record<
  string,
  string | number | boolean | null | undefined
>;

export function recordsEqual(a: DirtySnapshot, b: DirtySnapshot): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (a[key] !== b[key]) return false;
  }
  return true;
}
