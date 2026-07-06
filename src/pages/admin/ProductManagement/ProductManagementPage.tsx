/**
 * ProductManagementPage — atelier admin panel ("Fotosíntesis").
 *
 * Composition:
 *   - FotoHero: breadcrumb + display title + wax-stamp count + meter
 *   - AdminToolbar (sticky): search, filter, resync
 *   - InventoryRow list (virtualized-ready, currently flat)
 *   - EditDrawer (slides in from the right when a row is selected)
 *
 * Data flow:
 *   - Convex query `products.list` → reactive list (filtered by status server-side)
 *   - Local search filter applied client-side (small optimization since the
 *     mirror is bounded and the search hits multiple fields)
 *   - Convex query `products.syncStats` → toolbar metadata
 *   - Convex action `products.pullFromSheet` → "Resync" button
 *   - Convex mutation `products.saveEdit` → drawer Save button (optimistic;
 *     the row in the list updates the moment Convex acks the patch, before
 *     the Sheets push completes)
 *
 * Per Interface Design mandate:
 *   Intent — find / open / edit / save without leaving the ledger.
 *   Palette — canvas (page) / panel (toolbar + drawer) / inset (inputs).
 *   Depth — borders-only across the whole page.
 *   Surfaces — foto.surfaces.* (cool-neutral white) for the page chrome;
 *   atelier.* still drives type, spacing, motion, brass + focus accents.
 *   Typography — atelier.type.headline for page title; .meta for crumbs.
 *   Spacing — contentMaxWidth 1240, centered with 16px gutter on small.
 */

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useSearchParams } from 'react-router-dom';

import { getAtelier, getFoto } from '../../../design-system';
import {
  useConvexQuery,
  useConvexMutation,
  useConvexAction,
  convexApi,
  convexReady,
} from '../../../lib/convex-safe';
import { useGoogleAuth } from '../../../contexts/GoogleAuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { readFreshGoogleIdToken } from '../../../utils/googleIdToken';

import {
  AdminToolbar,
  type FilterKey,
  type AdvancedScopeFilters,
  type AdvancedFilterOptions,
} from './AdminToolbar';
import { InventoryRow, type InventoryRowData } from './InventoryRow';
import { useBatchThumbnails } from '../../../hooks/useBatchThumbnails';
import {
  normalizeColor,
  normalizeQuality,
} from '../../../constants/quality-and-colors';
import {
  EditDrawer,
  type EditDrawerProduct,
  type EditDrawerPatch,
} from './EditDrawer';
import { FotoHero } from './FotoHero';
import { BulkActionBar, type BulkPriceMode } from './BulkActionBar';
import { Bandeja, type BandejaSelectedProduct } from './Bandeja';
import { StoneHero } from './StoneHero';
import { BloqueoCard } from './BloqueoCard';
import { HistorialCard } from './HistorialCard';
import { PatronCard } from './PatronCard';
import { useChromaSamples } from '../../../hooks/useChromaSamples';
import { usePatrones, usePatronesGlobalTop } from '../../../hooks/usePatrones';
import type { EstadoValue } from './StatusPip';
// Phase G — create flow
import {
  validateNewProduct,
  type NewProductInput,
} from '../../../utils/createProduct-validate';

// =============================================================================
// HELPERS — Convex doc → row / drawer-product
// =============================================================================

function filterToEstado(filter: FilterKey): EstadoValue | undefined {
  switch (filter) {
    case 'available':
      return 'DISPONIBLE';
    case 'sold':
      return 'VENDIDA';
    case 'consigned':
      return 'ASESOR';
    default:
      return undefined;
  }
}

/**
 * Jewelry vs loose-stone heuristic, mirrored from
 * api/get-treasure-sheets.ts: peso = "Plata" / "Oro …" or categoria
 * matches a known jewelry subcategory.
 */
const JEWELRY_CATEGORIES = new Set([
  'anillo en plata',
  'aretes',
  'topitos',
  'pulsera',
  'dije',
  'anillo en oro',
]);

function isJewelryDoc(doc: { peso?: string; categoria?: string }): boolean {
  const peso = (doc.peso ?? '').toLowerCase().trim();
  if (peso === 'plata' || peso.includes('oro')) return true;
  const cat = (doc.categoria ?? '').toLowerCase().trim();
  return JEWELRY_CATEGORIES.has(cat);
}

/**
 * Parse `peso` to a numeric carat count when the string is numeric.
 * "Plata" / "Oro 18k" return null (not in carats).
 */
