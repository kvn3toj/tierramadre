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
 * Fotosíntesis labels module (LabelSheet / exportLabel / downloadLabelsZip /
 * downloadLabelsSpreadsheet / useNiimbotPrinter) — this page is a new *surface*
 * over that proven pipeline, not a reimplementation.
 *
 * UNIT OF WORK: a LABEL, not an item. Most stocks carry one item per label, but
 * the 2-up 15 × 30 (`T15X30_DUO`) carries two and gets cut in half, so the
 * gallery, the counts, the ZIP and the direct-print loop all iterate
 * `labelGroups` (from `chunkForLabels`) rather than `items`. Reverting any one
 * of them to `items` would silently print double.
 *
 * Data comes from `products.list` with no estado filter — the full inventory,
 * because a label gallery genuinely needs every row (see the estado-tab note in
 * ItemsPage for why filtering does not apply here either).
 *
 * BANDWIDTH: fetched ONE-SHOT on mount, not as a live subscription. It used to
 * subscribe reactively, which re-scanned the whole 81-field mirror on every
 * productInventory write for as long as the page stayed open — and Convex bills
 * Database I/O on documents SCANNED, so that cost is paid in full regardless of
 * how few fields the query projects. This page is read-only (it prints labels,
 * it never mutates), so nothing here depends on live updates; navigating back to
 * it refetches. See docs/audits/2026-08-12-convex-usage-audit.md §5.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  ButtonBase,
  CircularProgress,
  Dialog,
  InputBase,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';

import {
  getFoto,
  fontFamilies,
  appShell,
  containedScrollX,
} from '../../../../design-system';
import {
  useConvexClient,
  convexApi,
  convexReady,
} from '../../../../lib/convex-safe';
import { useNotification } from '../../../../contexts/NotificationContext';
import { readFreshSessionToken } from '../../../../utils/sessionToken';
import { useNiimbotPrinter } from '../../../../hooks/useNiimbotPrinter';
import { LabelSheet } from '../../Fotosintesis/labels/LabelSheet';
import {
  downloadLabelPng,
  renderLabelCanvas,
} from '../../Fotosintesis/labels/exportLabel';
import {
  downloadLabelGroupsZip,
  type LabelItem,
} from '../../Fotosintesis/labels/downloadLabelsZip';
import { downloadLabelsSpreadsheet } from '../../Fotosintesis/labels/downloadLabelsSpreadsheet';
import {
  LABEL_SIZE_LIST,
  chunkForLabels,
  fitsPrinter,
  printScaleFor,
  printableMm,
  resolveLabelSize,
  type LabelSizeId,
} from '../../Fotosintesis/labels/labelSizes';
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

