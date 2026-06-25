/**
 * CommitLogRow — one row of the Fotosynthia in-copilot approval log.
 *
 * Each row shows what was committed this session plus its LIVE Google-Sheets
 * sync state. When the commit carries an `entity` (a created/lifecycle row we
 * can read back), the row subscribes to that row's Convex mirror and reflects
 * `syncStatus`/`syncError` in real time — flipping pending → synced when the
 * scheduled push confirms, or surfacing an error with a "Reintentar sync"
 * affordance that calls the matching `retryPush` action.
 *
 * Why three sub-components (ItemSyncRow / LotSyncRow / SaleSyncRow) instead of
 * one component with a dynamic ref: Convex hooks need a STATIC query/action ref
 * per call site. Splitting by `entity.kind` lets each leaf call exactly one
 * `useConvexQuery` + one `useConvexAction` against a fixed ref — no conditional
 * hooks, no dynamic-ref gymnastics. The parent picks the leaf by kind.
 *
 * Offline (no VITE_CONVEX_URL) the row never subscribes: it falls back to the
 * same STATIC badge the edit/directory/sublote rows use (pending if it syncs to
 * Sheets, na otherwise).
 *
 * Anti-blinking: the badge swaps IN PLACE — the row keeps a fixed layout and the
 * badge pill is the only thing that changes, so there is no reflow on a status
 * transition. While the query is loading (`undefined`) we show "pending", which
 * is the same visual the commit started in, so the first paint is stable.
 */

import { useState } from "react";
import { Box } from "@mui/material";
import { Check, RotateCcw } from "lucide-react";
import { getFoto } from "../../../../design-system";
import { SyncStatusBadge } from "../../../../components/shared/SyncStatusBadge";
import {
  useConvexQuery,
  useConvexAction,
  convexApi,
  convexReady,
} from "../../../../lib/convex-safe";
import type { CommitEntity } from "../copilot/executeAction";
import type { Id } from "../../../../../convex/_generated/dataModel";

export interface CommitLogRowProps {
  summary: string;
  syncsToSheet: boolean;
  entity?: CommitEntity;
}

/** Shape of the live row each query returns (only the fields the badge reads). */
interface SyncRow {
  _id?: string;
  syncStatus?: "synced" | "pending" | "error";
  syncError?: string;
}

/** Map a mirror row's syncStatus → the badge value (loading ⇒ pending). */
function badgeStatus(
  row: SyncRow | null | undefined,
): "synced" | "pending" | "error" {
  // `undefined` = query still loading; `null` = row not found (treat as pending,
  // the push is presumably still in flight or the mirror hasn't caught up).
  if (!row || !row.syncStatus) return "pending";
  return row.syncStatus;
}

// ─── leaf: item ───────────────────────────────────────────────────────
function ItemSyncRow({
  summary,
  entity,
}: {
  summary: string;
  entity: CommitEntity;
}) {
  const foto = getFoto("light");
  const row = useConvexQuery(convexApi.products.get, {
    itemId: entity.key,
  }) as SyncRow | null | undefined;
  const retry = useConvexAction(convexApi.products.retryPush);
  return (
    <SyncRowShell
      foto={foto}
      summary={summary}
      status={badgeStatus(row)}
      error={row?.syncError}
      onRetry={() => retry({ itemId: entity.key })}
    />
  );
}

// ─── leaf: lot ────────────────────────────────────────────────────────
function LotSyncRow({
  summary,
  entity,
}: {
  summary: string;
  entity: CommitEntity;
}) {
  const foto = getFoto("light");
  // getByLoteId reads by the natural key; the row carries the Convex _id that
  // lots.retryPush needs (it takes `id`, not `loteId`).
  const row = useConvexQuery(convexApi.lots.getByLoteId, {
    loteId: entity.key,
  }) as SyncRow | null | undefined;
  const retry = useConvexAction(convexApi.lots.retryPush);
  // `entity.key` is the loteId (natural key); lots.retryPush needs the Convex
  // _id, which rides the live row. `_id` is a string at this layer — cast it to
  // the branded Id the generated action expects (same pattern as executeAction).
  const docId = row?._id as Id<"lots"> | undefined;
  return (
    <SyncRowShell
      foto={foto}
      summary={summary}
      status={badgeStatus(row)}
      error={row?.syncError}
      // Only retryable once we know the lot's Convex _id.
      onRetry={docId ? () => retry({ id: docId }) : undefined}
    />
  );
}

