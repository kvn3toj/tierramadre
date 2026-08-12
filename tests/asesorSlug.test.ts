/**
 * N5 (2026-08 fix round 3): extracted from api/get-asesores.ts's inline
 * slug logic so api/vault-unlock.ts can hand back a slug that matches
 * `/ambassadors/:slug` and useAsesores.ts's `slug` field exactly — a
 * different algorithm producing a different slug for the same name would
 * silently desync the two. These pin the exact transformation rules.
 */
import { describe, it, expect } from 'vitest';
import { slugifyAsesorName } from '../api/_lib/asesorSlug';

describe('slugifyAsesorName', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugifyAsesorName('Maria Campuzano')).toBe('maria-campuzano');
  });

  it('strips accents/diacritics', () => {
    expect(slugifyAsesorName('José Andrés Núñez')).toBe('jose-andres-nunez');
  });

  it('strips characters outside [a-z0-9-]', () => {
    expect(slugifyAsesorName("D'Angelo O'Brien!")).toBe('dangelo-obrien');
  });

  it('collapses runs of whitespace to a single hyphen', () => {
    expect(slugifyAsesorName('Ana   Maria')).toBe('ana-maria');
  });
});
