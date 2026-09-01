/**
 * Límite mínimo por IP para los endpoints públicos de Renacer (T2 del plan 08-25, pendiente
 * desde entonces).
 *
 * Es un limitador **en memoria y por instancia**: en Vercel cada instancia lleva su propio
 * mapa, así que el techo real es `limite × instancias`. No sustituye al WAF — lo
 * complementa: frena el tanteo de códigos y el spam de registros desde un solo teléfono
 * sin costar una lectura de Convex, que es lo que se paga en el plan gratis.
 *
 * Ventana deslizante simple: se guardan los timestamps de la ventana y se descartan los
 * viejos. El mapa se poda cada tanto para no crecer sin techo.
 */

import type { VercelRequest } from '@vercel/node';

interface Ventana {
  golpes: number[];
}

const VENTANA_MS = 60_000;
const PODA_CADA = 500;

const mapas = new Map<string, Map<string, Ventana>>();
let llamadasDesdePoda = 0;

export function ipDe(req: VercelRequest): string {
  const xff = req.headers['x-forwarded-for'];
  const primera = Array.isArray(xff) ? xff[0] : xff?.split(',')[0];
  const real = req.headers['x-real-ip'];
  const ip = (primera ?? (Array.isArray(real) ? real[0] : real) ?? req.socket?.remoteAddress ?? '')
    .toString()
    .trim();
  return ip || 'desconocida';
}

/**
 * Devuelve `true` si esta IP todavía puede pegarle a `clave` dentro de la ventana; `false`
 * si ya se pasó de `limite` golpes por minuto. Cuenta el golpe al consultar.
 */
export function permitir(
  clave: string,
  ip: string,
  limite: number,
  ahora: number = Date.now(),
): boolean {
  let porIp = mapas.get(clave);
  if (!porIp) {
    porIp = new Map();
    mapas.set(clave, porIp);
  }

  const desde = ahora - VENTANA_MS;
  const ventana = porIp.get(ip) ?? { golpes: [] };
  ventana.golpes = ventana.golpes.filter((t) => t > desde);

  if (ventana.golpes.length >= limite) {
    porIp.set(ip, ventana);
    return false;
  }

  ventana.golpes.push(ahora);
  porIp.set(ip, ventana);

  if (++llamadasDesdePoda >= PODA_CADA) {
    llamadasDesdePoda = 0;
    for (const mapa of mapas.values()) {
      for (const [k, v] of mapa) {
        if (v.golpes.every((t) => t <= desde)) mapa.delete(k);
      }
    }
  }
  return true;
}

/** Solo para tests: vacía el estado. */
export function _reiniciarLimites(): void {
  mapas.clear();
  llamadasDesdePoda = 0;
}

/** Techos por endpoint, por IP y por minuto. */
export const LIMITES = {
  resolverCodigo: 30,
  registro: 5,
  voluntario: 5,
  /**
   * El panel de la raíz. Más bajo que `resolverCodigo` porque acá el número adivinable
   * (`codigoBase`) va acompañado de un token de 64 hex: quien tantea no está probando
   * códigos, está probando tokens, y no hay uso legítimo que necesite 30 por minuto.
   */
  panelRaiz: 10,
  /** Reportar un mensaje del muro: público y sin credencial, así que corto. */
  reporte: 10,
} as const;
