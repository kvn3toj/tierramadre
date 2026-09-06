import { convexClient, isConvexEnabled } from './convex-client.js';

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

/** El mismo piso que `CATALOG_CACHE_TTL_MS` del hook del navegador. */
export const CATALOGO_TTL_MS = 5 * 60 * 1000;

interface Entrada {
  version: number;
  vencimiento: number;
  valor: unknown;
}

const memoria = new Map<string, Entrada>();

/** Sólo para las pruebas: deja la caché como recién arrancada. */
export function _vaciarCache(): void {
  memoria.clear();
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
  ahora: number = Date.now(),
): Promise<T> {
  const version = await leerVersion();
  if (version === null) return cargar();

  const entrada = memoria.get(clave);
  if (entradaVigente(entrada, version, ahora)) {
    return entrada!.valor as T;
  }

  const valor = await cargar();
  memoria.set(clave, {
    version,
    vencimiento: ahora + CATALOGO_TTL_MS,
    valor,
  });
  return valor;
}
