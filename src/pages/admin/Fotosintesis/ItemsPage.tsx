import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Box, IconButton } from '@mui/material';
import { Search, X, ChevronRight } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  getFoto,
  fontFamilies,
  paneHeight,
  containedScrollX,
} from '../../../design-system';
import { precioBaseCOP } from '../../../utils/precioBase';
import { useTRM } from '../../../hooks/useTRM';
import {
  useConvexQuery,
  useConvexAction,
  convexApi,
  convexReady,
} from '../../../lib/convex-safe';
import { useGoogleAuth } from '../../../contexts/GoogleAuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import {
  requireAuthTokenOrLogout,
  readFreshSessionToken,
} from '../../../utils/sessionToken';
import { useFotosintesisLayout } from './FotosintesisLayoutContext';
import { FOTO_TOPBAR_HEIGHT } from './components/FotoTopbar';
import {
  EditDrawer,
  type EditDrawerProduct,
  type EditDrawerPatch,
} from '../ProductManagement/EditDrawer';
import type { EstadoValue } from '../ProductManagement/StatusPip';
import type { NewProductInput } from '../../../utils/createProduct-validate';

/**
 * Fotosíntesis · Items — the full item ledger.
 *
 * This is the atelier (`/admin/products`) moved INSIDE Fotosíntesis. It was
 * never a data migration: the atelier already read/wrote the same Convex
 * `productInventory` table, the same `useProductLock` soft lock and the same
 * `productEdits` audit trail as the rest of Fotosíntesis — it just lived on a
 * sibling route with its own chrome. So this page is navigation + redesign:
 * the Lotes list presentation applied to items, with the atelier's own
 * `EditDrawer` (the widest editor — it handles items with AND without a lote,
 * and carries the kardex via AsesorMovementPanel) as the detail surface.
 *
 * `/admin/products` now redirects here, preserving `?item=`.
 *
 * Spec: docs/specs/2026-07-21-spec-tab-items-fotosintesis.md
 */

type TabKey = 'todos' | 'DISPONIBLE' | 'ASESOR' | 'CONSIGNACION' | 'VENDIDA';

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: 'todos', label: 'Todos' },
  { key: 'DISPONIBLE', label: 'Disponibles' },
  { key: 'ASESOR', label: 'Con asesor' },
  { key: 'CONSIGNACION', label: 'Consignación' },
  { key: 'VENDIDA', label: 'Vendidas' },
] as const;

const COP_FORMATTER = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});
const formatCOP = (n: number): string => COP_FORMATTER.format(n);


interface ItemRow {
  id: string;
  itemId: string;
  rowIndex: number;
  nombre?: string;
  peso?: string;
  color?: string;
  calidad?: string;
  cantidad?: number;
  talla?: string;
  medidas?: string;
  categoria?: string;
  precioCOP?: number;
  precioFinalCOP?: number;
  precioFinalUSD?: number;
  ubicacion?: string;
  coleccion?: string;
  caja?: string;
  estado: EstadoValue;
  loteId?: string;
  syncStatus: 'synced' | 'pending' | 'error';
  syncError?: string;
  lastPushedAt?: string;
}

