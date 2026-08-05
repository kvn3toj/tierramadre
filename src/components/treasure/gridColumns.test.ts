/**
 * gridColumns — the promise that swapping viewport breakpoints for container
 * measurement did not quietly redesign the catalog on every other device.
 *
 * Two things get pinned here. First, the card width: whatever count the rule
 * picks, the card it produces has to stay near the Quiet Emerald target, which
 * is the entire point of measuring the container instead of the window. Second,
 * the device table — each row is a real viewport running the real layout chain,
 * and where the count is unchanged from the breakpoint ladder it must stay
 * unchanged. Moving iPad landscape off 3 columns is a product decision, and it
 * should have to break a test to happen.
 *
 * Grid widths come from the shell chain, not from guesses:
 *   viewport → min(viewport, band) − 64 shell px − 48 browser px − scrollbar
 * where band is --maxw-wide (1536) for the catalog.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveColumnCount,
  cardWidthFor,
  MIN_COLUMNS,
  MAX_COLUMNS,
  TARGET_CARD_WIDTH,
} from './gridColumns';

const WIDE_COL_GAP = 24;

describe('resolveColumnCount', () => {
  describe('the device table', () => {
    const cases = [
      // Unchanged from the breakpoint ladder it replaces.
      {
        device: 'iPad landscape 1024',
        gridWidth: 897,
        columns: 3,
        card: 283,
        note: 'unchanged',
      },
      // Changed — and both changes are the point of the work.
      {
        device: 'MacBook 1440 (band now fills the screen)',
        gridWidth: 1298,
        columns: 5,
        card: 240,
        note: 'was 4 columns in a 1160 band, same 240px card',
      },
      {
        device: 'Desktop 1800',
        gridWidth: 1409,
        columns: 5,
        card: 263,
        note: 'was 5 columns in a 1033 grid — 187px cards',
      },
      {
        device: '27-inch 2560',
        gridWidth: 1409,
        columns: 5,
        card: 263,
        note: 'band caps at 1536, so a bigger monitor buys margin, not columns',
      },
    ];

    it.each(cases)(
      '$device → $columns columns at ~$card px ($note)',
      ({ gridWidth, columns, card }) => {
        expect(resolveColumnCount(gridWidth, WIDE_COL_GAP)).toBe(columns);
        expect(Math.round(cardWidthFor(gridWidth, WIDE_COL_GAP, columns))).toBe(
          card,
        );
      },
    );
  });

  it('never returns the 187px card the viewport ladder produced', () => {
    // The regression that started all this: 5 columns chosen from window width
    // and handed a 1033px grid, because the container was capped at 1160.
    expect(Math.round(cardWidthFor(1033, WIDE_COL_GAP, 5))).toBe(187);

    const columns = resolveColumnCount(1033, WIDE_COL_GAP);
    expect(columns).toBe(4);
    expect(Math.round(cardWidthFor(1033, WIDE_COL_GAP, columns))).toBe(240);
  });

  it('picks the closest-fitting card, not the closest width ratio', () => {
    // 1298px is the case that exposed the difference. Rounding the ratio
    // (1298+24)/(270+24) = 4.49 lands on 4 → 306px cards; comparing the cards
    // themselves shows 5 → 240px is nearer the 270 target. Card width falls as
    // 1/N, so these two methods genuinely disagree.
    const four = Math.abs(
      cardWidthFor(1298, WIDE_COL_GAP, 4) - TARGET_CARD_WIDTH,
    );
    const five = Math.abs(
      cardWidthFor(1298, WIDE_COL_GAP, 5) - TARGET_CARD_WIDTH,
    );

    expect(five).toBeLessThan(four);
    expect(resolveColumnCount(1298, WIDE_COL_GAP)).toBe(5);
  });

  it('holds the card near the target across every container width in range', () => {
    // Between the clamps, no width may produce a card further from the target
    // than the choice it rejected. This is the property the whole module exists
    // to guarantee, so assert it exhaustively rather than at sampled points.
    for (let gridWidth = 900; gridWidth <= 2400; gridWidth += 1) {
      const columns = resolveColumnCount(gridWidth, WIDE_COL_GAP);
      if (columns <= MIN_COLUMNS || columns >= MAX_COLUMNS) continue;

      const chosen = Math.abs(
        cardWidthFor(gridWidth, WIDE_COL_GAP, columns) - TARGET_CARD_WIDTH,
      );
      for (const other of [columns - 1, columns + 1]) {
        const alt = Math.abs(
          cardWidthFor(gridWidth, WIDE_COL_GAP, other) - TARGET_CARD_WIDTH,
        );
        expect(chosen).toBeLessThanOrEqual(alt);
      }
    }
  });

  it('keeps the card readable at both clamps', () => {
    // A narrow tablet-landscape grid must not be sliced past three columns...
    expect(resolveColumnCount(700, WIDE_COL_GAP)).toBe(MIN_COLUMNS);
    // ...and a very wide one must not keep adding them forever. Unreachable
    // while --maxw-wide caps the band at 1536 (a 27" display gets margin, not
    // columns) — this guard is here for whenever that cap moves or the catalog
    // goes full-bleed, so the ceiling is already decided when it does.
    expect(resolveColumnCount(9000, WIDE_COL_GAP)).toBe(MAX_COLUMNS);
  });

  it('survives the pre-measurement frame without dividing by nothing', () => {
    expect(resolveColumnCount(0, WIDE_COL_GAP)).toBe(MIN_COLUMNS);
    expect(resolveColumnCount(NaN, WIDE_COL_GAP)).toBe(MIN_COLUMNS);
    expect(resolveColumnCount(-50, WIDE_COL_GAP)).toBe(MIN_COLUMNS);
  });
});
