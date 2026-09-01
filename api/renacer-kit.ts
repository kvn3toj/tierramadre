/**
 * GET /api/renacer-kit?codigo=101 — resuelve un código de invitación.
 *
 * El nombre del archivo es el de antes del pivote (31-08) y se conserva porque la app
 * ya lo llama así; lo que resuelve hoy es **la raíz** (el líder que invitó) y, como
 * camino legado, un código de kit.
 *
 * PÚBLICO, y esa es la restricción de diseño: el código es adivinable a propósito, así
 * que todo lo que este endpoint devuelva queda expuesto a quien teclee un número al
 * azar — por eso devuelve solo si existe, de quién viene (nombre y comunidad de la raíz)
 * y si ya fue usado. Nunca el contacto de la raíz, nunca nada de otros beneficiarios.
 *
 * 200: { existe: false, motivo } | { existe: true, origen, raiz?, activa, usado }
 * 400: código con formato inválido
 * 503: Renacer sin configurar en este entorno
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler, sendError, sendSuccess } from './_lib/index.js';
import {
  renacerClient,
  renacerConfigurado,
  tokenDeApp,
  parseCodigo,
} from './_lib/renacer-convex.js';
import { api } from '../convex-renacer/convex/_generated/api.js';

export default withApiHandler(
  async (req: VercelRequest, res: VercelResponse) => {
    if (!renacerConfigurado || !renacerClient) {
      return sendError(res, 503, 'Renacer no está configurado en este entorno.');
    }

    const codigo = parseCodigo(req.query.codigo);
    if (codigo === null) {
      return sendError(res, 400, 'Código inválido.');
    }

    const kit = await renacerClient.query(api.raices.resolverCodigo, {
      secret: tokenDeApp(),
      codigo,
    });

    return sendSuccess(res, { kit });
  },
  { methods: ['GET', 'OPTIONS'], requireGoogle: false, errorPrefix: 'RenacerKit' },
);
