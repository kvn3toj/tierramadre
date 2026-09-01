/**
 * La consola de operación de Renacer (01-09) — lo que una persona de Tierra Mädre hace
 * SIN terminal: despachar necesidades, corregir o borrar un registro, emitir y ampliar
 * raíces, moderar los muros, ver a los voluntarios, comprometer conexiones y avisar.
 *
 * Dos llaves, no una: el endpoint de Vercel exige un correo Google VERIFICADO que esté en
 * `ADMIN_EMAILS` y guarda el `RENACER_OPS_TOKEN` del lado del servidor. Cada mutation
 * recibe `actorEmail` y escribe una línea en `auditoria`. El token compartido dice "alguien
 * con el token"; el correo dice quién.
 *
 * Decisión A (01-09): NO hay bandeja de aprobación. Todo registro entra a la cola en el
 * acto — el aval de la raíz ES la confianza — y la consola señala anomalías para revisar.
 *
 * Plan gratis: toda lista va por índice y con techo.
 */

import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { exigirTokenDeOps, nuevoTokenOpaco } from './lib/guardas';
import { sumarStat } from './stats';

const TECHO = 300;

async function auditar(ctx: { db: any }, actorEmail: string, accion: string, objetivo: string, detalle?: string) {
  await ctx.db.insert('auditoria', { actorEmail, accion, objetivo, detalle, at: Date.now() });
}

const actor = { secret: v.string(), actorEmail: v.string() };

// ── DESPACHO ─────────────────────────────────────────────────────────────────
/**
 * La cola del §9: necesidades abiertas en orden de turno (FIFO), con ubicación y teléfono —
 * lo que el endpoint público retiene a propósito. Agrupar por bolsa es cosa de la pantalla.
 */
export const despacho = query({
  args: { ...actor, limite: v.optional(v.number()) },
  handler: async (ctx, args) => {
    exigirTokenDeOps(args.secret);
    const abiertas = await ctx.db
      .query('needs')
      .withIndex('by_status_and_createdAt', (q) => q.eq('status', 'open'))
      .order('asc')
      .take(Math.min(args.limite ?? TECHO, TECHO));
    const personas = new Map<string, any>();
    const filas = [];
    for (const n of abiertas) {
      if (n.hiddenAt) continue;
      let p = personas.get(n.reporterId);
      if (!p) {
        p = await ctx.db.get(n.reporterId);
        personas.set(n.reporterId, p);
      }
      if (!p) continue;
      const raiz = p.raizId ? ((await ctx.db.get(p.raizId)) as { comunidad: string } | null) : null;
      filas.push({
        id: n._id,
        whatINeed: n.whatINeed,
        whyItMatters: n.whyItMatters,
        categoria: n.categoria ?? null,
        prioridad: n.prioridad ?? null,
        createdAt: n.createdAt,
        supportCount: n.supportCount,
        estadoEntrega: n.estadoEntrega ?? null,
        persona: {
          id: p._id,
          cardNumber: p.cardNumber,
          nombre: p.name,
          telefono: p.telefono ?? null,
          ubicacion: p.ubicacion,
          comunidad: raiz ? raiz.comunidad : null,
          asistidoPor: p.assistedBy ?? null,
        },
      });
    }
    return filas;
  },
});

export const marcarEntrega = mutation({
  args: { ...actor, needId: v.id('needs'), estado: v.union(v.literal('en_camino'), v.literal('entregada'), v.literal('reabrir')) },
  handler: async (ctx, args) => {
    exigirTokenDeOps(args.secret);
    const n = await ctx.db.get(args.needId);
    if (!n) throw new Error('Esa necesidad no existe.');
    if (args.estado === 'reabrir') {
      await ctx.db.patch(args.needId, { status: 'open', estadoEntrega: undefined, resolvedAt: undefined, resolvedBy: undefined });
      if (n.status === 'resolved') await sumarStat(ctx, 'necesidadesAbiertas', 1);
    } else if (args.estado === 'entregada') {
      await ctx.db.patch(args.needId, { status: 'resolved', estadoEntrega: 'entregada', resolvedAt: Date.now(), resolvedBy: args.actorEmail });
      if (n.status === 'open') await sumarStat(ctx, 'necesidadesAbiertas', -1);
    } else {
      await ctx.db.patch(args.needId, { estadoEntrega: 'en_camino' });
    }
    // El carnet es el primer canal: el estado se ve allí sin mandar nada.
    await ctx.db.insert('notificaciones', { beneficiaryId: n.reporterId, canal: 'carnet', mensaje: `${n.whatINeed}: ${args.estado}`, estado: 'registrada', actorEmail: args.actorEmail, at: Date.now() });
    await auditar(ctx, args.actorEmail, `necesidad.${args.estado}`, String(args.needId), n.whatINeed);
    return { ok: true };
  },
});

