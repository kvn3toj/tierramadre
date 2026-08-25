/**
 * Esquema del backend de Renacer.
 *
 * Espejo deliberado del vocabulario CoomÜnity (`ORIGEN/apps/MVP/convex/schema.ts`),
 * según el §8.3 del spec: los nombres coinciden a propósito para que el export de
 * Fase 3 hacia el MVP sea **un rename, no una migración**.
 *
 *   beneficiaries ↔ players          needs ↔ marketWishlistNeeds
 *   capacities    ↔ listings         needSupports ↔ marketNeeds.requestCount
 *
 * Dos reglas del spec que este esquema hace cumplir por tipo, no por disciplina:
 *
 *  - **`needs.createdAt` es obligatorio.** Es el turno FIFO del §9 y el spec lo llama
 *    sagrado. Una necesidad sin timestamp propio es un turno perdido, y con la lista
 *    de necesidades abierta (sin categorías) el timestamp individual es lo único que
 *    hace despachable el agrupamiento que arma operaciones.
 *  - **Los consentimientos son obligatorios, no opcionales.** Fail-closed significa
 *    que ausente = NO consentido; hacerlos requeridos obliga a la mutation a decidir
 *    explícitamente en vez de dejar un `undefined` que alguien lea con `!== false`.
 */

import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

/** Los 4 kits fijos — decisión ratificada #4 (25-08). Sin calculadora, sin un quinto. */
export const kitTipo = v.union(
  v.literal('1+1'),
  v.literal('1+5'),
  v.literal('1+10'),
  v.literal('1+100'),
);

/** Solo estos dos productos durante Renacer ("esos dos productos, punto y pelota", 21-08). */
export const producto = v.union(v.literal('manillas'), v.literal('dijes'));

