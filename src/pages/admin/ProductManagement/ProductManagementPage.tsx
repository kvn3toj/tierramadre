/**
 * ProductManagementPage — atelier admin panel ("Fotosíntesis").
 *
 * Composition:
 *   - LedgerHero: breadcrumb + display title + wax-stamp count + meter
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
 *   Surfaces — atelier.surfaces.* only; no shadows, no glass.
 *   Typography — atelier.type.headline for page title; .meta for crumbs.
 *   Spacing — contentMaxWidth 1240, centered with 16px gutter on small.
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import { Box, ButtonBase, Typography, Skeleton } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { getAtelier, getFoto } from "../../../design-system";
import {
  useConvexQuery,
  useConvexMutation,
  useConvexAction,
  convexApi,
  convexReady,
} from "../../../lib/convex-safe";
import { useGoogleAuth } from "../../../contexts/GoogleAuthContext";
import { useNotification } from "../../../contexts/NotificationContext";

import {
  AdminToolbar,
  type FilterKey,
  type AdvancedScopeFilters,
  type AdvancedFilterOptions,
} from "./AdminToolbar";
import { InventoryRow, type InventoryRowData } from "./InventoryRow";
import { useBatchThumbnails } from "../../../hooks/useBatchThumbnails";
import {
  normalizeColor,
  normalizeQuality,
} from "../../../constants/quality-and-colors";
import {
  EditDrawer,
  type EditDrawerProduct,
  type EditDrawerPatch,
} from "./EditDrawer";
import { FotoHero } from "./FotoHero";
import { Bandeja, type BandejaSelectedProduct } from "./Bandeja";
import { useChromaSamples } from "../../../hooks/useChromaSamples";
import type { EstadoValue } from "./StatusPip";

// =============================================================================
// HELPERS — Convex doc → row / drawer-product
// =============================================================================

function filterToEstado(filter: FilterKey): EstadoValue | undefined {
  switch (filter) {
    case "available":
      return "DISPONIBLE";
    case "sold":
      return "VENDIDA";
    case "consigned":
      return "ASESOR";
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
  "anillo en plata",
  "aretes",
  "topitos",
  "pulsera",
  "dije",
  "anillo en oro",
]);

function isJewelryDoc(doc: { peso?: string; categoria?: string }): boolean {
  const peso = (doc.peso ?? "").toLowerCase().trim();
  if (peso === "plata" || peso.includes("oro")) return true;
  const cat = (doc.categoria ?? "").toLowerCase().trim();
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
  syncStatus: "synced" | "pending" | "error";
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
  const foto = getFoto(theme.palette.mode === "dark" ? "dark" : "light");
  const { user } = useGoogleAuth();
  const { notify } = useNotification();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [collection, setCollection] = useState<string | null>(null);
  const [onlyWithImages, setOnlyWithImages] = useState(false);
  const [onlyMissingPrice, setOnlyMissingPrice] = useState(false);
  const [advanced, setAdvanced] = useState<AdvancedScopeFilters>(() => ({
    type: "all",
    color: null,
    shape: null,
    quality: null,
    category: null,
    cantidad: "all",
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
      type: "all",
      color: null,
      shape: null,
      quality: null,
      category: null,
      cantidad: "all",
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
    convexReady ? { estado: filterToEstado(filter) ?? undefined } : "skip",
  );

  const stats = useConvexQuery(
    convexApi.products.syncStats,
    convexReady ? {} : "skip",
  );

  const saveEdit = useConvexMutation(convexApi.products.saveEdit);
  const saveEditMany = useConvexMutation(convexApi.products.saveEditMany);
  const pullFromSheet = useConvexAction(convexApi.products.pullFromSheet);
  const retryPush = useConvexAction(convexApi.products.retryPush);

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
      const c = (p.coleccion ?? "").trim();
      if (c) seen.add(c);
    }
    return [...seen].sort((a, b) => a.localeCompare(b, "es"));
  }, [products]);

  // Status distribution — used by the hero
  const statusCounts = useMemo(() => {
    const counts = { available: 0, consigned: 0, sold: 0, blank: 0 };
    if (!products) return counts;
    for (const p of products) {
      if (p.estado === "DISPONIBLE") counts.available++;
      else if (p.estado === "ASESOR") counts.consigned++;
      else if (p.estado === "VENDIDA") counts.sold++;
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
      const c = normalizeColor(p.color ?? "");
      if (c) colors.add(c);
      const t = (p.talla ?? "").trim();
      if (t) shapes.add(t);
      const q = normalizeQuality(p.calidad ?? "");
      if (q) qualities.add(q);
      const k = (p.categoria ?? "").trim();
      if (k) categories.add(k);
      if (typeof p.precioCOP === "number" && p.precioCOP > 0) {
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
      colors: [...colors].sort((a, b) => a.localeCompare(b, "es")),
      shapes: [...shapes].sort((a, b) => a.localeCompare(b, "es")),
      qualities: [...qualities].sort((a, b) => a.localeCompare(b, "es")),
      categories: [...categories].sort((a, b) => a.localeCompare(b, "es")),
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
          (p.nombre ?? "").toLowerCase().includes(q) ||
          (p.color ?? "").toLowerCase().includes(q) ||
          (p.calidad ?? "").toLowerCase().includes(q) ||
          (p.coleccion ?? "").toLowerCase().includes(q) ||
          (p.ubicacion ?? "").toLowerCase().includes(q);
        if (!hit) return false;
      }
      // Collection filter
      if (collection && (p.coleccion ?? "").trim() !== collection) {
        return false;
      }
      // Has-images toggle (uses the batched thumbnail map)
      if (onlyWithImages) {
        const n = Number(p.itemId);
        if (!Number.isFinite(n) || !thumbnails[n]?.url) return false;
      }
      // Missing-price toggle (data quality)
      if (onlyMissingPrice) {
        if (typeof p.precioCOP === "number" && Number.isFinite(p.precioCOP)) {
          return false;
        }
      }
      // Advanced — type (loose vs jewelry)
      if (advanced.type !== "all") {
        const isJ = isJewelryDoc(p);
        if (advanced.type === "jewelry" && !isJ) return false;
        if (advanced.type === "loose" && isJ) return false;
      }
      // Advanced — color
      if (advanced.color) {
        if (normalizeColor(p.color ?? "") !== advanced.color) return false;
      }
      // Advanced — shape (talla)
      if (advanced.shape) {
        if ((p.talla ?? "").trim() !== advanced.shape) return false;
      }
      // Advanced — quality
      if (advanced.quality) {
        if (normalizeQuality(p.calidad ?? "") !== advanced.quality)
          return false;
      }
      // Advanced — category
      if (advanced.category) {
        if ((p.categoria ?? "").trim() !== advanced.category) return false;
      }
      // Advanced — cantidad (1 / 2+)
      if (advanced.cantidad === "1") {
        if (p.cantidad !== 1) return false;
      } else if (advanced.cantidad === "2+") {
        if (typeof p.cantidad !== "number" || p.cantidad <= 1) return false;
      }
      // Advanced — price range (only filters items with a numeric price)
      if (advanced.priceRange) {
        const [lo, hi] = advanced.priceRange;
        if (typeof p.precioCOP === "number" && Number.isFinite(p.precioCOP)) {
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
  // "Abrir editor" button, wired in Phase D).
  const editing = useMemo(
    () =>
      editingItemId && products
        ? (products.find((p) => p.itemId === editingItemId) ?? null)
        : null,
    [editingItemId, products],
  );

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
      if (e.key === "Escape" && !isSaving) {
        setEditingItemId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingItemId, isSaving]);

  // ─── Handlers ────────────────────────────────────────────────────────

  const handleSave = useCallback(
    async (itemId: string, patch: EditDrawerPatch) => {
      if (!user?.email) {
        notify("Tu sesión no tiene email. Vuelve a iniciar sesión.", "error");
        return;
      }
      if (Object.keys(patch).length === 0) return;
      setIsSaving(true);
      try {
        const result = await saveEdit({
          itemId,
          editorEmail: user.email,
          editorName: user.name,
          patch,
        });
        notify(
          `Guardado · ${result.changesCount} cambio${
            result.changesCount === 1 ? "" : "s"
          } en la hoja en breve`,
          "success",
        );
        setEditingItemId(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        notify(`No se pudo guardar: ${msg}`, "error");
      } finally {
        setIsSaving(false);
      }
    },
    [saveEdit, user?.email, user?.name, notify],
  );

  const handleResync = useCallback(async () => {
    setIsResyncing(true);
    try {
      const result = await pullFromSheet({});
      notify(
        `Sincronizado · ${result.pulled} en la hoja, ${result.upserted} nuevos en el espejo`,
        "success",
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      notify(`Error al sincronizar: ${msg}`, "error");
    } finally {
      setIsResyncing(false);
    }
  }, [pullFromSheet, notify]);

  const handleRetry = useCallback(
    async (itemId: string) => {
      try {
        const result = await retryPush({ itemId });
        if (result.ok) {
          notify(`Reintento exitoso · ${itemId}`, "success");
        } else {
          notify(`Reintento falló · ${result.message}`, "error");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        notify(`Reintento falló · ${msg}`, "error");
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
    async (estado: "DISPONIBLE" | "VENDIDA") => {
      if (!user?.email) {
        notify("Tu sesión no tiene email. Vuelve a iniciar sesión.", "error");
        return;
      }
      if (selectedIds.size === 0) return;
      setIsBulkSaving(true);
      try {
        const itemIds = Array.from(selectedIds);
        const result = await saveEditMany({
          itemIds,
          editorEmail: user.email,
          editorName: user.name,
          patch: { estado },
        });
        const verb = estado === "VENDIDA" ? "vendidas" : "disponibles";
        const parts = [
          `${result.updatedCount} marcada${result.updatedCount === 1 ? "" : "s"} como ${verb}`,
        ];
        if (result.unchangedCount > 0) {
          parts.push(`${result.unchangedCount} sin cambios`);
        }
        if (result.missingCount > 0) {
          parts.push(
            `${result.missingCount} no encontrada${result.missingCount === 1 ? "" : "s"}`,
          );
        }
        notify(parts.join(" · "), "success");
        clearSelection();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        notify(`No se pudo marcar en lote: ${msg}`, "error");
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

  // ─── Render ──────────────────────────────────────────────────────────

  if (!convexReady) {
    return <ConvexUnavailable atelier={atelier} />;
  }

  const isLoading = products === undefined;
  const isEmpty = !isLoading && filteredRows.length === 0;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: atelier.surfaces.canvas,
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
        onCreateNew={() => console.log("create-new clicked — wired in Phase G")}
      />

      {/* Workbench split — ledger on the left, Bandeja inspector on
          the right. Below `lg`, Bandeja stacks under the ledger so the
          mobile experience stays single-column. */}
      <Box
        sx={{
          maxWidth: 1280,
          mx: "auto",
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "minmax(0, 1.6fr) minmax(0, 1fr)",
          },
        }}
      >
        <Box
          sx={{
            borderRight: { lg: `1px solid ${foto.surfaces.edge}` },
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
              backgroundColor: atelier.surfaces.canvas,
              borderLeft: `1px solid ${atelier.surfaces.edge}`,
              borderRight: `1px solid ${atelier.surfaces.edge}`,
              borderBottom: `1px solid ${atelier.surfaces.edge}`,
              overflow: "hidden",
            }}
          >
            {isLoading && <ListSkeletons atelier={atelier} count={8} />}
            {!isLoading && isEmpty && (
              <EmptyState
                atelier={atelier}
                hasFilter={!!search.trim() || filter !== "all"}
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
                return (
                  <Box key={doc.itemId} role="listitem">
                    <InventoryRow
                      row={toRow(doc)}
                      isActive={selectedBandejaId === doc.itemId}
                      isSelected={selectedIds.has(doc.itemId)}
                      thumbnailUrl={thumb}
                      onOpen={setSelectedBandejaId}
                      onToggleSelect={toggleSelect}
                      onRetry={handleRetry}
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
                textAlign: "center",
              }}
            >
              {filteredRows.length} de {stats?.total ?? products?.length ?? 0}{" "}
              en el espejo
            </Typography>
          )}
        </Box>

        {/* Bandeja — Phase D wires StoneHero/PatronCard cards inside */}
        <Bandeja foto={foto} selected={selectedBandeja} />
      </Box>

      {/* Drawer — opened by Bandeja's "Abrir editor" button (Phase D). */}
      <EditDrawer
        open={!!editingItemId}
        product={editing ? toDrawerProduct(editing) : null}
        isSaving={isSaving}
        onClose={() => setEditingItemId(null)}
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
        atelier={atelier}
        onMarkAvailable={() => void handleBulkMark("DISPONIBLE")}
        onMarkSold={() => void handleBulkMark("VENDIDA")}
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
  count,
}: {
  atelier: ReturnType<typeof getAtelier>;
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
            borderBottom: `1px solid ${atelier.surfaces.edge}`,
            display: "grid",
            gridTemplateColumns: {
              xs: "16px 56px 12px 32px minmax(0, 1fr) 84px 116px 10px",
              sm: "16px 64px 14px 32px minmax(0, 1fr) 92px 128px 12px",
              md: "20px 72px 16px 36px minmax(0, 1fr) 96px 136px 12px",
            },
            alignItems: "center",
            gap: { xs: 1.25, md: 1.75 },
          }}
        >
          <Skeleton
            variant="rectangular"
            width={16}
            height={16}
            sx={{ borderRadius: "3px" }}
          />
          <Skeleton variant="text" width={48} sx={{ ml: "auto" }} />
          <Skeleton variant="rectangular" width={6} height={26} />
          <Skeleton
            variant="rectangular"
            width={32}
            height={32}
            sx={{ borderRadius: "3px" }}
          />
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width={56} sx={{ ml: "auto" }} />
          <Skeleton variant="text" width={88} sx={{ ml: "auto" }} />
          <Box />
        </Box>
      ))}
    </>
  );
}

