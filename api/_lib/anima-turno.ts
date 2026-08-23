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
import crypto from 'node:crypto';
import { bearerMatches } from './bearer.js';
import {
  getConversationMessages,
  searchConversations,
  type GhlReadConfig,
} from './ghl-read.js';

/**
 * `Authorization` con o sin el esquema `Bearer`.
 *
 * El editor de "pills" del Custom Webhook de GHL hace poco confiable anteponer texto al custom
 * value (2026-08-20: los intentos de escribir "Bearer " delante del pill nunca aterrizaron), así
 * que este endpoint acepta también el secreto crudo. Misma comparación constante en tiempo;
 * ningún otro endpoint relaja su chequeo.
 */
export function autorizacionValida(
  header: string | string[] | undefined,
  secret: string | undefined,
): boolean {
  if (!secret) return false;
  if (bearerMatches(header, secret)) return true;
  const h = (Array.isArray(header) ? header[0] : header)?.trim() ?? '';
  if (h.length === 0) return false;
  const hBuf = Buffer.from(h);
  const sBuf = Buffer.from(secret);
  if (hBuf.length !== sBuf.length) return false;
  return crypto.timingSafeEqual(hBuf, sBuf);
}

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
 * `{{message.attachments}}` de GHL, en la forma que sea. El editor de pills no documenta cómo
 * serializa un array, y por el precedente del header (ver `autorizacionValida`) no se confía en
 * un solo formato: puede llegar como array real, como string JSON (`["u1","u2"]`), como URLs
 * separadas por coma/espacio, o como una URL sola. Se toma la PRIMERA URL http(s) — anima-bot
 * recibe UN `adjunto` y la primera foto es la referencia. Todo lo demás (vacíos, `[]`, un pill
 * sin renderizar, texto arbitrario) queda en `undefined` en vez de viajar como basura: en
 * anima-bot la sola PRESENCIA de `fotoReferencia` cambia el flujo.
 */
export function normalizaAdjunto(v: unknown): string | undefined {
  const urls = (x: unknown): string[] => {
    if (Array.isArray(x)) return x.flatMap(urls);
    if (typeof x !== 'string') return [];
    const s = x.trim();
    if (s.startsWith('[')) {
      try {
        return urls(JSON.parse(s));
      } catch {
        // No era JSON: sigue el camino de texto plano.
      }
    }
    return s.split(/[\s,]+/).filter((u) => /^https?:\/\//i.test(u));
  };
  return urls(v)[0];
}

/**
 * El adjunto se pierde por defecto: `{{message.attachments}}` llega VACÍO para medios de
 * WhatsApp en el trigger «Customer Replied» (verificado en vivo 2026-08-20, tres fotos reales,
 * versión nueva del workflow confirmada en el registro de ejecución). El pill se queda en el
 * body por si GHL algún día lo llena — es más barato — pero el camino que funciona es este:
 * preguntar por la API qué mandó el contacto.
 *
 * Solo cuenta el mensaje entrante MÁS RECIENTE y solo si es de hace segundos (`maxEdadMs`):
 * el webhook dispara justo tras el mensaje, así que un adjunto viejo NO es «de este turno» —
 * sin esa ventana, cada turno sin foto heredaría la última foto que el cliente mandó en su
 * vida. Best-effort de punta a punta: cualquier fallo o timeout devuelve `undefined`, que es
 * exactamente el comportamiento sin este código.
 */
export async function adjuntoDesdeApi(
  cfg: GhlReadConfig,
  contactId: string,
  opts: { timeoutMs?: number; maxEdadMs?: number; nowMs?: number } = {},
): Promise<string | undefined> {
  const timeoutMs = opts.timeoutMs ?? 3_000;
  const maxEdadMs = opts.maxEdadMs ?? 10 * 60 * 1000;
  const ahora = opts.nowMs ?? Date.now();

  const busca = async (): Promise<string | undefined> => {
    const convos = await searchConversations(cfg, { contactId, limit: 20 });
    const convo = convos[0];
    if (!convo) return undefined;
    const mensajes = await getConversationMessages(cfg, convo.id, { max: 25 });
    const entrantes = mensajes
      .filter((m) => m.direction === 'inbound')
      .map((m) => ({
        adjuntos: (m as { attachments?: unknown }).attachments,
        ts: Date.parse(m.dateAdded),
      }))
      .filter((m) => Number.isFinite(m.ts))
      .sort((a, b) => b.ts - a.ts);
    const ultimo = entrantes[0];
    if (!ultimo || ahora - ultimo.ts > maxEdadMs) return undefined;
    return normalizaAdjunto(ultimo.adjuntos);
  };

  try {
    return await Promise.race([
      busca(),
      new Promise<undefined>((r) => setTimeout(() => r(undefined), timeoutMs)),
    ]);
  } catch {
    return undefined;
  }
}

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
    adjunto: normalizaAdjunto(o.adjunto),
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
