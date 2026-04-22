// src/components/vault/cinematic/VaultMonumentCenter.tsx
import { Box, useMediaQuery } from '@mui/material';
import { motion } from 'framer-motion';
import { vaultCinema, vaultEasing, vaultDurations } from '../../../design-system';

export interface VaultMonumentCenterProps {
  symbolName: string;
  digit: number;
  /** Highlight the center as part of the Confirm phase. */
  highlighted?: boolean;
  reducedMotion?: boolean;
  /** Cooldown counter overrides the symbol+digit display. */
  cooldownText?: string;
}

const { color, alpha, typography } = vaultCinema;

/**
 * Centro tipográfico de la bóveda. Sin caja, solo Playfair Display.
 * Puede mostrar (a) símbolo+separador+dígito, o (b) counter de cooldown (mm:ss).
 */
export function VaultMonumentCenter({
  symbolName,
  digit,
  highlighted = false,
  reducedMotion = false,
  cooldownText,
}: VaultMonumentCenterProps) {
  const isLg = useMediaQuery('(min-width: 600px)');
  const numberSize = isLg ? typography.centerNumberSizeLg : typography.centerNumberSize;

  const breathScale = !reducedMotion ? [1, 1.004, 1] : undefined;
  const breathTransition = !reducedMotion
    ? {
        duration: vaultDurations.hubBreathMs / 1000,
        ease: vaultEasing.breath,
        repeat: Infinity,
      }
    : undefined;

  if (cooldownText) {
    return (
      <Box
        aria-live="polite"
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontFamily: typography.metaFamily,
          fontSize: 18,
          letterSpacing: '0.15em',
          color: `rgba(201, 169, 97, 0.7)`,
          fontVariantNumeric: 'tabular-nums',
          zIndex: 5,
          textAlign: 'center',
        }}
      >
        {cooldownText}
      </Box>
    );
  }

  return (
    <motion.div
      animate={{ scale: breathScale }}
      transition={breathTransition}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        translateX: '-50%',
        translateY: '-50%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        zIndex: 5,
        pointerEvents: 'none',
      }}
    >
      <Box
        component="span"
        sx={{
          fontFamily: typography.family,
          fontStyle: 'italic',
          fontSize: typography.centerSymbolSize,
          letterSpacing: typography.centerSymbolLetterSpacing,
          color: color.emeraldLight,
          textTransform: 'uppercase',
          opacity: highlighted ? 1 : 0.8,
          textShadow: highlighted ? `0 0 8px rgba(0, 174, 122, 0.6)` : 'none',
          transition: `opacity 200ms, text-shadow 200ms`,
        }}
      >
        {symbolName}
      </Box>
      <Box
        aria-hidden
        sx={{
          width: 20,
          height: 1,
          background: `linear-gradient(90deg, transparent, rgba(201, 169, 97, ${alpha.rimStrong}), transparent)`,
        }}
      />
      <Box
        component="span"
        sx={{
          fontFamily: typography.family,
          fontSize: numberSize,
          color: color.champagneBright,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 0.9,
          letterSpacing: '-0.02em',
          textShadow: highlighted ? '0 0 12px rgba(223, 195, 131, 0.6)' : 'none',
          transition: 'text-shadow 200ms',
        }}
      >
        {String(digit).padStart(2, '0')}
      </Box>
    </motion.div>
  );
}
