/**
 * Colombian NIT (Número de Identificación Tributaria) verification helpers.
 *
 * The DIAN check-digit algorithm:
 *   1. Take the body digits (without the trailing DV).
 *   2. Multiply each digit by the corresponding weight from
 *      [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]
 *      applied right-to-left.
 *   3. Sum the products and take mod 11.
 *   4. If the remainder is 0 or 1, the DV equals the remainder.
 *      Otherwise the DV equals 11 − remainder.
 *
 * Used by the Fotosíntesis "Crear proveedor" drawer to validate a NIT inline
 * and suggest the canonical "<body>-<dv>" formatting (handoff §4.4).
 */

/** Weights for the DIAN NIT check-digit algorithm, weight[i] aligns with the
 * i-th digit from the right of the body. */
const WEIGHTS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

/** Body must be at least 6 digits (smallest real-world NIT we'd accept) and
 * at most 15 — that's the longest we have weights for. */
const MIN_BODY = 6;
const MAX_BODY = 15;

/**
 * Pull just the digits out of an input string. Accepts the typical Colombian
 * spellings: "901234567-8", "901234567 8", "9012345678", "901.234.567-8".
 */
function digitsOnly(input: string): string {
  return (input ?? "").replace(/[^0-9]/g, "");
}

/**
 * Compute the expected DV for a NIT body. Caller must pass body digits only
 * (no DV, no formatting). Throws on empty/over-length input — guard with
 * `verifyNit` if you don't want exceptions.
 */
export function computeNitCheckDigit(nitBody: string): number {
  const digits = digitsOnly(nitBody);
  if (digits.length < MIN_BODY || digits.length > MAX_BODY) {
    throw new Error(
      `NIT body must be ${MIN_BODY}-${MAX_BODY} digits long (got ${digits.length})`,
    );
  }

  let sum = 0;
  // Walk right-to-left so the rightmost body digit pairs with weight[0] = 3.
  for (let i = 0; i < digits.length; i += 1) {
    const digit = Number(digits[digits.length - 1 - i]);
    sum += digit * WEIGHTS[i];
  }
  const remainder = sum % 11;
  return remainder < 2 ? remainder : 11 - remainder;
}

export interface NitVerifyResult {
  valid: boolean;
  /** Canonical "<body>-<dv>" suggestion when the body parsed successfully.
   * Available even when `valid` is false (so the UI can offer a one-click
   * "Aplicar formato" affordance). Undefined for malformed input. */
  suggested?: string;
}

/**
 * Verify a Colombian NIT. Accepts the common input shapes ("901234567-8",
 * "901234567 8", "9012345678", "901.234.567-8") and returns whether the
 * supplied DV matches the computed one plus a canonical suggestion.
 *
 * Behaviour:
 * - `valid: true` only when a DV was supplied AND it matches the computed DV.
 * - `suggested` is the canonical "<body>-<dv>" string whenever the body alone
 *   is in the accepted length window — independent of `valid` so the UI can
 *   always offer to auto-correct.
 * - Empty / too-short / too-long / non-numeric input → `{ valid: false }`.
 */
export function verifyNit(nitWithDv: string): NitVerifyResult {
  if (typeof nitWithDv !== "string") return { valid: false };
  const digits = digitsOnly(nitWithDv);
  if (digits.length === 0) return { valid: false };

  // No separator present and the string is too short to plausibly contain
  // both a body and a DV → treat the whole thing as body. The UI can still
  // surface a suggested format once the user types a 7+ digit body.
  const hasSeparator = /[-\s]/.test(nitWithDv);
  if (!hasSeparator) {
    if (digits.length < MIN_BODY) return { valid: false };
    if (digits.length > MAX_BODY) return { valid: false };
    // Treat the whole string as body — we cannot mark it valid without a DV,
    // but we can still suggest the canonical form.
    try {
      const dv = computeNitCheckDigit(digits);
      return { valid: false, suggested: `${digits}-${dv}` };
    } catch {
      return { valid: false };
    }
  }

  // Has a separator: last digit is the supplied DV, everything before it is
  // the body. Strip the last digit from `digits` to get the body.
  if (digits.length < MIN_BODY + 1) {
    // Not enough digits even for a 6-digit body + DV. But still try to
    // suggest something useful if the body alone is workable.
    const bodyMaybe = digits.slice(0, -1);
    if (bodyMaybe.length >= MIN_BODY) {
      try {
        const dv = computeNitCheckDigit(bodyMaybe);
        return { valid: false, suggested: `${bodyMaybe}-${dv}` };
      } catch {
        return { valid: false };
      }
    }
    return { valid: false };
  }
  if (digits.length > MAX_BODY + 1) return { valid: false };

  const body = digits.slice(0, -1);
  const supplied = Number(digits.slice(-1));
  try {
    const expected = computeNitCheckDigit(body);
    return {
      valid: expected === supplied,
      suggested: `${body}-${expected}`,
    };
  } catch {
    return { valid: false };
  }
}
