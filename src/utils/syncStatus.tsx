/**
 * Sync-status → Badge mapping.
 *
 * Reflects the mirror row's `syncStatus`:
 *   - "synced"  → Convex write reached Google Sheets
 *   - "pending" → Convex write committed; the scheduled push hasn't confirmed yet
 *   - "error"   → the push to Sheets failed (title carries the reason)
 *   - "na"      → display-only / Convex-only field (no Sheets column) — never pends
 */
import { Box } from '@mui/material';
import { CloudCheck, RefreshCw, CloudAlert, CircleSlash } from 'lucide-react';
import type { BadgeTone } from '../design-system';

export type SyncStatusValue = 'synced' | 'pending' | 'error' | 'na';

export interface SyncStatusBadgeInfo {
  tone: BadgeTone;
  label: string;
  icon: React.ReactNode;
  /** Tooltip title — carries the error detail when status === 'error'. */
  title: string;
}

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const SpinIcon = () => (
  <Box
    component={RefreshCw}
    sx={{
      width: 12,
      height: 12,
      '@keyframes tm-sync-spin': {
        from: { transform: 'rotate(0deg)' },
        to: { transform: 'rotate(360deg)' },
      },
      animation: reducedMotion() ? 'none' : 'tm-sync-spin 1.4s linear infinite',
    }}
  />
);

export function getSyncStatusBadge(
  status: SyncStatusValue,
  error?: string,
): SyncStatusBadgeInfo {
  switch (status) {
    case 'synced':
      return {
        tone: 'success',
        label: 'Sincronizado',
        icon: <CloudCheck size={12} />,
        title: 'Sincronizado con la planilla',
      };
    case 'pending':
      return {
        tone: 'warn',
        label: 'Sincronizando…',
        icon: <SpinIcon />,
        title: 'Sincronización en curso',
      };
    case 'error':
      return {
        tone: 'danger',
        label: 'Error de sync',
        icon: <CloudAlert size={12} />,
        title: error
          ? `Error de sync: ${error}`
          : 'Error al sincronizar con la planilla',
      };
    case 'na':
    default:
      return {
        tone: 'neutral',
        label: 'Solo catálogo',
        icon: <CircleSlash size={12} />,
        title: 'Campo solo de catálogo, sin sincronización a planilla',
      };
  }
}
