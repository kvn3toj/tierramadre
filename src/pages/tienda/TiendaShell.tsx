/**
 * El marco público de la Tienda.
 *
 * Se monta en la capa de rutas públicas (`InvitationRouter`), fuera de
 * `IOSLayout`, igual que /v/ y /c/: sin barra superior de la app, sin sesión.
 * Trae su propia cabecera y su propio pie porque un cliente que llega por un
 * enlace no tiene a dónde "volver" dentro de la app.
 *
 * Monta las DOS colocaciones de menú de verdad y alterna entre ellas en vivo
 * (ver `useMenuPlacement`). Con la barra inferior puesta reserva el hueco al
 * final del contenido con `bottomBarClearance`, que ya suma el área segura del
 * teléfono, en vez de un número mágico.
 */
import React, { useState } from 'react';
import { Box } from '@mui/material';
import { useLanguage } from '../../contexts/LanguageContext';
import { ds3Shell } from '../../design-system';
import TiendaHeader from './components/TiendaHeader';
import TiendaFooter from './components/TiendaFooter';
import TiendaMenuSheet from './components/TiendaMenuSheet';
import TiendaBottomNav from './components/TiendaBottomNav';
import SeleccionBar from './components/SeleccionBar';
import { useMenuPlacement } from './useTienda';

export interface TiendaShellProps {
  children: React.ReactNode;
  /** Oculta la barra flotante de selección (la propia página de selección ya
   *  la contiene, y dos barras a la vez es ruido). */
  hideSeleccionBar?: boolean;
}

export default function TiendaShell({
  children,
  hideSeleccionBar = false,
}: TiendaShellProps) {
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [placement] = useMenuPlacement();
  const conBarraInferior = placement === 'bottom';

  return (
    <Box
      sx={{
        // Fondo de página a pantalla completa. `svh` y no `dvh`: el alto
        // pequeño es el estable, así que la barra del navegador al aparecer y
        // desaparecer no vuelve a maquetar el fondo. No hay offset calculado
        // aquí (nada de `calc(... - N)`), que es lo que la regla DS3 de
        // "las alturas se miden, no se adivinan" existe para evitar.
        minHeight: '100svh',
        backgroundColor: 'var(--tm-bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        component="a"
        href="#tienda-main"
        sx={{
          position: 'absolute',
          insetInlineStart: '-9999px',
          zIndex: ds3Shell.zIndex.overlay,
          '&:focus': {
            insetInlineStart: '16px',
            top: '8px',
            // Es el PRIMER objetivo que encuentra quien navega por teclado, y
            // medía 141×26. El relleno no alcanza para 44 de alto, así que la
            // altura se pide y el texto se centra en ella.
            display: 'inline-flex',
            alignItems: 'center',
            minHeight: 44,
            padding: '10px 14px',
            backgroundColor: 'var(--tm-surface)',
            border: '1px solid var(--tm-accent)',
            borderRadius: 'var(--tm-radius-control)',
            color: 'var(--tm-accent)',
          },
        }}
      >
        {t.tienda.shell.skipToContent}
      </Box>

      <TiendaHeader onOpenMenu={() => setMenuOpen(true)} menuOpen={menuOpen} />

      <Box
        component="main"
        id="tienda-main"
        sx={{
          flex: 1,
          width: '100%',
          maxWidth: 1080,
          margin: '0 auto',
          paddingInline: { xs: '16px', sm: '24px', md: '32px' },
          paddingBlock: { xs: '28px', sm: '40px' },
        }}
      >
        {children}
      </Box>

      <TiendaFooter />

      {conBarraInferior && (
        <>
          <Box
            aria-hidden="true"
            sx={{
              // El hueco de la barra sale del token, no de un número
              // adivinado, y `bottomBarClearance` ya suma el área segura.
              height: ds3Shell.scroll.bottomBarClearance(ds3Shell.tabBarReserve),
            }}
          />
          <TiendaBottomNav
            onOpenMenu={() => setMenuOpen((v) => !v)}
            menuOpen={menuOpen}
          />
        </>
      )}

      {!hideSeleccionBar && <SeleccionBar conBarraInferior={conBarraInferior} />}

      <TiendaMenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
    </Box>
  );
}
