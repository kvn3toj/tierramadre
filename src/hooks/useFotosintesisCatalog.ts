/**
 * useFotosintesisCatalog Hook
 *
 * Bridges Fotosíntesis-captured products into the customer-facing Treasure
 * Browser. Fotosíntesis items live in a separate Google Sheet that the
 * legacy catalog reader (`/api/get-treasure-sheets`) never touches, and the
 * `mostrarEnCatalogo` publish flag is Convex-only. So instead of reading the
 * Fotosíntesis sheet, we read Convex directly — it's the authoritative,
 * reactive source that knows which items are published vs. held in reserve.
 *
 * Returns a `TreasureItem[]` (empty while loading or when Convex is not
 * configured) ready to merge with the Google Sheets catalog in `useTreasure`.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  useConvexQuery,
  useConvexClient,
  convexApi,
  convexReady,
} from '../lib/convex-safe';
import { STORAGE_KEYS } from '../constants/storage-keys';
import type {
  TreasureItem,
  EmeraldColor,
  EmeraldQuality,
  TreasureStatus,
  PrecioEspecial,
} from '../types';

/**
 * Categorías that imply jewelry even when peso is a numeric carat value.
 *
 * Keys are accent-stripped + lowercased (see `normalizeCategoria`) so a sheet
 * or Convex row spelled "Joyería Artesanal" / "joyeria artesanal" both match.
 * The list covers the CATEGORIAS vocabulary AND the free-form values already
 * living in Convex ("Joyería Artesanal" is the label the Fotosíntesis wizard
 * writes for every finished piece — 28 published items as of 2026-07-22).
 */
const JEWELRY_CATEGORIES = new Set([
  'anillo en plata',
  'aretes',
  'topitos',
  'pulsera',
  'dije',
  'anillo en oro',
  'joyeria artesanal',
  'joyas',
]);

