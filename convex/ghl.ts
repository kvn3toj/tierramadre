/**
 * GoHighLevel commerce backend (Áreas 2 & 4, Convex side).
 *
 * The HTTP surface lives in Vercel functions (api/ghl-*.ts, api/mp-webhook.ts)
 * which authenticate the caller and reach these via ConvexHttpClient. The
 * branchy decisions are delegated to the pure, unit-tested `_lib` modules
 * (productSearch, commission, applyPayment) so this file stays thin IO glue.
 *
 * Flow (GHL/06-FLUJOS): bot → searchProducts → web → createOrder (≤2M gate +
 * MP preference, set via setMpPreference) → customer pays → mp-webhook →
 * markOrderPaid (idempotent: sale → confirmada, client total++, commission once).
 *
 * Online orders use the `sales` table with sede "O" (saleId `VO-NNNN`) and
 * estado `reservada` (pending) → `confirmada` (paid). They are Convex-authoritative
 * for the payment flow; mirroring online sales to the Ventas sheet is a deferred
 * follow-up (the mp* fields are Convex-only), so no Sheets push is scheduled here.
 */

import {
  query,
  mutation,
  internalQuery,
  internalMutation,
  internalAction,
  type MutationCtx,
} from './_generated/server';
import { v, ConvexError } from 'convex/values';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { allocateNext, formatSaleId } from './sequences';
import {
  rankProducts,
  disponibilidadNota,
  type SearchableProduct,
} from './_lib/productSearch';
import { isOverLimit, computeCommissionCOP } from './_lib/commission';
import {
  applyPaymentToSale,
  isPaymentProvider,
  amountsMatch,
} from './_lib/applyPayment';
import {
  RESERVA_TTL_MS,
  reservedItemIds,
  findReusableSale,
} from './_lib/reservas';
import {
  isContactInactive,
  addContactTags,
  type GhlConvConfig,
} from './_lib/ghlConversations';
import { signContactId } from './_lib/cidSigning';
import { bumpCatalogVersion } from './_lib/catalogVersion';

/** Sequence + sede code for online (bot/web) orders → ids like `VO-0001`. */
const ONLINE_SEDE = 'O';
const ONLINE_SALE_SEQUENCE = 'sale:O';

/**
 * Every mutation below is called exclusively server-to-server from Vercel
 * (api/ghl-*.ts, api/mp-webhook.ts) — never from the browser. But the Convex
 * deployment URL is public (VITE_CONVEX_URL ships in the client bundle), so
 * without this gate anyone could call e.g. `markOrderPaid` directly and fake
 * a payment confirmation, or `createOrder` to spam sales. Reuses
 * ADMIN_SYNC_TOKEN — already provisioned on both Vercel and Convex for the
 * Sheets-sync hop — as a trusted-proxy secret for this direction too. Fail
 * closed if unconfigured.
 */
function requireServerSecret(secret: string): void {
  const expected = process.env.ADMIN_SYNC_TOKEN;
  if (!expected || secret !== expected) {
    throw new ConvexError('No autorizado.');
  }
}

// ─── search-products (the GHL bot's product tool) ──────────────────────────

