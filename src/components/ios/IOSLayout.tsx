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
import { Search, Add, FilterList, Settings } from '@mui/icons-material';

import IOSTabBar from './IOSTabBar';
import IOSNavigationBar, { NavigationBarMode, NavigationAction } from './IOSNavigationBar';
import IOSMoreSheet from './IOSMoreSheet';
import IOSSettingsSheet from './IOSSettingsSheet';
import { spacing } from '../../design-system/tokens/primitives/spacing';
import { useLanguage } from '../../contexts/LanguageContext';

interface PageConfig {
  title: string;
  mode: NavigationBarMode;
  subtitle?: string;
  showBackButton?: boolean;
  leadingActions?: NavigationAction[];
  trailingActions?: NavigationAction[];
}

const getPageConfigs = (t: any, setSettingsSheetOpen: (open: boolean) => void): Record<string, PageConfig> => ({
  '/gallery': {
    title: t.pages.gallery.title,
    mode: 'large',
    subtitle: t.pages.gallery.subtitle,
    trailingActions: [
      {
        icon: Settings,
        label: t.settings.theme,
        onClick: () => setSettingsSheetOpen(true),
      },
      {
        icon: Search,
        label: t.actions.search,
        onClick: () => console.log('Search'),
      },
      {
        icon: FilterList,
        label: t.actions.filter,
        onClick: () => console.log('Filter'),
      },
    ],
  },
  '/upload': {
    title: t.pages.upload.title,
    mode: 'large',
    subtitle: t.pages.upload.subtitle,
  },
  '/inventory': {
    title: t.pages.inventory.title,
    mode: 'large',
    subtitle: t.pages.inventory.subtitle,
    trailingActions: [
      {
        icon: Add,
        label: t.actions.add,
        onClick: () => console.log('Add'),
      },
    ],
  },
  '/ambassadors': {
    title: t.pages.ambassadors.title,
    mode: 'large',
    subtitle: t.pages.ambassadors.subtitle,
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
});

export interface IOSLayoutProps {
  children: React.ReactNode;
}

const IOSLayout: React.FC<IOSLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { t } = useLanguage();
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);

  const pageConfig = useMemo((): PageConfig => {
    const configs = getPageConfigs(t, setSettingsSheetOpen);

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
      title: 'Tierra Madre',
      mode: 'compact',
    };
  }, [location.pathname, t, setSettingsSheetOpen]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: 'var(--surface-primary)',
      }}
    >
      <IOSNavigationBar
        mode={pageConfig.mode}
        title={pageConfig.title}
        subtitle={pageConfig.subtitle}
        showBackButton={pageConfig.showBackButton}
        leadingActions={pageConfig.leadingActions}
        trailingActions={pageConfig.trailingActions}
      />

      <Box
        component="main"
        sx={{
          flex: 1,
          paddingBottom: `calc(65px + env(safe-area-inset-bottom) + ${spacing.md})`,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {children}
      </Box>

      <IOSTabBar onMoreClick={() => setMoreSheetOpen(true)} />

      <IOSMoreSheet open={moreSheetOpen} onClose={() => setMoreSheetOpen(false)} />
      <IOSSettingsSheet open={settingsSheetOpen} onClose={() => setSettingsSheetOpen(false)} />
    </Box>
  );
};

export default IOSLayout;
