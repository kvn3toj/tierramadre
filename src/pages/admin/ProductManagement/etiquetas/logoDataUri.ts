/**
 * logoDataUri — load the Tierra Mädre logo-symbol once and hand it back as a
 * base64 `data:` URI (cached for the session).
 *
 * Why a data URI and not just the `/logo-symbol.png` URL: the etiquetas
 * gallery embeds the logo in the CENTRE of each QR (qrcode.react
 * `imageSettings`), which renders it as an SVG `<image href>`. When that label
 * node is later rasterized by exportLabel (snapDOM / html2canvas, off-screen),
 * a network-URL `<image>` is not guaranteed to be decoded at capture time —
 * exportLabel's `waitForImages` only awaits `<img>` elements, not SVG
 * `<image>`. A `data:` URI carries the bytes inline, so the rasterizers embed
 * it synchronously and the printed QR never comes out with a blank centre.
 *
 * The promise is cached so the fetch+decode happens at most once per session;
 * a failed load clears the cache so a later caller can retry.
 */

const LOGO_URL = '/logo-symbol.png';

let cached: Promise<string> | null = null;

export function loadLogoDataUri(): Promise<string> {
  if (cached) return cached;
  cached = fetch(LOGO_URL)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`No se pudo cargar el logo (${res.status})`);
      }
      return res.blob();
    })
    .then(
      (blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () =>
            reject(reader.error ?? new Error('FileReader falló'));
          reader.readAsDataURL(blob);
        }),
    );
  // Let a transient failure be retried rather than sticking a rejected promise.
  cached.catch(() => {
    cached = null;
  });
  return cached;
}
