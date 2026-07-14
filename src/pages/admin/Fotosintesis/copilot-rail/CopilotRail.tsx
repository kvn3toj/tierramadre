import { useCallback, useEffect, useRef } from 'react';
import { Box, Drawer, Tooltip } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { getFoto } from '../../../../design-system';
import { useIsStaff } from '../../../../hooks/usePermissions';
import { CopilotPanel } from '../components/CopilotPanel';
import { CopilotRailHeader } from './CopilotRailHeader';
import { CopilotNavMap } from './CopilotNavMap';
import {
  RAIL_MAX_WIDTH,
  RAIL_MIN_WIDTH,
  clampRailWidth,
  useCopilotRail,
} from './CopilotRailContext';

const RAIL_VAR = '--copilot-rail-width';

/** Back-office surfaces where the companion appears (never the public storefront). */
function onBackOffice(pathname: string): boolean {
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/cuentas') ||
    pathname.startsWith('/solicitudes') ||
    pathname.startsWith('/mi-perfil')
  );
}

/** Shared inner content for both the docked panel and the overlay drawer. */
function RailBody({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
      <CopilotRailHeader onClose={onClose} />
      <CopilotNavMap />
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <CopilotPanel active={open} />
      </Box>
    </Box>
  );
}

/**
 * The persistent Fotosynthia companion. Docks + pushes content on desktop,
 * becomes a temporary overlay (full-screen on phones) below the breakpoint, and
 * collapses to a thin edge handle. Mounted once at the app shell; renders only
 * for staff on back-office routes.
 */
export function CopilotRail() {
  const foto = getFoto('light');
  const location = useLocation();
  const isStaff = useIsStaff();
  const { open, mode, width, openRail, closeRail, setWidth } = useCopilotRail();

  // Hidden on workbench routes — there the conversation IS the right pane, so
  // the ambient rail would be a second, conflicting Fotosynthia.
  const visible =
    isStaff &&
    onBackOffice(location.pathname) &&
    !location.pathname.includes('/admin/fotosintesis/copilot/');
  const docked = mode === 'docked';
  const pushing = visible && docked && open;

  // Drive the content push: IOSLayout's root paddingRight plus the fixed
  // bottom bars (IOSTabBar via css-variables.css, FotoTabBar, BulkActionBar)
  // consume this CSS var — see "Navigation UX Rules" in design-system/README.md.
  // Set imperatively during drag (no re-render storm), reset on unmount.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty(RAIL_VAR, pushing ? `${width}px` : '0px');
    return () => {
      root.style.setProperty(RAIL_VAR, '0px');
    };
  }, [pushing, width]);

  const draggingRef = useRef(false);
  const onGutterPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      draggingRef.current = true;
      const root = document.documentElement;
      document.body.style.userSelect = 'none';
      const onMove = (ev: PointerEvent) => {
        if (!draggingRef.current) return;
        const next = clampRailWidth(
          window.innerWidth - ev.clientX,
          window.innerWidth,
        );
        root.style.setProperty(RAIL_VAR, `${next}px`);
      };
      const onUp = (ev: PointerEvent) => {
        draggingRef.current = false;
        setWidth(
          clampRailWidth(window.innerWidth - ev.clientX, window.innerWidth),
        );
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        document.body.style.userSelect = '';
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [setWidth],
  );

  const onGutterKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setWidth(width + 16);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setWidth(width - 16);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setWidth(RAIL_MAX_WIDTH);
      } else if (e.key === 'End') {
        e.preventDefault();
        setWidth(RAIL_MIN_WIDTH);
      }
    },
    [setWidth, width],
  );

  if (!visible) return null;

  // Collapsed → thin edge handle (replaces the old FAB).
  if (!open) {
    return (
      <Tooltip title="Abrir Fotosynthia · ⌘J" placement="left" arrow>
        <Box
          component="button"
          type="button"
          aria-label="Abrir Fotosynthia"
          aria-expanded={false}
          onClick={openRail}
          sx={{
            position: 'fixed',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1240,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 92,
            padding: 0,
            border: `1px solid ${foto.surfaces.edge}`,
            borderRight: 'none',
            borderRadius: '12px 0 0 12px',
            background: foto.accent.primary,
            color: foto.ink.inverse,
            cursor: 'pointer',
            boxShadow: `-6px 0 22px ${foto.accent.glow}`,
            transition: 'background 120ms ease, width 160ms ease',
            '&:hover': { background: foto.accent.deep, width: 38 },
            '&:focus-visible': {
              outline: 'none',
              boxShadow: `0 0 0 3px ${foto.accent.glow}`,
            },
          }}
        >
          <Sparkles size={18} strokeWidth={1.9} />
        </Box>
      </Tooltip>
    );
  }

  // Overlay (tablet/phone): MUI temporary Drawer for free focus-trap/scrim/Esc.
  if (!docked) {
    return (
      <Drawer
        anchor="right"
        open
        onClose={closeRail}
        PaperProps={{
          sx: {
            width: { xs: '100vw', sm: 'min(400px, 92vw)' },
            maxWidth: '100vw',
            background: foto.surfaces.canvas,
            borderLeft: `1px solid ${foto.surfaces.edge}`,
            boxShadow: `-30px 0 80px ${foto.accent.glow}`,
          },
        }}
        ModalProps={{ 'aria-label': 'Fotosynthia copiloto' }}
      >
        <RailBody open={open} onClose={closeRail} />
      </Drawer>
    );
  }

  // Docked (desktop): fixed right column that pushes content via the CSS var.
  return (
    <Box
      role="complementary"
      aria-label="Fotosynthia copiloto"
      sx={{
        position: 'fixed',
        top: 0,
        right: 0,
        height: '100dvh',
        width: `var(${RAIL_VAR}, ${width}px)`,
        zIndex: 1250,
        background: foto.surfaces.canvas,
        borderLeft: `1px solid ${foto.surfaces.edge}`,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      {/* Resize gutter on the left edge */}
      <Box
        role="separator"
        aria-orientation="vertical"
        aria-label="Redimensionar Fotosynthia"
        aria-valuenow={width}
        aria-valuemin={RAIL_MIN_WIDTH}
        aria-valuemax={RAIL_MAX_WIDTH}
        tabIndex={0}
        onPointerDown={onGutterPointerDown}
        onKeyDown={onGutterKeyDown}
        sx={{
          position: 'absolute',
          left: -3,
          top: 0,
          bottom: 0,
          width: 8,
          cursor: 'col-resize',
          zIndex: 1,
          '&::after': {
            content: '""',
            position: 'absolute',
            left: 2,
            top: 0,
            bottom: 0,
            width: 1,
            background: 'transparent',
            transition: 'background 120ms ease',
          },
          '&:hover::after': { background: foto.accent.primary, opacity: 0.4 },
          '&:focus-visible': {
            outline: 'none',
            '&::after': {
              background: foto.accent.primary,
              opacity: 0.7,
              width: 2,
            },
          },
        }}
      />
      <RailBody open={open} onClose={closeRail} />
    </Box>
  );
}

export default CopilotRail;
