/**
 * La cabecera de la tienda pública.
 *
 * Tres zonas: marca a la izquierda, navegación al centro, utilidades a la
 * derecha. La navegación central sólo aparece cuando el menú vive en la
 * cabecera (opción A); con la opción B la misma lista se dibuja en la barra
 * inferior y aquí queda sólo la marca y las utilidades.
 *
 * Sin glass: DS3 permite `backdrop-filter` en exactamente dos sitios (la barra
 * de navegación superior de la app y la TabBar), y esta cabecera pública no es
 * ninguno de los dos. Es superficie sólida con un pelo de separación.
 */
import { Box } from '@mui/material';
import { Menu as MenuIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useThemeMode } from '../../../contexts/ThemeContext';
import { qeType, ds3Shell } from '../../../design-system';
import {
  LanguagePicker,
  ThemeToggle,
  iconButtonSx,
  TOUCH,
} from './TiendaChromeBits';
import { useMenuPlacement, useSeleccion } from '../useTienda';

/** Alto de la cabecera, exportado como el resto de barras del proyecto para
 *  que nadie lo adivine con un número mágico. */
export const TIENDA_HEADER_HEIGHT = 60;

/**
 * Desde dónde la navegación vive en la cabecera en vez de en el hamburguesa.
 *
 * NO es `md` (900px). Con `md` un iPad en vertical (834px) se quedaba sin
 * navegación —medido: 0 enlaces visibles— mientras la rejilla de puertas ya
 * enseñaba DOS columnas de 383px. Tampoco es `sm` (600px), donde no cabe.
 *
 * El número sale de sumar lo medido en Chrome, no de redondear:
 *   marca 120 + hueco 12 + margen 16
 *   + nav 412  (enlaces medidos 112+74+113+89 con paddingInline 8, + 3 huecos de 8)
 *   + hueco 12
 *   + utilidades 168 (chip 44 + 8 + idioma 64 + 8 + tema 44)
 *   = 740px de contenido, más 48 de canaleta (24 por lado en `sm`) = 788px.
 * A 768px NO cabe con el chip de selección puesto (falta ~20px, y en portugués
 * o francés falta más); a 810px sí, con 22px de aire. 810 es además el ancho
 * en vertical del iPad de 10.2", así que la familia iPad entera (810/820/834/
 * 1024) recibe navegación real y por debajo queda el hamburguesa.
 * MUI no tiene un breakpoint ahí: se escribe la media query explícita.
 */
const NAV_MIN_WIDTH = 810;
const NAV_QUERY = `@media (min-width:${NAV_MIN_WIDTH}px)`;

export interface TiendaNavLink {
  to: string;
  label: string;
  /** 'exact' evita que /tienda se quede encendido en todas las rutas hijas. */
  exact?: boolean;
}

export function useTiendaNav(): TiendaNavLink[] {
  const { t } = useLanguage();
  return [
    { to: '/tienda', label: t.tienda.nav.colecciones, exact: true },
    { to: '/tienda/la-casa', label: t.tienda.nav.laCasa },
    { to: '/tienda/seleccion', label: t.tienda.nav.seleccion },
    { to: '/tienda/contacto', label: t.tienda.nav.contacto },
  ];
}

export function esRutaActiva(pathname: string, link: TiendaNavLink): boolean {
  return link.exact ? pathname === link.to : pathname.startsWith(link.to);
}

export interface TiendaHeaderProps {
  onOpenMenu: () => void;
  menuOpen: boolean;
}

