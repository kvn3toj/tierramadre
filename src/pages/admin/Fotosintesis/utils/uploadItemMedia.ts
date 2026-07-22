import { compressImage } from '../../../../utils/mediaCompressor';

/**
 * Downscale + re-encode an image to JPEG before upload so a full-resolution
 * phone/gem photo (often 5–15 MB) stays comfortably under Vercel's ~4.5 MB
 * serverless request-body limit — the platform rejects an over-limit body with
 * a 413 *before* the function runs, which is why oversized item photos silently
 * failed to attach. Non-images (e.g. a PDF certificado) pass through untouched.
 * If the browser can't decode the source (e.g. HEIC on Chrome), we fall back to
 * the original file rather than dropping the upload — no worse than before, and
 * on Safari the HEIC→JPEG conversion also fixes photos that uploaded but
 * wouldn't render via `uc?export=view`.
 */
async function toUploadable(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  try {
    const { file: compressed } = await compressImage(file, {
      maxWidth: 2000,
      maxHeight: 2000,
      quality: 0.85,
    });
    // compressImage emits image/jpeg but keeps the source name — give it a .jpg
    // name so Drive stores/serves it as JPEG (the endpoint derives the extension
    // from the filename).
    const base = file.name.replace(/\.[^./\\]+$/, '') || 'foto';
    return new File([compressed], `${base}.jpg`, {
      type: 'image/jpeg',
      lastModified: compressed.lastModified,
    });
  } catch {
    return file;
  }
}

/**
 * Upload Fotosíntesis item media to Google Drive via `/api/media-upload`.
 * Returns the first image URL (hero) when multiple files are sent.
 */
export async function uploadFotosintesisImages(
  files: File[],
  loteId: string,
  itemId?: string,
): Promise<string | undefined> {
  if (files.length === 0) return undefined;

  const subPath = itemId
    ? `fotosintesis/${loteId}/${itemId}`
    : `fotosintesis/${loteId}/draft`;

  const fd = new FormData();
  fd.append('subPath', subPath);
  for (const file of files) {
    fd.append('file', await toUploadable(file));
  }

  const res = await fetch('/api/media-upload', { method: 'POST', body: fd });
  if (!res.ok) {
    throw new Error(`Drive upload HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    success?: boolean;
    urls?: string[];
    error?: string;
  };

  if (!data.success || !data.urls?.[0]) {
    throw new Error(data.error ?? 'Drive devolvió respuesta sin URL');
  }

  return data.urls[0];
}

/**
 * Folder-name cleaner — MUST stay byte-for-byte aligned with
 * `api/create-product-folders.js#cleanName` + `buildFolderName` so a photo
 * uploaded here lands in the SAME `{item} - {nombre}` folder the auto-sync cron
 * creates (no duplicate folders).
 */
function cleanFolderName(nombre?: string): string {
  const c = (nombre ?? '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  return c || 'Sin Nombre';
}

/**
 * Upload item photos to the CANONICAL per-item folder the catalog gallery serves
 * from: `products/{item} - {nombre}/` (the `products` folder is the Drive root at
 * runtime, so the bare `{item} - {nombre}` subPath resolves there). This unifies
 * capture with the folder-scan gallery (`get-drive-images` / `get-batch-thumbnails`)
 * — hero, gallery, and the folder link in the SOT all point at ONE place.
 * Older photos under `fotosintesis/{lote}/{item}/` keep working via their stored
 * `fotoUrl`; only new uploads land in the unified location.
 */
export async function uploadItemImages(
  files: File[],
  itemId: string,
  nombre?: string,
): Promise<string | undefined> {
  if (files.length === 0) return undefined;

  const subPath = `${itemId} - ${cleanFolderName(nombre)}`;

  const fd = new FormData();
  fd.append('subPath', subPath);
  for (const file of files) {
    fd.append('file', await toUploadable(file));
  }

  const res = await fetch('/api/media-upload', { method: 'POST', body: fd });
  if (!res.ok) {
    throw new Error(`Drive upload HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    success?: boolean;
    urls?: string[];
    error?: string;
  };

  if (!data.success || !data.urls?.[0]) {
    throw new Error(data.error ?? 'Drive devolvió respuesta sin URL');
  }

  return data.urls[0];
}

export async function uploadFotosintesisCertificado(
  file: File,
  loteId: string,
  itemId: string,
): Promise<string> {
  const url = await uploadFotosintesisImages([file], loteId, `${itemId}-cert`);
  if (!url) throw new Error('No se pudo subir el certificado');
  return url;
}

/**
 * Drive folder a sale document is filed under: `ventas/YYYY/MM` for the given
 * date. Deriving from the SALE's date (not "now") keeps a regenerated carnet for
 * an old sale in the month it actually happened. Falls back to the current month
 * for an invalid/missing date.
 */
export function ventasSubPath(date: Date = new Date()): string {
  const d = Number.isNaN(date.getTime()) ? new Date() : date;
  return `ventas/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Normalize a Google Drive URL to the in-browser PDF **viewer** form. The upload
 * endpoint historically returned `drive.google.com/uc?export=view&id=ID` for sale
 * documents, which a browser can't render as a PDF (it downloads or shows a
 * "can't preview" page → the broken "Abrir Kardex" link). Rewriting to
 * `file/d/ID/view` fixes documents already persisted with the old shape, with no
 * re-upload. Only use for PDFs: image embeds still need `uc?export=view`.
 * Already-viewer URLs and non-Drive URLs pass through untouched.
 */
export function driveDocViewUrl(url: string | undefined): string | undefined {
  if (!url || !/drive\.google\.com\/uc\?/.test(url)) return url;
  const idMatch = url.match(/[?&]id=([\w-]+)/);
  return idMatch ? `https://drive.google.com/file/d/${idMatch[1]}/view` : url;
}

/**
 * Upload a sale document (carnet/kardex or certificate) to Drive and return its
 * URL. Shares the same `/api/media-upload` contract as the item-media helpers so
 * the sale-detail re-upload affordance (ISO-audit C6) and sale creation use one
 * path. The file is sent verbatim (extension preserved). Default subPath mirrors
 * the create-sale flow: `ventas/YYYY/MM`.
 */
export async function uploadVentaDocument(
  file: File,
  opts?: { subPath?: string },
): Promise<string> {
  const subPath = opts?.subPath ?? ventasSubPath();

  const fd = new FormData();
  fd.append('subPath', subPath);
  fd.append('file', file);

  const res = await fetch('/api/media-upload', { method: 'POST', body: fd });
  if (!res.ok) {
    throw new Error(`Drive upload HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    success?: boolean;
    urls?: string[];
    error?: string;
  };

  if (!data.success || !data.urls?.[0]) {
    throw new Error(data.error ?? 'Drive devolvió respuesta sin URL');
  }

  return data.urls[0];
}
