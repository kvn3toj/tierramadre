/**
 * Drive Proxy Image Utility
 *
 * Helpers for URLs served by `/api/serve-drive-image`, the Drive proxy.
 * Generates responsive srcSet variants so grid cards on mobile download the
 * 200px thumb instead of the 400px one, and detail views can reach for 800px.
 *
 * Backend size presets (must stay in sync with api/serve-drive-image.js):
 *   thumb: 200 | small: 400 | medium: 800 | large: 1200 | original: full
 */

const SIZE_PRESETS: Record<string, number> = {
  thumb: 200,
  small: 400,
  medium: 800,
  large: 1200,
};

const DRIVE_PROXY_PATH = '/api/serve-drive-image';

export function isDriveProxyUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return url.includes(DRIVE_PROXY_PATH);
}

/**
 * Replace (or set) the `size` query param on a Drive proxy URL.
 * Works for root-relative URLs like `/api/serve-drive-image?fileId=X&size=small`.
 */
export function withSize(url: string, size: keyof typeof SIZE_PRESETS | 'original'): string {
  if (!isDriveProxyUrl(url)) return url;

  const [path, query = ''] = url.split('?');
  const params = new URLSearchParams(query);

  if (size === 'original') {
    params.delete('size');
  } else {
    params.set('size', size);
  }

  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * Generate a srcSet string using the backend's preset sizes.
 * Browser picks the closest variant based on the `sizes` attribute + DPR.
 *
 * Default presets cover grid card needs: 200w for 1-2 col mobile, 400w for
 * 3-col tablet, 800w for 4-col desktop at 2x DPR.
 */
export function getDriveProxySrcSet(
  url: string,
  sizes: ReadonlyArray<keyof typeof SIZE_PRESETS> = ['thumb', 'small', 'medium']
): string {
  if (!isDriveProxyUrl(url)) return '';

  return sizes
    .map((size) => `${withSize(url, size)} ${SIZE_PRESETS[size]}w`)
    .join(', ');
}
