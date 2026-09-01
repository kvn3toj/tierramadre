/**
 * GET /api/renacer-tablero — el tablero público de la campaña (31-08).
 *
 * Solo agregados: por bolsa, por comunidad, capacidades más ofrecidas y los últimos pedidos
 * sin nombre. Caché corto en el edge: es la lectura más repetida y la menos urgente.
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
    const tablero = await renacerClient.query(api.stats.tablero, { secret: tokenDeApp() });
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return sendSuccess(res, { tablero });
  },
  { methods: ['GET', 'OPTIONS'], requireGoogle: false, errorPrefix: 'RenacerTablero' },
);
