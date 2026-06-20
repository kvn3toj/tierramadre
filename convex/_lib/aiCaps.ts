/**
 * Single source of truth for Fotosynthia's lot-item scan/candidate cap.
 *
 * Shared by the Convex workspace snapshot (`convex/fotosintesisAi.ts`, which
 * `.take()`s this many recent `productInventory` rows) and the client copilot
 * (`CopilotPanel.tsx`, which passes it to `resolveItemHint` as the catalog
 * size). Keeping ONE literal removes the drift where the two sides disagree and
 * `resolveItemHint`'s `catalogComplete` mislabels an off-cap miss as a true
 * not-found (or vice versa). Pure constant — safe to import from both the
 * Convex backend and the client bundle.
 */
export const ITEM_SCAN_CAP = 300;