export const searchProducts = query({
  args: {
    categoria: v.optional(v.string()),
    presupuesto: v.optional(v.number()),
    ocasion: v.optional(v.string()),
    ciudad: v.optional(v.string()),
    /** Public app origin (APP_URL), passed by the caller so web_link stays pure. */
    baseUrl: v.string(),
    // The GHL contact id (WF-04's webhook body should send {{contact.id}}).
    // Embedded as `?cid=` on the returned links so that when this SAME client
    // taps "Consultar por WhatsApp" on a piece, the public page can tell GHL
    // *which contact* picked *which SKU* directly — see /api/vitrina-select.
    // Optional: links minted without it (e.g. staff's manual "Compartir con
    // cliente") simply skip that deterministic write, unchanged from before.
    contactId: v.optional(v.string()),
    // Qualitative price hint ("economico" | "moderado" | "alto"), used only
    // when no numeric `presupuesto` is given — see api/_lib/parseBudget
    // parsePriceTier and productSearch `selectByPrice`.
    priceTier: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { categoria, presupuesto, ocasion, baseUrl, contactId, priceTier },
  ) => {
    // Bot-eligible universe (2026-07-04 fix): Fotosíntesis-v2 items explicitly
    // published (`mostrarEnCatalogo`) UNION legacy items (no `loteId` — that
    // sync path never sets `mostrarEnCatalogo` at all, so it used to exclude
    // the entire legacy catalog, ~82% of inventory) that are DISPONIBLE. Two
    // indexed scans merged in code: "OR across two different fields" isn't a
    // single Convex index range.
    const publishedFoto = await ctx.db
      .query('productInventory')
      .withIndex('by_mostrarEnCatalogo', (q) => q.eq('mostrarEnCatalogo', true))
      .collect();
    const disponible = await ctx.db
      .query('productInventory')
      .withIndex('by_estado', (q) => q.eq('estado', 'DISPONIBLE'))
      .collect();
    const legacyDisponible = disponible.filter((p) => p.loteId === undefined);
    // VENDIDA pieces are shareable too (Kevin req 2026-07-06) — surfaced as
    // style references for thin categories. Legacy sold rows come in through
    // the same no-loteId union; published-Fotosíntesis sold rows already
    // arrive via `publishedFoto` (mostrarEnCatalogo is independent of estado).
    const vendida = await ctx.db
      .query('productInventory')
      .withIndex('by_estado', (q) => q.eq('estado', 'VENDIDA'))
      .collect();
    const legacyVendida = vendida.filter((p) => p.loteId === undefined);

    const byItemId = new Map<string, (typeof publishedFoto)[number]>();
    for (const p of [...publishedFoto, ...legacyDisponible, ...legacyVendida])
      byItemId.set(p.itemId, p);
    const eligible = [...byItemId.values()];

    const items: SearchableProduct[] = eligible.map((p) => ({
      itemId: p.itemId,
      nombre: p.nombre,
      categoria: p.categoria,
      tipoJoya: p.tipoJoya,
      tipo: p.tipo,
      // `precioEmbajadorCOP` is the ambassador/wholesale tier — NEVER a valid
      // stand-in for the retail price quoted to an end customer. If
      // `precioCOP` is missing, the item is correctly excluded downstream
      // (`eligibleProducts` requires a numeric `precioCOP`) rather than
      // silently quoting the wrong tier.
      precioCOP: p.precioCOP,
      estado: p.estado,
      // Normalize the "allowed to appear" flag at this IO boundary so the
      // pure ranking module doesn't need to know about loteId/legacy vs
      // Fotosíntesis: legacy items have no publish concept, so DISPONIBLE
      // alone qualifies them here even though their raw `mostrarEnCatalogo`
      // is undefined.
      mostrarEnCatalogo: p.mostrarEnCatalogo === true || p.loteId === undefined,
      fotoUrl: p.fotoUrl,
      certificadoUrl: p.certificadoUrl,
    }));

    const base = baseUrl.replace(/\/$/, '');
    // Appended to every link so the public page can identify which GHL
    // contact is browsing (see the `contactId` arg doc above). Signed
    // (convex/_lib/cidSigning.ts) so api/vitrina-select.ts — which is
    // intentionally public/no-auth — can verify this id was actually minted
    // by us for THIS contact, not guessed or copied from another customer's
    // link.
    const signedCid = contactId ? await signContactId(contactId) : null;
    const cidSuffix = signedCid ? `?cid=${encodeURIComponent(signedCid)}` : '';
    // Only accept a recognized tier value; anything else is ignored (a numeric
    // budget, when present, wins over the tier inside rankProducts anyway).
    const tier =
      priceTier === 'economico' ||
      priceTier === 'moderado' ||
      priceTier === 'alto'
        ? priceTier
        : undefined;

    const productos = rankProducts(items, {
      categoria,
      presupuesto,
      ocasion,
      priceTier: tier,
    }).map((p) => ({
      sku: p.itemId,
      nombre: p.nombre ?? '',
      descripcion_corta: p.nombre ?? '',
      precio_cop: p.precioCOP ?? 0,
      // VENDIDA pieces are included as style references; the caller can label
      // them "vendida / ejemplo" so a client doesn't try to buy a sold piece.
      disponible: (p.estado ?? '').toUpperCase() === 'DISPONIBLE',
      // Ready-to-concatenate disclosure for WF-04's WhatsApp message (empty
      // for a buyable piece) — see disponibilidadNota's docstring for why
      // this exists instead of making the template render `disponible` raw.
      nota_disponibilidad: disponibilidadNota(p.estado),
      foto_url: p.fotoUrl ?? null,
      // Public "Vitrina" share link: a sandboxed product page the client opens
      // with no login (no /product auth wall). A bare item number is treated as
      // a stateless id-list → default x1 COP pricing = the `precio_cop` above,
      // so the WhatsApp text and the linked page show the same figure.
      web_link: `${base}/v/${p.itemId}${cidSuffix}`,
      certificado_url: p.certificadoUrl ?? null,
    }));
    // Combined "carrito" gallery: one stateless id-list Vitrina link with every
    // recommended piece. The client browses the sandbox and taps "Consultar por
    // WhatsApp" on the piece they want — that reply lands back in the same GHL
    // conversation, which is the selection signal for the asesor payment flow.
    const vitrina_link =
      productos.length > 0
        ? `${base}/v/${productos.map((p) => p.sku).join('-')}${cidSuffix}`
        : null;
    return { productos, vitrina_link };
  },
});

