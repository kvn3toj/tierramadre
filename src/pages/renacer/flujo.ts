/**
 * Los conmutadores del flujo de Renacer — un solo lugar, una línea por decisión.
 */

export type PasoId = 'bienvenida' | 'necesidades' | 'datos' | 'capacidades';

/** Orden ratificado el 25-08 (§6.5, "no negociable"): necesidades ANTES que datos. */
export const ORDEN_RATIFICADO_0825: readonly PasoId[] = [
  'bienvenida',
  'necesidades',
  'datos',
  'capacidades',
];

/** Orden dibujado en la reunión del 31-08 (§4): datos ANTES que necesidades. */
export const ORDEN_REUNION_0831: readonly PasoId[] = [
  'bienvenida',
  'datos',
  'necesidades',
  'capacidades',
];

/**
 * D-0831-4. La reunión enumeró los pasos con datos primero pero no registró que se
 * revirtiera la decisión del 25-08 — que está escrita con su razón: a alguien que acaba
 * de perder la casa se le pregunta primero qué necesita, no sus datos. Se mantiene el
 * orden ratificado hasta que Kevin diga lo contrario; cambiarlo es cambiar ESTA línea.
 */
export const ORDEN_PASOS: readonly PasoId[] = ORDEN_RATIFICADO_0825;

/**
 * D-0831-1. A dónde va "Regalar un símbolo de esperanza". `null` mientras no haya precio
 * ratificado ni SKU: la opción se muestra honesta ("muy pronto"), no enlaza a nada.
 */
export const RUTA_SIMBOLO: string | null = null;
