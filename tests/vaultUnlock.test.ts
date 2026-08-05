/**
 * N5 (2026-08 fix round 3): api/vault-unlock.ts verifies a submitted Bóveda
 * Secreta combination server-side instead of shipping the code list to the
 * browser. This covers the two self-contained pieces: the reimplemented
 * `parseVaultCode` (duplicated from src/utils/parseVaultCode.ts to avoid
 * that module's transitive design-system import breaking api/tsconfig's
 * type-check — see the comment in vault-unlock.ts) and a drift guard
 * proving the duplicated symbol list still matches the real one.
 */
import { describe, it, expect } from 'vitest';
import { parseVaultCode, VALID_SYMBOL_IDS } from '../api/vault-unlock';
import { VAULT_SYMBOLS } from '../src/config/vault';

describe('VALID_SYMBOL_IDS (api/vault-unlock.ts) — drift guard', () => {
  it('matches VAULT_SYMBOLS (src/config/vault.ts) exactly', () => {
    const real = new Set(VAULT_SYMBOLS.map((s) => s.id));
    expect(VALID_SYMBOL_IDS).toEqual(real);
  });
});

describe('parseVaultCode (api/vault-unlock.ts)', () => {
  it('parses a well-formed "symbol:digit" code', () => {
    expect(parseVaultCode('corazon_verde:3')).toEqual({
      outer: 'corazon_verde',
      inner: 3,
    });
  });

  it('trims surrounding whitespace', () => {
    expect(parseVaultCode(' jaguar:7 ')).toEqual({ outer: 'jaguar', inner: 7 });
  });

  it('rejects null/undefined/empty', () => {
    expect(parseVaultCode(null)).toBeNull();
    expect(parseVaultCode(undefined)).toBeNull();
    expect(parseVaultCode('')).toBeNull();
    expect(parseVaultCode('   ')).toBeNull();
  });

  it('rejects an unknown symbol', () => {
    expect(parseVaultCode('dragon:3')).toBeNull();
  });

  it('rejects a digit outside 0-9', () => {
    expect(parseVaultCode('sol:10')).toBeNull();
    expect(parseVaultCode('sol:-1')).toBeNull();
  });

  it('rejects a malformed digit ("3abc", "3.5")', () => {
    expect(parseVaultCode('sol:3abc')).toBeNull();
    expect(parseVaultCode('sol:3.5')).toBeNull();
  });

  it('rejects the wrong shape (missing colon, extra parts)', () => {
    expect(parseVaultCode('sol')).toBeNull();
    expect(parseVaultCode('sol:3:extra')).toBeNull();
  });
});