export default function TiendaHeader({
  onOpenMenu,
  menuOpen,
}: TiendaHeaderProps) {
  const { t } = useLanguage();
  const { mode } = useThemeMode();
  const { pathname } = useLocation();
  const [placement] = useMenuPlacement();
  const { count } = useSeleccion();
  const nav = useTiendaNav();

  const wordmark =
    mode === 'dark'
      ? '/images/logo-horizontal-white.png'
      : '/images/logo-horizontal-green.png';

  const navEnCabecera = placement === 'header';

  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: ds3Shell.zIndex.sticky,
        borderBottom: '1px solid var(--tm-hairline)',
        backgroundColor: 'var(--tm-surface)',
      }}
    >
      <Box
        sx={{
          maxWidth: 1080,
          margin: '0 auto',
          paddingInline: { xs: '16px', sm: '24px', md: '32px' },
          minHeight: TIENDA_HEADER_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <Box
          component={Link}
          to="/tienda"
          aria-label="Tierra Mädre"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            // «Toca el logo para volver al inicio» es el objetivo más
            // convencional de cualquier sitio y medía 120x20 en Chrome. La
            // tinta no cambia —la imagen sigue midiendo 20px de alto—: crece
            // sólo la caja que recibe el dedo, y el margen negativo devuelve
            // el logo al píxel exacto donde estaba (136x44 de alcance).
            minHeight: TOUCH,
            paddingInline: '8px',
            marginInline: '-8px',
            borderRadius: 'var(--tm-radius-control)',
            '&:focus-visible': {
              outline: 'none',
              boxShadow: 'var(--tm-focus-ring)',
            },
          }}
        >
          <Box
            component="img"
            src={wordmark}
            alt=""
            sx={{ height: 20, width: 'auto' }}
          />
        </Box>

        {navEnCabecera && (
          <Box
            component="nav"
            aria-label={t.tienda.nav.landmark}
            sx={{
              // Ver NAV_MIN_WIDTH: el hamburguesa manda por debajo de 810px,
              // los enlaces por encima. El margen y el relleno se aprietan en
              // la banda 810–899 porque ahí el ancho está contado.
              display: 'none',
              [NAV_QUERY]: { display: 'flex' },
              alignItems: 'center',
              gap: '8px',
              marginInlineStart: { xs: '16px', md: '24px' },
            }}
          >
            {nav.map((link) => {
              const activa = esRutaActiva(pathname, link);
              return (
                <Box
                  key={link.to}
                  component={Link}
                  to={link.to}
                  aria-current={activa ? 'page' : undefined}
                  sx={{
                    ...qeType.overline,
                    textDecoration: 'none',
                    // Estado activo por color, nunca por peso ni tamaño: un
                    // cambio de peso re-maqueta la fila entera al navegar.
                    color: activa ? 'var(--tm-accent)' : 'var(--tm-muted)',
                    // Medidos 116x39 a 1512px: por debajo de los 44 del
                    // contrato. `minHeight` con el texto centrado sube la caja
                    // sin tocar la tinta (la letra sigue en 11px de overline).
                    display: 'inline-flex',
                    alignItems: 'center',
                    minHeight: TOUCH,
                    paddingInline: { xs: '8px', md: '10px' },
                    paddingBlock: '12px',
                    borderRadius: 'var(--tm-radius-control)',
                    transition: 'color var(--tm-fast) var(--tm-ease)',
                    '&:hover': { color: 'var(--tm-accent)' },
                    '&:focus-visible': {
                      outline: 'none',
                      boxShadow: 'var(--tm-focus-ring)',
                    },
                  }}
                >
                  {link.label}
                </Box>
              );
            })}
          </Box>
        )}

        <Box
          sx={{
            marginInlineStart: 'auto',
            display: 'flex',
            alignItems: 'center',
            // Medido: idioma/tema y tema/menú quedaban a 2px en las tres
            // ventanas. El contrato pide 8px entre objetivos vecinos, y como
            // todos estos miden 44px reales (nada de cápsulas absolutas que se
            // salen de su caja), 8px de hueco visual son 8px de hueco táctil.
            gap: '8px',
          }}
        >
          {count > 0 && (
            <Box
              component={Link}
              to="/tienda/seleccion"
              aria-label={
                count === 1
                  ? t.tienda.seleccion.countOne
                  : t.tienda.seleccion.count.replace('{n}', String(count))
              }
              sx={{
                // El enlace mide 44x44 y la ficha sigue midiendo 28: el chip
                // de cuenta NO debe parecer un botón, así que crece la caja
                // que recibe el dedo y no la tinta. Caja real (no `hitSlop`)
                // porque en una fila apretada la cápsula absoluta del mixin se
                // sale de su sitio y se come el hueco de 8px del vecino.
                width: TOUCH,
                height: TOUCH,
                flexShrink: 0,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--tm-radius-control)',
                transition: 'opacity var(--tm-fast) var(--tm-ease)',
                '&:focus-visible': {
                  outline: 'none',
                  boxShadow: 'var(--tm-focus-ring)',
                },
                '&:active': { opacity: 0.85 },
              }}
            >
              <Box
                component="span"
                aria-hidden="true"
                sx={{
                  ...qeType.data,
                  fontSize: '0.75rem',
                  minWidth: 28,
                  height: 28,
                  paddingInline: '9px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--tm-radius-pill)',
                  border: '1px solid var(--tm-accent)',
                  color: 'var(--tm-accent)',
                  backgroundColor: 'var(--tm-accent-wash)',
                }}
              >
                {count}
              </Box>
            </Box>
          )}

          <LanguagePicker />
          <ThemeToggle />

          {navEnCabecera && (
            <Box
              component="button"
              type="button"
              onClick={onOpenMenu}
              aria-label={t.tienda.shell.openMenu}
              aria-expanded={menuOpen}
              sx={{
                ...iconButtonSx,
                // Espejo exacto de la nav: el hamburguesa se retira justo
                // donde entran los cuatro enlaces (ver NAV_MIN_WIDTH).
                display: 'inline-flex',
                [NAV_QUERY]: { display: 'none' },
              }}
            >
              <MenuIcon size={20} strokeWidth={1.75} aria-hidden="true" />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
