/**
 * POST /api/renacer-registro — el registro del beneficiario en campo.
 *
 * El orden del §6 es no negociable y el form lo respeta: necesidades PRIMERO, datos
 * DESPUÉS. Este endpoint recibe las dos partes juntas porque el registro es una sola
 * transacción — si la persona quedara creada y sus necesidades fallaran, tendríamos a
 * alguien registrado sin turno, que en el §9 es peor que no estar registrado: parece
 * atendida y no lo está.
 *
 * **Minimización (§10.4):** nombre, ubicación, edad, género. Nada más. Si alguien agrega
 * acá documento, ingresos o composición familiar, está rompiendo una decisión ratificada.
 *
 * **La respuesta trae el `cardToken` una sola vez.** Es la credencial con la que después
 * esta persona abre su carnet, se suma a una necesidad y escribe en el muro. El cliente
 * la guarda; el servidor no la vuelve a mostrar.
 *
 * 200: { cardNumber, cardToken, beneficiaryId }
 * 400: cuerpo inválido, o sin consentimiento de habeas data, o sin necesidades
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler, sendError, sendSuccess } from './_lib/index.js';
import {
  renacerClient,
  renacerConfigurado,
  tokenDeApp,
  parseCodigoKit,
  parseTexto,
} from './_lib/renacer-convex.js';
import { api } from '../convex-renacer/convex/_generated/api.js';

const MAX_NECESIDADES = 20;
const MAX_CAPACIDADES = 20;

/** Un par {qué necesito, por qué importa} — el mismo par del vocabulario CoomÜnity (§8.3). */
function parsePar(
  crudo: unknown,
  campoA: string,
  campoB: string,
): { a: string; b: string } | null {
  if (typeof crudo !== 'object' || crudo === null) return null;
  const obj = crudo as Record<string, unknown>;
  const a = parseTexto(obj[campoA], 1000);
  const b = parseTexto(obj[campoB], 1000);
  return a && b ? { a, b } : null;
}

export default withApiHandler(
  async (req: VercelRequest, res: VercelResponse) => {
    if (!renacerConfigurado || !renacerClient) {
      return sendError(res, 503, 'Renacer no está configurado en este entorno.');
    }

    const body = (req.body ?? {}) as Record<string, unknown>;

    const kitCode = parseCodigoKit(body.kitCode);
    if (kitCode === null) return sendError(res, 400, 'Código de kit inválido.');

    const name = parseTexto(body.name, 120);
    const ubicacion = parseTexto(body.ubicacion, 500);
    const genero = parseTexto(body.genero, 60);
    if (!name || !ubicacion || !genero) {
      return sendError(res, 400, 'Faltan datos mínimos (nombre, ubicación, género).');
    }

    const edad = Number(body.edad);
    if (!Number.isInteger(edad) || edad < 0 || edad > 120) {
      return sendError(res, 400, 'Edad inválida.');
    }

    // Los tres consentimientos se leen como `=== true` y no como "truthy": fail-closed
    // significa que cualquier cosa que no sea un sí explícito es un no.
    const habeasData = body.habeasData === true;
    if (!habeasData) {
      return sendError(
        res,
        400,
        'No se puede registrar sin consentimiento de habeas data (§10.1).',
      );
    }

    const needsCrudo = Array.isArray(body.needs) ? body.needs : [];
    if (needsCrudo.length === 0 || needsCrudo.length > MAX_NECESIDADES) {
      return sendError(res, 400, 'Se requiere al menos una necesidad.');
    }
    const needs = needsCrudo.map((n) => parsePar(n, 'whatINeed', 'whyItMatters'));
    if (needs.some((n) => n === null)) {
      return sendError(res, 400, 'Alguna necesidad viene incompleta.');
    }

    const capsCrudo = Array.isArray(body.capacities) ? body.capacities : [];
    if (capsCrudo.length > MAX_CAPACIDADES) {
      return sendError(res, 400, 'Demasiadas capacidades.');
    }
    const capacities = capsCrudo.map((c) => parsePar(c, 'title', 'description'));
    if (capacities.some((c) => c === null)) {
      return sendError(res, 400, 'Alguna capacidad viene incompleta.');
    }

    const resultado = await renacerClient.mutation(api.registro.registrarBeneficiario, {
      secret: tokenDeApp(),
      kitCode,
      name,
      email: parseTexto(body.email, 200) ?? undefined,
      googleId: parseTexto(body.googleId, 200) ?? undefined,
      ubicacion,
      edad,
      genero,
      habeasData,
      donorVisibilityConsent: body.donorVisibilityConsent === true,
      imageConsent: body.imageConsent === true,
      // El camino asistido (D-2): sin Google, pero deja quién asistió — es lo que hace
      // medible la mitigación de equidad del §9.
      assistedBy: parseTexto(body.assistedBy, 120) ?? undefined,
      needs: needs.map((n) => ({ whatINeed: n!.a, whyItMatters: n!.b })),
      capacities: capacities.map((c) => ({ title: c!.a, description: c!.b })),
    });

    return sendSuccess(res, { registro: resultado });
  },
  { methods: ['POST', 'OPTIONS'], requireGoogle: false, errorPrefix: 'RenacerRegistro' },
);
