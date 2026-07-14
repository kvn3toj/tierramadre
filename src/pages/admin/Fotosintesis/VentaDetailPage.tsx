import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  Ban,
  ExternalLink,
  Link2Off,
  Sparkles,
  Upload,
} from 'lucide-react';
import { getFoto, fontFamilies, paneHeight } from '../../../design-system';
import {
  uploadVentaDocument,
  ventasSubPath,
  driveDocViewUrl,
} from './utils/uploadItemMedia';
import { exportCarnet } from './exportCarnet';
import { slugifyBuyerName } from '../../../utils/slugify';
import { cancelToast } from './utils/cancelToast';
import { FOTO_PREVIEW_FELT } from './VentaPage';
import { FOTO_TOPBAR_HEIGHT } from './components/FotoTopbar';
import { fotoPaneSx } from './components/paneStyles';
import {
  useConvexQuery,
  useAuthedConvexAction,
  convexApi,
} from '../../../lib/convex-safe';
import { useGoogleAuth } from '../../../contexts/GoogleAuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { TicketHeader } from './components/TicketHeader';
import { KardexPreview } from './components/KardexPreview';
import type { KardexLineItem } from './components/KardexPreview';
import { CancelVentaDialog } from './components/CancelVentaDialog';
import { EditableMetaValue } from './components/EditableMetaValue';
import { resolveKardexPrices } from './utils/saleItemSelection';
import type { CompradorTier } from './utils/saleItemSelection';
import { resolveItemThumbnail } from './utils/resolveThumbnail';
import { useBatchThumbnails } from '../../../hooks/useBatchThumbnails';
import type { Id } from '../../../../convex/_generated/dataModel';

function formatCop(value: number | undefined | null): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateLong(iso: string | undefined | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function formatDateTimeLong(iso: string | undefined | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-CO', {
      dateStyle: 'long',
      timeStyle: 'short',
    });
  } catch {
    return '—';
  }
}

function formaPagoLabel(formaPago: string, metodoContado?: string): string {
  if (formaPago === 'contado') {
    return metodoContado ? `Contado · ${metodoContado}` : 'Contado';
  }
  if (formaPago === 'esmereogenesis') return 'Esmereogénesis';
  if (formaPago === 'credito') return 'Crédito';
  if (formaPago === 'bajo_pedido') return 'Bajo pedido';
  if (formaPago === 'consignacion') return 'Consignación';
  return formaPago;
}

/**
 * Fotosíntesis — Read-only detail view for a persisted sale (Slice 3).
 *
 * Sibling to VentaPage (which still owns `/sales/new`). Loads the sale,
 * its buyer/lot/provider/first-item context, and shows the Kardex preview
 * as a comprobante on the dark right pane. The footer exposes a single
 * "Cancelar venta" action that drives `sales.cancel`; the cancellation
 * audit (cancelledAt/By/Reason) renders below as soon as Convex reactivity
 * refreshes the row.
 */
