/**
 * Mime allowlist for `serve-drive-doc`.
 *
 * Allowlist, not a blocklist: this proxy streams bytes from Drive under our
 * OWN origin, so anything the browser renders (html, svg) would be a
 * stored-XSS vector. Only the formats the kardex/certificado flows actually
 * archive get through.
 *
 * Exact match, not `startsWith`: a `; charset=` suffix on a mime we didn't
 * vet is exactly the kind of thing a prefix check waves past.
 */
const ALLOWED_DOC_MIMES = ['application/pdf'];

export function isAllowedDocMime(mime: string): boolean {
  return ALLOWED_DOC_MIMES.includes(mime);
}
