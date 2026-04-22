import { describe, it, expect } from 'vitest';
import { parseVaultCode } from '../src/utils/parseVaultCode';

describe('parseVaultCode', () => {
  it('parses valid "symbol:digit" string', () => {
    expect(parseVaultCode('corazon_verde:3')).toEqual({
      outer: 'corazon_verde',
      inner: 3,
    });
  });

  it('parses "esmeralda:7" (universal-like)', () => {
    expect(parseVaultCode('esmeralda:7')).toEqual({
      outer: 'esmeralda',
      inner: 7,
    });
  });

  it('returns null for null/empty input', () => {
    expect(parseVaultCode(null)).toBeNull();
    expect(parseVaultCode('')).toBeNull();
    expect(parseVaultCode('   ')).toBeNull();
  });

  it('returns null when symbol is unknown', () => {
    expect(parseVaultCode('unknown_symbol:3')).toBeNull();
    expect(parseVaultCode('xyz:5')).toBeNull();
  });

  it('returns null when digit is out of range', () => {
    expect(parseVaultCode('jaguar:10')).toBeNull();
    expect(parseVaultCode('jaguar:-1')).toBeNull();
    expect(parseVaultCode('jaguar:99')).toBeNull();
  });

  it('returns null when digit is not a number', () => {
    expect(parseVaultCode('jaguar:abc')).toBeNull();
    expect(parseVaultCode('jaguar:')).toBeNull();
  });

  it('returns null when format is wrong', () => {
    expect(parseVaultCode('jaguar')).toBeNull();
    expect(parseVaultCode(':3')).toBeNull();
    expect(parseVaultCode('jaguar:3:extra')).toBeNull();
  });

  it('trims whitespace', () => {
    expect(parseVaultCode('  jaguar:3  ')).toEqual({
      outer: 'jaguar',
      inner: 3,
    });
  });
});
