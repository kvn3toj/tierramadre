/**
 * Breadcrumbs Component
 * Route-aware breadcrumb navigation.
 * Compact on mobile (parent + current only).
 * Supports overlayMode for rendering on top of images.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Breadcrumbs as MUIBreadcrumbs,
  Typography,
  Link,
  Box,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { ChevronRight } from 'lucide-react';
import { emeraldCore } from '../../design-system/tokens/colors';
import { fontWeights } from '../../design-system';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  /** Render in overlay mode (white text for use on dark image backgrounds) */
  overlayMode?: boolean;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, overlayMode = false }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (items.length < 2) return null;

  // On mobile, show only parent + current
  const displayItems = isMobile ? items.slice(-2) : items;

  return (
    <Box sx={{ px: overlayMode ? 0 : { xs: 2, sm: 3 }, py: overlayMode ? 0 : 1 }}>
      <MUIBreadcrumbs
        separator={<ChevronRight size={12} color={overlayMode ? 'rgba(255,255,255,0.7)' : undefined} />}
        aria-label="Navegacion de ruta"
        sx={{
          '& .MuiBreadcrumbs-separator': {
            mx: 0.5,
            color: overlayMode ? 'rgba(255,255,255,0.7)' : 'text.disabled',
          },
        }}
      >
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;

          if (isLast) {
            return (
              <Typography
                key={item.label}
                variant="caption"
                sx={{
                  fontWeight: fontWeights.semibold,
                  color: overlayMode ? 'rgba(255,255,255,0.95)' : 'text.primary',
                  fontSize: overlayMode ? '0.72rem' : '0.8rem',
                  textShadow: overlayMode ? '0 1px 3px rgba(0,0,0,0.5)' : 'none',
                }}
              >
                {item.label}
              </Typography>
            );
          }

          return (
            <Link
              key={item.label}
              component="button"
              variant="caption"
              underline="hover"
              onClick={() => item.path && navigate(item.path)}
              sx={{
                fontWeight: fontWeights.medium,
                color: overlayMode ? 'rgba(255,255,255,0.85)' : emeraldCore.primary,
                fontSize: overlayMode ? '0.72rem' : '0.8rem',
                cursor: 'pointer',
                minHeight: 36,
                display: 'inline-flex',
                alignItems: 'center',
                textShadow: overlayMode ? '0 1px 3px rgba(0,0,0,0.5)' : 'none',
                '&:hover': { color: overlayMode ? '#fff' : emeraldCore.dark },
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </MUIBreadcrumbs>
    </Box>
  );
};

export default Breadcrumbs;
