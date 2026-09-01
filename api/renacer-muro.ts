/**
 * /api/renacer-muro — los muros de desahogo (§6.9) y de gratitud (31-08).
 *
 *   GET  ?wall=desahogo|gratitud → los mensajes visibles (los ocultados no salen)
 *   POST { wall, body, cardNumber, cardToken } → publicar, con la credencial del carnet
 *
 * **El autor no viene en el body.** Recibir `authorName` del cliente sería dejar que
 * cualquiera escriba firmando con el nombre de otro damnificado.
 *
 * `wall` por defecto es `desahogo`: los clientes anteriores al 2026-09-01 no lo mandan.
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
import { ipDe, permitir, LIMITES } from './_lib/renacer-ratelimit.js';

const MAX_CUERPO = 2000;

/** Los muros que este endpoint sirve. `aliento` no está: no hay credencial de aportador. */
const MUROS = ['desahogo', 'gratitud'] as const;
type Muro = (typeof MUROS)[number];

function parseMuro(valor: unknown): Muro | null {
  if (valor === undefined || valor === null || valor === '') return 'desahogo';
  return MUROS.includes(valor as Muro) ? (valor as Muro) : null;
}

export default withApiHandler(
  async (req: VercelRequest, res: VercelResponse) => {
    if (!renacerConfigurado || !renacerClient) {
      return sendError(res, 503, 'Renacer no está configurado en este entorno.');
    }

    if (req.method === 'GET') {
      const muro = parseMuro(req.query.wall);
      if (muro === null) return sendError(res, 400, 'Parámetros inválidos.');
      const mensajes = await renacerClient.query(api.muro.mensajes, {
        secret: tokenDeApp(),
        wall: muro,
        limite: 100,
      });
      return sendSuccess(res, { mensajes });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;

    // Reportar un mensaje (consola 01-09): público, sin credencial — señala, no oculta.
    // La respuesta es la misma exista o no el id: nada que confirmarle a quien tantea.
    if (body.accion === 'reportar') {
      if (!permitir('renacer-muro-reporte', ipDe(req), LIMITES.reporte)) {
        return sendError(res, 429, 'Demasiados reportes. Esperá un minuto.');
      }
      const id = typeof body.id === 'string' ? body.id.trim() : '';
      if (!id || id.length > 64) return sendError(res, 400, 'Parámetros inválidos.');
      try {
        await renacerClient.mutation(api.muro.reportar, { secret: tokenDeApp(), id: id as never });
      } catch {
        /* id con formato ajeno a Convex: mismo silencio que un id inexistente */
      }
      return sendSuccess(res, { ok: true });
    }

    const cardNumber = parseNumeroCarnet(body.cardNumber);
    const cardToken = parseTexto(body.cardToken, 128);
    const cuerpo = parseTexto(body.body, MAX_CUERPO);
    const muro = parseMuro(body.wall);

    if (cardNumber === null || !cardToken || !cuerpo || muro === null) {
      return sendError(res, 400, 'Parámetros inválidos.');
    }

    try {
      const id = await renacerClient.mutation(api.muro.publicar, {
        secret: tokenDeApp(),
        wall: muro,
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
