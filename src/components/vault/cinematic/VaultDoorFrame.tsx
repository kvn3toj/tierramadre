// src/components/vault/cinematic/VaultDoorFrame.tsx
import { Box } from '@mui/material';
import type { ReactNode } from 'react';
import { vaultCinema } from '../../../design-system';

export interface VaultDoorFrameProps {
  children: ReactNode;
  /** Mostrado en la base como firma de joyero. */
  makerMark?: string;
  /** Para tests / overrides. */
  ariaLabel?: string;
}

const { color, alpha } = vaultCinema;

/**
 * Marco circular cinematográfico de la bóveda.
 * Provee fondo radial, dos hairline rims dorados y maker's mark inferior.
 * No incluye dials ni puntero — composer envolvente.
 */
export function VaultDoorFrame({ children, makerMark = 'Tierra Madre', ariaLabel }: VaultDoorFrameProps) {
  return (
    <Box
      role="group"
      aria-label={ariaLabel}
      sx={{
        position: 'relative',
        aspectRatio: '1 / 1',
        width: '100%',
        maxWidth: `min(92vw, ${vaultCinema.layout.wheelBase}px)`,
        borderRadius: '50%',
        background: `radial-gradient(circle at 42% 28%, ${color.nightHint} 0%, ${color.nightShadow} 55%, ${color.ink} 100%)`,
        boxShadow: [
          'inset 0 0 80px rgba(0, 0, 0, 0.95)',
          'inset 0 -40px 60px rgba(0, 0, 0, 0.7)',
          '0 24px 50px rgba(0, 0, 0, 0.85)',
        ].join(', '),
        overflow: 'hidden',
        isolation: 'isolate',
      }}
    >
      {/* Outer hairline rim */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: vaultCinema.layout.outerRingInset,
          borderRadius: '50%',
          border: `${vaultCinema.layout.rimHairlineWidth}px solid rgba(201, 169, 97, ${alpha.rimSoft})`,
          pointerEvents: 'none',
        }}
      />
      {children}
      {makerMark && (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            left: '50%',
            bottom: '6%',
            transform: 'translateX(-50%)',
            fontFamily: vaultCinema.typography.family,
            fontSize: vaultCinema.typography.makerMarkSize,
            letterSpacing: vaultCinema.typography.makerMarkLetterSpacing,
            color: `rgba(201, 169, 97, ${alpha.makerMark})`,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            zIndex: 5,
          }}
        >
          {makerMark}
        </Box>
      )}
    </Box>
  );
}
