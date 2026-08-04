/**
 * IOSLayout Component
 *
 * Main navigation container
 * - Orchestrates TabBar, NavigationBar, and MoreSheet
 * - Page config system for route-specific settings
 */

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { useLocation } from 'react-router-dom';
import { Box, IconButton, useMediaQuery } from '@mui/material';
import {
  Search,
  FilterList,
  Fullscreen,
  FullscreenExit,
} from '@mui/icons-material';

import IOSNavigationBar, {
  NavigationBarMode,
  NavigationAction,
} from './IOSNavigationBar';
import IOSMoreSheet from './IOSMoreSheet';
import IOSSettingsSheet from './IOSSettingsSheet';
import ScrollRestoration from '../shared/ScrollRestoration';
import { InvitationBanner } from '../invitation';
import { CopilotRail } from '../../pages/admin/Fotosintesis/copilot-rail/CopilotRail';
import {
  zIndex,
  defaultShadows,
  appShell,
  bottomBarClearance,
  layoutBreakpoints,
  TabBar,
  hitSlop,
} from '../../design-system';
import {
  STOREFRONT_SLOTS,
  PROVIDER_SLOTS,
  storefrontTabTheme,
} from '../navigation/tabBarConfig';
import { useIsProvider } from '../../hooks/usePermissions';
import { useLanguage } from '../../contexts/LanguageContext';
import { useThemeMode } from '../../contexts/ThemeContext';

interface PageConfig {
  title: string;
  mode: NavigationBarMode;
  subtitle?: string;
  logoUrl?: string;
  showBackButton?: boolean;
  leadingActions?: NavigationAction[];
  trailingActions?: NavigationAction[];
  /** Override background color for the nav bar */
  backgroundColor?: string;
  /** Force a specific logo regardless of theme */
  forceLogoUrl?: string;
}

const getPageConfigs = (t: any): Record<string, PageConfig> => ({
  '/gallery': {
    title: t.pages.gallery.title,
    mode: 'large',
    subtitle: t.pages.gallery.subtitle,
    trailingActions: [
      {
        icon: Search,
        label: t.actions.search,
        onClick: () => {
          /* TODO: Implement search */
        },
      },
      {
        icon: FilterList,
        label: t.actions.filter,
        onClick: () => {
          /* TODO: Implement filter */
        },
      },
    ],
  },
  '/upload': {
    title: t.pages.upload.title,
    mode: 'large',
    subtitle: t.pages.upload.subtitle,
  },
  '/treasure': {
    title: t.pages.treasure.title,
    mode: 'compact',
    logoUrl: '/logo-symbol.png',
    forceLogoUrl: '/logo-symbol.png',
  },
  '/ambassadors': {
    title: t.pages.ambassadors.title,
    mode: 'compact',
  },
  '/home': {
    title: 'Tierra Mädre',
    mode: 'compact',
    logoUrl: '/logo-symbol.png',
    forceLogoUrl: '/logo-symbol.png',
  },
  '/catalog': {
    title: t.pages.catalog.title,
    mode: 'compact',
    showBackButton: true,
  },
  '/calendar': {
    title: t.pages.calendar.title,
    mode: 'compact',
    showBackButton: true,
  },
  '/slides': {
    title: t.pages.slides.title,
    mode: 'compact',
    showBackButton: true,
  },
  '/normalizer': {
    title: t.pages.normalizer.title,
    mode: 'compact',
    showBackButton: true,
  },
  '/receipts': {
    title: t.pages.receipts.title,
    mode: 'compact',
    showBackButton: true,
  },
  '/biblioteca': {
    title: t.pages.library.title,
    mode: 'compact',
    showBackButton: true,
  },
  '/simulator': {
    title: t.pages.simulator.title,
    mode: 'compact',
    showBackButton: true,
  },
  '/product': {
    title: t.pages.gallery.title,
    mode: 'compact',
    showBackButton: true,
  },
  '/cuentas/cotizaciones': {
    title: t.pages.cotizacion.title,
    mode: 'compact',
    showBackButton: true,
  },
  '/cuentas': {
    title: t.pages.accounts.title,
    mode: 'large',
    subtitle: t.pages.accounts.subtitle,
    showBackButton: true,
  },
  '/boveda-secreta': {
    title: t.pages.vault.title,
    mode: 'large',
    subtitle: t.pages.vault.subtitle,
  },
  '/cotizacion': {
    title: t.pages.cotizacion.title,
    mode: 'compact',
    showBackButton: true,
  },
  '/certificate': {
    title: t.pages.certificate.title,
    mode: 'compact',
    showBackButton: true,
  },
  '/admin/analytics': {
    title: 'Analytics Dashboard',
    mode: 'large',
    subtitle: 'Métricas y Business Health Score',
    showBackButton: true,
  },
  '/admin/name-generator': {
    title: 'Generador de Nombres',
    mode: 'large',
    subtitle: 'Nombres únicos para esmeraldas con IA',
    showBackButton: true,
  },
  '/mi-perfil': {
    title: 'Mi Perfil',
    mode: 'large',
    subtitle: 'Tu portafolio y actividad',
    showBackButton: true,
  },
});

