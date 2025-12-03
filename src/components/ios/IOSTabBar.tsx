/**
 * IOSTabBar Component
 *
 * iOS HIG-compliant bottom tab bar navigation
 * - 5 primary tabs: Gallery, Upload, Inventory, Ambassadors, More
 * - Badge support for notifications
 * - Haptic feedback on tab change
 * - Safe area insets for modern iOS devices
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import {
  Home,
  Inventory2,
  Storefront,
  MoreHoriz,
} from '@mui/icons-material';

// Design tokens
import { primitiveColors } from '../../design-system/tokens/primitives/colors';
import { spacing } from '../../design-system/tokens/primitives/spacing';
import { useLanguage } from '../../contexts/LanguageContext';

export interface TabConfig {
  id: string;
  label: string;
  icon: React.ElementType;
  route: string;
  badge?: number;
}

const getPrimaryTabs = (t: any): TabConfig[] => [
  {
    id: 'home',
    label: t.nav.home,
    icon: Home,
    route: '/home',
  },
  {
    id: 'inventory',
    label: t.nav.inventory,
    icon: Inventory2,
    route: '/inventory',
  },
  {
    id: 'biblioteca',
    label: 'Show Room',
    icon: Storefront,
    route: '/biblioteca',
  },
  {
    id: 'more',
    label: t.nav.more,
    icon: MoreHoriz,
    route: '/more',
  },
];

export interface IOSTabBarProps {
  onMoreClick?: () => void;
}

const IOSTabBar: React.FC<IOSTabBarProps> = ({ onMoreClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const PRIMARY_TABS = getPrimaryTabs(t);

  const getActiveTab = (): string => {
    const currentPath = location.pathname;
    const matchingTab = PRIMARY_TABS.find(tab =>
      currentPath.startsWith(tab.route) && tab.id !== 'more'
    );

    if (matchingTab) return matchingTab.id;

    const secondaryRoutes = ['/gallery', '/catalog', '/calendar', '/slides', '/normalizer', '/receipts', '/simulator', '/ambassadors', '/upload'];
    const isSecondaryRoute = secondaryRoutes.some(route => currentPath.startsWith(route));

    return isSecondaryRoute ? 'more' : '';
  };

  const activeTab = getActiveTab();

  const handleTabClick = (tab: TabConfig) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    if (tab.id === 'more') {
      if (onMoreClick) onMoreClick();
    } else {
      navigate(tab.route);
    }
  };

  return (
    <Box
      component="nav"
      aria-label="Primary navigation"
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        minHeight: `calc(65px + env(safe-area-inset-bottom))`,
        backgroundColor: 'var(--surface-secondary)',
        borderTop: '0.5px solid var(--border-default)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'stretch',
        paddingTop: spacing.sm,
        paddingBottom: `calc(${spacing.xs} + env(safe-area-inset-bottom))`,
        zIndex: 1000,
        WebkitTransform: 'translateZ(0)',
        transform: 'translateZ(0)',
      }}
    >
      <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-around' }}>
        {PRIMARY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <Box
              key={tab.id}
              role="button"
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              tabIndex={0}
              onClick={() => handleTabClick(tab)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleTabClick(tab);
                }
              }}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                padding: `${spacing.xxs} ${spacing.xs}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minHeight: '44px',
                position: 'relative',

                '&:hover': { opacity: 0.7 },
                '&:active': { transform: 'scale(0.95)' },
                '&:focus-visible': {
                  outline: `2px solid ${primitiveColors.emerald[500]}`,
                  outlineOffset: '2px',
                  borderRadius: spacing.sm,
                },
              }}
            >
              <Box sx={{ position: 'relative', marginBottom: spacing.xxs }}>
                <Icon
                  sx={{
                    fontSize: '24px',
                    color: isActive ? 'var(--brand-primary)' : 'var(--text-tertiary)',
                    transition: 'color 0.2s ease',
                  }}
                />
                {tab.badge && tab.badge > 0 && (
                  <Box
                    aria-label={`${tab.badge} notifications`}
                    sx={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-8px',
                      minWidth: '16px',
                      height: '16px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--status-error)',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 4px',
                      boxShadow: '0 0 0 2px var(--surface-secondary)',
                    }}
                  >
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </Box>
                )}
              </Box>

              <Typography
                variant="caption"
                sx={{
                  fontSize: { xs: '9px', sm: '10px' },
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--brand-primary)' : 'var(--text-tertiary)',
                  transition: 'all 0.2s ease',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                  lineHeight: 1.2,
                  marginTop: spacing.xxs,
                }}
              >
                {tab.label}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default IOSTabBar;
