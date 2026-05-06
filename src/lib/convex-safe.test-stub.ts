/**
 * Test-only stub for `convex-safe.ts`.
 *
 * Activated by `VITE_TEST_MODE=1` via the `vite.config.ts` alias —
 * production builds never see this file. Reproduces the surface of
 * `useConvexQuery` / `useConvexMutation` / `useConvexAction` against a
 * tiny in-memory store so Playwright specs can exercise the admin
 * panel without a real Convex deployment.
 *
 * Reactivity uses a plain pub/sub: every mutation calls `notify()`, and
 * each hook subscribes to bump a render counter. Not a perfect Convex
 * recreation — just enough to mirror the optimistic-UI shape the panel
 * relies on (mutate → mirror updates immediately → audit row appears).
 *
 * Test driver hooks are exposed on `window.__TM_PLAYWRIGHT_FIXTURE__`
 * so the spec can seed products before navigation.
 */

import { useEffect, useMemo, useState } from "react";

type Estado = "DISPONIBLE" | "VENDIDA" | "ASESOR" | "";
type SyncStatus = "synced" | "pending" | "error";
type AuditStatus = "saved" | "pending" | "failed";

interface Product {
  _id: string;
  _creationTime: number;
  itemId: string;
  rowIndex: number;
  nombre?: string;
  peso?: string;
  color?: string;
  calidad?: string;
  cantidad?: number;
  talla?: string;
  medidas?: string;
  medidasValores?: string;
  categoria?: string;
  precioCOP?: number;
  ubicacion?: string;
  asesor?: string;
  estado: Estado;
  qr?: string;
  coleccion?: string;
  caja?: string;
  asesorActual?: string;
  estadoAsesor?: string;
  lastPulledAt: string;
  lastPushedAt?: string;
  syncStatus: SyncStatus;
  syncError?: string;
}

interface AuditEntry {
  _id: string;
  _creationTime: number;
  itemId: string;
  editorEmail: string;
  editorName?: string;
  editedAt: string;
  changes: Array<{
    field: string;
    before: string | number | null;
    after: string | number | null;
  }>;
  status: AuditStatus;
  error?: string;
}

interface LockEntry {
  itemId: string;
  holderEmail: string;
  holderName?: string;
  claimedAt: string;
  expiresAt: string;
}

type Scope = "products" | "audits" | "locks";

const store: {
  products: Product[];
  audits: AuditEntry[];
  locks: LockEntry[];
  listeners: Record<Scope, Set<() => void>>;
} = {
  products: [],
  audits: [],
  locks: [],
  listeners: {
    products: new Set(),
    audits: new Set(),
    locks: new Set(),
  },
};

function notify(...scopes: Scope[]) {
  for (const scope of scopes) {
    store.listeners[scope].forEach((fn) => fn());
  }
}

const apiRefToScope: Record<string, Scope> = {
  "products.list": "products",
  "products.get": "products",
  "products.syncStats": "products",
  "products.editHistory": "audits",
  "products.lockStatus": "locks",
  "products.patronesFor": "products",
  "products.patronesGlobalTop": "products",
  "products.recentEdits": "audits",
};

let nextId = 1;
function makeId(prefix: string) {
  return `${prefix}_${nextId++}`;
}

function defaultSeed(): Product[] {
  const now = new Date().toISOString();
  return [
    {
      _id: makeId("prod"),
      _creationTime: Date.now(),
      itemId: "32",
      rowIndex: 33,
      nombre: "Esmeralda Venus",
      peso: "1.85",
      color: "Verde Muzo",
      calidad: "Premium",
      precioCOP: 12_500_000,
      ubicacion: "Caja 7",
      coleccion: "Heritage",
      caja: "C-07",
      estado: "DISPONIBLE",
      lastPulledAt: now,
      syncStatus: "synced",
      lastPushedAt: now,
    },
    {
      _id: makeId("prod"),
      _creationTime: Date.now(),
      itemId: "45",
      rowIndex: 46,
      nombre: "Esmeralda Esperanza",
      peso: "2.10",
      color: "Verde Chivor",
      calidad: "Premium",
      precioCOP: 18_750_000,
      ubicacion: "Caja 3",
      coleccion: "Atelier",
      estado: "ASESOR",
      lastPulledAt: now,
      syncStatus: "synced",
    },
    {
      _id: makeId("prod"),
      _creationTime: Date.now(),
      itemId: "58",
      rowIndex: 59,
      nombre: "Esmeralda Penumbra",
      peso: "1.20",
      color: "Verde Coscuez",
      calidad: "Comercial",
      precioCOP: 4_800_000,
      coleccion: "Studio",
      estado: "DISPONIBLE",
      lastPulledAt: now,
      syncStatus: "synced",
    },
  ];
}

