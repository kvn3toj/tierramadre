/**
 * Las dos puertas de la Tienda — sólo estructura; la copia sale de
 * `t.tienda.categorias[key]`.
 *
 * Ojo con la ruta de "Símbolos Renacer": la clave es `simbolos`, nunca
 * `renacer`. El namespace `/renacer/*` pertenece a la campaña de donación, y
 * sus URLs `/renacer/k/{codigo}` y `/renacer/b/{numero}` están impresas en
 * tarjetas físicas desde el 2026-08-25, así que son contratos permanentes.
 * El nombre visible sí conserva "Renacer".
 */
import type { TiendaCategoria } from '../types/tienda';

export const TIENDA_CATEGORIAS: readonly TiendaCategoria[] = [
  { key: 'joyeria', imagen: '/gallery/rings/_MG_2784.JPG' },
  { key: 'simbolos', imagen: '/gallery/gems/_MG_3018.JPG' },
] as const;
