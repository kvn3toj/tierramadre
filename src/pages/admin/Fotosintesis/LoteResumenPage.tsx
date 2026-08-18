import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Radio,
  RadioGroup,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Pencil } from 'lucide-react';
import { getFoto, fontFamilies } from '../../../design-system';
import { loteExigePreponderancia } from '../../../../convex/_lib/cierreLote';
import {
  useAuthedConvexAction,
  useConvexQuery,
  convexApi,
} from '../../../lib/convex-safe';
import { useNotification } from '../../../contexts/NotificationContext';
import { readFreshSessionToken } from '../../../utils/sessionToken';
import type { Id } from '../../../../convex/_generated/dataModel';
import { TicketHeader } from './components/TicketHeader';
import { FieldLabel } from './components/FieldLabel';
import { PhotoDropzone, type DropzonePhoto } from './components/PhotoDropzone';
import { EditLotDrawer } from './components/EditLotDrawer';
import ConfirmDialog from '../../../components/shared/ConfirmDialog';
import { uploadFotosintesisImages } from './utils/uploadItemMedia';
import { buildItemPricingPatch } from './utils/buildLotItemPayload';
import { convertToProxyUrl } from '../../../utils/driveUrl';
import { LabelSheet } from './labels/LabelSheet';
import {
  downloadLabelGroupsZip,
  type LabelItem,
} from './labels/downloadLabelsZip';
import { downloadLabelsSpreadsheet } from './labels/downloadLabelsSpreadsheet';
import { renderLabelCanvas } from './labels/exportLabel';
import {
  LABEL_SIZE_LIST,
  chunkForLabels,
  printScaleFor,
  resolveLabelSize,
  type LabelSizeId,
} from './labels/labelSizes';
import { useNiimbotPrinter } from '../../../hooks/useNiimbotPrinter';

type PublishMode = 'all' | 'selective' | 'reserve';

/**
 * Same key EtiquetasPage writes. The stock loaded in the printer is a property
 * of the SHOP, not of a screen — picking "15 × 30 · 2 ítems" while closing a
 * lote must not leave the Atelier gallery still laying out for 12 mm tape.
 */
const LABEL_SIZE_STORAGE_KEY = 'tm.etiquetas.labelSize';

const formatCOP = (n: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n);