// ─── vitrina-select audit (deterministic pick signal) ──────────────────────

/**
 * Records that a GHL contact picked a specific SKU from a public Vitrina
 * link. Called by /api/vitrina-select AFTER it has already written
 * producto_seleccionado_sku + tags to the GHL contact directly — this table
 * is purely an audit trail / future-reminder-cron hook, not itself the
 * automation trigger (GHL's own tags/workflows are).
 */
export const recordVitrinaSelection = mutation({
  args: { ghlContactId: v.string(), sku: v.string(), secret: v.string() },
  handler: async (ctx, { ghlContactId, sku, secret }) => {
    requireServerSecret(secret);
    await ctx.db.insert('vitrinaSelections', {
      ghlContactId,
      sku,
      selectedAt: new Date().toISOString(),
    });
  },
});

// ─── create-order (≤2M gate, online sale in `reservada`) ───────────────────

async function upsertClient(
  ctx: MutationCtx,
  contact: { celular: string; full_name?: string; email?: string },
  canalOrigen: string | undefined,
  ambassadorId: Id<'ambassadors'> | undefined,
): Promise<Id<'clients'>> {
  let existing = contact.celular
    ? await ctx.db
        .query('clients')
        .withIndex('by_telefono', (q) => q.eq('telefono', contact.celular))
        .first()
    : null;
  if (!existing && contact.email) {
    existing = await ctx.db
      .query('clients')
      .withIndex('by_email', (q) => q.eq('email', contact.email))
      .first();
  }

  const now = new Date().toISOString();
  if (existing) {
    const patch: Record<string, unknown> = {};
    if (contact.full_name && !existing.nombre) patch.nombre = contact.full_name;
    if (contact.email && !existing.email) patch.email = contact.email;
    // First-touch attribution (spec T4): only set an ambassador if none yet.
    if (ambassadorId && !existing.ambassadorId)
      patch.ambassadorId = ambassadorId;
    if (Object.keys(patch).length) await ctx.db.patch(existing._id, patch);
    return existing._id;
  }

  const all = await ctx.db.query('clients').collect();
  const rowIndex = all.reduce((m, c) => Math.max(m, c.rowIndex), 1) + 1;
  return ctx.db.insert('clients', {
    nombre: contact.full_name ?? contact.celular,
    telefono: contact.celular,
    email: contact.email,
    tipo: 'final',
    canalOrigen,
    ambassadorId,
    totalCompradoCOP: 0,
    tags: [],
    rowIndex,
    lastPulledAt: now,
    syncStatus: 'pending' as const,
  });
}

