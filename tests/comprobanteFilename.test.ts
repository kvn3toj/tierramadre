import { describe, it, expect } from 'vitest';
import { comprobanteFilename } from '../src/pages/admin/Fotosintesis/comprobanteFilename';

describe('comprobanteFilename', () => {
  it('builds the pdf name from the kardex event id', () => {
    expect(comprobanteFilename('KDX-1784-abc123')).toBe(
      'kardex-KDX-1784-abc123.pdf',
    );
  });

  it('rejects an empty event id', () => {
    expect(() => comprobanteFilename('')).toThrow(
      'kardexEventId es obligatorio',
    );
  });

  it('strips path separators so the name can never escape its folder', () => {
    // Every disallowed char ('/' and '.') is replaced 1:1 with '_' — the
    // brief's own worked example undercounted by one underscore (6 instead
    // of 7) relative to its own verbatim implementation (Step 3's
    // `replace(/[^A-Za-z0-9-]/g, '_')`); this asserts what that
    // implementation actually produces.
    expect(comprobanteFilename('KDX-1/../../etc')).toBe(
      'kardex-KDX-1_______etc.pdf',
    );
  });
});
