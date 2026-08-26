/**
 * /api/renacer-muro — el muro de desahogo (§6.9).
 *
 *   GET  ?wall=desahogo → los mensajes visibles (los ocultados no salen)
 *   POST                → publicar, con la credencial del carnet
 *
 * **El autor no viene en el body.** Recibir `authorName` del cliente sería dejar que
 * cualquiera escriba en el muro de desahogo firmando con el nombre de otro damnificado.
 *
 * El muro de **aliento** (aportadores, §4.7) todavía no se sirve: el aportador no tiene
 * credencial diseñada — eso es el Task 14 del plan. Prefiero que falle a dejar acá un
 * camino suplantable "por ahora".
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler, sendError, sendSuccess } from './_lib/index.js';
import {
  renacerClient,
  renacerConfigurado,
  tokenDeApp,
  parseNumeroCarnet,
  parseTexto,
} from './_lib/renacer-convex.js';
import { api } from '../convex-renacer/convex/_generated/api.js';

const MAX_CUERPO = 2000;

export default withApiHandler(
  async (req: VercelRequest, res: VercelResponse) => {
    if (!renacerConfigurado || !renacerClient) {
      return sendError(res, 503, 'Renacer no está configurado en este entorno.');
    }

    if (req.method === 'GET') {
      // Solo el de desahogo mientras el de aliento no tenga credencial de aportador.
      const mensajes = await renacerClient.query(api.muro.mensajes, {
        secret: tokenDeApp(),
        wall: 'desahogo',
        limite: 100,
      });
      return sendSuccess(res, { mensajes });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const cardNumber = parseNumeroCarnet(body.cardNumber);
    const cardToken = parseTexto(body.cardToken, 128);
    const cuerpo = parseTexto(body.body, MAX_CUERPO);

    if (cardNumber === null || !cardToken || !cuerpo) {
      return sendError(res, 400, 'Parámetros inválidos.');
    }

    try {
      const id = await renacerClient.mutation(api.muro.publicarDesahogo, {
        secret: tokenDeApp(),
        cardNumber,
        cardToken,
        body: cuerpo,
      });
      return sendSuccess(res, { id });
    } catch {
      return sendError(res, 403, 'No autorizado.');
    }
  },
  {
    methods: ['GET', 'POST', 'OPTIONS'],
    requireGoogle: false,
    errorPrefix: 'RenacerMuro',
  },
);