/** Lowercase + strip diacritics so category matching is spelling-tolerant. */
function normalizeCategoria(categoria: string): string {
  return categoria.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Shape of a published productInventory row coming back from Convex. */
export interface PublishedRow {
  itemId: string;
  nombre?: string;
  peso?: string;
  color?: string;
  calidad?: string;
  cantidad?: number;
  talla?: string;
  medidas?: string;
  medidasValores?: string;
  categoria?: string;
  precioFinalCOP?: number;
  ubicacion?: string;
  asesor?: string;
  estado?: string;
  qr?: string;
  coleccion?: string;
  caja?: string;
  asesorActual?: string;
  estadoAsesor?: string;
  fotoUrl?: string;
  certificadoUrl?: string;
  publishedAt?: number;
  // ── Fotosíntesis characteristics (surfaced publicly 2026-06-30) ──
  procedencia?: string;
  nivelRareza?: number;
  calificacion?: number;
  tipoEsmeralda?: string;
  tipoJoya?: string;
  tecnicaJoya?: string;
  minerales?: string[];
  complementos?: string[];
  observacion?: string;
  // Precio promocional temporal, ya resuelto por la query pública: presente
  // solo mientras la promoción está vigente (ver types/PrecioEspecial).
  precioEspecial?: PrecioEspecial;
  // Lot-level provenance, denormalized onto the row by publishedCatalog.
  mina?: string;
  tratamiento?: string;
}

/**
 * Derive jewelry / peso fields the same way `get-treasure-sheets` does so a
 * Fotosíntesis item renders identically to a legacy one (metal pill, carat
 * filters, etc.).
 */
function derivePeso(
  peso?: string,
  categoria?: string,
): {
  pesoValue: string | number;
  isJewelry: boolean;
  metalType?: 'Plata' | 'Oro 18k';
} {
  const raw = (peso ?? '').trim();
  const lower = raw.toLowerCase();
  if (lower.includes('plata')) {
    return { pesoValue: raw, isJewelry: true, metalType: 'Plata' };
  }
  if (lower.includes('oro')) {
    return { pesoValue: raw, isJewelry: true, metalType: 'Oro 18k' };
  }
  const num = parseFloat(raw.replace(',', '.'));
  const pesoValue: string | number = Number.isFinite(num) ? num : raw;
  const isJewelry = categoria
    ? JEWELRY_CATEGORIES.has(normalizeCategoria(categoria))
    : false;
  return { pesoValue, isJewelry };
}

/** Map one published Convex row into the catalog's TreasureItem shape. */
export function mapRowToTreasureItem(row: PublishedRow): TreasureItem {
  const { pesoValue, isJewelry, metalType } = derivePeso(
    row.peso,
    row.categoria,
  );
  // Catalog price: the derived final price (precioFinalCOP = costoBaseCOP × 2.6,
  // Sheets column M). By policy the public catalog never shows costoBaseCOP (L);
  // it is scrubbed in publishedCatalog. Items without a base cost render at 0.
  const precioCOP = row.precioFinalCOP ?? 0;

  return {
    item: parseInt(row.itemId, 10),
    fechaIngreso: '',
    nombre: row.nombre ?? '',
    peso: pesoValue,
    color: (row.color ?? '') as EmeraldColor,
    calidad: (row.calidad ?? '') as EmeraldQuality,
    cantidad: typeof row.cantidad === 'number' ? row.cantidad : 1,
    talla: row.talla ?? '',
    medidas: row.medidas ?? '',
    medidasValores: row.medidasValores ?? '',
    categoria: (row.categoria ?? '').trim(),
    precioCOP,
    precioInternacional: 0,
    ubicacion: row.ubicacion ?? '',
    asesor: row.asesor ?? '',
    estado: (row.estado || 'DISPONIBLE').toUpperCase() as TreasureStatus,
    qr: row.qr ?? '',
    coleccion: row.coleccion ?? '',
    caja: row.caja ?? '',
    asesorActual: row.asesorActual ?? '',
    estadoAsesor: (row.estadoAsesor ?? '').toUpperCase() as TreasureStatus | '',
    isJewelry,
    ...(metalType ? { metalType } : {}),
    // Drive image captured in the wizard; useTreasure converts it to a proxy URL.
    imagen: row.fotoUrl || undefined,
    certificateUrl: row.certificadoUrl || undefined,
    publishedAt: row.publishedAt,
    // ── Fotosíntesis characteristics (public) ──
    procedencia: row.procedencia || undefined,
    nivelRareza: row.nivelRareza,
    calificacion: row.calificacion,
    tipoEsmeralda: row.tipoEsmeralda || undefined,
    tipoJoya: row.tipoJoya || undefined,
    tecnicaJoya: row.tecnicaJoya || undefined,
    minerales:
      row.minerales && row.minerales.length ? row.minerales : undefined,
    complementos:
      row.complementos && row.complementos.length
        ? row.complementos
        : undefined,
    mina: row.mina || undefined,
    tratamiento: row.tratamiento || undefined,
    // Promoción temporal: se pasa tal cual llega (ausente = no vigente).
    precioEspecial: row.precioEspecial,
    // Evocative copy: the capture-time `observacion` doubles as the public
    // product description (the field exists on TreasureItem but legacy/Sheets
    // catalog rows never populate it).
    description: row.observacion || undefined,
  };
}

// ─── Cached catalog (Fix 1C) ────────────────────────────────────────────
//
// See docs/audits/2026-08-12-convex-usage-audit.md §4 and
// convex/_lib/catalogVersion.ts.
//
// This hook used to hold a live reactive subscription to
// `products.publishedCatalog`. That query `.collect()`s every published row —
// 81-field documents — and Convex bills Database I/O on documents SCANNED, so
// it re-scanned the whole catalog on every visitor connect AND again, for every
// connected visitor, on every write into its read set. Cost scaled as
// `visitors × writes`: 759.76 MB in Aug 2026, 63% of the team's entire quota.
//
// Now: subscribe to a ONE-DOCUMENT sentinel (`products.catalogVersion`) and
// fetch the heavy payload one-shot, cached in localStorage.

// Shared with clearTreasureCaches() so sign-out purges this alongside the other
// price-bearing caches — see src/utils/treasureCacheStorage.ts.
const CATALOG_CACHE_KEY = STORAGE_KEYS.PUBLISHED_CATALOG_CACHE;

/**
 * Freshness floor, independent of the sentinel.
 *
 * The sentinel gives seconds-level invalidation for real changes, but it is
 * maintained by hand across several mutations (see convex/_lib/catalogVersion.ts)
 * and a future write path could forget to bump it. This TTL is what makes that
 * a performance nit instead of a correctness bug: worst case the catalog is
 * stale for five minutes — exactly a plain cached catalog — never forever.
 */
export const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;

interface CachedCatalog {
  /** Sentinel value this payload was fetched at. */
  v: number;
  /** ms epoch of the fetch, for the TTL floor. */
  fetchedAt: number;
  rows: PublishedRow[];
}

function readCatalogCache(): CachedCatalog | null {
  try {
    const raw = localStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedCatalog;
    // Defensive: a truncated or hand-edited entry must not crash the catalog.
    if (!parsed || !Array.isArray(parsed.rows)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCatalogCache(entry: CachedCatalog): void {
  try {
    localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Quota or private mode — the catalog still works, it just refetches.
  }
}

/**
 * Published Fotosíntesis items, mapped to TreasureItem and ready to merge
 * into the Treasure Browser. Empty array while loading / Convex unconfigured.
 */
export function useFotosintesisCatalog(): TreasureItem[] {
  // The ONLY standing subscription: one ~100-byte document.
  const version = useConvexQuery(convexApi.products.catalogVersion, {}) as
    | { v: number; updatedAt: number }
    | undefined;
  const convexClient = useConvexClient();

  // Synchronous cache read in the initializer — per the project's anti-blinking
  // rule, an effect-based read would paint an empty grid and then snap.
  const [rows, setRows] = useState<PublishedRow[] | null>(
    () => readCatalogCache()?.rows ?? null,
  );

  const seenVersion = version?.v;

  useEffect(() => {
    if (!convexReady || !convexClient) return;
    // Sentinel still loading — keep showing whatever the cache gave us.
    if (seenVersion === undefined) return;

    const cached = readCatalogCache();
    const isFresh =
      cached !== null &&
      cached.v === seenVersion &&
      Date.now() - cached.fetchedAt < CATALOG_CACHE_TTL_MS;
    if (isFresh) return;

    let cancelled = false;
    convexClient
      .query(convexApi.products.publishedCatalog, {})
      .then((result) => {
        if (cancelled) return;
        const next = result as PublishedRow[];
        setRows(next);
        writeCatalogCache({
          v: seenVersion,
          fetchedAt: Date.now(),
          rows: next,
        });
      })
      .catch(() => {
        // Keep serving the cached catalog rather than blanking the browser.
      });
    return () => {
      cancelled = true;
    };
  }, [convexClient, seenVersion]);

  return useMemo(() => {
    if (!rows) return [];
    return rows
      .map(mapRowToTreasureItem)
      .filter((item) => Number.isFinite(item.item) && item.item > 0);
  }, [rows]);
}

// ─── Grouped lote / sublote catalog cards ───────────────────────────

export interface GroupItem {
  itemId: string;
  nombre: string;
  fotoUrl?: string;
  precioCOP: number;
  color?: string;
  calidad?: string;
  peso?: string;
  categoria?: string;
  talla?: string;
  medidas?: string;
  // Per-piece Fotosíntesis characteristics for the lote per-image overlay.
  procedencia?: string;
  nivelRareza?: number;
  calificacion?: number;
  tipoEsmeralda?: string;
  tipoJoya?: string;
  tecnicaJoya?: string;
  minerales?: string[];
  complementos?: string[];
  observacion?: string;
}

export interface PublishedGroup {
  groupKind: 'lote' | 'sublote';
  groupId: string;
  parentLoteId: string;
  nombre: string;
  fotoUrl?: string;
  totalPriceCOP: number;
  items: GroupItem[];
  // Lot-level provenance (same for the whole bundle), from the `lots` table.
  mina?: string;
  tratamiento?: string;
}

/**
 * Stable, deterministic numeric key for a group card. The grid/favorites/
 * comparison machinery keys on the numeric `item`, but groups route by their
 * string `groupId`, so this only needs to be stable per groupId and unlikely
 * to collide with real item numbers (which are in the hundreds). We hash into
 * a high range; callers add a used-id guard for the rare collision.
 */
function hashGroupId(groupId: string): number {
  let h = 0;
  for (let i = 0; i < groupId.length; i++) {
    h = (h * 31 + groupId.charCodeAt(i)) | 0;
  }
  return 8_000_000 + (Math.abs(h) % 1_000_000);
}

export function mapGroupToTreasureItem(
  group: PublishedGroup,
  item: number,
): TreasureItem {
  const first = group.items[0];
  const { pesoValue, isJewelry, metalType } = derivePeso(
    typeof first?.peso === 'string' ? first.peso : '',
    first?.categoria,
  );

  // Bundle carat weight = SUM of every gem piece's weight, not just the first.
  // A lote is shown as one card, so its "Gema (Ct)" spec must read the whole
  // lot's total. Jewelry pieces carry a string peso (e.g. "Plata"/"Oro") that
  // can't be summed as carats, so we add only the numeric (gem) weights and
  // fall back to the first piece's value when none is numeric (all-jewelry lote).
  const numericPesos = group.items
    .map(
      (it) =>
        derivePeso(typeof it.peso === 'string' ? it.peso : '', it.categoria)
          .pesoValue,
    )
    .filter((p): p is number => typeof p === 'number');
  const totalPeso: string | number =
    numericPesos.length > 0
      ? numericPesos.reduce((sum, p) => sum + p, 0)
      : pesoValue;

  return {
    item,
    fechaIngreso: '',
    nombre: group.nombre,
    peso: totalPeso,
    color: (first?.color ?? '') as EmeraldColor,
    calidad: (first?.calidad ?? '') as EmeraldQuality,
    cantidad: group.items.length,
    talla: first?.talla ?? '',
    medidas: first?.medidas ?? '',
    medidasValores: '',
    categoria: (first?.categoria ?? '').trim(),
    precioCOP: group.totalPriceCOP,
    precioInternacional: 0,
    ubicacion: '',
    asesor: '',
    estado: 'DISPONIBLE' as TreasureStatus,
    qr: '',
    coleccion: '',
    caja: '',
    asesorActual: '',
    estadoAsesor: '',
    isJewelry,
    ...(metalType ? { metalType } : {}),
    imagen: group.fotoUrl || first?.fotoUrl || undefined,
    // Bundle-level provenance (lot) + first-piece characteristics as the card
    // default; the per-image overlay (loteDetail) refines these per piece.
    mina: group.mina || undefined,
    tratamiento: group.tratamiento || undefined,
    procedencia: first?.procedencia || undefined,
    tipoEsmeralda: first?.tipoEsmeralda || undefined,
    description: first?.observacion || undefined,
    isLote: true,
    groupKind: group.groupKind,
    groupId: group.groupId,
    // Recencia REAL del bundle: su miembro más nuevo. El `item` sintético (8M+)
    // existe para no colisionar, no para ordenar — sin esto, el sort "newest"
    // (número más alto primero) mandaba todos los lotes al tope del grid.
    newestMemberItem: (() => {
      const ids = group.items
        .map((it) => parseInt(it.itemId, 10))
        .filter((n) => Number.isFinite(n) && n > 0);
      return ids.length ? Math.max(...ids) : undefined;
    })(),
    loteItems: group.items.map((it) => {
      // Derive the same jewelry/peso fields per piece so a single item's
      // detail view renders identically to a standalone catalog item.
      const derived = derivePeso(
        typeof it.peso === 'string' ? it.peso : '',
        it.categoria,
      );
      return {
        item: parseInt(it.itemId, 10),
        nombre: it.nombre,
        imagen: it.fotoUrl || undefined,
        precioCOP: it.precioCOP,
        color: (it.color ?? '') as EmeraldColor,
        calidad: (it.calidad ?? '') as EmeraldQuality,
        peso: derived.pesoValue,
        categoria: (it.categoria ?? '').trim(),
        talla: it.talla ?? '',
        medidas: it.medidas ?? '',
        isJewelry: derived.isJewelry,
        ...(derived.metalType ? { metalType: derived.metalType } : {}),
        // Per-piece Fotosíntesis characteristics for the per-image overlay.
        procedencia: it.procedencia || undefined,
        nivelRareza: it.nivelRareza,
        calificacion: it.calificacion,
        tipoEsmeralda: it.tipoEsmeralda || undefined,
        tipoJoya: it.tipoJoya || undefined,
        tecnicaJoya: it.tecnicaJoya || undefined,
        minerales:
          it.minerales && it.minerales.length ? it.minerales : undefined,
        complementos:
          it.complementos && it.complementos.length
            ? it.complementos
            : undefined,
        description: it.observacion || undefined,
      };
    }),
  };
}

/**
 * Published catalog GROUP cards (lotes + sublotes shown as one bundle), plus
 * the set of member item numbers that must be excluded from the individual
 * `useFotosintesisCatalog` list so they don't double-show.
 */
export function useFotosintesisGroups(): {
  groupCards: TreasureItem[];
  excludedItemIds: Set<number>;
} {
  const groups = useConvexQuery(convexApi.products.publishedGroups, {}) as
    | PublishedGroup[]
    | undefined;

  return useMemo(() => {
    if (!groups) return { groupCards: [], excludedItemIds: new Set<number>() };
    const excludedItemIds = new Set<number>();
    const usedKeys = new Set<number>();
    const groupCards: TreasureItem[] = [];

    for (const group of groups) {
      const memberIds = group.items
        .map((it) => parseInt(it.itemId, 10))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (memberIds.length === 0) continue;
      memberIds.forEach((n) => excludedItemIds.add(n));

      // Assign a stable, collision-free numeric key.
      let key = hashGroupId(group.groupId);
      while (usedKeys.has(key)) key += 1;
      usedKeys.add(key);

      groupCards.push(mapGroupToTreasureItem(group, key));
    }
    return { groupCards, excludedItemIds };
  }, [groups]);
}

export default useFotosintesisCatalog;