store.products = defaultSeed();

if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__TM_PLAYWRIGHT_FIXTURE__ = {
    seed(products: Product[]) {
      store.products = products.map((p) => ({
        ...p,
        _id: p._id ?? makeId("prod"),
        _creationTime: p._creationTime ?? Date.now(),
      }));
      store.audits = [];
      store.locks = [];
      notify("products", "audits", "locks");
    },
    snapshot() {
      return {
        products: [...store.products],
        audits: [...store.audits],
        locks: [...store.locks],
      };
    },
    reset() {
      store.products = defaultSeed();
      store.audits = [];
      store.locks = [];
      notify("products", "audits", "locks");
    },
  };
}

const apiHandler: ProxyHandler<object> = {
  get(_target, ns) {
    return new Proxy(
      {},
      {
        get(_t, fn) {
          return `${String(ns)}.${String(fn)}`;
        },
      },
    );
  },
};

export const convexApi = new Proxy({}, apiHandler) as unknown as Record<
  string,
  Record<string, string>
>;

export const convexReady = true;

function useScopeVersion(scope: Scope): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const sub = () => setVersion((v) => v + 1);
    store.listeners[scope].add(sub);
    return () => {
      store.listeners[scope].delete(sub);
    };
  }, [scope]);
  return version;
}

function listProducts(estado?: Estado) {
  const rows = estado
    ? store.products.filter((p) => p.estado === estado)
    : [...store.products];
  return rows.sort((a, b) => Number(a.itemId) - Number(b.itemId));
}

function syncStats() {
  const total = store.products.length;
  const pending = store.products.filter(
    (p) => p.syncStatus === "pending",
  ).length;
  const errored = store.products.filter((p) => p.syncStatus === "error").length;
  const lastPull = store.products.reduce<string | null>(
    (acc, r) => (acc === null || r.lastPulledAt > acc ? r.lastPulledAt : acc),
    null,
  );
  return { total, pending, errored, lastPull };
}

function editHistory(itemId: string) {
  return store.audits
    .filter((a) => a.itemId === itemId)
    .sort((a, b) => b._creationTime - a._creationTime)
    .slice(0, 20);
}

function patronesFor(itemId: string) {
  const target = store.products.find((p) => p.itemId === itemId);
  if (!target) return { combos: [], total: 0 };
  return {
    combos: [
      {
        key: "Cosquez·AA·3.00–3.50",
        label: "Cosquez · AA · 3.0–3.5 ct",
        count: 5,
        medianPriceCOP: 4_800_000,
      },
      {
        key: "Cosquez·AA·2.50–3.00",
        label: "Cosquez · AA · 2.5–3.0 ct",
        count: 3,
        medianPriceCOP: 3_900_000,
      },
      {
        key: "Muzo·AA·3.00–3.50",
        label: "Muzo · AA · 3.0–3.5 ct",
        count: 2,
        medianPriceCOP: 5_200_000,
      },
    ],
    total: 10,
  };
}

function patronesGlobalTop() {
  return {
    combos: [
      {
        key: "Muzo·AAA·2.00–3.00",
        label: "Muzo · AAA · 2–3 ct",
        count: 12,
        medianPriceCOP: 5_500_000,
      },
      {
        key: "Cosquez·AA·3.00–4.00",
        label: "Cosquez · AA · 3–4 ct",
        count: 9,
        medianPriceCOP: 4_300_000,
      },
      {
        key: "Muzo·AA·1.00–2.00",
        label: "Muzo · AA · 1–2 ct",
        count: 7,
        medianPriceCOP: 1_900_000,
      },
    ],
    total: 28,
  };
}

function recentEdits(limit?: number) {
  return [...store.audits]
    .sort((a, b) => b._creationTime - a._creationTime)
    .slice(0, limit ?? 5);
}

function lockStatusFor(itemId: string) {
  const lock = store.locks.find((l) => l.itemId === itemId);
  if (!lock) return null;
  if (Date.parse(lock.expiresAt) <= Date.now()) return null;
  return {
    holderEmail: lock.holderEmail,
    holderName: lock.holderName,
    expiresAt: lock.expiresAt,
  };
}

