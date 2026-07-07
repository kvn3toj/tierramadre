/**
 * IOSNavigationBar Component
 *
 * iOS HIG-compliant top navigation bar
 * - Compact mode (44px) for standard pages
 * - Large mode (dynamic height) for main pages
 * - Context-aware titles and actions
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { specularHighlights } from '../../design-system/tokens/liquid-glass';
import { useLiquidGlassSafe } from '../../contexts/LiquidGlassContext';
import { useIsScrolled } from '../../hooks/useScrollShrink';
import {
  iosTypographyScale,
  primitiveSpacing as spacing,
  easingCurves,
  durations,
  zIndex,
  qeFont,
} from '../../design-system';

export type NavigationBarMode = 'compact' | 'large';

export interface NavigationAction {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}

export interface IOSNavigationBarProps {
  mode?: NavigationBarMode;
  title: string;
  subtitle?: string;
  logoUrl?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  leadingActions?: NavigationAction[];
  trailingActions?: NavigationAction[];
  /** Custom trailing element (e.g., LevelBadge) */
  trailingElement?: React.ReactNode;
  /** Override background color (e.g., brand green for home) */
  backgroundColor?: string;
}

const IOSNavigationBar: React.FC<IOSNavigationBarProps> = ({
  mode = 'compact',
  title,
  subtitle,
  logoUrl,
  showBackButton = false,
  onBackClick,
  leadingActions = [],
  trailingActions = [],
  trailingElement,
  backgroundColor,
}) => {
  const navigate = useNavigate();
  const { effectiveConfig } = useLiquidGlassSafe();
  const isScrolled = useIsScrolled(20);

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      navigate(-1);
    }
  };

  const isLargeMode = mode === 'large';
  const iconColor = 'var(--brand-primary)';

  // Liquid Glass styles based on scroll state - Apple HIG compliant
  const liquidGlassStyles = useMemo(() => {
    if (backgroundColor) {
      const isGradient = backgroundColor.includes('gradient');
      return {
        ...(isGradient ? { background: backgroundColor } : { backgroundColor }),
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
      };
    }
    // Quiet Emerald: flat editorial header — solid surface, no blur.
    return {
      backgroundColor: 'var(--surface-primary)',
      backdropFilter: 'none',
      WebkitBackdropFilter: 'none',
    };
  }, [backgroundColor]);

  // Specular highlight on bottom edge
  const specularStyles = useMemo(() => {
    if (!effectiveConfig.specular) return {};

    return {
      '&::after': {
        content: '""',
        position: 'absolute',
        bottom: 0,
        left: '10%',
        right: '10%',
        height: '1px',
        background: specularHighlights.gradients.subtle,
        opacity: isScrolled ? 0.8 : 0.4,
        transition: `opacity ${durations.liquidFast} ${easingCurves.liquidIn}`,
      },
    };
  }, [effectiveConfig.specular, isScrolled]);

  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        zIndex: zIndex.nav,
        ...liquidGlassStyles,
        borderBottom: backgroundColor
          ? backgroundColor.includes('gradient')
            ? '0.5px solid rgba(0, 174, 122, 0.15)'
            : 'none'
          : '0.5px solid var(--border-default)',
        boxShadow: isScrolled ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transition: effectiveConfig.animations
          ? `all ${durations.liquidNormal} ${easingCurves.liquidInOut}`
          : 'none',
        transform: 'translateZ(0)',
        willChange: effectiveConfig.animations
          ? 'backdrop-filter, box-shadow'
          : 'auto',
        ...specularStyles,

        '@supports not (backdrop-filter: blur(10px))': {
          ...(backgroundColor?.includes('gradient')
            ? { background: backgroundColor }
            : { backgroundColor: backgroundColor || 'var(--surface-primary)' }),
        },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
        },
      }}
    >
      {/* Top Bar */}
      <Box
        sx={{
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingX: spacing.sm,
          paddingTop: `env(safe-area-inset-top)`,
          paddingBottom: '2px',
        }}
      >
        {/* Leading Section */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.xxs,
            flex: 1,
          }}
        >
          {showBackButton && (
            <IconButton
              onClick={handleBackClick}
              aria-label="Go back"
              sx={{
                color: iconColor,
                padding: spacing.xxs,
                '&:hover': { backgroundColor: 'var(--surface-tertiary)' },
              }}
            >
              <ArrowBack />
            </IconButton>
          )}

          {leadingActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <IconButton
                key={index}
                onClick={action.onClick}
                aria-label={action.label}
                sx={{
                  color: iconColor,
                  padding: spacing.xxs,
                  '&:hover': { backgroundColor: 'var(--surface-tertiary)' },
                }}
              >
                <Icon />
              </IconButton>
            );
          })}
        </Box>

        {/* Title or Logo (Compact Mode) */}
        {!isLargeMode && (
          <Box
            sx={{
              flex: 2,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {logoUrl ? (
              <Box
                component="img"
                src={logoUrl}
                alt={title}
                sx={{
                  height: 44,
                  objectFit: 'contain',
                }}
              />
            ) : (
              <Typography
                component="h1"
                variant="h6"
                sx={{
                  fontSize: iosTypographyScale.headline,
                  fontFamily: qeFont.ui,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  textAlign: 'center',
                }}
              >
                {title}
              </Typography>
            )}
          </Box>
        )}

        {/* Trailing Section */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.xxs,
            justifyContent: 'flex-end',
            flex: 1,
          }}
        >
          {trailingElement}
          {trailingActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <IconButton
                key={index}
                onClick={action.onClick}
                aria-label={action.label}
                sx={{
                  color: iconColor,
                  padding: spacing.xxs,
                  '&:hover': { backgroundColor: 'var(--surface-tertiary)' },
                }}
              >
                <Icon />
              </IconButton>
            );
          })}
        </Box>
      </Box>

      {/* Large Title Section */}
      {isLargeMode && (
        <Box
          sx={{
            paddingX: spacing.md,
            paddingBottom: spacing.sm,
            paddingTop: spacing.xs,
          }}
        >
          <Typography
            variant="h1"
            sx={{
              // Quiet Emerald: editorial serif for page titles ("Catálogo")
              fontSize: iosTypographyScale.largeTitle,
              fontFamily: qeFont.serif,
              fontWeight: 500,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
              lineHeight: 1.05,
            }}
          >
            {title}
          </Typography>

          {subtitle && (
            <Typography
              variant="body2"
              sx={{
                fontFamily: qeFont.mono,
                fontSize: '0.6875rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
                marginTop: spacing.xxs,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default IOSNavigationBar;