// ── PERSONAS ─────────────────────────────────────────────────────────────────
export const personas = query({
  args: { ...actor, limite: v.optional(v.number()) },
  handler: async (ctx, args) => {
    exigirTokenDeOps(args.secret);
    const filas = await ctx.db.query('beneficiaries').withIndex('by_cardNumber').order('desc').take(Math.min(args.limite ?? TECHO, TECHO));
    const raices = new Map<string, any>();
    const out = [];
    for (const p of filas) {
      let r = p.raizId ? raices.get(p.raizId) : null;
      if (p.raizId && !r) { r = await ctx.db.get(p.raizId); raices.set(p.raizId, r); }
      out.push({ id: p._id, cardNumber: p.cardNumber, nombre: p.name, telefono: p.telefono ?? null, ubicacion: p.ubicacion, edad: p.edad, genero: p.genero, codigo: p.codigo ?? p.kitCode ?? null, comunidad: r?.comunidad ?? null, asistidoPor: p.assistedBy ?? null, consentimientos: { visibilidad: p.donorVisibilityConsent, imagen: p.imageConsent }, registradaAt: p.habeasDataAcceptedAt, updatedAt: p.updatedAt ?? null });
    }
    return out;
  },
});

export const persona = query({
  args: { ...actor, id: v.id('beneficiaries') },
  handler: async (ctx, args) => {
    exigirTokenDeOps(args.secret);
    const p = await ctx.db.get(args.id);
    if (!p) return null;
    const necesidades = await ctx.db.query('needs').withIndex('by_reporter', (q) => q.eq('reporterId', args.id)).take(50);
    const capacidades = await ctx.db.query('capacities').withIndex('by_provider', (q) => q.eq('providerId', args.id)).take(50);
    const avisos = await ctx.db.query('notificaciones').withIndex('by_beneficiary', (q) => q.eq('beneficiaryId', args.id)).order('desc').take(20);
    const raiz = p.raizId ? await ctx.db.get(p.raizId) : null;
    return {
      id: p._id, cardNumber: p.cardNumber, nombre: p.name, email: p.email ?? null, telefono: p.telefono ?? null, ubicacion: p.ubicacion, edad: p.edad, genero: p.genero,
      codigo: p.codigo ?? p.kitCode ?? null, comunidad: raiz?.comunidad ?? null, raizNombre: raiz?.nombre ?? null, asistidoPor: p.assistedBy ?? null,
      consentimientos: { visibilidad: p.donorVisibilityConsent, imagen: p.imageConsent, habeasAt: p.habeasDataAcceptedAt }, updatedAt: p.updatedAt ?? null, updatedBy: p.updatedBy ?? null,
      necesidades: necesidades.map((n) => ({ id: n._id, whatINeed: n.whatINeed, whyItMatters: n.whyItMatters, categoria: n.categoria ?? null, status: n.status, estadoEntrega: n.estadoEntrega ?? null, createdAt: n.createdAt })),
      capacidades: capacidades.map((c) => ({ id: c._id, title: c.title, description: c.description })),
      avisos: avisos.map((a) => ({ canal: a.canal, mensaje: a.mensaje, estado: a.estado, at: a.at, por: a.actorEmail })),
    };
  },
});

/** Rectificación (habeas data): la persona tiene derecho a que se corrijan sus datos. */
export const actualizarPersona = mutation({
  args: { ...actor, id: v.id('beneficiaries'), name: v.optional(v.string()), telefono: v.optional(v.string()), email: v.optional(v.string()), ubicacion: v.optional(v.string()), edad: v.optional(v.number()), genero: v.optional(v.string()) },
  handler: async (ctx, args) => {
    exigirTokenDeOps(args.secret);
    const p = await ctx.db.get(args.id);
    if (!p) throw new Error('Esa persona no existe.');
    const cambios: Record<string, unknown> = {};
    for (const k of ['name', 'telefono', 'email', 'ubicacion', 'edad', 'genero'] as const) {
      if (args[k] !== undefined && args[k] !== (p as any)[k]) cambios[k] = args[k];
    }
    if (Object.keys(cambios).length === 0) return { ok: true, cambios: [] };
    await ctx.db.patch(args.id, { ...cambios, updatedAt: Date.now(), updatedBy: args.actorEmail });
    await auditar(ctx, args.actorEmail, 'persona.rectificar', String(args.id), Object.keys(cambios).join(','));
    return { ok: true, cambios: Object.keys(cambios) };
  },
});

