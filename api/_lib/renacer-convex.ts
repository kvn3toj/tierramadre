/**
 * Cliente compartido hacia el Convex de la campaña Renacer.
 *
 * **Es un deployment distinto al de la app.** `convexClient` (en `./convex-client.js`)
 * apunta al Convex del inventario de esmeraldas; este apunta al de Renacer. Confundirlos
 * es exactamente la línea roja del §8.1 del spec — ver `convex-renacer/README.md`.
 *
 * El navegador NUNCA habla con Convex en este flujo: llama a `/api/renacer-*`, y estos
 * endpoints son los únicos que conocen la URL y el token. El token va del lado del
 * servidor por la misma razón que `ADMIN_SYNC_TOKEN` en `checkout-create-order.ts`.
 *
 * Variables de entorno (Vercel + `.env.local`):
 *   RENACER_CONVEX_URL   la URL del deployment de Renacer
 *   RENACER_APP_TOKEN    el secreto que habilita lo que puede hacer un visitante
 *
 * `RENACER_OPS_TOKEN` **no vive acá**: emitir códigos, cambiar estados y ocultar
 * mensajes son actos de operador, y ningún endpoint público debe poder hacerlos.
 */

import { ConvexHttpClient } from 'convex/browser';

// Trim: Vercel arrastra saltos de línea cuando las variables se pegan por dashboard/CLI.
const RENACER_CONVEX_URL = process.env.RENACER_CONVEX_URL?.trim();
const RENACER_APP_TOKEN = process.env.RENACER_APP_TOKEN?.trim();

export const renacerConfigurado = Boolean(RENACER_CONVEX_URL && RENACER_APP_TOKEN);

export const renacerClient = RENACER_CONVEX_URL
  ? new ConvexHttpClient(RENACER_CONVEX_URL)
  : null;

/**
 * El secreto que acompaña cada llamada. Falla ruidosamente si no está configurado:
 * mandar `''` haría que la guarda del backend rechace con un mensaje confuso, y
 * "no autorizado" en producción por una variable faltante es la peor forma de
 * enterarse.
 */
export function tokenDeApp(): string {
  if (!RENACER_APP_TOKEN) {
    throw new Error(
      'RENACER_APP_TOKEN no está configurada. Los endpoints de Renacer no pueden operar sin ella.',
    );
  }
  return RENACER_APP_TOKEN;
}

/** Código de kit: numérico, 3–4 dígitos, sin ceros a la izquierda (compuerta §3.4 · G-A.2). */
export function parseCodigoKit(valor: unknown): number | null {
  const s = String(valor ?? '').trim();
  if (!/^[1-9][0-9]{2,3}$/.test(s)) return null;
  const n = Number(s);
  return n >= 101 && n <= 9999 ? n : null;
}

/** Número de carnet: mismo formato de entrada, distinto rango (arranca en 111). */
export function parseNumeroCarnet(valor: unknown): number | null {
  const s = String(valor ?? '').trim();
  if (!/^[1-9][0-9]{2,5}$/.test(s)) return null;
  return Number(s);
}

/** Texto de usuario: recortado y acotado. Devuelve null si queda vacío o se pasa. */
export function parseTexto(valor: unknown, maxLargo: number): string | null {
  if (typeof valor !== 'string') return null;
  const s = valor.trim();
  if (s.length === 0 || s.length > maxLargo) return null;
  return s;
}
