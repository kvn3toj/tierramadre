/**
 * GET /api/renacer-contadores — los números de la campaña para el hub del aportador
 * (31-08): raíces activas, familias inscritas, necesidades abiertas, voluntarios.
 *
 * Público y barato: 1 documento en el Convex de Renacer, con caché corto en el edge. El
 * recaudo no está acá — vive en el Convex de TM y entra en Fase 3 (D-0831-7).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler, sendError, sendSuccess } from './_lib/index.js';
import { renacerClient, renacerConfigurado, tokenDeApp } from './_lib/renacer-convex.js';
import { api } from '../convex-renacer/convex/_generated/api.js';

export default withApiHandler(
  async (_req: VercelRequest, res: VercelResponse) => {
    if (!renacerConfigurado || !renacerClient) {
      return sendError(res, 503, 'Renacer no está configurado en este entorno.');
    }
    const contadores = await renacerClient.query(api.stats.leer, { secret: tokenDeApp() });
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return sendSuccess(res, { contadores });
  },
  { methods: ['GET', 'OPTIONS'], requireGoogle: false, errorPrefix: 'RenacerContadores' },
);
