/**
 * EtiquetasPage — Atelier · Etiquetas.
 *
 * A dedicated gallery of every inventory item (gemas, joyas AND insumos) as a
 * scannable QR label, with the Tierra Mädre mark embedded in the centre of
 * each QR. From here the operator can:
 *   • download one label as a PNG or print it straight to the shop NIIMBOT,
 *   • batch-print / ZIP-export the whole filtered set, or
 *   • export an .xlsx for NIIMBOT's own "Importar desde Excel" flow.
 *
 * The QR + rasterize + NIIMBOT machinery is reused verbatim from the
 * Fotosíntesis labels module (LabelPreview / exportLabel / downloadLabelsZip /
 * downloadLabelsSpreadsheet / useNiimbotPrinter) — this page is a new *surface*
 * over that proven pipeline, not a reimplementation.
 *
 * Data comes from the same reactive `products.list` the Atelier ledger
 * subscribes to (no estado filter → the full inventory), so labels stay in
 * lock-step with edits made elsewhere in the admin.
 */

import { useMemo, useRef, useState } from 'react';
import { Box, ButtonBase, CircularProgress, InputBase } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';

import { getFoto, fontFamilies } from '../../../../design-system';
import {
  useConvexQuery,
  convexApi,
  convexReady,
} from '../../../../lib/convex-safe';
import { useNotification } from '../../../../contexts/NotificationContext';
import { useNiimbotPrinter } from '../../../../hooks/useNiimbotPrinter';
import { LabelPreview } from '../../Fotosintesis/labels/LabelPreview';
import {
  downloadLabelPng,
  renderLabelCanvas,
} from '../../Fotosintesis/labels/exportLabel';
import {
  downloadLabelsZip,
  type LabelItem,
} from '../../Fotosintesis/labels/downloadLabelsZip';
import { downloadLabelsSpreadsheet } from '../../Fotosintesis/labels/downloadLabelsSpreadsheet';
import { useLogoDataUri } from './useLogoDataUri';

// ── Types ──────────────────────────────────────────────────────────────────

/** The projected shape `products.list` returns (subset we read here). */
interface ProductListRow {
  itemId: string;
  nombre?: string;
  peso?: string;
  categoria?: string;
  cantidad?: number;
  tipo?: string;
  estado?: string;
}

type KindFilter = 'todo' | 'producto' | 'insumo' | 'proximo';

interface GalleryItem extends LabelItem {
  kind: 'producto' | 'insumo' | 'proximo';
}

/** How many upcoming (not-yet-created) item numbers to offer for pre-printing. */
const PROXIMOS_DEFAULT = 50;
const PROXIMOS_MAX = 300;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Legacy rows predate the `tipo` field — treat "absent" as a producto. */
function kindOf(row: ProductListRow): 'producto' | 'insumo' {
  return row.tipo === 'insumo' ? 'insumo' : 'producto';
}

/** Insumos rarely carry a `peso`; fall back to a compact qty/category hint so
 *  the label's third line isn't blank. */
function pesoLineFor(row: ProductListRow, kind: 'producto' | 'insumo') {
  if (row.peso && row.peso.trim()) return row.peso;
  if (kind === 'insumo') {
    const bits = [
      row.categoria?.trim(),
      typeof row.cantidad === 'number' ? `x${row.cantidad}` : undefined,
    ].filter(Boolean);
    return bits.length ? bits.join(' · ') : undefined;
  }
  return undefined;
}