export function useConvexQuery(apiRef: unknown, args: unknown): unknown {
  const ref = apiRef as string;
  // Each query subscribes to its own scope so unrelated mutations
  // (e.g. claimLock bumping the locks counter) don't invalidate the
  // products.list memo and re-mount EditDrawer's draft.
  const scope = apiRefToScope[ref] ?? "products";
  const version = useScopeVersion(scope);
  // Serialize args so consumers passing fresh object literals each
  // render don't churn the memo. Real Convex memoizes by structural
  // equality; we approximate with JSON for the cases the panel uses.
  const argsKey = JSON.stringify(args ?? null);
  return useMemo(() => {
    if (args === "skip") return undefined;
    switch (ref) {
      case "products.list":
        return listProducts((args as { estado?: Estado })?.estado);
      case "products.get":
        return store.products.find(
          (p) => p.itemId === (args as { itemId: string }).itemId,
        );
      case "products.syncStats":
        return syncStats();
      case "products.editHistory":
        return editHistory((args as { itemId: string }).itemId);
      case "products.lockStatus":
        return lockStatusFor((args as { itemId: string }).itemId);
      case "products.patronesFor":
        return patronesFor((args as { itemId: string }).itemId);
      case "products.patronesGlobalTop":
        return patronesGlobalTop();
      case "products.recentEdits":
        return recentEdits((args as { limit?: number } | undefined)?.limit);
      default:
        return undefined;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, argsKey, version]);
}

interface SaveEditArgs {
  itemId: string;
  editorEmail: string;
  editorName?: string;
  patch: Record<string, unknown>;
}

interface SaveEditManyArgs {
  itemIds: string[];
  editorEmail: string;
  editorName?: string;
  patch: { estado: Exclude<Estado, ""> };
}

interface ClaimLockArgs {
  itemId: string;
  holderEmail: string;
  holderName?: string;
}

interface ReleaseLockArgs {
  itemId: string;
  holderEmail: string;
}

const LOCK_TTL_MS = 5 * 60 * 1000;

interface CreateProductArgs {
  itemId: string;
  editorEmail: string;
  editorName?: string;
  fields: Partial<
    Omit<
      Product,
      | "_id"
      | "_creationTime"
      | "itemId"
      | "rowIndex"
      | "estado"
      | "lastPulledAt"
      | "syncStatus"
    >
  >;
}

function applyCreateProduct({
  itemId,
  editorEmail,
  editorName,
  fields,
}: CreateProductArgs): {
  itemId: string;
  productId: string;
  rowIndex: number;
} {
  const itemIdTrim = itemId.trim();
  if (!itemIdTrim) throw new Error("El número de la piedra es obligatorio");
  if (store.products.some((p) => p.itemId === itemIdTrim)) {
    throw new Error(`Ya existe una piedra con el número ${itemIdTrim}`);
  }
  const nextRow =
    store.products.reduce((m, p) => Math.max(m, p.rowIndex), 1) + 1;
  const now = new Date().toISOString();
  const productId = makeId("prod");
  const product: Product = {
    _id: productId,
    _creationTime: Date.now(),
    itemId: itemIdTrim,
    rowIndex: nextRow,
    ...fields,
    estado: "DISPONIBLE",
    lastPulledAt: now,
    syncStatus: "pending",
  };
  store.products.push(product);
  const auditId = makeId("audit");
  store.audits.push({
    _id: auditId,
    _creationTime: Date.now(),
    itemId: itemIdTrim,
    editorEmail,
    editorName,
    editedAt: now,
    changes: Object.entries(fields)
      .filter(([, value]) => value !== undefined)
      .map(([field, after]) => ({
        field,
        before: null,
        after: (after as string | number | null) ?? null,
      })),
    status: "pending",
  });
  notify("products", "audits");
  // Mirror the real pushToSheet ack — flip to synced/saved after a tick.
  setTimeout(() => {
    const target = store.products.find((p) => p.itemId === itemIdTrim);
    if (target) {
      target.syncStatus = "synced";
      target.lastPushedAt = new Date().toISOString();
    }
    const audit = store.audits.find((a) => a._id === auditId);
    if (audit) audit.status = "saved";
    notify("products", "audits");
  }, 50);
  return { itemId: itemIdTrim, productId, rowIndex: nextRow };
}

function applySaveEdit({
  itemId,
  editorEmail,
  editorName,
  patch,
}: SaveEditArgs) {
  const idx = store.products.findIndex((p) => p.itemId === itemId);
  if (idx === -1) throw new Error(`Producto ${itemId} no está en el espejo`);
  const before = store.products[idx];
  const changes: AuditEntry["changes"] = [];
  for (const [field, after] of Object.entries(patch)) {
    if (after === undefined) continue;
    const beforeValue = (before as unknown as Record<string, unknown>)[field];
    if (beforeValue === after) continue;
    const beforeNorm =
      typeof beforeValue === "string" || typeof beforeValue === "number"
        ? beforeValue
        : null;
    const afterNorm =
      typeof after === "string" || typeof after === "number" ? after : null;
    changes.push({ field, before: beforeNorm, after: afterNorm });
  }
  if (changes.length === 0) {
    return { itemId, changesCount: 0, message: "Sin cambios" };
  }
  const now = new Date().toISOString();
  store.products[idx] = {
    ...before,
    ...(patch as Partial<Product>),
    syncStatus: "pending",
    syncError: undefined,
  };
  const auditId = makeId("audit");
  store.audits.push({
    _id: auditId,
    _creationTime: Date.now(),
    itemId,
    editorEmail,
    editorName,
    editedAt: now,
    changes,
    status: "pending",
  });
  notify("products", "audits");
  // Simulate async push completing — flip to saved after a short delay
  setTimeout(() => {
    const product = store.products.find((p) => p.itemId === itemId);
    if (product) {
      product.syncStatus = "synced";
      product.lastPushedAt = new Date().toISOString();
    }
    const audit = store.audits.find((a) => a._id === auditId);
    if (audit) audit.status = "saved";
    notify("products", "audits");
  }, 50);
  return { itemId, changesCount: changes.length, auditId };
}

function applySaveEditMany({
  itemIds,
  editorEmail,
  editorName,
  patch,
}: SaveEditManyArgs) {
  let updatedCount = 0;
  let unchangedCount = 0;
  let missingCount = 0;
  const editedAt = new Date().toISOString();
  for (const itemId of itemIds) {
    const idx = store.products.findIndex((p) => p.itemId === itemId);
    if (idx === -1) {
      missingCount++;
      continue;
    }
    const before = store.products[idx];
    if (before.estado === patch.estado) {
      unchangedCount++;
      continue;
    }
    store.products[idx] = {
      ...before,
      estado: patch.estado,
      syncStatus: "pending",
      syncError: undefined,
    };
    store.audits.push({
      _id: makeId("audit"),
      _creationTime: Date.now(),
      itemId,
      editorEmail,
      editorName,
      editedAt,
      changes: [
        {
          field: "estado",
          before: before.estado,
          after: patch.estado,
        },
      ],
      status: "pending",
    });
    updatedCount++;
  }
  notify("products", "audits");
  return { total: itemIds.length, updatedCount, unchangedCount, missingCount };
}

function applyClaimLock({ itemId, holderEmail, holderName }: ClaimLockArgs) {
  const now = Date.now();
  const claimedAt = new Date(now).toISOString();
  const expiresAt = new Date(now + LOCK_TTL_MS).toISOString();
  const idx = store.locks.findIndex((l) => l.itemId === itemId);
  if (idx === -1) {
    store.locks.push({ itemId, holderEmail, holderName, claimedAt, expiresAt });
    notify("locks");
    return { ok: true as const };
  }
  const lock = store.locks[idx];
  const isExpired = Date.parse(lock.expiresAt) <= now;
  if (lock.holderEmail === holderEmail || isExpired) {
    store.locks[idx] = {
      itemId,
      holderEmail,
      holderName,
      claimedAt,
      expiresAt,
    };
    notify("locks");
    return { ok: true as const };
  }
  return {
    ok: false as const,
    holder: { email: lock.holderEmail, name: lock.holderName },
    expiresAt: lock.expiresAt,
  };
}

function applyReleaseLock({ itemId, holderEmail }: ReleaseLockArgs) {
  const idx = store.locks.findIndex(
    (l) => l.itemId === itemId && l.holderEmail === holderEmail,
  );
  if (idx === -1) return { released: false };
  store.locks.splice(idx, 1);
  notify("locks");
  return { released: true };
}

export function useConvexMutation(apiRef: unknown) {
  const ref = apiRef as string;
  return async (args: unknown) => {
    switch (ref) {
      case "products.saveEdit":
        return applySaveEdit(args as SaveEditArgs);
      case "products.saveEditMany":
        return applySaveEditMany(args as SaveEditManyArgs);
      case "products.createProduct":
        return applyCreateProduct(args as CreateProductArgs);
      case "products.claimLock":
        return applyClaimLock(args as ClaimLockArgs);
      case "products.releaseLock":
        return applyReleaseLock(args as ReleaseLockArgs);
      default:
        throw new Error(`Test stub: mutation '${ref}' not implemented`);
    }
  };
}

export function useConvexAction(apiRef: unknown) {
  const ref = apiRef as string;
  return async (args: unknown) => {
    switch (ref) {
      case "products.pullFromSheet":
        return { pulled: store.products.length, upserted: 0, rebased: 0 };
      case "products.retryPush": {
        const itemId = (args as { itemId: string }).itemId;
        const product = store.products.find((p) => p.itemId === itemId);
        if (product) {
          product.syncStatus = "synced";
          product.syncError = undefined;
          product.lastPushedAt = new Date().toISOString();
          notify("products");
          return { ok: true, message: "Reintento exitoso" };
        }
        return { ok: false, message: "Producto no encontrado" };
      }
      default:
        throw new Error(`Test stub: action '${ref}' not implemented`);
    }
  };
}
