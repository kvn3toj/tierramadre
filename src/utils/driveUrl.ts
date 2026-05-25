/**
 * Google Drive URL helpers.
 *
 * Drive image URLs are routed through the `/api/serve-drive-image` proxy for
 * reliable loading (CORS, auth, retries). Extracted from useTreasure so the
 * product detail page can convert Fotosíntesis lote/item photo URLs the same
 * way the grid does.
 */

/** Extract a Google Drive file id from the common URL shapes. */
export function extractDriveFileId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/, // /file/d/FILE_ID/
    /\/d\/([a-zA-Z0-9_-]+)/, // /d/FILE_ID/
    /id=([a-zA-Z0-9_-]+)/, // ?id=FILE_ID
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

/**
 * Convert a Google Drive URL to the proxy URL for reliable loading.
 * Non-Drive URLs are returned unchanged.
 */
export function convertToProxyUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  if (
    url.includes("drive.google.com") ||
    url.includes("lh3.googleusercontent.com")
  ) {
    const fileId = extractDriveFileId(url);
    if (fileId) {
      return `/api/serve-drive-image?fileId=${fileId}`;
    }
  }
  return url;
}