export default function VentaDetailPage() {
  const foto = getFoto('light');
  const navigate = useNavigate();
  const { saleId: routeSaleId } = useParams();
  const { user } = useGoogleAuth();
  const { notify } = useNotification();
  // Legacy catalog thumbnails (fallback for items without a Fotosíntesis fotoUrl).
  const { thumbnails: batchThumbs } = useBatchThumbnails();

  const [showCancel, setShowCancel] = useState(false);
  // Captures the right-pane Kardex comprobante so we can rasterize it → PDF and
  // archive it to Drive on demand, without asking the operator for a file.
  const kardexRef = useRef<HTMLDivElement>(null);
  const [archivingKardex, setArchivingKardex] = useState(false);

  // The route param is the human "V-NNNN" id, but `sales.get` expects the
  // Convex `_id`. Look up by saleId via list+find — list is small and the
  // detail view is rare. Future optimisation: add `sales.getBySaleId`.
  const allSales = useConvexQuery(convexApi.sales.list, {});
  const saleMatch = useMemo(
    () => (allSales ?? []).find((s) => s.saleId === routeSaleId) ?? null,
    [allSales, routeSaleId],
  );
  // `undefined` = still loading; `null` = loaded + not found.
  const sale = allSales === undefined ? undefined : saleMatch;

  const cancelSale = useAuthedConvexAction(convexApi.sales.cancel);
  const updatePrice = useAuthedConvexAction(convexApi.sales.updatePrice);
  const setCarnetUrl = useAuthedConvexAction(convexApi.sales.setCarnetUrl);
  const setCertificadoUrl = useAuthedConvexAction(
    convexApi.sales.setCertificadoUrl,
  );

  // First item drives the lineage footer (lot → provider); the full set of
  // priced line items drives the Kardex preview.
  const firstItemId = sale?.itemIds[0] ?? null;
  const item = useConvexQuery(
    convexApi.products.get,
    firstItemId ? { itemId: firstItemId } : 'skip',
  );
  // All sale items in one batch — order-preserving, with tier prices.
  const manyItems = useConvexQuery(
    convexApi.products.getManyByItemIds,
    sale ? { itemIds: sale.itemIds } : 'skip',
  );
  const lot = useConvexQuery(
    convexApi.lots.getByLoteId,
    item?.loteId ? { loteId: item.loteId } : 'skip',
  );
  const provider = useConvexQuery(
    convexApi.providers.get,
    lot?.providerId ? { id: lot.providerId } : 'skip',
  );
  const buyer = useConvexQuery(
    convexApi.clients.get,
    sale?.clientId ? { id: sale.clientId } : 'skip',
  );

  // The buyer's tier decides which price each line contributes (ambassador vs
  // consumer). Free-text / "final" write-ins pay the consumer price.
  const tier: CompradorTier =
    buyer?.tipo === 'embajador' ? 'embajador' : 'final';

  // itemId → per-item price (COP). Prefers the sale's frozen `lineItems`
  // snapshot (faithful comprobante); falls back to a live tier recompute only
  // for legacy sales captured before snapshots existed.
  const priceByItemId = useMemo(
    () => resolveKardexPrices(sale?.lineItems, manyItems, tier),
    [sale, manyItems, tier],
  );

  // Ordered Kardex line items, photos resolved with the legacy-thumbnail
  // fallback. Manual (non-inventory) lines stored on the sale render after.
  const kardexItems = useMemo<KardexLineItem[]>(() => {
    const inventory: KardexLineItem[] = (manyItems ?? []).map((row) => ({
      itemId: row.itemId,
      nombre: row.nombre,
      color: row.color,
      calidad: row.calidad,
      peso: row.peso,
      medidas: row.medidas,
      thumbnailUrl: resolveItemThumbnail(row.fotoUrl, row.itemId, batchThumbs),
      precioCop: priceByItemId.get(row.itemId),
    }));
    const manual: KardexLineItem[] = (sale?.manualItems ?? []).map((m) => ({
      itemId: '',
      nombre: m.nombre,
      peso: m.peso,
      descripcion: m.descripcion,
      precioCop: m.precioCOP,
      isManual: true,
    }));
    return [...inventory, ...manual];
  }, [manyItems, priceByItemId, sale, batchThumbs]);

  // Σ inventory tier prices + Σ manual items → Subtotal; Descuento prefers the
  // value persisted on the sale, falling back to max(0, subtotal − total).
  const subtotal = useMemo(() => {
    let sum = 0;
    for (const value of priceByItemId.values()) {
      if (typeof value === 'number' && !Number.isNaN(value)) sum += value;
    }
    for (const m of sale?.manualItems ?? []) {
      if (typeof m.precioCOP === 'number' && !Number.isNaN(m.precioCOP)) {
        sum += m.precioCOP;
      }
    }
    return sum;
  }, [priceByItemId, sale]);

  const handleConfirmCancel = useCallback(
    async (reason: string) => {
      if (!sale) return;
      // C8 — own try/catch so the success path tells the truth (tailored to the
      // restored/skipped counts) and errors are surfaced AND re-thrown so
      // CancelVentaDialog keeps its inline error + re-enables submit.
      try {
        const res = await cancelSale({
          id: sale._id as Id<'sales'>,
          reason,
        });
        if (res.alreadyCancelled) {
          notify('La venta ya estaba cancelada', 'info');
        } else {
          const { message, severity } = cancelToast({
            restored: res.restored,
            skipped: res.skipped,
          });
          notify(message, severity);
        }
        setShowCancel(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        notify(`No pudimos cancelar la venta: ${msg}`, 'error');
        throw err;
      }
    },
    [sale, cancelSale, notify],
  );

  // Generate the Kardex PDF from the on-screen comprobante and archive it to
  // Drive — the one-click recovery for sales whose carnet was never uploaded
  // (e.g. created before auto-upload shipped, or a create-time capture that
  // raced image loading). No file picker: the preview IS the source of truth.
  // `captureNodeToPdf` now waits for thumbnails to decode, so the PDF is never
  // blank. The archive lands in the month of the sale (not "now") so an old
  // sale's carnet files under `ventas/<saleYear>/<saleMonth>`.
  const handleGenerateKardex = useCallback(async () => {
    if (!sale || archivingKardex) return;
    if (sale.estado === 'cancelada') {
      notify('No se genera Kardex para una venta cancelada', 'warning');
      return;
    }
    if (!kardexRef.current) {
      notify('La vista previa del Kardex aún no está lista', 'warning');
      return;
    }
    if (kardexItems.length === 0) {
      notify('No hay ítems en la venta para generar el Kardex', 'warning');
      return;
    }
    setArchivingKardex(true);
    try {
      const slug = slugifyBuyerName(buyer?.nombre ?? 'cliente');
      const filename = `${sale.saleId}-${slug}.pdf`;
      const blob = await exportCarnet(kardexRef.current, filename, {
        download: false,
      });
      const file = new File([blob], filename, { type: 'application/pdf' });
      const docUrl = await uploadVentaDocument(file, {
        subPath: ventasSubPath(new Date(sale.fechaVenta)),
      });
      await setCarnetUrl({
        id: sale._id as Id<'sales'>,
        carnetUrl: docUrl,
      });
      notify('Kardex generado y archivado en Drive', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(`No pudimos generar el Kardex: ${msg}`, 'error');
    } finally {
      setArchivingKardex(false);
    }
  }, [sale, archivingKardex, kardexItems, buyer, setCarnetUrl, notify]);

  // ─── Loading / not-found ─────────────────────────────────────────────
  if (sale === undefined) {
    return (
      <Box
        sx={{
          background: foto.surfaces.canvas,
          color: foto.ink.tertiary,
          minHeight: paneHeight(FOTO_TOPBAR_HEIGHT),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          letterSpacing: '-0.005em',
        }}
      >
        Cargando venta…
      </Box>
    );
  }

  if (sale === null) {
    return (
      <Box
        sx={{
          background: foto.surfaces.canvas,
          color: foto.ink.primary,
          minHeight: paneHeight(FOTO_TOPBAR_HEIGHT),
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '14px',
          padding: '40px 20px',
          textAlign: 'center',
        }}
      >
        <Link2Off size={28} color={foto.ink.tertiary} aria-hidden />
        <Box sx={{ fontSize: 16, fontWeight: 600 }}>
          No encontramos la venta {routeSaleId}
        </Box>
        <Box
          component="button"
          type="button"
          onClick={() => navigate('/admin/fotosintesis')}
          sx={{
            marginTop: '4px',
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
          Volver al inicio
        </Box>
      </Box>
    );
  }

  const isCancelled = sale.estado === 'cancelada';
  const buyerTipoLabel =
    buyer?.tipo === 'embajador' ? 'Embajador' : 'Cliente final';

  return (
    <Box
      sx={{
        background: foto.surfaces.canvas,
        color: foto.ink.primary,
        minHeight: paneHeight(FOTO_TOPBAR_HEIGHT),
      }}
    >
      <TicketHeader
        id={sale.saleId}
        kind="sale"
        meta={[
          { label: 'Fecha', value: formatDateLong(sale.fechaVenta) },
          {
            label: 'Operador',
            value: user?.givenName || user?.name?.split(' ')[0] || 'Operador',
          },
        ]}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            lg: 'minmax(0, 1fr) minmax(380px, 460px)',
          },
          gap: 0,
          maxWidth: 1320,
          margin: '0 auto',
          minHeight: paneHeight(FOTO_TOPBAR_HEIGHT + 110),
        }}
      >
        {/* ───── LEFT pane (form summary) ───── */}
        <Box
          sx={{
            padding: { xs: '24px 16px 60px', md: '24px 28px 60px' },
            display: 'flex',
            flexDirection: 'column',
            gap: '28px',
          }}
        >
          <Section title="Detalle de la venta" foto={foto}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '16px 18px',
                borderRadius: '11px',
                border: `1px solid ${foto.surfaces.rule}`,
                background: foto.surfaces.panel,
              }}
            >
              <DetailRow
                label="Comprador"
                value={
                  <>
                    <Box
                      component="span"
                      sx={{
                        fontWeight: 600,
                        color: foto.ink.primary,
                      }}
                    >
                      {buyer?.nombre ?? '—'}
                    </Box>
                    <Box
                      component="span"
                      sx={{
                        marginLeft: '8px',
                        fontSize: 11.5,
                        color: foto.ink.tertiary,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {buyerTipoLabel}
                    </Box>
                  </>
                }
                foto={foto}
              />
              <DetailRow
                label="Forma de pago"
                value={formaPagoLabel(sale.formaPago, sale.metodoContado)}
                foto={foto}
              />
              {sale.formaPago === 'credito' ? (
                <>
                  <DetailRow
                    label="Vence"
                    value={formatDateLong(sale.fechaVencimiento)}
                    foto={foto}
                  />
                  <DetailRow
                    label="N° de cuotas"
                    value={
                      typeof sale.numeroCuotas === 'number'
                        ? String(sale.numeroCuotas)
                        : '—'
                    }
                    foto={foto}
                  />
                </>
              ) : null}
              <Box
                sx={{
                  height: 1,
                  background: foto.surfaces.edge,
                  margin: '4px 0',
                }}
              />
              <DetailRow
                label="Precio acordado"
                value={
                  <EditableMetaValue
                    value={sale.precioAcordadoCOP}
                    format={formatCop}
                    disabled={isCancelled}
                    min={1}
                    step={1000}
                    variant="currency"
                    ariaLabel="precio acordado de la venta"
                    helper={
                      isCancelled
                        ? undefined
                        : 'Actualiza precio + total (Enter para guardar).'
                    }
                    onCommit={async (next) => {
                      try {
                        await updatePrice({
                          id: sale._id as Id<'sales'>,
                          precioAcordadoCOP: next,
                          totalCOP: next,
                        });
                        notify('Precio de la venta actualizado', 'success');
                      } catch (err) {
                        const msg =
                          err instanceof Error ? err.message : String(err);
                        notify(
                          `No pudimos actualizar el precio: ${msg}`,
                          'error',
                        );
                        throw err;
                      }
                    }}
                  />
                }
                foto={foto}
                mono
              />
              <DetailRow
                label="Total"
                value={formatCop(sale.totalCOP)}
                foto={foto}
                mono
                strong
              />
            </Box>
          </Section>

          <Section title="Documentos" foto={foto}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <DocumentRow
                label="Kardex"
                url={sale.carnetUrl}
                openLabel="Abrir Kardex"
                uploadLabel="Subir Kardex"
                disabled={isCancelled}
                foto={foto}
                onGenerate={handleGenerateKardex}
                generating={archivingKardex}
                generateLabel={sale.carnetUrl ? 'Regenerar' : 'Generar Kardex'}
                onUpload={async (file) => {
                  try {
                    const docUrl = await uploadVentaDocument(file);
                    await setCarnetUrl({
                      id: sale._id as Id<'sales'>,
                      carnetUrl: docUrl,
                    });
                    notify('Kardex actualizado', 'success');
                  } catch (err) {
                    const msg =
                      err instanceof Error ? err.message : String(err);
                    notify(`No pudimos subir el Kardex: ${msg}`, 'error');
                  }
                }}
              />
              <DocumentRow
                label="Certificado"
                url={sale.certificadoUrl}
                openLabel="Abrir Certificado"
                uploadLabel="Subir Certificado"
                disabled={isCancelled}
                foto={foto}
                onUpload={async (file) => {
                  try {
                    const docUrl = await uploadVentaDocument(file);
                    await setCertificadoUrl({
                      id: sale._id as Id<'sales'>,
                      certificadoUrl: docUrl,
                    });
                    notify('Certificado actualizado', 'success');
                  } catch (err) {
                    const msg =
                      err instanceof Error ? err.message : String(err);
                    notify(`No pudimos subir el Certificado: ${msg}`, 'error');
                  }
                }}
              />
            </Box>
          </Section>

          {isCancelled ? (
            <Section title="Historial de cancelación" foto={foto}>
              <Box
                role="status"
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '14px 16px',
                  borderRadius: '11px',
                  border: `1px solid ${foto.status.sold}`,
                  background: alpha(foto.status.sold, 0.06),
                  color: foto.status.sold,
                  fontSize: 12.5,
                  lineHeight: 1.55,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} strokeWidth={1.7} aria-hidden />
                  <Box sx={{ fontWeight: 600 }}>
                    Cancelada el {formatDateTimeLong(sale.cancelledAt)}
                  </Box>
                </Box>
                <Box sx={{ color: foto.ink.secondary, fontSize: 12 }}>
                  por {sale.cancelledBy ?? '—'}
                </Box>
                <Box sx={{ color: foto.ink.secondary, fontSize: 12 }}>
                  Motivo: {sale.cancellationReason ?? '—'}
                </Box>
              </Box>
            </Section>
          ) : null}

          {/* Footer actions */}
          <Box
            sx={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              paddingTop: '12px',
              borderTop: `1px solid ${foto.surfaces.edge}`,
            }}
          >
            <Box
              component="button"
              type="button"
              disabled={isCancelled}
              aria-disabled={isCancelled}
              onClick={() => setShowCancel(true)}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '9px',
                border: `1px solid ${isCancelled ? foto.surfaces.rule : foto.status.sold}`,
                background: isCancelled
                  ? foto.surfaces.inset
                  : alpha(foto.status.sold, 0.06),
                color: isCancelled ? foto.ink.mute : foto.status.sold,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '-0.005em',
                cursor: isCancelled ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'background 120ms ease, transform 120ms ease',
                '&:hover:not(:disabled)': {
                  background: alpha(foto.status.sold, 0.1),
                  transform: 'translateY(-1px)',
                },
              }}
            >
              <Ban size={15} strokeWidth={1.8} aria-hidden />
              {isCancelled ? 'Venta cancelada' : 'Cancelar venta'}
            </Box>
          </Box>
        </Box>

        {/* ───── RIGHT pane (Kardex comprobante) ───── */}
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
            Comprobante archivado
          </Box>

          <Box ref={kardexRef}>
            <KardexPreview
              items={kardexItems}
              subtotalCop={subtotal}
              descuentoCop={
                sale.descuentoCOP ??
                Math.max(0, subtotal - sale.precioAcordadoCOP)
              }
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
                buyer
                  ? {
                      nombre: buyer.nombre,
                      nit: buyer.nit ?? undefined,
                      cedula: buyer.cedula ?? undefined,
                      email: buyer.email ?? undefined,
                      tipo: buyer.tipo,
                    }
                  : null
              }
              sale={{
                id: sale.saleId,
                precioCop: sale.precioAcordadoCOP,
                formaPago: sale.formaPago,
                metodoContado: sale.metodoContado,
              }}
              privacyOn={false}
            />
          </Box>

          <Box
            sx={{
              marginTop: '14px',
              fontSize: 11,
              color: 'rgba(255,255,255,0.55)',
              letterSpacing: '0.01em',
              fontFamily: fontFamilies.system,
            }}
          >
            Comprobante archivado para {sale.saleId}
          </Box>
        </Box>
      </Box>

      <CancelVentaDialog
        open={showCancel}
        saleId={sale.saleId}
        onCancel={() => setShowCancel(false)}
        onConfirm={handleConfirmCancel}
      />
    </Box>
  );
}

