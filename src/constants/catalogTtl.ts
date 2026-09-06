/**
 * Piso de frescura del catálogo público cacheado — UNA constante para las dos
 * puntas.
 *
 * El centinela `products.catalogVersion` invalida en segundos cuando algo
 * cambia de verdad (una venta, una despublicación). Este TTL es lo que hace
 * que un bump olvidado sea un retraso de minutos y no un dato viejo para
 * siempre. Lo consumen:
 *
 *   · `src/hooks/useFotosintesisCatalog.ts` — caché en localStorage; se evalúa
 *     al remontar o cuando el centinela se mueve (NO hay timer, a propósito:
 *     un timer multiplicaría llamadas por pestaña abierta).
 *   · `api/_lib/catalogCache.ts` — caché por instancia de Vercel; se evalúa en
 *     cada request.
 *
 * Las dos tienen que envejecer igual: si divergen, una punta sirve datos que
 * la otra ya descartó. Por eso viven acá y no en cada archivo.
 *
 * Subirlo es la palanca que queda cuando los bumps son raros (el 2026-09-06 el
 * centinela llevaba 22 h sin moverse en prod). Subirlo exige antes que la
 * guarda `tests/catalogSentinelWiring.test.ts` esté en verde: con un TTL más
 * largo, un camino sin bump deja una piedra retirada a la venta todo el TTL.
 */
export const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;
