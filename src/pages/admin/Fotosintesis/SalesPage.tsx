import { useDeferredValue, useMemo, useState } from 'react';
import { Box, IconButton } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Link } from 'react-router-dom';
import {
  Search,
  X,
  ChevronRight,
  Plus,
  ArrowRight,
  AlertTriangle,
  FileWarning,
  Clock,
  ExternalLink,
  Ban,
  CheckCircle2,
} from 'lucide-react';
import { getFoto, fontFamilies } from '../../../design-system';
import { useConvexQuery, convexApi } from '../../../lib/convex-safe';
import { readFreshSessionToken } from '../../../utils/sessionToken';
import { FOTO_TOPBAR_HEIGHT } from './components/FotoTopbar';
import { BOVEDAS } from '../../../data/vocabularies';
import { resolveItemThumbnail } from './utils/resolveThumbnail';
import { driveDocViewUrl } from './utils/uploadItemMedia';
import { useBatchThumbnails } from '../../../hooks/useBatchThumbnails';
import type { Doc } from '../../../../convex/_generated/dataModel';

/**
 * Fotosíntesis · Ventas — the sales summary dashboard.
 *
 * Home only surfaces the last few sales in "Actividad reciente"; this page is
 * the full read-only ledger + analytics destination. Everything derives from
 * `sales.list` (newest-first full docs) joined against `clients.list` (buyer
 * name/tipo) and `ambassadors.list` (ambassador name). A prominent single-sale
 * summary block (default VC-0001) reads its item names/thumbs via
 * `products.getManyByItemIds` and its commission via `commissions.getBySale`.
 *
 * Read-only index — a row is a plain Link to the existing sale detail route
 * (`/admin/fotosintesis/sales/{saleId}`). No mutations here.
 */

// ─── Local COP / date / label helpers (self-contained) ───────────────────

const COP_FORMATTER = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** es-CO COP. Returns "—" for non-numbers so it is never called mid-loading. */
function formatCop(value: number | undefined | null): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return COP_FORMATTER.format(value);
}

function formatDateShort(iso: string | undefined | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  } catch {
    return '—';
  }
}

