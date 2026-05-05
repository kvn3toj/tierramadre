/**
 * StatusPip — the signature element of the atelier panel.
 *
 * A vertical column of three 6×6 squares. Only one is filled (the one
 * matching the product's `estado`); the others are hairline outlines.
 * Reads like the colored tab on a card-catalog index card.
 *
 * The pip is the ONLY saturated color in the row. Resist the urge to
 * add labels, gradients, or shadows. The whole point is restraint.
 *
 * Per Interface Design mandate:
 *   Intent — distinguish status at a glance without using colored chips.
 *   Palette — three atelier status colors (emerald / oxblood / amber).
 *   Depth — borders-only on empty pips; filled pip is solid.
 *   Surfaces — inherits row surface; no fill of its own.
 *   Typography — none (visual-only; aria-label provides the text).
 *   Spacing — 6×6 squares, 4px gap, total height ≈ 26px.
 */

import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { getAtelier } from '../../../design-system';

export type EstadoValue = 'DISPONIBLE' | 'VENDIDA' | 'ASESOR' | '';

interface StatusPipProps {
  estado: EstadoValue;
  /** Forces a "muted" look for inactive rows (e.g., during a save) */
  muted?: boolean;
}

const ORDER: Array<{ key: 'available' | 'sold' | 'consigned'; estado: EstadoValue }> = [
  { key: 'available', estado: 'DISPONIBLE' },
  { key: 'consigned', estado: 'ASESOR' },
  { key: 'sold', estado: 'VENDIDA' },
];

export function StatusPip({ estado, muted = false }: StatusPipProps) {
  const theme = useTheme();
  const atelier = getAtelier(theme.palette.mode);
  const activeKey = ORDER.find((p) => p.estado === estado)?.key ?? null;

  const label =
    estado === 'DISPONIBLE'
      ? atelier.status.available.label
      : estado === 'VENDIDA'
      ? atelier.status.sold.label
      : estado === 'ASESOR'
      ? atelier.status.consigned.label
      : 'Sin estado';

  return (
    <Box
      role="img"
      aria-label={`Estado: ${label}`}
      sx={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: `${atelier.spacing.pipGap}px`,
        opacity: muted ? 0.4 : 1,
      }}
    >
      {ORDER.map(({ key }) => {
        const isActive = key === activeKey;
        const fillColor = atelier.status[key].pip;
        return (
          <Box
            key={key}
            sx={{
              width: `${atelier.spacing.pip}px`,
              height: `${atelier.spacing.pip}px`,
              borderRadius: '1px',
              backgroundColor: isActive ? fillColor : 'transparent',
              border: isActive
                ? `1px solid ${fillColor}`
                : `1px solid ${atelier.brass.whisper}`,
              transition: atelier.motion.pip,
            }}
          />
        );
      })}
    </Box>
  );
}