// ─── leaf: sale ───────────────────────────────────────────────────────
function SaleSyncRow({
  summary,
  entity,
}: {
  summary: string;
  entity: CommitEntity;
}) {
  const foto = getFoto("light");
  // For sales the entity key IS the Convex _id (a string at this layer) — cast
  // it to the branded Id the generated query/action expect, used for both the
  // read and the retry.
  const saleId = entity.key as Id<"sales">;
  const row = useConvexQuery(convexApi.sales.get, {
    id: saleId,
  }) as SyncRow | null | undefined;
  const retry = useConvexAction(convexApi.sales.retryPush);
  return (
    <SyncRowShell
      foto={foto}
      summary={summary}
      status={badgeStatus(row)}
      error={row?.syncError}
      onRetry={() => retry({ id: saleId })}
    />
  );
}

// ─── shared row chrome (matches the CopilotPanel strip rows) ──────────
function SyncRowShell({
  foto,
  summary,
  status,
  error,
  onRetry,
}: {
  foto: ReturnType<typeof getFoto>;
  summary: string;
  status: "synced" | "pending" | "error" | "na";
  error?: string;
  /** When provided + status==="error", renders the Reintentar affordance. */
  onRetry?: () => Promise<unknown> | unknown;
}) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry || retrying) return;
    setRetrying(true);
    try {
      await onRetry();
      // On success the live query re-runs and the badge flips itself to
      // pending/synced; on a thrown error we leave the error state intact so
      // Maritza can try again.
    } catch {
      /* keep the error state — the badge still reflects the mirror row */
    } finally {
      setRetrying(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 10px",
        borderRadius: "9px",
        border: `1px solid ${foto.surfaces.rule}`,
        background: foto.surfaces.panel,
        fontSize: "11px",
        color: foto.ink.secondary,
      }}
    >
      <Check
        size={12}
        strokeWidth={2.4}
        style={{ flexShrink: 0, color: foto.accent.deep }}
        aria-hidden
      />
      <Box
        component="span"
        sx={{
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={summary}
      >
        {summary}
      </Box>
      {status === "error" && onRetry && (
        <Box
          component="button"
          type="button"
          onClick={handleRetry}
          disabled={retrying}
          aria-label="Reintentar sincronización con la planilla"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            flexShrink: 0,
            border: `1px solid ${foto.surfaces.rule}`,
            borderRadius: "7px",
            padding: "3px 7px",
            background: "transparent",
            color: foto.status.sold,
            fontSize: "10.5px",
            fontWeight: 600,
            cursor: retrying ? "not-allowed" : "pointer",
            opacity: retrying ? 0.6 : 1,
            transition: "background 120ms ease",
            "&:hover": { background: foto.surfaces.inset },
            "&:disabled": { cursor: "not-allowed" },
          }}
        >
          <RotateCcw size={11} strokeWidth={2} aria-hidden />
          {retrying ? "Reintentando…" : "Reintentar"}
        </Box>
      )}
      <SyncStatusBadge status={status} error={error} compact />
    </Box>
  );
}

/**
 * One approval-log row with live Sheets-sync status.
 *
 * - No entity (edits / directory / sublotes — no row we can read back) ⇒ a
 *   STATIC badge: pending if it syncs to Sheets, na otherwise. No subscription.
 * - Entity present + Convex configured ⇒ the matching leaf subscribes to the
 *   row's mirror and reflects its live syncStatus, with retry on error.
 * - Offline (Convex unconfigured) ⇒ static badge, even with an entity.
 */
export function CommitLogRow({
  summary,
  syncsToSheet,
  entity,
}: CommitLogRowProps) {
  const foto = getFoto("light");

  // No live row to track, or no Convex: render the static badge in place.
  if (!entity || !convexReady) {
    return (
      <SyncRowShell
        foto={foto}
        summary={summary}
        status={syncsToSheet ? "pending" : "na"}
      />
    );
  }

  switch (entity.kind) {
    case "item":
      return <ItemSyncRow summary={summary} entity={entity} />;
    case "lot":
      return <LotSyncRow summary={summary} entity={entity} />;
    case "sale":
      return <SaleSyncRow summary={summary} entity={entity} />;
    default:
      // Exhaustive guard — an unknown kind degrades to the static badge.
      return (
        <SyncRowShell
          foto={foto}
          summary={summary}
          status={syncsToSheet ? "pending" : "na"}
        />
      );
  }
}

export default CommitLogRow;
