/**
 * El cliente de la consola de Renacer (01-09): una acción por llamada contra
 * `/api/renacer-admin`, siempre con el token de identidad del operador.
 *
 * `readFreshAuthToken()` (no `readFreshGoogleIdToken`): acepta el session token de
 * 30 días, así la consola no muere a la hora de sesión — el verificador del endpoint
 * entiende ambas formas. El correo NUNCA viaja en el body: el servidor lo saca del token.
 */

import { readFreshAuthToken } from '../utils/sessionToken';

export class ConsolaError extends Error {
  constructor(
    mensaje: string,
    public readonly status: number,
  ) {
    super(mensaje);
    this.name = 'ConsolaError';
  }
}

export async function llamarConsola<T>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const idToken = readFreshAuthToken();
  if (!idToken) {
    throw new ConsolaError('Tu sesión expiró. Volvé a iniciar sesión con Google.', 401);
  }
  const res = await fetch('/api/renacer-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, idToken, ...payload }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
  if (!res.ok || data.success === false) {
    throw new ConsolaError(data.error ?? `Error ${res.status}.`, res.status);
  }
  return data as T;
}
