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
 *    sagrado. Una necesidad sin timestamp propio es un turno perdido.
 *  - **Los consentimientos son obligatorios, no opcionales.** Fail-closed significa
 *    que ausente = NO consentido; hacerlos requeridos obliga a la mutation a decidir
 *    explícitamente en vez de dejar un `undefined` que alguien lea con `!== false`.
 *
 * **Pivote del 2026-08-31** (nota Anima `2026-08-31-renacer-flujo-reunion-pivote`): el
 * beneficiario ya no llega por una manilla comprada sino por la invitación de una **raíz**
 * (líder comunitario) que reparte códigos de su bloque. `kits` se conserva como camino
 * legado —cualquier código de kit ya emitido sigue resolviendo— y todo lo nuevo es
 * expansión: tablas nuevas y campos opcionales, nada se contrae mientras haya datos.
 */

import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

/** Los 4 kits fijos del diseño del 25-08. Camino legado tras el pivote del 31-08. */
export const kitTipo = v.union(
  v.literal('1+1'),
  v.literal('1+5'),
  v.literal('1+10'),
  v.literal('1+100'),
);

export const producto = v.union(v.literal('manillas'), v.literal('dijes'));

export const estadoRaiz = v.union(
  v.literal('activa'),
  v.literal('pausada'),
  v.literal('cerrada'),
);

