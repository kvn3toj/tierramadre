/**
 * Fotosynthia execute layer — turns a server-hardened GuidedAction into a real
 * Convex mutation, on the operator's single approval.
 *
 * Trust model: the model only ever proposed `{ kind, args }` with NAME hints;
 * the server hardened it (flowSchemas.hardenAction). Here we (1) resolve the
 * name hints to real Convex Ids/natural keys against live data — REFUSE on
 * ambiguity (C6) — (2) reuse the SAME payload builders the capture forms use so
 * field-mapping stays in parity, and (3) call the SAME mutation the form calls,
 * which already schedules the Google-Sheets push (so "wire to spreadsheets" is
 * automatic). A `clientToken` rides the four create mutations for replay-safe
 * idempotency (C1/replay). Mutations/queries are dispatched imperatively through
 * the Convex client so there are no always-on subscriptions.
 */

import { useCallback } from "react";
import type { ConvexReactClient } from "convex/react";
import { useConvexClient, convexApi } from "../../../../lib/convex-safe";
import { serializeMedidas } from "../../../../data/vocabularies";
import {
  buildGemaPayload,
  buildInsumoPayload,
  buildJoyaPayload,
} from "../utils/buildLotItemPayload";
import type { GemaDraft } from "../components/GemaFields";
import type { JoyaDraft } from "../components/JoyaFields";
import type { InsumoDraft } from "../components/InsumoFields";
import { ITEM_SCAN_CAP } from "../../../../../convex/_lib/aiCaps";
import {
  resolveItemHint,
  hintMissMessage,
  type HintCandidate,
} from "./resolveItemHint";
import { resolveOne, refMissMessage } from "./resolveRef";
import type { ActionKind, GuidedAction } from "./flowSchemas";

export interface CommitContext {
  /** Operator identity, injected into editorEmail/operatorEmail audit fields. */
  editorEmail: string;
  operatorName?: string;
  /** The lot in the active route, used as the default target for item.create*. */
  activeLoteId?: string;
  /** Live lot-item candidate list (from the workspace snapshot) for itemHint resolution. */
  candidateItems?: HintCandidate[];
}

export type CommitEntityKind = "item" | "lot" | "sale";

/** Identifies the committed row so the approval log can subscribe to its syncStatus. */
export interface CommitEntity {
  kind: CommitEntityKind;
  /** Natural key (itemId / loteId) or the sale's Convex _id, per the query used to read syncStatus. */
  key: string;
}

export interface CommitOutcome {
  kind: ActionKind;
  /** Whether the underlying mutation pushes to Sheets (drives the sync badge). */
  syncsToSheet: boolean;
  /** The raw mutation return value (id/itemId/saleId/etc.). */
  result: unknown;
  /** The committed row, when it can be derived from the result (for live sync tracking). */
  entity?: CommitEntity;
}

/**
 * Derive the row to live-track from a mutation result. Covers creates (the key
 * rides the result) and lot/sale lifecycle; edits that only return a lotItemId
 * are left untracked (the approval log shows them as a static pending/na badge).
 */
function deriveEntity(
  kind: ActionKind,
  result: unknown,
): CommitEntity | undefined {
  const r = (result ?? {}) as Record<string, unknown>;
  if (kind.startsWith("item.create") && typeof r.itemId === "string")
    return { kind: "item", key: r.itemId };
  if (kind.startsWith("lot.") && typeof r.loteId === "string")
    return { kind: "lot", key: r.loteId };
  if (kind.startsWith("sale.") && typeof r.id === "string")
    return { kind: "sale", key: r.id };
  return undefined;
}

