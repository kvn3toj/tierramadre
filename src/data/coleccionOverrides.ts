/**
 * Local overrides for the `coleccion` field on specific items.
 *
 * Lets us group items into a virtual collection (filterable in the Treasure Browser)
 * without editing the Google Sheet. The override is applied in `useTreasure.ts`
 * when items are merged with media, so it flows through `useFilterOptions` and
 * `useTreasureFiltering` automatically.
 */

export const COLECCION_OVERRIDES: Record<number, string> = {
  // Subasta Tierra Mädre
  197: "Subasta Tierra Mädre",
  206: "Subasta Tierra Mädre",
  190: "Subasta Tierra Mädre",
  256: "Subasta Tierra Mädre",
  192: "Subasta Tierra Mädre",
  129: "Subasta Tierra Mädre",
};
