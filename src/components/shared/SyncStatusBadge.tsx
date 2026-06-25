/**
 * SyncStatusBadge — shared sync-status pill.
 *
 * Reused by the Fotosynthia approval queue (after a commit) and by the admin
 * view of the product detail page. Reflects the mirror row's `syncStatus`:
 *   - "synced"  → Convex write reached Google Sheets
 *   - "pending" → Convex write committed; the scheduled push hasn't confirmed yet
 *   - "error"   → the push to Sheets failed (hover for the reason; retry elsewhere)
 *   - "na"      → display-only / Convex-only field (no Sheets column) — never pends
 *
 * Pure presentational: no data fetching, no side effects, so it stays cheap to
 * render inside lists and respects the project's anti-blinking rules.
 */

import { Box, Tooltip, useTheme, alpha } from "@mui/material";
import { CloudCheck, RefreshCw, CloudAlert, CircleSlash } from "lucide-react";

export type SyncStatusValue = "synced" | "pending" | "error" | "na";

export interface SyncStatusBadgeProps {
  status: SyncStatusValue;
  /** Error detail surfaced on hover when status === "error". */
  error?: string;
  /** Compact = icon only (still has an accessible label). */
  compact?: boolean;
}

const COPY: Record<
  SyncStatusValue,
  {
    label: string;
    aria: string;
    Icon: typeof CloudCheck;
    tone: "success" | "warning" | "error" | "info";
    spin?: boolean;
  }
> = {
  synced: {
    label: "Sincronizado",
    aria: "Sincronizado con la planilla",
    Icon: CloudCheck,
    tone: "success",
  },
  pending: {
    label: "Sincronizando…",
    aria: "Sincronización en curso",
    Icon: RefreshCw,
    tone: "warning",
    spin: true,
  },
  error: {
    label: "Error de sync",
    aria: "Error al sincronizar con la planilla",
    Icon: CloudAlert,
    tone: "error",
  },
  na: {
    label: "Solo catálogo",
    aria: "Campo solo de catálogo, sin sincronización a planilla",
    Icon: CircleSlash,
    tone: "info",
  },
};

export function SyncStatusBadge({
  status,
  error,
  compact = false,
}: SyncStatusBadgeProps) {
  const theme = useTheme();
  const cfg = COPY[status];
  const color =
    cfg.tone === "success"
      ? theme.palette.success.main
      : cfg.tone === "warning"
        ? theme.palette.warning.main
        : cfg.tone === "error"
          ? theme.palette.error.main
          : theme.palette.info.main;
  const { Icon } = cfg;
  const title =
    status === "error" && error ? `${cfg.label}: ${error}` : cfg.label;

  return (
    <Tooltip title={title} arrow disableInteractive>
      <Box
        role="status"
        aria-label={
          status === "error" && error ? `${cfg.aria}: ${error}` : cfg.aria
        }
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          height: 22,
          px: compact ? 0.5 : 0.85,
          borderRadius: 999,
          bgcolor: alpha(color, 0.12),
          color,
          border: `1px solid ${alpha(color, 0.28)}`,
          fontSize: 11,
          fontWeight: 600,
          lineHeight: 1,
          whiteSpace: "nowrap",
          "@keyframes tm-sync-spin": {
            from: { transform: "rotate(0deg)" },
            to: { transform: "rotate(360deg)" },
          },
        }}
      >
        <Box
          component={Icon}
          aria-hidden
          sx={{
            width: 13,
            height: 13,
            flexShrink: 0,
            animation:
              cfg.spin &&
              !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
                ? "tm-sync-spin 1.4s linear infinite"
                : "none",
          }}
        />
        {!compact && <span>{cfg.label}</span>}
      </Box>
    </Tooltip>
  );
}

export default SyncStatusBadge;