// ─── loose imperative client helpers ──────────────────────────────────
// The generated mutation/query refs are strongly typed; we validate arg shapes
// by hand against each validator (see the Convex files) and dispatch loosely so
// this one module doesn't have to re-declare 25 mutation signatures. A wrong arg
// name surfaces as a Convex runtime rejection (caught + shown), never silent.
type Client = ConvexReactClient;
function runQuery<T>(client: Client, ref: unknown, args: unknown): Promise<T> {
  return (client.query as (r: unknown, a: unknown) => Promise<unknown>)(
    ref,
    args,
  ) as Promise<T>;
}
function runMutation<T>(
  client: Client,
  ref: unknown,
  args: unknown,
): Promise<T> {
  return (client.mutation as (r: unknown, a: unknown) => Promise<unknown>)(
    ref,
    args,
  ) as Promise<T>;
}

// ─── value coercers ───────────────────────────────────────────────────
const str = (v: unknown): string =>
  typeof v === "string" ? v : v == null ? "" : String(v);
const strOpt = (v: unknown): string | undefined => {
  const s = str(v).trim();
  return s || undefined;
};
const numOpt = (v: unknown): number | undefined => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
};
const numOrEmpty = (v: unknown): number | "" => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : "";
};
const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/**
 * True when a hint already looks like a concrete inventory natural key (e.g.
 * "32", "32-A", "TM-0145") rather than a fuzzy product name. Lets a precise
 * itemId commit even when the item is outside the recent-items snapshot cap —
 * BR-6 in `sales.create` is still the authoritative gate (it rejects an itemId
 * that isn't a DISPONIBLE/ASESOR inventory row), so an off-by typo can't sell.
 */
function looksLikeNaturalItemId(value: string): boolean {
  const s = value.trim();
  return (
    s.length > 0 && s.length <= 24 && /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(s)
  );
}

/** A NIT vs cédula document split shared by the provider + client builders. */
function docFields(
  tipoDocumento: unknown,
  documento: unknown,
): { nit?: string; cedula?: string } {
  const doc = strOpt(documento);
  if (!doc) return {};
  return str(tipoDocumento).toUpperCase().includes("NIT")
    ? { nit: doc }
    : { cedula: doc };
}

// ─── ref resolution (refuse-on-ambiguity) ─────────────────────────────
async function resolveProviderId(
  client: Client,
  hint: string,
): Promise<string> {
  const providers = await runQuery<
    Array<{ _id: string; nombreORazonSocial?: string }>
  >(client, convexApi.providers.list, {});
  const r = resolveOne(providers, (p) => p.nombreORazonSocial, hint);
  if (r.status !== "resolved")
    throw new Error(refMissMessage("proveedor", hint, r));
  return r.item._id;
}

async function resolveClientId(client: Client, hint: string): Promise<string> {
  const clients = await runQuery<Array<{ _id: string; nombre?: string }>>(
    client,
    convexApi.clients.list,
    {},
  );
  const r = resolveOne(clients, (c) => c.nombre, hint);
  if (r.status !== "resolved")
    throw new Error(refMissMessage("cliente", hint, r));
  return r.item._id;
}

async function resolveLotDocId(
  client: Client,
  loteHint: string,
): Promise<string> {
  const lot = await runQuery<{ _id: string; loteId: string } | null>(
    client,
    convexApi.lots.getByLoteId,
    { loteId: loteHint },
  );
  if (!lot) throw new Error(`No encontré el lote ${loteHint}.`);
  return lot._id;
}

async function resolveSaleId(
  client: Client,
  saleHint: string,
): Promise<string> {
  const sales = await runQuery<Array<{ _id: string; saleId?: string }>>(
    client,
    convexApi.sales.list,
    {},
  );
  const r = resolveOne(sales, (s) => s.saleId, saleHint);
  if (r.status !== "resolved")
    throw new Error(refMissMessage("venta", saleHint, r));
  return r.item._id;
}

