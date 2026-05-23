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