export interface IOSLayoutProps {
  children: React.ReactNode;
}

// Detect if already in standalone/PWA mode
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as any).standalone === true;

const IOSLayout: React.FC<IOSLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { t } = useLanguage();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);

  // Fotosíntesis mounts its own top/bottom chrome (FotoTopbar + FotoTabBar),
  // so the shell suppresses the global nav bar there — one top chrome per view.
  const isFotoRoute = location.pathname.startsWith('/admin/fotosintesis');

  // Scopes that fill the viewport width by design opt out of the --maxw content
  // container: dense back-office (Fotosíntesis + Atelier) and the cinematic
  // vault/esmereogénesis (§5.2 "exempt"). Storefront + provider get the centered
  // container (DS3-MIGRATION-PRD §5 Fase 1 decision).
  const isAtelierRoute = location.pathname.startsWith('/admin/products');
  const isCinematicRoute =
    location.pathname.startsWith('/boveda-secreta') ||
    location.pathname.startsWith('/esmereogenesis');
  const isFullWidthScope = isFotoRoute || isAtelierRoute || isCinematicRoute;

  // Providers get their own direct-place bar; everyone else gets the storefront
  // bar. Selection is by permission (not path), same as the old IOSTabBar.
  const isProvider = useIsProvider();

  // Bóveda / Esmereogénesis is a cinematic desktop scope: at ≥ desktop width it
  // hands navigation to its slim left side-nav, so the bottom bar AUTO-HIDES
  // (stays mounted, slides off) and reveals on demand — mouse to the bottom
  // edge or keyboard focus. Preserves the old IOSTabBar behavior exactly.
  const isDesktop = useMediaQuery(`(min-width:${layoutBreakpoints.desktop}px)`);
  const barAutoHide =
    isDesktop && location.pathname.startsWith('/esmereogenesis');
  const [barRevealed, setBarRevealed] = useState(false);

  useEffect(() => {
    if (!barAutoHide) {
      setBarRevealed(false);
      return;
    }
    const onMove = (e: MouseEvent) => {
      // Reveal when the pointer nears the bottom edge (matches the old bar).
      setBarRevealed(e.clientY >= window.innerHeight - 100);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [barAutoHide]);

  // Publish the measured height of <main> as --app-main-height so pages can
  // size panes from the real scrollport instead of guessing calc(100vh - N).
  // Imperative (no state) — same pattern as CopilotRail's --copilot-rail-width.
  useEffect(() => {
    const main = mainRef.current;
    if (!main || typeof ResizeObserver === 'undefined') return;
    let lastHeight = -1;
    const publish = () => {
      const height = main.clientHeight;
      if (height !== lastHeight) {
        lastHeight = height;
        document.documentElement.style.setProperty(
          appShell.mainHeightVar,
          `${height}px`,
        );
      }
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(main);
    return () => {
      observer.disconnect();
      // Re-engage the CSS fallback (100dvh) when the shell unmounts.
      document.documentElement.style.removeProperty(appShell.mainHeightVar);
    };
  }, []);

  // Track fullscreen state changes
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const supportsFullscreen =
    typeof document.documentElement.requestFullscreen === 'function' &&
    !isStandalone();

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const pageConfig = useMemo((): PageConfig => {
    const configs = getPageConfigs(t);

    // Check for exact match first
    const exactMatch = configs[location.pathname];
    if (exactMatch) return exactMatch;

    // Check for partial match (e.g., /product/:id)
    const partialMatch = Object.keys(configs).find(
      (key) => location.pathname.startsWith(key) && key !== '/',
    );
    if (partialMatch) return configs[partialMatch];

    // Default config
    return {
      title: 'Tierra Mädre',
      mode: 'compact',
    };
  }, [location.pathname, t, isLight]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        overflow: 'hidden',
        // Fallback for browsers without dvh support
        '@supports not (height: 100dvh)': {
          height: '100vh',
        },
        backgroundColor: 'var(--surface-primary)',
        // Copilot rail push: the docked rail sets this var; nav bar + main shift
        // left so the fixed rail fills the gap. 0 when closed/overlay/off-route.
        paddingRight: 'var(--copilot-rail-width, 0px)',
        transition: 'padding-right 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
        },
      }}
    >
      {/* Skip to content link - WCAG 2.4.1 Bypass Blocks */}
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: 'absolute',
          top: -9999,
          left: 0,
          zIndex: zIndex.modal,
          bgcolor: 'var(--surface-primary)',
          color: 'text.primary',
          px: 3,
          py: 1.5,
          fontWeight: 600,
          fontSize: '0.875rem',
          textDecoration: 'none',
          borderRadius: '0 0 8px 0',
          boxShadow: defaultShadows.sm,
          '&:focus-visible': {
            top: 0,
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: -2,
          },
        }}
      >
        Saltar al contenido principal
      </Box>

      {/* Restores <main> scroll on back/forward and resets to top on new nav */}
      <ScrollRestoration />

      {/* Invitation countdown banner - shows for invited guests */}
      <InvitationBanner />

      {/* Suppressed on Fotosíntesis: FotoTopbar is the sole top chrome there. */}
      {!isFotoRoute && (
        <IOSNavigationBar
          mode={pageConfig.mode}
          title={pageConfig.title}
          subtitle={pageConfig.subtitle}
          logoUrl={
            pageConfig.forceLogoUrl ||
            (pageConfig.logoUrl
              ? isLight
                ? '/logo-symbol.png'
                : '/logo-symbol-white.png'
              : undefined)
          }
          showBackButton={pageConfig.showBackButton}
          leadingActions={pageConfig.leadingActions}
          trailingActions={pageConfig.trailingActions}
          trailingElement={
            supportsFullscreen ? (
              <IconButton
                onClick={toggleFullscreen}
                aria-label={
                  isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'
                }
                size="small"
                sx={{
                  ...hitSlop(),
                  color: 'var(--brand-primary)',
                  padding: '6px',
                  opacity: 0.7,
                  '&:hover': {
                    opacity: 1,
                    backgroundColor: 'var(--surface-tertiary)',
                  },
                }}
              >
                {isFullscreen ? (
                  <FullscreenExit fontSize="small" />
                ) : (
                  <Fullscreen fontSize="small" />
                )}
              </IconButton>
            ) : undefined
          }
          backgroundColor={pageConfig.backgroundColor}
        />
      )}

      <Box
        component="main"
        id="main-content"
        tabIndex={0}
        ref={mainRef}
        sx={{
          flex: 1,
          minHeight: 0, // Override flexbox implicit min-height: auto so overflowY works
          // Tab bar reservation (appShell.tabBarReserve + safe-area).
          // Fotosíntesis suppresses this global bar and mounts its own FotoTabBar
          // (which reserves its own space in FotosintesisLayout), so don't
          // double-book the reservation on /admin/fotosintesis routes.
          paddingBottom: isFotoRoute
            ? 0
            : bottomBarClearance(appShell.tabBarReserve),
          overflowY: 'auto',
          // <main> scrolls vertically only (DS3 §5.4). Pinning overflow-x to
          // hidden stops the scrollbar-width overcount of .tm-full-bleed
          // (width:100vw) from producing a phantom horizontal scrollbar, and
          // guards against any accidental horizontal overflow in page content.
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          // iOS HIG: Improve scroll performance and touch handling
          position: 'relative',
          isolation: 'isolate', // Create stacking context
          // Smooth scroll lives on <html> ONLY (DS3 §5.4.7) — never on the
          // scroller itself, where it fights imperative scroll restoration
          // (ScrollRestoration writes main.scrollTop directly).
        }}
      >
        {/* Intentional-desktop content container (--maxw), centered. Full-width
            scopes (dense admin + cinematic) are exempt; full-bleed image heroes
            inside a contained route opt out with the .tm-full-bleed class. */}
        {isFullWidthScope ? (
          children
        ) : (
          <Box
            sx={{
              maxWidth: 'var(--maxw)',
              mx: 'auto',
              width: '100%',
              // DS3 §3.1 edge padding: 16 phone · 24 tablet · 32 desktop.
              px: { xs: 2, sm: 3, md: 4 },
            }}
          >
            {children}
          </Box>
        )}
      </Box>

      {/* One unified TabBar (DS v3). Fotosíntesis renders its own via
          FotosintesisLayout, so the shell suppresses this bar on Foto routes.
          The wrapper owns the vault auto-hide reveal-on-focus (React re-bubbles
          the portaled bar's focus events to this React ancestor). */}
      {!isFotoRoute && (
        <Box
          onFocus={() => barAutoHide && setBarRevealed(true)}
          onBlur={() => barAutoHide && setBarRevealed(false)}
          sx={{ display: 'contents' }}
        >
          <TabBar
            slots={isProvider ? PROVIDER_SLOTS : STOREFRONT_SLOTS}
            theme={storefrontTabTheme(mode)}
            onAction={() => setMoreSheetOpen(true)}
            actionOpen={moreSheetOpen}
            hidden={barAutoHide && !barRevealed}
          />
        </Box>
      )}

      <IOSMoreSheet
        open={moreSheetOpen}
        onClose={() => setMoreSheetOpen(false)}
        onOpenSettings={() => setSettingsSheetOpen(true)}
      />
      <IOSSettingsSheet
        open={settingsSheetOpen}
        onClose={() => setSettingsSheetOpen(false)}
      />

      {/* Fotosynthia copilot rail — gates itself to staff + back-office routes. */}
      <CopilotRail />
    </Box>
  );
};

export default IOSLayout;
