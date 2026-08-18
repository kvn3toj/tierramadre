/**
 * Proyección de `products.fotoUrls`: de la fila completa de productInventory
 * (81 campos, varios comerciales) a lo ÚNICO que el overlay del catálogo
 * necesita. Separada de la query para poder testearla sin arnés de Convex
 * (mismo patrón que sheetPullMaps).
 */
export interface FotoUrlRow {
  itemId: string;
  fotoUrl: string;
}

export function projectFotoUrls(
  rows: Array<{ itemId: string; fotoUrl?: unknown }>,
): FotoUrlRow[] {
  const out: FotoUrlRow[] = [];
  for (const row of rows) {
    if (typeof row.fotoUrl === 'string' && row.fotoUrl.trim() !== '') {
      out.push({ itemId: row.itemId, fotoUrl: row.fotoUrl });
    }
  }
  return out;
}
