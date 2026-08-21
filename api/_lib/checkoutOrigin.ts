/**
 * Allowlist de origen para el checkout público.
 *
 * `POST /api/checkout-create-order` es anónimo a propósito, y `setCorsHeaders`
 * (api/_lib/cors.js) manda `Access-Control-Allow-Origin: *` para TODOS los
 * endpoints. Un `*` no le abre la puerta a `curl` —CORS no existe fuera del
 * navegador—, pero sí habilita un ataque concreto: una página de un tercero
 * puede hacer que los navegadores de SUS visitantes posteen aquí. Eso aparta
 * piedras reales usando IPs legítimas y repartidas, que es justamente lo que
 * un rate limit por IP no ve.
 *
 * Restringir el origen quita ese apalancamiento: el atacante vuelve a tener
 * que gastar su propia infraestructura, donde el WAF sí lo cuenta.
 *
 * La regla vive SOLO en este endpoint, no en el helper compartido: cambiar
 * `setCorsHeaders` movería el comportamiento de cuarenta endpoints de golpe
 * para pagar la misma factura una vez.
 *
 * Lo que NO hace: no autentica nada. Una petición sin `Origin` pasa, porque
 * ningún llamante de servidor lo manda y bloquearlo rompería al riel del bot
 * sin frenar a nadie. Esto es un escalón, no la puerta — la puerta sigue
 * siendo WAF + BotID (docs/checkout-publico-proteccion.md).
 */

/** El dominio de producción, siempre permitido aunque el env esté vacío. */
const ORIGENES_BASE = [
  'https://tierramadre.app',
  'https://www.tierramadre.app',
];

/** Minúsculas, sin barra final, y sólo el origen (esquema + host + puerto). */
function normalizar(valor: string): string {
  const limpio = valor.trim();
  if (!limpio) return '';
  try {
    return new URL(limpio).origin.toLowerCase();
  } catch {
    return limpio.toLowerCase().replace(/\/+$/, '');
  }
}

export interface CheckoutOriginEnv {
  APP_URL?: string;
  /** Extras separados por coma, para un dominio nuevo sin tocar código. */
  CHECKOUT_ALLOWED_ORIGINS?: string;
}

/** Los orígenes que este despliegue acepta, ya normalizados y sin repetidos. */
export function allowedCheckoutOrigins(env: CheckoutOriginEnv): string[] {
  const extras = (env.CHECKOUT_ALLOWED_ORIGINS ?? '').split(',');
  const todos = [...ORIGENES_BASE, env.APP_URL ?? '', ...extras]
    .map(normalizar)
    .filter(Boolean);
  return [...new Set(todos)];
}

function esLocalhost(origen: string): boolean {
  try {
    const { hostname } = new URL(origen);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

/**
 * ¿Puede este `Origin` postear al checkout?
 *
 * `undefined` (sin cabecera) pasa — ver el header de este archivo.
 */
export function isCheckoutOriginAllowed(
  origin: string | undefined,
  allowed: string[],
  opciones: { allowLocalhost?: boolean } = {},
): boolean {
  if (origin === undefined || origin === null || origin.trim() === '') {
    return true;
  }
  const normalizado = normalizar(origin);
  if (allowed.includes(normalizado)) return true;
  if (opciones.allowLocalhost && esLocalhost(normalizado)) return true;
  return false;
}
