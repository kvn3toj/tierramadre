/**
 * Inventario de muestra de la Tienda (Storefront v2) — SÓLO ESTRUCTURA.
 *
 * La copia vive en `src/locales/*.ts` bajo `tienda.productos[slug]`. Aquí
 * quedan el slug, la colección, la foto y las variantes con su precio.
 *
 * Vive aparte de `src/data/treasure.ts` a propósito: `useTreasure()` desemboca
 * en quince consumidores (inventario, analítica de admin, impresión de
 * etiquetas, avalúos, la superposición Convex↔Sheets), y once piezas ficticias
 * no tienen nada que hacer en un conteo de stock ni en un reporte de
 * conciliación. Nadie fuera de `src/pages/tienda/` importa esto.
 *
 * Los precios son de referencia, no de catálogo.
 *
 * Las fotos son de piezas reales del inventario, así que NO varían por
 * montura: ninguna de ellas es este diseño en esta montura, y rotularlas
 * "Plata 925" sobre un anillo de oro sería inventar un dato con forma de dato.
 * Una foto representativa por familia; el modelo ya admite una por montura
 * para cuando existan las reales. Los Símbolos no tienen foto todavía y caen
 * en el marcador de agua de la marca, que es el tratamiento que el sistema ya
 * trae para "foto pendiente".
 */
import type { MetalKey, StoreProduct } from '../types/tienda';

/** Las cuatro monturas, en orden de presentación. Las etiquetas salen de
 *  `t.tienda.metales` / `t.tienda.metalesCorto`. */
export const METAL_KEYS: readonly MetalKey[] = [
  'plata-925',
  'oro-18k',
  'oro-blanco',
  'oro-rosa',
] as const;

export const METAL_POR_DEFECTO: MetalKey = 'plata-925';

/** Tope de piezas en una selección. Por encima de esto el mensaje de WhatsApp
 *  deja de leerse como una lista y empieza a leerse como un inventario. */
export const MAX_SELECCION = 8;

/** Tope por transacción de Wompi para persona natural (COP), medido el
 *  2026-09-09 contra el Reglamento 6.3. Una pieza por encima de esto no puede
 *  ofrecer «comprar»: la transacción falla en un dominio ajeno DESPUÉS de que
 *  nuestra reserva ya bloqueó la pieza 30 minutos. */
export const TOPE_TRANSACCION_COP = 2_500_000;

export const TIENDA_PRODUCTOS: readonly StoreProduct[] = [
  {
    slug: 'anillo-compromiso',
    categoria: 'joyeria',
    imagen: '/gallery/rings/_MG_2762.JPG',
    variantes: [
      { metal: 'plata-925', precioCOP: 890000, disponibilidad: 'hecho-a-medida' },
      { metal: 'oro-18k', precioCOP: 3560000, disponibilidad: 'hecho-a-medida' },
      { metal: 'oro-blanco', precioCOP: 3680000, disponibilidad: 'hecho-a-medida' },
      { metal: 'oro-rosa', precioCOP: 3450000, disponibilidad: 'hecho-a-medida' },
    ],
  },
  {
    slug: 'pulsera-infinito',
    categoria: 'joyeria',
    imagen: '/gallery/rings/_MG_2796.JPG',
    variantes: [
      { metal: 'plata-925', precioCOP: 640000, disponibilidad: 'hecho-a-medida' },
      { metal: 'oro-18k', precioCOP: 2780000, disponibilidad: 'hecho-a-medida' },
      { metal: 'oro-blanco', precioCOP: 2890000, disponibilidad: 'hecho-a-medida' },
      { metal: 'oro-rosa', precioCOP: 2740000, disponibilidad: 'hecho-a-medida' },
    ],
  },

  // Símbolos Renacer — sin eje de metal: una sola variante con `metal: null`.
  // Darles monturas más adelante es agregar entradas a `variantes`, sin tocar
  // una pantalla.
  {
    slug: 'mapa-colombia',
    categoria: 'simbolos',
    variantes: [{ metal: null, precioCOP: 145000, disponibilidad: 'hecho-a-medida' }],
  },
  {
    slug: 'manilla-colombia',
    categoria: 'simbolos',
    variantes: [{ metal: null, precioCOP: 120000, disponibilidad: 'en-stock' }],
  },
  {
    slug: 'palabra-colombia',
    categoria: 'simbolos',
    variantes: [{ metal: null, precioCOP: 135000, disponibilidad: 'hecho-a-medida' }],
  },
] as const;
