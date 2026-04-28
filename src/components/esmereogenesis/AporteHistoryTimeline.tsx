/**
 * AporteHistoryTimeline
 *
 * Vertical chronological timeline of aportes for a plan. Each entry is shown
 * as a "drop" — small emerald circle + relative date + amount.
 */

import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { Droplet } from 'lucide-react';
import type { Aporte } from '../../types/esmereogenesis';
import { emeraldCore, goldAccent } from '../../design-system/tokens/colors';
import { useCurrencyFormat } from '../../contexts/CurrencyContext';

interface AporteHistoryTimelineProps {
  aportes: Aporte[];
  /** Maximum entries to show before "Ver todos" */
  limit?: number;
  onShowAll?: () => void;
}

function relativeLabel(iso: string): string {
  const ts = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - ts;
  const diffMins = Math.round(diffMs / 60_000);
  const diffHours = Math.round(diffMs / 3_600_000);
  const diffDays = Math.round(diffMs / 86_400_000);
  const diffWeeks = Math.round(diffDays / 7);
  if (diffMins < 1) return 'Hace un momento';
  if (diffMins < 60) return `Hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
  if (diffHours < 24) return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffWeeks < 5) return `Hace ${diffWeeks} ${diffWeeks === 1 ? 'semana' : 'semanas'}`;
  const date = new Date(ts);
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

export const AporteHistoryTimeline: React.FC<AporteHistoryTimelineProps> = ({
  aportes,
  limit = 4,
  onShowAll,
}) => {
  const { formatCurrency } = useCurrencyFormat();
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const amountColor = isLight ? emeraldCore.dark : '#F4FAF6';
  const subtitleColor = isLight ? alpha(emeraldCore.dark, 0.6) : alpha('#FFFFFF', 0.62);
  const linkColor = isLight ? emeraldCore.primary : emeraldCore.light;

  if (aportes.length === 0) {
    return (
      <Box
        sx={{
          textAlign: 'center',
          py: 3,
          color: 'text.secondary',
        }}
      >
        <Typography variant="body2">
          Aún no has hecho aportes. Cuando riegues por primera vez, los verás aquí.
        </Typography>
      </Box>
    );
  }

  const ordered = [...aportes].sort((a, b) =>
    a.createdAt > b.createdAt ? -1 : 1,
  );
  const visible = limit ? ordered.slice(0, limit) : ordered;
  const hasMore = limit && ordered.length > limit;

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Vertical thread */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: 12,
          bottom: 12,
          left: 16,
          width: 2,
          background: `linear-gradient(180deg, ${emeraldCore.primary} 0%, ${alpha(emeraldCore.primary, 0)} 100%)`,
        }}
      />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {visible.map((aporte) => {
          const tone = aporte.type === 'suggested' ? emeraldCore.primary : goldAccent.primary;
          return (
            <Box
              key={aporte.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                position: 'relative',
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  bgcolor: alpha(tone, 0.15),
                  border: `2px solid ${tone}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: tone,
                  flexShrink: 0,
                  boxShadow: `0 0 12px ${alpha(tone, 0.4)}`,
                  zIndex: 1,
                }}
              >
                <Droplet size={14} fill={tone} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: amountColor,
                    lineHeight: 1.2,
                    textShadow: isLight ? 'none' : `0 1px 8px ${alpha(emeraldCore.dark, 0.45)}`,
                  }}
                >
                  + {formatCurrency(aporte.amountCOP)}
                </Typography>
                <Typography variant="caption" sx={{ color: subtitleColor }}>
                  {relativeLabel(aporte.createdAt)} ·{' '}
                  {aporte.type === 'suggested' ? 'Aporte sugerido' : 'Aporte libre'}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
      {hasMore && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Box
            component="button"
            type="button"
            onClick={onShowAll}
            sx={{
              background: 'transparent',
              border: 'none',
              color: linkColor,
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: 14,
              padding: 0,
              '&:hover': { color: isLight ? emeraldCore.dark : '#FFFFFF' },
            }}
          >
            Ver historial completo ({ordered.length})
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AporteHistoryTimeline;