function formatDateLong(iso: string | undefined | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function formaPagoLabel(formaPago: string): string {
  switch (formaPago) {
    case 'contado':
      return 'Contado';
    case 'credito':
      return 'Crédito';
    case 'esmereogenesis':
      return 'Esmereogénesis';
    case 'canje':
      return 'Canje';
    case 'bajo_pedido':
      return 'Bajo pedido';
    case 'consignacion':
      return 'Consignación';
    default:
      return formaPago;
  }
}

const FORMA_PAGO_ORDER = [
  'contado',
  'credito',
  'esmereogenesis',
  'canje',
  'bajo_pedido',
  'consignacion',
] as const;

function estadoLabel(estado: string): string {
  switch (estado) {
    case 'confirmada':
      return 'Confirmada';
    case 'reservada':
      return 'Reservada';
    case 'cancelada':
      return 'Cancelada';
    default:
      return estado;
  }
}

/**
 * Normalize an operator-typed sale code into the canonical `V{SEDE}-{NNNN}`
 * (or legacy `V-{NNNN}`) form so it matches `sales.saleId`. Accepts loose
 * inputs: "vc-1", "VC-001", "VC0001", "v-1" → "VC-0001" / "V-0001".
 */
function normalizeSaleCode(raw: string): string {
  const t = (raw ?? '').trim().toUpperCase().replace(/\s+/g, '');
  if (!t) return '';
  // V, optional sede letters, optional dash, optional leading zeros, digits.
  const m = t.match(/^V([A-Z]*)-?0*(\d+)$/);
  if (!m) return t; // leave unrecognised input as-is (uppercased) → no match
  const sede = m[1];
  const num = m[2].padStart(4, '0');
  return sede ? `V${sede}-${num}` : `V-${num}`;
}

type FotoT = ReturnType<typeof getFoto>;
type Sale = Doc<'sales'>;
type Client = Doc<'clients'>;
type Ambassador = Doc<'ambassadors'>;

/** A sale joined with its buyer + ambassador display fields for the ledger. */
interface SaleRow {
  sale: Sale;
  buyerName: string;
  buyerTipo: string;
  ambassadorName: string | null;
  itemCount: number;
  missingKardex: boolean;
  missingCert: boolean;
  overdue: boolean;
  needsSync: boolean;
}

const MS_WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * A sale counts as realized revenue only once `confirmada` (paid). `reservada`
 * (unpaid web order — may be abandoned; see convex/ghl.ts) and `cancelada` are
 * excluded from every money/activity aggregate (KPIs, ranking, ritmo, forma).
 * `reservada` still appears in the ledger so operators can find pending orders.
 */
const isRealizedSale = (estado: Sale['estado']): boolean =>
  estado === 'confirmada';

// ============================================================================

export default function FotosintesisSalesPage() {
  const foto = getFoto('light');
  const { thumbnails: batchThumbs } = useBatchThumbnails();

  // --- Data ----------------------------------------------------------------
  const sessionToken = readFreshSessionToken() ?? undefined;
  const sales = useConvexQuery(convexApi.sales.list, { sessionToken });
  const clients = useConvexQuery(convexApi.clients.list, { sessionToken });
  const ambassadors = useConvexQuery(convexApi.ambassadors.list, {});

  const salesLoading = sales === undefined;

  // --- Join maps -----------------------------------------------------------
  const clientById = useMemo(() => {
    const map = new Map<string, Client>();
    for (const c of clients ?? []) map.set(c._id, c);
    return map;
  }, [clients]);

  const ambassadorById = useMemo(() => {
    const map = new Map<string, Ambassador>();
    for (const a of ambassadors ?? []) map.set(a._id, a);
    return map;
  }, [ambassadors]);

  const now = useMemo(() => new Date(), []);

  // --- Row model (sale + joined display fields) ----------------------------
  const rows: SaleRow[] = useMemo(() => {
    return (sales ?? []).map((sale) => {
      const client = clientById.get(sale.clientId);
      const ambassador = sale.ambassadorId
        ? ambassadorById.get(sale.ambassadorId)
        : undefined;
      const overdue =
        sale.formaPago === 'credito' &&
        sale.estado !== 'cancelada' &&
        !!sale.fechaVencimiento &&
        (() => {
          const due = new Date(sale.fechaVencimiento as string);
          return !Number.isNaN(due.getTime()) && due.getTime() < now.getTime();
        })();
      return {
        sale,
        buyerName: client?.nombre ?? 'Cliente —',
        buyerTipo: client?.tipo === 'embajador' ? 'Embajador' : 'Cliente final',
        ambassadorName: ambassador?.nombre ?? null,
        itemCount:
          (sale.itemIds?.length ?? 0) + (sale.manualItems?.length ?? 0),
        missingKardex: sale.estado !== 'cancelada' && !sale.carnetUrl,
        missingCert: sale.estado !== 'cancelada' && !sale.certificadoUrl,
        overdue,
        needsSync: sale.syncStatus !== 'synced',
      };
    });
  }, [sales, clientById, ambassadorById, now]);

  // --- KPIs ----------------------------------------------------------------
  const kpis = useMemo(() => {
    const y = now.getFullYear();
    const m = now.getMonth();
    let monthCount = 0;
    let monthSum = 0;
    let allActiveCount = 0;
    let allActiveSum = 0;
    let pendingSync = 0;
    // "Saldo por cobrar" — APPROXIMATION: full totalCOP of every non-cancelled
    // credito + esmereogenesis sale. It does NOT subtract any partial payments
    // (there is no payments ledger to read), so it reads as an upper bound of
    // money still owed, not a reconciled balance.
    let receivable = 0;
    for (const r of rows) {
      const s = r.sale;
      if (r.needsSync) pendingSync += 1;
      if (isRealizedSale(s.estado)) {
        allActiveCount += 1;
        allActiveSum += s.totalCOP ?? 0;
        if (s.formaPago === 'credito' || s.formaPago === 'esmereogenesis') {
          receivable += s.totalCOP ?? 0;
        }
        const d = new Date(s.fechaVenta);
        if (
          !Number.isNaN(d.getTime()) &&
          d.getFullYear() === y &&
          d.getMonth() === m
        ) {
          monthCount += 1;
          monthSum += s.totalCOP ?? 0;
        }
      }
    }
    // Ticket promedio across ALL non-cancelled sales (stable early in the
    // month when there may be no sales yet).
    const ticketAvg = allActiveCount > 0 ? allActiveSum / allActiveCount : 0;
    return {
      monthCount,
      monthSum,
      ticketAvg,
      hasTicket: allActiveCount > 0,
      pendingSync,
      receivable,
    };
  }, [rows, now]);

  // --- Attention items -----------------------------------------------------
  const attention = useMemo(() => {
    const overdue = rows.filter((r) => r.overdue);
    const missingDocs = rows.filter(
      (r) => !r.overdue && (r.missingKardex || r.missingCert),
    );
    return {
      overdueCount: overdue.length,
      missingKardexCount: rows.filter((r) => r.missingKardex).length,
      missingCertCount: rows.filter((r) => r.missingCert).length,
      // Overdue first (most urgent), then missing-doc sales.
      list: [...overdue, ...missingDocs].slice(0, 8),
    };
  }, [rows]);

  // --- Ranking por embajador ----------------------------------------------
  const embajadorRanking = useMemo(() => {
    const acc = new Map<string, { count: number; sum: number }>();
    for (const r of rows) {
      if (!isRealizedSale(r.sale.estado)) continue;
      const id = r.sale.ambassadorId;
      if (!id) continue;
      const cur = acc.get(id) ?? { count: 0, sum: 0 };
      cur.count += 1;
      cur.sum += r.sale.totalCOP ?? 0;
      acc.set(id, cur);
    }
    return [...acc.entries()]
      .map(([id, v]) => ({
        id,
        name: ambassadorById.get(id)?.nombre ?? 'Embajador —',
        count: v.count,
        sum: v.sum,
      }))
      .sort((a, b) => b.sum - a.sum);
  }, [rows, ambassadorById]);

  // --- Ritmo semanal (last 8 weeks by fechaVenta) -------------------------
  const ritmo = useMemo(() => {
    // Bucket boundaries anchored on "now"; bucket 0 = oldest, 7 = current week.
    const buckets = Array.from({ length: 8 }, (_, i) => ({
      count: 0,
      start: new Date(now.getTime() - (7 - i) * MS_WEEK),
    }));
    const oldest = now.getTime() - 8 * MS_WEEK;
    for (const r of rows) {
      if (!isRealizedSale(r.sale.estado)) continue;
      const t = new Date(r.sale.fechaVenta).getTime();
      if (Number.isNaN(t) || t < oldest || t > now.getTime()) continue;
      const idx = Math.min(7, Math.floor((t - oldest) / MS_WEEK));
      buckets[idx].count += 1;
    }
    const max = Math.max(1, ...buckets.map((b) => b.count));
    return { buckets, max };
  }, [rows, now]);

  // --- Forma de pago breakdown --------------------------------------------
  const formaBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    let total = 0;
    for (const r of rows) {
      if (!isRealizedSale(r.sale.estado)) continue;
      const key = r.sale.formaPago;
      counts.set(key, (counts.get(key) ?? 0) + 1);
      total += 1;
    }
    const known = FORMA_PAGO_ORDER.map((k) => ({
      key: k as string,
      count: counts.get(k) ?? 0,
    }));
    // Any operator write-in forma not in the canonical six.
    const extras = [...counts.entries()]
      .filter(([k]) => !FORMA_PAGO_ORDER.includes(k as never))
      .map(([k, count]) => ({ key: k, count }));
    return { rows: [...known, ...extras], total };
  }, [rows]);

  // --- Ledger filters ------------------------------------------------------
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [estadoFilter, setEstadoFilter] = useState<
    'activa' | 'cancelada' | 'todas'
  >('activa');
  const [sedeFilter, setSedeFilter] = useState('');
  const [formaFilter, setFormaFilter] = useState('');
  const [embajadorFilter, setEmbajadorFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredRows = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return rows.filter((r) => {
      const s = r.sale;
      if (estadoFilter === 'activa' && s.estado === 'cancelada') return false;
      if (estadoFilter === 'cancelada' && s.estado !== 'cancelada')
        return false;
      if (sedeFilter && (s.sede ?? '') !== sedeFilter) return false;
      if (formaFilter && s.formaPago !== formaFilter) return false;
      if (embajadorFilter && s.ambassadorId !== embajadorFilter) return false;
      if (dateFrom || dateTo) {
        const day = (s.fechaVenta ?? '').slice(0, 10);
        if (dateFrom && day < dateFrom) return false;
        if (dateTo && day > dateTo) return false;
      }
      if (q) {
        const hay = `${s.saleId} ${r.buyerName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    rows,
    deferredSearch,
    estadoFilter,
    sedeFilter,
    formaFilter,
    embajadorFilter,
    dateFrom,
    dateTo,
  ]);

  const hasActiveFilters =
    !!deferredSearch.trim() ||
    estadoFilter !== 'activa' ||
    !!sedeFilter ||
    !!formaFilter ||
    !!embajadorFilter ||
    !!dateFrom ||
    !!dateTo;

  const clearFilters = () => {
    setSearch('');
    setEstadoFilter('activa');
    setSedeFilter('');
    setFormaFilter('');
    setEmbajadorFilter('');
    setDateFrom('');
    setDateTo('');
  };

  // --- Single-sale summary -------------------------------------------------
  const [saleCodeInput, setSaleCodeInput] = useState('VC-0001');
  const activeCode = useMemo(
    () => normalizeSaleCode(saleCodeInput),
    [saleCodeInput],
  );
  const matchedSale = useMemo(
    () => (sales ?? []).find((s) => s.saleId === activeCode) ?? null,
    [sales, activeCode],
  );

  const matchedItems = useConvexQuery(
    convexApi.products.getManyByItemIds,
    matchedSale && matchedSale.itemIds.length
      ? { itemIds: matchedSale.itemIds }
      : 'skip',
  );
  const matchedCommission = useConvexQuery(
    convexApi.commissions.getBySale,
    matchedSale ? { saleId: matchedSale.saleId } : 'skip',
  );
  const matchedBuyer = matchedSale
    ? clientById.get(matchedSale.clientId)
    : undefined;

  // --- Shared styled tokens ------------------------------------------------
  const monoSx = {
    fontFamily: fontFamilies.mono,
    fontVariantNumeric: 'tabular-nums' as const,
    letterSpacing: '-0.005em',
  } as const;

  const panelSx = {
    background: foto.surfaces.canvas,
    border: `1px solid ${foto.surfaces.rule}`,
    borderRadius: '14px',
    padding: '20px 22px',
  } as const;

  const panelHeadSx = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: '14px',
    gap: '12px',
  } as const;

  const panelHeadTitleSx = {
    fontSize: '9px',
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    color: foto.ink.tertiary,
    fontWeight: 500,
    margin: 0,
  } as const;

  const emptyStateSx = {
    padding: '24px 8px',
    textAlign: 'center' as const,
    color: foto.ink.tertiary,
    fontSize: '12px',
    lineHeight: 1.55,
  } as const;

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <Box
      component="main"
      sx={{
        color: foto.ink.primary,
        background: foto.surfaces.canvas,
        minHeight: `calc(100vh - ${FOTO_TOPBAR_HEIGHT}px)`,
      }}
    >
      {/* ── HEADER BAND ────────────────────────────────────────────────── */}
      <Box
        component="section"
        sx={{
          padding: { xs: '28px 16px 20px', md: '32px 28px 24px' },
          borderBottom: `1px solid ${foto.surfaces.rule}`,
          background: `linear-gradient(180deg, ${foto.surfaces.canvas} 0%, ${foto.surfaces.panel} 100%)`,
        }}
      >
        <Box
          sx={{
            maxWidth: 1320,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
            gap: '24px',
            alignItems: 'end',
          }}
        >
          <Box>
            <Box
              sx={{
                fontSize: '9px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                fontWeight: 500,
                color: foto.ink.tertiary,
              }}
            >
              Atelier · Ventas
            </Box>
            <Box
              component="h1"
              sx={{
                marginTop: '8px',
                fontSize: { xs: '28px', sm: '32px' },
                fontWeight: 600,
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                color: foto.ink.primary,
              }}
            >
              Ventas
            </Box>
            <Box
              component="p"
              sx={{
                marginTop: '10px',
                fontSize: '13.5px',
                color: foto.ink.secondary,
                maxWidth: 560,
                lineHeight: 1.5,
              }}
            >
              El libro completo de ventas — busca por código o comprador, filtra
              por estado, sede, forma de pago o embajador, y abre cualquier
              venta para ver su Kardex y comprobante.
            </Box>
          </Box>

          <Box
            component={Link}
            to="/admin/fotosintesis/sales/new"
            sx={{
              justifySelf: { xs: 'start', md: 'end' },
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '11px 18px',
              borderRadius: '10px',
              background: foto.accent.primary,
              color: foto.ink.inverse,
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '-0.005em',
              textDecoration: 'none',
              transition: 'background 120ms ease, transform 120ms ease',
              '&:hover': {
                background: foto.accent.deep,
                transform: 'translateY(-1px)',
              },
              '&:focus-visible': {
                outline: 'none',
                boxShadow: `0 0 0 3px ${foto.accent.glow}`,
              },
            }}
          >
            <Plus size={16} strokeWidth={2} />
            Nueva venta
          </Box>
        </Box>

        {/* KPI STRIP */}
        <Box
          role="group"
          aria-label="Indicadores de ventas"
          sx={{
            maxWidth: 1320,
            margin: '22px auto 0',
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: '12px',
          }}
        >
          <KpiCard
            loading={salesLoading}
            label="Ventas del mes"
            value={String(kpis.monthCount)}
            sub={salesLoading ? '' : formatCop(kpis.monthSum)}
            foto={foto}
          />
          <KpiCard
            loading={salesLoading}
            label="Ticket promedio"
            value={
              salesLoading || !kpis.hasTicket ? '—' : formatCop(kpis.ticketAvg)
            }
            sub={kpis.hasTicket ? 'por venta activa' : 'sin ventas aún'}
            foto={foto}
          />
          <KpiCard
            loading={salesLoading}
            label="Por sincronizar"
            value={String(kpis.pendingSync)}
            sub={kpis.pendingSync > 0 ? 'requieren push' : 'todo al día'}
            tone={kpis.pendingSync > 0 ? 'alert' : undefined}
            foto={foto}
          />
          <KpiCard
            loading={salesLoading}
            label="Saldo por cobrar"
            value={salesLoading ? '—' : formatCop(kpis.receivable)}
            sub="crédito + esmereogénesis"
            tone={kpis.receivable > 0 ? 'warn' : undefined}
            foto={foto}
          />
        </Box>
      </Box>

      {/* ── SINGLE-SALE SUMMARY + ATTENTION ────────────────────────────── */}
      <Box
        sx={{
          maxWidth: 1320,
          margin: '0 auto',
          padding: { xs: '20px 16px 0', md: '24px 28px 0' },
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1.6fr 1fr' },
          gap: '20px',
        }}
      >
        <SingleSaleBlock
          foto={foto}
          monoSx={monoSx}
          codeInput={saleCodeInput}
          onCodeInput={setSaleCodeInput}
          activeCode={activeCode}
          loading={salesLoading}
          sale={matchedSale}
          buyer={matchedBuyer}
          items={matchedItems}
          commission={matchedCommission ?? undefined}
          ambassadorName={
            matchedSale?.ambassadorId
              ? (ambassadorById.get(matchedSale.ambassadorId)?.nombre ?? null)
              : null
          }
          batchThumbs={batchThumbs}
        />

        <AttentionPanel
          foto={foto}
          loading={salesLoading}
          attention={attention}
          panelSx={panelSx}
          panelHeadSx={panelHeadSx}
          panelHeadTitleSx={panelHeadTitleSx}
          monoSx={monoSx}
        />
      </Box>

      {/* ── MAIN GRID: ledger (left) + analytics (right) ───────────────── */}
      <Box
        sx={{
          maxWidth: 1320,
          margin: '0 auto',
          padding: { xs: '20px 16px 48px', md: '24px 28px 60px' },
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1.6fr 1fr' },
          gap: '24px',
        }}
      >
        {/* LEDGER */}
        <Box sx={{ minWidth: 0 }}>
          <Box
            sx={{
              background: foto.surfaces.canvas,
              border: `1px solid ${foto.surfaces.rule}`,
              borderRadius: '14px',
              overflow: 'hidden',
            }}
          >
            {/* Search */}
            <Box
              sx={{
                padding: '14px 18px',
                borderBottom: `1px solid ${foto.surfaces.edge}`,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <Search size={16} strokeWidth={1.8} color={foto.ink.tertiary} />
              <Box
                component="input"
                type="search"
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearch(e.target.value)
                }
                placeholder="Buscar por código o comprador…"
                aria-label="Buscar ventas"
                sx={{
                  flex: 1,
                  minWidth: 0,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  color: foto.ink.primary,
                  '&::placeholder': { color: foto.ink.mute },
                }}
              />
              {search ? (
                <IconButton
                  size="small"
                  onClick={() => setSearch('')}
                  aria-label="Limpiar búsqueda"
                  sx={{ color: foto.ink.tertiary }}
                >
                  <X size={14} />
                </IconButton>
              ) : null}
            </Box>

            {/* Filters */}
            <Box
              sx={{
                padding: '12px 18px',
                borderBottom: `1px solid ${foto.surfaces.edge}`,
                background: foto.surfaces.panel,
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px',
                alignItems: 'center',
              }}
            >
              <FilterSelect
                label="Estado"
                value={estadoFilter}
                onChange={(v) =>
                  setEstadoFilter(v as 'activa' | 'cancelada' | 'todas')
                }
                options={[
                  { value: 'activa', label: 'Activas' },
                  { value: 'cancelada', label: 'Canceladas' },
                  { value: 'todas', label: 'Todas' },
                ]}
                active={estadoFilter !== 'activa'}
                foto={foto}
              />
              <FilterSelect
                label="Sede"
                value={sedeFilter}
                onChange={setSedeFilter}
                options={[
                  { value: '', label: 'Todas las sedes' },
                  ...BOVEDAS.map((b) => ({
                    value: b.code,
                    label: b.label,
                  })),
                  // Custom write-in sedes present in the data but not in the
                  // canonical BOVEDAS list — otherwise they'd be unfilterable.
                  ...Array.from(
                    new Set(
                      rows
                        .map((r) => r.sale.sede)
                        .filter(
                          (s): s is string =>
                            !!s && !BOVEDAS.some((b) => b.code === s),
                        ),
                    ),
                  ).map((s) => ({ value: s, label: s })),
                ]}
                active={!!sedeFilter}
                foto={foto}
              />
              <FilterSelect
                label="Forma de pago"
                value={formaFilter}
                onChange={setFormaFilter}
                options={[
                  { value: '', label: 'Todas las formas' },
                  ...FORMA_PAGO_ORDER.map((f) => ({
                    value: f,
                    label: formaPagoLabel(f),
                  })),
                ]}
                active={!!formaFilter}
                foto={foto}
              />
              <FilterSelect
                label="Embajador"
                value={embajadorFilter}
                onChange={setEmbajadorFilter}
                options={[
                  { value: '', label: 'Todos los embajadores' },
                  ...(ambassadors ?? []).map((a) => ({
                    value: a._id,
                    label: a.nombre,
                  })),
                ]}
                active={!!embajadorFilter}
                foto={foto}
              />
              <DateField
                label="Desde"
                value={dateFrom}
                onChange={setDateFrom}
                foto={foto}
              />
              <DateField
                label="Hasta"
                value={dateTo}
                onChange={setDateTo}
                foto={foto}
              />
              {hasActiveFilters ? (
                <Box
                  component="button"
                  type="button"
                  onClick={clearFilters}
                  sx={{
                    appearance: 'none',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: foto.accent.deep,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 4px',
                    '&:hover': { color: foto.accent.primary },
                    '&:focus-visible': {
                      outline: 'none',
                      boxShadow: `0 0 0 3px ${foto.accent.glow}`,
                      borderRadius: '4px',
                    },
                  }}
                >
                  <X size={12} strokeWidth={2} /> Limpiar filtros
                </Box>
              ) : null}
            </Box>

            {/* Column headers (desktop) */}
            <Box
              sx={{
                display: { xs: 'none', md: 'grid' },
                gridTemplateColumns:
                  '70px 82px minmax(0, 1.3fr) 44px 116px 112px 118px',
                gap: '12px',
                alignItems: 'center',
                padding: '10px 18px',
                boxSizing: 'border-box',
                borderBottom: `1px solid ${foto.surfaces.edge}`,
                fontSize: '9px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: foto.ink.tertiary,
                fontWeight: 500,
                background: foto.surfaces.panel,
              }}
            >
              <span>Venta</span>
              <span>Fecha</span>
              <span>Comprador</span>
              <span style={{ textAlign: 'right' }}>Ítems</span>
              <span style={{ textAlign: 'right' }}>Total</span>
              <span>Forma</span>
              <span style={{ textAlign: 'right' }}>Estado</span>
            </Box>

            {/* Rows */}
            {salesLoading ? (
              <Box sx={emptyStateSx} aria-busy="true">
                <Box component="span" aria-label="Cargando ventas">
                  Cargando ventas…
                </Box>
              </Box>
            ) : filteredRows.length === 0 ? (
              <Box sx={emptyStateSx}>
                {hasActiveFilters ? (
                  <>Sin resultados para los filtros actuales.</>
                ) : rows.length === 0 ? (
                  <>
                    Aún no hay ventas registradas.
                    <br />
                    <Box
                      component={Link}
                      to="/admin/fotosintesis/sales/new"
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '10px',
                        color: foto.accent.deep,
                        fontWeight: 600,
                        textDecoration: 'none',
                        '&:hover': { color: foto.accent.primary },
                      }}
                    >
                      <Plus size={12} /> Registrar primera venta
                    </Box>
                  </>
                ) : (
                  <>No hay ventas en este estado.</>
                )}
              </Box>
            ) : (
              <Box role="list">
                {filteredRows.map((row) => (
                  <LedgerRow
                    key={row.sale._id}
                    row={row}
                    foto={foto}
                    monoSx={monoSx}
                  />
                ))}
              </Box>
            )}
          </Box>

          {!salesLoading && filteredRows.length > 0 ? (
            <Box
              sx={{
                marginTop: '10px',
                fontSize: '11px',
                color: foto.ink.tertiary,
                textAlign: 'right',
                ...monoSx,
              }}
            >
              {filteredRows.length} de {rows.length} ventas
            </Box>
          ) : null}
        </Box>

        {/* ANALYTICS (right) */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Ventas por embajador */}
          <Box sx={panelSx}>
            <Box sx={panelHeadSx}>
              <Box component="h2" sx={panelHeadTitleSx}>
                Ventas por embajador
              </Box>
              <Box sx={{ fontSize: '11px', color: foto.ink.tertiary }}>
                acumulado
              </Box>
            </Box>
            {salesLoading ? (
              <Box sx={emptyStateSx}>Cargando…</Box>
            ) : embajadorRanking.length === 0 ? (
              <Box sx={emptyStateSx}>
                Aún no hay ventas atribuidas a un embajador.
              </Box>
            ) : (
              <Box
                sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
              >
                {embajadorRanking.slice(0, 6).map((e, idx) => {
                  const isActive = embajadorFilter === e.id;
                  return (
                    <Box
                      key={e.id}
                      component="button"
                      type="button"
                      aria-pressed={isActive}
                      aria-label={`Filtrar ventas por ${e.name}: ${e.count} ventas, ${formatCop(e.sum)}`}
                      onClick={() => setEmbajadorFilter(isActive ? '' : e.id)}
                      sx={{
                        appearance: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr auto',
                        gap: '10px',
                        alignItems: 'center',
                        padding: '9px 8px',
                        marginX: '-8px',
                        borderRadius: '8px',
                        background: isActive ? foto.accent.soft : 'transparent',
                        transition: 'background 120ms ease',
                        '&:hover': { background: foto.surfaces.inset },
                        '&:focus-visible': {
                          outline: 'none',
                          boxShadow: `0 0 0 3px ${foto.accent.glow}`,
                        },
                      }}
                    >
                      <Box
                        sx={{
                          ...monoSx,
                          width: 20,
                          fontSize: '11px',
                          fontWeight: 600,
                          color: foto.ink.tertiary,
                          textAlign: 'center',
                        }}
                      >
                        {idx + 1}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Box
                          sx={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: isActive
                              ? foto.accent.deep
                              : foto.ink.primary,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {e.name}
                        </Box>
                        <Box
                          sx={{
                            ...monoSx,
                            fontSize: '11px',
                            color: foto.ink.tertiary,
                            marginTop: '1px',
                          }}
                        >
                          {e.count} {e.count === 1 ? 'venta' : 'ventas'}
                        </Box>
                      </Box>
                      <Box
                        sx={{
                          ...monoSx,
                          fontSize: '12.5px',
                          fontWeight: 600,
                          color: foto.ink.primary,
                          textAlign: 'right',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatCop(e.sum)}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>

          {/* Ritmo semanal */}
          <Box sx={panelSx}>
            <Box sx={panelHeadSx}>
              <Box component="h2" sx={panelHeadTitleSx}>
                Ritmo semanal
              </Box>
              <Box sx={{ fontSize: '11px', color: foto.ink.tertiary }}>
                últimas 8 semanas
              </Box>
            </Box>
            {salesLoading ? (
              <Box sx={emptyStateSx}>Cargando…</Box>
            ) : rows.length === 0 ? (
              <Box sx={emptyStateSx}>Aún no hay ventas registradas.</Box>
            ) : (
              <Box
                role="img"
                aria-label={`Ventas por semana en las últimas 8 semanas: ${ritmo.buckets
                  .map((b) => b.count)
                  .join(', ')}`}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(8, 1fr)',
                  gap: '6px',
                  alignItems: 'end',
                  height: 96,
                  paddingTop: '4px',
                }}
              >
                {ritmo.buckets.map((b, i) => {
                  const isCurrent = i === ritmo.buckets.length - 1;
                  const h = Math.max(4, (b.count / ritmo.max) * 84);
                  return (
                    <Box
                      key={i}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        height: '100%',
                        gap: '4px',
                      }}
                    >
                      <Box
                        sx={{
                          ...monoSx,
                          fontSize: '10px',
                          color: foto.ink.tertiary,
                          lineHeight: 1,
                        }}
                      >
                        {b.count || ''}
                      </Box>
                      <Box
                        sx={{
                          width: '100%',
                          height: `${h}px`,
                          borderRadius: '4px 4px 2px 2px',
                          background: isCurrent
                            ? foto.accent.primary
                            : b.count > 0
                              ? alpha(foto.accent.primary, 0.35)
                              : foto.surfaces.inset2,
                        }}
                      />
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>

          {/* Forma de pago */}
          <Box sx={panelSx}>
            <Box sx={panelHeadSx}>
              <Box component="h2" sx={panelHeadTitleSx}>
                Forma de pago
              </Box>
              <Box sx={{ fontSize: '11px', color: foto.ink.tertiary }}>
                ventas activas
              </Box>
            </Box>
            {salesLoading ? (
              <Box sx={emptyStateSx}>Cargando…</Box>
            ) : formaBreakdown.total === 0 ? (
              <Box sx={emptyStateSx}>Aún no hay ventas activas.</Box>
            ) : (
              <Box
                sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                {formaBreakdown.rows
                  .filter((f) => f.count > 0)
                  .map((f) => {
                    const share = f.count / formaBreakdown.total;
                    return (
                      <Box key={f.key}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            marginBottom: '5px',
                          }}
                        >
                          <Box
                            sx={{
                              fontSize: '12px',
                              fontWeight: 500,
                              color: foto.ink.secondary,
                            }}
                          >
                            {formaPagoLabel(f.key)}
                          </Box>
                          <Box
                            sx={{
                              ...monoSx,
                              fontSize: '11.5px',
                              color: foto.ink.tertiary,
                            }}
                          >
                            {f.count} · {Math.round(share * 100)}%
                          </Box>
                        </Box>
                        <Box
                          sx={{
                            height: 6,
                            borderRadius: '999px',
                            background: foto.surfaces.inset,
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            sx={{
                              width: `${Math.max(2, share * 100)}%`,
                              height: '100%',
                              borderRadius: '999px',
                              background: foto.accent.primary,
                            }}
                          />
                        </Box>
                      </Box>
                    );
                  })}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ============================================================================
// Internal components
// ============================================================================

interface KpiCardProps {
  loading: boolean;
  label: string;
  value: string;
  sub?: string;
  tone?: 'warn' | 'alert';
  foto: FotoT;
}

function KpiCard({ loading, label, value, sub, tone, foto }: KpiCardProps) {
  const valueColor =
    tone === 'alert'
      ? foto.status.sold
      : tone === 'warn'
        ? foto.status.consigned
        : foto.ink.primary;
  return (
    <Box
      sx={{
        background: foto.surfaces.canvas,
        border: `1px solid ${foto.surfaces.rule}`,
        borderRadius: '12px',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          fontSize: '9px',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          fontWeight: 500,
          color: foto.ink.tertiary,
        }}
      >
        {label}
      </Box>
      {loading ? (
        <Box
          aria-label="Cargando"
          sx={{
            marginTop: '4px',
            width: 64,
            height: 24,
            borderRadius: '6px',
            background: foto.surfaces.inset,
          }}
        />
      ) : (
        <Box
          sx={{
            fontFamily: fontFamilies.mono,
            fontVariantNumeric: 'tabular-nums',
            fontSize: '24px',
            fontWeight: 300,
            letterSpacing: '-0.035em',
            lineHeight: 1,
            color: valueColor,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {value}
        </Box>
      )}
      {sub && !loading ? (
        <Box
          sx={{
            fontSize: '10.5px',
            color: foto.ink.tertiary,
            fontFamily: fontFamilies.mono,
            fontVariantNumeric: 'tabular-nums',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {sub}
        </Box>
      ) : null}
    </Box>
  );
}

interface EstadoChipProps {
  estado: string;
  foto: FotoT;
}

function EstadoChip({ estado, foto }: EstadoChipProps) {
  const color =
    estado === 'confirmada'
      ? foto.status.available
      : estado === 'cancelada'
        ? foto.status.sold
        : foto.status.consigned;
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 9px',
        borderRadius: '999px',
        background: alpha(color, 0.1),
        color,
        fontSize: '10.5px',
        fontWeight: 600,
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />
      {estadoLabel(estado)}
    </Box>
  );
}

interface LedgerRowProps {
  row: SaleRow;
  foto: FotoT;
  monoSx: Record<string, unknown>;
}

function LedgerRow({ row, foto, monoSx }: LedgerRowProps) {
  const { sale } = row;
  const flags: React.ReactNode[] = [];
  if (row.needsSync) {
    flags.push(
      <FlagPill
        key="sync"
        tone={foto.status.consigned}
        title="Pendiente de sincronizar"
      >
        Sync
      </FlagPill>,
    );
  }
  if (row.overdue) {
    flags.push(
      <FlagPill key="due" tone={foto.status.sold} title="Crédito vencido">
        Vencida
      </FlagPill>,
    );
  }
  if (row.missingKardex || row.missingCert) {
    flags.push(
      <FlagPill
        key="doc"
        tone={foto.ink.tertiary}
        title="Documentos pendientes"
      >
        Docs
      </FlagPill>,
    );
  }

  return (
    <Box
      component={Link}
      to={`/admin/fotosintesis/sales/${sale.saleId}`}
      role="listitem"
      aria-label={`Venta ${sale.saleId}, ${row.buyerName}, ${formatCop(sale.totalCOP)}, ${estadoLabel(sale.estado)}`}
      sx={{
        width: '100%',
        boxSizing: 'border-box',
        textDecoration: 'none',
        background: foto.surfaces.canvas,
        borderBottom: `1px solid ${foto.surfaces.edge}`,
        padding: '14px 18px',
        display: 'grid',
        gridTemplateColumns: {
          xs: '70px minmax(0, 1fr) auto',
          md: '70px 82px minmax(0, 1.3fr) 44px 116px 112px 118px',
        },
        gap: '12px',
        alignItems: 'center',
        color: foto.ink.primary,
        fontFamily: 'inherit',
        transition: 'background 120ms ease',
        '& .saleId': {
          transition: 'background 120ms ease, color 120ms ease',
        },
        '&:hover': { background: foto.surfaces.panel },
        '&:hover .saleId': {
          background: foto.accent.primary,
          color: foto.ink.inverse,
        },
        '&:focus-visible': {
          outline: 'none',
          boxShadow: `inset 0 0 0 2px ${foto.accent.glow}`,
        },
      }}
    >
      {/* Sale ID chip */}
      <Box
        className="saleId"
        sx={{
          ...monoSx,
          width: 62,
          padding: '6px 0',
          textAlign: 'center',
          background: foto.accent.soft,
          color: foto.accent.deep,
          borderRadius: '7px',
          fontSize: '11px',
          fontWeight: 600,
        }}
      >
        {sale.saleId}
      </Box>

      {/* Fecha (desktop) */}
      <Box
        sx={{
          display: { xs: 'none', md: 'block' },
          ...monoSx,
          fontSize: '12px',
          color: foto.ink.secondary,
        }}
      >
        {formatDateShort(sale.fechaVenta)}
      </Box>

      {/* Comprador */}
      <Box sx={{ minWidth: 0 }}>
        <Box
          sx={{
            fontSize: '13.5px',
            fontWeight: 600,
            color: foto.ink.primary,
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {row.buyerName}
        </Box>
        <Box
          sx={{
            fontSize: '11.5px',
            color: foto.ink.tertiary,
            marginTop: '2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {row.buyerTipo}
          {row.ambassadorName ? ` · ${row.ambassadorName}` : ''}
          {/* Mobile: fold total + forma into the sub-line */}
          <Box component="span" sx={{ display: { xs: 'inline', md: 'none' } }}>
            {' · '}
            <Box component="span" sx={{ ...monoSx, color: foto.ink.secondary }}>
              {formatCop(sale.totalCOP)}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Ítems (desktop) */}
      <Box
        sx={{
          display: { xs: 'none', md: 'block' },
          ...monoSx,
          fontSize: '12.5px',
          color: foto.ink.secondary,
          textAlign: 'right',
        }}
      >
        {row.itemCount}
      </Box>

      {/* Total (desktop) */}
      <Box
        sx={{
          display: { xs: 'none', md: 'block' },
          ...monoSx,
          fontSize: '12.5px',
          fontWeight: 600,
          color: foto.ink.primary,
          textAlign: 'right',
        }}
      >
        {formatCop(sale.totalCOP)}
      </Box>

      {/* Forma (desktop) */}
      <Box
        sx={{
          display: { xs: 'none', md: 'block' },
          fontSize: '12px',
          color: foto.ink.secondary,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {formaPagoLabel(sale.formaPago)}
      </Box>

      {/* Estado + flags (desktop) */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '5px',
        }}
      >
        <EstadoChip estado={sale.estado} foto={foto} />
        {flags.length > 0 ? (
          <Box
            sx={{
              display: 'flex',
              gap: '4px',
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            {flags}
          </Box>
        ) : null}
      </Box>

      {/* Chevron (mobile only) */}
      <Box
        aria-hidden="true"
        sx={{
          display: { xs: 'inline-flex', md: 'none' },
          alignItems: 'center',
          justifyContent: 'center',
          color: foto.ink.mute,
        }}
      >
        <ChevronRight size={16} />
      </Box>
    </Box>
  );
}

interface FlagPillProps {
  tone: string;
  title: string;
  children: React.ReactNode;
}

function FlagPill({ tone, title, children }: FlagPillProps) {
  return (
    <Box
      component="span"
      title={title}
      sx={{
        fontSize: '9px',
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        padding: '2px 6px',
        borderRadius: '5px',
        background: alpha(tone, 0.1),
        color: tone,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Box>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  active: boolean;
  foto: FotoT;
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  active,
  foto,
}: FilterSelectProps) {
  return (
    <Box
      component="label"
      sx={{ display: 'inline-flex', flexDirection: 'column', gap: '3px' }}
    >
      <Box
        component="span"
        sx={{
          fontSize: '8.5px',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          fontWeight: 500,
          color: foto.ink.tertiary,
          paddingLeft: '2px',
        }}
      >
        {label}
      </Box>
      <Box
        component="select"
        value={value}
        aria-label={label}
        aria-current={active ? 'true' : undefined}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
          onChange(e.target.value)
        }
        sx={{
          appearance: 'none',
          fontFamily: 'inherit',
          fontSize: '12px',
          fontWeight: 500,
          padding: '7px 26px 7px 10px',
          borderRadius: '8px',
          border: `1px solid ${active ? foto.accent.primary : foto.surfaces.edgeStrong}`,
          background: active ? foto.accent.soft : foto.surfaces.canvas,
          color: active ? foto.accent.deep : foto.ink.secondary,
          cursor: 'pointer',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%235F6764' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
          '&:focus-visible': {
            outline: 'none',
            boxShadow: `0 0 0 3px ${foto.accent.glow}`,
          },
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Box>
    </Box>
  );
}

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  foto: FotoT;
}

function DateField({ label, value, onChange, foto }: DateFieldProps) {
  const active = !!value;
  return (
    <Box
      component="label"
      sx={{ display: 'inline-flex', flexDirection: 'column', gap: '3px' }}
    >
      <Box
        component="span"
        sx={{
          fontSize: '8.5px',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          fontWeight: 500,
          color: foto.ink.tertiary,
          paddingLeft: '2px',
        }}
      >
        {label}
      </Box>
      <Box
        component="input"
        type="date"
        value={value}
        aria-label={`${label} (fecha de venta)`}
        aria-current={active ? 'true' : undefined}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.value)
        }
        sx={{
          fontFamily: 'inherit',
          fontSize: '12px',
          fontWeight: 500,
          padding: '6px 10px',
          borderRadius: '8px',
          border: `1px solid ${active ? foto.accent.primary : foto.surfaces.edgeStrong}`,
          background: active ? foto.accent.soft : foto.surfaces.canvas,
          color: active ? foto.accent.deep : foto.ink.secondary,
          '&:focus-visible': {
            outline: 'none',
            boxShadow: `0 0 0 3px ${foto.accent.glow}`,
          },
        }}
      />
    </Box>
  );
}

interface AttentionData {
  overdueCount: number;
  missingKardexCount: number;
  missingCertCount: number;
  list: SaleRow[];
}

interface AttentionPanelProps {
  foto: FotoT;
  loading: boolean;
  attention: AttentionData;
  panelSx: Record<string, unknown>;
  panelHeadSx: Record<string, unknown>;
  panelHeadTitleSx: Record<string, unknown>;
  monoSx: Record<string, unknown>;
}

function AttentionPanel({
  foto,
  loading,
  attention,
  panelSx,
  panelHeadSx,
  panelHeadTitleSx,
  monoSx,
}: AttentionPanelProps) {
  const totalAttention =
    attention.overdueCount +
    attention.missingKardexCount +
    attention.missingCertCount;
  return (
    <Box sx={panelSx}>
      <Box sx={panelHeadSx}>
        <Box component="h2" sx={panelHeadTitleSx}>
          Requieren atención
        </Box>
        {!loading ? (
          <Box sx={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <SummaryTag
              icon={<Clock size={12} strokeWidth={2} />}
              count={attention.overdueCount}
              tone={foto.status.sold}
              label="vencidas"
              foto={foto}
            />
            <SummaryTag
              icon={<FileWarning size={12} strokeWidth={2} />}
              count={attention.missingKardexCount}
              tone={foto.status.consigned}
              label="sin Kardex"
              foto={foto}
            />
            <SummaryTag
              icon={<AlertTriangle size={12} strokeWidth={2} />}
              count={attention.missingCertCount}
              tone={foto.ink.tertiary}
              label="sin cert."
              foto={foto}
            />
          </Box>
        ) : null}
      </Box>

      {loading ? (
        <Box
          sx={{
            padding: '20px 8px',
            textAlign: 'center',
            color: foto.ink.tertiary,
            fontSize: '12px',
          }}
        >
          Cargando…
        </Box>
      ) : totalAttention === 0 ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 8px',
            color: foto.status.available,
            fontSize: '12.5px',
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={16} strokeWidth={1.8} />
          Todo al día — sin ventas pendientes.
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {attention.list.map((r) => {
            const reasons: string[] = [];
            if (r.overdue) reasons.push('Crédito vencido');
            if (r.missingKardex) reasons.push('Falta Kardex');
            if (r.missingCert) reasons.push('Falta certificado');
            const tone = r.overdue ? foto.status.sold : foto.status.consigned;
            return (
              <Box
                key={r.sale._id}
                component={Link}
                to={`/admin/fotosintesis/sales/${r.sale.saleId}`}
                aria-label={`Venta ${r.sale.saleId} — ${reasons.join(', ')}`}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  gap: '10px',
                  alignItems: 'center',
                  padding: '10px 8px',
                  marginX: '-8px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'background 120ms ease',
                  '&:hover': { background: foto.surfaces.inset },
                  '&:focus-visible': {
                    outline: 'none',
                    boxShadow: `0 0 0 3px ${foto.accent.glow}`,
                  },
                }}
              >
                <Box
                  aria-hidden
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: tone,
                  }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Box
                    sx={{
                      ...monoSx,
                      fontSize: '12px',
                      fontWeight: 600,
                      color: foto.ink.primary,
                    }}
                  >
                    {r.sale.saleId}
                  </Box>
                  <Box
                    sx={{
                      fontSize: '11px',
                      color: foto.ink.tertiary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {reasons.join(' · ')}
                  </Box>
                </Box>
                <ArrowRight
                  size={13}
                  strokeWidth={1.8}
                  color={foto.ink.tertiary}
                  aria-hidden
                />
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

interface SummaryTagProps {
  icon: React.ReactNode;
  count: number;
  tone: string;
  label: string;
  foto: FotoT;
}

function SummaryTag({ icon, count, tone, label, foto }: SummaryTagProps) {
  const on = count > 0;
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontSize: '11px',
        fontWeight: 600,
        color: on ? tone : foto.ink.mute,
      }}
    >
      <Box sx={{ display: 'inline-flex', color: on ? tone : foto.ink.mute }}>
        {icon}
      </Box>
      <Box component="span" sx={{ fontFamily: fontFamilies.mono }}>
        {count}
      </Box>
      <Box component="span" sx={{ fontWeight: 500, color: foto.ink.tertiary }}>
        {label}
      </Box>
    </Box>
  );
}

// --- Single-sale summary block ---------------------------------------------

interface SingleSaleBlockProps {
  foto: FotoT;
  monoSx: Record<string, unknown>;
  codeInput: string;
  onCodeInput: (v: string) => void;
  activeCode: string;
  loading: boolean;
  sale: Sale | null;
  buyer: Client | undefined;
  items:
    | Array<{
        itemId: string;
        nombre?: string;
        peso?: string;
        color?: string;
        calidad?: string;
        fotoUrl?: string;
      }>
    | undefined;
  commission: Doc<'commissions'> | undefined;
  ambassadorName: string | null;
  batchThumbs: Record<number, { url: string }>;
}

function SingleSaleBlock({
  foto,
  monoSx,
  codeInput,
  onCodeInput,
  activeCode,
  loading,
  sale,
  buyer,
  items,
  commission,
  ambassadorName,
  batchThumbs,
}: SingleSaleBlockProps) {
  const isCancelled = sale?.estado === 'cancelada';
  const descuento =
    sale && typeof sale.descuentoCOP === 'number'
      ? sale.descuentoCOP
      : sale
        ? Math.max(0, sale.precioAcordadoCOP - sale.totalCOP)
        : 0;

  return (
    <Box
      sx={{
        background: foto.surfaces.canvas,
        border: `1px solid ${foto.surfaces.rule}`,
        borderRadius: '16px',
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      {/* Head with code input */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          padding: '16px 20px',
          borderBottom: `1px solid ${foto.surfaces.edge}`,
          background: foto.surfaces.panel,
        }}
      >
        <Box
          component="h2"
          sx={{
            fontSize: '9px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            fontWeight: 500,
            color: foto.ink.tertiary,
            margin: 0,
          }}
        >
          Resumen de venta
        </Box>
        <Box
          component="label"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11px',
            color: foto.ink.tertiary,
          }}
        >
          <Box component="span">Código</Box>
          <Box
            component="input"
            type="text"
            value={codeInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onCodeInput(e.target.value)
            }
            aria-label="Código de venta a mostrar"
            placeholder="VC-0001"
            spellCheck={false}
            sx={{
              ...monoSx,
              width: 110,
              padding: '7px 10px',
              borderRadius: '8px',
              border: `1px solid ${foto.surfaces.edgeStrong}`,
              background: foto.surfaces.canvas,
              color: foto.ink.primary,
              fontSize: '12.5px',
              fontWeight: 600,
              outline: 'none',
              '&:focus-visible': {
                borderColor: foto.accent.primary,
                boxShadow: `0 0 0 3px ${foto.accent.glow}`,
              },
            }}
          />
        </Box>
      </Box>

      {/* Body */}
      {loading ? (
        <Box
          sx={{
            padding: '40px 20px',
            textAlign: 'center',
            color: foto.ink.tertiary,
            fontSize: '13px',
          }}
        >
          Cargando venta…
        </Box>
      ) : !sale ? (
        <Box
          sx={{
            padding: '36px 20px',
            textAlign: 'center',
            color: foto.ink.secondary,
            fontSize: '13.5px',
            lineHeight: 1.6,
          }}
        >
          No encontramos la venta{' '}
          <Box
            component="span"
            sx={{ ...monoSx, fontWeight: 600, color: foto.ink.primary }}
          >
            {activeCode || '—'}
          </Box>
          .
          <br />
          <Box
            component="span"
            sx={{ fontSize: '12px', color: foto.ink.tertiary }}
          >
            Escribe otro código arriba (ej. VC-0001).
          </Box>
        </Box>
      ) : (
        <Box sx={{ padding: '18px 20px 20px' }}>
          {/* Header row: id + fecha + estado */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '16px',
            }}
          >
            <Box>
              <Box
                sx={{
                  ...monoSx,
                  fontSize: '22px',
                  fontWeight: 600,
                  color: foto.ink.primary,
                  letterSpacing: '-0.02em',
                }}
              >
                {sale.saleId}
              </Box>
              <Box
                sx={{
                  fontSize: '12px',
                  color: foto.ink.tertiary,
                  marginTop: '3px',
                }}
              >
                {formatDateLong(sale.fechaVenta)}
                {sale.sede ? ` · Sede ${sale.sede}` : ''}
              </Box>
            </Box>
            <EstadoChip estado={sale.estado} foto={foto} />
          </Box>

          {/* Money grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(4, 1fr)',
              },
              gap: '10px',
              marginBottom: '18px',
            }}
          >
            <MoneyCell
              label="Precio acordado"
              value={formatCop(sale.precioAcordadoCOP)}
              foto={foto}
              monoSx={monoSx}
            />
            <MoneyCell
              label="Descuento"
              value={descuento > 0 ? `− ${formatCop(descuento)}` : formatCop(0)}
              foto={foto}
              monoSx={monoSx}
            />
            <MoneyCell
              label="Total"
              value={formatCop(sale.totalCOP)}
              foto={foto}
              monoSx={monoSx}
              strong
            />
            <MoneyCell
              label="Comisión"
              value={
                typeof sale.comisionCOP === 'number'
                  ? formatCop(sale.comisionCOP)
                  : commission
                    ? formatCop(commission.amountCOP)
                    : '—'
              }
              foto={foto}
              monoSx={monoSx}
            />
          </Box>

          {/* Buyer + forma de pago */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: '10px',
              marginBottom: '16px',
            }}
          >
            <InfoBox foto={foto}>
              <InfoLabel foto={foto}>Comprador</InfoLabel>
              <Box
                sx={{
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: foto.ink.primary,
                }}
              >
                {buyer?.nombre ?? '—'}
              </Box>
              <Box
                sx={{
                  fontSize: '11.5px',
                  color: foto.ink.tertiary,
                  marginTop: '2px',
                }}
              >
                {buyer?.tipo === 'embajador' ? 'Embajador' : 'Cliente final'}
                {ambassadorName ? ` · ${ambassadorName}` : ''}
              </Box>
            </InfoBox>
            <InfoBox foto={foto}>
              <InfoLabel foto={foto}>Forma de pago</InfoLabel>
              <Box
                sx={{
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: foto.ink.primary,
                }}
              >
                {formaPagoLabel(sale.formaPago)}
              </Box>
              {sale.formaPago === 'credito' && sale.fechaVencimiento ? (
                <Box
                  sx={{
                    fontSize: '11.5px',
                    color: foto.ink.tertiary,
                    marginTop: '2px',
                  }}
                >
                  Vence {formatDateLong(sale.fechaVencimiento)}
                </Box>
              ) : null}
            </InfoBox>
          </Box>

          {/* Items */}
          <Box
            sx={{
              marginBottom:
                sale.carnetUrl || sale.certificadoUrl || isCancelled
                  ? '16px'
                  : 0,
            }}
          >
            <InfoLabel foto={foto}>
              Ítems ({sale.itemIds.length + (sale.manualItems?.length ?? 0)})
            </InfoLabel>
            <Box
              sx={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                marginTop: '8px',
              }}
            >
              {items === undefined && sale.itemIds.length > 0 ? (
                <Box sx={{ fontSize: '12px', color: foto.ink.tertiary }}>
                  Cargando ítems…
                </Box>
              ) : (
                <>
                  {(items ?? []).map((it) => {
                    const thumb = resolveItemThumbnail(
                      it.fotoUrl,
                      it.itemId,
                      batchThumbs,
                    );
                    return (
                      <Box
                        key={it.itemId}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '5px 10px 5px 5px',
                          borderRadius: '9px',
                          border: `1px solid ${foto.surfaces.edge}`,
                          background: foto.surfaces.panel,
                          maxWidth: '100%',
                        }}
                      >
                        <Box
                          sx={{
                            width: 30,
                            height: 30,
                            borderRadius: '6px',
                            overflow: 'hidden',
                            flexShrink: 0,
                            background: foto.surfaces.inset,
                          }}
                        >
                          {thumb ? (
                            <Box
                              component="img"
                              src={thumb}
                              alt=""
                              sx={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block',
                              }}
                            />
                          ) : null}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Box
                            sx={{
                              fontSize: '11.5px',
                              fontWeight: 600,
                              color: foto.ink.primary,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: 140,
                            }}
                          >
                            {it.nombre ?? `#${it.itemId}`}
                          </Box>
                          <Box
                            sx={{
                              ...monoSx,
                              fontSize: '10px',
                              color: foto.ink.tertiary,
                            }}
                          >
                            #{it.itemId}
                            {it.peso ? ` · ${it.peso}` : ''}
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                  {(sale.manualItems ?? []).map((m, i) => (
                    <Box
                      key={`manual-${i}`}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 10px',
                        borderRadius: '9px',
                        border: `1px dashed ${foto.surfaces.edgeStrong}`,
                        background: foto.surfaces.panel,
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: foto.ink.secondary,
                      }}
                    >
                      {m.nombre}
                    </Box>
                  ))}
                  {items &&
                  items.length === 0 &&
                  (sale.manualItems?.length ?? 0) === 0 ? (
                    <Box sx={{ fontSize: '12px', color: foto.ink.tertiary }}>
                      Sin ítems de inventario.
                    </Box>
                  ) : null}
                </>
              )}
            </Box>
          </Box>

          {/* Documents */}
          {sale.carnetUrl || sale.certificadoUrl ? (
            <Box
              sx={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                marginBottom: isCancelled ? '16px' : 0,
              }}
            >
              {sale.carnetUrl ? (
                <DocLink
                  label="Abrir Kardex"
                  url={sale.carnetUrl}
                  foto={foto}
                />
              ) : null}
              {sale.certificadoUrl ? (
                <DocLink
                  label="Abrir Certificado"
                  url={sale.certificadoUrl}
                  foto={foto}
                />
              ) : null}
            </Box>
          ) : null}

          {/* Cancellation info */}
          {isCancelled ? (
            <Box
              role="status"
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
                padding: '12px 14px',
                borderRadius: '10px',
                border: `1px solid ${alpha(foto.status.sold, 0.4)}`,
                background: alpha(foto.status.sold, 0.06),
                color: foto.status.sold,
                fontSize: '12px',
                lineHeight: 1.5,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  fontWeight: 600,
                }}
              >
                <Ban size={14} strokeWidth={1.8} aria-hidden />
                Venta cancelada
              </Box>
              {sale.cancellationReason ? (
                <Box sx={{ color: foto.ink.secondary }}>
                  Motivo: {sale.cancellationReason}
                </Box>
              ) : null}
              {sale.cancelledBy ? (
                <Box sx={{ color: foto.ink.tertiary, fontSize: '11.5px' }}>
                  por {sale.cancelledBy}
                  {sale.cancelledAt
                    ? ` · ${formatDateLong(sale.cancelledAt)}`
                    : ''}
                </Box>
              ) : null}
            </Box>
          ) : null}

          {/* Footer link to full detail */}
          <Box
            sx={{
              marginTop: '16px',
              paddingTop: '14px',
              borderTop: `1px solid ${foto.surfaces.edge}`,
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <Box
              component={Link}
              to={`/admin/fotosintesis/sales/${sale.saleId}`}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: foto.accent.deep,
                textDecoration: 'none',
                '&:hover': { color: foto.accent.primary },
                '&:focus-visible': {
                  outline: 'none',
                  boxShadow: `0 0 0 3px ${foto.accent.glow}`,
                  borderRadius: '4px',
                },
              }}
            >
              Ver comprobante completo
              <ArrowRight size={14} strokeWidth={2} />
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}

