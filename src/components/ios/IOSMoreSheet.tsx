/**
 * IOSMoreSheet Component
 *
 * Bottom sheet modal for secondary tools
 * - 7 tools with color-coded icons
 * - Spring animation
 * - Backdrop dismiss
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, Backdrop } from '@mui/material';
import {
  Close,
  PhotoLibrary,
  CloudUpload,
  People,
  MenuBook,
  CalendarMonth,
  Slideshow,
  AutoFixHigh,
  Receipt,
  Calculate,
  Verified,
  RequestQuote,
} from '@mui/icons-material';

import { spacing } from '../../design-system/tokens/primitives/spacing';
import { primitiveColors } from '../../design-system/tokens/primitives/colors';
import { useLanguage } from '../../contexts/LanguageContext';

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
    id: 'gallery',
    label: t.tools.gallery.label,
    subtitle: t.tools.gallery.subtitle,
    icon: PhotoLibrary,
    route: '/gallery',
    color: primitiveColors.emerald[500],
  },
  {
    id: 'upload',
    label: t.tools.upload.label,
    subtitle: t.tools.upload.subtitle,
    icon: CloudUpload,
    route: '/upload',
    color: '#2196F3',
  },
  {
    id: 'ambassadors',
    label: t.tools.ambassadors.label,
    subtitle: t.tools.ambassadors.subtitle,
    icon: People,
    route: '/ambassadors',
    color: '#9C27B0',
  },
  {
    id: 'catalog',
    label: t.tools.catalog.label,
    subtitle: t.tools.catalog.subtitle,
    icon: MenuBook,
    route: '/catalog',
    color: '#FF5722',
  },
  {
    id: 'calendar',
    label: t.tools.calendar.label,
    subtitle: t.tools.calendar.subtitle,
    icon: CalendarMonth,
    route: '/calendar',
    color: '#E91E63',
  },
  {
    id: 'slides',
    label: t.tools.slides.label,
    subtitle: t.tools.slides.subtitle,
    icon: Slideshow,
    route: '/slides',
    color: '#FF9800',
  },
  {
    id: 'normalizer',
    label: t.tools.normalizer.label,
    subtitle: t.tools.normalizer.subtitle,
    icon: AutoFixHigh,
    route: '/normalizer',
    color: '#4CAF50',
  },
  {
    id: 'receipts',
    label: t.tools.receipts.label,
    subtitle: t.tools.receipts.subtitle,
    icon: Receipt,
    route: '/receipts',
    color: '#00BCD4',
  },
  {
    id: 'simulator',
    label: t.tools.simulator.label,
    subtitle: t.tools.simulator.subtitle,
    icon: Calculate,
    route: '/simulator',
    color: '#3F51B5',
  },
  {
    id: 'certificate',
    label: t.tools.certificate.label,
    subtitle: t.tools.certificate.subtitle,
    icon: Verified,
    route: '/certificate',
    color: '#D4AF37', // Gold from design system
  },
  {
    id: 'cotizacion',
    label: t.tools.cotizacion.label,
    subtitle: t.tools.cotizacion.subtitle,
    icon: RequestQuote,
    route: '/cotizacion',
    color: '#7C3AED', // Purple - distinct from other tools
  },
];

export interface IOSMoreSheetProps {
  open: boolean;
  onClose: () => void;
}

const IOSMoreSheet: React.FC<IOSMoreSheetProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const MORE_TOOLS = getMoreTools(t);

  const handleToolClick = (tool: MoreToolConfig) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    navigate(tool.route);
    onClose();
  };

  return (
    <>
      <Backdrop
        open={open}
        onClick={onClose}
        sx={{
          zIndex: 1100,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(10px)',
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
          backgroundColor: 'var(--surface-secondary)',
          borderTopLeftRadius: spacing.lg,
          borderTopRightRadius: spacing.lg,
          boxShadow: 'var(--shadow-lg)',
          maxHeight: '85vh',
          overflowY: 'auto',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.4s cubic-bezier(0.5, 1.25, 0.75, 1.25)',
          paddingBottom: 'env(safe-area-inset-bottom)',
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
            paddingBottom: spacing.xs,
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
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography
              variant="h2"
              sx={{
                fontSize: '22px',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              {t.nav.tools}
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
        </Box>

        {/* Tools Grid */}
        <Box sx={{ padding: spacing.md, display: 'grid', gap: spacing.xs }}>
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
                  transition: 'all 0.2s ease',

                  '&:hover': { backgroundColor: 'var(--surface-tertiary)' },
                  '&:active': { transform: 'scale(0.98)' },
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
    </>
  );
};

export default IOSMoreSheet;
