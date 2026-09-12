/**
 * "Mi selección" — el carrito que no es un carrito.
 *
 * Identidad de una pieza elegida = `slug:metal`, NUNCA sólo el slug: si no,
 * las cuatro monturas de un mismo diseño colapsarían en un precio y una foto,
 * y elegir el anillo en oro blanco borraría el mismo anillo en plata.
 *
 * El estado vive en la URL (`?p=anillo-compromiso:oro-18k,mapa-colombia`) y no
 * en un backend, por la misma razón que `/v/324-323-370`: un visitante anónimo
 * no puede acuñar un enlace en el servidor (api/vitrina.ts exige sesión tms1
 * desde 2026-08), y una selección que vive en la URL se comparte, se recarga y
 * se vuelve atrás sin nada que sincronizar.
 *
 * Módulo puro: sin React, sin Convex, sin fetch. Es lo que lo hace testeable.
 */
import { MAX_SELECCION } from '../data/tienda';
import type { MetalKey, SeleccionItem, StoreProductSlug } from '../types/tienda';
import { findProducto, parseMetalParam, tieneEjeDeMetal } from './tienda';

const SEP_ITEM = ',';
const SEP_METAL = ':';

/** La clave estable de una pieza elegida. */
export function claveDe(item: SeleccionItem): string {
  return item.metal ? `${item.slug}${SEP_METAL}${item.metal}` : item.slug;
}

export function estaSeleccionada(
  seleccion: readonly SeleccionItem[],
  item: SeleccionItem,
): boolean {
  const k = claveDe(item);
  return seleccion.some((s) => claveDe(s) === k);
}

/** Alterna. Devuelve una lista NUEVA; si ya está llena y el item es nuevo,
 *  devuelve la misma lista sin cambios — el llamador compara por identidad
 *  para saber que topó. */
export function alternar(
  seleccion: readonly SeleccionItem[],
  item: SeleccionItem,
): SeleccionItem[] {
  const k = claveDe(item);
  const sin = seleccion.filter((s) => claveDe(s) !== k);
  if (sin.length !== seleccion.length) return sin;
  if (seleccion.length >= MAX_SELECCION) return seleccion as SeleccionItem[];
  return [...seleccion, item];
}

/**
 * Lee `?p=`. Tolerante por diseño: descarta slugs que no existen y monturas
 * inválidas en vez de romper, porque este parámetro llega por enlaces pegados
 * a mano y por mensajes de WhatsApp reenviados.
 */
export function parseSeleccionParam(raw: string | null): SeleccionItem[] {
  if (!raw) return [];
  const vistos = new Set<string>();
  const out: SeleccionItem[] = [];

  for (const trozo of raw.split(SEP_ITEM)) {
    const [slugRaw, metalRaw] = trozo.trim().split(SEP_METAL);
    const producto = findProducto(slugRaw);
    if (!producto) continue;

    const metal: MetalKey | null = tieneEjeDeMetal(producto)
      ? parseMetalParam(metalRaw ?? null)
      : null;
    const item: SeleccionItem = { slug: producto.slug, metal };

    const k = claveDe(item);
    if (vistos.has(k)) continue;
    vistos.add(k);
    out.push(item);
    if (out.length >= MAX_SELECCION) break;
  }
  return out;
}

export function serializeSeleccion(seleccion: readonly SeleccionItem[]): string {
  return seleccion.map(claveDe).join(SEP_ITEM);
}

/** Resuelve cada elección contra el catálogo. Descarta lo que ya no existe. */
export function resolverSeleccion(seleccion: readonly SeleccionItem[]) {
  return seleccion.flatMap((item) => {
    const producto = findProducto(item.slug);
    if (!producto) return [];
    const variante =
      producto.variantes.find((v) => v.metal === item.metal) ??
      producto.variantes[0];
    return [{ item, producto, variante }];
  });
}

export function totalCOP(seleccion: readonly SeleccionItem[]): number {
  return resolverSeleccion(seleccion).reduce(
    (n, { variante }) => n + variante.precioCOP,
    0,
  );
}

export type { SeleccionItem, StoreProductSlug };