/**
 * Supresión (habeas data): borra a la persona, sus necesidades, apoyos y capacidades, y
 * anonimiza sus mensajes en los muros. La auditoría guarda que se borró y por quién; nunca qué.
 */
export const borrarPersona = mutation({
  args: { ...actor, id: v.id('beneficiaries'), motivo: v.string() },
  handler: async (ctx, args) => {
    exigirTokenDeOps(args.secret);
    const p = await ctx.db.get(args.id);
    if (!p) throw new Error('Esa persona no existe.');
    const needs = await ctx.db.query('needs').withIndex('by_reporter', (q) => q.eq('reporterId', args.id)).take(100);
    let abiertas = 0;
    for (const n of needs) {
      if (n.status === 'open') abiertas++;
      const apoyos = await ctx.db.query('needSupports').withIndex('by_need_and_beneficiary', (q) => q.eq('needId', n._id)).take(500);
      for (const a of apoyos) await ctx.db.delete(a._id);
      const cx = await ctx.db.query('conexiones').withIndex('by_need', (q) => q.eq('needId', n._id)).take(50);
      for (const c of cx) await ctx.db.delete(c._id);
      await ctx.db.delete(n._id);
    }
    const caps = await ctx.db.query('capacities').withIndex('by_provider', (q) => q.eq('providerId', args.id)).take(100);
    for (const c of caps) await ctx.db.delete(c._id);
    // Mensajes en muros: se anonimizan, no se borran — otros los leyeron y respondieron.
    for (const wall of ['desahogo', 'aliento', 'gratitud'] as const) {
      const msgs = await ctx.db.query('wallMessages').withIndex('by_wall_and_createdAt', (q) => q.eq('wall', wall)).take(TECHO);
      for (const m of msgs) if (m.authorId === String(args.id)) await ctx.db.patch(m._id, { authorName: 'Alguien de la tribu', authorId: 'borrado' });
    }
    const avisos = await ctx.db.query('notificaciones').withIndex('by_beneficiary', (q) => q.eq('beneficiaryId', args.id)).take(200);
    for (const a of avisos) await ctx.db.delete(a._id);
    if (p.raizId) { const r = await ctx.db.get(p.raizId); if (r) await ctx.db.patch(r._id, { registrados: Math.max(0, r.registrados - 1) }); }
    await ctx.db.delete(args.id);
    await sumarStat(ctx, 'familias', -1);
    if (abiertas) await sumarStat(ctx, 'necesidadesAbiertas', -abiertas);
    await auditar(ctx, args.actorEmail, 'persona.suprimir', `carnet:${p.cardNumber}`, args.motivo);
    return { ok: true };
  },
});

// ── RAÍCES ───────────────────────────────────────────────────────────────────
export const ampliarRaiz = mutation({
  args: { ...actor, codigoBase: v.number(), tamanoNuevo: v.number() },
  handler: async (ctx, args) => {
    exigirTokenDeOps(args.secret);
    const r = await ctx.db.query('raices').withIndex('by_codigoBase', (q) => q.eq('codigoBase', args.codigoBase)).unique();
    if (!r) throw new Error(`No existe la raíz ${args.codigoBase}.`);
    if (args.tamanoNuevo <= r.tamano) throw new Error('El bloque nuevo tiene que ser más grande que el actual.');
    // No pisar el bloque siguiente.
    const siguiente = await ctx.db.query('raices').withIndex('by_codigoBase', (q) => q.gt('codigoBase', args.codigoBase)).order('asc').first();
    if (siguiente && args.codigoBase + args.tamanoNuevo > siguiente.codigoBase) {
      throw new Error(`Chocaría con la raíz ${siguiente.codigoBase} (${siguiente.nombre}). Máximo posible: ${siguiente.codigoBase - args.codigoBase}.`);
    }
    if (args.codigoBase + args.tamanoNuevo - 1 > 9999) throw new Error('Se pasa del techo 9999.');
    await ctx.db.patch(r._id, { tamano: args.tamanoNuevo, ampliaciones: [...(r.ampliaciones ?? []), { tamanoAnterior: r.tamano, tamanoNuevo: args.tamanoNuevo, actorEmail: args.actorEmail, at: Date.now() }] });
    await auditar(ctx, args.actorEmail, 'raiz.ampliar', String(args.codigoBase), `${r.tamano} → ${args.tamanoNuevo}`);
    return { ok: true, desde: args.codigoBase + 1, hasta: args.codigoBase + args.tamanoNuevo - 1 };
  },
});

