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
import { Search, Add, FilterList } from '@mui/icons-material';

import IOSTabBar from './IOSTabBar';
import IOSNavigationBar, { NavigationBarMode, NavigationAction } from './IOSNavigationBar';
import IOSMoreSheet from './IOSMoreSheet';
import { spacing } from '../../design-system/tokens/primitives/spacing';

interface PageConfig {
  title: string;
  mode: NavigationBarMode;
  subtitle?: string;
  showBackButton?: boolean;
  leadingActions?: NavigationAction[];
  trailingActions?: NavigationAction[];
}

const PAGE_CONFIGS: Record<string, PageConfig> = {
  '/gallery': {
    title: 'Gallery',
    mode: 'large',
    subtitle: 'Colombian Emeralds',
    trailingActions: [
      {
        icon: Search,
        label: 'Search',
        onClick: () => console.log('Search'),
      },
      {
        icon: FilterList,
        label: 'Filter',
        onClick: () => console.log('Filter'),
      },
    ],
  },
  '/upload': {
    title: 'Upload',
    mode: 'large',
    subtitle: 'Add emeralds',
  },
  '/inventory': {
    title: 'Inventory',
    mode: 'large',
    subtitle: 'Manage collection',
    trailingActions: [
      {
        icon: Add,
        label: 'Add',
        onClick: () => console.log('Add'),
      },
    ],
  },
  '/ambassadors': {
    title: 'Ambassadors',
    mode: 'large',
    subtitle: 'Community leaders',
  },
  '/catalog': {
    title: 'Catalog',
    mode: 'compact',
    showBackButton: true,
  },
  '/calendar': {
    title: 'Calendar',
    mode: 'compact',
    showBackButton: true,
  },
  '/slides': {
    title: 'Slides',
    mode: 'compact',
    showBackButton: true,
  },
  '/normalizer': {
    title: 'Normalizer',
    mode: 'compact',
    showBackButton: true,
  },
  '/receipts': {
    title: 'Receipts',
    mode: 'compact',
    showBackButton: true,
  },
  '/biblioteca': {
    title: 'Library',
    mode: 'compact',
    showBackButton: true,
  },
  '/simulator': {
    title: 'Simulator',
    mode: 'compact',
    showBackButton: true,
  },
  '/product': {
    title: 'Product',
    mode: 'compact',
    showBackButton: true,
  },
};

export interface IOSLayoutProps {
  children: React.ReactNode;
}

const IOSLayout: React.FC<IOSLayoutProps> = ({ children }) => {
  const location = useLocation();
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  const pageConfig = useMemo((): PageConfig => {
    // Check for exact match first
    const exactMatch = PAGE_CONFIGS[location.pathname];
    if (exactMatch) return exactMatch;

    // Check for partial match (e.g., /product/:id)
    const partialMatch = Object.keys(PAGE_CONFIGS).find(key =>
      location.pathname.startsWith(key) && key !== '/'
    );
    if (partialMatch) return PAGE_CONFIGS[partialMatch];

    // Default config
    return {
      title: 'Tierra Madre',
      mode: 'compact',
    };
  }, [location.pathname]);

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
          paddingBottom: `calc(49px + env(safe-area-inset-bottom) + ${spacing.md})`,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {children}
      </Box>

      <IOSTabBar onMoreClick={() => setMoreSheetOpen(true)} />

      <IOSMoreSheet open={moreSheetOpen} onClose={() => setMoreSheetOpen(false)} />
    </Box>
  );
};

export default IOSLayout;