/** Labels are printed in batches; re-picking the stock every visit is friction. */
const SIZE_STORAGE_KEY = 'tm.etiquetas.labelSize';

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

  // One-shot read (see the BANDWIDTH note in the file header). `undefined`
  // keeps the existing loading contract the render path already handles.
  const convexClient = useConvexClient();
  const [products, setProducts] = useState<ProductListRow[] | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!convexReady || !convexClient) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    convexClient
      .query(convexApi.products.list, {
        sessionToken: readFreshSessionToken() ?? undefined,
      })
      .then((rows) => {
        if (!cancelled) setProducts(rows as ProductListRow[]);
      })
      .catch(() => {
        // Same degradation as the old subscription's error path: render the
        // empty gallery rather than crashing the admin route.
        if (!cancelled) setProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [convexClient]);

  const [kind, setKind] = useState<KindFilter>('todo');
  const [search, setSearch] = useState('');
  const [proximosCount, setProximosCount] = useState(PROXIMOS_DEFAULT);

  // Read synchronously so the first paint already shows the operator's stock —
  // an effect-based read would render 12mm tape then snap to 15×30.
  const [sizeId, setSizeId] = useState<LabelSizeId>(
    () => resolveLabelSize(localStorage.getItem(SIZE_STORAGE_KEY)).id,
  );
  const stock = resolveLabelSize(sizeId);

  function chooseSize(id: LabelSizeId) {
    setSizeId(id);
    try {
      localStorage.setItem(SIZE_STORAGE_KEY, id);
    } catch {
      // Private mode / quota — the choice still applies for this session.
    }
  }

  // Advisory only: niimbluelib's model detection is documented as unreliable,
  // so this WARNS about stock wider than the head but never disables printing.
  const headWarning =
    niimbot.head && !fitsPrinter(stock, niimbot.head)
      ? `El rollo de ${stock.label} supera el cabezal de ${printableMm(niimbot.head).toFixed(0)} mm que reporta esta impresora — puede salir recortado.`
      : null;

  // Per-print name overrides, one per item on the label being printed (a 2-up
  // stock puts two items under one dialog). Affects ONLY the printed label —
  // never writes to Convex — and is dropped when the dialog closes.
  const [printDialog, setPrintDialog] = useState<GalleryItem[] | null>(null);
  const [nombreOverrides, setNombreOverrides] = useState<string[]>([]);

  // Highest numeric itemId in stock — the "Próximos" tab starts one above this.
  const maxItemId = useMemo(() => {
    let max = 0;
    for (const r of products ?? []) {
      const n = Number(r.itemId);
      if (!Number.isNaN(n) && n > max) max = n;
    }
    return max;
  }, [products]);

  // Off-screen render target — a single hidden LabelSheet re-rendered per
  // LABEL (batch or single), matching LoteResumenPage's pattern so we never
  // mount N label nodes at once. The unit here is a label, not an item: on a
  // 2-up stock one node carries two items.
  const labelRenderRef = useRef<HTMLDivElement>(null);
  const [labelRenderGroup, setLabelRenderGroup] = useState<LabelItem[] | null>(
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

  /**
   * The filtered items grouped into PHYSICAL labels. On the 1-up stocks this is
   * one item per group and nothing downstream changes; on the 2-up 15 × 30 it
   * pairs them in list order (see `chunkForLabels`). Everything below — the
   * gallery, the counts, the ZIP, the direct print — counts labels through this,
   * so "Imprimir todo" sends what the printer will actually eat.
   */
  const labelGroups = useMemo(
    () => chunkForLabels(items, stock),
    [items, stock],
  );

  /** Filename stem for a label: `497` 1-up, `497+509` on a cut-in-half pair. */
  function groupStem(group: GalleryItem[]): string {
    return group.map((it) => it.itemId).join('+');
  }

  /** Render one LABEL into the shared hidden node and resolve it once React has
   *  committed the new props (one rAF), ready to rasterize. */
  function renderGroupNode(group: LabelItem[]): Promise<HTMLElement> {
    return new Promise<HTMLElement>((resolve, reject) => {
      setLabelRenderGroup(group);
      requestAnimationFrame(() => {
        if (labelRenderRef.current) resolve(labelRenderRef.current);
        else reject(new Error('No se pudo renderizar la etiqueta'));
      });
    });
  }

  // ── Per-label actions ──────────────────────────────────────────────────────

  async function handleGroupPng(group: GalleryItem[]) {
    if (busy) return;
    setBusy(true);
    try {
      const node = await renderGroupNode(group);
      await downloadLabelPng(node, `${groupStem(group)}.png`);
    } catch (err) {
      notify(
        `No se pudo exportar la etiqueta: ${err instanceof Error ? err.message : String(err)}`,
        'error',
      );
    } finally {
      setBusy(false);
      setLabelRenderGroup(null);
    }
  }

  async function handleGroupPrint(group: GalleryItem[]) {
    if (busy) return;
    setBusy(true);
    try {
      // Connect first: the raster scale depends on the head's DPI, which is
      // only known once a device answers.
      await niimbot.connect();
      const node = await renderGroupNode(group);
      const canvas = await renderLabelCanvas(node, {
        scale: printScaleFor(niimbot.head),
      });
      await niimbot.printLabel(canvas);
      notify(`Etiqueta ${groupStem(group)} enviada a la impresora`, 'success');
    } catch (err) {
      notify(
        `No se pudo imprimir directo: ${err instanceof Error ? err.message : String(err)}`,
        'error',
      );
    } finally {
      setBusy(false);
      setLabelRenderGroup(null);
    }
  }

  function openPrintDialog(group: GalleryItem[]) {
    if (busy) return;
    setNombreOverrides(group.map((it) => it.nombre ?? ''));
    setPrintDialog(group);
  }

  function closePrintDialog() {
    setPrintDialog(null);
    setNombreOverrides([]);
  }

  /** Print with the dialog's edited text. The overrides never leave this
   *  render — no mutation, so the inventory records are untouched. */
  async function confirmPrintDialog() {
    const group = printDialog;
    if (!group) return;
    const edited = group.map((it, i) => ({
      ...it,
      nombre: (nombreOverrides[i] ?? '').trim() || undefined,
    }));
    closePrintDialog();
    await handleGroupPrint(edited);
  }

  // ── Batch actions (operate on the current filtered set) ─────────────────────

  async function handleExportZip() {
    if (busy || items.length === 0) return;
    setBusy(true);
    try {
      await downloadLabelGroupsZip(
        labelGroups,
        `etiquetas-atelier-${kind}-${labelGroups.length}.zip`,
        renderGroupNode,
      );
      notify(`${labelGroups.length} etiqueta(s) exportadas`, 'success');
    } catch (err) {
      notify(
        `No se pudieron exportar las etiquetas: ${err instanceof Error ? err.message : String(err)}`,
        'error',
      );
    } finally {
      setBusy(false);
      setLabelRenderGroup(null);
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
    if (busy || labelGroups.length === 0) return;
    setBusy(true);
    setPrintProgress({ done: 0, total: labelGroups.length });
    try {
      await niimbot.connect();
      for (let i = 0; i < labelGroups.length; i++) {
        const node = await renderGroupNode(labelGroups[i]);
        const canvas = await renderLabelCanvas(node, {
          scale: printScaleFor(niimbot.head),
        });
        await niimbot.printLabel(canvas);
        setPrintProgress({ done: i + 1, total: labelGroups.length });
      }
      notify(`${labelGroups.length} etiqueta(s) impresas`, 'success');
    } catch (err) {
      notify(
        `No se pudo imprimir el lote: ${err instanceof Error ? err.message : String(err)}. Usá "Descargar ZIP" como alternativa.`,
        'error',
      );
    } finally {
      setBusy(false);
      setPrintProgress(null);
      setLabelRenderGroup(null);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const loading = products === undefined;

  return (
    <Box
      sx={{
        minHeight: `var(${appShell.mainHeightVar}, 100dvh)`,
        backgroundColor: foto.surfaces.canvas,
        color: foto.ink.primary,
      }}
    >
      {/* Hidden rasterize target — always mounted, off-screen. */}
      <Box
        sx={{ position: 'fixed', left: '-9999px', top: 0 }}
        ref={labelRenderRef}
      >
        {labelRenderGroup && (
          <LabelSheet
            items={labelRenderGroup}
            size={sizeId}
            logoSrc={logoDataUri}
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

        {/* Stock size selector */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            alignItems: 'center',
            mb: headWarning ? 1 : 2,
          }}
        >
          <Box
            sx={{
              fontFamily: fontFamilies.system,
              fontSize: '11px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: foto.ink.tertiary,
            }}
          >
            Rollo
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {LABEL_SIZE_LIST.map((s) => {
              const active = sizeId === s.id;
              return (
                <ButtonBase
                  key={s.id}
                  onClick={() => chooseSize(s.id)}
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
                  {s.label}
                </ButtonBase>
              );
            })}
          </Box>
          {stock.stockCode && (
            <Box
              sx={{
                fontFamily: fontFamilies.mono,
                fontSize: '11px',
                color: foto.ink.tertiary,
              }}
            >
              {stock.stockCode}
            </Box>
          )}
          {/* A 2-up label is not finished when it leaves the printer, and
              nothing else on screen would say so. */}
          {stock.hint && (
            <Box
              sx={{
                fontFamily: fontFamilies.system,
                fontSize: '11px',
                color: foto.accent.primary,
              }}
            >
              ✂ {stock.hint}
            </Box>
          )}
        </Box>

        {headWarning && (
          <Box
            role="status"
            sx={{
              mb: 2,
              px: '12px',
              py: '9px',
              borderRadius: '9px',
              border: `1px solid ${foto.surfaces.edgeStrong}`,
              fontFamily: fontFamilies.system,
              fontSize: '12px',
              lineHeight: 1.45,
              color: foto.ink.secondary,
            }}
          >
            {headWarning}
          </Box>
        )}

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
                : `Imprimir todo (${labelGroups.length})`}
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
          {/* On a 2-up stock "N ítems" and "N etiquetas" are different numbers,
              and the operator is about to feed the second one. The odd-tail
              note is here rather than buried in a tooltip because a half-blank
              label looks like a bug when it comes out of the printer. */}
          {stock.itemsPerLabel > 1 && items.length > 0 && (
            <Box
              sx={{
                fontFamily: fontFamilies.system,
                fontSize: '11px',
                color: foto.ink.tertiary,
                ml: 0.5,
              }}
            >
              {labelGroups.length} etiqueta(s) · {items.length} ítem(s)
              {items.length % stock.itemsPerLabel !== 0
                ? ' · la última sale con una mitad en blanco'
                : ''}
            </Box>
          )}
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
            {labelGroups.map((group) => (
              <LabelCard
                key={groupStem(group)}
                foto={foto}
                group={group}
                size={sizeId}
                logoDataUri={logoDataUri}
                niimbotSupported={niimbot.supported}
                disabled={busy}
                onPng={() => void handleGroupPng(group)}
                onPrint={() => openPrintDialog(group)}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Pre-print polish. Edits here affect ONLY the label being printed —
          nothing is written back to the inventory record. */}
      <Dialog
        open={printDialog !== null}
        onClose={closePrintDialog}
        maxWidth="xs"
        fullWidth
      >
        <Box
          sx={{
            p: 2.5,
            backgroundColor: foto.surfaces.panel,
            color: foto.ink.primary,
          }}
        >
          <Box
            sx={{
              fontFamily: fontFamilies.serif,
              fontSize: '20px',
              fontWeight: 600,
              mb: 0.5,
            }}
          >
            Imprimir{' '}
            {printDialog ? printDialog.map((it) => it.itemId).join(' + ') : ''}
          </Box>
          <Box
            sx={{
              fontFamily: fontFamilies.system,
              fontSize: '12px',
              color: foto.ink.tertiary,
              mb: 2,
            }}
          >
            {stock.label} · el texto editado aquí no modifica el inventario.
            {stock.hint ? ` ${stock.hint}.` : ''}
          </Box>

          {printDialog && (
            <Box
              sx={{
                background: '#FFFFFF',
                borderRadius: '8px',
                p: 0.5,
                mb: 2,
                ...containedScrollX,
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <LabelSheet
                items={printDialog.map((it, i) => ({
                  ...it,
                  nombre: (nombreOverrides[i] ?? '').trim() || undefined,
                }))}
                size={sizeId}
                logoSrc={logoDataUri}
              />
            </Box>
          )}

          {/* One field per item on the label — on a 2-up stock both halves are
              being printed in the same pass, so both are editable here rather
              than forcing two trips through the dialog. */}
          {printDialog?.map((it, i) => (
            <InputBase
              key={it.itemId}
              value={nombreOverrides[i] ?? ''}
              onChange={(e) =>
                setNombreOverrides((prev) => {
                  const next = [...prev];
                  next[i] = e.target.value;
                  return next;
                })
              }
              placeholder={
                printDialog.length > 1
                  ? `Nombre de ${it.itemId} (opcional)`
                  : 'Nombre en la etiqueta (opcional)'
              }
              autoFocus={i === 0}
              inputProps={{
                'aria-label': `Nombre a imprimir para ${it.itemId}`,
              }}
              sx={{
                width: '100%',
                px: '12px',
                py: '8px',
                borderRadius: '9px',
                border: `1px solid ${foto.surfaces.edgeStrong}`,
                fontFamily: fontFamilies.system,
                fontSize: '13px',
                color: foto.ink.primary,
                mb: 1.5,
              }}
            />
          ))}

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <ActionButton foto={foto} onClick={closePrintDialog}>
              Cancelar
            </ActionButton>
            <ActionButton
              foto={foto}
              primary
              disabled={busy}
              onClick={() => void confirmPrintDialog()}
            >
              Imprimir
            </ActionButton>
          </Box>
        </Box>
      </Dialog>
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

/** One card per PHYSICAL label — which is one item on 1-up stock and a
 *  cut-in-half pair on the 2-up 15 × 30. */
function LabelCard({
  foto,
  group,
  size,
  logoDataUri,
  niimbotSupported,
  disabled,
  onPng,
  onPrint,
}: {
  foto: ReturnType<typeof getFoto>;
  group: GalleryItem[];
  size: LabelSizeId;
  logoDataUri: string | null;
  niimbotSupported: boolean;
  disabled: boolean;
  onPng: () => void;
  onPrint: () => void;
}) {
  // Kind badges only make sense when the whole label agrees — a pair of one
  // producto and one insumo gets no badge rather than a misleading one.
  const kind = group.every((it) => it.kind === group[0].kind)
    ? group[0].kind
    : null;

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
          ...containedScrollX,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <LabelSheet items={group} size={size} logoSrc={logoDataUri} />
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
            {group.map((it) => it.itemId).join(' + ')}
          </Box>
          {(kind === 'insumo' || kind === 'proximo') && (
            <Box
              sx={{
                fontFamily: fontFamilies.system,
                fontSize: '9px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color:
                  kind === 'proximo' ? foto.accent.primary : foto.ink.tertiary,
              }}
            >
              {kind === 'proximo' ? 'Próximo' : 'Insumo'}
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