async function resolveLotItemId(
  client: Client,
  itemHint: string,
  candidates: HintCandidate[] | undefined,
): Promise<string> {
  const res = resolveItemHint(itemHint, candidates, ITEM_SCAN_CAP);
  if (res.status !== "resolved")
    throw new Error(hintMissMessage(itemHint, res));
  const { itemId, loteId } = res.item;
  if (!loteId) throw new Error(`No sé en qué lote está ${itemId}.`);
  const items = await runQuery<Array<{ _id: string; itemId: string }>>(
    client,
    convexApi.lotItems.listByLote,
    { loteId },
  );
  const found = items.find((li) => li.itemId === itemId);
  if (!found) throw new Error(`No encontré ${itemId} en el lote ${loteId}.`);
  return found._id;
}

// ─── item-draft adapters (reuse the form payload builders) ────────────
function toGemaDraft(a: Record<string, unknown>): GemaDraft {
  return {
    nombre: str(a.nombre),
    peso: str(a.peso),
    color: str(a.color),
    calidad: str(a.calidad),
    procedencia: str(a.procedencia),
    preponderancia: numOrEmpty(a.preponderancia),
    precioPublicoCOP: numOrEmpty(a.precioPublicoCOP),
    cantidad: numOrEmpty(a.cantidad),
    tipoEsmeralda: str(a.tipoEsmeralda),
    corte: str(a.corte),
    medidasAncho: str(a.medidasAncho),
    medidasAlto: str(a.medidasAlto),
    medidasCono: str(a.medidasCono),
    nivelRareza: numOrEmpty(a.nivelRareza),
    calificacion: numOrEmpty(a.calificacion),
  } as unknown as GemaDraft;
}

function toJoyaDraft(a: Record<string, unknown>): JoyaDraft {
  return {
    nombre: str(a.nombre),
    descripcion: str(a.descripcion),
    cantidad: numOpt(a.cantidad) ?? 1,
    pesoValor: numOrEmpty(a.pesoValor),
    pesoUnidad: a.pesoUnidad === "ct" ? "ct" : "gr",
    tipoJoya: str(a.tipoJoya),
    tecnica: str(a.tecnica),
    minerales: strArr(a.minerales),
    complementos: strArr(a.complementos),
    preponderancia: numOrEmpty(a.preponderancia),
    precioPublicoCOP: numOrEmpty(a.precioPublicoCOP),
  } as unknown as JoyaDraft;
}

function toInsumoDraft(a: Record<string, unknown>): InsumoDraft {
  return {
    nombre: str(a.nombre),
    categoria: str(a.categoria),
    cantidad: numOrEmpty(a.cantidad),
    preponderancia: numOrEmpty(a.preponderancia),
    precioPublicoCOP: numOrEmpty(a.precioPublicoCOP),
  } as unknown as InsumoDraft;
}

/** Map an AI edit draft (EDIT_PATCH_KEYS shape) to the updateGemaFields patch. */
function toGemaFieldsPatch(
  a: Record<string, unknown>,
): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  const set = (k: string, v: unknown) => {
    if (v !== undefined) p[k] = v;
  };
  set("nombre", strOpt(a.nombre));
  set("color", strOpt(a.color));
  set("calidad", strOpt(a.calidad));
  set("procedencia", strOpt(a.procedencia));
  set("observacion", strOpt(a.observacion) ?? strOpt(a.descripcion));
  set("talla", strOpt(a.corte));
  set("categoria", strOpt(a.categoria));
  set("tipoEsmeralda", strOpt(a.tipoEsmeralda));
  set("tipoJoya", strOpt(a.tipoJoya));
  set("tecnicaJoya", strOpt(a.tecnica));
  set("cantidad", numOpt(a.cantidad));
  set("nivelRareza", numOpt(a.nivelRareza));
  set("calificacion", numOpt(a.calificacion));
  set("precioPublicoCOP", numOpt(a.precioPublicoCOP));
  set("precioEmbajadorCOP", numOpt(a.precioEmbajadorCOP));
  set("precioConscienteCOP", numOpt(a.precioConscienteCOP));
  if (Array.isArray(a.minerales)) set("minerales", strArr(a.minerales));
  if (Array.isArray(a.complementos))
    set("complementos", strArr(a.complementos));
  if (typeof a.mostrarEnCatalogo === "boolean")
    set("mostrarEnCatalogo", a.mostrarEnCatalogo);
  // peso: prefer a literal `peso`; else compose from pesoValor + pesoUnidad.
  if (strOpt(a.peso)) set("peso", strOpt(a.peso));
  else if (typeof a.pesoValor === "number")
    set("peso", `${a.pesoValor} ${strOpt(a.pesoUnidad) ?? "gr"}`);
  // medidas: compose from the three axes when any is present.
  const medidas = serializeMedidas({
    ancho: str(a.medidasAncho),
    alto: str(a.medidasAlto),
    cono: str(a.medidasCono),
  });
  if (medidas) set("medidas", medidas);
  return p;
}

