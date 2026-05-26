export interface FotoInventarioColumn {
  header: string;
  key: string;
  /** column A — natural key (itemId), always set explicitly */
  id?: boolean;
  /** carry the existing sheet value through on patch (e.g. fechaIngreso) */
  preserve?: boolean;
}

export const FOTO_INVENTARIO_COLUMNS: FotoInventarioColumn[];
export const FOTO_INVENTARIO_HEADERS: string[];
export function columnIndexToLetter(index: number): string;
export const FOTO_INVENTARIO_LAST_COL: string;