interface MoneyCellProps {
  label: string;
  value: string;
  foto: FotoT;
  monoSx: Record<string, unknown>;
  strong?: boolean;
}

function MoneyCell({ label, value, foto, monoSx, strong }: MoneyCellProps) {
  return (
    <Box
      sx={{
        padding: '10px 12px',
        borderRadius: '10px',
        background: strong ? foto.accent.soft : foto.surfaces.panel,
        border: `1px solid ${strong ? alpha(foto.accent.primary, 0.25) : foto.surfaces.edge}`,
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          fontSize: '8.5px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontWeight: 500,
          color: foto.ink.tertiary,
        }}
      >
        {label}
      </Box>
      <Box
        sx={{
          ...monoSx,
          marginTop: '4px',
          fontSize: strong ? '16px' : '13.5px',
          fontWeight: 600,
          color: strong ? foto.accent.deep : foto.ink.primary,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </Box>
    </Box>
  );
}

function InfoBox({
  foto,
  children,
}: {
  foto: FotoT;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        padding: '12px 14px',
        borderRadius: '10px',
        border: `1px solid ${foto.surfaces.edge}`,
        background: foto.surfaces.panel,
        minWidth: 0,
      }}
    >
      {children}
    </Box>
  );
}

function InfoLabel({
  foto,
  children,
}: {
  foto: FotoT;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        fontSize: '8.5px',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        fontWeight: 500,
        color: foto.ink.tertiary,
        marginBottom: '4px',
      }}
    >
      {children}
    </Box>
  );
}

interface DocLinkProps {
  label: string;
  url: string;
  foto: FotoT;
}

function DocLink({ label, url, foto }: DocLinkProps) {
  const href = driveDocViewUrl(url) ?? url;
  return (
    <Box
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '7px 12px',
        borderRadius: '8px',
        border: `1px solid ${foto.accent.primary}`,
        background: foto.accent.soft,
        color: foto.accent.deep,
        fontSize: '12px',
        fontWeight: 600,
        textDecoration: 'none',
        '&:hover': { background: alpha(foto.accent.primary, 0.12) },
        '&:focus-visible': {
          outline: 'none',
          boxShadow: `0 0 0 3px ${foto.accent.glow}`,
        },
      }}
    >
      <ExternalLink size={13} strokeWidth={1.8} aria-hidden />
      {label}
    </Box>
  );
}
