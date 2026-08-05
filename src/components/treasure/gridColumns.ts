/**
 * How many columns the catalog grid gets.
 *
 * This used to be a ladder of `useMediaQuery` breakpoints — and that was wrong
 * from the moment `--maxw` shipped. The grid does not span the viewport: it
 * lives inside the shell's centered content container, so a rule keyed on
 * window width was answering a question about a box it could not see. At a
 * 1800px viewport the `xl` branch asked for 5 columns and got a 1033px grid to
 * put them in — 187px cards, narrower than the same catalog renders on a 1440px
 * laptop. The comment on that branch promised "keeps cards ~300px"; it had been
 * false for as long as the container existed.
 *
 * So the count comes from the measured container instead, and the constant that
 * survives is the one that was actually intended all along: the card width.
 *
 * Note this picks the count whose resulting CARD is closest to the target, not
 * the count nearest some width ratio. Those are different answers, because card
 * width falls as 1/N: on a 1298px grid, 4 columns give 306px cards and 5 give
 * 240px — the ratio rounds to 4, but 5 is the closer fit. Comparing candidates
 * directly is a couple more lines and never has to be reasoned about again.
 */

/** The card width the catalog was designed around (Quiet Emerald spec). */
export const TARGET_CARD_WIDTH = 270;

/**
 * Phone and tablet-portrait stay two-up regardless of arithmetic. That is a
 * device decision, not a fitting one — iOS HIG scanning behaviour, and it is
 * what ships today at both xs and sm. The caller applies it; this module only
 * answers the pointer-width tiers.
 */
export const MOBILE_COLUMNS = 2;

/** Below three the grid stops being a grid; the mobile tier owns two-up. */
export const MIN_COLUMNS = 3;

/**
 * Ceiling for very wide displays. Not a layout opinion so much as a guard —
 * past eight the row stops being scannable and the virtualizer pays for cells
 * nobody reads.
 */
export const MAX_COLUMNS = 8;

/**
 * Width one card ends up with: N cards plus (N−1) gutters fill the grid.
 */
export function cardWidthFor(
  gridContentWidth: number,
  colGap: number,
  columnCount: number,
): number {
  return (gridContentWidth - colGap * (columnCount - 1)) / columnCount;
}

/**
 * @param gridContentWidth Measured inner width of the scrolling grid, scrollbar
 *   already subtracted. This is the box the columns actually divide.
 * @param colGap Horizontal gutter between cards.
 */
export function resolveColumnCount(
  gridContentWidth: number,
  colGap: number,
): number {
  // Before the ResizeObserver reports, width can be 0 or NaN. Falling back to
  // the floor keeps first paint sane rather than dividing by nothing.
  if (!Number.isFinite(gridContentWidth) || gridContentWidth <= 0) {
    return MIN_COLUMNS;
  }

  let best = MIN_COLUMNS;
  let bestDrift = Infinity;

  for (let columns = MIN_COLUMNS; columns <= MAX_COLUMNS; columns++) {
    const drift = Math.abs(
      cardWidthFor(gridContentWidth, colGap, columns) - TARGET_CARD_WIDTH,
    );
    // Strict `<` keeps the fewer-columns/larger-card side of an exact tie,
    // which is the safer default for a catalogue of photographed stones.
    if (drift < bestDrift) {
      bestDrift = drift;
      best = columns;
    }
  }

  return best;
}
