import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Switch } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Download,
  ArrowRight,
  Trash2,
  Plus,
} from 'lucide-react';
import {
  getFoto,
  fontFamilies,
  emeraldCore,
  goldAccent,
} from '../../../design-system';
import { precioBaseCOP } from '../../../utils/precioBase';
import { useTRM } from '../../../hooks/useTRM';
import {
  useConvexQuery,
  useAuthedConvexAction,
  convexApi,
} from '../../../lib/convex-safe';
import { useNotification } from '../../../contexts/NotificationContext';
import { useGoogleAuth } from '../../../contexts/GoogleAuthContext';
import { readFreshSessionToken } from '../../../utils/sessionToken';
import { TicketHeader } from './components/TicketHeader';
import { FOTO_TOPBAR_HEIGHT } from './components/FotoTopbar';
import { fotoPaneSx, fotoPageMinHeight } from './components/paneStyles';
import { StepPills } from './components/StepPills';
import { spanishText } from './utils/fieldLang';
import { SegmentedControl } from '../../../design-system/components/SegmentedControl';
import { FieldLabel } from './components/FieldLabel';
import { NumberInputWithCalc } from './components/NumberInputWithCalc';
import { KbdKey } from './components/KbdKey';
import { KardexPreview, type KardexLineItem } from './components/KardexPreview';
import { CertificadoPreview } from './components/CertificadoPreview';
import {
  ClienteFinalForm,
  type ClienteRow,
  type ClienteInitialData,
} from './components/ClienteFinalForm';
import {
  CreditoFields,
  EsmereogenesisFields,
} from './components/CreditoFields';
import {
  useFotosintesisLayout,
  type SpotlightProduct,
} from './FotosintesisLayoutContext';
import {
  removeSelection,
  dedupeSelection,
  sumSuggested,
  pickTierPrice,
  buildSaleLineItems,
  type CompradorTier,
} from './utils/saleItemSelection';
import {
  clampPct,
  totalFromPct,
  pctFromTotal,
  discountAmount,
} from './utils/discountCalc';
import {
  sumManual,
  removeManual,
  toConvexManualItems,
  type ManualSaleItem,
} from './utils/manualSaleItem';
import { ManualItemForm } from './components/ManualItemForm';
import { resolveItemThumbnail } from './utils/resolveThumbnail';
import { useBatchThumbnails } from '../../../hooks/useBatchThumbnails';
import { ventasSubPath } from './utils/uploadItemMedia';
import { exportCarnet } from './exportCarnet';
import { exportCertificado, isCertificadoApproved } from './exportCertificado';
import { slugifyBuyerName } from '../../../utils/slugify';
import { beginStage, logFailure, logStage } from './instrumentation';
import type { Id } from '../../../../convex/_generated/dataModel';
import {
  BOVEDAS,
  sanitizeSedeCode,
  type Sede,
} from '../../../data/vocabularies';

// Known buyer types keep autocomplete; a custom write-in ("Otro…") is allowed
// and captured through the cliente-final form, which stores it on clients.tipo.
type CompradorTipo = 'embajador' | 'final' | (string & {});
type FormaPago =
  | 'contado'
  | 'esmereogenesis'
  | 'credito'
  | 'canje'
  | 'bajo_pedido'
  | 'consignacion';
type MetodoContado = 'efectivo' | 'transferencia' | 'crypto';

/**
 * Shared dark "felt" gradient for the Kardex/comprobante preview panes.
 * Re-used by VentaDetailPage so the two preview backgrounds stay identical.
 */
export const FOTO_PREVIEW_FELT =
  'linear-gradient(180deg, #2a2522 0%, #1a1714 100%)';

function formatCop(value: number | undefined | null): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Fotosíntesis — Venta + Kardex (Slice 1).
 *
 * Embajador-only sale; cliente final UI greyed out with "próximamente".
 * Forma de pago: contado / esmereogenesis (crédito disabled).
 * On confirm: `sales.create` → exportCarnet (local download) → navigate home.
 * Drive upload + `sales.setCarnetUrl` lands in Slice 3.
 *
 * Handoff §4.6. Visual source: docs/previews/fotosintesis-v2/venta-kardex.html
 */
/**
 * @param embedded When true, the page renders as the workbench canvas: it drops
 *   its own TicketHeader + page width cap (the workbench owns the header/stepper)
 *   and fills its container. All capture + the real Kardex/certificate commit
 *   behaviour is unchanged — the workbench live-seeds it through the draft bus.
 */
