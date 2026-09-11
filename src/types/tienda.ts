/**
 * Tienda (Storefront v2) — el modelo de dominio de la versión nueva.
 *
 * Deliberadamente NO reusa `TreasureItem`. Ese tipo describe UNA pieza física
 * única (~60 campos de gemología: color, calidad, talla, mina, tratamiento) y
 * no tiene forma de expresar "un diseño, cuatro monturas". Codificar el metal
 * dentro de un string y volver a parsearlo es exactamente la deuda que ya
 * existe en `src/data/treasure.ts` (`parsePeso` husmea "plata"/"oro" dentro de
 * la columna de peso) y en `useFotosintesisCatalog`.
 *
 * `(familia, metal)` es además la forma que la migración real va a necesitar:
 * `productInventory` es de unidad única, así que la consulta futura es "dado
 * (familia, metal), tráeme la primera unidad DISPONIBLE". Manteniendo este
 * tipo, esa migración reemplaza el cuerpo de una función, no cada pantalla.
 *
 * AQUÍ NO HAY COPIA. Nombre, subtítulo, descripción y detalles viven en
 * `src/locales/*.ts` bajo `tienda.productos[slug]`, resueltos por slug. El
 * fixture guarda sólo lo estructural, así que traducir el catálogo no obliga a
 * tocar datos ni duplicar el precio en seis archivos.
 */

/** Las cuatro monturas. Las etiquetas siguen el vocabulario `MINERALES`
 *  (`src/data/vocabularies.ts`) para que el cruce futuro con inventario real
 *  sea una búsqueda y no un renombre. */
export type MetalKey = 'plata-925' | 'oro-18k' | 'oro-blanco' | 'oro-rosa';

/** Las dos puertas. */
export type TiendaCategoriaKey = 'joyeria' | 'simbolos';

/** Las familias. Es una unión y no `string` a propósito: indexar
 *  `t.tienda.productos[slug]` sólo compila si el slug existe en los seis
 *  idiomas, así que agregar una pieza sin traducirla rompe el build. */
export type StoreProductSlug =
  | 'anillo-compromiso'
  | 'pulsera-infinito'
  | 'mapa-colombia'
  | 'manilla-colombia'
  | 'palabra-colombia';

export type Disponibilidad = 'hecho-a-medida' | 'en-stock';

export interface StoreVariant {
  /** `null` = la pieza no tiene eje de metal (los tres Símbolos hoy).
   *  Que sea opcional en el tipo y no un tipo aparte es lo que hace que
   *  darle metales a los Símbolos mañana sea un cambio de datos, no de código. */
  metal: MetalKey | null;
  precioCOP: number;
  /** Foto propia de esta montura. Con datos reales cada montura trae la suya;
   *  el fixture no la usa (ver `StoreProduct.imagen`). */
  imagen?: string;
  disponibilidad: Disponibilidad;
}

export interface StoreProduct {
  slug: StoreProductSlug;
  categoria: TiendaCategoriaKey;
  /** Foto de la familia: la que se muestra cuando la montura no trae la suya.
   *  `undefined` deja que ProgressiveImage dibuje el marcador con el logo. */
  imagen?: string;
  variantes: StoreVariant[];
}

export interface TiendaCategoria {
  key: TiendaCategoriaKey;
  /** La copia (nombre, resumen, descripción) sale de
   *  `t.tienda.categorias[key]`. El nombre visible «Símbolos Renacer» vive
   *  allí; la RUTA usa `simbolos` porque `/renacer/*` ya pertenece a la
   *  campaña de donación y sus URLs están impresas en tarjetas físicas. */
  imagen: string;
}

/** Una pieza elegida: familia + montura. La montura es parte de la identidad,
 *  nunca sólo el slug — si no, las cuatro monturas colapsarían en un precio y
 *  una foto. */
export interface SeleccionItem {
  slug: StoreProductSlug;
  metal: MetalKey | null;
}
