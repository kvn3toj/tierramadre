/**
 * POST /api/renacer-admin — la consola de operación (01-09), estilo `invitations.ts`:
 * una acción por request, `{ action, idToken, ...payload }`.
 *
 * **Dos llaves.** El operador presenta un token de Google/sesión cuyo correo verificado
 * está en `ADMIN_EMAILS`; este endpoint es el ÚNICO que conoce `RENACER_OPS_TOKEN` y lo
 * añade del lado del servidor. Ningún endpoint público toca ese token, y este endpoint no
 * hace nada sin el correo. Toda mutación viaja con `actorEmail` (el correo verificado —
 * jamás uno del body) y queda en la tabla `auditoria`.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler, sendError, sendSuccess } from './_lib/index.js';
import { renacerClient, renacerConfigurado } from './_lib/renacer-convex.js';
import { resolveAdminEmail } from './_lib/adminIdentity.js';
import { ipDe, permitir } from './_lib/renacer-ratelimit.js';
import { api } from '../convex-renacer/convex/_generated/api.js';

function tokenDeOps(): string | null {
  const t = process.env.RENACER_OPS_TOKEN?.trim();
  return t && t.length > 0 ? t : null;
}

/** Techo generoso: el operador está autenticado; esto solo frena un cliente enloquecido. */
const LIMITE_ADMIN_POR_MINUTO = 120;