export default function FotosintesisVentaPage({
  embedded = false,
}: { embedded?: boolean } = {}) {
  const foto = getFoto('light');
  const navigate = useNavigate();
  const { saleId } = useParams();
  const [searchParams] = useSearchParams();
  const {
    openSpotlight,
    registerSpotlightDefault,
    consumeDraftForm,
    draftNonce,
  } = useFotosintesisLayout();
  const { notify } = useNotification();
  const { user } = useGoogleAuth();
  // Legacy catalog thumbnails (Drive `products/` folder scan, keyed by item
  // number) — fallback when an inventory item carries no Fotosíntesis fotoUrl.
  const { thumbnails: batchThumbs } = useBatchThumbnails();

  // ─── Selection state ───────────────────────────────────────────────────
  // A sale can bundle several pieces. We hold the full product objects the
  // operator picked in the multi-select spotlight (id + name + price + thumb),
  // so the on-page list renders instantly without a second round-trip. A
  // deep-linked `?itemId=` seeds a stub that the first-item query enriches.
  const initialItemId = searchParams.get('itemId') ?? null;
  const [selectedItems, setSelectedItems] = useState<SpotlightProduct[]>(
    initialItemId ? [{ itemId: initialItemId, nombre: '' }] : [],
  );
  // Manual (non-inventory) line items added to this sale — kept out of the
  // inventory `itemIds` and stored on the sale itself. Their prices fold into
  // the subtotal/total alongside the picked inventory items.
  const [manualItems, setManualItems] = useState<ManualSaleItem[]>([]);
  // Discount: the operator can drive it by percentage OR by typing the final
  // (already-discounted) total — each derives the other. `discountDriver`
  // records which one they last touched so item changes re-derive the right
  // companion field. `null` = untouched → the price tracks the running subtotal.
  const [descuentoPct, setDescuentoPct] = useState<number | ''>('');
  const [discountDriver, setDiscountDriver] = useState<'pct' | 'total' | null>(
    null,
  );
  const [clientId, setClientId] = useState<Id<'clients'> | null>(null);
  // Sede must be picked explicitly every sale — no default. The saleId
  // preview only resolves once the operator has chosen Bogotá or Cali.
  const [sede, setSede] = useState<Sede | null>(null);
  const [compradorTipo, setCompradorTipo] =
    useState<CompradorTipo>('embajador');
  const [formaPago, setFormaPago] = useState<FormaPago>('contado');
  const [metodoContado, setMetodoContado] = useState<MetodoContado>('efectivo');
  const [precioAcordado, setPrecioAcordado] = useState<number | ''>('');
  const [privacyOn, setPrivacyOn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // ─── Slice 3 — Crédito fields ─────────────────────────────────────────
  const [creditoFechaVenc, setCreditoFechaVenc] = useState<string>('');
  const [creditoCuotas, setCreditoCuotas] = useState<number>(6);
  const [creditoTasa, setCreditoTasa] = useState<number | ''>('');

  // ─── Slice 3 — Esmereogénesis fields ──────────────────────────────────
  const [esmereoPlazo, setEsmereoPlazo] = useState<number | ''>('');
  const [esmereoCuotas, setEsmereoCuotas] = useState<number>(6);
  const [esmereoFechaVenc, setEsmereoFechaVenc] = useState<string>('');
  const [esmereoNotas, setEsmereoNotas] = useState<string>('');

  // ─── Slice 3 — Email opcional ─────────────────────────────────────────
  const [sendEmail, setSendEmail] = useState(false);
  const [adicionales, setAdicionales] = useState('');

  // ─── Fotosynthia v2 guided-capture seeding ────────────────────────────
  // A buyer resolved from a name hint is applied AFTER the compradorTipo reset
  // effect (below) via pendingClientId so it isn't wiped. guidedClientData
  // pre-fills the cliente-final creation form.
  const [pendingClientId, setPendingClientId] = useState<Id<'clients'> | null>(
    null,
  );
  const [guidedClientData, setGuidedClientData] = useState<
    ClienteInitialData | undefined
  >(undefined);

  const kardexRef = useRef<HTMLDivElement>(null);
  const certificadoRef = useRef<HTMLDivElement>(null);

  const itemIds = useMemo(
    () => selectedItems.map((s) => s.itemId),
    [selectedItems],
  );
  const inventoryCount = selectedItems.length;
  const manualCount = manualItems.length;
  const itemsCount = inventoryCount + manualCount;
  const firstItemId = selectedItems[0]?.itemId ?? null;

  // ─── Data ──────────────────────────────────────────────────────────────
  // The first item drives the Kardex carnet (photo + specs) and the
  // lot/provider lineage — mirroring VentaDetailPage, which also keys its
  // comprobante off the first item and lists the rest. The remaining items
  // render from their captured spotlight objects (no extra query).
  // La TRM del día, para los ítems anclados en dólares (ver utils/precioBase).
  const { trmRate } = useTRM();
  const item = useConvexQuery(
    convexApi.products.get,
    firstItemId ? { itemId: firstItemId } : 'skip',
  );

  // Enrich a deep-linked stub (`?itemId=`) once its product doc loads, so the
  // on-page list, the suggested-sum and the price autofill all have real data.
  // Guarded on the empty `nombre` the stub carries, so it runs exactly once and
  // never clobbers an item the operator picked through the spotlight.
  useEffect(() => {
    if (!item) return;
    setSelectedItems((prev) => {
      const first = prev[0];
      if (!first || first.itemId !== item.itemId || first.nombre) return prev;
      const enriched: SpotlightProduct = {
        itemId: item.itemId,
        nombre: item.nombre ?? 'Sin nombre',
        thumbnailUrl: resolveItemThumbnail(
          item.fotoUrl,
          item.itemId,
          batchThumbs,
        ),
        // Picker hint only — the authoritative per-item price still comes from
        // `priceByItemId` once `getManyByItemIds` resolves. Resuelve el ancla en
        // dólares: sembrar una venta con el peso provisional de un ítem anclado
        // es cobrar la TRM del día en que se calculó, no la de hoy.
        precioCop: precioBaseCOP(item, trmRate),
        loteId: item.loteId,
        estado: item.estado as string | undefined,
      };
      return [enriched, ...prev.slice(1)];
    });
  }, [item, batchThumbs]);
  // Reactive batch query for EVERY selected item — drives tier-aware per-item
  // pricing, the live "already VENDIDA" guard for all items (not just the lead),
  // and the multi-line Kardex preview.
  const manyItems = useConvexQuery(
    convexApi.products.getManyByItemIds,
    itemIds.length ? { itemIds } : 'skip',
  );

  // Buyer type — recorded on the sale as a label. After the 2026-07-21 price
  // refactor it no longer changes the price (every buyer pays precioFinalCOP).
  const tier: CompradorTier =
    compradorTipo === 'embajador' ? 'embajador' : 'final';

  // itemId → tier-resolved suggested price (COP), order-preserving from manyItems.
  const priceByItemId = useMemo(() => {
    const m = new Map<string, number | undefined>();
    // Con la TRM: éste es el precio AUTORITATIVO de la venta, el que queda
    // congelado en `lineItems`. Sin ella resolvía el COP provisional y el
    // escritorio cobraba distinto de lo que la vitrina mostró.
    for (const r of manyItems ?? [])
      m.set(r.itemId, pickTierPrice(r, tier, trmRate));
    return m;
  }, [manyItems, tier, trmRate]);

  // itemId → estado, so the row + confirm guard know which pieces are VENDIDA.
  const estadoByItemId = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of manyItems ?? []) m.set(r.itemId, r.estado);
    return m;
  }, [manyItems]);

  // Ordered Kardex line items — feeds EVERY selected item (with tier price) to
  // the multi-item preview. Before the batch query resolves we fall back to the
  // spotlight objects so the preview never goes blank between picks.
  const kardexItems = useMemo<KardexLineItem[]>(() => {
    const rows = manyItems ?? [];
    const inventory: KardexLineItem[] =
      rows.length === 0
        ? selectedItems.map((s) => ({
            itemId: s.itemId,
            nombre: s.nombre || undefined,
            thumbnailUrl: s.thumbnailUrl,
            precioCop: priceByItemId.get(s.itemId) ?? s.precioCop,
          }))
        : rows.map((r) => ({
            itemId: r.itemId,
            nombre: r.nombre ?? undefined,
            color: r.color ?? undefined,
            calidad: r.calidad ?? undefined,
            peso: r.peso ?? undefined,
            medidas: r.medidas ?? undefined,
            thumbnailUrl: resolveItemThumbnail(
              r.fotoUrl,
              r.itemId,
              batchThumbs,
            ),
            precioCop: priceByItemId.get(r.itemId),
          }));
    // Manual (non-inventory) lines render after the inventory items.
    const manual: KardexLineItem[] = manualItems.map((m) => ({
      itemId: '',
      nombre: m.nombre,
      peso: m.peso,
      descripcion: m.descripcion,
      precioCop: m.precioCop,
      isManual: true,
    }));
    return [...inventory, ...manual];
  }, [manyItems, selectedItems, priceByItemId, manualItems, batchThumbs]);

  const lot = useConvexQuery(
    convexApi.lots.getByLoteId,
    item?.loteId
      ? {
          loteId: item.loteId,
          sessionToken: readFreshSessionToken() ?? undefined,
        }
      : 'skip',
  );
  const provider = useConvexQuery(
    convexApi.providers.get,
    lot?.providerId
      ? {
          id: lot.providerId,
          sessionToken: readFreshSessionToken() ?? undefined,
        }
      : 'skip',
  );
  // `clients.list` doesn't accept `tipo` — filter client-side.
  const allClients = useConvexQuery(convexApi.clients.list, {
    sessionToken: readFreshSessionToken() ?? undefined,
  });
  const embajadores = useMemo(
    () => (allClients ?? []).filter((c) => c.tipo === 'embajador'),
    [allClients],
  );

  const peeked = useConvexQuery(
    convexApi.sales.peekNextSaleId,
    sede
      ? { sede, sessionToken: readFreshSessionToken() ?? undefined }
      : 'skip',
  );
  const peekedSaleId = peeked?.preview ?? (sede ? `V${sede}-NEW` : 'V—');

  const createSale = useAuthedConvexAction(convexApi.sales.create);
  const setCarnetUrl = useAuthedConvexAction(convexApi.sales.setCarnetUrl);
  const setCertificadoUrl = useAuthedConvexAction(
    convexApi.sales.setCertificadoUrl,
  );

  const selectedClient = useMemo<ClienteRow | null>(() => {
    if (!clientId || !allClients) return null;
    return (allClients.find((c) => c._id === clientId) ??
      null) as ClienteRow | null;
  }, [allClients, clientId]);

  // Auto-select first embajador only when we're in the embajador flow.
  // The cliente-final flow is creation-only — we wait for the operator.
  useEffect(() => {
    if (compradorTipo !== 'embajador') return;
    if (!clientId && embajadores.length > 0) {
      setClientId(embajadores[0]._id);
    }
  }, [clientId, embajadores, compradorTipo]);

  // Reset the selected client when the operator switches tabs so they don't
  // accidentally ship an embajador's id in a "cliente final" sale or vice versa.
  useEffect(() => {
    setClientId(null);
  }, [compradorTipo]);

  // ─── Consignment graduation prefill (2026-07-09) ──────────────────────
  // AsesorMovementPanel's "Vender esta pieza" deep-links here with
  // `?itemId=&precio=&recipient=` (itemId is already handled by the
  // `initialItemId` seed above). No new mutation backs this — `sales.create`
  // already accepts ASESOR/CONSIGNACION items (BR-6) — this just saves the
  // operator from re-typing the price and, when the recipient resolves to a
  // known client, the buyer. Runs once (ref-guarded) once the client
  // directory has loaded, same wait as the AI draft effect below.
  const graduationSeededRef = useRef(false);
  useEffect(() => {
    if (graduationSeededRef.current) return;
    if (allClients === undefined) return;
    const precioParam = searchParams.get('precio');
    const recipientParam = searchParams.get('recipient');
    if (!precioParam && !recipientParam) return;
    graduationSeededRef.current = true;
    if (precioParam) {
      const n = Number(precioParam);
      if (Number.isFinite(n) && n > 0) setPrecioAcordado(n);
    }
    if (recipientParam) {
      const hint = recipientParam.trim().toLowerCase();
      const match = allClients.find(
        (c) => c.nombre && c.nombre.trim().toLowerCase() === hint,
      );
      if (match) {
        if (match.tipo !== 'embajador') setCompradorTipo('final');
        setPendingClientId(match._id);
      }
    }
  }, [allClients, searchParams]);

  // Fotosynthia v2 guided seeding — pre-fill the sale (or the cliente-final
  // creation form) from an AI draft. Waits for the directory so a named buyer
  // resolves to an id. compradorTipo is seeded here; the resolved buyer is
  // applied via pendingClientId in the effect below (after the reset above).
  useEffect(() => {
    if (allClients === undefined) return;
    const venta = consumeDraftForm('venta');
    if (venta) {
      const d = venta as Record<string, unknown>;
      if (typeof d.sede === 'string') setSede(d.sede as Sede);
      if (typeof d.compradorTipo === 'string')
        setCompradorTipo(d.compradorTipo as CompradorTipo);
      if (typeof d.formaPago === 'string')
        setFormaPago(d.formaPago as FormaPago);
      if (typeof d.metodoContado === 'string')
        setMetodoContado(d.metodoContado as MetodoContado);
      if (typeof d.precioAcordado === 'number')
        setPrecioAcordado(d.precioAcordado);
      if (typeof d.adicionales === 'string') setAdicionales(d.adicionales);
      if (typeof d.itemId === 'string')
        setSelectedItems([{ itemId: d.itemId, nombre: '' }]);
      if (typeof d.creditoFechaVenc === 'string')
        setCreditoFechaVenc(d.creditoFechaVenc);
      if (typeof d.creditoCuotas === 'number')
        setCreditoCuotas(d.creditoCuotas);
      if (typeof d.creditoTasa === 'number') setCreditoTasa(d.creditoTasa);
      if (typeof d.esmereoFechaVenc === 'string')
        setEsmereoFechaVenc(d.esmereoFechaVenc);
      if (typeof d.esmereoCuotas === 'number')
        setEsmereoCuotas(d.esmereoCuotas);
      if (typeof d.esmereoPlazo === 'number') setEsmereoPlazo(d.esmereoPlazo);
      if (typeof d.esmereoNotas === 'string') setEsmereoNotas(d.esmereoNotas);
      const cfData = d.clienteFinalData;
      if (cfData && typeof cfData === 'object') {
        setCompradorTipo('final');
        setGuidedClientData(cfData as ClienteInitialData);
      } else {
        const hint = typeof d.clientId === 'string' ? d.clientId : undefined;
        if (hint) {
          const h = hint.toLowerCase();
          const match = allClients.find(
            (c) => c._id === hint || (c.nombre && c.nombre.toLowerCase() === h),
          );
          if (match) {
            if (match.tipo !== 'embajador') setCompradorTipo('final');
            setPendingClientId(match._id);
          }
        }
      }
      return;
    }
    const client = consumeDraftForm('client');
    if (client) {
      const d = client as Record<string, unknown>;
      setCompradorTipo('final');
      setGuidedClientData({
        nombre: typeof d.nombre === 'string' ? d.nombre : undefined,
        tipoDocumento:
          typeof d.tipoDocumento === 'string' ? d.tipoDocumento : undefined,
        documento: typeof d.documento === 'string' ? d.documento : undefined,
        direccion: typeof d.direccion === 'string' ? d.direccion : undefined,
        telefono: typeof d.telefono === 'string' ? d.telefono : undefined,
        email: typeof d.email === 'string' ? d.email : undefined,
      });
    }
  }, [draftNonce, consumeDraftForm, allClients]);

  // Apply a guided-resolved buyer AFTER the compradorTipo reset effect above,
  // so switching tipo (which clears clientId) doesn't wipe it.
  useEffect(() => {
    if (pendingClientId) {
      setClientId(pendingClientId);
      setPendingClientId(null);
    }
  }, [pendingClientId, compradorTipo]);

  // ─── Derived ───────────────────────────────────────────────────────────
  const precioCop = typeof precioAcordado === 'number' ? precioAcordado : 0;
  const totalCop = precioCop;
  const comisionCop = 0; // Slice 1 placeholder — commission % lives in Slice 3
  // Subtotal = the pre-discount base: Σ inventory tier prices + Σ manual items.
  // Authoritative + tier-aware: the per-item inventory price comes from the
  // Convex batch query resolved against the buyer tier, not the (possibly
  // stale) spotlight hint. Missing prices count as 0 so a partial selection
  // still sums. Manual line items add their own price on top.
  const subtotal = useMemo(
    () =>
      sumSuggested(
        selectedItems.map((s) => ({
          itemId: s.itemId,
          precioCop: priceByItemId.get(s.itemId),
        })),
      ) + sumManual(manualItems),
    [selectedItems, priceByItemId, manualItems],
  );
  // Discount amount (COP) = max(0, subtotal − agreed price). Flows to the
  // Kardex preview AND is persisted on the sale (descuentoCOP).
  const descuentoCop = discountAmount(subtotal, precioCop);

  // Keep the discount fields consistent with the running subtotal when items
  // change (add/remove). Direct edits to either field are handled synchronously
  // in their onChange handlers, so this effect only watches `subtotal`:
  //   • untouched      → no discount; the price tracks the subtotal exactly.
  //   • "%" driver      → recompute the price from the sticky percentage.
  //   • "total" driver  → recompute the displayed % from the sticky total.
  useEffect(() => {
    if (discountDriver === null) {
      setPrecioAcordado(subtotal > 0 ? subtotal : '');
      setDescuentoPct('');
    } else if (discountDriver === 'pct') {
      const pct = typeof descuentoPct === 'number' ? descuentoPct : 0;
      setPrecioAcordado(totalFromPct(subtotal, pct));
    } else {
      setDescuentoPct(
        subtotal > 0 && precioCop < subtotal
          ? pctFromTotal(subtotal, precioCop)
          : '',
      );
    }
    // Only re-derive on subtotal changes; field edits sync in their handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);
  // `fechaVenta` was previously memoized at mount which dated sales to the
  // moment the operator opened the form rather than when they confirmed.
  // Computed inside `onConfirm` now (see below). Kept here only as a
  // placeholder for the Kardex preview's date display.
  const fechaVenta = useMemo(() => new Date().toISOString(), []);

  const stepBuyer: 'done' | 'active' | 'pending' = clientId ? 'done' : 'active';
  const stepProduct: 'done' | 'active' | 'pending' = !clientId
    ? 'pending'
    : itemsCount > 0
      ? 'done'
      : 'active';
  const stepPay: 'done' | 'active' | 'pending' =
    clientId && itemsCount > 0
      ? typeof precioAcordado === 'number' && precioAcordado > 0
        ? 'done'
        : 'active'
      : 'pending';

  // ─── Spotlight wiring ──────────────────────────────────────────────────
  // The spotlight runs in multi-select mode: it returns the full chosen set,
  // which replaces our selection (so the picker both adds and removes). Dedupe
  // is belt-and-suspenders — the picker already keys by itemId.
  const handleConfirmItems = useCallback((products: SpotlightProduct[]) => {
    setSelectedItems(dedupeSelection(products));
  }, []);

  const onEditItems = useCallback(() => {
    openSpotlight({
      scope: 'Solo vendibles',
      multiSelect: true,
      selectedProducts: selectedItems,
      onConfirm: handleConfirmItems,
    });
  }, [openSpotlight, selectedItems, handleConfirmItems]);

  const onRemoveItem = useCallback((id: string) => {
    setSelectedItems((prev) => removeSelection(prev, id));
  }, []);

  // ─── Manual (non-inventory) line items ─────────────────────────────────
  const onAddManual = useCallback((manualItem: ManualSaleItem) => {
    setManualItems((prev) => [...prev, manualItem]);
  }, []);

  const onRemoveManual = useCallback((id: string) => {
    setManualItems((prev) => removeManual(prev, id));
  }, []);

  // ─── Discount handlers ─────────────────────────────────────────────────
  // Editing the % field drives the final price; editing the price field drives
  // the %. Each marks the `discountDriver` so item changes re-derive correctly.
  const onPctChange = useCallback(
    (next: number | '') => {
      setDiscountDriver('pct');
      // Clamp so the field can't show an out-of-range % (the math clamps too).
      const pct = typeof next === 'number' ? clampPct(next) : '';
      setDescuentoPct(pct);
      setPrecioAcordado(
        totalFromPct(subtotal, typeof pct === 'number' ? pct : 0),
      );
    },
    [subtotal],
  );

  const onPrecioChange = useCallback(
    (next: number | '') => {
      setDiscountDriver('total');
      setPrecioAcordado(next);
      const total = typeof next === 'number' ? next : 0;
      setDescuentoPct(
        subtotal > 0 && total < subtotal ? pctFromTotal(subtotal, total) : '',
      );
    },
    [subtotal],
  );

  // "Usar suma sugerida" → charge the full subtotal, no discount, and resume
  // tracking it as items change.
  const onUseSuggestedSum = useCallback(() => {
    setDiscountDriver(null);
    setDescuentoPct('');
    setPrecioAcordado(subtotal > 0 ? subtotal : '');
  }, [subtotal]);

  // Register multi-select as the spotlight default so the GLOBAL ⌘K hotkey and
  // the topbar "Buscar" button (which open the spotlight without options) edit
  // THIS sale's item set. We re-register whenever the selection changes so the
  // keyless entry points always seed from the current bundle.
  useEffect(() => {
    registerSpotlightDefault({
      scope: 'Solo vendibles',
      multiSelect: true,
      selectedProducts: selectedItems,
      onConfirm: handleConfirmItems,
    });
    return () => registerSpotlightDefault(null);
  }, [registerSpotlightDefault, selectedItems, handleConfirmItems]);

  // ─── Confirm flow ──────────────────────────────────────────────────────
  const creditoComplete =
    formaPago !== 'credito' ||
    (creditoFechaVenc.length > 0 && creditoCuotas > 0);
  // Mirror the server's BR-6 client-side: a VENDIDA item can't be sold again.
  // `item` is a reactive query, so if the piece is sold in another tab this
  // flips live and blocks the submit — instead of failing with a raw server
  // error only after the operator clicks Confirmar.
  // Live cross-tab guard for the lead item (its full doc is queried). The other
  // items are guarded server-side in `sales.create`, which re-checks every
  // itemId and throws a per-item error surfaced in the banner.
  const itemSold = item?.estado === 'VENDIDA';
  // Now that every item's estado is queried (manyItems), block the sale if ANY
  // selected piece is already VENDIDA — not just the lead item.
  const anySold = (manyItems ?? []).some((r) => r.estado === 'VENDIDA');

  /**
   * Ninguna LÍNEA puede ir en $0, no sólo el total.
   *
   * `precioCop > 0` mira la SUMA, y un carrito que mezcla una pieza con precio
   * con una sin precio suma > 0 y pasa: la pieza sin precio viaja gratis,
   * escondida detrás de la que sí lo tiene. Es exactamente el agujero que
   * `precioBaseEsValido` cierra del lado del checkout público —su propio
   * comentario lo explica— y que acá faltaba.
   *
   * Sólo se evalúa cuando `manyItems` ya resolvió: antes de eso el mapa está
   * vacío y todas las líneas parecerían sin precio.
   */
  const preciosResueltos = (manyItems ?? []).length > 0;
  const lineaSinPrecio = preciosResueltos
    ? selectedItems.find(
        (s) => !((priceByItemId.get(s.itemId) ?? 0) > 0),
      )
    : undefined;

  const canConfirm =
    !!sede &&
    itemsCount > 0 &&
    !!clientId &&
    precioCop > 0 &&
    !lineaSinPrecio &&
    creditoComplete &&
    !itemSold &&
    !anySold &&
    !submitting;

  const onDownloadPreview = useCallback(async () => {
    if (!kardexRef.current) return;
    try {
      await exportCarnet(kardexRef.current, `Kardex-${peekedSaleId}.pdf`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(`No pude generar el PDF: ${msg}`, 'error');
    }
  }, [peekedSaleId, notify]);

  const onConfirm = useCallback(async () => {
    if (!sede) {
      setErrorBanner('Falta elegir bóveda.');
      return;
    }
    if (itemsCount === 0 || !clientId || precioCop <= 0) {
      setErrorBanner('Falta completar comprador, ítems o precio.');
      return;
    }
    if (itemSold) {
      setErrorBanner('El primer ítem ya está vendido. Quitalo o elegí otro.');
      return;
    }
    if (anySold) {
      setErrorBanner(
        'Uno o más ítems ya están vendidos. Quitalos para continuar.',
      );
      return;
    }
    if (lineaSinPrecio) {
      // Nombra la pieza. Un botón deshabilitado sin motivo manda a la persona a
      // adivinar, y con un carrito de ocho piezas la adivinanza es cara.
      setErrorBanner(
        `El ítem ${lineaSinPrecio.itemId} no tiene precio: no se puede vender ` +
          `en $0. Ponele precio en el inventario y volvé, o quitalo del carrito.`,
      );
      return;
    }
    if (formaPago === 'credito' && !creditoFechaVenc) {
      setErrorBanner('Crédito requiere fecha de vencimiento.');
      return;
    }
    setErrorBanner(null);
    setSubmitting(true);
    logStage('confirm:begin', {
      compradorTipo,
      formaPago,
      hasEmail: Boolean(selectedClient?.email),
      sendEmail,
    });
    try {
      // `fechaVencimiento` / `numeroCuotas` flow into the server only for
      // credito (mandatory per BR-7) or esmereogénesis when the operator
      // filled them in (optional UX nicety).
      const confirmedAt = new Date().toISOString();
      const createArgs: Parameters<typeof createSale>[0] = {
        sede,
        itemIds,
        clientId,
        fechaVenta: confirmedAt,
        precioAcordadoCOP: precioCop,
        // Always persist a concrete number (incl. 0) so the Kardex never falls
        // back to a recomputed value and col F is always a reconcilable cell.
        descuentoCOP: descuentoCop,
        totalCOP: totalCop,
        comisionCOP: comisionCop || undefined,
        manualItems: manualItems.length
          ? toConvexManualItems(manualItems)
          : undefined,
        // Freeze the per-line price each item is sold at (from the same
        // tier-resolved map the subtotal uses) so the comprobante is a faithful
        // record, immune to later inventory re-pricing / buyer-tier flips.
        lineItems: itemIds.length
          ? buildSaleLineItems(itemIds, priceByItemId, tier)
          : undefined,
        formaPago,
        metodoContado: formaPago === 'contado' ? metodoContado : undefined,
        adicionales: adicionales.trim() || undefined,
      };
      if (formaPago === 'credito') {
        createArgs.fechaVencimiento = creditoFechaVenc;
        createArgs.numeroCuotas = creditoCuotas;
      } else if (formaPago === 'esmereogenesis') {
        if (esmereoCuotas > 0) createArgs.numeroCuotas = esmereoCuotas;
        if (esmereoFechaVenc) createArgs.fechaVencimiento = esmereoFechaVenc;
      }

      const createStage = beginStage('sales.create', {
        itemCount: itemsCount,
        formaPago,
      });
      let res: Awaited<ReturnType<typeof createSale>>;
      try {
        res = await createSale(createArgs);
        createStage.ok({ saleId: res.saleId });
      } catch (err) {
        createStage.fail(err);
        throw err;
      }

      // From here on, failures are non-blocking — the sale is recorded.
      // PDF + email steps surface as toasts so the operator can retry
      // without losing the sale.
      const slug = slugifyBuyerName(selectedClient?.nombre ?? 'cliente');
      // File the carnet under the month the sale was recorded.
      const subPath = ventasSubPath(new Date(confirmedAt));

      const uploadPdf = async (
        blob: Blob,
        filename: string,
      ): Promise<string> => {
        const fd = new FormData();
        fd.append('subPath', subPath);
        fd.append(
          'file',
          new File([blob], filename, { type: 'application/pdf' }),
        );
        const r = await fetch('/api/media-upload', {
          method: 'POST',
          body: fd,
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as {
          success?: boolean;
          urls?: string[];
          error?: string;
        };
        if (!data.success || !data.urls?.[0]) {
          throw new Error(data.error ?? 'Drive devolvió respuesta sin URL');
        }
        return data.urls[0];
      };

      // ── Carnet ────────────────────────────────────────────────────────
      // Generate the PDF blob from the DOM FIRST, while the page is still
      // mounted. The retry below reuses this captured blob (not kardexRef) so
      // it survives the navigate() at the end of this flow — previously the
      // retry re-read kardexRef.current, which is null once we've navigated
      // away, making "Reintentar" a silent no-op.
      let carnetUrl: string | null = null;
      const carnetFilename = `${res.saleId}-${slug}.pdf`;
      const carnetStage = beginStage('carnet', { saleId: res.saleId, subPath });
      let carnetBlob: Blob | null = null;
      try {
        if (!kardexRef.current) throw new Error('Kardex DOM no listo');
        carnetBlob = await exportCarnet(kardexRef.current, carnetFilename, {
          download: false,
        });
      } catch (err) {
        // DOM→PDF generation failed; it can't be retried after navigation, so
        // surface a clear (actionless) warning rather than a dead retry button.
        carnetStage.fail(err);
        const msg = err instanceof Error ? err.message : String(err);
        notify(
          `Venta guardada, pero no se generó el carnet PDF: ${msg}`,
          'warning',
        );
      }
      if (carnetBlob) {
        const blobForRetry = carnetBlob;
        try {
          carnetUrl = await uploadPdf(blobForRetry, carnetFilename);
          await setCarnetUrl({ id: res.id, carnetUrl });
          carnetStage.ok({ bytes: blobForRetry.size });
        } catch (err) {
          carnetStage.fail(err);
          const msg = err instanceof Error ? err.message : String(err);
          notify(`Venta guardada, PDF en cola: ${msg}`, 'warning', {
            action: {
              label: 'Reintentar',
              onClick: () => {
                // Reuses the already-generated blob — works even after we've
                // navigated away from the venta page.
                void (async () => {
                  try {
                    const url = await uploadPdf(blobForRetry, carnetFilename);
                    await setCarnetUrl({ id: res.id, carnetUrl: url });
                    notify('Kardex subido a Drive', 'success');
                  } catch (e) {
                    notify(
                      `Reintento falló: ${e instanceof Error ? e.message : String(e)}`,
                      'error',
                    );
                  }
                })();
              },
            },
          });
        }
      }

      // ── Certificado (gated by Q-6 legal approval) ─────────────────────
      let certificadoUrl: string | null = null;
      if (isCertificadoApproved()) {
        const certStage = beginStage('certificado', { saleId: res.saleId });
        try {
          if (!certificadoRef.current)
            throw new Error('Certificado DOM no listo');
          const certBlob = await exportCertificado(
            certificadoRef.current,
            `${res.saleId}-${slug}-certificado.pdf`,
            { download: false },
          );
          certificadoUrl = await uploadPdf(
            certBlob,
            `${res.saleId}-${slug}-certificado.pdf`,
          );
          await setCertificadoUrl({ id: res.id, certificadoUrl });
          certStage.ok({ bytes: certBlob.size });
        } catch (err) {
          certStage.fail(err);
          const msg = err instanceof Error ? err.message : String(err);
          notify(`Certificado falló: ${msg}`, 'warning');
        }
      } else {
        logStage('certificado:skipped', { reason: 'VITE_CERT_LEGAL_APPROVED' });
        // Toast at most once per browser session — Maritza will see this
        // every sale otherwise until Q-6 ships, which becomes noise fast.
        try {
          const KEY = 'tm.fotosintesis.certPendingNotified';
          if (typeof window !== 'undefined' && !sessionStorage.getItem(KEY)) {
            sessionStorage.setItem(KEY, '1');
            notify(
              'Certificado pendiente · activar VITE_CERT_LEGAL_APPROVED tras aprobación legal (Q-6)',
              'info',
            );
          }
        } catch {
          // sessionStorage can throw in private mode; fall back to toast.
          notify(
            'Certificado pendiente · activar VITE_CERT_LEGAL_APPROVED tras aprobación legal (Q-6)',
            'info',
          );
        }
      }

      // ── Email opcional ────────────────────────────────────────────────
      if (sendEmail && selectedClient?.email && carnetUrl) {
        const emailStage = beginStage('email', {
          saleId: res.saleId,
          to: selectedClient.email,
        });
        try {
          const r = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'ventaKardex',
              data: {
                saleId: res.saleId,
                buyerName: selectedClient.nombre,
                carnetUrl,
                certificadoUrl: certificadoUrl ?? undefined,
              },
              to: selectedClient.email,
            }),
          });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          emailStage.ok();
        } catch (err) {
          emailStage.fail(err);
          const msg = err instanceof Error ? err.message : String(err);
          notify(`Email no se pudo enviar: ${msg}`, 'warning');
        }
      }

      logStage('confirm:success', {
        saleId: res.saleId,
        carnetUploaded: Boolean(carnetUrl),
        certificadoUploaded: Boolean(certificadoUrl),
        emailRequested: sendEmail,
      });
      notify(`Venta ${res.saleId} confirmada`, 'success');
      navigate('/admin/fotosintesis');
    } catch (err) {
      logFailure('confirm', err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorBanner(msg);
    } finally {
      setSubmitting(false);
    }
  }, [
    sede,
    itemIds,
    itemsCount,
    clientId,
    itemSold,
    anySold,
    lineaSinPrecio,
    precioCop,
    totalCop,
    comisionCop,
    descuentoCop,
    manualItems,
    compradorTipo,
    formaPago,
    metodoContado,
    fechaVenta,
    creditoFechaVenc,
    creditoCuotas,
    esmereoCuotas,
    esmereoFechaVenc,
    adicionales,
    selectedClient,
    sendEmail,
    createSale,
    setCarnetUrl,
    setCertificadoUrl,
    navigate,
    notify,
  ]);

  // ─── Read-only / sale-saved view ───────────────────────────────────────
  // For Slice 1, hitting `/sales/:saleId` just renders a confirmation summary.
  const isReadView = !!saleId && saleId !== 'new';

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        background: foto.surfaces.canvas,
        color: foto.ink.primary,
        minHeight: embedded ? '100%' : fotoPageMinHeight,
      }}
    >
      {!embedded && (
        <TicketHeader
          id={isReadView ? saleId! : peekedSaleId}
          kind="sale"
          meta={[
            {
              label: 'Fecha',
              value: new Date().toLocaleDateString('es-CO', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }),
            },
            {
              label: 'Operador',
              value: user?.givenName || user?.name?.split(' ')[0] || 'Operador',
            },
          ]}
          rightSlot={
            <StepPills
              steps={[
                { label: 'Comprador', state: stepBuyer },
                { label: 'Producto', state: stepProduct },
                { label: 'Pago + Kardex', state: stepPay },
              ]}
            />
          }
        />
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            lg: 'minmax(0, 1fr) minmax(380px, 460px)',
          },
          gap: 0,
          maxWidth: embedded ? 'none' : 1320,
          margin: '0 auto',
          // Scrollport minus FotoTopbar (56) minus TicketHeader (~110).
          minHeight: embedded
            ? 0
            : `calc(var(--app-main-height, 100dvh) - ${FOTO_TOPBAR_HEIGHT}px - 110px)`,
        }}
      >
        {/* ───── LEFT pane (form) ───── */}
        <Box
          sx={{
            padding: { xs: '24px 16px 60px', md: '24px 28px 60px' },
            display: 'flex',
            flexDirection: 'column',
            gap: '28px',
          }}
        >
          {errorBanner ? (
            <Box
              role="alert"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                background: alpha(foto.status.sold, 0.08),
                border: `1px solid ${foto.status.sold}`,
                borderRadius: '9px',
                color: foto.status.sold,
                fontSize: 12.5,
              }}
            >
              <AlertCircle size={16} strokeWidth={1.7} aria-hidden />
              {errorBanner}
            </Box>
          ) : null}

          {/* 0. Bóveda */}
          <Section title="Bóveda" foto={foto}>
            <SegmentedControl<Sede>
              ariaLabel="Bóveda de la venta"
              allowOther
              otherLabel="Otra…"
              otherPlaceholder="Código de bóveda (ej. MED)…"
              sanitizeOther={sanitizeSedeCode}
              value={sede ?? ('' as Sede)}
              onChange={setSede}
              options={BOVEDAS.map((b) => ({
                value: b.code,
                label: b.label,
              }))}
            />
          </Section>

          {/* 1. Comprador */}
          <Section title="Comprador" foto={foto}>
            <SegmentedControl<CompradorTipo>
              ariaLabel="Tipo de comprador"
              allowOther
              otherLabel="Otro…"
              otherPlaceholder="Escribir tipo de comprador…"
              value={compradorTipo}
              onChange={setCompradorTipo}
              options={[
                { value: 'embajador', label: 'Embajador' },
                { value: 'final', label: 'Cliente final' },
              ]}
            />

            <Box sx={{ marginTop: '16px' }}>
              {/* Embajador uses the asesor picker; "final" and any custom write-in
                  buyer type are captured through the cliente-final form (which
                  persists the custom tipo onto the client). */}
              {compradorTipo !== 'embajador' ? (
                <ClienteFinalForm
                  tipo={compradorTipo}
                  allClients={(allClients ?? []) as ClienteRow[]}
                  selectedClient={
                    selectedClient && selectedClient.tipo !== 'embajador'
                      ? selectedClient
                      : null
                  }
                  onCreated={(id) => setClientId(id)}
                  onChange={() => setClientId(null)}
                  initialData={guidedClientData}
                />
              ) : (
                <>
                  <FieldLabel>Embajador asignado</FieldLabel>
                  <Box
                    sx={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      background: foto.surfaces.inset,
                      border: `1px solid ${foto.surfaces.rule}`,
                      borderRadius: '9px',
                      padding: '10px 14px',
                      gap: '12px',
                      '&:focus-within': {
                        borderColor: foto.accent.primary,
                        boxShadow: `0 0 0 3px ${foto.accent.glow}`,
                      },
                      transition:
                        'border-color 120ms ease, box-shadow 120ms ease',
                    }}
                  >
                    {/* Avatar */}
                    <Box
                      aria-hidden
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${emeraldCore.dark}, ${foto.accent.deep})`,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: fontFamilies.serif,
                        fontSize: 18,
                        fontWeight: 500,
                        flexShrink: 0,
                      }}
                    >
                      {(selectedClient?.nombre ?? '?')
                        .slice(0, 1)
                        .toUpperCase()}
                    </Box>

                    {/* Name + meta + native select overlay */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box
                        sx={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: foto.ink.primary,
                          letterSpacing: '-0.012em',
                        }}
                      >
                        {selectedClient?.nombre ??
                          '— Sin embajador seleccionado —'}
                      </Box>
                      <Box
                        sx={{
                          fontSize: 11.5,
                          color: foto.ink.tertiary,
                          marginTop: '2px',
                        }}
                      >
                        {selectedClient?.email ??
                          selectedClient?.telefono ??
                          'Selecciona un embajador'}
                      </Box>
                    </Box>

                    <ChevronDown
                      size={16}
                      color={foto.ink.tertiary}
                      aria-hidden
                    />

                    {/* Native <select> overlaid for accessibility + keyboard */}
                    <Box
                      component="select"
                      aria-label="Embajador asignado"
                      value={clientId ?? ''}
                      onChange={(e) => {
                        const next = (e.target as HTMLSelectElement).value;
                        // Convex Id<"clients"> is a branded string at the type level
                        // but a plain string at runtime; the value came from a
                        // server-issued `_id` we rendered as an <option>, so it's
                        // safe to cast it back.
                        setClientId(next ? (next as Id<'clients'>) : null);
                      }}
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0,
                        cursor: 'pointer',
                        appearance: 'none',
                      }}
                    >
                      <option value="">— Selecciona un embajador —</option>
                      {embajadores.map((c) => (
                        <option key={c._id as string} value={c._id as string}>
                          {c.nombre}
                        </option>
                      ))}
                    </Box>
                  </Box>
                </>
              )}
            </Box>
          </Section>

          {/* 2. Productos */}
          <Section title="Ítems a vender" foto={foto}>
            {itemsCount > 0 ? (
              <Box
                sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                {itemSold ? (
                  <Box
                    role="alert"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      borderRadius: '9px',
                      background: alpha(foto.status.sold, 0.08),
                      border: `1px solid ${foto.status.sold}`,
                      color: foto.status.sold,
                      fontSize: 12.5,
                      fontWeight: 600,
                    }}
                  >
                    <AlertCircle size={15} aria-hidden />
                    El primer ítem ya está vendido — quitalo o elegí otro para
                    continuar.
                  </Box>
                ) : null}

                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  {selectedItems.map((p) => (
                    <SelectedItemRow
                      key={p.itemId}
                      product={p}
                      price={priceByItemId.get(p.itemId)}
                      sold={estadoByItemId.get(p.itemId) === 'VENDIDA'}
                      onRemove={onRemoveItem}
                      foto={foto}
                    />
                  ))}
                  {manualItems.map((m) => (
                    <ManualItemRow
                      key={m.id}
                      item={m}
                      onRemove={onRemoveManual}
                      foto={foto}
                    />
                  ))}
                </Box>

                {/* Add / remove launcher + selection summary */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                    marginTop: '2px',
                  }}
                >
                  <Box
                    component="button"
                    type="button"
                    onClick={onEditItems}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '9px 14px',
                      borderRadius: '9px',
                      border: `1px dashed ${foto.surfaces.edgeStrong}`,
                      background: foto.surfaces.panel,
                      color: foto.ink.secondary,
                      fontSize: 12.5,
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'background 120ms ease',
                      '&:hover': { background: foto.surfaces.inset },
                      '&:focus-visible': {
                        outline: 'none',
                        boxShadow: `0 0 0 3px ${foto.accent.glow}`,
                      },
                    }}
                  >
                    <Plus size={15} aria-hidden />
                    Agregar o quitar ítems
                    <KbdKey size="sm">⌘</KbdKey>
                    <KbdKey size="sm">K</KbdKey>
                  </Box>
                  <Box
                    sx={{
                      fontSize: 11.5,
                      color: foto.ink.tertiary,
                      letterSpacing: '0.01em',
                    }}
                  >
                    {itemsCount} ítem{itemsCount === 1 ? '' : 's'}
                    {subtotal > 0
                      ? ` · suma sugerida ${formatCop(subtotal)}`
                      : ''}
                  </Box>
                </Box>
              </Box>
            ) : (
              <Box
                component="button"
                type="button"
                onClick={onEditItems}
                sx={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '28px 16px',
                  borderRadius: '11px',
                  border: `1px dashed ${foto.surfaces.edgeStrong}`,
                  background: foto.surfaces.panel,
                  color: foto.ink.secondary,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  transition: 'background 120ms ease',
                  '&:hover': { background: foto.surfaces.inset },
                  '&:focus-visible': {
                    outline: 'none',
                    boxShadow: `0 0 0 3px ${foto.accent.glow}`,
                  },
                }}
              >
                <Search size={16} aria-hidden />
                Buscá ítems (podés elegir varios)
                <KbdKey size="sm">⌘</KbdKey>
                <KbdKey size="sm">K</KbdKey>
              </Box>
            )}

            {/* Manual line item — for things not (yet) in inventory. */}
            <Box sx={{ marginTop: '12px' }}>
              <ManualItemForm onAdd={onAddManual} />
            </Box>
          </Section>

          {/* 3. Pago */}
          <Section title="Forma de pago" foto={foto}>
            <SegmentedControl<FormaPago>
              ariaLabel="Forma de pago"
              allowOther
              otherLabel="Otra…"
              otherPlaceholder="Escribir forma de pago…"
              value={formaPago}
              onChange={setFormaPago}
              options={[
                { value: 'contado', label: 'Contado' },
                { value: 'credito', label: 'Crédito' },
                { value: 'canje', label: 'Canje / Trueque' },
                { value: 'esmereogenesis', label: 'Esmereogénesis' },
                { value: 'bajo_pedido', label: 'Bajo pedido' },
                { value: 'consignacion', label: 'Consignación' },
              ]}
            />

            {formaPago === 'contado' ? (
              <Box sx={{ marginTop: '14px' }}>
                <FieldLabel>Método de pago</FieldLabel>
                <SegmentedControl<MetodoContado>
                  ariaLabel="Método de pago contado"
                  block
                  allowOther
                  otherLabel="Otro…"
                  otherPlaceholder="Escribir método de pago…"
                  value={metodoContado}
                  onChange={setMetodoContado}
                  options={[
                    { value: 'efectivo', label: 'Efectivo' },
                    { value: 'transferencia', label: 'Transferencia' },
                    { value: 'crypto', label: 'Crypto' },
                  ]}
                />
              </Box>
            ) : null}

            {formaPago === 'credito' ? (
              <CreditoFields
                fechaVencimiento={creditoFechaVenc}
                setFechaVencimiento={setCreditoFechaVenc}
                numeroCuotas={creditoCuotas}
                setNumeroCuotas={setCreditoCuotas}
                tasaInteres={creditoTasa}
                setTasaInteres={setCreditoTasa}
                totalCop={precioCop}
              />
            ) : null}

            {formaPago === 'esmereogenesis' ? (
              <EsmereogenesisFields
                plazoMeses={esmereoPlazo}
                setPlazoMeses={setEsmereoPlazo}
                numeroCuotas={esmereoCuotas}
                setNumeroCuotas={setEsmereoCuotas}
                observaciones={esmereoNotas}
                setObservaciones={setEsmereoNotas}
                fechaVencimiento={esmereoFechaVenc}
                setFechaVencimiento={setEsmereoFechaVenc}
              />
            ) : null}

            <Box sx={{ marginTop: '16px' }}>
              <FieldLabel optional="notas de cierre">Adicionales</FieldLabel>
              <Box
                component="textarea"
                value={adicionales}
                {...spanishText}
                onChange={(e) =>
                  setAdicionales((e.target as HTMLTextAreaElement).value)
                }
                rows={2}
                placeholder="Condiciones especiales, trueque, entregables…"
                sx={{
                  width: '100%',
                  background: foto.surfaces.inset,
                  border: `1px solid ${foto.surfaces.rule}`,
                  borderRadius: '9px',
                  padding: '11px 14px',
                  fontSize: 13,
                  color: foto.ink.primary,
                  fontFamily: fontFamilies.system,
                  resize: 'vertical',
                }}
              />
            </Box>

            <Box sx={{ marginTop: '18px' }}>
              <FieldLabel>Precio acordado (COP)</FieldLabel>
              <NumberInputWithCalc
                value={precioAcordado}
                onChange={onPrecioChange}
                format="currency"
                placeholder="Ingresá el precio final"
                step={1000}
                min={0}
                ariaLabel="Precio acordado en pesos colombianos"
                calcVariant="accent"
                calcSuffix={`= ${formatCop(precioCop)}`}
              />
              {subtotal > 0 && precioCop !== subtotal ? (
                <Box
                  component="button"
                  type="button"
                  onClick={onUseSuggestedSum}
                  sx={{
                    marginTop: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 10px',
                    borderRadius: '999px',
                    border: `1px solid ${foto.accent.primary}`,
                    background: foto.accent.soft,
                    color: foto.accent.deep,
                    fontSize: 11.5,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'background 120ms ease',
                    '&:hover': { background: alpha(foto.accent.primary, 0.12) },
                  }}
                >
                  Usar suma sugerida ({formatCop(subtotal)})
                </Box>
              ) : null}
            </Box>

            {/* Discount — type a % and the final price computes; type the final
                price above and this % computes. Both stay in sync. Only shown
                once there's a subtotal to discount against. */}
            {subtotal > 0 ? (
              <Box sx={{ marginTop: '16px' }}>
                <FieldLabel optional="o escribí el precio final arriba">
                  Descuento (%)
                </FieldLabel>
                <NumberInputWithCalc
                  value={descuentoPct}
                  onChange={onPctChange}
                  format="decimal"
                  placeholder="0"
                  step={1}
                  min={0}
                  max={100}
                  ariaLabel="Descuento en porcentaje"
                  calcVariant={descuentoCop > 0 ? 'accent' : 'neutral'}
                  calcSuffix={
                    descuentoCop > 0
                      ? `− ${formatCop(descuentoCop)}`
                      : 'sin descuento'
                  }
                />
              </Box>
            ) : null}

            {/* Totals card */}
            <Box
              sx={{
                marginTop: '16px',
                padding: '14px 16px',
                borderRadius: '11px',
                border: `1px solid ${foto.surfaces.rule}`,
                background: foto.surfaces.panel,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <TotalsRow
                label={`Ítems (${itemsCount})`}
                value={subtotal > 0 ? formatCop(subtotal) : `${itemsCount}`}
                foto={foto}
              />
              {descuentoCop > 0 ? (
                <TotalsRow
                  label={
                    typeof descuentoPct === 'number' && descuentoPct > 0
                      ? `Descuento (${descuentoPct}%)`
                      : 'Descuento'
                  }
                  value={`− ${formatCop(descuentoCop)}`}
                  foto={foto}
                  tone="gold"
                />
              ) : null}
              <TotalsRow
                label="Precio acordado"
                value={formatCop(precioCop)}
                foto={foto}
              />
              <TotalsRow
                label="Comisión embajador"
                value={comisionCop > 0 ? formatCop(comisionCop) : '—'}
                foto={foto}
                tone="gold"
              />
              <Box
                sx={{
                  height: 1,
                  background: foto.surfaces.edge,
                  margin: '2px 0',
                }}
              />
              <TotalsRow
                label="Total"
                value={formatCop(totalCop)}
                foto={foto}
                tone="accent"
                strong
              />
            </Box>
          </Section>

          {/* 4. WillHappen */}
          <Section title="Al confirmar la venta" foto={foto}>
            <Box
              sx={{
                padding: '16px 18px',
                borderRadius: '11px',
                border: `1px solid ${foto.accent.primary}`,
                background: foto.accent.soft,
                color: foto.ink.secondary,
                fontSize: 12.5,
                lineHeight: 1.55,
              }}
            >
              <Box
                sx={{
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: foto.accent.deep,
                  marginBottom: '10px',
                }}
              >
                Las 5 acciones encadenadas
              </Box>
              <Box component="ol" sx={{ margin: 0, paddingLeft: '18px' }}>
                <li>
                  {inventoryCount === 0
                    ? 'No hay ítems de inventario que marcar (venta de ítems manuales).'
                    : inventoryCount === 1
                      ? 'El ítem pasa a estado VENDIDA en Convex y en Sheets.'
                      : `Los ${inventoryCount} ítems de inventario pasan a estado VENDIDA en Convex y en Sheets.`}
                </li>
                <li>
                  Se genera la venta {peekedSaleId} con esta forma de pago.
                </li>
                <li>
                  El Kardex se sube a Drive en{' '}
                  <code>
                    ventas/
                    {new Date().getFullYear()}/
                    {String(new Date().getMonth() + 1).padStart(2, '0')}
                  </code>
                  .
                </li>
                <li>
                  {isCertificadoApproved()
                    ? 'El Certificado de Origen también se sube a Drive.'
                    : 'El Certificado de Origen queda pendiente hasta que Maritza apruebe Q-6.'}
                </li>
                <li>
                  {sendEmail && selectedClient?.email
                    ? `Se le envía un email a ${selectedClient.email} con los PDFs.`
                    : 'Se actualiza el dashboard del embajador.'}
                </li>
              </Box>
            </Box>
          </Section>

          {/* 5. Privacy */}
          <Section title="Privacidad del Kardex" foto={foto}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                padding: '14px 16px',
                borderRadius: '11px',
                border: `1px solid ${foto.surfaces.rule}`,
                background: foto.surfaces.panel,
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box
                  sx={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: foto.ink.primary,
                    marginBottom: '2px',
                  }}
                >
                  Ocultar identificación en versión pública
                </Box>
                <Box sx={{ fontSize: 11.5, color: foto.ink.tertiary }}>
                  Slice 1: el toggle solo cambia el preview. Slice 3 generará
                  dos PDFs (privado + público).
                </Box>
              </Box>
              <Switch
                checked={privacyOn}
                onChange={(e) => setPrivacyOn(e.target.checked)}
                inputProps={{
                  'aria-label': 'Ocultar identificación en versión pública',
                }}
              />
            </Box>
          </Section>

          {/* 6. Email opcional */}
          <Section title="Enviar al comprador" foto={foto}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                padding: '14px 16px',
                borderRadius: '11px',
                border: `1px solid ${foto.surfaces.rule}`,
                background: foto.surfaces.panel,
                opacity: selectedClient?.email ? 1 : 0.55,
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box
                  sx={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: foto.ink.primary,
                    marginBottom: '2px',
                  }}
                >
                  Enviar Kardex por email
                </Box>
                <Box sx={{ fontSize: 11.5, color: foto.ink.tertiary }}>
                  {selectedClient?.email
                    ? `Se enviarán los enlaces de Drive a ${selectedClient.email}.`
                    : 'Agregá un email al cliente para habilitar el envío.'}
                </Box>
              </Box>
              <Switch
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                disabled={!selectedClient?.email}
                inputProps={{ 'aria-label': 'Enviar Kardex por email' }}
              />
            </Box>
          </Section>

          {/* Confirm */}
          <Box
            sx={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              paddingTop: '8px',
              borderTop: `1px solid ${foto.surfaces.edge}`,
            }}
          >
            <Box
              component="button"
              type="button"
              onClick={() => navigate('/admin/fotosintesis')}
              sx={{
                padding: '10px 18px',
                borderRadius: '9px',
                border: `1px solid ${foto.surfaces.rule}`,
                background: foto.surfaces.canvas,
                color: foto.ink.secondary,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Cancelar
            </Box>
            <Box
              component="button"
              type="button"
              disabled={!canConfirm}
              aria-busy={submitting}
              onClick={onConfirm}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '9px',
                border: 'none',
                background: canConfirm
                  ? `linear-gradient(180deg, ${foto.accent.primary} 0%, ${foto.accent.deep} 100%)`
                  : foto.surfaces.inset,
                color: canConfirm ? foto.ink.inverse : foto.ink.mute,
                fontSize: 13.5,
                fontWeight: 600,
                letterSpacing: '-0.005em',
                cursor: canConfirm ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                boxShadow: canConfirm
                  ? `0 1px 2px rgba(0,0,0,0.06), 0 4px 12px ${alpha(foto.accent.primary, 0.18)}`
                  : 'none',
                transition:
                  'background 120ms ease, transform 120ms ease, box-shadow 120ms ease',
                '&:hover:not(:disabled)': { transform: 'translateY(-1px)' },
              }}
            >
              {submitting ? (
                <>
                  <Box
                    component="span"
                    sx={{ position: 'absolute', left: -9999 }}
                  >
                    Generando Kardex, espera unos segundos
                  </Box>
                  Confirmando…
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} strokeWidth={1.8} aria-hidden />
                  Confirmar venta
                  <ArrowRight size={14} strokeWidth={1.8} aria-hidden />
                </>
              )}
            </Box>
          </Box>
        </Box>

        {/* ───── RIGHT pane (Kardex preview) ───── */}
        <Box
          sx={{
            background: FOTO_PREVIEW_FELT,
            padding: '28px 24px',
            // Spread last: its lg paddingBottom (FotoTabBar clearance) must
            // beat the padding shorthand above.
            ...fotoPaneSx,
          }}
        >
          <Box
            sx={{
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.55)',
              marginBottom: '12px',
            }}
          >
            Vista previa del Kardex
          </Box>

          <Box ref={kardexRef}>
            <KardexPreview
              items={kardexItems}
              lot={
                lot
                  ? {
                      loteId: lot.loteId,
                      fechaRecepcion: lot.fechaRecepcion,
                    }
                  : null
              }
              provider={
                provider
                  ? { nombreORazonSocial: provider.nombreORazonSocial }
                  : null
              }
              buyer={
                selectedClient
                  ? {
                      nombre: selectedClient.nombre,
                      nit: selectedClient.nit ?? undefined,
                      cedula: selectedClient.cedula ?? undefined,
                      email: selectedClient.email ?? undefined,
                      tipo: selectedClient.tipo,
                    }
                  : null
              }
              sale={{
                id: peekedSaleId,
                precioCop: precioCop,
                formaPago,
                metodoContado:
                  formaPago === 'contado' ? metodoContado : undefined,
              }}
              privacyOn={privacyOn}
              subtotalCop={subtotal}
              descuentoCop={descuentoCop}
            />
          </Box>

          {/* Certificado preview — mounted in the DOM so html2canvas can
              capture it during the confirm flow. Hidden visually (off-screen
              positioning) until Q-6 legal copy lands. Once approved, we can
              promote it to a visible tab next to the Kardex. */}
          <Box
            ref={certificadoRef}
            aria-hidden
            sx={{
              position: 'absolute',
              left: '-99999px',
              top: 'auto',
              width: 612 - 96, // matches Kardex paper width for consistent capture
              pointerEvents: 'none',
            }}
          >
            <CertificadoPreview
              item={
                item
                  ? {
                      itemId: item.itemId,
                      nombre: item.nombre ?? undefined,
                      color: item.color ?? undefined,
                      calidad: item.calidad ?? undefined,
                      peso: item.peso ?? undefined,
                      medidas: item.medidas ?? undefined,
                    }
                  : null
              }
              lot={
                lot
                  ? { loteId: lot.loteId, fechaRecepcion: lot.fechaRecepcion }
                  : null
              }
              provider={
                provider
                  ? { nombreORazonSocial: provider.nombreORazonSocial }
                  : null
              }
              buyer={
                selectedClient
                  ? {
                      nombre: selectedClient.nombre,
                      nit: selectedClient.nit ?? undefined,
                      cedula: selectedClient.cedula ?? undefined,
                      email: selectedClient.email ?? undefined,
                      tipo: selectedClient.tipo,
                    }
                  : null
              }
              sale={{
                id: peekedSaleId,
                precioCop,
                formaPago,
                metodoContado:
                  formaPago === 'contado' ? metodoContado : undefined,
              }}
            />
          </Box>

          <Box
            component="button"
            type="button"
            onClick={onDownloadPreview}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '16px',
              padding: '9px 14px',
              borderRadius: '9px',
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.92)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 120ms ease',
              '&:hover': { background: 'rgba(255,255,255,0.12)' },
            }}
          >
            <Download size={14} aria-hidden />
            Descargar Kardex (vista previa)
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Small local helpers ─────────────────────────────────────────────────

interface SectionProps {
  title: string;
  children: React.ReactNode;
  foto: ReturnType<typeof getFoto>;
}

function Section({ title, children, foto }: SectionProps) {
  return (
    <Box>
      <Box
        sx={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: foto.ink.tertiary,
          marginBottom: '10px',
        }}
      >
        {title}
      </Box>
      {children}
    </Box>
  );
}

interface SelectedItemRowProps {
  product: SpotlightProduct;
  /** Tier-resolved suggested price (COP) for THIS item. Falls back to the
   *  spotlight hint when the batch query hasn't resolved it yet. */
  price?: number;
  /** Live "already VENDIDA" flag, now known for every item via the batch query. */
  sold: boolean;
  onRemove: (itemId: string) => void;
  foto: ReturnType<typeof getFoto>;
}

/**
 * One compact row in the venta's item list: thumbnail, name + id + lote,
 * suggested price, and a remove button. Renders from the product object the
 * operator picked in the spotlight, so it shows instantly with no extra query.
 */
function SelectedItemRow({
  product,
  price,
  sold,
  onRemove,
  foto,
}: SelectedItemRowProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '48px minmax(0, 1fr) auto auto',
        gap: '12px',
        alignItems: 'center',
        padding: '10px 12px',
        borderRadius: '10px',
        border: `1px solid ${sold ? foto.status.sold : foto.surfaces.rule}`,
        background: foto.surfaces.panel,
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          aspectRatio: '1 / 1',
          borderRadius: '7px',
          background: foto.surfaces.inset,
          border: `1px solid ${foto.surfaces.edge}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: foto.ink.mute,
          fontFamily: fontFamilies.mono,
          fontSize: 10,
          overflow: 'hidden',
        }}
        aria-hidden
      >
        {product.thumbnailUrl ? (
          <Box
            component="img"
            src={product.thumbnailUrl}
            alt=""
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          product.itemId
        )}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Box
          sx={{
            fontSize: 13.5,
            fontWeight: 600,
            letterSpacing: '-0.012em',
            color: foto.ink.primary,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {product.nombre || 'Sin nombre'}
        </Box>
        <Box
          sx={{
            fontSize: 11,
            color: sold ? foto.status.sold : foto.ink.tertiary,
            fontFamily: fontFamilies.mono,
            marginTop: '2px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          #{product.itemId}
          {product.loteId ? ` · Lote ${product.loteId}` : ''}
          {sold ? ' · VENDIDA' : ''}
        </Box>
      </Box>
      <Box
        sx={{
          fontFamily: fontFamilies.mono,
          fontVariantNumeric: 'tabular-nums',
          fontSize: 12.5,
          fontWeight: 500,
          color: foto.ink.secondary,
          whiteSpace: 'nowrap',
          textAlign: 'right',
        }}
      >
        {formatCop(price ?? product.precioCop)}
      </Box>
      <Box
        component="button"
        type="button"
        onClick={() => onRemove(product.itemId)}
        aria-label={`Quitar ${product.nombre || 'Sin nombre'} (${product.itemId}) de la venta`}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: '8px',
          border: `1px solid ${foto.surfaces.rule}`,
          background: foto.surfaces.canvas,
          color: foto.ink.tertiary,
          cursor: 'pointer',
          transition:
            'background 120ms ease, color 120ms ease, border-color 120ms ease',
          '&:hover': {
            background: alpha(foto.status.sold, 0.08),
            color: foto.status.sold,
            borderColor: foto.status.sold,
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: `0 0 0 3px ${foto.accent.glow}`,
          },
        }}
      >
        <Trash2 size={15} strokeWidth={1.8} aria-hidden />
      </Box>
    </Box>
  );
}

