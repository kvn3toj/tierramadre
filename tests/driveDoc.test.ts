import { describe, it, expect } from 'vitest';
import { isAllowedDocMime } from '../api/_lib/driveDoc';

describe('isAllowedDocMime', () => {
  it('allows pdf', () => {
    expect(isAllowedDocMime('application/pdf')).toBe(true);
  });

  it('rejects html so the proxy can never serve a stored-XSS payload', () => {
    expect(isAllowedDocMime('text/html')).toBe(false);
  });

  it('rejects svg — renderable, so it carries the same XSS risk as html', () => {
    expect(isAllowedDocMime('image/svg+xml')).toBe(false);
  });

  it('rejects an empty mime', () => {
    expect(isAllowedDocMime('')).toBe(false);
  });

  it('is exact, not a prefix match', () => {
    expect(isAllowedDocMime('application/pdf; charset=utf-8')).toBe(false);
  });
});
