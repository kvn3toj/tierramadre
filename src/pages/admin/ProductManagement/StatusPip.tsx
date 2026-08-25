/**
 * StatusPip — single chromatic dot at the row's right edge.
 *
 * One 7×7 px circle, filled with the foto.status color matching the
 * product's `estado` (emerald for disponible, gold for asesor,
 * crimson for vendida). When the row has no estado set, renders a
 * hollow ring at edgeStrong opacity.
 *
 * Per Interface Design mandate:
 *   Intent — distinguish status at a glance, no labels needed.
 *   Palette — three foto status colors (emerald / gold / crimson).
 *   Depth — flat circle; no shadow, no border on filled state.
 *   Surfaces — inherits row surface; no own background.
 *   Typography — none (visual-only; aria-label carries the text).
 *   Spacing — 7×7, no padding.
 */

import { Box } from '@mui/material';
import type { FotoTokens } from '../../../design-system';
import type { ProductEstado } from '../../../data/vocabularies';

// Re-export under the historical name so downstream callers don't churn.
export type EstadoValue = ProductEstado;

interface StatusPipProps {
  estado: EstadoValue;
  /** Fotosíntesis tokens — drives the pip color. */
  foto: FotoTokens;
  /** Forces a "muted" look for inactive rows (e.g., during a save) */
  muted?: boolean;
}

const LABELS: Record<EstadoValue, string> = {
  DISPONIBLE: 'Disponible',
  ASESOR: 'Con asesor',
  CONSIGNACION: 'En consignación',
  VENDIDA: 'Vendida',
  Retornado: 'Retornado',
  ESMEREOGENESIS: 'Esmereogénesis',
  ESMERO: 'Esmero',
  'DISPONIBLE ADOPTADA': 'Adoptada',
  'LOTE X CT': 'Lote x ct',
  RETIRADA: 'Retirada',
  '': 'Sin estado',
};

function colorFor(estado: EstadoValue, foto: FotoTokens): string | null {
  switch (estado) {
    case 'DISPONIBLE':
      return foto.status.available;
    // Adopted is still nominally disponible, just pre-claimed by an asesor —
    // visually treat it like ASESOR (consigned/gold). CONSIGNACION (external
    // comercializador) gets the SAME color — the pip's job is "out of the
    // vault"; the LABEL is what tells asesor vs consignación apart.
    case 'ASESOR':
    case 'CONSIGNACION':
    case 'DISPONIBLE ADOPTADA':
      return foto.status.consigned;
    case 'VENDIDA':
      return foto.status.sold;
    // Esmereogénesis (and its shorter alias ESMERO) belongs to the special
    // program — paint it the same accent as consigned for now.
    case 'ESMEREOGENESIS':
    case 'ESMERO':
      return foto.status.consigned;
    // Retornado came back from somewhere — no canonical color yet, leave
    // hollow to flag it for review. RETIRADA is a row withdrawn from the
    // inventory (duplicate/replaced) — hollow on purpose: it must not read
    // as any live state.
    case 'Retornado':
    case 'LOTE X CT':
    case 'RETIRADA':
    case '':
    default:
      return null;
  }
}

export function StatusPip({ estado, foto, muted = false }: StatusPipProps) {
  const fill = colorFor(estado, foto);
  const label = LABELS[estado] ?? 'Sin estado';

  return (
    <Box
      role="img"
      aria-label={`Estado: ${label}`}
      title={label}
      sx={{
        width: '7px',
        height: '7px',
        borderRadius: '50%',
        backgroundColor: fill ?? 'transparent',
        border: fill ? 'none' : `1px solid ${foto.surfaces.edgeStrong}`,
        opacity: muted ? 0.4 : 1,
        transition: 'background-color 120ms ease, opacity 120ms ease',
        flexShrink: 0,
      }}
    />
  );
}