export default withApiHandler(
  async (req: VercelRequest, res: VercelResponse) => {
    if (!renacerConfigurado || !renacerClient) {
      return sendError(res, 503, 'Renacer no está configurado en este entorno.');
    }
    const ops = tokenDeOps();
    if (!ops) {
      return sendError(res, 503, 'RENACER_OPS_TOKEN no está configurada; la consola no puede operar.');
    }
    if (!permitir('renacer-admin', ipDe(req), LIMITE_ADMIN_POR_MINUTO)) {
      return sendError(res, 429, 'Demasiadas llamadas. Esperá un minuto.');
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const action = typeof body.action === 'string' ? body.action : '';

    const quien = await resolveAdminEmail(body.idToken);
    if (!quien.ok) {
      return quien.reason === 'invalid_token'
        ? sendError(res, 401, 'Tu sesión expiró. Volvé a iniciar sesión con Google.')
        : sendError(res, 403, 'Esta cuenta no está habilitada para operar la campaña.');
    }
    const base = { secret: ops, actorEmail: quien.email };

    try {
      switch (action) {
        // ── DESPACHO ──
        case 'despacho':
          return sendSuccess(res, { filas: await renacerClient.query(api.admin.despacho, base) });
        case 'marcarEntrega':
          return sendSuccess(res, await renacerClient.mutation(api.admin.marcarEntrega, { ...base, needId: body.needId as never, estado: body.estado as never }));
        // ── PERSONAS ──
        case 'personas':
          return sendSuccess(res, { filas: await renacerClient.query(api.admin.personas, base) });
        case 'persona':
          return sendSuccess(res, { persona: await renacerClient.query(api.admin.persona, { ...base, id: body.id as never }) });
        case 'actualizarPersona': {
          const campos: Record<string, unknown> = {};
          for (const k of ['name', 'telefono', 'email', 'ubicacion', 'genero'] as const) {
            if (typeof body[k] === 'string') campos[k] = (body[k] as string).trim().slice(0, 500);
          }
          if (typeof body.edad === 'number' && Number.isFinite(body.edad)) campos.edad = body.edad;
          return sendSuccess(res, await renacerClient.mutation(api.admin.actualizarPersona, { ...base, id: body.id as never, ...campos }));
        }
        case 'borrarPersona': {
          const motivo = typeof body.motivo === 'string' ? body.motivo.trim().slice(0, 500) : '';
          if (!motivo) return sendError(res, 400, 'La supresión exige un motivo (queda en la auditoría).');
          return sendSuccess(res, await renacerClient.mutation(api.admin.borrarPersona, { ...base, id: body.id as never, motivo }));
        }
        // ── RAÍCES ──
        case 'raices':
          return sendSuccess(res, { filas: await renacerClient.query(api.raices.listar, { secret: ops }) });
        case 'emitirRaiz':
          return sendSuccess(res, { raiz: await renacerClient.mutation(api.raices.emitir, { secret: ops, codigoBase: body.codigoBase as never, tamano: body.tamano as never, nombre: body.nombre as never, comunidad: body.comunidad as never, zona: (body.zona ?? undefined) as never, contacto: (body.contacto ?? undefined) as never }) });
        case 'ampliarRaiz':
          return sendSuccess(res, await renacerClient.mutation(api.admin.ampliarRaiz, { ...base, codigoBase: body.codigoBase as never, tamanoNuevo: body.tamanoNuevo as never }));
        case 'estadoRaiz':
          return sendSuccess(res, await renacerClient.mutation(api.raices.marcarEstado, { secret: ops, codigoBase: body.codigoBase as never, estado: body.estado as never }));
        case 'enlacePanelRaiz':
          return sendSuccess(res, { enlace: await renacerClient.mutation(api.admin.enlacePanelRaiz, { ...base, codigoBase: body.codigoBase as never, regenerar: Boolean(body.regenerar) }) });
        // ── MUROS ──
        case 'muros':
          return sendSuccess(res, { filas: await renacerClient.query(api.admin.muros, { ...base, wall: body.wall as never }) });
        case 'moderarMensaje':
          return sendSuccess(res, await renacerClient.mutation(api.admin.moderarMensaje, { ...base, id: body.id as never, accion: body.accion as never }));
        // ── MANOS ──
        case 'voluntarios':
          return sendSuccess(res, { filas: await renacerClient.query(api.admin.voluntarios, base) });
        // ── CONEXIONES ──
        case 'candidatos':
          return sendSuccess(res, { filas: await renacerClient.query(api.admin.candidatos, { ...base, needId: body.needId as never }) });
        case 'conexiones':
          return sendSuccess(res, { filas: await renacerClient.query(api.admin.conexiones, base) });
        case 'crearConexion':
          return sendSuccess(res, await renacerClient.mutation(api.admin.crearConexion, { ...base, needId: body.needId as never, capacityId: (body.capacityId ?? undefined) as never, voluntarioId: (body.voluntarioId ?? undefined) as never, aportadorRef: (body.aportadorRef ?? undefined) as never, notas: (body.notas ?? undefined) as never }));
        case 'avanzarConexion':
          return sendSuccess(res, await renacerClient.mutation(api.admin.avanzarConexion, { ...base, id: body.id as never, estado: body.estado as never, notas: (body.notas ?? undefined) as never }));
        // ── AVISOS / VIGILANCIA ──
        case 'registrarAviso':
          return sendSuccess(res, await renacerClient.mutation(api.admin.registrarAviso, { ...base, beneficiaryId: (body.beneficiaryId ?? undefined) as never, voluntarioId: (body.voluntarioId ?? undefined) as never, canal: body.canal as never, mensaje: String(body.mensaje ?? '').slice(0, 500) as never, estado: (body.estado ?? 'registrada') as never, detalle: (body.detalle ?? undefined) as never }));
        case 'anomalias':
          return sendSuccess(res, { filas: await renacerClient.query(api.admin.anomalias, base) });
        case 'auditoria':
          return sendSuccess(res, { filas: await renacerClient.query(api.admin.auditoria, base) });
        default:
          return sendError(res, 400, `Acción desconocida: ${action || '(vacía)'}.`);
      }
    } catch (e) {
      // Los validadores de Convex y las reglas de negocio ("Chocaría con la raíz…") hablan
      // en errores; para la consola son 400 con el mensaje, no 500 anónimos.
      const mensaje = e instanceof Error ? e.message : 'Error inesperado.';
      return sendError(res, 400, mensaje.replace(/^\[.*?\]\s*/, '').slice(0, 400));
    }
  },
  { methods: ['POST', 'OPTIONS'], requireGoogle: false, errorPrefix: 'RenacerAdmin' },
);
