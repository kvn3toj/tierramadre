/**
 * POST /api/renacer-voluntario — "Quiero ayudar → Enlistar mis capacidades" (31-08).
 *
 * Quien ofrece lo que sabe hacer sin ser beneficiario ni comprador. Datos mínimos:
 * nombre y un contacto; de dónde viene y por qué quiere ayudar son opcionales — se
 * piden porque la sala quiere poder "ver de dónde salió" cada voluntario, no porque
 * hagan falta para anotarlo.
 *
 * 200: { voluntario: { voluntarioId } }
 * 400: cuerpo inválido, sin habeas data, o sin capacidades
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler, sendError, sendSuccess } from './_lib/index.js';
import {
  renacerClient,
  renacerConfigurado,
  tokenDeApp,
  parseTexto,
} from './_lib/renacer-convex.js';
import { api } from '../convex-renacer/convex/_generated/api.js';
import { ipDe, permitir, LIMITES } from './_lib/renacer-ratelimit.js';

const MAX_CAPACIDADES = 20;

export default withApiHandler(
  async (req: VercelRequest, res: VercelResponse) => {
    if (!renacerConfigurado || !renacerClient) {
      return sendError(res, 503, 'Renacer no está configurado en este entorno.');
    }

    if (!permitir('renacer-voluntario', ipDe(req), LIMITES.voluntario)) {
      return sendError(res, 429, 'Demasiados intentos. Esperá un minuto e intentá de nuevo.');
    }

    const body = (req.body ?? {}) as Record<string, unknown>;

    const nombre = parseTexto(body.nombre, 120);
    const contacto = parseTexto(body.contacto, 200);
    if (!nombre || !contacto) {
      return sendError(res, 400, 'Faltan nombre y contacto.');
    }

    if (body.habeasData !== true) {
      return sendError(res, 400, 'No se puede registrar sin consentimiento de habeas data.');
    }

    const capsCrudo = Array.isArray(body.capacities) ? body.capacities : [];
    if (capsCrudo.length === 0 || capsCrudo.length > MAX_CAPACIDADES) {
      return sendError(res, 400, 'Enlistá al menos una capacidad.');
    }
    const capacities: Array<{ title: string; description: string; category?: string }> = [];
    for (const crudo of capsCrudo) {
      if (typeof crudo !== 'object' || crudo === null) {
        return sendError(res, 400, 'Alguna capacidad viene incompleta.');
      }
      const c = crudo as Record<string, unknown>;
      const title = parseTexto(c.title, 200);
      if (!title) return sendError(res, 400, 'Alguna capacidad viene sin nombre.');
      capacities.push({
        title,
        // La descripción es opcional para el voluntario: el título ya dice qué ofrece.
        description: parseTexto(c.description, 1000) ?? '',
        category: parseTexto(c.category, 60) ?? undefined,
      });
    }

    const voluntario = await renacerClient.mutation(api.voluntarios.registrarVoluntario, {
      secret: tokenDeApp(),
      nombre,
      contacto,
      procedencia: parseTexto(body.procedencia, 200) ?? undefined,
      motivo: parseTexto(body.motivo, 1000) ?? undefined,
      habeasData: true,
      capacities,
    });

    return sendSuccess(res, { voluntario });
  },
  { methods: ['POST', 'OPTIONS'], requireGoogle: false, errorPrefix: 'RenacerVoluntario' },
);