interface ManualItemRowProps {
  item: ManualSaleItem;
  onRemove: (id: string) => void;
  foto: ReturnType<typeof getFoto>;
}

/**
 * One row for a manual (non-inventory) line item: a "Manual" badge in place of
 * the thumbnail, name + detail, its price, and a remove button. Mirrors
 * {@link SelectedItemRow} so the inventory and manual items read as one list.
 */
function ManualItemRow({ item, onRemove, foto }: ManualItemRowProps) {
  const detail = [item.descripcion, item.peso].filter(Boolean).join(' · ');
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '48px minmax(0, 1fr) auto auto',
        gap: '12px',
        alignItems: 'center',
        padding: '10px 12px',
        borderRadius: '10px',
        border: `1px solid ${foto.surfaces.rule}`,
        background: foto.surfaces.panel,
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 48,
          height: 48,
          aspectRatio: '1 / 1',
          borderRadius: '7px',
          background: foto.accent.soft,
          border: `1px solid ${foto.accent.primary}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: foto.accent.deep,
          fontFamily: fontFamilies.mono,
          fontSize: 8.5,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        Manual
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Box
          sx={{
            fontSize: 13.5,
            fontWeight: 600,
            letterSpacing: '-0.012em',
            color: foto.ink.primary,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.nombre}
        </Box>
        <Box
          sx={{
            fontSize: 11,
            color: foto.ink.tertiary,
            marginTop: '2px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {detail || 'Ítem fuera de inventario'}
        </Box>
      </Box>
      <Box
        sx={{
          fontFamily: fontFamilies.mono,
          fontVariantNumeric: 'tabular-nums',
          fontSize: 12.5,
          fontWeight: 500,
          color: foto.ink.secondary,
          whiteSpace: 'nowrap',
          textAlign: 'right',
        }}
      >
        {formatCop(item.precioCop)}
      </Box>
      <Box
        component="button"
        type="button"
        onClick={() => onRemove(item.id)}
        aria-label={`Quitar ${item.nombre} (ítem manual) de la venta`}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: '8px',
          border: `1px solid ${foto.surfaces.rule}`,
          background: foto.surfaces.canvas,
          color: foto.ink.tertiary,
          cursor: 'pointer',
          transition:
            'background 120ms ease, color 120ms ease, border-color 120ms ease',
          '&:hover': {
            background: alpha(foto.status.sold, 0.08),
            color: foto.status.sold,
            borderColor: foto.status.sold,
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: `0 0 0 3px ${foto.accent.glow}`,
          },
        }}
      >
        <Trash2 size={15} strokeWidth={1.8} aria-hidden />
      </Box>
    </Box>
  );
}

interface TotalsRowProps {
  label: string;
  value: React.ReactNode;
  foto: ReturnType<typeof getFoto>;
  tone?: 'default' | 'accent' | 'gold';
  strong?: boolean;
}

function TotalsRow({
  label,
  value,
  foto,
  tone = 'default',
  strong = false,
}: TotalsRowProps) {
  const valueColor =
    tone === 'accent'
      ? foto.accent.deep
      : tone === 'gold'
        ? goldAccent.dark
        : foto.ink.primary;
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: '16px',
      }}
    >
      <Box
        sx={{
          fontSize: strong ? 13 : 12,
          fontWeight: strong ? 600 : 500,
          color: foto.ink.secondary,
          letterSpacing: '-0.005em',
        }}
      >
        {label}
      </Box>
      <Box
        sx={{
          fontFamily: fontFamilies.mono,
          fontVariantNumeric: 'tabular-nums',
          fontSize: strong ? 17 : 13,
          fontWeight: strong ? 600 : 500,
          color: valueColor,
          letterSpacing: '-0.01em',
        }}
      >
        {value}
      </Box>
    </Box>
  );
}