export const createOrder = mutation({
  args: {
    contact: v.object({
      celular: v.string(),
      full_name: v.optional(v.string()),
      email: v.optional(v.string()),
    }),
    items: v.array(v.object({ sku: v.string(), qty: v.number() })),
    promotion_code: v.optional(v.string()),
    shipping_address: v.optional(
      v.object({
        ciudad: v.optional(v.string()),
        direccion: v.optional(v.string()),
        codigoPostal: v.optional(v.string()),
      }),
    ),
    ambassador_slug: v.optional(v.string()),
    canal_origen: v.optional(v.string()),
    forma_pago: v.optional(v.string()),
    /**
     * El checkout in-app no lleva techo de 2M (decisión de producto). Opt-in y
     * opcional, así que el rail del bot conserva su compuerta sin tocarse.
     */
    skip_limit: v.optional(v.boolean()),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    if (!args.items.length) throw new ConvexError('EMPTY_ITEMS');

    // 1. Reload prices/stock from the DB — never trust client-supplied amounts.
    let totalCOP = 0;
    const itemIds: string[] = [];
    for (const line of args.items) {
      const product = await ctx.db
        .query('productInventory')
        .withIndex('by_itemId', (q) => q.eq('itemId', line.sku))
        .first();
      if (!product) throw new ConvexError(`PRODUCT_NOT_FOUND:${line.sku}`);
      if (product.estado !== 'DISPONIBLE')
        throw new ConvexError(`NOT_AVAILABLE:${line.sku}`);
      const qty = Math.max(1, Math.floor(line.qty));
      totalCOP += (product.precioCOP ?? 0) * qty;
      for (let i = 0; i < qty; i++) itemIds.push(line.sku);
    }

    // 2. ≤2M COP server-side gate (golden rule #3). The handler maps this to 409.
    if (!args.skip_limit && isOverLimit(totalCOP))
      throw new ConvexError('OVER_LIMIT_2M');

    // 3. Resolve the ambassador (first-touch) from the referral slug.
    let ambassadorId: Id<'ambassadors'> | undefined;
    if (args.ambassador_slug) {
      const amb = await ctx.db
        .query('ambassadors')
        .withIndex('by_slug', (q) => q.eq('slug', args.ambassador_slug!))
        .first();
      if (amb) ambassadorId = amb._id;
    }

    // 4. Upsert the contact.
    const clientId = await upsertClient(
      ctx,
      args.contact,
      args.canal_origen,
      ambassadorId,
    );

    // 4.5 Reserva derivada. Una sola lectura por rango de índice trae solo las
    // ventas `reservada` de los últimos 30 min — el histórico de carritos
    // abandonados no encarece esto. La ventana se ancla en `_creationTime`
    // (propiedad de Convex, nunca pull-eada), NO en `fechaVenta`: ese campo
    // está en el allowlist de pull de Sheets y un pull a mitad de un pago
    // podría reescribirlo en un formato que saque la fila del rango antes de
    // que llegue a memoria. Leer aquí e insertar abajo es atómico: las
    // mutations de Convex son serializables, así que dos createOrder
    // concurrentes chocan y la que reintenta ya ve la venta de la otra.
    const now = Date.now();
    const pendientes = await ctx.db
      .query('sales')
      .withIndex('by_estado', (q) =>
        q.eq('estado', 'reservada').gte('_creationTime', now - RESERVA_TTL_MS),
      )
      .collect();

    // Doble clic en «Pagar»: devolver la reserva que este cliente ya tiene por
    // estos mismos ítems, en vez de chocar contra su propia reserva.
    const reusable = findReusableSale(
      pendientes.map((s) => ({
        clientId: s.clientId as string,
        itemIds: s.itemIds,
        creationTime: s._creationTime,
        estado: s.estado,
        saleId: s.saleId,
        totalCOP: s.totalCOP,
      })),
      clientId as string,
      itemIds,
      now,
      RESERVA_TTL_MS,
    );
    if (reusable) {
      return {
        saleId: reusable.saleId,
        totalCOP: reusable.totalCOP,
        reused: true as const,
      };
    }

    // Otra persona la tiene apartada.
    const apartados = reservedItemIds(
      pendientes.map((s) => ({
        clientId: s.clientId as string,
        itemIds: s.itemIds,
        creationTime: s._creationTime,
        estado: s.estado,
      })),
      now,
      RESERVA_TTL_MS,
    );
    for (const itemId of itemIds) {
      if (apartados.has(itemId)) {
        throw new ConvexError(`ITEM_RESERVED:${itemId}`);
      }
    }

    // 5. Allocate a race-safe online saleId in the same transaction.
    const seqValue = await allocateNext(ctx, ONLINE_SALE_SEQUENCE);
    const saleId = formatSaleId(seqValue, ONLINE_SEDE);

    // 6. Insert the pending sale.
    const nowIso = new Date(now).toISOString();
    const allSales = await ctx.db.query('sales').collect();
    const rowIndex = allSales.reduce((m, s) => Math.max(m, s.rowIndex), 1) + 1;
    await ctx.db.insert('sales', {
      saleId,
      sede: ONLINE_SEDE,
      fechaVenta: nowIso,
      itemIds,
      clientId,
      precioAcordadoCOP: totalCOP,
      totalCOP,
      formaPago: args.forma_pago ?? 'mercadopago',
      estado: 'reservada' as const,
      ambassadorId,
      promotionCode: args.promotion_code ?? undefined,
      shippingAddress: args.shipping_address,
      rowIndex,
      lastPulledAt: nowIso,
      syncStatus: 'pending' as const,
    });

    return { saleId, totalCOP, reused: false as const };
  },
});