// ─── the dispatcher ───────────────────────────────────────────────────
async function dispatch(
  client: Client,
  action: GuidedAction,
  ctx: CommitContext,
  clientToken: string,
): Promise<unknown> {
  const a = action.args as Record<string, unknown>;
  const email = ctx.editorEmail || "fotosynthia@tierramadre.app";

  switch (action.kind) {
    // ── items ──────────────────────────────────────────────────────
    case "item.createGema": {
      const loteId = strOpt(a.loteId) ?? ctx.activeLoteId;
      if (!loteId)
        throw new Error("¿En qué lote la registro? Abrí o nombrá el lote.");
      const payload = buildGemaPayload(loteId, toGemaDraft(a), "", false);
      return runMutation(client, convexApi.lotItems.create, {
        ...payload,
        clientToken,
      });
    }
    case "item.createJoya": {
      const loteId = strOpt(a.loteId) ?? ctx.activeLoteId;
      if (!loteId)
        throw new Error("¿En qué lote la registro? Abrí o nombrá el lote.");
      const payload = buildJoyaPayload(loteId, toJoyaDraft(a), "", false);
      return runMutation(client, convexApi.lotItems.create, {
        ...payload,
        clientToken,
      });
    }
    case "item.createInsumo": {
      const loteId = strOpt(a.loteId) ?? ctx.activeLoteId;
      if (!loteId)
        throw new Error("¿En qué lote lo registro? Abrí o nombrá el lote.");
      const payload = buildInsumoPayload(loteId, toInsumoDraft(a), "", false);
      return runMutation(client, convexApi.lotItems.create, {
        ...payload,
        clientToken,
      });
    }
    case "item.editFields": {
      const lotItemId = await resolveLotItemId(
        client,
        str(a.itemHint),
        ctx.candidateItems,
      );
      const patch = toGemaFieldsPatch(a);
      return runMutation(client, convexApi.lotItems.updateGemaFields, {
        lotItemId,
        patch,
        editorEmail: email,
      });
    }
    case "item.editPreponderancia": {
      const lotItemId = await resolveLotItemId(
        client,
        str(a.itemHint),
        ctx.candidateItems,
      );
      const preponderancia = numOpt(a.preponderancia);
      if (preponderancia === undefined)
        throw new Error("¿Qué preponderancia le pongo (en %)?");
      return runMutation(client, convexApi.lotItems.updatePreponderancia, {
        lotItemId,
        preponderancia,
        editorEmail: email,
      });
    }
    case "item.setMedia": {
      const lotItemId = await resolveLotItemId(
        client,
        str(a.itemHint),
        ctx.candidateItems,
      );
      return runMutation(client, convexApi.lotItems.updateMedia, {
        lotItemId,
        ...(strOpt(a.fotoUrl) !== undefined
          ? { fotoUrl: strOpt(a.fotoUrl) }
          : {}),
        ...(strOpt(a.certificadoUrl) !== undefined
          ? { certificadoUrl: strOpt(a.certificadoUrl) }
          : {}),
        editorEmail: email,
      });
    }
    case "item.remove": {
      const lotItemId = await resolveLotItemId(
        client,
        str(a.itemHint),
        ctx.candidateItems,
      );
      return runMutation(client, convexApi.lotItems.remove, {
        lotItemId,
        editorEmail: email,
      });
    }

    // ── lots ───────────────────────────────────────────────────────
    case "lot.create": {
      const providerHint = action.needsRefs.find(
        (r) => r.field === "providerId",
      )?.hint;
      const providerId = providerHint
        ? await resolveProviderId(client, providerHint)
        : strOpt(a.providerId);
      if (!providerId) throw new Error("¿A qué proveedor le compro el lote?");
      return runMutation(client, convexApi.lots.create, {
        sede: str(a.sede),
        providerId,
        fechaRecepcion:
          strOpt(a.fechaRecepcion) ?? new Date().toISOString().slice(0, 10),
        renombreLote: strOpt(a.renombreLote),
        tratamiento: strOpt(a.tratamiento),
        mina: strOpt(a.mina),
        pesoTotalQuilates: numOpt(a.pesoTotalQuilates),
        costoTotalCOP: numOpt(a.costoTotalCOP) ?? 0,
        unidadesDeclaradas: numOpt(a.unidadesDeclaradas) ?? 0,
        formaPago: str(a.formaPago) || "contado",
        metodoContado: strOpt(a.metodoContado),
        fechaVencimiento: strOpt(a.creditoFechaVenc),
        numeroCuotas: numOpt(a.creditoCuotas),
        notas: strOpt(a.notas),
        clientToken,
      });
    }
    case "lot.update": {
      const id = await resolveLotDocId(client, str(a.loteId));
      const patch: Record<string, unknown> = {};
      const set = (k: string, v: unknown) => {
        if (v !== undefined) patch[k] = v;
      };
      set("fechaRecepcion", strOpt(a.fechaRecepcion));
      set("renombreLote", strOpt(a.renombreLote));
      set("tratamiento", strOpt(a.tratamiento));
      set("mina", strOpt(a.mina));
      set("pesoTotalQuilates", numOpt(a.pesoTotalQuilates));
      set("unidadesDeclaradas", numOpt(a.unidadesDeclaradas));
      set("formaPago", strOpt(a.formaPago));
      set("metodoContado", strOpt(a.metodoContado));
      set("fechaVencimiento", strOpt(a.fechaVencimiento));
      set("numeroCuotas", numOpt(a.numeroCuotas));
      set("numeroFactura", strOpt(a.numeroFactura));
      set("urlFactura", strOpt(a.urlFactura));
      set("notas", strOpt(a.notas));
      return runMutation(client, convexApi.lots.update, {
        id,
        patch,
        editorEmail: email,
      });
    }
    case "lot.close": {
      const id = await resolveLotDocId(client, str(a.loteId));
      return runMutation(client, convexApi.lots.close, { id });
    }
    case "lot.cancel": {
      const id = await resolveLotDocId(client, str(a.loteId));
      return runMutation(client, convexApi.lots.cancel, {
        id,
        reason: strOpt(a.reason),
      });
    }
    case "lot.publish": {
      const id = await resolveLotDocId(client, str(a.loteId));
      return runMutation(client, convexApi.lots.publish, { id });
    }
    case "lot.reopen": {
      const id = await resolveLotDocId(client, str(a.loteId));
      return runMutation(client, convexApi.lots.reopen, {
        id,
        editorEmail: email,
        reason: strOpt(a.reason),
      });
    }
    case "lot.setDisplay": {
      const id = await resolveLotDocId(client, str(a.loteId));
      return runMutation(client, convexApi.lots.setLoteDisplay, {
        id,
        ...(strOpt(a.fotoLoteUrl) !== undefined
          ? { fotoLoteUrl: strOpt(a.fotoLoteUrl) }
          : {}),
        ...(typeof a.mostrarComoLote === "boolean"
          ? { mostrarComoLote: a.mostrarComoLote }
          : {}),
      });
    }

    // ── sales ──────────────────────────────────────────────────────
    case "sale.create": {
      // DIRECT in-chat money commit — but ONLY for the common case. We refuse
      // anything VentaPage computes in ways we cannot faithfully replicate here
      // (esmereogénesis trade-in math, multi-item line/tier pricing, commission
      // ledger) and hand those back to the venta form via a thrown message that
      // the review card surfaces.
      const formaPago = str(a.formaPago) || "contado";
      // Esmereogénesis (trade-in) carries plazo/cuotas/credit math VentaPage
      // builds field-by-field — out of scope for a one-tap commit.
      if (formaPago === "esmereogenesis" || formaPago === "canje") {
        throw new Error(
          "Esta venta es compleja (esmereogénesis / varios ítems / comisión). La confirmo en el formulario de ventas.",
        );
      }
      // The copilot venta flow models a SINGLE item (VENTA_KEYS has `itemId`,
      // not `itemIds`); a multi-item bundle (line items + per-tier pricing) is a
      // form-only flow. If the model smuggled an array, refuse.
      if (
        Array.isArray(a.itemId) ||
        Array.isArray((a as { itemIds?: unknown }).itemIds)
      ) {
        throw new Error(
          "Esta venta es compleja (esmereogénesis / varios ítems / comisión). La confirmo en el formulario de ventas.",
        );
      }

      // Resolve the ITEM hint to a single inventory natural key. Prefer the
      // snapshot resolver (name/itemId match, refuse-on-ambiguity); if it misses
      // but the hint already looks like a literal natural key, use it verbatim so
      // a precise itemId still commits even when it's outside the recent-items cap.
      const itemHint = str(a.itemId);
      const res = resolveItemHint(itemHint, ctx.candidateItems, ITEM_SCAN_CAP);
      let resolvedItemId: string;
      if (res.status === "resolved") {
        resolvedItemId = res.item.itemId;
      } else if (looksLikeNaturalItemId(itemHint)) {
        resolvedItemId = itemHint.trim();
      } else {
        throw new Error(hintMissMessage(itemHint, res));
      }
      const itemIds = [resolvedItemId];

      // Resolve the CLIENT: a hint in clientId → resolve against the directory;
      // else a clienteFinalData object → create a brand-new final client inline.
      let clientId: string;
      const clientHint = strOpt(a.clientId);
      if (clientHint) {
        clientId = await resolveClientId(client, clientHint);
      } else if (a.clienteFinalData && typeof a.clienteFinalData === "object") {
        const cf = a.clienteFinalData as Record<string, unknown>;
        const nombre = strOpt(cf.nombre);
        if (!nombre)
          throw new Error("¿Cómo se llama el cliente final de esta venta?");
        const created = await runMutation<{ id: string }>(
          client,
          convexApi.clients.create,
          {
            nombre,
            tipo: strOpt(cf.tipo) ?? "final",
            direccion: strOpt(cf.direccion),
            telefono: strOpt(cf.telefono),
            email: strOpt(cf.email),
            ...docFields(cf.tipoDocumento, cf.documento),
          },
        );
        clientId = created.id;
      } else {
        throw new Error("¿A qué cliente le vendo?");
      }

      // Money fields — replicate VentaPage's mapping:
      //   precioAcordadoCOP = precioCop (the agreed final price)
      //   descuentoCOP      = descuentoCop (here numOpt; defaults to 0)
      //   totalCOP          = precioCop − descuento  (VentaPage: totalCop === precioCop
      //                       because comisionCop is a Slice-1 0 placeholder; the
      //                       discount is already baked into precioAcordado).
      const precioAcordadoCOP = numOpt(a.precioAcordado);
      if (precioAcordadoCOP === undefined || precioAcordadoCOP <= 0)
        throw new Error("¿Por cuánto se vende? (precio acordado en COP)");
      const descuentoCOP = numOpt(a.descuentoCOP) ?? 0;
      const totalCOP = precioAcordadoCOP - descuentoCOP;
      // comisionCOP is OMITTED on purpose: VentaPage's Slice-1 comisionCop is a 0
      // placeholder passed as `|| undefined`, and the commission ledger is owned
      // elsewhere — so we never author it from the copilot (it's optional).

      const sede = str(a.sede);
      const metodoContado =
        formaPago === "contado"
          ? (strOpt(a.metodoContado) ?? "efectivo")
          : undefined;
      // fechaVenta: VentaPage stamps the full ISO at confirm time (drives the
      // Kardex date). We replicate that faithfully (validator accepts any string).
      const fechaVenta = new Date().toISOString();
      const estado = "confirmada" as const; // server default; passed explicitly.

      return runMutation(client, convexApi.sales.create, {
        sede,
        itemIds,
        clientId,
        fechaVenta,
        precioAcordadoCOP,
        descuentoCOP,
        totalCOP,
        formaPago,
        ...(metodoContado !== undefined ? { metodoContado } : {}),
        estado,
        clientToken,
      });
    }
    case "sale.cancel": {
      const id = await resolveSaleId(client, str(a.saleId));
      return runMutation(client, convexApi.sales.cancel, {
        id,
        operatorEmail: email,
        operatorName: ctx.operatorName,
        reason: strOpt(a.reason),
      });
    }
    case "sale.updatePrice": {
      const id = await resolveSaleId(client, str(a.saleId));
      const precioAcordadoCOP = numOpt(a.precioAcordadoCOP);
      if (precioAcordadoCOP === undefined)
        throw new Error("¿Cuál es el nuevo precio acordado?");
      return runMutation(client, convexApi.sales.updatePrice, {
        id,
        precioAcordadoCOP,
        totalCOP: numOpt(a.totalCOP),
        descuentoCOP: numOpt(a.descuentoCOP),
      });
    }
    case "sale.setCertificadoUrl": {
      const id = await resolveSaleId(client, str(a.saleId));
      return runMutation(client, convexApi.sales.setCertificadoUrl, {
        id,
        certificadoUrl: str(a.certificadoUrl),
      });
    }
    case "sale.setCarnetUrl": {
      const id = await resolveSaleId(client, str(a.saleId));
      return runMutation(client, convexApi.sales.setCarnetUrl, {
        id,
        carnetUrl: str(a.carnetUrl),
      });
    }

    // ── sublotes (natural-key references, no Id resolution) ────────
    case "sublote.create": {
      return runMutation(client, convexApi.subLotes.create, {
        parentLoteId: str(a.parentLoteId),
        nombre: str(a.nombre),
        notas: strOpt(a.notas),
        itemIds: strArr(a.itemIds),
        clientToken,
      });
    }
    case "sublote.addItems": {
      return runMutation(client, convexApi.subLotes.addItems, {
        subLoteId: str(a.subLoteId),
        itemIds: strArr(a.itemIds),
      });
    }
    case "sublote.removeItems": {
      return runMutation(client, convexApi.subLotes.removeItems, {
        subLoteId: str(a.subLoteId),
        itemIds: strArr(a.itemIds),
      });
    }
    case "sublote.updateMeta": {
      return runMutation(client, convexApi.subLotes.updateMeta, {
        subLoteId: str(a.subLoteId),
        nombre: strOpt(a.nombre),
        notas: strOpt(a.notas),
      });
    }
    case "sublote.setEstado": {
      return runMutation(client, convexApi.subLotes.setEstado, {
        subLoteId: str(a.subLoteId),
        estado: a.estado === "archivada" ? "archivada" : "activa",
      });
    }
    case "sublote.setDisplay": {
      return runMutation(client, convexApi.subLotes.setDisplay, {
        subLoteId: str(a.subLoteId),
        ...(strOpt(a.fotoUrl) !== undefined
          ? { fotoUrl: strOpt(a.fotoUrl) }
          : {}),
        ...(typeof a.mostrarComoLote === "boolean"
          ? { mostrarComoLote: a.mostrarComoLote }
          : {}),
      });
    }

    // ── directory ──────────────────────────────────────────────────
    case "provider.create": {
      return runMutation(client, convexApi.providers.create, {
        nombreORazonSocial: str(a.nombreORazonSocial),
        tipo: strOpt(a.tipo) ?? "gemas",
        direccion: strOpt(a.direccion),
        telefono: strOpt(a.telefono),
        email: strOpt(a.email),
        notas: strOpt(a.notas),
        ...docFields(a.tipoDocumento, a.documento),
      });
    }
    case "provider.update": {
      const hint =
        action.needsRefs.find((r) => r.field === "id")?.hint ??
        str(a.providerName);
      const id = await resolveProviderId(client, hint);
      const patch: Record<string, unknown> = {
        ...(strOpt(a.nombreORazonSocial)
          ? { nombreORazonSocial: strOpt(a.nombreORazonSocial) }
          : {}),
        ...(strOpt(a.direccion) ? { direccion: strOpt(a.direccion) } : {}),
        ...(strOpt(a.telefono) ? { telefono: strOpt(a.telefono) } : {}),
        ...(strOpt(a.email) ? { email: strOpt(a.email) } : {}),
        ...(strOpt(a.notas) ? { notas: strOpt(a.notas) } : {}),
        ...(strOpt(a.tipo) ? { tipo: strOpt(a.tipo) } : {}),
        ...docFields(a.tipoDocumento, a.documento),
      };
      return runMutation(client, convexApi.providers.update, { id, patch });
    }
    case "client.create": {
      return runMutation(client, convexApi.clients.create, {
        nombre: str(a.nombre),
        tipo: strOpt(a.tipo) ?? "final",
        direccion: strOpt(a.direccion),
        telefono: strOpt(a.telefono),
        email: strOpt(a.email),
        asesorId: strOpt(a.asesorId),
        ...docFields(a.tipoDocumento, a.documento),
      });
    }
    case "client.update": {
      const hint =
        action.needsRefs.find((r) => r.field === "id")?.hint ??
        str(a.clientName);
      const id = await resolveClientId(client, hint);
      const patch: Record<string, unknown> = {
        ...(strOpt(a.nombre) ? { nombre: strOpt(a.nombre) } : {}),
        ...(strOpt(a.direccion) ? { direccion: strOpt(a.direccion) } : {}),
        ...(strOpt(a.telefono) ? { telefono: strOpt(a.telefono) } : {}),
        ...(strOpt(a.email) ? { email: strOpt(a.email) } : {}),
        ...(strOpt(a.tipo) ? { tipo: strOpt(a.tipo) } : {}),
        ...(strOpt(a.asesorId) ? { asesorId: strOpt(a.asesorId) } : {}),
        ...docFields(a.tipoDocumento, a.documento),
      };
      return runMutation(client, convexApi.clients.update, { id, patch });
    }

    // Any kind without a case above is still a form-only flow; the card opens it.
    default:
      throw new Error(
        `“${action.kind}” se completa en el formulario; abrílo desde la tarjeta.`,
      );
  }
}

/**
 * Hook returning a committer. Throws a Spanish, operator-facing Error on any
 * resolution/validation failure (the review card catches + surfaces it with a
 * retry). Returns null-client guard so an offline build degrades gracefully.
 */
export function useExecuteAction(): (
  action: GuidedAction,
  ctx: CommitContext,
  clientToken: string,
) => Promise<CommitOutcome> {
  const client = useConvexClient();
  return useCallback(
    async (action, ctx, clientToken) => {
      if (!client)
        throw new Error(
          "Convex no está configurado en este entorno; no puedo guardar todavía.",
        );
      const result = await dispatch(client as Client, action, ctx, clientToken);
      return {
        kind: action.kind,
        syncsToSheet: action.syncsToSheet,
        result,
        entity: deriveEntity(action.kind, result),
      };
    },
    [client],
  );
}
