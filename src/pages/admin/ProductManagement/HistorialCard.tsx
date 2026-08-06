/**
 * HistorialCard — surfaces recent edits for the selected stone, or
 * the catalog-wide recent activity in "global" mode (no row selected).
 *
 * Selected mode: backed by `products.editHistory` (up to 20 rows by
 * itemId). The card collapses to 5 and exposes "Ver más" client-side.
 * Global mode: backed by `products.recentEdits` (limit 5), read-only.
 */

import { Box, Typography } from '@mui/material';
import { useState } from 'react';
import { fontFamilies, type FotoTokens } from '../../../design-system';
import {
  useConvexQuery,
  convexApi,
  convexReady,
} from '../../../lib/convex-safe';
import { readFreshSessionToken } from '../../../utils/sessionToken';

const SANS = fontFamilies.system;

interface HistorialCardProps {
  foto: FotoTokens;
  /** When non-null, query editHistory(itemId). When null, fall back to
   *  catalog-wide `recentEdits` so the no-selection Bandeja still reads. */
  itemId: string | null;
}

interface AuditRow {
  _id: string;
  itemId: string;
  editorEmail: string;
  editorName?: string;
  editedAt: string;
  changes: Array<{
    field: string;
    before: string | number | null;
    after: string | number | null;
  }>;
  status: 'saved' | 'pending' | 'failed';
}

function summarizeChanges(
  changes: Array<{ field: string; before: unknown; after: unknown }>,
): string {
  if (changes.length === 0) return 'sin cambios';
  if (changes.length === 1) {
    const c = changes[0];
    if (c.field === 'estado') return `→ estado: ${String(c.after)}`;
    return `editó ${c.field}`;
  }
  return `editó ${changes.length} campos`;
}

function relDays(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.round(diff / 86400000);
  if (days < 1) {
    const hours = Math.round(diff / 3600000);
    return hours < 1 ? 'hace minutos' : `hace ${hours} h`;
  }
  return `hace ${days} d`;
}

export function HistorialCard({ foto, itemId }: HistorialCardProps) {
  const [expanded, setExpanded] = useState(false);
  // Selected mode: per-itemId history (up to 20). Global mode: latest
  // 5 across the whole catalog. Hooks are called unconditionally so
  // React's call order stays stable across the no-selection toggle.
  const sessionToken = readFreshSessionToken() ?? undefined;
  const itemHistory = useConvexQuery(
    convexApi.products.editHistory,
    convexReady && itemId ? { itemId, sessionToken } : 'skip',
  ) as AuditRow[] | undefined;
  const globalHistory = useConvexQuery(
    convexApi.products.recentEdits,
    convexReady && !itemId ? { limit: 5, sessionToken } : 'skip',
  ) as AuditRow[] | undefined;
  const history = itemId ? itemHistory : globalHistory;
  const allowExpand = !!itemId;
  const visible = history
    ? history.slice(0, allowExpand && expanded ? 20 : 5)
    : history;
  return (
    <Box
      sx={{
        border: `1px solid ${foto.surfaces.rule}`,
        borderRadius: '11px',
        p: '13px 15px',
        backgroundColor: foto.surfaces.canvas,
      }}
    >
      <Typography
        component="div"
        sx={{
          fontFamily: SANS,
          fontSize: 9,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: foto.ink.tertiary,
          fontWeight: 500,
          mb: 1,
        }}
      >
        {itemId ? 'Historial' : 'Actividad reciente'}
      </Typography>
      {history === undefined && (
        <Typography
          sx={{ fontFamily: SANS, fontSize: 10, color: foto.ink.tertiary }}
        >
          Cargando…
        </Typography>
      )}
      {history && history.length === 0 && (
        <Typography
          sx={{ fontFamily: SANS, fontSize: 10, color: foto.ink.tertiary }}
        >
          {itemId ? 'Sin historial todavía' : 'Sin actividad reciente'}
        </Typography>
      )}
      {visible &&
        visible.length > 0 &&
        visible.map((h) => (
          <Box
            key={h._id}
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              py: 0.5,
              fontFamily: SANS,
              fontSize: 10,
              gap: 1,
            }}
          >
            <Typography component="span" sx={{ color: foto.ink.secondary }}>
              {h.editorName ?? h.editorEmail} {summarizeChanges(h.changes)}
            </Typography>
            <Typography component="span" sx={{ color: foto.ink.tertiary }}>
              {relDays(h.editedAt)}
            </Typography>
          </Box>
        ))}
      {allowExpand && history && history.length > 5 && !expanded && (
        <Box
          component="button"
          type="button"
          onClick={() => setExpanded(true)}
          sx={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: foto.accent.primary,
            fontFamily: SANS,
            fontSize: 10,
            fontWeight: 600,
            mt: 0.5,
            p: 0,
          }}
        >
          Ver más
        </Box>
      )}
    </Box>
  );
}