/** Persist the Mercado Pago preference id on a sale (called by create-order). */
export const setMpPreference = mutation({
  args: { saleId: v.string(), mpPreferenceId: v.string(), secret: v.string() },
  handler: async (ctx, { saleId, mpPreferenceId, secret }) => {
    requireServerSecret(secret);
    const sale = await ctx.db
      .query('sales')
      .withIndex('by_saleId', (q) => q.eq('saleId', saleId))
      .first();
    if (sale) await ctx.db.patch(sale._id, { mpPreferenceId });
    return { ok: Boolean(sale) };
  },
});

// ─── mark-order-paid (idempotent; called by mp-webhook) ────────────────────

export const markOrderPaid = mutation({
  args: {
    saleId: v.string(),
    // Legacy MercadoPago shape. Optional so the new Wompi caller can omit it,
    // and still ACCEPTED so the currently-deployed api/mp-webhook.ts keeps
    // working during the window between the Convex and Vercel deploys.
    // A follow-up commit drops these once both are live.
    mpPaymentId: v.optional(v.string()),
    mpStatus: v.optional(v.string()),
    // Provider-neutral shape.
    provider: v.optional(v.string()),
    paymentId: v.optional(v.string()),
    status: v.optional(v.string()),
    approved: v.optional(v.boolean()),
    // What the provider actually reports charging (e.g. Wompi's
    // `amountInCents`/`currency`). The mutation compares these RECEIVED values
    // against the sale's own `totalCOP` to veto the state transition when money
    // doesn't match. Optional and skipped when absent — the live `mp-webhook.ts`
    // rail does not send these yet, so omitting them must not change its behavior.
    // CRITICAL: both must remain v.optional() for deploy-skew safety (see task).
    receivedAmountInCents: v.optional(v.number()),
    receivedCurrency: v.optional(v.string()),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const { saleId } = args;
    const sale = await ctx.db
      .query('sales')
      .withIndex('by_saleId', (q) => q.eq('saleId', saleId))
      .first();
    if (!sale) return { updated: false as const, reason: 'sale-not-found' };

    // Resolve the two accepted arg shapes into one. `args.provider` is an
    // untyped `v.optional(v.string())`, so validate it against the known
    // rails rather than casting — an unrecognized value must be rejected,
    // not silently trusted (phase 4 adds `breb-manual` traffic here).
    const providerRaw = args.provider ?? 'mercadopago';
    if (!isPaymentProvider(providerRaw)) {
      return { updated: false as const, reason: 'unknown-provider' };
    }
    const provider = providerRaw;
    const paymentId = args.paymentId ?? args.mpPaymentId;
    const status = args.status ?? args.mpStatus;
    if (!paymentId || !status) {
      return { updated: false as const, reason: 'missing-payment' };
    }

    // The ambassador commission and the client's lifetime total are computed
    // from `sale.totalCOP` below — never let that happen for money that
    // wasn't actually received. Checked before any state change so it stays
    // atomic with the transition it gates.
    if (
      !amountsMatch(
        sale.totalCOP,
        args.receivedAmountInCents,
        args.receivedCurrency,
      )
    ) {
      return {
        updated: false as const,
        reason: 'amount-mismatch' as const,
        expectedAmountInCents: sale.totalCOP * 100,
        receivedAmountInCents: args.receivedAmountInCents ?? null,
        receivedCurrency: args.receivedCurrency ?? null,
      };
    }

    // Legacy callers send no `approved`; MercadoPago's word for it is
    // "approved", so derive it rather than defaulting to false and silently
    // dropping a real payment.
    const approved = args.approved ?? status === 'approved';

    const decision = applyPaymentToSale(
      { estado: sale.estado },
      { provider, id: paymentId, status, approved },
      new Date().toISOString(),
    );
    if (!decision.changed) {
      return { updated: false as const, reason: decision.reason };
    }

    // Flip the sale to confirmada (paid).
    await ctx.db.patch(sale._id, decision.patch);

    // Marcar cada piedra como vendida. Sin esto una venta online PAGADA deja
    // la esmeralda en DISPONIBLE y se puede volver a vender — sin carrera de
    // por medio, simplemente porque nadie la marcó.
    //
    // `syncStatus: 'pending'` es lo que impide que el siguiente pull de la
    // hoja lo pise: `_upsertFromSheet` devuelve temprano sin tocar el
    // contenido de una fila `pending` o `error` (convex/products.ts). Es el
    // mecanismo que el repo ya usa para toda edición nacida en Convex.
    //
    // OJO: nada empuja productInventory de vuelta a Sheets del lado del
    // servidor (ese push sale de la UI de admin, api/admin-product-update.ts),
    // así que la hoja NO se entera sola. Convex es lo que bloquea un segundo
    // pedido, así que la doble venta sí queda cerrada; la reconciliación con
    // la hoja es manual y está declarada en el spec.
    //
    // itemIds repite el sku cuando qty > 1 — de ahí el Set.
    let touchedPublished = false;
    for (const itemId of new Set(sale.itemIds)) {
      const product = await ctx.db
        .query('productInventory')
        .withIndex('by_itemId', (q) => q.eq('itemId', itemId))
        .first();
      if (!product) {
        console.warn(
          `[markOrderPaid] ${saleId}: itemId ${itemId} no está en productInventory`,
        );
        continue;
      }
      if (product.estado === 'VENDIDA') continue;
      if (product.mostrarEnCatalogo === true) touchedPublished = true;
      await ctx.db.patch(product._id, {
        estado: 'VENDIDA' as const,
        syncStatus: 'pending' as const,
      });
    }
    if (touchedPublished) await bumpCatalogVersion(ctx);

    // Increment the client's lifetime total (Convex-owned; lead_score is GHL-owned).
    let ghlContactId: string | null = null;
    let clientPhone: string | null = null;
    let clientEmail: string | null = null;
    let clientName: string | null = null;
    const client = await ctx.db.get(sale.clientId);
    if (client) {
      await ctx.db.patch(client._id, {
        totalCompradoCOP: (client.totalCompradoCOP ?? 0) + sale.totalCOP,
        ultimaCompraFecha: decision.patch.paidAt,
      });
      ghlContactId = client.ghlContactId ?? null;
      clientPhone = client.telefono ?? null;
      clientEmail = client.email ?? null;
      clientName = client.nombre ?? null;
    }

    // Commission — created exactly once per sale (by_saleId guard = idempotent).
    if (sale.ambassadorId) {
      const existing = await ctx.db
        .query('commissions')
        .withIndex('by_saleId', (q) => q.eq('saleId', saleId))
        .first();
      if (!existing) {
        const amb = await ctx.db.get(sale.ambassadorId);
        if (amb) {
          await ctx.db.insert('commissions', {
            saleId,
            ambassadorId: sale.ambassadorId,
            amountCOP: computeCommissionCOP(sale.totalCOP, amb.comisionPercent),
            percentApplied: amb.comisionPercent,
            status: 'pending' as const,
            createdAt: decision.patch.paidAt,
          });
        }
      }
    }

    return {
      updated: true as const,
      saleId,
      totalCOP: sale.totalCOP,
      ambassadorId: sale.ambassadorId ?? null,
      clientId: sale.clientId,
      ghlContactId,
      clientPhone,
      clientEmail,
      clientName,
    };
  },
});