export default function FotosintesisItemsPage() {
  const foto = getFoto('light');
  const { user } = useGoogleAuth();
  const { notify } = useNotification();
  const { registerSpotlightDefault } = useFotosintesisLayout();

  const [tab, setTab] = useState<TabKey>('todos');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);

  // One subscription for the whole page: the estado tabs need per-estado
  // counts, so a server-filtered query would only ever know about the active
  // tab. `products.list` is projected (see convex/products.ts) and the mirror
  // is bounded (~500 rows), so pulling it whole and slicing client-side costs
  // less than five parallel filtered subscriptions.
  // La TRM del día: #547/#548 están anclados en dólares y su precio en pesos
  // se deriva acá, igual que en el catálogo. Ver src/utils/precioBase.ts.
  const { trmRate } = useTRM();
  const items = useConvexQuery(
    convexApi.products.list,
    convexReady
      ? { sessionToken: readFreshSessionToken() ?? undefined }
      : 'skip',
  ) as ItemRow[] | undefined;

  const saveEdit = useConvexAction(convexApi.products.saveEdit);
  const pullFromSheet = useConvexAction(convexApi.products.pullFromSheet);

  const rows: ItemRow[] = useMemo(
    () =>
      (items ?? []).map((doc) => ({
        ...doc,
        id: (doc as ItemRow & { _id?: string })._id ?? doc.itemId,
      })),
    [items],
  );

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      todos: rows.length,
      DISPONIBLE: 0,
      ASESOR: 0,
      CONSIGNACION: 0,
      VENDIDA: 0,
    };
    for (const r of rows) {
      if (r.estado === 'DISPONIBLE' || r.estado === 'DISPONIBLE ADOPTADA') {
        c.DISPONIBLE += 1;
      } else if (r.estado === 'ASESOR') c.ASESOR += 1;
      else if (r.estado === 'CONSIGNACION') c.CONSIGNACION += 1;
      else if (r.estado === 'VENDIDA') c.VENDIDA += 1;
    }
    return c;
  }, [rows]);

  const byTab = useMemo(() => {
    if (tab === 'todos') return rows;
    if (tab === 'DISPONIBLE') {
      // "Disponibles" counts adopted pieces too — they're still in the vault,
      // just pre-claimed by an asesor (cf. StatusPip's color mapping).
      return rows.filter(
        (r) => r.estado === 'DISPONIBLE' || r.estado === 'DISPONIBLE ADOPTADA',
      );
    }
    return rows.filter((r) => r.estado === tab);
  }, [rows, tab]);

  const filteredRows = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return byTab;
    return byTab.filter((r) =>
      [
        r.itemId,
        r.nombre,
        r.coleccion,
        r.calidad,
        r.color,
        r.categoria,
        r.ubicacion,
        r.loteId,
      ]
        .filter(Boolean)
        .some((field) => (field as string).toLowerCase().includes(q)),
    );
  }, [deferredSearch, byTab]);

  const editing = useMemo(
    () => rows.find((r) => r.itemId === editingItemId) ?? null,
    [rows, editingItemId],
  );

  // ─── Deep link: ?item=<itemId> opens that piece's drawer ────────────────
  // Inherited from the atelier (the Fotosíntesis "actividad reciente" feed and
  // the QR scanner both link with it), and now also how ⌘K lands here. Applied
  // once per distinct param so it never fights a later row click, then stripped
  // from the URL.
  const [searchParams, setSearchParams] = useSearchParams();
  const appliedItemParamRef = useRef<string | null>(null);
  useEffect(() => {
    const itemParam = searchParams.get('item');
    if (!itemParam || !items) return;
    if (appliedItemParamRef.current === itemParam) return;
    if (!items.some((p) => p.itemId === itemParam)) return;
    appliedItemParamRef.current = itemParam;
    setEditingItemId(itemParam);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('item');
        return next;
      },
      { replace: true },
    );
  }, [searchParams, items, setSearchParams]);

  // ─── ⌘K ────────────────────────────────────────────────────────────────
  // The spotlight already searches productInventory; while Items is the active
  // tab, picking a result should stay HERE (open the drawer) instead of taking
  // the layout's default jump into the lote capture page. Cleared on unmount so
  // the other tabs get their default back.
  useEffect(() => {
    registerSpotlightDefault({
      scope: 'Items',
      onSelect: (product) => {
        appliedItemParamRef.current = product.itemId;
        setEditingItemId(product.itemId);
      },
    });
    return () => registerSpotlightDefault(null);
  }, [registerSpotlightDefault]);

  // ─── Save / resync ─────────────────────────────────────────────────────
  // Edit-only: creating a piece stays in the capture flow (lote → captura), so
  // this page never opens the drawer in "create" mode.
  const handleSave = useCallback(
    async (
      itemId: string | undefined,
      payload: EditDrawerPatch | NewProductInput,
    ) => {
      if (!user?.email) {
        notify('Tu sesión no tiene email. Vuelve a iniciar sesión.', 'error');
        return;
      }
      const idToken = requireAuthTokenOrLogout();
      if (!idToken) {
        notify(
          'Tu sesión expiró. Vuelve a iniciar sesión con Google.',
          'error',
        );
        return;
      }
      const patch = payload as EditDrawerPatch;
      if (!itemId || Object.keys(patch).length === 0) return;
      setIsSaving(true);
      try {
        const result = await saveEdit({ idToken, itemId, patch });
        notify(
          `Guardado · ${result.changesCount} cambio${
            result.changesCount === 1 ? '' : 's'
          } en la hoja en breve`,
          'success',
        );
        setEditingItemId(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        notify(`No se pudo guardar: ${msg}`, 'error');
      } finally {
        setIsSaving(false);
      }
    },
    [saveEdit, user?.email, notify],
  );

  const handleResync = useCallback(async () => {
    const idToken = requireAuthTokenOrLogout();
    if (!idToken) {
      notify('Tu sesión expiró. Vuelve a iniciar sesión con Google.', 'error');
      return;
    }
    setIsResyncing(true);
    try {
      const result = await pullFromSheet({ idToken });
      notify(
        `Sincronizado · ${result.pulled} en la hoja, ${result.upserted} nuevos en el espejo`,
        'success',
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      notify(`No se pudo sincronizar: ${msg}`, 'error');
    } finally {
      setIsResyncing(false);
    }
  }, [pullFromSheet, notify]);

  // --- Styles --------------------------------------------------------------
  const monoSx = {
    fontFamily: fontFamilies.mono,
    fontVariantNumeric: 'tabular-nums' as const,
    letterSpacing: '-0.005em',
  } as const;

  const fmtN = (v: number | undefined): string =>
    typeof v === 'number' ? v.toString() : '—';

  return (
    <Box
      component="main"
      sx={{
        color: foto.ink.primary,
        background: foto.surfaces.canvas,
        minHeight: paneHeight(FOTO_TOPBAR_HEIGHT),
      }}
    >
      {/* HEADER BAND */}
      <Box
        component="section"
        sx={{
          padding: '32px 28px 24px',
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
            gap: '28px',
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
              Atelier · Inventario
            </Box>
            <Box
              component="h1"
              sx={{
                marginTop: '8px',
                fontSize: '32px',
                fontWeight: 600,
                letterSpacing: '-0.025em',
                lineHeight: 1.1,
                color: foto.ink.primary,
              }}
            >
              Items
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
              Cada pieza del inventario — con lote o sin él. Busca por número,
              nombre, colección o ubicación y abre cualquier ítem para editar su
              ficha, ver su kardex y su historial de cambios.
            </Box>
            {/* The atelier keeps the heavy tools this list doesn't carry yet
                (edición masiva, filtros avanzados, patrones, cromática, "+
                nueva piedra"). Until those are ported, /admin/products stays
                live and reachable from here rather than being redirected away.
                See docs/specs/2026-07-21-spec-tab-items-fotosintesis.md §4.5. */}
            <Box
              component={Link}
              to="/admin/products"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                marginTop: '12px',
                fontSize: '12px',
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
              Edición masiva y filtros avanzados
              <ChevronRight size={13} />
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '20px',
              flexWrap: { xs: 'wrap', md: 'nowrap' },
            }}
            role="group"
            aria-label="Resumen del inventario"
          >
            <HeaderStat
              value={items === undefined ? '—' : fmtN(counts.todos)}
              label="Total"
              ariaLabel={`${counts.todos} ítems en total`}
              foto={foto}
            />
            <HeaderStat
              value={items === undefined ? '—' : fmtN(counts.DISPONIBLE)}
              label="Disponibles"
              ariaLabel={`${counts.DISPONIBLE} ítems disponibles`}
              foto={foto}
            />
            <HeaderStat
              value={
                items === undefined
                  ? '—'
                  : fmtN(counts.ASESOR + counts.CONSIGNACION)
              }
              label="Fuera"
              ariaLabel={`${
                counts.ASESOR + counts.CONSIGNACION
              } ítems con asesor o en consignación`}
              foto={foto}
            />
            <HeaderStat
              value={items === undefined ? '—' : fmtN(counts.VENDIDA)}
              label="Vendidas"
              ariaLabel={`${counts.VENDIDA} ítems vendidos`}
              foto={foto}
              tone="mute"
            />
          </Box>
        </Box>
      </Box>

      {/* TABS */}
      <Box
        role="tablist"
        aria-label="Filtrar ítems por estado"
        sx={{
          maxWidth: 1320,
          margin: '0 auto',
          padding: { xs: '0 16px', md: '0 28px' },
          display: 'flex',
          gap: '4px',
          borderBottom: `1px solid ${foto.surfaces.edge}`,
          ...containedScrollX,
          overflowX: { xs: 'auto', md: 'visible' },
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          flexWrap: 'nowrap',
        }}
      >
        {TABS.map((t) => (
          <TabButton
            key={t.key}
            active={tab === t.key}
            onClick={() => setTab(t.key)}
            label={t.label}
            count={items === undefined ? undefined : counts[t.key]}
            foto={foto}
          />
        ))}
      </Box>

      {/* LIST */}
      <Box
        sx={{
          maxWidth: 1320,
          margin: '0 auto',
          padding: { xs: '20px 16px 40px', md: '24px 28px 60px' },
        }}
      >
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
              background: foto.surfaces.canvas,
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
              placeholder="Buscar por número, nombre, colección o ubicación…"
              aria-label="Buscar ítems"
              sx={{
                flex: 1,
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

          {/* Column headers (desktop) */}
          <Box
            sx={{
              display: { xs: 'none', md: 'grid' },
              gridTemplateColumns:
                '72px minmax(0, 1.5fr) 80px 120px 130px 120px',
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
            <span>Ítem</span>
            <span>Pieza</span>
            <span style={{ textAlign: 'right' }}>Peso</span>
            <span>Categoría</span>
            <span style={{ textAlign: 'right' }}>Precio</span>
            <span>Estado</span>
          </Box>

          {/* Rows */}
          {items === undefined ? (
            <Box sx={emptyMessageSx(foto)}>
              <Box component="span" aria-label="Cargando">
                —
              </Box>
            </Box>
          ) : filteredRows.length === 0 ? (
            <Box sx={emptyMessageSx(foto)}>
              {deferredSearch.trim()
                ? `Sin resultados para “${deferredSearch.trim()}”.`
                : tab === 'todos' && rows.length === 0
                  ? 'Aún no hay ítems en el inventario.'
                  : 'No hay ítems en este estado.'}
            </Box>
          ) : (
            <Box role="list">
              {filteredRows.map((row) => {
                const meta = estadoMeta(row.estado, foto);
                const precio = precioBaseCOP(row, trmRate);
                return (
                  <Box
                    key={row.id}
                    component="button"
                    type="button"
                    role="listitem"
                    onClick={() => setEditingItemId(row.itemId)}
                    aria-label={`Ítem ${row.itemId}, ${
                      row.nombre ?? 'sin nombre'
                    }, ${meta.label}`}
                    sx={{
                      width: '100%',
                      // content-box rows add their 18px padding ON TOP of 100%,
                      // overflowing the card and clipping the right cell.
                      boxSizing: 'border-box',
                      appearance: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      background: foto.surfaces.canvas,
                      border: 'none',
                      borderBottom: `1px solid ${foto.surfaces.edge}`,
                      padding: '14px 18px',
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '72px minmax(0, 1fr) auto',
                        md: '72px minmax(0, 1.5fr) 80px 120px 130px 120px',
                      },
                      gap: '12px',
                      alignItems: 'center',
                      color: foto.ink.primary,
                      fontFamily: 'inherit',
                      transition: 'background 120ms ease',
                      '& .itemChip': {
                        transition: 'background 120ms ease, color 120ms ease',
                      },
                      '&:hover': { background: foto.surfaces.panel },
                      '&:hover .itemChip': {
                        background: foto.accent.primary,
                        color: foto.ink.inverse,
                      },
                      '&:focus-visible': {
                        outline: 'none',
                        boxShadow: `inset 0 0 0 2px ${foto.accent.glow}`,
                      },
                    }}
                  >
                    {/* Item ID chip */}
                    <Box
                      className="itemChip"
                      sx={{
                        ...monoSx,
                        width: 64,
                        padding: '6px 0',
                        textAlign: 'center',
                        background: foto.accent.soft,
                        color: foto.accent.deep,
                        borderRadius: '7px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                      }}
                    >
                      {row.itemId}
                    </Box>

                    {/* Nombre + meta */}
                    <Box sx={{ minWidth: 0 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '7px',
                          fontSize: '13.5px',
                          fontWeight: 600,
                          color: foto.ink.primary,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        <Box
                          aria-hidden="true"
                          sx={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            flexShrink: 0,
                            background: meta.color ?? 'transparent',
                            boxShadow: meta.color
                              ? 'none'
                              : `inset 0 0 0 1px ${foto.surfaces.edgeStrong}`,
                          }}
                        />
                        <Box
                          component="span"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {row.nombre || 'Sin nombre'}
                        </Box>
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
                        {[row.loteId, row.coleccion, row.calidad, row.ubicacion]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </Box>
                    </Box>

                    {/* Peso (desktop) */}
                    <Box
                      sx={{
                        display: { xs: 'none', md: 'block' },
                        ...monoSx,
                        fontSize: '12px',
                        color: foto.ink.secondary,
                        textAlign: 'right',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.peso || '—'}
                    </Box>

                    {/* Categoría (desktop) */}
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
                      {row.categoria || '—'}
                    </Box>

                    {/* Precio (desktop) */}
                    <Box
                      sx={{
                        display: { xs: 'none', md: 'block' },
                        ...monoSx,
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color:
                          precio === undefined
                            ? foto.ink.mute
                            : foto.ink.primary,
                        textAlign: 'right',
                      }}
                    >
                      {precio === undefined ? '—' : formatCOP(precio)}
                    </Box>

                    {/* Estado badge (desktop) */}
                    <Box
                      sx={{
                        display: { xs: 'none', md: 'inline-flex' },
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px 9px',
                        borderRadius: '999px',
                        fontSize: '10.5px',
                        fontWeight: 600,
                        letterSpacing: '0.01em',
                        whiteSpace: 'nowrap',
                        color: meta.color ?? foto.ink.tertiary,
                        background: foto.surfaces.inset,
                      }}
                    >
                      {meta.label}
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
              })}
            </Box>
          )}
        </Box>
      </Box>

      {/* Detail — the atelier's own drawer: identity, specs, precio, estado,
          kardex (AsesorMovementPanel), archivos de Drive e historial. It owns
          the soft lock, so two operators can't edit the same piece blindly. */}
      <EditDrawer
        open={!!editingItemId}
        product={editing ? toDrawerProduct(editing) : null}
        isSaving={isSaving}
        mode="edit"
        onClose={() => setEditingItemId(null)}
        onSave={handleSave}
        onResync={handleResync}
        isResyncing={isResyncing}
      />
    </Box>
  );
}

// ============================================================================
// Internal helpers
// ============================================================================

type FotoT = ReturnType<typeof getFoto>;

function toDrawerProduct(row: ItemRow): EditDrawerProduct {
  return {
    itemId: row.itemId,
    rowIndex: row.rowIndex,
    nombre: row.nombre,
    peso: row.peso,
    color: row.color,
    calidad: row.calidad,
    cantidad: row.cantidad,
    talla: row.talla,
    medidas: row.medidas,
    categoria: row.categoria,
    precioFinalCOP: row.precioFinalCOP,
    ubicacion: row.ubicacion,
    coleccion: row.coleccion,
    caja: row.caja,
    estado: row.estado,
    loteId: row.loteId,
    syncStatus: row.syncStatus,
    syncError: row.syncError,
    lastPushedAt: row.lastPushedAt,
  };
}

interface ItemEstadoMeta {
  label: string;
  /** null → hollow bullet (no canonical color yet), mirroring StatusPip. */
  color: string | null;
}

/** Label + bullet color per estado. Colors mirror StatusPip so a piece reads
 *  the same here and inside the drawer. */
function estadoMeta(estado: EstadoValue, foto: FotoT): ItemEstadoMeta {
  switch (estado) {
    case 'DISPONIBLE':
      return { label: 'Disponible', color: foto.status.available };
    case 'DISPONIBLE ADOPTADA':
      return { label: 'Adoptada', color: foto.status.consigned };
    case 'ASESOR':
      return { label: 'Con asesor', color: foto.status.consigned };
    case 'CONSIGNACION':
      return { label: 'Consignación', color: foto.status.consigned };
    case 'ESMEREOGENESIS':
    case 'ESMERO':
      return { label: 'Esmereogénesis', color: foto.status.consigned };
    case 'VENDIDA':
      return { label: 'Vendida', color: foto.status.sold };
    case 'Retornado':
      return { label: 'Retornado', color: null };
    case 'LOTE X CT':
      return { label: 'Lote x ct', color: null };
    case 'RETIRADA':
      return { label: 'Retirada', color: null };
    default:
      return { label: 'Sin estado', color: null };
  }
}

function emptyMessageSx(foto: FotoT) {
  return {
    padding: '36px 18px',
    textAlign: 'center' as const,
    color: foto.ink.tertiary,
    fontSize: '12.5px',
    lineHeight: 1.55,
  };
}

interface HeaderStatProps {
  value: string;
  label: string;
  ariaLabel: string;
  foto: FotoT;
  tone?: 'mute';
}

function HeaderStat({ value, label, ariaLabel, foto, tone }: HeaderStatProps) {
  return (
    <Box
      aria-label={ariaLabel}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '3px',
        borderRight: `1px solid ${foto.surfaces.rule}`,
        paddingRight: '20px',
        '&:last-child': { borderRight: 'none', paddingRight: 0 },
      }}
    >
      <Box
        sx={{
          fontFamily: fontFamilies.mono,
          fontSize: '26px',
          fontWeight: 300,
          color: tone === 'mute' ? foto.ink.tertiary : foto.ink.primary,
          letterSpacing: '-0.035em',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 0.9,
        }}
      >
        {value}
      </Box>
      <Box
        sx={{
          fontSize: '9px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          fontWeight: 500,
          color: foto.ink.tertiary,
          marginTop: '4px',
        }}
      >
        {label}
      </Box>
    </Box>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number | undefined;
  foto: FotoT;
}

function TabButton({ active, onClick, label, count, foto }: TabButtonProps) {
  return (
    <Box
      component="button"
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      sx={{
        appearance: 'none',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'inherit',
        padding: '12px 14px',
        fontSize: '12.5px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        color: active ? foto.ink.primary : foto.ink.tertiary,
        borderBottom: `2px solid ${active ? foto.accent.primary : 'transparent'}`,
        marginBottom: '-1px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'color 120ms ease, border-color 120ms ease',
        '&:hover': { color: foto.ink.primary },
        '&:focus-visible': {
          outline: 'none',
          boxShadow: `0 0 0 3px ${foto.accent.glow}`,
          borderRadius: '4px',
        },
      }}
    >
      {label}
      <Box
        component="span"
        sx={{
          fontFamily: fontFamilies.mono,
          fontVariantNumeric: 'tabular-nums',
          fontSize: '10.5px',
          fontWeight: 600,
          padding: '2px 7px',
          borderRadius: '999px',
          background: active ? foto.accent.soft : foto.surfaces.inset,
          color: active ? foto.accent.deep : foto.ink.secondary,
        }}
      >
        {count ?? '—'}
      </Box>
    </Box>
  );
}