// ─── Local helpers ───────────────────────────────────────────────────────

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

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
  foto: ReturnType<typeof getFoto>;
  mono?: boolean;
  strong?: boolean;
}

function DetailRow({
  label,
  value,
  foto,
  mono = false,
  strong = false,
}: DetailRowProps) {
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
          fontSize: 12,
          fontWeight: 500,
          color: foto.ink.secondary,
          letterSpacing: '-0.005em',
        }}
      >
        {label}
      </Box>
      <Box
        sx={{
          fontFamily: mono ? fontFamilies.mono : fontFamilies.system,
          fontVariantNumeric: mono ? 'tabular-nums' : undefined,
          fontSize: strong ? 17 : 13,
          fontWeight: strong ? 600 : 500,
          color: strong ? foto.accent.deep : foto.ink.primary,
          letterSpacing: '-0.01em',
          textAlign: 'right',
        }}
      >
        {value}
      </Box>
    </Box>
  );
}

interface DocumentRowProps {
  label: string;
  url: string | undefined;
  openLabel: string;
  /** Button label when no document exists yet (e.g. "Subir Kardex"). */
  uploadLabel: string;
  /** Suppress the upload affordance (e.g. cancelled sale = read-only). */
  disabled?: boolean;
  foto: ReturnType<typeof getFoto>;
  /** Upload the picked file + persist its URL. Owns its own error toast. */
  onUpload: (file: File) => Promise<void>;
  /**
   * Optional one-click generate+archive action (Kardex only). When present, a
   * primary "Generar"/"Regenerar" button renders before the file picker so the
   * operator never has to scan/upload a PDF by hand — the on-screen comprobante
   * is captured and archived to Drive directly.
   */
  onGenerate?: () => Promise<void>;
  /** True while `onGenerate` is in flight (drives the "Generando…" label). */
  generating?: boolean;
  /** Label for the generate button (e.g. "Generar Kardex" / "Regenerar"). */
  generateLabel?: string;
}

