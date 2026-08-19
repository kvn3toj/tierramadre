/**
 * Parsing helpers for Google Drive URLs stored as plain strings
 * (e.g. `carpetaFotosUrl` in Convex `productInventory`).
 *
 * Standalone module (no googleapis import) so it can be unit-tested
 * without dragging the Drive client into the test environment.
 */

/**
 * Extract a Google Drive folder ID from a stored folder reference.
 *
 * Accepts full folder URLs (`drive.google.com/drive/folders/<id>`, with or
 * without `/u/N/` and query params), `open?id=` links, and bare IDs.
 *
 * @param {unknown} ref - The stored URL or ID
 * @returns {string|null} The folder ID, or null when nothing ID-shaped is found
 */
export function extractDriveFolderId(ref) {
  if (typeof ref !== 'string') return null;
  const value = ref.trim();
  if (!value) return null;

  const folderMatch = value.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];

  const idParamMatch = value.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch) return idParamMatch[1];

  if (/^[a-zA-Z0-9_-]{20,}$/.test(value)) return value;

  return null;
}
