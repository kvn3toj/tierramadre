/**
 * GET /api/renacer-kit?codigo=101 — resuelve el código impreso en el estuche.
 *
 * PÚBLICO, y esa es la restricción de diseño: el código es **adivinable a propósito**
 * (§3.4 · G-A.2 aceptó el riesgo, mitigado por la entrega en presencia). Así que todo
 * lo que este endpoint devuelva queda expuesto a quien teclee un número al azar — por
 * eso devuelve solo si el código existe y de qué tipo es. Nunca el contacto del
 * aportador, nunca nada de otros beneficiarios.
 *
 * 200: { existe: false } | { existe: true, tipo, producto, estado }
 * 400: código con formato inválido
 * 503: Renacer sin configurar en este entorno
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler, sendError, sendSuccess } from './_lib/index.js';
import {
  renacerClient,
  renacerConfigurado,
  tokenDeApp,
  parseCodigoKit,
} from './_lib/renacer-convex.js';
import { api } from '../convex-renacer/convex/_generated/api.js';

export default withApiHandler(
  async (req: VercelRequest, res: VercelResponse) => {
    if (!renacerConfigurado || !renacerClient) {
      return sendError(res, 503, 'Renacer no está configurado en este entorno.');
    }

    const codigo = parseCodigoKit(req.query.codigo);
    if (codigo === null) {
      return sendError(res, 400, 'Código inválido.');
    }

    const kit = await renacerClient.query(api.kits.porCodigo, {
      secret: tokenDeApp(),
      code: codigo,
    });

    return sendSuccess(res, { kit });
  },
  { methods: ['GET', 'OPTIONS'], requireGoogle: false, errorPrefix: 'RenacerKit' },
);
