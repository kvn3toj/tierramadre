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
  const now = new Date();
  const subPath =
    opts?.subPath ??
    `ventas/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;

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