function EmptyState({
  atelier,
  hasFilter,
  onResync,
  isResyncing,
}: {
  atelier: ReturnType<typeof getAtelier>;
  hasFilter: boolean;
  onResync: () => void;
  isResyncing: boolean;
}) {
  return (
    <Box
      sx={{
        py: 8,
        px: 3,
        textAlign: "center",
      }}
    >
      <Typography
        sx={{
          ...atelier.type.section,
          color: atelier.ink.tertiary,
          mb: 1,
        }}
      >
        {hasFilter ? "Sin coincidencias" : "Espejo vacío"}
      </Typography>
      <Typography
        sx={{
          ...atelier.type.meta,
          color: atelier.ink.secondary,
          maxWidth: 420,
          mx: "auto",
          mb: 3,
        }}
      >
        {hasFilter
          ? "Ajusta la búsqueda o el filtro para ver más entradas del inventario."
          : "No hay productos sincronizados todavía. Pulsa Resync para cargar la hoja Inventario en el espejo."}
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
            border: "none",
            borderRadius: "4px",
            px: "16px",
            py: "10px",
            cursor: isResyncing ? "default" : "pointer",
            transition: atelier.motion.rowHover,
            "&:focus-visible": {
              outline: `2px solid ${atelier.focus.ring}`,
              outlineOffset: "2px",
            },
          }}
        >
          {isResyncing ? "Sincronizando…" : "Sincronizar desde la hoja"}
        </Box>
      )}
    </Box>
  );
}

