/**
 * GET /api/renacer-raiz?codigo=100&t=<token> — el panel de la raíz.
 *
 * La superficie que la reunión del 31-08 pidió primero: quien invita ve su bloque, cuáles
 * códigos ya se usaron y cuál sigue libre para entregar. «Sol me habilita a mí las
 * invitaciones y yo decido a quién le habilito el código.»
 *
 * **Exige el token**, por lo mismo que `renacer-carnet`: `codigo` es dictable por teléfono
 * —y por lo tanto adivinable—, y esta ruta LEE. Sin token, teclear `100` abriría el bloque
 * de Pablo a cualquiera.
 *
 * 200: { panel: {…} | null }  — `null` cubre por igual "no existe", "sin panel" y
 *      "token equivocado"; separarlos le confirmaría a quien tantea qué bloques existen.
 * 400: parámetros inválidos
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler, sendError, sendSuccess } from './_lib/index.js';
import {
  renacerClient,
  renacerConfigurado,
  tokenDeApp,
  parseCodigo,
} from './_lib/renacer-convex.js';
import { ipDe, permitir, LIMITES } from './_lib/renacer-ratelimit.js';
import { api } from '../convex-renacer/convex/_generated/api.js';

export default withApiHandler(
  async (req: VercelRequest, res: VercelResponse) => {
    if (!renacerConfigurado || !renacerClient) {
      return sendError(res, 503, 'Renacer no está configurado en este entorno.');
    }

    if (!permitir('renacer-raiz', ipDe(req), LIMITES.panelRaiz)) {
      return sendError(res, 429, 'Demasiados intentos. Esperá un minuto e intentá de nuevo.');
    }

    const codigo = parseCodigo(req.query.codigo);
    const token = typeof req.query.t === 'string' ? req.query.t.trim() : '';

    // Mismo 400 para las dos fallas de formato: no le decimos a quien tantea cuál falló.
    if (codigo === null || token.length === 0 || token.length > 128) {
      return sendError(res, 400, 'Parámetros inválidos.');
    }

    const panel = await renacerClient.query(api.raices.panel, {
      secret: tokenDeApp(),
      codigoBase: codigo,
      token,
    });

    // NOMBRADO, y no es estilo: `sendSuccess` hace `{ success: true, ...data }`, así que
    // un `null` suelto se serializaría como `{"success":true}` — un objeto TRUTHY que la
    // pantalla tomaría por un panel válido. Misma trampa documentada en `renacer-carnet`.
    return sendSuccess(res, { panel });
  },
  { methods: ['GET', 'OPTIONS'], requireGoogle: false, errorPrefix: 'RenacerRaiz' },
);