/** Flag/unflag a sale whose post-paid GHL fan-out failed (webhook best-effort). */
export const flagGhlSyncPending = mutation({
  args: { saleId: v.string(), pending: v.boolean(), secret: v.string() },
  handler: async (ctx, { saleId, pending, secret }) => {
    requireServerSecret(secret);
    const sale = await ctx.db
      .query('sales')
      .withIndex('by_saleId', (q) => q.eq('saleId', saleId))
      .first();
    if (sale) await ctx.db.patch(sale._id, { pendingGhlSync: pending });
    return { ok: Boolean(sale) };
  },
});

// ─── client ↔ GHL contact link (used by ghl-sync-contact) ──────────────────

/**
 * GATED (2026-08-05, C1): returned a full `clients` document — nombre, nit,
 * cedula, direccion, telefono, email, leadScore, totalCompradoCOP — to any
 * caller who guessed a phone number, which is not a secret. Its only caller
 * is `api/ghl-sync-contact.ts`, itself server-to-server behind
 * `GHL_API_SECRET`, via `ConvexHttpClient` — never the browser — so this
 * takes the same `requireServerSecret` gate as every other GHL mutation in
 * this file (recordVitrinaSelection, createOrder, markOrderPaid, …), reusing
 * `ADMIN_SYNC_TOKEN`. Throws (not empty-form) on purpose: this is a one-shot
 * server call, not a reactive browser subscription, so there's no "broken
 * screen" risk — matches every other secret-gated function here.
 */