function ConvexUnavailable({
  atelier,
}: {
  atelier: ReturnType<typeof getAtelier>;
}) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: atelier.surfaces.canvas,
        color: atelier.ink.primary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 3,
      }}
    >
      <Box sx={{ maxWidth: 480, textAlign: "center" }}>
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

/**
 * BulkActionBar — fixed-bottom action bar for the row checkbox selection.
 *
 * Visible only while at least one row is checked. Atelier-pure: panel
 * surface, hairline top edge, no shadows. Two primary actions echo the
 * status pip palette so the bar reads as an extension of the ledger,
 * not a notification.
 *
 * Always mounted (toggling visibility via transform) so the slide-out
 * runs on the last unselect and the buttons can finish a click animation
 * even as the count hits zero.
 */
function BulkActionBar({
  visible,
  count,
  isSaving,
  atelier,
  onMarkAvailable,
  onMarkSold,
  onClear,
}: {
  visible: boolean;
  count: number;
  isSaving: boolean;
  atelier: ReturnType<typeof getAtelier>;
  onMarkAvailable: () => void;
  onMarkSold: () => void;
  onClear: () => void;
}) {
  return (
    <Box
      role="region"
      aria-label="Acciones en lote"
      aria-hidden={!visible}
      sx={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 12,
        backgroundColor: atelier.surfaces.panel,
        borderTop: `1px solid ${atelier.surfaces.edgeStrong}`,
        transform: visible ? "translateY(0)" : "translateY(100%)",
        transition:
          "transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 200ms linear",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <Box
        sx={{
          maxWidth: `${atelier.spacing.contentMaxWidth}px`,
          mx: "auto",
          px: { xs: 2, md: 3 },
          py: "12px",
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Typography
          sx={{
            ...atelier.type.label,
            color: atelier.ink.tertiary,
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Box
            aria-hidden
            sx={{
              width: "8px",
              height: "8px",
              borderRadius: "1px",
              backgroundColor: atelier.brass.base,
              flexShrink: 0,
            }}
          />
          <Box
            component="span"
            sx={{ ...atelier.type.data, color: atelier.ink.primary }}
          >
            {count.toLocaleString("es-CO")}
          </Box>
          {count === 1 ? "seleccionada" : "seleccionadas"}
        </Typography>

        <Box sx={{ flex: 1 }} />

        <BulkActionButton
          atelier={atelier}
          onClick={onMarkAvailable}
          disabled={isSaving || count === 0}
          pipColor={atelier.status.available.pip}
        >
          Marcar como disponible ({count})
        </BulkActionButton>
        <BulkActionButton
          atelier={atelier}
          onClick={onMarkSold}
          disabled={isSaving || count === 0}
          pipColor={atelier.status.sold.pip}
        >
          Marcar como vendida ({count})
        </BulkActionButton>

        <ButtonBase
          onClick={onClear}
          disabled={isSaving || count === 0}
          disableRipple
          sx={{
            ...atelier.type.label,
            color: atelier.ink.secondary,
            px: "12px",
            py: "8px",
            borderRadius: "4px",
            border: `1px solid ${atelier.surfaces.edgeStrong}`,
            transition: atelier.motion.rowHover,
            "&:hover": { backgroundColor: atelier.surfaces.rowHover },
            "&:focus-visible": {
              outline: `2px solid ${atelier.focus.ring}`,
              outlineOffset: "2px",
            },
            "&:disabled": { opacity: 0.5, cursor: "default" },
          }}
        >
          Limpiar
        </ButtonBase>
      </Box>
    </Box>
  );
}

/**
 * Atelier-styled bulk action button. The pip color appears as a small
 * square mark to the left of the label so the action's status outcome
 * is legible at a glance without painting the whole button.
 */
function BulkActionButton({
  atelier,
  onClick,
  disabled,
  pipColor,
  children,
}: {
  atelier: ReturnType<typeof getAtelier>;
  onClick: () => void;
  disabled: boolean;
  pipColor: string;
  children: React.ReactNode;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      disableRipple
      sx={{
        ...atelier.type.label,
        color: atelier.ink.primary,
        backgroundColor: atelier.surfaces.canvas,
        border: `1px solid ${atelier.surfaces.edgeStrong}`,
        borderRadius: "4px",
        px: "14px",
        py: "8px",
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        transition: atelier.motion.rowHover,
        "&:hover": {
          backgroundColor: atelier.surfaces.rowHover,
          borderColor: atelier.brass.base,
        },
        "&:focus-visible": {
          outline: `2px solid ${atelier.focus.ring}`,
          outlineOffset: "2px",
        },
        "&:disabled": { opacity: 0.5, cursor: "default" },
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: "8px",
          height: "8px",
          borderRadius: "1px",
          backgroundColor: pipColor,
          flexShrink: 0,
        }}
      />
      <Box component="span">{children}</Box>
    </ButtonBase>
  );
}
