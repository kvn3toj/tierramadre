/**
 * RecentlyViewedCarousel Component
 * Horizontal scroll carousel showing recently viewed items.
 * Displays thumbnails with quick info on hover.
 */
import { useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Card,
  CardMedia,
  Tooltip,
  alpha,
  Skeleton,
} from '@mui/material';
import { ChevronLeft, ChevronRight, Clock, X } from 'lucide-react';
// Logo placeholder for products without images - use Vite asset import
import logoPlaceholder from '../assets/logo-symbol.png';
import { useThemeMode } from '../contexts/ThemeContext';
import { TreasureItem } from '../types';
import { formatCurrency } from '../utils/formatting';
import { emeraldCore, surfacesLight, surfacesDark } from '../design-system/tokens/colors';

interface RecentlyViewedCarouselProps {
  /** Array of recently viewed treasure items */
  items: TreasureItem[];
  /** Callback when an item is clicked */
  onItemClick: (item: TreasureItem) => void;
  /** Callback to clear all recent items */
  onClear?: () => void;
  /** Title to display */
  title?: string;
  /** Maximum items to display */
  maxItems?: number;
  /** Hide price information (for provider mode) */
  hidePrice?: boolean;
}

const CARD_WIDTH = 80;
const CARD_GAP = 6;

export default function RecentlyViewedCarousel({
  items,
  onItemClick,
  onClear,
  title = 'Visto recientemente',
  maxItems = 10,
  hidePrice = false,
}: RecentlyViewedCarouselProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const scrollRef = useRef<HTMLDivElement>(null);

  // Limit items to maxItems
  const displayItems = items.slice(0, maxItems);

  // Don't render if no items
  if (displayItems.length === 0) {
    return null;
  }

  // Scroll handlers
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = (CARD_WIDTH + CARD_GAP) * 2;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <Box
      sx={{
        mb: 1.5,
        py: 1,
        borderRadius: 2,
        bgcolor: isLight
          ? alpha(emeraldCore.lightest, 0.3)
          : alpha(surfacesDark.background.tertiary, 0.5),
        border: '1px solid',
        borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
        // iOS HIG: Remove horizontal padding from container to allow carousel padding control
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1,
          px: 2, // iOS HIG: 16px horizontal padding for header
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Clock size={14} color={emeraldCore.primary} />
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              fontSize: '0.75rem',
              color: isLight ? surfacesLight.text.primary : surfacesDark.text.primary,
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.65rem',
              color: isLight ? surfacesLight.text.tertiary : surfacesDark.text.tertiary,
            }}
          >
            ({displayItems.length})
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {/* Clear button */}
          {onClear && (
            <Tooltip title="Limpiar historial">
              <IconButton
                onClick={onClear}
                size="small"
                sx={{
                  color: isLight ? surfacesLight.text.tertiary : surfacesDark.text.tertiary,
                  '&:hover': {
                    color: 'error.main',
                    bgcolor: alpha('#ef4444', 0.1),
                  },
                }}
              >
                <X size={16} />
              </IconButton>
            </Tooltip>
          )}

          {/* Scroll buttons */}
          <IconButton
            onClick={() => scroll('left')}
            size="small"
            sx={{
              color: isLight ? surfacesLight.text.secondary : surfacesDark.text.secondary,
              '&:hover': { bgcolor: alpha(emeraldCore.primary, 0.1) },
            }}
          >
            <ChevronLeft size={18} />
          </IconButton>
          <IconButton
            onClick={() => scroll('right')}
            size="small"
            sx={{
              color: isLight ? surfacesLight.text.secondary : surfacesDark.text.secondary,
              '&:hover': { bgcolor: alpha(emeraldCore.primary, 0.1) },
            }}
          >
            <ChevronRight size={18} />
          </IconButton>
        </Box>
      </Box>

      {/* Carousel */}
      <Box
        ref={scrollRef}
        sx={{
          display: 'flex',
          gap: `${CARD_GAP}px`,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          pb: 0.5, // Space for hover effects
          // iOS HIG: Horizontal padding creates safe zones and prevents edge cutoff
          px: 2, // 16px padding on both sides
          // iOS HIG: Content insets for peek effect (show part of next/prev items)
          '&::before': {
            content: '""',
            display: 'block',
            width: 0,
            flexShrink: 0,
          },
          '&::after': {
            content: '""',
            display: 'block',
            width: 0,
            flexShrink: 0,
          },
        }}
      >
        {displayItems.map((item) => (
          <RecentItemCard
            key={item.item}
            item={item}
            onClick={() => onItemClick(item)}
            isLight={isLight}
            hidePrice={hidePrice}
          />
        ))}
      </Box>
    </Box>
  );
}

