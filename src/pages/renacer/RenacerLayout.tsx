/**
 * El marco compartido de las pantallas de Renacer — la piel de campaña "noche esmeralda".
 *
 * Regla de copy que atraviesa todo este directorio (§1 y §15 del spec, carril `kira`):
 * **lenguaje de compra, jamás "donación"** —Tierra Mädre no es fundación— y el relato
 * **abre por el terremoto y los damnificados, nunca por CoomÜnity** ("no es el momento",
 * ratificado 24-08). Sin matiz esotérico de la esmeralda en lo comercial.
 *
 * La piel viene de la landing del 22-08, ya como tokens (`design-system/tokens/renacer-campaign`).
 * Todo el color sale de `useRenacerTokens()`; ninguna página escribe un hex.
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, GlobalStyles, Typography } from '@mui/material';
import { renacerFont, renacerTokens } from '../../design-system';

interface RenacerLayoutProps {
  titulo: string;
  bajada?: string;
  /** Una frase pequeña ARRIBA del título, como la landing: "Porque después de esta gran tragedia…" */
  lead?: ReactNode;
  /** El símbolo de la marca arriba del todo. Va por defecto en la puerta y el hub. */
  marca?: boolean;
  /**
   * Cambiar este valor lleva el scroll arriba. Se usa para los pasos del registro:
   * el router conserva el offset entre renders, así que sin esto el paso siguiente
   * aparece a mitad de formulario — y el usuario cree que la página se trabó.
   */
  resetScrollKey?: string | number;
  children: ReactNode;
}

export function useRenacerTokens() {
  return renacerTokens;
}

const estilosGlobales = (
  <GlobalStyles
    styles={{
      '@keyframes renacerSube': {
        from: { opacity: 0, transform: 'translateY(14px)' },
        to: { opacity: 1, transform: 'translateY(0)' },
      },
      '@media (prefers-reduced-motion: reduce)': {
        '.renacer-revela > *': { animation: 'none !important' },
      },
    }}
  />
);

export default function RenacerLayout({
  titulo,
  bajada,
  lead,
  marca,
  resetScrollKey,
  children,
}: RenacerLayoutProps) {
  const t = useRenacerTokens();
  const { pathname } = useLocation();
  const contenedor = useRef<HTMLDivElement>(null);

  // Arriba en cada cambio de ruta y de paso. Se scrollea EL CONTENEDOR, no la ventana.
  useEffect(() => {
    contenedor.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, resetScrollKey]);

  return (
    <Box
      ref={contenedor}
      sx={{
        // Contenedor de scroll propio: el shell fija `body { overflow: hidden }` y estas
        // páginas viven fuera del shell (ver historial en git para la medición del 26-08).
        height: '100dvh',
        overflowY: 'auto',
        overflowX: 'hidden',
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
        position: 'relative',
        bgcolor: t.bg,
        backgroundImage: t.heroGradient,
        backgroundAttachment: 'local',
        color: t.text,
        display: 'flex',
        justifyContent: 'center',
        px: 2.5,
        py: { xs: 4, sm: 7 },
        // El grano, encima de todo y sin interceptar toques.
        '&::before': {
          content: '""',
          position: 'fixed',
          inset: 0,
          backgroundImage: t.grain,
          pointerEvents: 'none',
          mixBlendMode: 'overlay',
          zIndex: 0,
        },
      }}
    >
      {estilosGlobales}
      <Box
        key={`${pathname}·${resetScrollKey ?? ''}`}
        className="renacer-revela"
        sx={{
          width: '100%',
          maxWidth: 520,
          position: 'relative',
          zIndex: 1,
          // Entrada escalonada: cada bloque directo sube y aparece, uno tras otro.
          '& > *': { animation: 'renacerSube 560ms cubic-bezier(.2,.7,.2,1) both' },
          '& > *:nth-of-type(1)': { animationDelay: '0ms' },
          '& > *:nth-of-type(2)': { animationDelay: '70ms' },
          '& > *:nth-of-type(3)': { animationDelay: '140ms' },
          '& > *:nth-of-type(4)': { animationDelay: '210ms' },
          '& > *:nth-of-type(5)': { animationDelay: '280ms' },
          '& > *:nth-of-type(n+6)': { animationDelay: '340ms' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: marca ? 4 : 2.5 }}>
          {marca && (
            <Box
              component="img"
              src="/logo-symbol-white.png"
              alt="Tierra Mädre"
              sx={{ width: 40, height: 40, objectFit: 'contain', opacity: 0.95 }}
            />
          )}
          <Typography
            component="p"
            sx={{
              fontFamily: renacerFont.display,
              fontWeight: 600,
              fontSize: 11.5,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: t.accent,
            }}
          >
            Renacer
          </Typography>
        </Box>

        {lead && (
          <Typography
            component="p"
            sx={{ fontFamily: renacerFont.ui, fontSize: 16, lineHeight: 1.5, color: t.muted, mb: 1.5 }}
          >
            {lead}
          </Typography>
        )}

        <Typography
          component="h1"
          sx={{
            fontFamily: renacerFont.display,
            fontWeight: 800,
            fontSize: { xs: 30, sm: 38 },
            lineHeight: 1.08,
            letterSpacing: '-0.025em',
            color: t.text,
            mb: bajada ? 1.75 : 3,
          }}
        >
          {titulo}
        </Typography>

        {bajada && (
          <Typography
            sx={{ fontFamily: renacerFont.ui, fontSize: 16, lineHeight: 1.55, color: t.muted, mb: 3.5 }}
          >
            {bajada}
          </Typography>
        )}

        {children}
      </Box>
    </Box>
  );
}
