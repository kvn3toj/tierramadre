import { describe, it, expect } from 'vitest';
import {
  emeraldCore,
  goldAccent,
  glassLight,
  glassDark,
  glassEmerald,
  glassGold,
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
    expect(emeraldCore.primary.toUpperCase()).toBe('#00AF84');
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
});
