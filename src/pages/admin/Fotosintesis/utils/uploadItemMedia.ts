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
  fd.append("subPath", subPath);
  for (const file of files) {
    fd.append("file", file);
  }

  const res = await fetch("/api/media-upload", { method: "POST", body: fd });
  if (!res.ok) {
    throw new Error(`Drive upload HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    success?: boolean;
    urls?: string[];
    error?: string;
  };

  if (!data.success || !data.urls?.[0]) {
    throw new Error(data.error ?? "Drive devolvió respuesta sin URL");
  }

  return data.urls[0];
}

export async function uploadFotosintesisCertificado(
  file: File,
  loteId: string,
  itemId: string,
): Promise<string> {
  const url = await uploadFotosintesisImages([file], loteId, `${itemId}-cert`);
  if (!url) throw new Error("No se pudo subir el certificado");
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
  return `ventas/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
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
  fd.append("subPath", subPath);
  fd.append("file", file);

  const res = await fetch("/api/media-upload", { method: "POST", body: fd });
  if (!res.ok) {
    throw new Error(`Drive upload HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    success?: boolean;
    urls?: string[];
    error?: string;
  };

  if (!data.success || !data.urls?.[0]) {
    throw new Error(data.error ?? "Drive devolvió respuesta sin URL");
  }

  return data.urls[0];
}
