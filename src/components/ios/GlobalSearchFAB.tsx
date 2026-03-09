/**
 * GlobalSearchFAB - Floating Action Button for Global Search
 *
 * Purpose:
 * - Accessible from all pages in the app
 * - Opens search modal with filters
 * - Elegant iOS-style design
 * - Spring animations
 *
 * UX Principles (MOKSART):
 * - Reduce friction: One tap to search from anywhere
 * - Clear affordance: Obvious search icon
 * - Contextual awareness: Hides on search-heavy pages
 * - Accessibility: WCAG AA compliant
 */

import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Fab,
  Tooltip,
  Backdrop,
  Typography,
  IconButton,
  Zoom,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Search, X } from 'lucide-react';
import MoreSheetSearch from './MoreSheetSearch';

import { floatingLayers, liquidSaturation } from '../../design-system/tokens/liquid-glass';
import { floatingLayerShadows } from '../../design-system/tokens/shadows';
import { cssTransition, blurValues, primitiveColors, primitiveSpacing as spacing, easingCurves, durations, zIndex } from '../../design-system';
import { useLiquidGlassSafe } from '../../contexts/LiquidGlassContext';

// Pages where FAB should be hidden (already have prominent search or not relevant)
const HIDDEN_PAGES = [
  '/treasure',     // Already has search in filters
  '/ambassadors',  // Ambassadors page searches asesores, not treasures
];

interface GlobalSearchFABProps {
  /** Override visibility (for testing or special cases) */
  forceShow?: boolean;
}

