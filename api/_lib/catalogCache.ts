import { convexClient, isConvexEnabled } from './convex-client.js';
import { CATALOG_CACHE_TTL_MS } from '../../src/constants/catalogTtl.js';

/**
 * Caché de las consultas pesadas de catálogo, con el centinela `catalogVersion`
 * como llave de invalidación.
 *
 * ## Qué se estaba pagando
 *
 * Convex cobra I/O de base de datos por documentos ESCANEADOS. La auditoría del
 * 2026-08-12 (`docs/audits/2026-08-12-convex-usage-audit.md`) midió que el I/O
 * era el ÚNICO recurso por encima del plan gratuito —1,2 GB contra 1 GB— y que
 * dos consultas eran el 85% del gasto: `products.publishedCatalog` (759,76 MB,
 * 63%) y `products.list` (255,77 MB, 21%).
 *
 * El arreglo 1C se implementó **solo del lado del navegador**
 * (`src/hooks/useFotosintesisCatalog.ts`: se suscribe a un documento de ~119
 * bytes y sólo rebaja el catálogo entero cuando ese número se mueve).
 *
 * Pero `/api/get-treasure-sheets` llama a Convex desde el SERVIDOR, y ese lado
 * quedó sin puerta:
 *
 *   · `filtrarNoPublicados`     → `products.publishedCatalog`  (~430 filas de 81 campos)
 *   · `overlayConvexFotoUrls`   → `products.fotoUrls`          (las 576 filas, completas)
 *
 * Las dos, enteras, en CADA request del catálogo público. Del orden de 1,5 MB
 * de I/O por visita: unas 700 visitas agotan el gigabyte del mes. `fotoUrls`
 * nació después de esa auditoría (con el incidente de fotos del 2026-08-15), y
 * por eso no figura en su tabla — pero escanea la tabla entera, así que
 * cualquier escritura en `productInventory` invalida su caché y obliga a
 * releerla.
 *
 * ## Cómo funciona
 *
 * Una lectura de ~119 bytes (`products.catalogVersion`) por request en vez de
 * ~1,5 MB. El payload pesado se rebaja sólo cuando el centinela se mueve.
 *
 * Dos redes, no una:
 *
 *  1. **El centinela** da frescura en segundos para lo que importa — sobre todo
 *     una VENTA: son esmeraldas únicas, y dos personas viendo comprable la
 *     misma piedra es peor que cualquier ahorro.
 *  2. **El TTL** es el piso. `bumpCatalogVersion` se mantiene a mano en varios
 *     caminos de escritura y el riesgo real es que alguno se olvide (de hecho
 *     `applyMediaToProduct` NO lo llamaba hasta hoy). Con el piso, un bump
 *     olvidado degrada a «viejo por unos minutos», nunca a «viejo para
 *     siempre».
 *
 * Es la misma doctrina del hook del navegador, con el mismo TTL, para que las
 * dos puntas envejezcan igual.
 *
 * ## Por qué a nivel de módulo
 *
 * Vercel reutiliza la instancia de la función entre requests (Fluid Compute),
 * así que este mapa sobrevive de una a otra. No es compartido entre instancias:
 * cada una paga su primer fallo. Eso está bien —el costo es proporcional al
 * número de instancias vivas, no al de visitantes— y no hay nada que invalidar
 * a mano cuando una instancia muere.
 *
 * Nunca sirve datos de otro despliegue: el proceso muere con la instancia.
 */

/**
 * El mismo piso que el hook del navegador — literalmente la misma constante,
 * ver src/constants/catalogTtl.ts. Se re-exporta con el nombre que ya usan
 * las pruebas y los comentarios de este lado.
 */
export const CATALOGO_TTL_MS = CATALOG_CACHE_TTL_MS;

interface Entrada {
  version: number;
  vencimiento: number;
  valor: unknown;
}

const memoria = new Map<string, Entrada>();

