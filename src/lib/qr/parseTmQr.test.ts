import { describe, expect, it } from 'vitest';
import { parseTmQr } from './parseTmQr';

/** Narrow to the item variant so `.itemId` is typed; fails loudly otherwise. */
function itemOf(input: string): { itemId: string; raw: string } {
  const r = parseTmQr(input);
  if (r.kind !== 'item') throw new Error(`expected item, got ${r.kind}`);
  return r;
}

describe('parseTmQr', () => {
  it('decodes the canonical product URL', () => {
    expect(parseTmQr('https://tierramadre.app/product/B-001-G1')).toEqual({
      kind: 'item',
      itemId: 'B-001-G1',
      raw: 'https://tierramadre.app/product/B-001-G1',
    });
  });

  it('decodes a numeric item id in a URL', () => {
    expect(itemOf('https://tierramadre.app/product/368').itemId).toBe('368');
  });

  it('tolerates trailing slash, query and hash', () => {
    expect(itemOf('https://tierramadre.app/product/368/?utm=x#top').itemId).toBe('368');
  });

  it('accepts a no-scheme host form', () => {
    expect(itemOf('tierramadre.app/product/B-002-J3').itemId).toBe('B-002-J3');
  });

  it('accepts a bare item id (manual fallback)', () => {
    expect(parseTmQr('B-001-G1')).toEqual({ kind: 'item', itemId: 'B-001-G1', raw: 'B-001-G1' });
    expect(itemOf('  368  ').itemId).toBe('368');
  });

  it('recognises a vitrina share link as NOT an item', () => {
    expect(parseTmQr('https://tierramadre.app/v/AB3K9P')).toEqual({
      kind: 'vitrina',
      token: 'AB3K9P',
      raw: 'https://tierramadre.app/v/AB3K9P',
    });
  });

  it('returns other for arbitrary urls and junk', () => {
    expect(parseTmQr('https://example.com/hello').kind).toBe('other');
    expect(parseTmQr('hello world').kind).toBe('other');
    expect(parseTmQr('').kind).toBe('other');
    expect(parseTmQr(null).kind).toBe('other');
  });
});