/** El enlace del panel de la raíz, para copiarlo y mandárselo. Genera el token si no existe. */
export const enlacePanelRaiz = mutation({
  args: { ...actor, codigoBase: v.number(), regenerar: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    exigirTokenDeOps(args.secret);
    const r = await ctx.db.query('raices').withIndex('by_codigoBase', (q) => q.eq('codigoBase', args.codigoBase)).unique();
    if (!r) throw new Error(`No existe la raíz ${args.codigoBase}.`);
    let token = r.panelToken;
    if (!token || args.regenerar) {
      token = nuevoTokenOpaco();
      await ctx.db.patch(r._id, { panelToken: token });
      await auditar(ctx, args.actorEmail, args.regenerar ? 'raiz.rotarPanel' : 'raiz.crearPanel', String(args.codigoBase));
    }
    return { codigoBase: r.codigoBase, token, path: `/renacer/r/${r.codigoBase}?t=${token}` };
  },
});

// ── MUROS ────────────────────────────────────────────────────────────────────
export const muros = query({
  args: { ...actor, wall: v.union(v.literal('desahogo'), v.literal('aliento'), v.literal('gratitud')), limite: v.optional(v.number()) },
  handler: async (ctx, args) => {
    exigirTokenDeOps(args.secret);
    const filas = await ctx.db.query('wallMessages').withIndex('by_wall_and_createdAt', (q) => q.eq('wall', args.wall)).order('desc').take(Math.min(args.limite ?? TECHO, TECHO));
    return filas.map((m) => ({ id: m._id, authorName: m.authorName, body: m.body, createdAt: m.createdAt, hiddenAt: m.hiddenAt ?? null, hiddenBy: m.hiddenBy ?? null, reportedAt: m.reportedAt ?? null, reportCount: m.reportCount ?? 0 }));
  },
});

export const moderarMensaje = mutation({
  args: { ...actor, id: v.id('wallMessages'), accion: v.union(v.literal('ocultar'), v.literal('mostrar')) },
  handler: async (ctx, args) => {
    exigirTokenDeOps(args.secret);
    const m = await ctx.db.get(args.id);
    if (!m) throw new Error('Ese mensaje no existe.');
    if (args.accion === 'ocultar') await ctx.db.patch(args.id, { hiddenAt: Date.now(), hiddenBy: args.actorEmail });
    else await ctx.db.patch(args.id, { hiddenAt: undefined, hiddenBy: undefined, shownAt: Date.now(), reportedAt: undefined, reportCount: 0 });
    await auditar(ctx, args.actorEmail, `muro.${args.accion}`, String(args.id), m.body.slice(0, 80));
    return { ok: true };
  },
});

// ── MANOS ────────────────────────────────────────────────────────────────────
export const voluntarios = query({
  args: { ...actor, limite: v.optional(v.number()) },
  handler: async (ctx, args) => {
    exigirTokenDeOps(args.secret);
    const filas = await ctx.db.query('voluntarios').withIndex('by_createdAt').order('desc').take(Math.min(args.limite ?? TECHO, TECHO));
    const out = [];
    for (const vv of filas) {
      const caps = await ctx.db.query('capacities').withIndex('by_provider', (q) => q.eq('providerId', vv._id)).take(30);
      out.push({ id: vv._id, nombre: vv.nombre, contacto: vv.contacto, procedencia: vv.procedencia ?? null, motivo: vv.motivo ?? null, createdAt: vv.createdAt, capacidades: caps.map((c) => ({ id: c._id, title: c.title, description: c.description })) });
    }
    return out;
  },
});