/**
 * Cargas en vuelo, por llave. Dos requests que fallan la caché a la vez en la
 * misma instancia comparten UNA lectura de Convex en vez de pagar dos: sin
 * esto, una ráfaga de visitas justo después de un bump (o de un arranque en
 * frío) escanea el catálogo entero tantas veces como requests concurrentes.
 */
const enVuelo = new Map<string, Promise<unknown>>();

/** Sólo para las pruebas: deja la caché como recién arrancada. */
export function _vaciarCache(): void {
  memoria.clear();
  enVuelo.clear();
}

/** Opciones de `conCache`. Las dos primeras existen sólo para las pruebas. */
export interface OpcionesDeCache {
  /** Instante de evaluación. Por defecto, ahora. */
  ahora?: number;
  /**
   * Versión del centinela a usar en vez de leerla de Convex. SÓLO PRUEBAS: en
   * producción la versión se lee siempre, porque servir de una caché cuya
   * validez no se comprobó es exactamente como una piedra vendida sigue a la
   * venta.
   */
  version?: number;
  /**
   * Piso de frescura para ESTA llave. Por defecto el compartido con el
   * navegador. Una llave puede pedir otro cuando su dato envejece distinto —
   * p. ej. las ofertas de reventa, cuyas mutaciones no mueven el centinela a
   * propósito y viven sólo del TTL.
   */
  ttlMs?: number;
}

/**
 * Lee el centinela. Devuelve `null` si Convex no contesta, y quien llama
 * decide: acá eso significa "no uso la caché", no "el catálogo está vacío".
 */
async function leerVersion(): Promise<number | null> {
  if (!isConvexEnabled || !convexClient) return null;
  try {
    const { api } = await import('../../convex/_generated/api.js');
    const row = (await convexClient.query(api.products.catalogVersion, {})) as {
      v?: number;
    } | null;
    return typeof row?.v === 'number' ? row.v : 0;
  } catch {
    return null;
  }
}

/**
 * Decide si una entrada sirve. Aparte para poder probarla sin red.
 *
 * Sirve sólo si la versión coincide Y no venció el piso. La versión sola no
 * basta (un bump olvidado la dejaría viva para siempre) y el TTL solo tampoco
 * (una venta quedaría visible hasta que venza).
 */
export function entradaVigente(
  entrada: Entrada | undefined,
  version: number,
  ahora: number,
): boolean {
  if (!entrada) return false;
  if (entrada.version !== version) return false;
  return ahora < entrada.vencimiento;
}

/**
 * Devuelve el valor cacheado o lo vuelve a pedir.
 *
 * Si el centinela no se puede leer se llama a `cargar()` sin cachear: ante la
 * duda se paga el I/O y se sirve fresco. Servir de una caché cuya validez no se
 * puede comprobar es justamente como una piedra vendida sigue a la venta.
 */
export async function conCache<T>(
  clave: string,
  cargar: () => Promise<T>,
  opciones: OpcionesDeCache = {},
): Promise<T> {
  const ahora = opciones.ahora ?? Date.now();
  const ttlMs = opciones.ttlMs ?? CATALOGO_TTL_MS;
  const version = opciones.version ?? (await leerVersion());
  if (version === null) return cargar();

  const entrada = memoria.get(clave);
  if (entradaVigente(entrada, version, ahora)) {
    return entrada!.valor as T;
  }

  // Fallo de caché: si otra request de esta instancia ya está cargando la
  // misma llave, esperar esa carga en vez de pagar una segunda.
  const pendiente = enVuelo.get(clave);
  if (pendiente) return pendiente as Promise<T>;

  const carga = (async () => {
    try {
      const valor = await cargar();
      memoria.set(clave, { version, vencimiento: ahora + ttlMs, valor });
      return valor;
    } finally {
      enVuelo.delete(clave);
    }
  })();
  enVuelo.set(clave, carga);
  return carga;
}
