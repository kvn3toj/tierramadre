/**
 * Resolving an asesor's email address out of the Sheets roster.
 *
 * WHY THIS IS NOT `findColumnIndex(headers, [...])`
 *
 * `findColumnIndex` (sheets-helpers.js:89) matches on substring —
 * `header.includes(pattern)` — and returns the first header that matches ANY
 * pattern. `get-asesores.ts` used to call it with `['instagram', 'ig', 'email']`,
 * which fails twice over:
 *
 *   - `'ig'` is two characters and substring-matches `Codigo`, `Origen`,
 *     `Digital`, `Vigencia` — all ordinary roster columns. Whichever sits
 *     leftmost wins, so the ambassador's "email" could be their vault code.
 *   - `'instagram'` precedes `'email'`, so a sheet with both columns filled
 *     resolves to the Instagram handle.
 *
 * The failure is silent and expensive: `isProfileOwner`
 * (AsesorProfilePage.tsx:170-175) compares the signed-in Google address to
 * this value, so a wrong resolution locks the ambassador out of editing their
 * own profile with no error shown anywhere.
 *
 * Two defences here, deliberately independent:
 *   1. `resolveEmailColumnIndex` — exact header match before substring, real
 *      email aliases before the legacy Instagram fallback, and never a
 *      two-letter pattern.
 *   2. `toAsesorEmail` — value-level. Even if resolution picks the wrong
 *      column, a value that is not an address becomes null rather than
 *      travelling onward as one.
 */

/** Lowercase, strip accents, collapse whitespace. Accents matter: the roster
 *  header is "Correo electrónico" as often as not. */
function normalizeHeader(header: unknown): string {
  return String(header ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Headers that genuinely denote an email address. Longest first so that
 *  "correo electronico" is recognised as itself rather than as "correo". */
const EMAIL_HEADER_ALIASES = [
  'correo electronico',
  'e-mail',
  'email',
  'correo',
  'mail',
] as const;

/**
 * Legacy: older rosters kept the address in the Instagram column, which is
 * how the original alias list came to include it. Kept as a LAST resort so
 * those sheets do not lose `isOwner` the day this ships — but it can no
 * longer outrank a real email column, and `toAsesorEmail` still rejects an
 * actual handle if that is what the cell holds.
 */
const LEGACY_EMAIL_HEADER_ALIASES = ['instagram'] as const;

function findByAliases(
  headers: readonly string[],
  aliases: readonly string[],
): number {
  const normalized = headers.map(normalizeHeader);
  // Exact match wins outright — an "Email" column is never ambiguous.
  for (const alias of aliases) {
    const exact = normalized.indexOf(alias);
    if (exact !== -1) return exact;
  }
  // Only then fall back to substring, so "Correo del asesor" still resolves.
  for (const alias of aliases) {
    const partial = normalized.findIndex(
      (h) => h.length > 0 && h.includes(alias),
    );
    if (partial !== -1) return partial;
  }
  return -1;
}

/** Index of the email column, or -1. Never matches on a short pattern. */
export function resolveEmailColumnIndex(headers: readonly string[]): number {
  const direct = findByAliases(headers, EMAIL_HEADER_ALIASES);
  if (direct !== -1) return direct;
  return findByAliases(headers, LEGACY_EMAIL_HEADER_ALIASES);
}

/** Deliberately strict: exactly one @, a dot in the domain, no whitespace. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Normalises a roster cell into a comparable address, or null.
 *
 * Lowercased and trimmed because `isProfileOwner` compares it against
 * `googleUser.email` and spreadsheet copy/paste routinely carries stray case
 * and whitespace.
 */
export function toAsesorEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return EMAIL_RE.test(trimmed) ? trimmed : null;
}
