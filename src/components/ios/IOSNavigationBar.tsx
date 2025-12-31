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
import { spacing } from '../../design-system/tokens/primitives/spacing';
import { easingCurves, durations } from '../../design-system/tokens/primitives/motion';
import { dynamicBlur, liquidSaturation, specularHighlights } from '../../design-system/tokens/liquid-glass';
import { useLiquidGlassSafe } from '../../contexts/LiquidGlassContext';
import { useIsScrolled } from '../../hooks/useScrollShrink';

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

  // Liquid Glass styles based on scroll state - Apple HIG compliant
  const liquidGlassStyles = useMemo(() => {
    if (!effectiveConfig.blur) {
      return {
        backgroundColor: 'var(--surface-primary)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
      };
    }

    const blurValue = isScrolled ? dynamicBlur.hover : dynamicBlur.resting;

    return {
      backgroundColor: 'rgba(var(--surface-primary-rgb), 0.85)',
      backdropFilter: `blur(${blurValue}) saturate(${liquidSaturation.vibrant})`,
      WebkitBackdropFilter: `blur(${blurValue}) saturate(${liquidSaturation.vibrant})`,
    };
  }, [effectiveConfig.blur, isScrolled]);

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
        zIndex: 999,
        ...liquidGlassStyles,
        borderBottom: '0.5px solid var(--border-default)',
        boxShadow: isScrolled ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transition: effectiveConfig.animations
          ? `all ${durations.liquidNormal} ${easingCurves.liquidInOut}`
          : 'none',
        transform: 'translateZ(0)',
        willChange: effectiveConfig.animations ? 'backdrop-filter, box-shadow' : 'auto',
        ...specularStyles,

        '@supports not (backdrop-filter: blur(10px))': {
          backgroundColor: 'var(--surface-primary)',
        },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
        },
      }}
    >
      {/* Top Bar */}
      <Box
        sx={{
          height: '52px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingX: spacing.sm,
          paddingTop: `calc(env(safe-area-inset-top) + 8px)`,
          paddingBottom: '4px',
        }}
      >
        {/* Leading Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: spacing.xxs, flex: 1 }}>
          {showBackButton && (
            <IconButton
              onClick={handleBackClick}
              aria-label="Go back"
              sx={{
                color: 'var(--brand-primary)',
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
                  color: 'var(--brand-primary)',
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
          <Box sx={{ flex: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {logoUrl ? (
              <Box
                component="img"
                src={logoUrl}
                alt={title}
                sx={{
                  height: 55,
                  objectFit: 'contain',
                }}
              />
            ) : (
              <Typography
                variant="h6"
                sx={{
                  fontSize: '17px',
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: spacing.xxs, justifyContent: 'flex-end', flex: 1 }}>
          {trailingElement}
          {trailingActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <IconButton
                key={index}
                onClick={action.onClick}
                aria-label={action.label}
                sx={{
                  color: 'var(--brand-primary)',
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
        <Box sx={{ paddingX: spacing.md, paddingBottom: spacing.sm, paddingTop: spacing.xs }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: '34px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.5px',
              lineHeight: 1.1,
            }}
          >
            {title}
          </Typography>

          {subtitle && (
            <Typography
              variant="body2"
              sx={{
                fontSize: '15px',
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