const KIND_TABS: { key: KindFilter; label: string }[] = [
  { key: 'todo', label: 'Todo' },
  { key: 'producto', label: 'Productos' },
  { key: 'insumo', label: 'Insumos' },
  { key: 'proximo', label: 'Próximos' },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function EtiquetasPage() {
  const theme = useTheme();
  const foto = getFoto(theme.palette.mode);
  const navigate = useNavigate();
  const { notify } = useNotification();
  const niimbot = useNiimbotPrinter();
  const logoDataUri = useLogoDataUri();

  const products = useConvexQuery(
    convexApi.products.list,
    convexReady ? {} : 'skip',
  ) as ProductListRow[] | undefined;

  const [kind, setKind] = useState<KindFilter>('todo');
  const [search, setSearch] = useState('');
  const [proximosCount, setProximosCount] = useState(PROXIMOS_DEFAULT);

  // Highest numeric itemId in stock — the "Próximos" tab starts one above this.
  const maxItemId = useMemo(() => {
    let max = 0;
    for (const r of products ?? []) {
      const n = Number(r.itemId);
      if (!Number.isNaN(n) && n > max) max = n;
    }
    return max;
  }, [products]);

  // Off-screen render target — a single hidden LabelPreview re-rendered per
  // item (batch or single), matching LoteResumenPage's pattern so we never
  // mount N label nodes at once.
  const labelRenderRef = useRef<HTMLDivElement>(null);
  const [labelRenderItem, setLabelRenderItem] = useState<GalleryItem | null>(
    null,
  );

  const [busy, setBusy] = useState(false);
  const [printProgress, setPrintProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  // Full inventory → gallery items, filtered by kind + search. The "Próximos"
  // tab is synthetic: it offers the next `proximosCount` item numbers ABOVE the
  // current max so the operator can pre-print QR labels for pieces not yet
  // loaded into inventory (the QR already resolves once the item is created).
  const items = useMemo<GalleryItem[]>(() => {
    if (!products) return [];
    const q = search.trim().toLowerCase();

    if (kind === 'proximo') {
      const start = maxItemId + 1;
      return Array.from({ length: proximosCount }, (_, i) => {
        const itemId = String(start + i);
        return {
          itemId,
          nombre: undefined,
          peso: undefined,
          kind: 'proximo',
        } satisfies GalleryItem;
      }).filter((it) => (q ? it.itemId.includes(q) : true));
    }

    return products
      .map((row) => {
        const k = kindOf(row);
        return {
          itemId: row.itemId,
          nombre: row.nombre,
          peso: pesoLineFor(row, k),
          kind: k,
        } satisfies GalleryItem;
      })
      .filter((it) => (kind === 'todo' ? true : it.kind === kind))
      .filter((it) => {
        if (!q) return true;
        return (
          it.itemId.toLowerCase().includes(q) ||
          (it.nombre ?? '').toLowerCase().includes(q)
        );
      });
  }, [products, kind, search, maxItemId, proximosCount]);

  const counts = useMemo(() => {
    const all = products ?? [];
    let insumo = 0;
    for (const r of all) if (kindOf(r) === 'insumo') insumo += 1;
    return { total: all.length, insumo, producto: all.length - insumo };
  }, [products]);

  /** Render one item into the shared hidden node and resolve it once React has
   *  committed the new props (one rAF), ready to rasterize. */
  function renderItemNode(item: GalleryItem): Promise<HTMLElement> {
    return new Promise<HTMLElement>((resolve, reject) => {
      setLabelRenderItem(item);
      requestAnimationFrame(() => {
        if (labelRenderRef.current) resolve(labelRenderRef.current);
        else reject(new Error('No se pudo renderizar la etiqueta'));
      });
    });
  }

  // ── Per-item actions ───────────────────────────────────────────────────────

  async function handleItemPng(item: GalleryItem) {
    if (busy) return;
    setBusy(true);
    try {
      const node = await renderItemNode(item);
      await downloadLabelPng(node, `${item.itemId}.png`);
    } catch (err) {
      notify(
        `No se pudo exportar la etiqueta: ${err instanceof Error ? err.message : String(err)}`,
        'error',
      );
    } finally {
      setBusy(false);
      setLabelRenderItem(null);
    }
  }

  async function handleItemPrint(item: GalleryItem) {
    if (busy) return;
    setBusy(true);
    try {
      const node = await renderItemNode(item);
      const canvas = await renderLabelCanvas(node);
      await niimbot.printLabel(canvas);
      notify(`Etiqueta ${item.itemId} enviada a la impresora`, 'success');
    } catch (err) {
      notify(
        `No se pudo imprimir directo: ${err instanceof Error ? err.message : String(err)}`,
        'error',
      );
    } finally {
      setBusy(false);
      setLabelRenderItem(null);
    }
  }

  // ── Batch actions (operate on the current filtered set) ─────────────────────

  async function handleExportZip() {
    if (busy || items.length === 0) return;
    setBusy(true);
    try {
      await downloadLabelsZip(
        items,
        `etiquetas-atelier-${kind}-${items.length}.zip`,
        (item) => renderItemNode(item as GalleryItem),
      );
      notify(`${items.length} etiqueta(s) exportadas`, 'success');
    } catch (err) {
      notify(
        `No se pudieron exportar las etiquetas: ${err instanceof Error ? err.message : String(err)}`,
        'error',
      );
    } finally {
      setBusy(false);
      setLabelRenderItem(null);
    }
  }

  async function handleExportSpreadsheet() {
    if (busy || items.length === 0) return;
    setBusy(true);
    try {
      await downloadLabelsSpreadsheet(
        items,
        `etiquetas-atelier-${kind}-${items.length}.xlsx`,
      );
      notify(
        `Hoja de cálculo de ${items.length} etiqueta(s) exportada`,
        'success',
      );
    } catch (err) {
      notify(
        `No se pudo exportar la hoja de cálculo: ${err instanceof Error ? err.message : String(err)}`,
        'error',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handlePrintAllDirect() {
    if (busy || items.length === 0) return;
    setBusy(true);
    setPrintProgress({ done: 0, total: items.length });
    try {
      await niimbot.connect();
      for (let i = 0; i < items.length; i++) {
        const node = await renderItemNode(items[i]);
        const canvas = await renderLabelCanvas(node);
        await niimbot.printLabel(canvas);
        setPrintProgress({ done: i + 1, total: items.length });
      }
      notify(`${items.length} etiqueta(s) impresas`, 'success');
    } catch (err) {
      notify(
        `No se pudo imprimir el lote: ${err instanceof Error ? err.message : String(err)}. Usá "Descargar ZIP" como alternativa.`,
        'error',
      );
    } finally {
      setBusy(false);
      setPrintProgress(null);
      setLabelRenderItem(null);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const loading = products === undefined;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: foto.surfaces.canvas,
        color: foto.ink.primary,
      }}
    >
      {/* Hidden rasterize target — always mounted, off-screen. */}
      <Box
        sx={{ position: 'fixed', left: '-9999px', top: 0 }}
        ref={labelRenderRef}
      >
        {labelRenderItem && (
          <LabelPreview
            itemId={labelRenderItem.itemId}
            nombre={labelRenderItem.nombre}
            peso={labelRenderItem.peso}
            qrLogoSrc={logoDataUri ?? undefined}
          />
        )}
      </Box>

      <Box
        sx={{
          maxWidth: 1320,
          mx: 'auto',
          px: { xs: 2, md: 3 },
          py: { xs: 3, md: 4 },
        }}
      >
        {/* Header */}
        <ButtonBase
          onClick={() => navigate('/admin/products')}
          disableRipple
          sx={{
            fontFamily: fontFamilies.system,
            fontSize: '11px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: foto.ink.tertiary,
            mb: 1,
            '&:hover': { color: foto.ink.primary },
          }}
        >
          ← Atelier · Inventario
        </ButtonBase>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 1,
            mb: 2.5,
          }}
        >
          <Box>
            <Box
              sx={{
                fontFamily: fontFamilies.serif,
                fontSize: { xs: '28px', md: '34px' },
                fontWeight: 600,
                letterSpacing: '-0.01em',
                lineHeight: 1.1,
              }}
            >
              Etiquetas
            </Box>
            <Box
              sx={{
                fontFamily: fontFamilies.system,
                fontSize: '12px',
                color: foto.ink.tertiary,
                mt: 0.5,
              }}
            >
              {loading
                ? 'Cargando inventario…'
                : kind === 'proximo'
                  ? `${items.length} próximo(s) · #${maxItemId + 1} a #${maxItemId + proximosCount} · sin registrar aún`
                  : `${counts.total} ítem(s) · ${counts.producto} producto(s) · ${counts.insumo} insumo(s)`}
            </Box>
          </Box>
        </Box>

        {/* Controls: kind tabs + search */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.5,
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {KIND_TABS.map((t) => {
              const active = kind === t.key;
              return (
                <ButtonBase
                  key={t.key}
                  onClick={() => setKind(t.key)}
                  disableRipple
                  sx={{
                    px: '14px',
                    py: '7px',
                    borderRadius: '9px',
                    fontFamily: fontFamilies.system,
                    fontSize: '12px',
                    fontWeight: active ? 600 : 500,
                    color: active ? foto.ink.inverse : foto.ink.secondary,
                    backgroundColor: active
                      ? foto.accent.primary
                      : 'transparent',
                    border: `1px solid ${active ? foto.accent.primary : foto.surfaces.edgeStrong}`,
                    transition: 'background-color 120ms ease, color 120ms ease',
                    '&:focus-visible': {
                      outline: `2px solid ${foto.accent.primary}`,
                      outlineOffset: '2px',
                    },
                  }}
                >
                  {t.label}
                </ButtonBase>
              );
            })}
          </Box>

          <InputBase
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código o nombre…"
            inputProps={{ 'aria-label': 'Buscar ítem para etiqueta' }}
            sx={{
              flex: 1,
              minWidth: 200,
              px: '12px',
              py: '7px',
              borderRadius: '9px',
              border: `1px solid ${foto.surfaces.edgeStrong}`,
              fontFamily: fontFamilies.system,
              fontSize: '13px',
              color: foto.ink.primary,
            }}
          />

          {kind === 'proximo' && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                fontFamily: fontFamilies.system,
                fontSize: '12px',
                color: foto.ink.secondary,
                whiteSpace: 'nowrap',
              }}
            >
              Cantidad
              <InputBase
                type="number"
                value={proximosCount}
                onChange={(e) => {
                  const n = Math.round(Number(e.target.value));
                  setProximosCount(
                    Number.isNaN(n)
                      ? 0
                      : Math.min(PROXIMOS_MAX, Math.max(1, n)),
                  );
                }}
                inputProps={{
                  min: 1,
                  max: PROXIMOS_MAX,
                  'aria-label': 'Cantidad de próximos a generar',
                }}
                sx={{
                  width: 72,
                  px: '10px',
                  py: '7px',
                  borderRadius: '9px',
                  border: `1px solid ${foto.surfaces.edgeStrong}`,
                  fontFamily: fontFamilies.mono,
                  fontSize: '13px',
                  color: foto.ink.primary,
                }}
              />
            </Box>
          )}
        </Box>

        {/* Batch action bar */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            alignItems: 'center',
            mb: 3,
            pb: 2.5,
            borderBottom: `1px solid ${foto.surfaces.edge}`,
          }}
        >
          {niimbot.supported && (
            <ActionButton
              foto={foto}
              primary
              disabled={busy || items.length === 0}
              onClick={() => void handlePrintAllDirect()}
            >
              {printProgress
                ? `Imprimiendo ${printProgress.done}/${printProgress.total}…`
                : `Imprimir todo (${items.length})`}
            </ActionButton>
          )}
          <ActionButton
            foto={foto}
            disabled={busy || items.length === 0}
            onClick={() => void handleExportZip()}
          >
            Descargar ZIP
          </ActionButton>
          <ActionButton
            foto={foto}
            disabled={busy || items.length === 0}
            onClick={() => void handleExportSpreadsheet()}
          >
            Excel NIIMBOT
          </ActionButton>
          {busy && !printProgress && (
            <CircularProgress
              size={16}
              sx={{ color: foto.accent.primary, ml: 0.5 }}
            />
          )}
        </Box>

        {/* Gallery grid */}
        {loading ? (
          <Box
            sx={{
              color: foto.ink.tertiary,
              fontSize: 13,
              py: 6,
              textAlign: 'center',
            }}
          >
            Cargando etiquetas…
          </Box>
        ) : items.length === 0 ? (
          <Box
            sx={{
              color: foto.ink.tertiary,
              fontSize: 13,
              py: 6,
              textAlign: 'center',
            }}
          >
            No hay ítems que coincidan con el filtro.
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 1.5,
            }}
          >
            {items.map((item) => (
              <LabelCard
                key={item.itemId}
                foto={foto}
                item={item}
                logoDataUri={logoDataUri}
                niimbotSupported={niimbot.supported}
                disabled={busy}
                onPng={() => void handleItemPng(item)}
                onPrint={() => void handleItemPrint(item)}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ActionButton({
  foto,
  children,
  onClick,
  disabled,
  primary,
}: {
  foto: ReturnType<typeof getFoto>;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      disableRipple
      sx={{
        px: '14px',
        py: '9px',
        borderRadius: '9px',
        fontFamily: fontFamilies.system,
        fontSize: '12px',
        fontWeight: 600,
        color: primary ? foto.ink.inverse : foto.ink.primary,
        backgroundColor: primary ? foto.accent.primary : 'transparent',
        border: `1px solid ${primary ? foto.accent.primary : foto.surfaces.edgeStrong}`,
        transition: 'filter 120ms ease, opacity 120ms ease',
        '&:hover': { filter: primary ? 'brightness(0.94)' : 'none' },
        '&:disabled': { opacity: 0.45 },
        '&:focus-visible': {
          outline: `2px solid ${foto.accent.primary}`,
          outlineOffset: '2px',
        },
      }}
    >
      {children}
    </ButtonBase>
  );
}

function LabelCard({
  foto,
  item,
  logoDataUri,
  niimbotSupported,
  disabled,
  onPng,
  onPrint,
}: {
  foto: ReturnType<typeof getFoto>;
  item: GalleryItem;
  logoDataUri: string | null;
  niimbotSupported: boolean;
  disabled: boolean;
  onPng: () => void;
  onPrint: () => void;
}) {
  return (
    <Box
      sx={{
        border: `1px solid ${foto.surfaces.edge}`,
        borderRadius: '12px',
        backgroundColor: foto.surfaces.panel,
        p: 1.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        // Skip paint/layout for off-screen cards — the full inventory can be
        // 450+ cards, each with a live QR SVG.
        contentVisibility: 'auto',
        containIntrinsicSize: '190px',
      }}
    >
      {/* Label proof — rendered on a white chip so it reads as the physical
          tape regardless of light/dark theme. */}
      <Box
        sx={{
          background: '#FFFFFF',
          borderRadius: '8px',
          p: 0.5,
          overflowX: 'auto',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <LabelPreview
          itemId={item.itemId}
          nombre={item.nombre}
          peso={item.peso}
          qrLogoSrc={logoDataUri ?? undefined}
        />
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Box
            sx={{
              fontFamily: fontFamilies.mono,
              fontSize: '12px',
              fontWeight: 700,
              color: foto.ink.primary,
            }}
          >
            {item.itemId}
          </Box>
          {(item.kind === 'insumo' || item.kind === 'proximo') && (
            <Box
              sx={{
                fontFamily: fontFamilies.system,
                fontSize: '9px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color:
                  item.kind === 'proximo'
                    ? foto.accent.primary
                    : foto.ink.tertiary,
              }}
            >
              {item.kind === 'proximo' ? 'Próximo' : 'Insumo'}
            </Box>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          <ActionButton foto={foto} disabled={disabled} onClick={onPng}>
            PNG
          </ActionButton>
          {niimbotSupported && (
            <ActionButton
              foto={foto}
              primary
              disabled={disabled}
              onClick={onPrint}
            >
              Imprimir
            </ActionButton>
          )}
        </Box>
      </Box>
    </Box>
  );
}
