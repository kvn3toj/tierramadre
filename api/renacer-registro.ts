/**
 * POST /api/renacer-registro — el registro del beneficiario en campo.
 *
 * Recibe datos y necesidades juntos porque el registro es una sola transacción — si la
 * persona quedara creada y sus necesidades fallaran, tendríamos a alguien registrado sin
 * turno, que en el §9 es peor que no estar registrado: parece atendida y no lo está.
 *
 * **Minimización (§10.4 + D-0831-3):** nombre, ubicación, edad, género, teléfono. Sin
 * documento: la sala lo pidió el 31-08 y entra solo con dictamen legal.
 *
 * **La respuesta trae el `cardToken` una sola vez.** El cliente la guarda; el servidor
 * no la vuelve a mostrar.
 *
 * 200: { registro: { cardNumber, cardToken, beneficiaryId } }
 * 400: cuerpo inválido, sin habeas data, o sin necesidades
 * 409: el código ya fue usado / no está activo / es el de la raíz
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler, sendError, sendSuccess } from './_lib/index.js';
import {
  renacerClient,
  renacerConfigurado,
  tokenDeApp,
  parseCodigo,
  parseTexto,
} from './_lib/renacer-convex.js';
import { api } from '../convex-renacer/convex/_generated/api.js';
import { ipDe, permitir, LIMITES } from './_lib/renacer-ratelimit.js';

const MAX_NECESIDADES = 20;
const MAX_CAPACIDADES = 20;

function parsePar(
  crudo: unknown,
  campoA: string,
  campoB: string,
): { a: string; b: string; categoria?: string } | null {
  if (typeof crudo !== 'object' || crudo === null) return null;
  const obj = crudo as Record<string, unknown>;
  const a = parseTexto(obj[campoA], 1000);
  const b = parseTexto(obj[campoB], 1000);
  if (!a || !b) return null;
  const categoria = parseTexto(obj.categoria, 60) ?? undefined;
  return { a, b, categoria };
}

/** Un mensaje del backend que describe un código rechazado vale un 409, no un 500. */
function esConflictoDeCodigo(mensaje: string): boolean {
  return /código|invitación|invita/i.test(mensaje);
}

export default withApiHandler(
  async (req: VercelRequest, res: VercelResponse) => {
    if (!renacerConfigurado || !renacerClient) {
      return sendError(res, 503, 'Renacer no está configurado en este entorno.');
    }

    if (!permitir('renacer-registro', ipDe(req), LIMITES.registro)) {
      return sendError(res, 429, 'Demasiados intentos. Esperá un minuto e intentá de nuevo.');
    }

    const body = (req.body ?? {}) as Record<string, unknown>;

    // `codigo` es el nombre nuevo; `kitCode` se acepta por compatibilidad con la app vieja.
    const codigo = parseCodigo(body.codigo ?? body.kitCode);
    if (codigo === null) return sendError(res, 400, 'Código inválido.');

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

    const telefono = parseTexto(body.telefono, 40) ?? undefined;
    if (telefono && !/^[+0-9()\s-]{7,40}$/.test(telefono)) {
      return sendError(res, 400, 'Teléfono inválido.');
    }

    // Los consentimientos se leen como `=== true`: fail-closed significa que cualquier
    // cosa que no sea un sí explícito es un no.
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
    // "Por qué importa" es opcional desde el 01-09: solo el qué es obligatorio.
    const needs = needsCrudo.map((n) => {
      if (typeof n !== 'object' || n === null) return null;
      const obj = n as Record<string, unknown>;
      const a = parseTexto(obj.whatINeed, 1000);
      if (!a) return null;
      return { a, b: parseTexto(obj.whyItMatters, 1000) ?? '', categoria: parseTexto(obj.categoria, 60) ?? undefined };
    });
    if (needs.some((n) => n === null)) {
      return sendError(res, 400, 'Alguna necesidad viene sin el qué.');
    }

    const capsCrudo = Array.isArray(body.capacities) ? body.capacities : [];
    if (capsCrudo.length > MAX_CAPACIDADES) {
      return sendError(res, 400, 'Demasiadas capacidades.');
    }
    const capacities = capsCrudo.map((c) => parsePar(c, 'title', 'description'));
    if (capacities.some((c) => c === null)) {
      return sendError(res, 400, 'Alguna capacidad viene incompleta.');
    }

    try {
      const resultado = await renacerClient.mutation(api.registro.registrarBeneficiario, {
        secret: tokenDeApp(),
        codigo,
        name,
        email: parseTexto(body.email, 200) ?? undefined,
        telefono,
        googleId: parseTexto(body.googleId, 200) ?? undefined,
        ubicacion,
        edad,
        genero,
        habeasData,
        donorVisibilityConsent: body.donorVisibilityConsent === true,
        imageConsent: body.imageConsent === true,
        assistedBy: parseTexto(body.assistedBy, 120) ?? undefined,
        needs: needs.map((n) => ({ whatINeed: n!.a, whyItMatters: n!.b, categoria: n!.categoria })),
        capacities: capacities.map((c) => ({ title: c!.a, description: c!.b })),
      });
      return sendSuccess(res, { registro: resultado });
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : '';
      if (esConflictoDeCodigo(mensaje)) {
        // El backend ya dice por qué en lenguaje de persona ("ya fue usado", "pedile uno
        // nuevo"); se pasa tal cual, sin envolverlo en un 500.
        return sendError(res, 409, mensaje.replace(/^Uncaught Error:\s*/, '').split('\n')[0]);
      }
      throw e;
    }
  },
  { methods: ['POST', 'OPTIONS'], requireGoogle: false, errorPrefix: 'RenacerRegistro' },
);