export default defineSchema({
  /**
   * Contadores secuenciales. Convex no tiene auto-increment, y las mutations son
   * transaccionales, así que leer-incrementar-escribir acá es seguro ante concurrencia.
   *
   * Secuencias vivas: `kitCode` (arranca en 101, compuerta §3.4 · G-A.2) y
   * `cardNumber` (el número del carnet, §6.6).
   */
  sequences: defineTable({
    name: v.string(),
    value: v.number(),
  }).index('by_name', ['name']),

  /**
   * Un código por KIT comprado — ni por manilla, ni global (decisión ratificada #2).
   * **El código ES la relación aportador↔beneficiarios**: quien se registra con el
   * código X queda vinculado al kit X y, por él, a su aportador. No hay ni hace falta
   * una tabla de "relación" aparte.
   */
  kits: defineTable({
    /** Numérico, secuencial desde 101, techo 9999. Es lo que va impreso en el estuche. */
    code: v.number(),
    tipo: kitTipo,
    producto,
    /** La venta en el Convex de TM. El código se emite al CONFIRMAR el pago, nunca antes. */
    saleId: v.string(),
    aportadorContact: v.string(),
    fechaPago: v.string(),
    /** DERIVADO de `tipo`, jamás tomado del input: un total tecleado es un dato inventado. */
    manillasTotal: v.number(),
    /** Sube contando registros con este código. Es el insumo de la visibilidad agregada (§4.9). */
    manillasRegistradas: v.number(),
    estado: v.union(
      v.literal('emitido'),
      v.literal('impreso'),
      v.literal('entregando'),
      v.literal('cerrado'),
    ),
  })
    .index('by_code', ['code'])
    .index('by_saleId', ['saleId']),

  /**
   * El registro del beneficiario. Minimización del §10.4: nombre, ubicación, edad,
   * género. **No se piden** documento, ingresos, estado del inmueble ni composición
   * familiar — si operaciones los necesita para una solución estructural, se piden en
   * ese momento y para ese fin.
   */
  beneficiaries: defineTable({
    name: v.string(),
    /** Opcionales los dos: el registro asistido en campo no pasa por Google (D-2 del plan). */
    email: v.optional(v.string()),
    googleId: v.optional(v.string()),
    ubicacion: v.string(),
    edad: v.number(),
    /** Texto libre a propósito: el spec no ratifica ninguna taxonomía de género. */
    genero: v.string(),
    /** El vínculo con el aportador. Es `kits.code`, no un Id: sobrevive a cualquier reimport. */
    kitCode: v.number(),
    /** El número del carnet — "como la cédula" (§6.6). Secuencial, visible, dictable. */
    cardNumber: v.number(),
    /**
     * Token opaco del carnet (D-1 del plan). El argumento que hizo aceptable un código de
     * kit adivinable fue "el flujo del código no lee, escribe" — y ese argumento NO se
     * extiende a la página del carnet, que sí lee. Sin este token, `/renacer/b/112` le
     * mostraría a cualquiera el registro de un damnificado.
     */
    cardToken: v.string(),
    /** §10.1 — se recoge EN PRESENCIA, guiado por el facilitador, antes del registro digital. */
    habeasDataAcceptedAt: v.number(),
    /** Fail-closed, default NO. El aportador ve agregado; identidades solo con esto en true. */
    donorVisibilityConsent: v.boolean(),
    /** Fail-closed, default NO. Menores: ninguna imagen, marcado o no (§10.2). */
    imageConsent: v.boolean(),
    /**
     * Quién asistió el registro, si fue asistido. Es la mitigación de equidad del §9 hecha
     * medible: si el % de registros asistidos es bajo en una comunidad con baja
     * conectividad, la mitigación no está funcionando y el FIFO necesita corrección.
     */
    assistedBy: v.optional(v.string()),
  })
    .index('by_cardNumber', ['cardNumber'])
    .index('by_kitCode', ['kitCode'])
    .index('by_googleId', ['googleId']),

  /**
   * Lista abierta, texto libre, sin categorías forzadas (decisión ratificada #8).
   * El "tipo" de necesidad no existe en el dato: lo agrupa operaciones al armar cada
   * solución estructural. Lo que hace despachable ese agrupamiento es `createdAt`.
   */
  needs: defineTable({
    reporterId: v.id('beneficiaries'),
    whatINeed: v.string(),
    whyItMatters: v.string(),
    status: v.union(v.literal('open'), v.literal('resolved')),
    /** EL TURNO (§9). Obligatorio y propio de cada necesidad, nunca compartido. */
    createdAt: v.number(),
    supportCount: v.number(),
  })
    .index('by_createdAt', ['createdAt'])
    .index('by_reporter', ['reporterId']),

  /** El "+1" del Mapa de la Tribu (§6.8). El índice compuesto lo hace idempotente. */
  needSupports: defineTable({
    needId: v.id('needs'),
    beneficiaryId: v.id('beneficiaries'),
    createdAt: v.number(),
  }).index('by_need_and_beneficiary', ['needId', 'beneficiaryId']),

  /** "Poner mis capacidades a disposición" — mismo vocabulario en ambos flujos (§8.3). */
  capacities: defineTable({
    providerId: v.id('beneficiaries'),
    title: v.string(),
    description: v.string(),
    category: v.optional(v.string()),
    isActive: v.boolean(),
  }).index('by_provider', ['providerId']),

  /**
   * Los dos muros: el de desahogo (beneficiarios, §6.9) y el de aliento (aportadores,
   * §4.7). `hiddenAt` es la moderación mínima desde el día uno que pide el §8.3 — no
   * hace falta panel, alcanza con poder ocultar.
   */
  wallMessages: defineTable({
    wall: v.union(v.literal('desahogo'), v.literal('aliento')),
    authorId: v.string(),
    authorName: v.string(),
    body: v.string(),
    createdAt: v.number(),
    hiddenAt: v.optional(v.number()),
  }).index('by_wall_and_createdAt', ['wall', 'createdAt']),
});