function ValidationCard({
  label,
  ok,
  value,
  detail,
}: {
  label: string;
  ok: boolean;
  value: string;
  detail: string;
}) {
  const foto = getFoto('light');
  return (
    <Box
      role="status"
      aria-label={`${label}: ${ok ? 'cumplido' : 'pendiente'}`}
      sx={{
        background: foto.surfaces.panel,
        border: `1px solid ${ok ? foto.accent.primary : foto.status.sold}`,
        borderRadius: '12px',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Box sx={{ fontSize: 11, fontWeight: 600, color: foto.ink.tertiary }}>
          {label}
        </Box>
        <Box
          sx={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: ok ? foto.accent.deep : foto.status.sold,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
          {ok ? 'OK' : 'Revisar'}
        </Box>
      </Box>
      <Box
        sx={{
          fontSize: 22,
          fontWeight: 600,
          color: foto.ink.primary,
          fontFamily: fontFamilies.mono,
        }}
      >
        {value}
      </Box>
      <Box sx={{ fontSize: 11.5, color: foto.ink.secondary }}>{detail}</Box>
    </Box>
  );
}

export default function FotosintesisLoteResumenPage() {
  const foto = getFoto('light');
  const navigate = useNavigate();
  const { notify } = useNotification();
  const { loteId: loteIdParam } = useParams();
  const loteId = loteIdParam ?? '';

  const sessionToken = readFreshSessionToken() ?? undefined;
  const lot = useConvexQuery(
    convexApi.lots.getByLoteId,
    loteId ? { loteId, sessionToken } : 'skip',
  );
  const lotItems = useConvexQuery(
    convexApi.lotItems.listByLote,
    loteId ? { loteId, sessionToken } : 'skip',
  );
  const products = useConvexQuery(
    convexApi.products.listByLote,
    loteId ? { loteId, sessionToken } : 'skip',
  );

  const closeLot = useAuthedConvexAction(convexApi.lots.close);
  const publishLot = useAuthedConvexAction(convexApi.lots.publish);
  const reopenLot = useAuthedConvexAction(convexApi.lots.reopen);
  const updateGemaFields = useAuthedConvexAction(
    convexApi.lotItems.updateGemaFields,
  );
  const setLoteDisplay = useAuthedConvexAction(convexApi.lots.setLoteDisplay);

  const [pubByItemId, setPubByItemId] = useState<Record<string, boolean>>({});
  const [publishMode, setPublishMode] = useState<PublishMode>('selective');
  // Catalog grouping: hero photo + "show as one card" toggle.
  const [heroPhoto, setHeroPhoto] = useState<DropzonePhoto[]>([]);
  const [mostrarComoLote, setMostrarComoLote] = useState(false);
  const [closing, setClosing] = useState(false);
  // C1 — reopen flow + the lot-header editor (only reachable here once reopened).
  const [editLotOpen, setEditLotOpen] = useState(false);
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [reopening, setReopening] = useState(false);

  // Batch NIIMBOT label export — off-screen render target reused across
  // LABELS so we don't mount N LabelSheet instances at once. The unit is a
  // label, not an item: a 2-up stock puts two items on one node.
  const labelRenderRef = useRef<HTMLDivElement>(null);
  const [labelRenderGroup, setLabelRenderGroup] = useState<LabelItem[] | null>(
    null,
  );
  const [printingLabels, setPrintingLabels] = useState(false);

  // Which stock is in the printer. Read synchronously so the first paint is
  // already correct (an effect-based read would flash the 12 mm default).
  const [labelSizeId, setLabelSizeId] = useState<LabelSizeId>(
    () => resolveLabelSize(localStorage.getItem(LABEL_SIZE_STORAGE_KEY)).id,
  );
  const labelStock = resolveLabelSize(labelSizeId);

  function chooseLabelSize(id: LabelSizeId) {
    setLabelSizeId(id);
    try {
      localStorage.setItem(LABEL_SIZE_STORAGE_KEY, id);
    } catch {
      // Private mode / quota — the choice still applies for this session.
    }
  }

  // Batch NIIMBOT direct print — reuses labelRenderRef/labelRenderItem
  // above, printing through a single connected client rather than
  // reconnecting per label.
  const niimbot = useNiimbotPrinter();
  const [printProgress, setPrintProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    if (!lotItems || !products) return;
    const nextPub: Record<string, boolean> = {};
    for (const li of lotItems) {
      const p = products.find((row) => row.itemId === li.itemId);
      nextPub[li.itemId] = p?.mostrarEnCatalogo ?? false;
    }
    setPubByItemId(nextPub);
  }, [lotItems, products]);

  // Seed the grouping controls from the lot (only the persisted hero/flag).
  useEffect(() => {
    if (!lot) return;
    setMostrarComoLote(lot.mostrarComoLote ?? false);
    if (lot.fotoLoteUrl) {
      // Drive URLs are served through the proxy so the preview actually loads.
      setHeroPhoto([
        {
          id: 'existing-hero',
          url: convertToProxyUrl(lot.fotoLoteUrl) ?? lot.fotoLoteUrl,
        },
      ]);
    }
  }, [lot]);

  const prepSum = useMemo(
    () => (lotItems ?? []).reduce((s, it) => s + it.preponderancia, 0),
    [lotItems],
  );
  const itemsCount = lotItems?.length ?? 0;
  const unidades = lot?.unidadesDeclaradas ?? 0;
  // BR-2 sólo rige lotes con costo — espejo del candado real en lots._close
  // (convex/_lib/cierreLote.ts). Sin costo, la preponderancia es opcional.
  const exigePrep = !!lot && loteExigePreponderancia(lot);
  const br2Ok = !exigePrep || Math.abs(prepSum - 100) <= 0.01;
  const br3Ok = itemsCount === unidades && unidades > 0;
  const photosOk = useMemo(() => {
    if (!products?.length) return false;
    return products.every((p) => Boolean(p.fotoUrl));
  }, [products]);
  const syncOk = lot?.syncStatus !== 'error';

  const validationsOk = br2Ok && br3Ok && lot?.estado === 'abierto';
  // A lot closed in selective/reserve mode lands here as `cerrado` with its
  // items still in reserva. Publishing is the post-close action that makes
  // them appear in the catalog (the `mostrarEnCatalogo` flag is what the
  // customer-facing `products.publishedCatalog` bridge reads).
  const isClosed = lot?.estado === 'cerrado';
  // A published lot stays reachable here so the operator can manage its
  // catalog grouping (hero photo + "Mostrar como lote") after the fact.
  const isPublished = lot?.estado === 'publicado';

  useEffect(() => {
    if (!lot || !lotItems) return;
    // Cancelled lots have nothing to manage — send back to the queue.
    if (lot.estado === 'cancelado') {
      navigate('/admin/fotosintesis', { replace: true });
      return;
    }
    if (lot.estado !== 'abierto') return;
    if (!validationsOk) {
      navigate(`/admin/fotosintesis/lots/${loteId}`, { replace: true });
    }
  }, [lot, lotItems, validationsOk, navigate, loteId]);

  const applyPublishMode = useCallback(
    (mode: PublishMode) => {
      setPublishMode(mode);
      if (!lotItems || mode === 'selective') return;
      setPubByItemId((prev) => {
        const next = { ...prev };
        for (const li of lotItems) {
          next[li.itemId] = mode === 'all';
        }
        return next;
      });
    },
    [lotItems],
  );

  // Upload the hero photo (if a new file was dropped) and persist the
  // grouping fields. Works in any lot estado (setLoteDisplay is state-agnostic).
  const persistLoteDisplay = async (lotDocId: Id<'lots'>) => {
    let fotoLoteUrl: string | undefined;
    const pending = heroPhoto.find((p) => p.file);
    if (pending?.file) {
      fotoLoteUrl = await uploadFotosintesisImages(
        [pending.file],
        loteId,
        'lote-hero',
      );
    }
    await setLoteDisplay({
      id: lotDocId,
      ...(fotoLoteUrl !== undefined ? { fotoLoteUrl } : {}),
      mostrarComoLote,
    });
  };

  // Flush every item's publish/reserva toggle to Convex. Shared by all three
  // submit handlers so the per-item visibility edits persist in EVERY lot estado
  // (previously only handleClose ran this loop — F1). Price is DERIVED in Convex
  // (precioFinalCOP = costoBaseCOP × 2.6) since the 2026-07-21 refactor, so this
  // only persists the publish/reserva toggle — never a price.
  const flushItemPricing = async () => {
    if (!lotItems) return;
    for (const li of lotItems) {
      await updateGemaFields({
        lotItemId: li._id as Id<'lotItems'>,
        patch: buildItemPricingPatch(pubByItemId[li.itemId] ?? false),
      });
    }
  };

  const handleClose = async () => {
    if (!lot || !lotItems || !validationsOk) return;
    setClosing(true);
    try {
      await flushItemPricing();

      await persistLoteDisplay(lot._id as Id<'lots'>);

      await closeLot({ id: lot._id as Id<'lots'> });

      if (publishMode === 'all') {
        await publishLot({ id: lot._id as Id<'lots'> });
      }

      notify(
        `Lote ${lot.loteId} cerrado · ${itemsCount} ítems · sincronizando…`,
        'success',
      );
      navigate('/admin/fotosintesis');
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'No pudimos cerrar el lote',
        'error',
      );
    } finally {
      setClosing(false);
    }
  };

  // Publish an already-closed lot: flips every item to mostrarEnCatalogo:true
  // and moves the lot to `publicado`, so its items surface in the catalog and
  // it leaves the "Lotes en curso" queue. This is the missing exit for lots
  // closed in selective/reserve mode (which never reached `publicado`).
  const handlePublishClosed = async () => {
    if (!lot || !isClosed) return;
    setClosing(true);
    try {
      // Persist any per-item price edits BEFORE publishing (F1). publishLot
      // then force-flips every item to mostrarEnCatalogo:true, which is the
      // intended "Publicar lote" semantic.
      await flushItemPricing();
      await persistLoteDisplay(lot._id as Id<'lots'>);
      await publishLot({ id: lot._id as Id<'lots'> });
      notify(
        `Lote ${lot.loteId} publicado · ${itemsCount} ítems en catálogo`,
        'success',
      );
      navigate('/admin/fotosintesis');
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'No pudimos publicar el lote',
        'error',
      );
    } finally {
      setClosing(false);
    }
  };

  // Manage an already-published lot: persist per-item pricing/visibility edits
  // (F1 — the panel stays editable on a published lot, so an operator can
  // re-price or hide an individual item here) plus the catalog-grouping fields
  // (hero photo + "Mostrar como lote"). No re-publish.
  const handleSaveGrouping = async () => {
    if (!lot || !isPublished) return;
    setClosing(true);
    try {
      await flushItemPricing();
      await persistLoteDisplay(lot._id as Id<'lots'>);
      notify(`Lote ${lot.loteId} actualizado`, 'success');
      navigate('/admin/fotosintesis');
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'No pudimos guardar el lote',
        'error',
      );
    } finally {
      setClosing(false);
    }
  };

  // Reopen a cerrado/publicado lot back to abierto so the header (most often a
  // miskeyed costoTotalCOP) can be corrected via EditLotDrawer. Blocked
  // server-side if any item is already VENDIDA. (ISO-audit C1.)
  const handleReopen = async () => {
    if (!lot) return;
    setReopening(true);
    try {
      const res = await reopenLot({
        id: lot._id as Id<'lots'>,
      });
      setReopenDialogOpen(false);
      notify(
        `Lote ${lot.loteId} reabierto · corregí el encabezado y volvé a cerrarlo` +
          (res.demotedFromCatalog
            ? ` (${res.demotedFromCatalog} ítem(s) salieron del catálogo)`
            : ''),
        'success',
      );
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'No pudimos reabrir el lote',
        'error',
      );
    } finally {
      setReopening(false);
    }
  };

  /** The lote's items grouped into PHYSICAL labels for the selected stock. */
  function loteLabelGroups(): LabelItem[][] {
    const items: LabelItem[] = (products ?? []).map((p) => ({
      itemId: p.itemId,
      nombre: p.nombre,
      peso: p.peso,
    }));
    return chunkForLabels(items, labelStock);
  }

  /** Render one label into the shared hidden node, one frame after React has
   *  committed the new props, ready to rasterize. */
  function renderLabelGroupNode(group: LabelItem[]): Promise<HTMLElement> {
    return new Promise<HTMLElement>((resolve, reject) => {
      setLabelRenderGroup(group);
      requestAnimationFrame(() => {
        if (labelRenderRef.current) resolve(labelRenderRef.current);
        else reject(new Error('No se pudo renderizar la etiqueta'));
      });
    });
  }

  async function handlePrintLoteLabelsExport() {
    if (!products || products.length === 0) return;
    setPrintingLabels(true);
    try {
      const groups = loteLabelGroups();
      await downloadLabelGroupsZip(
        groups,
        `etiquetas-lote-${loteId}.zip`,
        renderLabelGroupNode,
      );
      notify(`${groups.length} etiqueta(s) exportadas`, 'success');
    } catch (err) {
      notify(
        `No se pudieron exportar las etiquetas: ${err instanceof Error ? err.message : String(err)}`,
        'error',
      );
    } finally {
      setPrintingLabels(false);
      setLabelRenderGroup(null);
    }
  }

  async function handleExportLoteSpreadsheet() {
    if (!products || products.length === 0) return;
    setPrintingLabels(true);
    try {
      const items = products.map((p) => ({
        itemId: p.itemId,
        nombre: p.nombre,
        peso: p.peso,
      }));
      await downloadLabelsSpreadsheet(items, `etiquetas-lote-${loteId}.xlsx`);
      notify(
        `Hoja de calculo de ${items.length} etiqueta(s) exportada`,
        'success',
      );
    } catch (err) {
      notify(
        `No se pudo exportar la hoja de calculo: ${err instanceof Error ? err.message : String(err)}`,
        'error',
      );
    } finally {
      setPrintingLabels(false);
    }
  }

  async function handlePrintLoteLabelsDirect() {
    if (!products || products.length === 0) return;
    const groups = loteLabelGroups();
    setPrintProgress({ done: 0, total: groups.length });
    try {
      await niimbot.connect();
      for (let i = 0; i < groups.length; i++) {
        const node = await renderLabelGroupNode(groups[i]);
        // Scale the raster onto the CONNECTED head's DPI — labels are authored
        // at 203 DPI, so a 300 DPI head needs ~1.478× or it prints undersized.
        const canvas = await renderLabelCanvas(node, {
          scale: printScaleFor(niimbot.head),
        });
        await niimbot.printLabel(canvas);
        setPrintProgress({ done: i + 1, total: groups.length });
      }
      notify(`${groups.length} etiqueta(s) impresas`, 'success');
    } catch (err) {
      notify(
        `No se pudo imprimir directo: ${err instanceof Error ? err.message : String(err)}. Usá "Imprimir etiquetas del lote" para exportar el zip.`,
        'error',
      );
    } finally {
      setPrintProgress(null);
      setLabelRenderGroup(null);
    }
  }

  if (!lot || !lotItems || !products) {
    return (
      <Box
        sx={{
          maxWidth: 1320,
          marginX: 'auto',
          padding: { xs: '24px 16px', md: '36px 28px' },
          color: foto.ink.tertiary,
          fontSize: 13,
        }}
      >
        Cargando resumen del lote {loteId}…
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{ position: 'fixed', left: '-9999px', top: 0 }}
        ref={labelRenderRef}
      >
        {labelRenderGroup && (
          <LabelSheet items={labelRenderGroup} size={labelSizeId} />
        )}
      </Box>
      <TicketHeader
        id={lot.loteId}
        meta={[
          { label: 'Estado', value: lot.estado },
          { label: 'Ítems', value: `${itemsCount} / ${unidades}` },
          { label: 'Preponderancia', value: `${prepSum.toFixed(1)}%` },
          { label: 'Costo', value: formatCOP(lot.costoTotalCOP) },
        ]}
        onEdit={
          lot.estado === 'abierto' ? () => setEditLotOpen(true) : undefined
        }
        editLabel="Editar encabezado del lote"
      />

      <Box
        sx={{
          maxWidth: 1320,
          marginX: 'auto',
          padding: { xs: '24px 16px', md: '36px 28px' },
        }}
      >
        <Box
          sx={{ textAlign: 'center', margin: '32px auto 28px', maxWidth: 560 }}
        >
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: foto.accent.deep,
              background: foto.accent.soft,
              borderRadius: '999px',
              padding: '6px 12px',
            }}
          >
            <CheckCircle2 size={14} />
            {isPublished
              ? 'Lote publicado'
              : isClosed
                ? 'Lote cerrado'
                : 'Listo para cerrar'}
          </Box>
          <Box
            component="h1"
            sx={{
              fontSize: { xs: 28, md: 38 },
              fontWeight: 600,
              letterSpacing: '-0.03em',
              marginTop: '16px',
              color: foto.ink.primary,
            }}
          >
            {isPublished
              ? 'Gestionar lote'
              : isClosed
                ? 'Publicar lote'
                : 'Cerrar lote'}{' '}
            {lot.loteId}
          </Box>
          <Box
            sx={{ fontSize: 14, color: foto.ink.secondary, marginTop: '10px' }}
          >
            {isPublished
              ? 'Este lote ya está en el catálogo. Mostralo como un solo card de lote (con foto y precio total) o dejá sus ítems individuales.'
              : isClosed
                ? 'Este lote ya está cerrado. Publicá sus ítems para que aparezcan en el catálogo y puedas venderlos.'
                : 'Revisá las validaciones, decidí qué ítems publicar y confirmá el cierre. Después podrás vender desde el catálogo.'}
          </Box>
        </Box>

        {/* C7 — persistent flag when removing an item left a closed/published
            lot no longer summing to 100%. The remove toast is the immediate
            signal; this is the lingering, actionable one for later visits. */}
        {(isClosed || isPublished) && !br2Ok ? (
          <Box
            role="alert"
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              background: foto.surfaces.panel,
              border: `1px solid ${foto.status.sold}`,
              borderLeft: `3px solid ${foto.status.sold}`,
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '20px',
            }}
          >
            <AlertCircle
              size={16}
              strokeWidth={2}
              style={{ marginTop: 1, color: foto.status.sold, flexShrink: 0 }}
            />
            <Box
              sx={{
                fontSize: 12.5,
                color: foto.ink.secondary,
                lineHeight: 1.5,
              }}
            >
              <Box
                component="span"
                sx={{ fontWeight: 600, color: foto.ink.primary }}
              >
                La preponderancia ya no suma 100% ({prepSum.toFixed(2)}%).
              </Box>{' '}
              Al quitar un ítem o editar una preponderancia, el lote dejó de
              balancear. Ajustá la preponderancia de los ítems (Editar ítem)
              para que vuelva a 100%.
            </Box>
          </Box>
        ) : null}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: '14px',
            marginBottom: '28px',
          }}
        >
          <ValidationCard
            label="Preponderancia (BR-2)"
            ok={br2Ok}
            value={`${prepSum.toFixed(1)}%`}
            detail={
              exigePrep
                ? 'Debe sumar 100% ± 0.01'
                : 'Opcional: lote sin costo, nada que repartir'
            }
          />
          <ValidationCard
            label="Conteo (BR-3)"
            ok={br3Ok}
            value={`${itemsCount} / ${unidades}`}
            detail="Ítems capturados = unidades declaradas"
          />
          <ValidationCard
            label="Fotos"
            ok={photosOk}
            value={photosOk ? 'Completo' : 'Faltan fotos'}
            detail="Recomendado: hero en Drive por ítem"
          />
          <ValidationCard
            label="Sync"
            ok={syncOk}
            value={lot.syncStatus ?? '—'}
            detail="Estado de sincronización con Sheets"
          />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.5fr) 420px' },
            gap: '32px',
            alignItems: 'start',
          }}
        >
          <Box
            sx={{
              background: foto.surfaces.panel,
              border: `1px solid ${foto.surfaces.rule}`,
              borderRadius: '14px',
              padding: '20px 22px',
            }}
          >
            <Box
              component="h2"
              sx={{ fontSize: 17, fontWeight: 600, margin: '0 0 16px' }}
            >
              Ítems del lote
            </Box>
            <Box
              component="ul"
              role="list"
              sx={{ listStyle: 'none', m: 0, p: 0 }}
            >
              {lotItems.map((li) => {
                const product = products.find((p) => p.itemId === li.itemId);
                const pubOn = pubByItemId[li.itemId] ?? false;
                // DERIVED final price (2026-07-21 refactor) — read-only.
                const precioFinal =
                  product?.precioFinalCOP ??
                  (product?.costoBaseCOP
                    ? Math.round(product.costoBaseCOP * 2.6)
                    : undefined);
                return (
                  <Box
                    component="li"
                    key={li._id}
                    sx={{
                      display: 'grid',
                      gap: '12px',
                      padding: '14px 0',
                      borderBottom: `1px solid ${foto.surfaces.edge}`,
                      '&:last-of-type': { borderBottom: 'none' },
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '12px',
                        alignItems: 'flex-start',
                      }}
                    >
                      <Box>
                        <Box
                          sx={{
                            fontFamily: fontFamilies.mono,
                            fontSize: 11,
                            color: foto.ink.tertiary,
                          }}
                        >
                          #{li.itemId}
                        </Box>
                        <Box sx={{ fontSize: 14, fontWeight: 600 }}>
                          {product?.nombre ?? '—'}
                        </Box>
                        <Box sx={{ fontSize: 12, color: foto.ink.secondary }}>
                          {li.preponderancia}% · {formatCOP(li.costoBaseCOP)}
                        </Box>
                      </Box>
                      <Box
                        component="button"
                        type="button"
                        aria-pressed={pubOn}
                        onClick={() =>
                          setPubByItemId((prev) => ({
                            ...prev,
                            [li.itemId]: !pubOn,
                          }))
                        }
                        sx={{
                          fontFamily: fontFamilies.system,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '6px 10px',
                          borderRadius: '999px',
                          border: `1px solid ${pubOn ? foto.accent.primary : foto.surfaces.rule}`,
                          background: pubOn
                            ? foto.accent.soft
                            : foto.surfaces.inset,
                          color: pubOn ? foto.accent.deep : foto.ink.secondary,
                          cursor: 'pointer',
                        }}
                      >
                        {pubOn ? 'Publicar' : 'Reserva'}
                      </Box>
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      {product?.fotoUrl ? (
                        <Box
                          component="img"
                          src={
                            convertToProxyUrl(product.fotoUrl) ??
                            product.fotoUrl
                          }
                          alt={`Foto del ítem ${li.itemId}`}
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '8px',
                            objectFit: 'cover',
                            border: `1px solid ${foto.surfaces.rule}`,
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <Box
                          aria-hidden
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '8px',
                            border: `1px dashed ${foto.surfaces.rule}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: foto.ink.tertiary,
                            fontSize: 9,
                            textAlign: 'center',
                            lineHeight: 1.1,
                            flexShrink: 0,
                          }}
                        >
                          Sin foto
                        </Box>
                      )}
                      <Box
                        component="button"
                        type="button"
                        onClick={() =>
                          navigate(
                            `/admin/fotosintesis/lots/${loteId}/items/${li._id}/edit`,
                          )
                        }
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontFamily: fontFamilies.system,
                          fontSize: 11.5,
                          fontWeight: 600,
                          padding: '7px 12px',
                          borderRadius: '8px',
                          border: `1px solid ${foto.surfaces.rule}`,
                          background: foto.surfaces.inset,
                          color: foto.ink.secondary,
                          cursor: 'pointer',
                          transition: 'background 120ms ease, color 120ms ease',
                          '&:hover': {
                            background: foto.surfaces.panel,
                            color: foto.ink.primary,
                          },
                        }}
                      >
                        <Pencil size={13} strokeWidth={2} />
                        Editar ítem
                      </Box>
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'baseline',
                        flexWrap: 'wrap',
                        gap: '8px',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      <Box
                        component="span"
                        sx={{ fontSize: 11.5, color: foto.ink.tertiary }}
                      >
                        Precio final
                      </Box>
                      <Box
                        component="span"
                        sx={{
                          fontSize: 16,
                          fontWeight: 600,
                          color: foto.ink.secondary,
                        }}
                      >
                        {precioFinal != null
                          ? `$${precioFinal.toLocaleString('es-CO')} COP`
                          : '—'}
                      </Box>
                      <Box
                        component="span"
                        sx={{ fontSize: 11, color: foto.ink.tertiary }}
                      >
                        (costo × 2.6, automático)
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Box
              sx={{
                background: foto.surfaces.inset,
                border: `1px solid ${foto.surfaces.edge}`,
                borderRadius: '12px',
                padding: '16px 18px',
                fontSize: 12.5,
                color: foto.ink.secondary,
                lineHeight: 1.55,
              }}
            >
              {isPublished ? (
                <>
                  Este lote ya está <strong>publicado</strong>. Activá{' '}
                  <strong>Mostrar como lote</strong> para presentarlo como un
                  solo card con foto y precio total; al guardar se actualiza el
                  catálogo.
                </>
              ) : isClosed ? (
                <>
                  Al publicar: todos los ítems pasan a{' '}
                  <strong>visibles en catálogo</strong> y el lote queda{' '}
                  <strong>publicado</strong>, listo para vender.
                </>
              ) : (
                <>
                  Al cerrar: el lote pasa a <strong>cerrado</strong>, se
                  sincroniza a Sheets y los ítems en reserva quedan ocultos del
                  catálogo hasta que los publiques.
                </>
              )}
            </Box>

            {isClosed || isPublished ? null : (
              <Box
                sx={{
                  background: foto.surfaces.panel,
                  border: `1px solid ${foto.surfaces.rule}`,
                  borderRadius: '14px',
                  padding: '18px 20px',
                }}
              >
                <FieldLabel>Decisión de publicación</FieldLabel>
                <RadioGroup
                  aria-label="Decisión de publicación"
                  value={publishMode}
                  onChange={(e) =>
                    applyPublishMode(e.target.value as PublishMode)
                  }
                >
                  <FormControlLabel
                    value="all"
                    control={<Radio size="small" />}
                    label="Publicar todo el lote ahora"
                  />
                  <FormControlLabel
                    value="selective"
                    control={<Radio size="small" />}
                    label="Publicar selectivamente (usa toggles)"
                  />
                  <FormControlLabel
                    value="reserve"
                    control={<Radio size="small" />}
                    label="Mantener todo en reserva"
                  />
                </RadioGroup>
              </Box>
            )}

            {/* Catalog grouping — show the whole lote as ONE bundled card */}
            <Box
              sx={{
                background: foto.surfaces.panel,
                border: `1px solid ${foto.surfaces.rule}`,
                borderRadius: '14px',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <Box
                  sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
                >
                  <FieldLabel>Mostrar como lote</FieldLabel>
                  <Box sx={{ fontSize: 11, color: foto.ink.tertiary }}>
                    Un solo card con foto del lote y precio total; al abrirlo,
                    la galería muestra cada ítem con su precio.
                  </Box>
                </Box>
                <Switch
                  checked={mostrarComoLote}
                  onChange={(e) => setMostrarComoLote(e.target.checked)}
                  inputProps={{ 'aria-label': 'Mostrar como lote en catálogo' }}
                />
              </Box>
              {mostrarComoLote ? (
                <Box>
                  <FieldLabel optional="recomendado">Foto del lote</FieldLabel>
                  <PhotoDropzone
                    photos={heroPhoto}
                    onAdd={(files) => {
                      const f = files[0];
                      if (!f) return;
                      heroPhoto.forEach((p) => {
                        if (p.url.startsWith('blob:'))
                          URL.revokeObjectURL(p.url);
                      });
                      setHeroPhoto([
                        {
                          id: `${f.name}-${f.lastModified}`,
                          url: URL.createObjectURL(f),
                          file: f,
                        },
                      ]);
                    }}
                    onRemove={() => setHeroPhoto([])}
                    hint="Una foto del lote completo. Se sube a Drive al publicar."
                  />
                </Box>
              ) : null}
            </Box>

            <Box
              component="button"
              type="button"
              disabled={
                (isClosed || isPublished ? false : !validationsOk) || closing
              }
              onClick={() =>
                isPublished
                  ? void handleSaveGrouping()
                  : isClosed
                    ? void handlePublishClosed()
                    : void handleClose()
              }
              sx={{
                width: '100%',
                padding: '14px 18px',
                borderRadius: '11px',
                border: 'none',
                background: foto.accent.primary,
                color: foto.ink.inverse,
                fontSize: 14,
                fontWeight: 600,
                cursor: closing ? 'wait' : 'pointer',
                opacity:
                  (isClosed || isPublished ? false : !validationsOk) || closing
                    ? 0.6
                    : 1,
                '&:hover:not(:disabled)': {
                  filter: 'brightness(1.05)',
                },
              }}
            >
              {closing
                ? isPublished
                  ? 'Guardando…'
                  : isClosed
                    ? 'Publicando…'
                    : 'Cerrando…'
                : isPublished
                  ? 'Guardar cambios'
                  : isClosed
                    ? 'Publicar lote'
                    : 'Cerrar lote'}
            </Box>

            {/* C1 — secondary actions. Reopen a closed/published lot to fix its
                header; once abierto, edit the header in place. */}
            {isClosed || isPublished ? (
              <Box
                component="button"
                type="button"
                disabled={reopening}
                onClick={() => setReopenDialogOpen(true)}
                sx={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: '11px',
                  background: 'transparent',
                  color: foto.ink.secondary,
                  border: `1px solid ${foto.surfaces.edgeStrong}`,
                  fontFamily: fontFamilies.system,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: reopening ? 'wait' : 'pointer',
                  transition: 'background 120ms ease, color 120ms ease',
                  '&:hover:not(:disabled)': {
                    background: foto.surfaces.canvas,
                    color: foto.ink.primary,
                  },
                }}
              >
                Reabrir lote para corregir el encabezado
              </Box>
            ) : null}
            {lot.estado === 'abierto' ? (
              <Box
                component="button"
                type="button"
                onClick={() => setEditLotOpen(true)}
                sx={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: '11px',
                  background: 'transparent',
                  color: foto.ink.secondary,
                  border: `1px solid ${foto.surfaces.edgeStrong}`,
                  fontFamily: fontFamilies.system,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 120ms ease, color 120ms ease',
                  '&:hover': {
                    background: foto.surfaces.canvas,
                    color: foto.ink.primary,
                  },
                }}
              >
                Editar encabezado del lote
              </Box>
            ) : null}
            {/* Which stock is loaded in the printer. Shared with the Atelier
                gallery through localStorage — see LABEL_SIZE_STORAGE_KEY. */}
            <Box>
              <Box
                sx={{
                  fontFamily: fontFamilies.system,
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: foto.ink.tertiary,
                  marginBottom: '6px',
                }}
              >
                Rollo
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {LABEL_SIZE_LIST.map((s) => {
                  const active = labelSizeId === s.id;
                  return (
                    <Box
                      key={s.id}
                      component="button"
                      type="button"
                      onClick={() => chooseLabelSize(s.id)}
                      sx={{
                        padding: '7px 12px',
                        borderRadius: '9px',
                        background: active
                          ? foto.accent.primary
                          : 'transparent',
                        color: active ? foto.ink.inverse : foto.ink.secondary,
                        border: `1px solid ${active ? foto.accent.primary : foto.surfaces.edgeStrong}`,
                        fontFamily: fontFamilies.system,
                        fontSize: 12,
                        fontWeight: active ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'background 120ms ease, color 120ms ease',
                      }}
                    >
                      {s.label}
                    </Box>
                  );
                })}
              </Box>
              {/* A 2-up label is not finished when it leaves the printer, and
                  the counts stop matching the item count. Both facts belong
                  next to the buttons that act on them. */}
              {labelStock.itemsPerLabel > 1 && (
                <Box
                  sx={{
                    marginTop: '6px',
                    fontFamily: fontFamilies.system,
                    fontSize: 11,
                    lineHeight: 1.45,
                    color: foto.ink.tertiary,
                  }}
                >
                  ✂ {labelStock.hint}
                  {products?.length
                    ? ` · ${Math.ceil(products.length / labelStock.itemsPerLabel)} etiqueta(s) para ${products.length} ítem(s)`
                    : ''}
                </Box>
              )}
            </Box>
            <Box
              component="button"
              type="button"
              disabled={printingLabels || !products?.length}
              onClick={() => void handlePrintLoteLabelsExport()}
              sx={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: '11px',
                background: 'transparent',
                color: foto.ink.secondary,
                border: `1px solid ${foto.surfaces.edgeStrong}`,
                fontFamily: fontFamilies.system,
                fontSize: 13,
                fontWeight: 600,
                cursor: printingLabels ? 'wait' : 'pointer',
                transition: 'background 120ms ease, color 120ms ease',
                '&:hover:not(:disabled)': {
                  background: foto.surfaces.canvas,
                  color: foto.ink.primary,
                },
              }}
            >
              {printingLabels
                ? 'Exportando etiquetas…'
                : 'Imprimir etiquetas del lote'}
            </Box>
            <Box
              component="button"
              type="button"
              disabled={printingLabels || !products?.length}
              onClick={() => void handleExportLoteSpreadsheet()}
              title="Hoja de calculo para 'Importar desde Excel' en la app NIIMBOT"
              sx={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: '11px',
                background: 'transparent',
                color: foto.ink.secondary,
                border: `1px solid ${foto.surfaces.edgeStrong}`,
                fontFamily: fontFamilies.system,
                fontSize: 13,
                fontWeight: 600,
                cursor: printingLabels ? 'wait' : 'pointer',
                transition: 'background 120ms ease, color 120ms ease',
                '&:hover:not(:disabled)': {
                  background: foto.surfaces.canvas,
                  color: foto.ink.primary,
                },
              }}
            >
              Exportar hoja de calculo (NIIMBOT)
            </Box>
            {niimbot.supported && (
              <Box
                component="button"
                type="button"
                disabled={
                  !products?.length ||
                  niimbot.connecting ||
                  printProgress !== null
                }
                onClick={() => void handlePrintLoteLabelsDirect()}
                sx={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: '11px',
                  background: 'transparent',
                  color: foto.accent.deep,
                  border: `1px solid ${foto.accent.primary}`,
                  fontFamily: fontFamilies.system,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor:
                    niimbot.connecting || printProgress !== null
                      ? 'wait'
                      : 'pointer',
                  transition: 'background 120ms ease, color 120ms ease',
                  '&:hover:not(:disabled)': {
                    background: foto.surfaces.canvas,
                  },
                }}
              >
                {printProgress
                  ? `Imprimiendo ${printProgress.done}/${printProgress.total}…`
                  : niimbot.connecting
                    ? 'Conectando…'
                    : 'Imprimir etiquetas del lote (directo)'}
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* C1 — lot-header editor (reachable once the lot is abierto) + the
          reopen confirmation. */}
      <EditLotDrawer
        open={editLotOpen}
        onClose={() => setEditLotOpen(false)}
        lot={lot}
        itemsCount={itemsCount}
      />
      <ConfirmDialog
        open={reopenDialogOpen}
        title="Reabrir lote"
        message={
          `Esto devuelve el lote ${lot.loteId} a “abierto” para corregir el ` +
          `encabezado (por ejemplo, un costo total mal digitado). ` +
          (isPublished
            ? 'Sus ítems salen del catálogo hasta que vuelvas a publicarlo. '
            : '') +
          'Si algún ítem ya está vendido, primero cancelá esa venta.'
        }
        confirmLabel={reopening ? 'Reabriendo…' : 'Reabrir lote'}
        cancelLabel="Cancelar"
        confirmColor="primary"
        confirmDisabled={reopening}
        onConfirm={() => void handleReopen()}
        onCancel={() => setReopenDialogOpen(false)}
      />

      {/* Per-item editing now lives on a dedicated page
          (/admin/fotosintesis/lots/:loteId/items/:lotItemId/edit) — see the
          "Editar ítem" button above, which navigates there. */}
    </Box>
  );
}