// ── CONEXIONES ───────────────────────────────────────────────────────────────
/** Candidatos para una necesidad: capacidades cuyo título comparte palabras con la bolsa o el texto. Propone; no decide. */
export const candidatos = query({
  args: { ...actor, needId: v.id('needs') },
  handler: async (ctx, args) => {
    exigirTokenDeOps(args.secret);
    const n = await ctx.db.get(args.needId);
    if (!n) return [];
    const claves = new Set(`${n.categoria ?? ''} ${n.whatINeed}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z]+/).filter((w) => w.length > 3));
    const caps = await ctx.db.query('capacities').take(TECHO);
    const out = [];
    for (const c of caps) {
      if (!c.isActive) continue;
      const t = `${c.title} ${c.description} ${c.category ?? ''}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const puntos = [...claves].filter((k) => t.includes(k)).length;
      if (puntos === 0) continue;
      // `providerId` es unión beneficiario|voluntario: se lee laxo y se nombra por lo que haya.
      const dueno = (await ctx.db.get(c.providerId as any)) as Record<string, unknown> | null;
      out.push({
        capacityId: c._id,
        title: c.title,
        description: c.description,
        origen: c.origen ?? 'beneficiario',
        puntos,
        quien: dueno ? String(dueno.nombre ?? dueno.name ?? '') : '',
        contacto: dueno ? ((dueno.contacto ?? dueno.telefono ?? dueno.email ?? null) as string | null) : null,
        voluntarioId: c.origen === 'voluntario' ? (c.providerId as any) : undefined,
      });
    }
    return out.sort((a, b) => b.puntos - a.puntos).slice(0, 12);
  },
});

export const conexiones = query({
  args: { ...actor, limite: v.optional(v.number()) },
  handler: async (ctx, args) => {
    exigirTokenDeOps(args.secret);
    const out = [];
    for (const estado of ['propuesta', 'aceptada', 'entregada', 'cancelada'] as const) {
      const filas = await ctx.db.query('conexiones').withIndex('by_estado_and_updatedAt', (q) => q.eq('estado', estado)).order('desc').take(Math.min(args.limite ?? 100, 100));
      for (const c of filas) {
        const n = await ctx.db.get(c.needId);
        const cap = c.capacityId ? await ctx.db.get(c.capacityId) : null;
        out.push({ id: c._id, estado: c.estado, notas: c.notas ?? null, actorEmail: c.actorEmail, createdAt: c.createdAt, updatedAt: c.updatedAt, necesidad: n ? { id: n._id, whatINeed: n.whatINeed, categoria: n.categoria ?? null, status: n.status } : null, capacidad: cap ? { id: cap._id, title: cap.title } : null, aportadorRef: c.aportadorRef ?? null });
      }
    }
    return out;
  },
});

export const crearConexion = mutation({
  args: { ...actor, needId: v.id('needs'), capacityId: v.optional(v.id('capacities')), voluntarioId: v.optional(v.id('voluntarios')), aportadorRef: v.optional(v.string()), notas: v.optional(v.string()) },
  handler: async (ctx, args) => {
    exigirTokenDeOps(args.secret);
    const n = await ctx.db.get(args.needId);
    if (!n) throw new Error('Esa necesidad no existe.');
    const ahora = Date.now();
    const id = await ctx.db.insert('conexiones', { needId: args.needId, capacityId: args.capacityId, voluntarioId: args.voluntarioId, aportadorRef: args.aportadorRef, estado: 'propuesta', notas: args.notas, actorEmail: args.actorEmail, createdAt: ahora, updatedAt: ahora });
    await auditar(ctx, args.actorEmail, 'conexion.proponer', String(id), n.whatINeed);
    return { id };
  },
});

export const avanzarConexion = mutation({
  args: { ...actor, id: v.id('conexiones'), estado: v.union(v.literal('aceptada'), v.literal('entregada'), v.literal('cancelada')), notas: v.optional(v.string()) },
  handler: async (ctx, args) => {
    exigirTokenDeOps(args.secret);
    const c = await ctx.db.get(args.id);
    if (!c) throw new Error('Esa conexión no existe.');
    const permitido: Record<string, string[]> = { propuesta: ['aceptada', 'cancelada'], aceptada: ['entregada', 'cancelada'], entregada: [], cancelada: [] };
    if (!permitido[c.estado].includes(args.estado)) throw new Error(`De ${c.estado} no se pasa a ${args.estado}.`);
    await ctx.db.patch(args.id, { estado: args.estado, notas: args.notas ?? c.notas, updatedAt: Date.now() });
    if (args.estado === 'entregada') {
      // Solo la entrega resuelve la necesidad — y queda visible en el carnet.
      const n = await ctx.db.get(c.needId);
      if (n && n.status === 'open') {
        await ctx.db.patch(c.needId, { status: 'resolved', estadoEntrega: 'entregada', resolvedAt: Date.now(), resolvedBy: args.actorEmail });
        await sumarStat(ctx, 'necesidadesAbiertas', -1);
        await ctx.db.insert('notificaciones', { beneficiaryId: n.reporterId, canal: 'carnet', mensaje: `${n.whatINeed}: entregada`, estado: 'registrada', actorEmail: args.actorEmail, at: Date.now() });
      }
    }
    await auditar(ctx, args.actorEmail, `conexion.${args.estado}`, String(args.id), args.notas);
    return { ok: true };
  },
});

