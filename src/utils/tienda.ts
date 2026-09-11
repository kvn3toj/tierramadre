/**
 * Búsquedas y derivaciones sobre el fixture de la Tienda.
 *
 * Todo es síncrono: el catálogo es un `import`, no una petición. Eso es lo que
 * deja a las pantallas sin estado de carga y satisface de entrada la ley
 * anti-parpadeo (inicialización síncrona, sin re-render de relleno).
 */
import {
  METAL_KEYS,
  METAL_POR_DEFECTO,
  TIENDA_PRODUCTOS,
  TOPE_TRANSACCION_COP,
} from '../data/tienda';
import { TIENDA_CATEGORIAS } from '../data/tiendaCategorias';
import type {
  MetalKey,
  StoreProduct,
  StoreProductSlug,
  StoreVariant,
  TiendaCategoria,
  TiendaCategoriaKey,
} from '../types/tienda';

export function findCategoria(key?: string): TiendaCategoria | undefined {
  return TIENDA_CATEGORIAS.find((c) => c.key === key);
}

export function findProducto(slug?: string): StoreProduct | undefined {
  return TIENDA_PRODUCTOS.find((p) => p.slug === slug);
}

export function productosDe(
  categoria: TiendaCategoriaKey,
): readonly StoreProduct[] {
  return TIENDA_PRODUCTOS.filter((p) => p.categoria === categoria);
}

/** Una familia tiene eje de metal cuando sus variantes lo declaran. Se lee de
 *  los datos y no de la categoría, para que darle monturas a los Símbolos no
 *  obligue a tocar ninguna pantalla. */
export function tieneEjeDeMetal(producto: StoreProduct): boolean {
  return producto.variantes.some((v) => v.metal !== null);
}

/** Nunca lanza ni devuelve vacío: un `?metal=` desconocido cae en Plata. */
export function parseMetalParam(raw: string | null): MetalKey {
  return METAL_KEYS.find((m) => m === raw) ?? METAL_POR_DEFECTO;
}

/** La variante de la montura pedida; si la familia no tiene eje de metal (o la
 *  montura no existe para ella) devuelve la primera, que siempre existe. */
export function variantFor(
  producto: StoreProduct,
  metal: MetalKey,
): StoreVariant {
  return (
    producto.variantes.find((v) => v.metal === metal) ?? producto.variantes[0]
  );
}

/** La foto que corresponde: la de la montura si la trae, si no la de la
 *  familia. `undefined` es válido y significa "todavía no hay foto". */
export function imagenDe(
  producto: StoreProduct,
  variante: StoreVariant,
): string | undefined {
  return variante.imagen ?? producto.imagen;
}

/**
 * ¿Esta variante puede ofrecer «comprar»?
 *
 * El tope por transacción de Wompi (persona natural, COP 2.500.000, medido el
 * 2026-09-09) está POR DEBAJO de varias piezas del catálogo. Y el fallo no
 * ocurre en nuestro dominio: la reserva ya bloqueó la pieza treinta minutos
 * cuando el comprador ve un error en checkout.wompi.co. Así que una pieza por
 * encima del tope se ofrece para consulta, nunca con un botón de pago que va a
 * fallar lejos de aquí.
 */
export function superaTopeDeTransaccion(variante: StoreVariant): boolean {
  return variante.precioCOP > TOPE_TRANSACCION_COP;
}

/** Todas las variantes del catálogo, aplanadas — la selección y el resumen de
 *  pago trabajan sobre esto. */
export function todasLasVariantes(): {
  producto: StoreProduct;
  variante: StoreVariant;
}[] {
  return TIENDA_PRODUCTOS.flatMap((producto) =>
    producto.variantes.map((variante) => ({ producto, variante })),
  );
}

export type { StoreProductSlug };
