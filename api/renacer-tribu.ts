/**
 * /api/renacer-tribu — el Mapa de la Tribu (§6.8).
 *
 *   GET  → las necesidades de otros, acotadas
 *   POST → sumarse con "+1" a una necesidad
 *
 * **La regla de visibilidad del §10.3 se aplica en el backend, no acá ni en el JSX:**
 * el texto de la necesidad se muestra; la identidad de quien la pidió solo sale con
 * `donorVisibilityConsent` explícito. Filtrarla en la pantalla sería mandar el nombre
 * por la red y confiar en que nadie lo pinte.
 *
 * El "+1" no recibe un `beneficiaryId`: quién se suma se resuelve desde la credencial
 * del carnet. Un id en el body es una afirmación del cliente, no una identidad — y
 * `supportCount` alimenta cómo operaciones prioriza.
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

const LIMITE_MAX = 100;

export default withApiHandler(
  async (req: VercelRequest, res: VercelResponse) => {
    if (!renacerConfigurado || !renacerClient) {
      return sendError(res, 503, 'Renacer no está configurado en este entorno.');
    }

    if (req.method === 'GET') {
      const pedido = Number(req.query.limite ?? 50);
      const limite = Number.isInteger(pedido) && pedido > 0
        ? Math.min(pedido, LIMITE_MAX)
        : 50;

      const necesidades = await renacerClient.query(api.tribu.necesidades, {
        secret: tokenDeApp(),
        limite,
      });
      return sendSuccess(res, { necesidades });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const needId = parseTexto(body.needId, 64);
    const cardNumber = parseNumeroCarnet(body.cardNumber);
    const cardToken = parseTexto(body.cardToken, 128);

    if (!needId || cardNumber === null || !cardToken) {
      return sendError(res, 400, 'Parámetros inválidos.');
    }

    try {
      const resultado = await renacerClient.mutation(api.tribu.sumarse, {
        secret: tokenDeApp(),
        needId: needId as never,
        cardNumber,
        cardToken,
      });
      return sendSuccess(res, { resultado });
    } catch {
      // La credencial no corresponde. Un 403 genérico, sin decir si falló el número o
      // el token — distinguirlos le confirmaría a quien tantea qué carnets existen.
      return sendError(res, 403, 'No autorizado.');
    }
  },
  {
    methods: ['GET', 'POST', 'OPTIONS'],
    requireGoogle: false,
    errorPrefix: 'RenacerTribu',
  },
);