// Individual item card in carousel
function RecentItemCard({
  item,
  onClick,
  isLight,
  hidePrice = false,
}: {
  item: TreasureItem;
  onClick: () => void;
  isLight: boolean;
  hidePrice?: boolean;
}) {
  const displayName = item.nombre.replace(/^L:.*?\s/, '').replace(/^L:/, '').trim();
  const weight = typeof item.peso === 'number' ? `${item.peso} ct` : item.metalType || '';

  return (
    <Tooltip
      title={
        <Box sx={{ p: 0.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {item.color} {weight && `• ${weight}`}
          </Typography>
        </Box>
      }
      arrow
      placement="top"
    >
      <Card
        onClick={onClick}
        elevation={0}
        sx={{
          width: CARD_WIDTH,
          flexShrink: 0,
          scrollSnapAlign: 'start',
          borderRadius: 2,
          border: '1px solid',
          borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
          bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.secondary,
          cursor: 'pointer',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: emeraldCore.primary,
            transform: 'translateY(-2px)',
            boxShadow: isLight
              ? '0 4px 12px rgba(0, 0, 0, 0.1)'
              : '0 4px 12px rgba(0, 0, 0, 0.3)',
          },
        }}
      >
        {/* Image with overlaid price chip */}
        <Box sx={{ position: 'relative' }}>
          {item.imagen ? (
            <CardMedia
              component="img"
              image={item.thumbnailUrl || item.imagen}
              alt={displayName}
              sx={{
                height: 64,
                objectFit: 'cover',
              }}
            />
          ) : (
            <Box
              sx={{
                height: 64,
                bgcolor: isLight ? surfacesLight.background.tertiary : surfacesDark.background.tertiary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box
                component="img"
                src={logoPlaceholder}
                alt=""
                sx={{
                  width: 24,
                  height: 'auto',
                  opacity: 0.28,
                  filter: isLight ? 'brightness(0.7)' : 'brightness(0.5)',
                }}
              />
            </Box>
          )}

          {/* iOS HIG: Subtle price chip overlay - low visual weight for recently viewed items */}
          {!hidePrice && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 3,
                right: 3,
                bgcolor: 'rgba(0, 0, 0, 0.5)', // More transparent (was 0.75)
                backdropFilter: 'blur(4px)', // Less blur (was 8px)
                borderRadius: '4px',
                px: 0.4,
                py: 0.15,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.55rem', // Smaller (was 0.6rem)
                  color: 'rgba(255, 255, 255, 0.85)', // Softer white (not emerald)
                  fontWeight: 500, // Medium weight (was 700)
                  letterSpacing: '0.01em',
                }}
              >
                {formatCurrency(item.precioCOP)}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Name only */}
        <Box sx={{ p: 0.5 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              fontSize: '0.6rem',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: isLight ? surfacesLight.text.primary : surfacesDark.text.primary,
              lineHeight: 1.2,
            }}
          >
            {displayName}
          </Typography>
        </Box>
      </Card>
    </Tooltip>
  );
}

// Loading skeleton for carousel
export function RecentlyViewedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <Box sx={{ display: 'flex', gap: `${CARD_GAP}px`, overflowX: 'hidden' }}>
      {Array.from({ length: count }).map((_, index) => (
        <Box
          key={index}
          sx={{
            width: CARD_WIDTH,
            flexShrink: 0,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <Skeleton variant="rectangular" height={50} />
          <Box sx={{ p: 0.5 }}>
            <Skeleton variant="text" width="80%" height={10} />
            <Skeleton variant="text" width="50%" height={8} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}