/**
 * A sale document row (Kardex / Certificado). When a URL exists it links out;
 * either way (unless the sale is cancelled) it exposes a file picker to upload
 * or replace the document — converting the old read-only "Pendiente" dead-end
 * into a one-step recovery. (ISO-audit C6.) The Kardex row additionally gets a
 * primary one-click "Generar" action that rasterizes the live preview → PDF →
 * Drive, so "Pendiente" self-heals without a manual file upload.
 */
function DocumentRow({
  label,
  url,
  openLabel,
  uploadLabel,
  disabled = false,
  foto,
  onUpload,
  onGenerate,
  generating = false,
  generateLabel = 'Generar',
}: DocumentRowProps) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same filename after a failure
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '12px 14px',
        borderRadius: '10px',
        border: `1px solid ${foto.surfaces.rule}`,
        background: foto.surfaces.panel,
      }}
    >
      <Box
        sx={{
          fontSize: 12.5,
          fontWeight: 500,
          color: foto.ink.secondary,
        }}
      >
        {label}
      </Box>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        {url ? (
          <Box
            component="a"
            href={driveDocViewUrl(url)}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '7px',
              border: `1px solid ${foto.accent.primary}`,
              background: foto.accent.soft,
              color: foto.accent.deep,
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'none',
              letterSpacing: '-0.005em',
              transition: 'background 120ms ease',
              '&:hover': { background: alpha(foto.accent.primary, 0.12) },
            }}
          >
            <ExternalLink size={13} strokeWidth={1.8} aria-hidden />
            {openLabel}
          </Box>
        ) : (
          <Box
            sx={{
              fontSize: 11.5,
              color: foto.ink.mute,
              fontStyle: 'italic',
              letterSpacing: '0.01em',
            }}
          >
            Pendiente
          </Box>
        )}
        {onGenerate && !disabled ? (
          <Box
            component="button"
            type="button"
            onClick={() => {
              if (!generating && !uploading) void onGenerate();
            }}
            disabled={generating || uploading}
            aria-busy={generating}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '7px',
              border: `1px solid ${foto.accent.primary}`,
              background: foto.accent.primary,
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '-0.005em',
              fontFamily: 'inherit',
              cursor: generating ? 'wait' : 'pointer',
              transition: 'background 120ms ease, transform 120ms ease',
              '&:hover:not(:disabled)': {
                background: foto.accent.deep,
                transform: 'translateY(-1px)',
              },
              '&:disabled': { opacity: 0.7, cursor: 'wait' },
            }}
          >
            <Sparkles size={13} strokeWidth={1.8} aria-hidden />
            {generating ? 'Generando…' : generateLabel}
          </Box>
        ) : null}
        {!disabled ? (
          <Box
            component="label"
            htmlFor={inputId}
            aria-disabled={uploading}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '7px',
              border: `1px solid ${foto.surfaces.edgeStrong}`,
              background: foto.surfaces.inset,
              color: foto.ink.secondary,
              fontSize: 12,
              fontWeight: 600,
              cursor: uploading ? 'wait' : 'pointer',
              letterSpacing: '-0.005em',
              transition: 'background 120ms ease, color 120ms ease',
              '&:hover': {
                background: foto.surfaces.canvas,
                color: foto.ink.primary,
              },
            }}
          >
            <Upload size={13} strokeWidth={1.8} aria-hidden />
            {uploading
              ? 'Subiendo…'
              : url
                ? 'Reemplazar'
                : onGenerate
                  ? 'Subir archivo'
                  : uploadLabel}
            <Box
              component="input"
              id={inputId}
              type="file"
              accept=".pdf,image/*"
              disabled={uploading}
              onChange={handlePick}
              sx={{ display: 'none' }}
            />
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
