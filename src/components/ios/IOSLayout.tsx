/**
 * IOSLayout Component
 *
 * Main navigation container
 * - Orchestrates TabBar, NavigationBar, and MoreSheet
 * - Page config system for route-specific settings
 */

import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { Search, FilterList } from '@mui/icons-material';

import IOSTabBar from './IOSTabBar';
import IOSNavigationBar, { NavigationBarMode, NavigationAction } from './IOSNavigationBar';
import IOSMoreSheet from './IOSMoreSheet';
import IOSSettingsSheet from './IOSSettingsSheet';
import { InvitationBanner } from '../invitation';
import { spacing } from '../../design-system/tokens/primitives/spacing';
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
    logoUrl: '/logo-horizontal-white.png',
  },
  '/ambassadors': {
    title: t.pages.ambassadors.title,
    mode: 'large',
    subtitle: t.pages.ambassadors.subtitle,
  },
  '/home': {
    title: 'Tierra Mädre',
    mode: 'compact',
    logoUrl: '/logo-horizontal-white.png',
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
  '/admin/changelog': {
    title: 'Changelog',
    mode: 'large',
    subtitle: 'Reporte de Desarrollo',
    showBackButton: true,
  },
});

export interface IOSLayoutProps {
  children: React.ReactNode;
}

const IOSLayout: React.FC<IOSLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { t } = useLanguage();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);

  const pageConfig = useMemo((): PageConfig => {
    const configs = getPageConfigs(t);

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
  }, [location.pathname, t]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: 'var(--surface-primary)',
      }}
    >
      {/* Invitation countdown banner - shows for invited guests */}
      <InvitationBanner />

      <IOSNavigationBar
        mode={pageConfig.mode}
        title={pageConfig.title}
        subtitle={pageConfig.subtitle}
        logoUrl={pageConfig.logoUrl ? (isLight ? '/logo-horizontal-dark.png' : '/logo-horizontal-white.png') : undefined}
        showBackButton={pageConfig.showBackButton}
        leadingActions={pageConfig.leadingActions}
        trailingActions={pageConfig.trailingActions}
        trailingElement={undefined}
      />

      <Box
        component="main"
        sx={{
          flex: 1,
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