// ── AVISOS ───────────────────────────────────────────────────────────────────
/** Registra un aviso enviado por fuera (email/WhatsApp lo manda el endpoint; acá queda el rastro). */
export const registrarAviso = mutation({
  args: { ...actor, beneficiaryId: v.optional(v.id('beneficiaries')), voluntarioId: v.optional(v.id('voluntarios')), canal: v.union(v.literal('carnet'), v.literal('email'), v.literal('whatsapp')), mensaje: v.string(), estado: v.union(v.literal('registrada'), v.literal('enviada'), v.literal('fallida')), detalle: v.optional(v.string()) },
  handler: async (ctx, args) => {
    exigirTokenDeOps(args.secret);
    const id = await ctx.db.insert('notificaciones', { beneficiaryId: args.beneficiaryId, voluntarioId: args.voluntarioId, canal: args.canal, mensaje: args.mensaje, estado: args.estado, detalle: args.detalle, actorEmail: args.actorEmail, at: Date.now() });
    await auditar(ctx, args.actorEmail, `aviso.${args.canal}.${args.estado}`, String(args.beneficiaryId ?? args.voluntarioId ?? ''), args.mensaje.slice(0, 80));
    return { id };
  },
});

// ── ANOMALÍAS (decisión A: señalar, no frenar) ───────────────────────────────
export const anomalias = query({
  args: actor,
  handler: async (ctx, args) => {
    exigirTokenDeOps(args.secret);
    const desde = Date.now() - 24 * 3600 * 1000;
    const personas = await ctx.db.query('beneficiaries').withIndex('by_cardNumber').order('desc').take(TECHO);
    const porRaiz = new Map<string, number>();
    const porTelefono = new Map<string, number>();
    for (const p of personas) {
      if (p.habeasDataAcceptedAt >= desde && p.raizId) porRaiz.set(String(p.raizId), (porRaiz.get(String(p.raizId)) ?? 0) + 1);
      if (p.telefono) { const k = p.telefono.replace(/\D/g, ''); if (k) porTelefono.set(k, (porTelefono.get(k) ?? 0) + 1); }
    }
    const out: Array<{ tipo: string; detalle: string; gravedad: 'alta' | 'media' }> = [];
    for (const [raizId, n] of porRaiz) if (n >= 15) { const r = (await ctx.db.get(raizId as any)) as { comunidad?: string } | null; out.push({ tipo: 'velocidad', detalle: `${r?.comunidad ?? raizId}: ${n} registros en 24 h`, gravedad: 'media' }); }
    for (const [tel, n] of porTelefono) if (n >= 2) out.push({ tipo: 'telefono_repetido', detalle: `${n} registros con el teléfono …${tel.slice(-4)}`, gravedad: 'alta' });
    const reportados = [];
    for (const wall of ['desahogo', 'gratitud'] as const) {
      const msgs = await ctx.db.query('wallMessages').withIndex('by_wall_and_createdAt', (q) => q.eq('wall', wall)).order('desc').take(100);
      for (const m of msgs) if (m.reportedAt && !m.hiddenAt) reportados.push(m);
    }
    if (reportados.length) out.push({ tipo: 'reportes', detalle: `${reportados.length} mensajes reportados sin revisar`, gravedad: 'alta' });
    return out;
  },
});

export const auditoria = query({
  args: { ...actor, limite: v.optional(v.number()) },
  handler: async (ctx, args) => {
    exigirTokenDeOps(args.secret);
    const filas = await ctx.db.query('auditoria').withIndex('by_at').order('desc').take(Math.min(args.limite ?? 100, TECHO));
    return filas.map((a) => ({ id: a._id, actorEmail: a.actorEmail, accion: a.accion, objetivo: a.objetivo, detalle: a.detalle ?? null, at: a.at }));
  },
});