function parseCarats(peso: string | undefined): number | null {
  if (!peso) return null;
  const n = Number(peso.trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

interface ConvexProductDoc {
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
  ubicacion?: string;
  coleccion?: string;
  caja?: string;
  estado: EstadoValue;
  /**
   * When set, the product belongs to a Fotosíntesis lote. Its public catalog
   * price (precio embajador, col N) is governed by Fotosíntesis, NOT precioCOP
   * (col L) — so the EditDrawer surfaces a deep-link instead of pretending this
   * field is the price.
   */
  loteId?: string;
  syncStatus: 'synced' | 'pending' | 'error';
  syncError?: string;
  lastPushedAt?: string;
}

function toRow(doc: ConvexProductDoc): InventoryRowData {
  return {
    itemId: doc.itemId,
    nombre: doc.nombre,
    peso: doc.peso,
    color: doc.color,
    calidad: doc.calidad,
    precioCOP: doc.precioCOP,
    ubicacion: doc.ubicacion,
    coleccion: doc.coleccion,
    estado: doc.estado,
    syncStatus: doc.syncStatus,
  };
}

function toDrawerProduct(doc: ConvexProductDoc): EditDrawerProduct {
  return {
    itemId: doc.itemId,
    rowIndex: doc.rowIndex,
    nombre: doc.nombre,
    peso: doc.peso,
    color: doc.color,
    calidad: doc.calidad,
    cantidad: doc.cantidad,
    talla: doc.talla,
    medidas: doc.medidas,
    categoria: doc.categoria,
    precioCOP: doc.precioCOP,
    ubicacion: doc.ubicacion,
    coleccion: doc.coleccion,
    caja: doc.caja,
    estado: doc.estado,
    loteId: doc.loteId,
    syncStatus: doc.syncStatus,
    syncError: doc.syncError,
    lastPushedAt: doc.lastPushedAt,
  };
}

// =============================================================================
// MAIN
// =============================================================================

export default function ProductManagementPage() {
  const theme = useTheme();
  const atelier = getAtelier(theme.palette.mode);
  const foto = getFoto(theme.palette.mode === 'dark' ? 'dark' : 'light');
  const { user } = useGoogleAuth();
  const { notify } = useNotification();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [collection, setCollection] = useState<string | null>(null);
  const [onlyWithImages, setOnlyWithImages] = useState(false);
  const [onlyMissingPrice, setOnlyMissingPrice] = useState(false);
  const [advanced, setAdvanced] = useState<AdvancedScopeFilters>(() => ({
    type: 'all',
    color: null,
    shape: null,
    quality: null,
    category: null,
    cantidad: 'all',
    priceRange: null,
    caratRange: null,
  }));
  const updateAdvanced = useCallback(
    <K extends keyof AdvancedScopeFilters>(
      key: K,
      value: AdvancedScopeFilters[K],
    ) => {
      setAdvanced((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );
  const resetAdvanced = useCallback(() => {
    setAdvanced({
      type: 'all',
      color: null,
      shape: null,
      quality: null,
      category: null,
      cantidad: 'all',
      priceRange: null,
      caratRange: null,
    });
  }, []);

  // selectedBandejaId — driven by row click. Populates the right-hand
  // Bandeja inspector. editingItemId — driven by Bandeja's "Abrir editor"
  // button (wired in Phase D), opens the EditDrawer. Decoupling these
  // states is the central UX change of Phase C.
  const [selectedBandejaId, setSelectedBandejaId] = useState<string | null>(
    null,
  );
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);

  // === Phase G — create flow ===
  // drawerMode dispatches the EditDrawer between "edit" and "create".
  // editingItemId === "__new__" is the sentinel used while the create
  // drawer is open (the drawer renders with product = null in this case).
  const [drawerMode, setDrawerMode] = useState<'edit' | 'create'>('edit');

  // Bulk selection — set of itemIds checked in the row checkboxes.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  // ─── Convex hooks ────────────────────────────────────────────────────
  // Hooks are called unconditionally (Rules of Hooks). When `convexReady`
  // is false, we pass `'skip'` so the hook short-circuits without hitting
  // the network. The components below handle the missing-data case with
  // skeletons + an "instala/configura Convex" empty state.

  const products = useConvexQuery(
    convexApi.products.list,
    convexReady ? { estado: filterToEstado(filter) ?? undefined } : 'skip',
  );

  // Deep-link: /admin/products?item=<itemId> opens the Bandeja inspector for
  // that piece — used by the Fotosíntesis "actividad reciente" feed. Applied
  // once per distinct param (ref-guarded) so it never overrides the operator's
  // later row clicks, then stripped from the URL.
  const [searchParams, setSearchParams] = useSearchParams();
  const appliedItemParamRef = useRef<string | null>(null);
  useEffect(() => {
    const itemParam = searchParams.get('item');
    if (!itemParam || !products) return;
    if (appliedItemParamRef.current === itemParam) return;
    if (!products.some((p) => p.itemId === itemParam)) return;
    appliedItemParamRef.current = itemParam;
    setSelectedBandejaId(itemParam);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('item');
        return next;
      },
      { replace: true },
    );
  }, [searchParams, products, setSearchParams]);

  const stats = useConvexQuery(
    convexApi.products.syncStats,
    convexReady ? {} : 'skip',
  );

  // Phase I — active soft locks across the catalog. Drives the small
  // gold dot beside the status pip on rows held by another editor.
  // Reactive: claimLock/releaseLock notify the "locks" scope, so the
  // dot appears/vanishes the moment a peer opens or closes a drawer.
  const activeLocks = useConvexQuery(
    convexApi.products.listActiveLocks,
    convexReady ? {} : 'skip',
  ) as Array<{ itemId: string; holderEmail: string }> | undefined;

  // saveEdit/saveEditMany/createProduct are Convex actions (not mutations) —
  // they verify the caller's Google ID token server-side before writing (see
  // convex/_lib/authz.ts), so a guest can no longer call them directly.
  const saveEdit = useConvexAction(convexApi.products.saveEdit);
  const saveEditMany = useConvexAction(convexApi.products.saveEditMany);
  // Phase G — create flow action
  const createProduct = useConvexAction(
    convexApi.products.createProduct,
  ) as (args: {
    idToken: string;
    itemId: string;
    fields: Omit<NewProductInput, 'itemId'>;
  }) => Promise<{ itemId: string; productId: string; rowIndex: number }>;
  // Phase D — lock takeover from Bandeja's Bloqueo card
  const claimLock = useConvexMutation(convexApi.products.claimLock);
  const pullFromSheet = useConvexAction(convexApi.products.pullFromSheet);
  const retryPush = useConvexAction(convexApi.products.retryPush);

  // Patrones — selected stone's combos when a row is active, else
  // the catalog-wide top combos (rendered in the no-selection Bandeja).
  const patrones = usePatrones(selectedBandejaId);
  const patronesGlobal = usePatronesGlobalTop();

  // Phase I — set of itemIds currently locked by someone other than the
  // current editor. We exclude self-held locks so a user editing in one
  // tab doesn't see a "locked by another" dot on their own row.
  const lockedByOtherSet = useMemo(() => {
    const out = new Set<string>();
    if (!activeLocks) return out;
    const myEmail = user?.email ?? '';
    for (const lock of activeLocks) {
      if (lock.holderEmail !== myEmail) out.add(lock.itemId);
    }
    return out;
  }, [activeLocks, user?.email]);

  // Drive thumbnails — single batched call, cached in localStorage for 24h
  const { thumbnails } = useBatchThumbnails();

  // Per-thumbnail dominant chroma — drives the row's left-edge
  // ChromaBar. Lazy 1×1 canvas sample, persisted in localStorage 7d.
  const { samples: chromaSamples } = useChromaSamples(thumbnails);

  // ─── Derived state ───────────────────────────────────────────────────

  // Available collections (sorted, de-duped) — populates the collection select
  const collections = useMemo(() => {
    if (!products) return [];
    const seen = new Set<string>();
    for (const p of products) {
      const c = (p.coleccion ?? '').trim();
      if (c) seen.add(c);
    }
    return [...seen].sort((a, b) => a.localeCompare(b, 'es'));
  }, [products]);

  // Status distribution — used by the hero
  const statusCounts = useMemo(() => {
    const counts = { available: 0, consigned: 0, sold: 0, blank: 0 };
    if (!products) return counts;
    for (const p of products) {
      if (p.estado === 'DISPONIBLE') counts.available++;
      else if (p.estado === 'ASESOR') counts.consigned++;
      else if (p.estado === 'VENDIDA') counts.sold++;
      else counts.blank++;
    }
    return counts;
  }, [products]);

  // Advanced filter options — colors, shapes, qualities, categories,
  // and numeric ranges for price + carats. Sorted, de-duped, normalized.
  const advancedOptions: AdvancedFilterOptions = useMemo(() => {
    if (!products || products.length === 0) {
      return {
        colors: [],
        shapes: [],
        qualities: [],
        categories: [],
        priceMinMax: [0, 0],
        caratMinMax: [0, 0],
      };
    }
    const colors = new Set<string>();
    const shapes = new Set<string>();
    const qualities = new Set<string>();
    const categories = new Set<string>();
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let minCar = Infinity;
    let maxCar = -Infinity;
    for (const p of products) {
      const c = normalizeColor(p.color ?? '');
      if (c) colors.add(c);
      const t = (p.talla ?? '').trim();
      if (t) shapes.add(t);
      const q = normalizeQuality(p.calidad ?? '');
      if (q) qualities.add(q);
      const k = (p.categoria ?? '').trim();
      if (k) categories.add(k);
      if (typeof p.precioCOP === 'number' && p.precioCOP > 0) {
        if (p.precioCOP < minPrice) minPrice = p.precioCOP;
        if (p.precioCOP > maxPrice) maxPrice = p.precioCOP;
      }
      const carats = parseCarats(p.peso);
      if (carats !== null) {
        if (carats < minCar) minCar = carats;
        if (carats > maxCar) maxCar = carats;
      }
    }
    return {
      colors: [...colors].sort((a, b) => a.localeCompare(b, 'es')),
      shapes: [...shapes].sort((a, b) => a.localeCompare(b, 'es')),
      qualities: [...qualities].sort((a, b) => a.localeCompare(b, 'es')),
      categories: [...categories].sort((a, b) => a.localeCompare(b, 'es')),
      priceMinMax: Number.isFinite(minPrice) ? [minPrice, maxPrice] : [0, 0],
      caratMinMax: Number.isFinite(minCar) ? [minCar, maxCar] : [0, 0],
    };
  }, [products]);

  const filteredRows = useMemo(() => {
    if (!products) return [];
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      // Text search
      if (q) {
        const hit =
          p.itemId.toLowerCase().includes(q) ||
          (p.nombre ?? '').toLowerCase().includes(q) ||
          (p.color ?? '').toLowerCase().includes(q) ||
          (p.calidad ?? '').toLowerCase().includes(q) ||
          (p.coleccion ?? '').toLowerCase().includes(q) ||
          (p.ubicacion ?? '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      // Collection filter
      if (collection && (p.coleccion ?? '').trim() !== collection) {
        return false;
      }
      // Has-images toggle (uses the batched thumbnail map)
      if (onlyWithImages) {
        const n = Number(p.itemId);
        if (!Number.isFinite(n) || !thumbnails[n]?.url) return false;
      }
      // Missing-price toggle (data quality)
      if (onlyMissingPrice) {
        if (typeof p.precioCOP === 'number' && Number.isFinite(p.precioCOP)) {
          return false;
        }
      }
      // Advanced — type (loose vs jewelry)
      if (advanced.type !== 'all') {
        const isJ = isJewelryDoc(p);
        if (advanced.type === 'jewelry' && !isJ) return false;
        if (advanced.type === 'loose' && isJ) return false;
      }
      // Advanced — color
      if (advanced.color) {
        if (normalizeColor(p.color ?? '') !== advanced.color) return false;
      }
      // Advanced — shape (talla)
      if (advanced.shape) {
        if ((p.talla ?? '').trim() !== advanced.shape) return false;
      }
      // Advanced — quality
      if (advanced.quality) {
        if (normalizeQuality(p.calidad ?? '') !== advanced.quality)
          return false;
      }
      // Advanced — category
      if (advanced.category) {
        if ((p.categoria ?? '').trim() !== advanced.category) return false;
      }
      // Advanced — cantidad (1 / 2+)
      if (advanced.cantidad === '1') {
        if (p.cantidad !== 1) return false;
      } else if (advanced.cantidad === '2+') {
        if (typeof p.cantidad !== 'number' || p.cantidad <= 1) return false;
      }
      // Advanced — price range (only filters items with a numeric price)
      if (advanced.priceRange) {
        const [lo, hi] = advanced.priceRange;
        if (typeof p.precioCOP === 'number' && Number.isFinite(p.precioCOP)) {
          if (p.precioCOP < lo || p.precioCOP > hi) return false;
        }
        // Items without a price pass through; "Sin precio" is a separate filter
      }
      // Advanced — carat range (only filters items with numeric peso)
      if (advanced.caratRange) {
        const c = parseCarats(p.peso);
        if (c !== null) {
          const [lo, hi] = advanced.caratRange;
          if (c < lo || c > hi) return false;
        }
        // Items with non-numeric peso (Plata / Oro 18k) pass through
      }
      return true;
    });
  }, [
    products,
    search,
    collection,
    onlyWithImages,
    onlyMissingPrice,
    advanced,
    thumbnails,
  ]);

  // Drawer-target product — looked up by editingItemId (Bandeja's
  // "Abrir editor" button, wired in Phase D). The "__new__" sentinel
  // (Phase G) opens the drawer in create mode with no underlying doc.
  const editing = useMemo(
    () =>
      editingItemId && editingItemId !== '__new__' && products
        ? (products.find((p) => p.itemId === editingItemId) ?? null)
        : null,
    [editingItemId, products],
  );

  // === Phase G — create flow ===
  // Set of every itemId currently in the mirror — fed to validateNewProduct
  // for the duplicate-id check. Recomputed on every products refresh.
  const existingItemIds = useMemo(() => {
    const ids = new Set<string>();
    if (products) for (const p of products) ids.add(p.itemId);
    return ids;
  }, [products]);

  // Bandeja-target product — looked up by selectedBandejaId (row click).
  const selectedForBandeja = useMemo(
    () =>
      selectedBandejaId && products
        ? (products.find((p) => p.itemId === selectedBandejaId) ?? null)
        : null,
    [selectedBandejaId, products],
  );

  // Shape the Bandeja's input — adds the resolved thumbnail + chroma
  // sample alongside the doc's data so the inspector can render
  // immediately, without re-querying the thumbnail map per child card.
  const selectedBandeja: BandejaSelectedProduct | null = useMemo(() => {
    if (!selectedForBandeja) return null;
    const itemNumber = Number(selectedForBandeja.itemId);
    return {
      itemId: selectedForBandeja.itemId,
      nombre: selectedForBandeja.nombre,
      peso: selectedForBandeja.peso,
      color: selectedForBandeja.color,
      calidad: selectedForBandeja.calidad,
      coleccion: selectedForBandeja.coleccion,
      precioCOP: selectedForBandeja.precioCOP,
      thumbnailUrl: Number.isFinite(itemNumber)
        ? thumbnails[itemNumber]?.url
        : undefined,
      chromaHex: Number.isFinite(itemNumber)
        ? chromaSamples[itemNumber]
        : undefined,
    };
  }, [selectedForBandeja, thumbnails, chromaSamples]);

  // Close drawer with Escape when not saving
  useEffect(() => {
    if (!editingItemId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        // Phase G — also reset drawerMode so a follow-up open isn't
        // stuck in create mode.
        setEditingItemId(null);
        setDrawerMode('edit');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingItemId, isSaving]);

  // ─── Handlers ────────────────────────────────────────────────────────

  // === Phase G — create flow ===
  // Open the drawer in create mode by setting both the sentinel id and
  // drawerMode together so the EditDrawer renders empty in a single tick.
  const handleCreateNew = useCallback(() => {
    setDrawerMode('create');
    setEditingItemId('__new__');
  }, []);

  // Unified save handler — dispatches on mode. Edit path mirrors the
  // pre-Phase-G handler unchanged (saveEdit + diff-based notify). Create
  // path validates with validateNewProduct, then fires createProduct.
  const handleSave = useCallback(
    async (
      itemId: string | undefined,
      payload: EditDrawerPatch | NewProductInput,
      mode: 'edit' | 'create',
    ) => {
      if (!user?.email) {
        notify('Tu sesión no tiene email. Vuelve a iniciar sesión.', 'error');
        return;
      }
      const idToken = readFreshGoogleIdToken();
      if (!idToken) {
        notify(
          'Tu sesión expiró. Vuelve a iniciar sesión con Google.',
          'error',
        );
        return;
      }
      setIsSaving(true);
      try {
        if (mode === 'create') {
          const validated = validateNewProduct(
            payload as NewProductInput,
            existingItemIds,
          );
          if (!validated.ok) {
            notify(validated.error, 'error');
            return;
          }
          const { itemId: createdId, ...fields } = validated.value;
          const result = await createProduct({
            idToken,
            itemId: createdId,
            fields,
          });
          notify(
            `Creada · ${result.itemId} · sincronizando con la hoja`,
            'success',
          );
          setDrawerMode('edit');
          setEditingItemId(null);
          return;
        }

        // mode === "edit"
        const patch = payload as EditDrawerPatch;
        if (!itemId || Object.keys(patch).length === 0) return;
        const result = await saveEdit({
          idToken,
          itemId,
          patch,
        });
        notify(
          `Guardado · ${result.changesCount} cambio${
            result.changesCount === 1 ? '' : 's'
          } en la hoja en breve`,
          'success',
        );
        setEditingItemId(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        notify(
          mode === 'create'
            ? `No se pudo crear: ${msg}`
            : `No se pudo guardar: ${msg}`,
          'error',
        );
      } finally {
        setIsSaving(false);
      }
    },
    [saveEdit, createProduct, existingItemIds, user?.email, user?.name, notify],
  );

  // Close drawer on cancel — also reset drawerMode so the next open
  // starts in edit mode unless explicitly entered via handleCreateNew.
  const handleCloseDrawer = useCallback(() => {
    setEditingItemId(null);
    setDrawerMode('edit');
  }, []);

  const handleResync = useCallback(async () => {
    const idToken = readFreshGoogleIdToken();
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
      notify(`Error al sincronizar: ${msg}`, 'error');
    } finally {
      setIsResyncing(false);
    }
  }, [pullFromSheet, notify]);

  // Bandeja takeover — claimLock for the selected stone. The mutation
  // doesn't accept a `force` flag yet (Phase J/I will add it); when it
  // fails because someone else holds an unexpired lock, surface the
  // holder's identity in the toast.
  const handleClaimLock = useCallback(async () => {
    if (!selectedBandejaId) return;
    if (!user?.email) {
      notify('Tu sesión no tiene email. Vuelve a iniciar sesión.', 'error');
      return;
    }
    try {
      const result = await claimLock({
        itemId: selectedBandejaId,
        holderEmail: user.email,
        holderName: user.name,
      });
      if (result?.ok) {
        notify('Control reclamado', 'success');
      } else if (result && 'holder' in result) {
        const who = result.holder.name ?? result.holder.email;
        notify(`No se pudo reclamar el bloqueo: ${who} aún edita`, 'error');
      } else {
        notify('No se pudo reclamar el bloqueo', 'error');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'error';
      notify(`No se pudo reclamar el bloqueo: ${msg}`, 'error');
    }
  }, [claimLock, selectedBandejaId, user?.email, user?.name, notify]);

  // === Phase H — inline edit ===
  // Forward a single-field patch from a row's InlineEditCell to the
  // saveEdit mutation. Mirrors the drawer's save path but skips the
  // toast on success — the row updates optimistically, which is its
  // own confirmation. Errors still surface via the notification system.
  const handleInlineEdit = useCallback(
    async (itemId: string, patch: Record<string, unknown>) => {
      if (!user?.email) {
        notify('Tu sesión no tiene email. Vuelve a iniciar sesión.', 'error');
        return;
      }
      const idToken = readFreshGoogleIdToken();
      if (!idToken) {
        notify(
          'Tu sesión expiró. Vuelve a iniciar sesión con Google.',
          'error',
        );
        return;
      }
      try {
        await saveEdit({
          idToken,
          itemId,
          patch,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        notify(`No se pudo guardar: ${msg}`, 'error');
      }
    },
    [saveEdit, user?.email, user?.name, notify],
  );

  const handleRetry = useCallback(
    async (itemId: string) => {
      try {
        const result = await retryPush({ itemId });
        if (result.ok) {
          notify(`Reintento exitoso · ${itemId}`, 'success');
        } else {
          notify(`Reintento falló · ${result.message}`, 'error');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        notify(`Reintento falló · ${msg}`, 'error');
      }
    },
    [retryPush, notify],
  );

  // ─── Bulk selection ──────────────────────────────────────────────────

  const toggleSelect = useCallback((itemId: string, next: boolean) => {
    setSelectedIds((prev) => {
      const updated = new Set(prev);
      if (next) updated.add(itemId);
      else updated.delete(itemId);
      return updated;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleBulkMark = useCallback(
    async (estado: 'DISPONIBLE' | 'VENDIDA') => {
      if (!user?.email) {
        notify('Tu sesión no tiene email. Vuelve a iniciar sesión.', 'error');
        return;
      }
      if (selectedIds.size === 0) return;
      const idToken = readFreshGoogleIdToken();
      if (!idToken) {
        notify(
          'Tu sesión expiró. Vuelve a iniciar sesión con Google.',
          'error',
        );
        return;
      }
      setIsBulkSaving(true);
      try {
        const itemIds = Array.from(selectedIds);
        const result = await saveEditMany({
          idToken,
          itemIds,
          patch: { estado },
        });
        const verb = estado === 'VENDIDA' ? 'vendidas' : 'disponibles';
        const parts = [
          `${result.updatedCount} marcada${result.updatedCount === 1 ? '' : 's'} como ${verb}`,
        ];
        if (result.unchangedCount > 0) {
          parts.push(`${result.unchangedCount} sin cambios`);
        }
        if (result.missingCount > 0) {
          parts.push(
            `${result.missingCount} no encontrada${result.missingCount === 1 ? '' : 's'}`,
          );
        }
        // C2 — sale-owned items can't be freed via a bulk estado flip; surface
        // the skip instead of silently dropping it.
        if (result.blockedCount > 0) {
          parts.push(
            `${result.blockedCount} en venta activa (cancelá la venta para liberar)`,
          );
        }
        notify(
          parts.join(' · '),
          result.blockedCount > 0 ? 'warning' : 'success',
        );
        clearSelection();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        notify(`No se pudo marcar en lote: ${msg}`, 'error');
      } finally {
        setIsBulkSaving(false);
      }
    },
    [
      user?.email,
      user?.name,
      selectedIds,
      saveEditMany,
      notify,
      clearSelection,
    ],
  );

  // === Phase H — bulk price / coleccion / ubicacion ===
  // For "absolute" we can use saveEditMany (single shared patch).
  // For "delta" / "percent" we need per-item math, so iterate with
  // saveEdit and Promise.all the calls.
  const handleBulkChangePrice = useCallback(
    async ({ mode, value }: { mode: BulkPriceMode; value: number }) => {
      if (!user?.email || selectedIds.size === 0) return;
      const idToken = readFreshGoogleIdToken();
      if (!idToken) {
        notify(
          'Tu sesión expiró. Vuelve a iniciar sesión con Google.',
          'error',
        );
        return;
      }
      setIsBulkSaving(true);
      try {
        if (mode === 'absolute') {
          await saveEditMany({
            idToken,
            itemIds: Array.from(selectedIds),
            patch: { precioCOP: value },
          });
        } else {
          const ops = Array.from(selectedIds).map(async (id) => {
            const p = products?.find((q) => q.itemId === id);
            if (!p || typeof p.precioCOP !== 'number') return;
            const next =
              mode === 'delta'
                ? p.precioCOP + value
                : Math.round(p.precioCOP * (1 + value / 100));
            await saveEdit({
              idToken,
              itemId: id,
              patch: { precioCOP: next },
            });
          });
          await Promise.all(ops);
        }
        notify(
          `Precio actualizado en ${selectedIds.size} piedra${
            selectedIds.size === 1 ? '' : 's'
          }`,
          'success',
        );
        clearSelection();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'error';
        notify(`No se pudo actualizar precio: ${msg}`, 'error');
      } finally {
        setIsBulkSaving(false);
      }
    },
    [
      selectedIds,
      user?.email,
      user?.name,
      products,
      saveEdit,
      saveEditMany,
      notify,
      clearSelection,
    ],
  );

  const handleBulkChangeColeccion = useCallback(
    async (value: string) => {
      if (!user?.email || selectedIds.size === 0) return;
      const idToken = readFreshGoogleIdToken();
      if (!idToken) {
        notify(
          'Tu sesión expiró. Vuelve a iniciar sesión con Google.',
          'error',
        );
        return;
      }
      setIsBulkSaving(true);
      try {
        await saveEditMany({
          idToken,
          itemIds: Array.from(selectedIds),
          patch: { coleccion: value },
        });
        notify(
          `Colección actualizada en ${selectedIds.size} piedra${
            selectedIds.size === 1 ? '' : 's'
          }`,
          'success',
        );
        clearSelection();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'error';
        notify(`No se pudo actualizar colección: ${msg}`, 'error');
      } finally {
        setIsBulkSaving(false);
      }
    },
    [
      selectedIds,
      user?.email,
      user?.name,
      saveEditMany,
      notify,
      clearSelection,
    ],
  );

  const handleBulkChangeUbicacion = useCallback(
    async (value: string) => {
      if (!user?.email || selectedIds.size === 0) return;
      const idToken = readFreshGoogleIdToken();
      if (!idToken) {
        notify(
          'Tu sesión expiró. Vuelve a iniciar sesión con Google.',
          'error',
        );
        return;
      }
      setIsBulkSaving(true);
      try {
        await saveEditMany({
          idToken,
          itemIds: Array.from(selectedIds),
          patch: { ubicacion: value },
        });
        notify(
          `Ubicación actualizada en ${selectedIds.size} piedra${
            selectedIds.size === 1 ? '' : 's'
          }`,
          'success',
        );
        clearSelection();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'error';
        notify(`No se pudo actualizar ubicación: ${msg}`, 'error');
      } finally {
        setIsBulkSaving(false);
      }
    },
    [
      selectedIds,
      user?.email,
      user?.name,
      saveEditMany,
      notify,
      clearSelection,
    ],
  );

  // ─── Render ──────────────────────────────────────────────────────────

  if (!convexReady) {
    return <ConvexUnavailable atelier={atelier} foto={foto} />;
  }

  const isLoading = products === undefined;
  const isEmpty = !isLoading && filteredRows.length === 0;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: foto.surfaces.canvas,
        color: atelier.ink.primary,
      }}
    >
      {/* Editorial hero — full-bleed, breathes outside the content gutter */}
      <FotoHero
        foto={foto}
        total={stats?.total ?? products?.length ?? 0}
        available={statusCounts.available}
        consigned={statusCounts.consigned}
        sold={statusCounts.sold}
        sparkline={[3, 5, 4, 7, 5, 9, 7, 10]} // placeholder until Phase E wires patronesGlobalTop weekly buckets
        lastPull={stats?.lastPull ?? null}
        isResyncing={isResyncing}
        onResync={handleResync}
        // Phase G — wired
        onCreateNew={handleCreateNew}
      />

      {/* Workbench split — ledger on the left, Bandeja inspector on
          the right. Below `md` (900px), Bandeja stacks under the
          ledger so phones / narrow tablets stay single-column. */}
      <Box
        sx={{
          maxWidth: 1440,
          mx: 'auto',
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'minmax(0, 1.7fr) minmax(0, 1fr)',
            lg: 'minmax(0, 1.6fr) minmax(0, 1fr)',
          },
        }}
      >
        <Box
          sx={{
            borderRight: { md: `1px solid ${foto.surfaces.edge}` },
            minWidth: 0,
            px: { xs: 2, md: 3 },
          }}
        >
          {/* Toolbar */}
          <AdminToolbar
            foto={foto}
            search={search}
            onSearchChange={setSearch}
            filter={filter}
            onFilterChange={setFilter}
            collection={collection}
            onCollectionChange={setCollection}
            collections={collections}
            onlyWithImages={onlyWithImages}
            onOnlyWithImagesChange={setOnlyWithImages}
            onlyMissingPrice={onlyMissingPrice}
            onOnlyMissingPriceChange={setOnlyMissingPrice}
            advanced={advanced}
            onAdvancedChange={updateAdvanced}
            onAdvancedReset={resetAdvanced}
            advancedOptions={advancedOptions}
            total={stats?.total ?? products?.length ?? 0}
            filteredCount={filteredRows.length}
          />

          {/* List */}
          <Box
            role="list"
            aria-label="Productos en el espejo"
            sx={{
              backgroundColor: foto.surfaces.canvas,
              borderLeft: `1px solid ${foto.surfaces.edge}`,
              borderRight: `1px solid ${foto.surfaces.edge}`,
              borderBottom: `1px solid ${foto.surfaces.edge}`,
              overflow: 'hidden',
            }}
          >
            {isLoading && (
              <ListSkeletons atelier={atelier} foto={foto} count={8} />
            )}
            {!isLoading && isEmpty && (
              <EmptyState
                atelier={atelier}
                foto={foto}
                hasFilter={!!search.trim() || filter !== 'all'}
                onResync={handleResync}
                isResyncing={isResyncing}
              />
            )}
            {!isLoading &&
              filteredRows.map((doc) => {
                const itemNumber = Number(doc.itemId);
                const thumb = Number.isFinite(itemNumber)
                  ? thumbnails[itemNumber]?.url
                  : undefined;
                const chromaHex = Number.isFinite(itemNumber)
                  ? chromaSamples[itemNumber]
                  : undefined;
                return (
                  <Box key={doc.itemId} role="listitem">
                    <InventoryRow
                      row={toRow(doc)}
                      isActive={selectedBandejaId === doc.itemId}
                      isSelected={selectedIds.has(doc.itemId)}
                      thumbnailUrl={thumb}
                      chromaHex={chromaHex}
                      foto={foto}
                      onOpen={setSelectedBandejaId}
                      onToggleSelect={toggleSelect}
                      onRetry={handleRetry}
                      // === Phase H — inline edit ===
                      onInlineEdit={handleInlineEdit}
                      // === Phase I — lock indicator ===
                      isLockedByOther={lockedByOtherSet.has(doc.itemId)}
                    />
                  </Box>
                );
              })}
          </Box>

          {/* Footer count */}
          {!isLoading && !isEmpty && (
            <Typography
              sx={{
                ...atelier.type.label,
                color: atelier.ink.tertiary,
                py: 3,
                textAlign: 'center',
              }}
            >
              {filteredRows.length} de {stats?.total ?? products?.length ?? 0}{' '}
              en el espejo
            </Typography>
          )}
        </Box>

        {/* Bandeja — StoneHero, PatronCard, HistorialCard, BloqueoCard
            for the selected row; global patrones + read-only historial
            when nothing is selected. */}
        <Bandeja foto={foto} selected={selectedBandeja}>
          {selectedBandeja && (
            <>
              <StoneHero
                foto={foto}
                itemId={selectedBandeja.itemId}
                nombre={selectedBandeja.nombre}
                peso={selectedBandeja.peso}
                coleccion={selectedBandeja.coleccion}
                calidad={selectedBandeja.calidad}
                precioCOP={selectedBandeja.precioCOP}
                thumbnailUrl={selectedBandeja.thumbnailUrl}
                chromaHex={selectedBandeja.chromaHex}
                onOpenEditor={() => setEditingItemId(selectedBandeja.itemId)}
              />
              <PatronCard foto={foto} data={patrones} variant="selected" />
              <HistorialCard foto={foto} itemId={selectedBandeja.itemId} />
              <BloqueoCard
                foto={foto}
                itemId={selectedBandeja.itemId}
                currentEmail={user?.email ?? null}
                onClaim={handleClaimLock}
              />
            </>
          )}
          {!selectedBandeja && (
            <>
              <PatronCard foto={foto} data={patronesGlobal} variant="global" />
              <HistorialCard foto={foto} itemId={null} />
            </>
          )}
        </Bandeja>
      </Box>

      {/* Drawer — opened by Bandeja's "Abrir editor" button (Phase D)
          or the FotoHero "+ Nueva piedra" button (Phase G, mode="create"). */}
      <EditDrawer
        open={!!editingItemId}
        product={editing ? toDrawerProduct(editing) : null}
        isSaving={isSaving}
        // Phase G — create mode
        mode={drawerMode}
        onClose={handleCloseDrawer}
        onSave={handleSave}
        onResync={handleResync}
        isResyncing={isResyncing}
      />

      {/* Bulk action bar — slides up from the viewport bottom while
          one or more rows are checked. Always mounted so the slide-out
          animation runs on the last unselect. */}
      <BulkActionBar
        visible={selectedIds.size > 0}
        count={selectedIds.size}
        isSaving={isBulkSaving}
        foto={foto}
        collections={collections}
        onMarkAvailable={() => void handleBulkMark('DISPONIBLE')}
        onMarkSold={() => void handleBulkMark('VENDIDA')}
        onChangePrice={(next) => void handleBulkChangePrice(next)}
        onChangeColeccion={(v) => void handleBulkChangeColeccion(v)}
        onChangeUbicacion={(v) => void handleBulkChangeUbicacion(v)}
        onClear={clearSelection}
      />
    </Box>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function ListSkeletons({
  atelier,
  foto,
  count,
}: {
  atelier: ReturnType<typeof getAtelier>;
  foto: ReturnType<typeof getFoto>;
  count: number;
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Box
          key={i}
          sx={{
            px: `${atelier.spacing.rowPaddingX}px`,
            py: `${atelier.spacing.rowPaddingY}px`,
            borderBottom: `1px solid ${foto.surfaces.edge}`,
            display: 'grid',
            gridTemplateColumns: {
              xs: '16px 56px 12px 32px minmax(0, 1fr) 84px 116px 10px',
              sm: '16px 64px 14px 32px minmax(0, 1fr) 92px 128px 12px',
              md: '20px 72px 16px 36px minmax(0, 1fr) 96px 136px 12px',
            },
            alignItems: 'center',
            gap: { xs: 1.25, md: 1.75 },
          }}
        >
          <Skeleton
            variant="rectangular"
            width={16}
            height={16}
            sx={{ borderRadius: '3px' }}
          />
          <Skeleton variant="text" width={48} sx={{ ml: 'auto' }} />
          <Skeleton variant="rectangular" width={6} height={26} />
          <Skeleton
            variant="rectangular"
            width={32}
            height={32}
            sx={{ borderRadius: '3px' }}
          />
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width={56} sx={{ ml: 'auto' }} />
          <Skeleton variant="text" width={88} sx={{ ml: 'auto' }} />
          <Box />
        </Box>
      ))}
    </>
  );
}

function EmptyState({
  atelier,
  foto: _foto,
  hasFilter,
  onResync,
  isResyncing,
}: {
  atelier: ReturnType<typeof getAtelier>;
  foto: ReturnType<typeof getFoto>;
  hasFilter: boolean;
  onResync: () => void;
  isResyncing: boolean;
}) {
  return (
    <Box
      sx={{
        py: 8,
        px: 3,
        textAlign: 'center',
      }}
    >
      <Typography
        sx={{
          ...atelier.type.section,
          color: atelier.ink.tertiary,
          mb: 1,
        }}
      >
        {hasFilter ? 'Sin coincidencias' : 'Espejo vacío'}
      </Typography>
      <Typography
        sx={{
          ...atelier.type.meta,
          color: atelier.ink.secondary,
          maxWidth: 420,
          mx: 'auto',
          mb: 3,
        }}
      >
        {hasFilter
          ? 'Ajusta la búsqueda o el filtro para ver más entradas del inventario.'
          : 'No hay productos sincronizados todavía. Pulsa Resync para cargar la hoja Inventario en el espejo.'}
      </Typography>
      {!hasFilter && (
        <Box
          component="button"
          onClick={onResync}
          disabled={isResyncing}
          sx={{
            ...atelier.type.label,
            color: atelier.ink.inverse,
            backgroundColor: isResyncing
              ? atelier.ink.muted
              : atelier.focus.ring,
            border: 'none',
            borderRadius: '4px',
            px: '16px',
            py: '10px',
            cursor: isResyncing ? 'default' : 'pointer',
            transition: atelier.motion.rowHover,
            '&:focus-visible': {
              outline: `2px solid ${atelier.focus.ring}`,
              outlineOffset: '2px',
            },
          }}
        >
          {isResyncing ? 'Sincronizando…' : 'Sincronizar desde la hoja'}
        </Box>
      )}
    </Box>
  );
}

function ConvexUnavailable({
  atelier,
  foto,
}: {
  atelier: ReturnType<typeof getAtelier>;
  foto: ReturnType<typeof getFoto>;
}) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: foto.surfaces.canvas,
        color: atelier.ink.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
      }}
    >
      <Box sx={{ maxWidth: 480, textAlign: 'center' }}>
        <Typography
          sx={{ ...atelier.type.section, color: atelier.ink.tertiary, mb: 1 }}
        >
          Convex no configurado
        </Typography>
        <Typography
          sx={{ ...atelier.type.headline, color: atelier.ink.primary, mb: 2 }}
        >
          El atelier necesita Convex
        </Typography>
        <Typography sx={{ ...atelier.type.meta, color: atelier.ink.secondary }}>
          Define <code>VITE_CONVEX_URL</code> en tu entorno y despliega las
          funciones de <code>convex/products.ts</code>. Mira el README en
          <code>convex/</code> para los pasos de configuración.
        </Typography>
      </Box>
    </Box>
  );
}

// === Phase H — BulkActionBar moved to its own module ===
// See `./BulkActionBar.tsx`. The new component receives Fotosíntesis
// tokens (`foto`) instead of atelier and exposes additional callbacks
// for inline price / colección / ubicación editing in lote.
