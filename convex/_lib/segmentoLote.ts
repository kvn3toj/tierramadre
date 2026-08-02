/**
 * Segmentación operacional/colección — dictamen de Kevin, punto 5,
 * 2026-08-02.
 *
 * `'coleccion'` es OTRO negocio, no una variante del operacional: piezas
 * reales, precio individual negociado, y NUNCA absorbe el gasto fijo mensual
 * de la comercializadora ni cuenta en el divisor D2 — así era el modelo
 * histórico, y es la razón de que `B6` (76) nunca incluyera estas piezas.
 *
 * La regla es el prefijo `LC-` del `loteId`: es la convención de nombres que
 * el propio SOT v3 ya usaba («Lote Colección»). No se inventa un criterio
 * nuevo — se codifica el que ya estaba en los datos.
 *
 * Puro: sin IO.
 */

export type SegmentoLote = 'operacional' | 'coleccion';

const PREFIJO_COLECCION = 'LC-';

export function inferirSegmentoLote(loteId: string): SegmentoLote {
  return loteId.startsWith(PREFIJO_COLECCION) ? 'coleccion' : 'operacional';
}
