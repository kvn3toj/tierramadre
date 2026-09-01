/**
 * GET /api/renacer-carnet?numero=111&t=<token> — el carnet del beneficiario.
 *
 * **Exige el token** (D-1 del plan). El argumento que hizo aceptable un código de kit
 * adivinable fue "el flujo del código no lee, escribe", y no se extiende acá: esta ruta
 * SÍ lee, y con números secuenciales cualquiera teclearía `112` para ver el registro de
 * un damnificado. Como el QR del carnet es digital y no impreso (§3.2), el token sale gratis.
 *
 * Devuelve lo que una entrega necesita para verificar "¿dónde y a quién?" — y la
 * ubicación no está en esa lista: quien entrega ya está ahí.
 *
 * 200: { cardNumber, primerNombre, kitCode } | null (token o número que no corresponden)
 * 400: parámetros inválidos
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler, sendError, sendSuccess } from './_lib/index.js';
import {
  renacerClient,
  renacerConfigurado,
  tokenDeApp,
  parseNumeroCarnet,
} from './_lib/renacer-convex.js';
import { api } from '../convex-renacer/convex/_generated/api.js';

export default withApiHandler(
  async (req: VercelRequest, res: VercelResponse) => {
    if (!renacerConfigurado || !renacerClient) {
      return sendError(res, 503, 'Renacer no está configurado en este entorno.');
    }

    const numero = parseNumeroCarnet(req.query.numero);
    const token = typeof req.query.t === 'string' ? req.query.t.trim() : '';

    // Mismo 400 para las dos fallas de formato: no le decimos a quien tantea cuál falló.
    if (numero === null || token.length === 0 || token.length > 128) {
      return sendError(res, 400, 'Parámetros inválidos.');
    }

    const carnet = await renacerClient.query(api.registro.carnet, {
      secret: tokenDeApp(),
      cardNumber: numero,
      token,
    });

    // `null` tanto para "no existe" como para "token equivocado" — la query del backend
    // ya los hace indistinguibles, y acá no los volvemos a separar.
    //
    // **Sobre NOMBRADO, y no es estilo.** `sendSuccess` hace `{ success: true, ...data }`,
    // así que un `null` suelto se serializa como `{"success":true}` — un objeto TRUTHY.
    // La pantalla del carnet lo habría tomado por un carnet válido y habría pintado
    // nombre y número `undefined` en vez de negarse a mostrar nada. Medido en local el
    // 2026-08-25, antes de que llegara a ninguna parte.
    return sendSuccess(res, { carnet });
  },
  { methods: ['GET', 'OPTIONS'], requireGoogle: false, errorPrefix: 'RenacerCarnet' },
);
