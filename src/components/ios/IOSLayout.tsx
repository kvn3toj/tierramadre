/**
 * IOSLayout Component
 *
 * Main navigation container
 * - Orchestrates TabBar, NavigationBar, and MoreSheet
 * - Page config system for route-specific settings
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, IconButton } from '@mui/material';
import { Search, FilterList, Fullscreen, FullscreenExit } from '@mui/icons-material';

import IOSTabBar from './IOSTabBar';
import IOSNavigationBar, { NavigationBarMode, NavigationAction } from './IOSNavigationBar';
import IOSMoreSheet from './IOSMoreSheet';
import IOSSettingsSheet from './IOSSettingsSheet';
import { InvitationBanner } from '../invitation';
import { primitiveSpacing as spacing, zIndex, defaultShadows } from '../../design-system';
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

const DARK_HEADER_GRADIENT = [
  'linear-gradient(to right, transparent 20%, rgba(0, 174, 122, 0.12) 50%, transparent 80%)',
  'linear-gradient(to right, #050505 0%, #0d1a14 30%, #0d1a14 70%, #050505 100%)',
].join(', ');

const LIGHT_HEADER_GRADIENT = [
  'linear-gradient(to right, rgba(0, 174, 122, 0.02) 10%, transparent 40%, transparent 60%, rgba(0, 174, 122, 0.02) 90%)',
  'linear-gradient(to right, #fafdfb 0%, #ffffff 15%, #ffffff 85%, #fafdfb 100%)',
].join(', ');

const getPageConfigs = (t: any, isLight: boolean): Record<string, PageConfig> => ({
  '/gallery': {
    title: t.pages.gallery.title,
    mode: 'large',
    subtitle: t.pages.gallery.subtitle,
    trailingActions: [
      {
        icon: Search,
        label: t.actions.search,
        onClick: () => { /* TODO: Implement search */ },
      },
      {
        icon: FilterList,
        label: t.actions.filter,
        onClick: () => { /* TODO: Implement filter */ },
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
    logoUrl: '/images/logo-horizontal-green.png',
    backgroundColor: isLight ? LIGHT_HEADER_GRADIENT : DARK_HEADER_GRADIENT,
    forceLogoUrl: '/images/logo-horizontal-green.png',
  },
  '/ambassadors': {
    title: t.pages.ambassadors.title,
    mode: 'large',
  },
  '/home': {
    title: 'Tierra Mädre',
    mode: 'compact',
    logoUrl: '/images/logo-horizontal-green.png',
    backgroundColor: isLight ? LIGHT_HEADER_GRADIENT : DARK_HEADER_GRADIENT,
    forceLogoUrl: '/images/logo-horizontal-green.png',
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

  // Track fullscreen state changes
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const supportsFullscreen = typeof document.documentElement.requestFullscreen === 'function' && !isStandalone();

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const pageConfig = useMemo((): PageConfig => {
    const configs = getPageConfigs(t, isLight);

    // Check for exact match first
    const exactMatch = configs[location.pathname];
    if (exactMatch) return exactMatch;

    // Check for partial match (e.g., /product/:id)
    const partialMatch = Object.keys(configs).find(key =>
      location.pathname.startsWith(key) && key !== '/'
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

      {/* Invitation countdown banner - shows for invited guests */}
      <InvitationBanner />

      <IOSNavigationBar
        mode={pageConfig.mode}
        title={pageConfig.title}
        subtitle={pageConfig.subtitle}
        logoUrl={pageConfig.forceLogoUrl || (pageConfig.logoUrl ? (isLight ? '/images/logo-horizontal-dark.png' : '/images/logo-horizontal-white.png') : undefined)}
        showBackButton={pageConfig.showBackButton}
        leadingActions={pageConfig.leadingActions}
        trailingActions={pageConfig.trailingActions}
        trailingElement={supportsFullscreen ? (
          <IconButton
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            size="small"
            sx={{
              color: 'var(--brand-primary)',
              padding: '6px',
              opacity: 0.7,
              '&:hover': { opacity: 1, backgroundColor: 'var(--surface-tertiary)' },
            }}
          >
            {isFullscreen ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
          </IconButton>
        ) : undefined}
        backgroundColor={pageConfig.backgroundColor}
      />

      <Box
        component="main"
        id="main-content"
        tabIndex={0}
        sx={{
          flex: 1,
          minHeight: 0, // Override flexbox implicit min-height: auto so overflowY works
          paddingBottom: `calc(65px + env(safe-area-inset-bottom) + ${spacing.md})`,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          // iOS HIG: Improve scroll performance and touch handling
          position: 'relative',
          isolation: 'isolate', // Create stacking context
          // iOS HIG: Ensure smooth scroll momentum
          scrollBehavior: 'smooth',
          '@media (prefers-reduced-motion: reduce)': {
            scrollBehavior: 'auto',
          },
        }}
      >
        {children}
      </Box>

      <IOSTabBar onMoreClick={() => setMoreSheetOpen(true)} />

      <IOSMoreSheet
        open={moreSheetOpen}
        onClose={() => setMoreSheetOpen(false)}
        onOpenSettings={() => setSettingsSheetOpen(true)}
      />
      <IOSSettingsSheet open={settingsSheetOpen} onClose={() => setSettingsSheetOpen(false)} />
    </Box>
  );
};

export default IOSLayout;
