/**
 * IOSMoreSheet Component
 *
 * Bottom sheet modal for secondary tools
 * - Search bar for inventory
 * - Bóveda Secreta and Cuentas options
 * - Spring animation
 * - Backdrop dismiss
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, Backdrop, Button, TextField, InputAdornment } from '@mui/material';
import { Lock, Close, AccountBalance, Search } from '@mui/icons-material';
import { Vault } from 'lucide-react';

import { spacing } from '../../design-system/tokens/primitives/spacing';
import { primitiveColors } from '../../design-system/tokens/primitives/colors';
import { easingCurves, durations } from '../../design-system/tokens/primitives/motion';
import { floatingLayers, liquidSaturation, specularHighlights } from '../../design-system/tokens/liquid-glass';
import { floatingLayerShadows } from '../../design-system/tokens/shadows';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLiquidGlassSafe } from '../../contexts/LiquidGlassContext';
import { useIsGuest } from '../../hooks/useAuth';
import UnlockPrompt from '../auth/UnlockPrompt';

export interface MoreToolConfig {
  id: string;
  label: string;
  subtitle: string;
  icon: React.ElementType;
  route: string;
  color: string;
}

const getMoreTools = (t: any): MoreToolConfig[] => [
  {
    id: 'vault',
    label: t.tools.vault.label,
    subtitle: t.tools.vault.subtitle,
    icon: Vault as any,
    route: '/boveda-secreta',
    color: '#D4AF37', // Gold
  },
  {
    id: 'accounts',
    label: t.tools.accounts.label,
    subtitle: t.tools.accounts.subtitle,
    icon: AccountBalance,
    route: '/cuentas',
    color: '#3F51B5', // Blue
  },
];

export interface IOSMoreSheetProps {
  open: boolean;
  onClose: () => void;
}

const IOSMoreSheet: React.FC<IOSMoreSheetProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const isGuest = useIsGuest();
  const { effectiveConfig } = useLiquidGlassSafe();
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const MORE_TOOLS = getMoreTools(t);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/inventory?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      onClose();
    }
  };

  // Liquid Glass styles for the sheet
  const sheetStyles = useMemo(() => {
    if (!effectiveConfig.blur) {
      return {
        backgroundColor: 'var(--surface-secondary)',
        backdropFilter: 'none',
        boxShadow: 'var(--shadow-lg)',
      };
    }

    const layer = floatingLayers.overlay;

    return {
      backgroundColor: 'rgba(var(--surface-secondary-rgb), 0.85)',
      backdropFilter: `blur(${layer.blur}) saturate(${liquidSaturation.intense})`,
      WebkitBackdropFilter: `blur(${layer.blur}) saturate(${liquidSaturation.intense})`,
      boxShadow: floatingLayerShadows.overlay,
    };
  }, [effectiveConfig.blur]);

  // Specular highlight for sheet header
  const headerSpecularStyles = useMemo(() => {
    if (!effectiveConfig.specular) return {};

    return {
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: '5%',
        right: '5%',
        height: '1px',
        background: specularHighlights.gradients.subtle,
        borderRadius: '1px',
      },
    };
  }, [effectiveConfig.specular]);

  const handleToolClick = (tool: MoreToolConfig) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    navigate(tool.route);
    onClose();
  };

  const handleUnlockClose = () => {
    setUnlockOpen(false);
    // Check if user is still guest - if not, they upgraded successfully
    // Close the sheet on next tick to allow state to update
    setTimeout(() => {
      onClose();
    }, 100);
  };

  return (
    <>
      <Backdrop
        open={open}
        onClick={onClose}
        sx={{
          zIndex: 1100,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: effectiveConfig.blur ? 'blur(16px)' : 'none',
          WebkitBackdropFilter: effectiveConfig.blur ? 'blur(16px)' : 'none',
          transition: effectiveConfig.animations
            ? `opacity ${durations.liquidNormal} ${easingCurves.liquidInOut}`
            : 'none',
        }}
      />

      <Box
        role="dialog"
        aria-modal="true"
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1101,
          ...sheetStyles,
          borderTopLeftRadius: spacing.lg,
          borderTopRightRadius: spacing.lg,
          maxHeight: '85vh',
          overflowY: 'auto',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: effectiveConfig.animations
            ? `transform ${durations.liquidNormal} ${easingCurves.liquidSpring}`
            : 'transform 0.3s ease-out',
          paddingBottom: 'env(safe-area-inset-bottom)',
          willChange: 'transform',
          ...headerSpecularStyles,

          '@supports not (backdrop-filter: blur(10px))': {
            backgroundColor: 'var(--surface-secondary)',
          },
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'transform 0.2s ease-out',
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            backgroundColor: 'var(--surface-secondary)',
            zIndex: 1,
            paddingTop: spacing.sm,
            paddingX: spacing.md,
            paddingBottom: spacing.sm,
            borderBottom: '0.5px solid var(--border-default)',
          }}
        >
          {/* Handle Bar */}
          <Box
            sx={{
              width: '36px',
              height: '5px',
              backgroundColor: 'var(--border-default)',
              borderRadius: '2.5px',
              margin: '0 auto',
              marginBottom: spacing.sm,
            }}
          />

          {/* Title and Close */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography
              variant="h2"
              sx={{
                fontSize: '22px',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              {t.nav.more}
            </Typography>

            <IconButton
              onClick={onClose}
              aria-label={t.actions.close}
              sx={{
                color: 'var(--text-secondary)',
                '&:hover': { backgroundColor: 'var(--surface-tertiary)' },
              }}
            >
              <Close />
            </IconButton>
          </Box>

          {/* Search Bar */}
          <Box component="form" onSubmit={handleSearch}>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar en inventario..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: 'var(--text-tertiary)', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'var(--surface-primary)',
                  borderRadius: spacing.md,
                  fontSize: '16px',
                  '& fieldset': {
                    borderColor: 'var(--border-default)',
                  },
                  '&:hover fieldset': {
                    borderColor: primitiveColors.emerald[500],
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: primitiveColors.emerald[500],
                    borderWidth: 2,
                  },
                },
                '& .MuiInputBase-input': {
                  padding: '12px 0',
                },
              }}
            />
          </Box>
        </Box>

        {/* Tools Grid */}
        <Box sx={{ position: 'relative', padding: spacing.md }}>
          {/* Blur Overlay for Guest Mode */}
          {isGuest && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                borderRadius: spacing.md,
              }}
            >
              <Lock
                sx={{
                  fontSize: 48,
                  color: primitiveColors.emerald[500],
                  mb: 2,
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  color: 'var(--text-secondary)',
                  mb: 2,
                  textAlign: 'center',
                  px: 3,
                }}
              >
                {t.auth.unlockFeature}
              </Typography>
              <Button
                variant="contained"
                onClick={() => setUnlockOpen(true)}
                startIcon={<Lock />}
                sx={{
                  backgroundColor: primitiveColors.emerald[500],
                  color: 'white',
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                  borderRadius: spacing.md,
                  '&:hover': {
                    backgroundColor: primitiveColors.emerald[600],
                  },
                }}
              >
                {t.auth.accessRequired}
              </Button>
            </Box>
          )}

          {/* Tools List */}
          <Box
            sx={{
              display: 'grid',
              gap: spacing.xs,
              filter: isGuest ? 'blur(6px)' : 'none',
              pointerEvents: isGuest ? 'none' : 'auto',
              transition: 'filter 0.3s ease',
            }}
          >
          {MORE_TOOLS.map((tool) => {
            const Icon = tool.icon;

            return (
              <Box
                key={tool.id}
                role="button"
                aria-label={`${tool.label}: ${tool.subtitle}`}
                tabIndex={0}
                onClick={() => handleToolClick(tool)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleToolClick(tool);
                  }
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: spacing.sm,
                  backgroundColor: 'var(--surface-primary)',
                  borderRadius: spacing.md,
                  cursor: 'pointer',
                  transition: effectiveConfig.animations
                    ? `all ${durations.liquidFast} ${easingCurves.liquidInOut}`
                    : 'none',

                  '&:hover': {
                    backgroundColor: 'var(--surface-tertiary)',
                    transform: effectiveConfig.animations ? 'scale(1.01)' : 'none',
                  },
                  '&:active': {
                    transform: effectiveConfig.animations ? 'scale(0.98)' : 'none',
                  },
                }}
              >
                {/* Icon Container */}
                <Box
                  sx={{
                    width: '44px',
                    height: '44px',
                    borderRadius: spacing.md,
                    backgroundColor: `${tool.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon sx={{ fontSize: '24px', color: tool.color }} />
                </Box>

                {/* Text Content */}
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body1"
                    sx={{
                      fontSize: '17px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: spacing.xxs,
                    }}
                  >
                    {tool.label}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {tool.subtitle}
                  </Typography>
                </Box>

                {/* Chevron */}
                <Box sx={{ color: 'var(--text-quaternary)', fontSize: '20px' }}>›</Box>
              </Box>
            );
          })}
          </Box>
        </Box>
      </Box>

      {/* Unlock Prompt */}
      <UnlockPrompt
        open={unlockOpen}
        onClose={handleUnlockClose}
      />
    </>
  );
};

export default IOSMoreSheet;
