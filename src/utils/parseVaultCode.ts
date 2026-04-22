import { VAULT_SYMBOLS } from '../config/vault';
import type { VaultCombination, VaultSymbolId } from '../types/vault';

const VALID_SYMBOL_IDS = new Set<string>(VAULT_SYMBOLS.map((s) => s.id));

/**
 * Parses a string of shape "symbol:digit" into a VaultCombination.
 * Returns null for any malformed input.
 *
 * Accepted: "corazon_verde:3", " jaguar:7 " (trimmed).
 * Rejected: null, empty, unknown symbol, digit outside 0-9, bad format.
 */
export function parseVaultCode(raw: string | null | undefined): VaultCombination | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  const parts = trimmed.split(':');
  if (parts.length !== 2) return null;

  const [symbol, digitStr] = parts;
  if (!symbol || !digitStr) return null;
  if (!VALID_SYMBOL_IDS.has(symbol)) return null;

  const inner = Number.parseInt(digitStr, 10);
  if (!Number.isInteger(inner)) return null;
  if (inner < 0 || inner > 9) return null;
  if (String(inner) !== digitStr.trim()) return null; // rejects "3abc", "3.5"

  return { outer: symbol as VaultSymbolId, inner };
}
