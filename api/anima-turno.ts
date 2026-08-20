/**
 * María (GHL Agent Studio) → anima-bot, el turno del cotizador.
 *
 * POST autenticado con `Authorization: Bearer <GHL_API_SECRET>` — el MISMO custom value
 * `internal_api_secret` que WF-04 ya manda a /api/ghl-search-products, así la tool nueva de
 * María es la receta que GHL ya conoce. Este endpoint reenvía el cuerpo TAL CUAL al
 * `/cotizador/turno` de anima-bot (detrás de un túnel que rota: env `ANIMA_TURNO_UPSTREAM`) y
 * devuelve la respuesta SIN envolver — María repite `mensaje` byte a byte (regla LITERAL del
 * spec 2026-07-31-ghl-maria-anima-config.md, repo anima-bot).
 *
 * Si anima-bot no contesta (Mac dormida, túnel caído, timeout): 200 con FALLBACK_TURNO — nunca
 * un error de conexión — y tag `anima-offline` al contacto, para que el lead quede recuperable
 * en una smart list en vez de perderse en silencio.
 *
 * Env: ANIMA_TURNO_UPSTREAM, ANIMA_COTIZADOR_SECRET (+ GHL_TOKEN/GHL_LOCATION_ID para el tag).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler, sendError } from './_lib/index.js';
import { bearerMatches } from './_lib/bearer.js';
import { addTags } from './_lib/ghl-client.js';
import {
  FALLBACK_TURNO,
  parseTurno,
  reenviarTurno,
} from './_lib/anima-turno.js';

export default withApiHandler(
  async (req: VercelRequest, res: VercelResponse) => {
    if (!process.env.GHL_API_SECRET) {
      return sendError(res, 500, 'GHL_API_SECRET not configured on server');
    }
    if (
      !bearerMatches(req.headers['authorization'], process.env.GHL_API_SECRET)
    ) {
      return sendError(res, 401, 'Unauthorized');
    }

    const turno = parseTurno(req.body);
    if (!turno) {
      // 400 y no fallback: un cuerpo malformado es un error de CONFIGURACIÓN de la tool de
      // María (mapeo de {{contact.id}}/{{message.body}}), y eso debe doler en el log del
      // workflow, no disfrazarse de "ya te escribo".
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

    if (respuesta) {
      // Passthrough crudo, sin el sobre {success:true}: el contrato de la tool ES TurnoRespuesta.
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).json(respuesta);
    }

    // anima-bot no contestó. El tag es best-effort: si también falla, el fallback sale igual —
    // lo primero es que el cliente reciba UNA respuesta.
    const token = process.env.GHL_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;
    if (token && locationId) {
      // `externalId` ES el contact id de GHL por diseño del spec (la tool manda {{contact.id}}).
      await addTags({ token, locationId }, turno.externalId, [
        'anima-offline',
      ]).catch(() => {});
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).json(FALLBACK_TURNO);
  },
  {
    methods: ['POST', 'OPTIONS'],
    requireGoogle: false,
    errorPrefix: 'AnimaTurno',
  },
);
