/**
 * GHL (workflow WF-ANIMA) → anima-bot, el turno del cotizador — Y el envío de vuelta.
 *
 * POST autenticado con `Authorization: <GHL_API_SECRET>` (con o sin `Bearer` — ver
 * `autorizacionValida`): el MISMO custom value `internal_api_secret` que WF-04 ya usa. Reenvía
 * el cuerpo TAL CUAL al `/cotizador/turno` de anima-bot (túnel en `ANIMA_TURNO_UPSTREAM`) y:
 *
 *  1. ENVÍA la respuesta al cliente por la API de conversaciones de GHL (mensaje de sesión,
 *     texto libre). Esto vive AQUÍ y no en el workflow porque la acción "WhatsApp" de los
 *     workflows de GHL solo admite plantillas aprobadas por Meta — no hay acción de texto
 *     libre. La ventana de 24h no es problema: siempre respondemos al mensaje que el cliente
 *     acaba de mandar. La regla LITERAL queda cumplida por plomería: el texto viaja del
 *     cotizador al cliente sin ningún modelo en el medio.
 *  2. Devuelve al workflow `TurnoRespuesta` + `texto` + `enviado`, para observabilidad en el
 *     historial de ejecuciones.
 *
 * Si anima-bot no contesta (Mac dormida, túnel caído, timeout): se le envía al cliente el
 * fallback («Dame un momento…») y se taggea `anima-offline` para la smart list de relevo
 * humano. Nada se pierde en silencio.
 *
 * Env: ANIMA_TURNO_UPSTREAM, ANIMA_COTIZADOR_SECRET, GHL_TOKEN, GHL_LOCATION_ID.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler, sendError } from './_lib/index.js';
import { addTags } from './_lib/ghl-client.js';
import { sendConversationMessage, tipoDeCanal } from './_lib/ghl-send.js';
import {
  FALLBACK_TURNO,
  autorizacionValida,
  parseTurno,
  reenviarTurno,
  textoParaCliente,
} from './_lib/anima-turno.js';

export default withApiHandler(
  async (req: VercelRequest, res: VercelResponse) => {
    if (!process.env.GHL_API_SECRET) {
      return sendError(res, 500, 'GHL_API_SECRET not configured on server');
    }
    if (
      !autorizacionValida(
        req.headers['authorization'],
        process.env.GHL_API_SECRET,
      )
    ) {
      return sendError(res, 401, 'Unauthorized');
    }

    const turno = parseTurno(req.body);
    if (!turno) {
      // 400 y no fallback: un cuerpo malformado es un error de CONFIGURACIÓN del workflow
      // (mapeo de {{contact.id}}/{{message.body}}), y eso debe doler en el log de ejecución,
      // no disfrazarse de "ya te escribo".
      return sendError(
        res,
        400,
        'cuerpo_invalido: faltan canal/externalId/mensaje',
      );
    }

    const upstream = (process.env.ANIMA_TURNO_UPSTREAM ?? '').trim();
    const secret = (process.env.ANIMA_COTIZADOR_SECRET ?? '').trim();

    const respuesta =
      upstream && secret
        ? await reenviarTurno({ upstream, secret }, turno)
        : null;

    const token = process.env.GHL_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!respuesta && token && locationId) {
      // anima-bot no contestó: el tag deja al lead recuperable en una smart list. Best-effort —
      // si también falla, el fallback sale igual: lo primero es que el cliente reciba ALGO.
      // `externalId` ES el contact id de GHL por diseño (el workflow manda {{contact.id}}).
      await addTags({ token, locationId }, turno.externalId, [
        'anima-offline',
      ]).catch(() => {});
    }

    const payload = respuesta
      ? { ...respuesta, texto: textoParaCliente(respuesta) }
      : { ...FALLBACK_TURNO, texto: FALLBACK_TURNO.mensaje };

    // El envío al cliente. `sin_cotizacion` produce texto vacío → no se envía nada (el lead
    // queda para el humano). Un fallo de envío no tumba el turno: queda visible en `enviado`.
    let enviado = false;
    const tipo = tipoDeCanal(turno.canal);
    if (payload.texto !== '' && tipo && token) {
      const r = await sendConversationMessage(
        { token },
        { type: tipo, contactId: turno.externalId, message: payload.texto },
      );
      enviado = r.ok;
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).json({ ...payload, enviado });
  },
  {
    methods: ['POST', 'OPTIONS'],
    requireGoogle: false,
    errorPrefix: 'AnimaTurno',
  },
);
