import { describe, it, expect } from 'vitest';
import {
  emeraldCore,
  goldAccent,
  glassLight,
  glassDark,
  glassEmerald,
  glassGold,
  chartColors,
  medalColors,
  goldGradients,
  goldShadows,
} from '../src/design-system';

const GOLD_HEXES = [
  '#D4AF37',
  '#E5C866',
  '#F5E6A3',
  '#FDF8E8',
  '#B8941F',
  '#8F7318',
  '#665210',
  '#FFD700',
];

describe('Quiet Emerald shim', () => {
  it('drops every gold hex from goldAccent', () => {
    const values = Object.values(goldAccent).map((v) => v.toUpperCase());
    for (const g of GOLD_HEXES) expect(values).not.toContain(g);
  });

  it('keeps emeraldCore on the QE emerald', () => {
    // #00C992 since the 2026 "renovación" rebrand — read from the vector fills
    // of the brand manual (docs/brand/renovacion-2026/). It was #00AF84, the
    // green of the superseded mark.
    expect(emeraldCore.primary.toUpperCase()).toBe('#00C992');
  });

  it('flattens every glass variant (no backdrop blur)', () => {
    const all = [glassLight, glassDark, glassEmerald, glassGold];
    for (const map of all) {
      for (const effect of Object.values(map)) {
        expect(effect.backdropFilter).toBe('none');
        expect(effect.WebkitBackdropFilter).toBe('none');
      }
    }
  });

  it('keeps gold out of the de-golded token exports', () => {
    const GOLD = [...GOLD_HEXES, '212, 175, 55', '212,175,55'];
    const blobs = [chartColors, medalColors, goldGradients, goldShadows].map(
      (o) => JSON.stringify(o).toUpperCase(),
    );
    for (const blob of blobs) {
      for (const g of GOLD) expect(blob).not.toContain(g.toUpperCase());
    }
  });
});