export default defineSchema({
  /**
   * Contadores secuenciales. Convex no tiene auto-increment, y las mutations son
   * transaccionales, así que leer-incrementar-escribir acá es seguro ante concurrencia.
   *
   * Secuencias vivas: `kitCode` (legado, arranca en 101) y `cardNumber` (el número del
   * carnet, §6.6).
   */
  sequences: defineTable({
    name: v.string(),
    value: v.number(),
  }).index('by_name', ['name']),

  /**
   * La raíz: el líder comunitario que invita (31-08). Tierra Mädre la conoce y sabe que
   * está en territorio; se le habilita un **bloque** de códigos y ella decide a quién se
   * lo da. El que invita responde por el invitado.
   *
   * El bloque es `[codigoBase, codigoBase + tamano)`: `codigoBase` es el código de la raíz
   * misma; los repartibles son los que siguen. Los bloques no se solapan (lo garantiza
   * `raices.emitir`).
   */
  raices: defineTable({
    codigoBase: v.number(),
    tamano: v.number(),
    nombre: v.string(),
    comunidad: v.string(),
    zona: v.optional(v.string()),
    /** Contacto de la raíz para operaciones. Nunca se sirve a un endpoint público. */
    contacto: v.optional(v.string()),
    estado: estadoRaiz,
    /** Registros hechos con códigos de este bloque. Cota natural: `tamano - 1`. */
    registrados: v.number(),
    createdAt: v.number(),
  }).index('by_codigoBase', ['codigoBase']),

  /**
   * Camino legado (diseño del 25-08): un código por KIT comprado, emitido al confirmar
   * el pago. Se conserva para que cualquier código ya emitido siga resolviendo.
   */
  kits: defineTable({
    code: v.number(),
    tipo: kitTipo,
    producto,
    saleId: v.string(),
    aportadorContact: v.string(),
    fechaPago: v.string(),
    manillasTotal: v.number(),
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
   * género, y —desde el 31-08— teléfono, porque la ayuda se coordina por WhatsApp.
   * **No se pide documento** (D-0831-3: la sala lo pidió, §10.4 lo prohíbe y la silla
   * Legal sigue vacía; entra solo con dictamen).
   */
  beneficiaries: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    telefono: v.optional(v.string()),
    googleId: v.optional(v.string()),
    ubicacion: v.string(),
    edad: v.number(),
    genero: v.string(),
    /** El código con el que se registró. Índice único de hecho: un código, una persona. */
    codigo: v.optional(v.number()),
    /** La raíz que invitó, si el código vino de un bloque. */
    raizId: v.optional(v.id('raices')),
    /** Legado: el kit, si el código vino de una compra. */
    kitCode: v.optional(v.number()),
    /** El número del carnet — "como la cédula" (§6.6). Secuencial, visible, dictable. */
    cardNumber: v.number(),
    /**
     * Token opaco del carnet (D-1 del plan). Un código de invitación adivinable es
     * aceptable porque "el flujo del código no lee, escribe"; la página del carnet sí lee,
     * y sin este token `/renacer/b/112` le mostraría a cualquiera el registro de alguien.
     */
    cardToken: v.string(),
    habeasDataAcceptedAt: v.number(),
    donorVisibilityConsent: v.boolean(),
    imageConsent: v.boolean(),
    assistedBy: v.optional(v.string()),
  })
    .index('by_cardNumber', ['cardNumber'])
    .index('by_codigo', ['codigo'])
    .index('by_raiz', ['raizId'])
    .index('by_kitCode', ['kitCode'])
    .index('by_googleId', ['googleId']),

  /**
   * Texto libre como dato (decisión #8) + una **bolsa** opcional para agruparlas (31-08)
   * + la **prioridad** en que la persona las escribió (31-08). `createdAt` sigue siendo
   * el turno (§9): la bolsa agrupa y la prioridad informa, ninguna de las dos reordena
   * el despacho.
   */
  needs: defineTable({
    reporterId: v.id('beneficiaries'),
    whatINeed: v.string(),
    whyItMatters: v.string(),
    categoria: v.optional(v.string()),
    prioridad: v.optional(v.number()),
    status: v.union(v.literal('open'), v.literal('resolved')),
    createdAt: v.number(),
    supportCount: v.number(),
  })
    .index('by_createdAt', ['createdAt'])
    .index('by_categoria', ['categoria', 'createdAt'])
    .index('by_reporter', ['reporterId']),

  needSupports: defineTable({
    needId: v.id('needs'),
    beneficiaryId: v.id('beneficiaries'),
    createdAt: v.number(),
  }).index('by_need_and_beneficiary', ['needId', 'beneficiaryId']),

  /**
   * Quien quiere ayudar sin ser beneficiario (31-08: la opción "Enlistar mis capacidades"
   * del aportador). Es base de datos de voluntarios, no de compradores: no lleva pago.
   */
  voluntarios: defineTable({
    nombre: v.string(),
    contacto: v.string(),
    procedencia: v.optional(v.string()),
    motivo: v.optional(v.string()),
    habeasDataAcceptedAt: v.number(),
    createdAt: v.number(),
  }).index('by_createdAt', ['createdAt']),

  /** "Poner mis capacidades a disposición" — de beneficiarios y de voluntarios por igual. */
  capacities: defineTable({
    providerId: v.union(v.id('beneficiaries'), v.id('voluntarios')),
    origen: v.optional(v.union(v.literal('beneficiario'), v.literal('voluntario'))),
    title: v.string(),
    description: v.string(),
    category: v.optional(v.string()),
    isActive: v.boolean(),
  }).index('by_provider', ['providerId']),

  /**
   * Los muros: desahogo (beneficiarios, §6.9), aliento (aportadores, §4.7) y gratitud
   * (31-08: quien recibe un símbolo deja las gracias en la web). `hiddenAt` es la
   * moderación mínima desde el día uno.
   */
  /** Contadores de campaña: un solo documento, 1 lectura (31-08). El recaudo vive en TM. */
  stats: defineTable({
    key: v.literal('campana'),
    raicesActivas: v.number(),
    familias: v.number(),
    necesidadesAbiertas: v.number(),
    voluntarios: v.number(),
    updatedAt: v.number(),
  }).index('by_key', ['key']),

  wallMessages: defineTable({
    wall: v.union(v.literal('desahogo'), v.literal('aliento'), v.literal('gratitud')),
    authorId: v.string(),
    authorName: v.string(),
    body: v.string(),
    createdAt: v.number(),
    hiddenAt: v.optional(v.number()),
  }).index('by_wall_and_createdAt', ['wall', 'createdAt']),
});