export const getClientByPhone = query({
  args: { celular: v.string(), secret: v.string() },
  handler: async (ctx, { celular, secret }) => {
    requireServerSecret(secret);
    return ctx.db
      .query('clients')
      .withIndex('by_telefono', (q) => q.eq('telefono', celular))
      .first();
  },
});

export const linkGhlContact = mutation({
  args: {
    clientId: v.id('clients'),
    ghlContactId: v.string(),
    secret: v.string(),
  },
  handler: async (ctx, { clientId, ghlContactId, secret }) => {
    requireServerSecret(secret);
    await ctx.db.patch(clientId, { ghlContactId });
    return { ok: true };
  },
});

// ─── abandoned-cart cron (scheduler) ───────────────────────────────────────

/**
 * Flag online sales still `reservada` (unpaid) more than 4h after creation.
 * MVP logs the candidate set; the GHL nudge send (WhatsApp/email via a workflow)
 * is a documented second-wave follow-up.
 */
export const nudgeAbandoned = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 4 * 60 * 60 * 1000;
    const reservadas = await ctx.db
      .query('sales')
      .withIndex('by_estado', (q) => q.eq('estado', 'reservada'))
      .collect();
    const stale = reservadas.filter(
      (s) => new Date(s.fechaVenta).getTime() < cutoff,
    );
    console.log(
      `[abandoned-cart] ${stale.length} reservada sales older than 4h:`,
      stale.map((s) => s.saleId),
    );
    return { candidates: stale.length };
  },
});

