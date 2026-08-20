/**
 * El WRITER de conversaciones GHL: envía un mensaje de SESIÓN al contacto.
 *
 * Vive aparte de ghl-read.ts (regla del archivo: ahí solo lecturas) y de ghl-client.ts
 * (contactos/tags/workflows). El contrato base — bearer + `Version: 2021-07-28` — es el mismo
 * ya probado en convex/_lib/ghlConversations.ts.
 *
 * IMPORTANTE: esto es un mensaje de sesión (texto libre). WhatsApp solo lo acepta dentro de la
 * ventana de 24h del último mensaje ENTRANTE del cliente. El único consumidor hoy
 * (api/anima-turno.ts) responde al turno que el cliente acaba de mandar, así que por
 * construcción está dentro de la ventana. Fuera de ventana, el camino sigue siendo
 * `addToWorkflow` + plantilla aprobada por Meta.
 */

const GHL_BASE = 'https://services.leadconnectorhq.com';

type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export interface GhlSendConfig {
  token: string;
  /** Defaults to global fetch in production; injected in tests. */
  fetchImpl?: FetchLike;
}

/** Los tipos de canal que la API de conversaciones acepta para el envío. */
export type CanalEnvio = 'WhatsApp' | 'IG' | 'FB' | 'SMS';

/** El `canal` que usa anima-bot → el `type` que espera GHL. */
export function tipoDeCanal(canal: string): CanalEnvio | null {
  switch (canal.trim().toLowerCase()) {
    case 'whatsapp':
      return 'WhatsApp';
    case 'instagram':
      return 'IG';
    case 'facebook':
      return 'FB';
    case 'sms':
      return 'SMS';
    default:
      return null;
  }
}

/**
 * Envía y devuelve `{ok, status}` sin lanzar: el que llama decide qué hacer con un fallo —
 * en el proxy del cotizador, un envío fallido NO puede tumbar la respuesta del turno.
 */
export async function sendConversationMessage(
  cfg: GhlSendConfig,
  args: { type: CanalEnvio; contactId: string; message: string },
): Promise<{ ok: boolean; status: number }> {
  const f = cfg.fetchImpl ?? (fetch as unknown as FetchLike);
  try {
    const res = await f(`${GHL_BASE}/conversations/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}
