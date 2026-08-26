/**
 * El marco compartido de las pantallas de Renacer.
 *
 * Regla de copy que atraviesa todo este directorio (§1 y §15 del spec, carril `kira`):
 * **lenguaje de compra, jamás "donación"** —Tierra Mädre no es fundación— y el relato
 * **abre por el terremoto y los damnificados, nunca por CoomÜnity** ("no es el momento",
 * ratificado 24-08). Sin matiz esotérico de la esmeralda en lo comercial.
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Typography, useTheme } from '@mui/material';
import { qeFont, qeTokens } from '../../design-system';

interface RenacerLayoutProps {
  titulo: string;
  bajada?: string;
  /**
   * Cambiar este valor lleva el scroll arriba. Se usa para los pasos del registro:
   * el router conserva el offset entre renders, así que sin esto el paso siguiente
   * aparece a mitad de formulario — y el usuario cree que la página se trabó.
   */
  resetScrollKey?: string | number;
  children: ReactNode;
}

export function useRenacerTokens() {
  const theme = useTheme();
  return theme.palette.mode === 'dark' ? qeTokens.dark : qeTokens.light;
}

export default function RenacerLayout({
  titulo,
  bajada,
  resetScrollKey,
  children,
}: RenacerLayoutProps) {
  const t = useRenacerTokens();
  const { pathname } = useLocation();
  const contenedor = useRef<HTMLDivElement>(null);

  /**
   * **Contenedor de scroll propio, y no el del documento.**
   *
   * El shell de la app fija `body { overflow: hidden }` globalmente —la regla vive en
   * `design-system/tokens/css-variables.css` y significa "solo <main> scrollea"—. Estas
   * páginas renderizan FUERA del shell y no tienen <main>, así que heredan el candado:
   * el contenido queda recortado en el pliegue y **la rueda no hace nada**.
   *
   * Devolverle el scroll al `body` (lo que hace `VitrinaPage`) no alcanzó acá: medido el
   * 2026-08-26, con `body.overflowY = 'auto'` el documento seguía sin desplazarse —
   * `window.scrollBy(0, 400)` dejaba `scrollY` en 0 con 4088px de contenido y 802px de
   * viewport—. Así que se usa el otro patrón que la casa ya tiene, el de `CollectionPage`:
   * la página es su propio contenedor de scroll y no depende de la cascada global.
   *
   * Esto no es un detalle de presentación: el formulario de registro mide varias pantallas
   * y se llena en un teléfono, en campo. Una página que no scrollea es una persona que no
   * se puede registrar.
   */

  // Arriba en cada cambio de ruta y de paso. Se scrollea EL CONTENEDOR, no la ventana:
  // la ventana no es la que se mueve. `instant` y no `smooth` — la vista nueva tiene que
  // aparecer arriba, no subir animándose a través de la anterior.
  useEffect(() => {
    contenedor.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, resetScrollKey]);

  return (
    <Box
      ref={contenedor}
      sx={{
        // `dvh` y no `vh`: en Safari/Chrome de móvil la barra de herramientas hace que
        // 100vh sea más alto que la pantalla real, y el final del formulario queda debajo.
        height: '100dvh',
        overflowY: 'auto',
        overflowX: 'hidden',
        // El rebote elástico arrastraría la página de atrás en iOS.
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
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