// ─── sin-respuesta-7d inactivity cron ──────────────────────────────────────
//
// GHL Manage Scoring has no native "contact hasn't replied in N days" trigger
// (all UI categories tested — see GHL/ESTADO-Y-PROXIMOS-PASOS.md). This cron
// closes that gap: it scans each linked contact's most-recent GHL conversation
// and, if the last message was OUTBOUND (from us) and older than 7 days, tags
// the contact `sin-respuesta-7d`. A Manage Scoring rule (UI config, already in
// place) scores that tag −10. The HTTP + decision logic lives in the
// unit-tested `_lib/ghlConversations.ts` so this stays thin IO glue.

/** Threshold (days) after which an unanswered outbound message is "stale". */
const INACTIVITY_THRESHOLD_DAYS = 7;
/** The tag Manage Scoring watches for (scored −10). */
const INACTIVITY_TAG = 'sin-respuesta-7d';

/**
 * Contacts eligible for the inactivity scan: clients we've linked to a GHL
 * contact (only those have a `ghlContactId` to query conversations for).
 */
export const listGhlLinkedContacts = internalQuery({
  args: {},
  handler: async (ctx) => {
    const clients = await ctx.db.query('clients').collect();
    return clients
      .filter((c) => Boolean(c.ghlContactId))
      .map((c) => ({ clientId: c._id, ghlContactId: c.ghlContactId! }));
  },
});

/**
 * Daily cron: tag GHL contacts whose last message was an unanswered outbound
 * older than 7 days. Best-effort and resilient — one contact's API error is
 * logged and skipped so the batch always completes.
 */
export const tagInactiveContacts = internalAction({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    scanned: number;
    tagged: number;
    notInactive: number;
    errored: number;
  }> => {
    const token = process.env.GHL_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;
    if (!token || !locationId) {
      console.warn(
        '[sin-respuesta-7d] GHL_TOKEN / GHL_LOCATION_ID unset — skipping run',
      );
      return { scanned: 0, tagged: 0, notInactive: 0, errored: 0 };
    }
    const cfg: GhlConvConfig = { token, locationId };

    const contacts = await ctx.runQuery(internal.ghl.listGhlLinkedContacts, {});
    const now = Date.now();
    let tagged = 0;
    let notInactive = 0;
    let errored = 0;

    // Sequential to stay well under GHL rate limits; the linked-contact set is
    // small and this runs once daily off-peak.
    for (const { ghlContactId } of contacts) {
      try {
        const inactive = await isContactInactive(
          cfg,
          ghlContactId,
          now,
          INACTIVITY_THRESHOLD_DAYS,
        );
        if (inactive) {
          await addContactTags(cfg, ghlContactId, [INACTIVITY_TAG]);
          tagged++;
        } else {
          notInactive++;
        }
      } catch (err) {
        // One contact's failure must NOT abort the whole batch.
        errored++;
        console.error(
          `[sin-respuesta-7d] contact ${ghlContactId} failed:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    console.log(
      `[sin-respuesta-7d] scanned=${contacts.length} tagged=${tagged} ` +
        `notInactive=${notInactive} errored=${errored}`,
    );
    return {
      scanned: contacts.length,
      tagged,
      notInactive,
      errored,
    };
  },
});
