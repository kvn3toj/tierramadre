/**
 * Breadcrumbs Component
 * Route-aware breadcrumb navigation.
 * Compact on mobile (parent + current only).
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
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (items.length < 2) return null;

  // On mobile, show only parent + current
  const displayItems = isMobile ? items.slice(-2) : items;

  return (
    <Box sx={{ px: { xs: 2, sm: 3 }, py: 1 }}>
      <MUIBreadcrumbs
        separator={<ChevronRight size={14} />}
        aria-label="Navegación de ruta"
        sx={{
          '& .MuiBreadcrumbs-separator': {
            mx: 0.5,
            color: 'text.disabled',
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
                  color: 'text.primary',
                  fontSize: '0.8rem',
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
                color: emeraldCore.primary,
                fontSize: '0.8rem',
                cursor: 'pointer',
                minHeight: 44,
                display: 'inline-flex',
                alignItems: 'center',
                '&:hover': { color: emeraldCore.dark },
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
