/**
 * La lógica pura del proxy María → anima-bot (api/anima-turno.ts).
 *
 * anima-bot corre en una Mac detrás de un quick tunnel de Cloudflare: la URL upstream rota y la
 * máquina puede dormir. Este módulo hace que ese mundo inestable le llegue a María como un
 * contrato estable: o la respuesta REAL del cotizador, o un fallback bien formado que suena a
 * humano — nunca un error de conexión que la tire a su prompt de emergencia.
 *
 * Separado del handler para poder testearlo con fetch inyectado (patrón ghl-client.ts).
 */

/** El contrato de entrada de anima-bot (`src/http/server.ts` en ese repo). */
export interface TurnoRequest {
  canal: string;
  externalId: string;
  mensaje: string;
  nombre?: string;
  origen?: string;
  adjunto?: string;
}

/**
 * Lo que María oye cuando anima-bot no contesta (Mac dormida, túnel caído, timeout).
 *
 * `estado: "en_revision"` a propósito: María ya sabe decir ese estado sin inventar nada, y el
 * tag `anima-offline` que el handler le pone al contacto deja al lead recuperable en una smart
 * list de GHL. `fallback: true` distingue este caso en los logs del workflow.
 */
export const FALLBACK_TURNO = {
  estado: 'en_revision',
  mensaje: 'Dame un momento, estoy revisando el inventario para ti 💚',
  fallback: true,
} as const;

const txt = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;

/**
 * Valida el cuerpo que manda la tool de María. `null` antes que coaccionar un pedido a medias:
 * un 400 temprano se ve en el log del workflow; un turno con contacto vacío crea un lead
 * fantasma en anima-bot.
 */
export function parseTurno(body: unknown): TurnoRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const o = body as Record<string, unknown>;
  const canal = txt(o.canal);
  const externalId = txt(o.externalId);
  // Un mensaje vacío es legítimo (el cliente pudo mandar solo una foto).
  const mensaje = typeof o.mensaje === 'string' ? o.mensaje : undefined;
  if (!canal || !externalId || mensaje === undefined) return null;
  return {
    canal,
    externalId,
    mensaje,
    nombre: txt(o.nombre),
    origen: txt(o.origen),
    adjunto: txt(o.adjunto),
  };
}

/** La forma mínima que aceptamos como respuesta del cotizador antes de reenviarla a María. */
export function esTurnoRespuesta(j: unknown): j is { estado: string } {
  return (
    typeof j === 'object' &&
    j !== null &&
    typeof (j as { estado?: unknown }).estado === 'string'
  );
}

/**
 * El texto listo para que el WORKFLOW lo envíe tal cual (regla LITERAL sin LLM en el medio):
 * la `pregunta` de un turno de descubrimiento, o el `mensaje` de una cotización/acuse.
 * `""` cuando no hay nada que decirle al cliente (`sin_cotizacion` → el lead queda para el
 * humano) — el workflow lo usa como condición de "no enviar".
 */
export function textoParaCliente(r: {
  estado: string;
  pregunta?: unknown;
  mensaje?: unknown;
}): string {
  if (r.estado === 'pregunta' && typeof r.pregunta === 'string') {
    return r.pregunta;
  }
  if (
    (r.estado === 'cotizacion' || r.estado === 'en_revision') &&
    typeof r.mensaje === 'string'
  ) {
    return r.mensaje;
  }
  return '';
}

type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export interface ReenvioConfig {
  /** Base del túnel, p.ej. https://xxxx.trycloudflare.com — SIN barra final. */
  upstream: string;
  /** El COTIZADOR_SECRET de anima-bot. */
  secret: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}

/**
 * Reenvía el turno tal cual y devuelve la respuesta del cotizador, o `null` ante CUALQUIER
 * fallo (red, timeout, status raro, JSON malformado). El que llama decide el fallback; aquí no
 * se inventan respuestas.
 */
export async function reenviarTurno(
  cfg: ReenvioConfig,
  turno: TurnoRequest,
): Promise<{ estado: string } | null> {
  const f = cfg.fetchImpl ?? (fetch as unknown as FetchLike);
  try {
    const res = await f(`${cfg.upstream.replace(/\/+$/, '')}/cotizador/turno`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${cfg.secret}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(turno),
      signal: AbortSignal.timeout(cfg.timeoutMs ?? 25_000),
    });
    if (!res.ok) return null;
    const j = await res.json();
    return esTurnoRespuesta(j) ? j : null;
  } catch {
    return null;
  }
}
