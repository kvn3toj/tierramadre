/**
 * El marco compartido de las pantallas de Renacer.
 *
 * Regla de copy que atraviesa todo este directorio (§1 y §15 del spec, carril `kira`):
 * **lenguaje de compra, jamás "donación"** —Tierra Mädre no es fundación— y el relato
 * **abre por el terremoto y los damnificados, nunca por CoomÜnity** ("no es el momento",
 * ratificado 24-08). Sin matiz esotérico de la esmeralda en lo comercial.
 */

import type { ReactNode } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { qeFont, qeTokens } from '../../design-system';

interface RenacerLayoutProps {
  titulo: string;
  bajada?: string;
  children: ReactNode;
}

export function useRenacerTokens() {
  const theme = useTheme();
  return theme.palette.mode === 'dark' ? qeTokens.dark : qeTokens.light;
}

export default function RenacerLayout({ titulo, bajada, children }: RenacerLayoutProps) {
  const t = useRenacerTokens();

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: t.bg,
        color: t.text,
        display: 'flex',
        justifyContent: 'center',
        px: 2,
        py: { xs: 4, sm: 6 },
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 560 }}>
        <Typography
          component="p"
          sx={{
            fontFamily: qeFont.ui,
            fontSize: 12,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: t.accent,
            mb: 1.5,
          }}
        >
          Renacer
        </Typography>

        <Typography
          component="h1"
          sx={{
            fontFamily: qeFont.serif,
            fontSize: { xs: 30, sm: 38 },
            lineHeight: 1.15,
            color: t.text,
            mb: bajada ? 1.5 : 3,
          }}
        >
          {titulo}
        </Typography>

        {bajada && (
          <Typography
            sx={{
              fontFamily: qeFont.ui,
              fontSize: 16,
              lineHeight: 1.55,
              color: t.muted,
              mb: 3,
            }}
          >
            {bajada}
          </Typography>
        )}

        {children}
      </Box>
    </Box>
  );
}