const GlobalSearchFAB: React.FC<GlobalSearchFABProps> = ({ forceShow = false }) => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { effectiveConfig } = useLiquidGlassSafe();

  const [modalOpen, setModalOpen] = useState(false);

  // Determine if FAB should be shown on current page
  const shouldShow = forceShow || !HIDDEN_PAGES.some(page => location.pathname.startsWith(page));

  // Liquid Glass styles for modal
  const modalStyles = React.useMemo(() => {
    if (!effectiveConfig.blur) {
      return {
        backgroundColor: 'var(--surface-secondary)',
        backdropFilter: 'none',
        boxShadow: 'var(--shadow-xl)',
      };
    }

    const layer = floatingLayers.overlay;

    return {
      backgroundColor: 'rgba(var(--surface-secondary-rgb), 0.9)',
      backdropFilter: `blur(${layer.blur}) saturate(${liquidSaturation.intense})`,
      WebkitBackdropFilter: `blur(${layer.blur}) saturate(${liquidSaturation.intense})`,
      boxShadow: floatingLayerShadows.overlay,
    };
  }, [effectiveConfig.blur]);

  const handleOpen = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    setModalOpen(true);
  };

  const handleClose = () => {
    setModalOpen(false);
  };

  if (!shouldShow) {
    return null;
  }

  return (
    <>
      {/* FAB Button */}
      <Zoom in timeout={300}>
        <Tooltip title="Buscar tesoros" placement="left" arrow>
          <Fab
            color="primary"
            onClick={handleOpen}
            aria-label="Abrir búsqueda global"
            sx={{
              position: 'fixed',
              bottom: {
                xs: 'calc(65px + env(safe-area-inset-bottom) + 16px)', // Above tab bar on mobile
                md: 24,
              },
              right: 24,
              zIndex: zIndex.float,
              bgcolor: primitiveColors.emerald[500],
              color: 'white',
              width: 56,
              height: 56,
              transition: effectiveConfig.animations
                ? `all ${durations.liquidFast} ${easingCurves.liquidSpring}`
                : cssTransition.default,
              boxShadow: `0 8px 24px ${primitiveColors.emerald[500]}40`,

              '&:hover': {
                bgcolor: primitiveColors.emerald[600],
                transform: effectiveConfig.animations ? 'scale(1.08)' : 'scale(1.05)',
                boxShadow: `0 12px 32px ${primitiveColors.emerald[500]}60`,
              },

              '&:active': {
                transform: effectiveConfig.animations ? 'scale(0.95)' : 'scale(0.98)',
              },

              // Emerald glow effect
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: -2,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${primitiveColors.emerald[400]}, ${primitiveColors.emerald[600]})`,
                opacity: 0,
                transition: `opacity ${durations.liquidFast} ease`,
              },

              '&:hover::before': {
                opacity: 0.3,
              },

              '@media (prefers-reduced-motion: reduce)': {
                transition: cssTransition.default,
                '&:hover': {
                  transform: 'none',
                },
              },
            }}
          >
            <Search size={24} strokeWidth={2.5} />
          </Fab>
        </Tooltip>
      </Zoom>

      {/* Modal Backdrop */}
      <Backdrop
        open={modalOpen}
        onClick={handleClose}
        sx={{
          zIndex: zIndex.sheet,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: effectiveConfig.blur ? `blur(${blurValues.xl})` : 'none',
          WebkitBackdropFilter: effectiveConfig.blur ? `blur(${blurValues.xl})` : 'none',
          transition: effectiveConfig.animations
            ? `opacity ${durations.liquidNormal} ${easingCurves.liquidInOut}`
            : cssTransition.slow,
        }}
      />

      {/* Search Modal */}
      <Box
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-search-title"
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: isMobile ? 0 : 'auto',
          zIndex: zIndex.sheetContent,
          display: modalOpen ? 'flex' : 'none',
          flexDirection: 'column',
          maxHeight: isMobile ? '100vh' : '90vh',
          maxWidth: isMobile ? '100%' : 600,
          mx: isMobile ? 0 : 'auto',
          mt: isMobile ? 0 : '5vh',
          ...modalStyles,
          borderRadius: isMobile ? 0 : spacing.lg,
          overflow: 'hidden',
          transform: modalOpen ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.95)',
          opacity: modalOpen ? 1 : 0,
          transition: effectiveConfig.animations
            ? `all ${durations.liquidNormal} ${easingCurves.liquidSpring}`
            : cssTransition.slow,
          pointerEvents: modalOpen ? 'auto' : 'none',

          '@supports not (backdrop-filter: blur(10px))': {
            backgroundColor: 'var(--surface-secondary)',
          },

          '@media (prefers-reduced-motion: reduce)': {
            transition: cssTransition.default,
            transform: 'none',
          },
        }}
      >
        {/* Modal Header */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            backgroundColor: 'var(--surface-secondary)',
            zIndex: zIndex.base,
            paddingTop: isMobile ? 'env(safe-area-inset-top)' : spacing.md,
            paddingX: spacing.md,
            paddingBottom: spacing.sm,
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          {/* iOS-style handle (mobile only) */}
          {isMobile && (
            <Box
              sx={{
                width: 36,
                height: 5,
                backgroundColor: 'var(--border-default)',
                borderRadius: 2.5,
                margin: '0 auto',
                marginBottom: spacing.sm,
              }}
            />
          )}

          {/* Title and Close */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1.5,
                  backgroundColor: `${primitiveColors.emerald[500]}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Search size={18} color={primitiveColors.emerald[600]} />
              </Box>
              <Typography
                id="global-search-title"
                variant="h2"
                sx={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}
              >
                Buscar Tesoros
              </Typography>
            </Box>

            <IconButton
              onClick={handleClose}
              aria-label="Cerrar búsqueda"
              sx={{
                color: 'var(--text-secondary)',
                '&:hover': {
                  backgroundColor: 'var(--surface-tertiary)',
                },
              }}
            >
              <X size={20} />
            </IconButton>
          </Box>
        </Box>

        {/* Search Content */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            padding: spacing.md,
            paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : spacing.md,
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <MoreSheetSearch onClose={handleClose} />
        </Box>
      </Box>
    </>
  );
};

export default GlobalSearchFAB;
