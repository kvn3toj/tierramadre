/**
 * anima-bot → un mensaje de sesión al cliente por GHL.
 *
 * El consumidor es la ruta de EXCEPCIÓN del cotizador: el dueño aprueba una cotización en
 * revisión (tap en la tarjeta de Telegram) y el texto viaja solo al hilo de WhatsApp/IG del
 * contacto, en vez de entregarse al dueño para pegar a mano. El turno normal NO pasa por aquí
 * (api/anima-turno.ts envía inline).
 *
 * Auth: `Bearer ANIMA_BOT_SECRET` — el mismo precedente de api/cotizacion-deck.ts. Con o sin
 * el prefijo `Bearer` no aplica aquí: anima-bot manda el header él mismo, sin editor de pills
 * en el medio, así que se exige el esquema completo.
 *
 * Ventana de 24h: la aprobación suele llegar minutos después del último mensaje del cliente,
 * dentro de ventana. Fuera de ella GHL rechaza y esto responde 502 — anima-bot degrada al
 * camino manual (el texto al dueño). Nada se pierde en silencio.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler, sendError, sendSuccess } from './_lib/index.js';
import { bearerMatches } from './_lib/bearer.js';
import { sendConversationMessage, tipoDeCanal } from './_lib/ghl-send.js';

export default withApiHandler(
  async (req: VercelRequest, res: VercelResponse) => {
    if (
      !bearerMatches(req.headers['authorization'], process.env.ANIMA_BOT_SECRET)
    ) {
      return sendError(res, 401, 'No autorizado');
    }
    const token = process.env.GHL_TOKEN;
    if (!token) {
      return sendError(res, 500, 'GHL_TOKEN not configured on server');
    }

    const body = (req.body ?? {}) as {
      canal?: string;
      contactId?: string;
      mensaje?: string;
    };
    const tipo = body.canal ? tipoDeCanal(body.canal) : null;
    const contactId = (body.contactId ?? '').trim();
    const mensaje = (body.mensaje ?? '').trim();
    if (!tipo || !contactId || !mensaje) {
      return sendError(
        res,
        400,
        'cuerpo_invalido: faltan canal/contactId/mensaje (o canal desconocido)',
      );
    }

    const r = await sendConversationMessage(
      { token },
      { type: tipo, contactId, message: mensaje },
    );
    if (!r.ok) {
      // El cuerpo de error de GHL nombra la causa; el texto del mensaje NO se loguea.
      console.error(
        `[GhlSendMessage] envio fallido: status=${r.status} contact=${contactId} ${r.error ?? ''}`,
      );
      return sendError(res, 502, `envio_fallido: status=${r.status}`);
    }
    return sendSuccess(res, { enviado: true });
  },
  {
    methods: ['POST', 'OPTIONS'],
    requireGoogle: false,
    errorPrefix: 'GhlSendMessage',
  },
);
