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
import { ChevronLeft, ChevronRight, Clock, Gem, X } from 'lucide-react';
import { useThemeMode } from '../contexts/ThemeContext';
import { InventoryItem } from '../types';
import { formatCurrency } from '../utils/formatting';
import { emeraldCore, surfacesLight, surfacesDark } from '../design-system/tokens/colors';

interface RecentlyViewedCarouselProps {
  /** Array of recently viewed inventory items */
  items: InventoryItem[];
  /** Callback when an item is clicked */
  onItemClick: (item: InventoryItem) => void;
  /** Callback to clear all recent items */
  onClear?: () => void;
  /** Title to display */
  title?: string;
  /** Maximum items to display */
  maxItems?: number;
}

const CARD_WIDTH = 140;
const CARD_GAP = 12;

export default function RecentlyViewedCarousel({
  items,
  onItemClick,
  onClear,
  title = 'Visto recientemente',
  maxItems = 10,
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
        mb: 3,
        py: 2,
        px: 2,
        borderRadius: 3,
        bgcolor: isLight
          ? alpha(emeraldCore.lightest, 0.3)
          : alpha(surfacesDark.background.tertiary, 0.5),
        border: '1px solid',
        borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Clock size={18} color={emeraldCore.primary} />
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              color: isLight ? surfacesLight.text.primary : surfacesDark.text.primary,
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: isLight ? surfacesLight.text.tertiary : surfacesDark.text.tertiary,
              ml: 0.5,
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
        }}
      >
        {displayItems.map((item) => (
          <RecentItemCard
            key={item.item}
            item={item}
            onClick={() => onItemClick(item)}
            isLight={isLight}
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
}: {
  item: InventoryItem;
  onClick: () => void;
  isLight: boolean;
}) {
  const displayName = item.nombre.replace(/^L:.*?\s/, '').replace(/^L:/, '').trim();
  const weight = typeof item.peso === 'number' ? `${item.peso} ct` : item.metalType || '';

  return (
    <Tooltip
      title={
        <Box sx={{ p: 0.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {displayName}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {item.color} {weight && `• ${weight}`}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
            {formatCurrency(item.precioCOP)}
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
        {/* Image */}
        {item.imagen ? (
          <CardMedia
            component="img"
            image={item.thumbnailUrl || item.imagen}
            alt={displayName}
            sx={{
              height: 100,
              objectFit: 'cover',
            }}
          />
        ) : (
          <Box
            sx={{
              height: 100,
              bgcolor: isLight ? surfacesLight.background.tertiary : surfacesDark.background.tertiary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Gem size={32} color={isLight ? surfacesLight.text.disabled : surfacesDark.text.disabled} />
          </Box>
        )}

        {/* Info */}
        <Box sx={{ p: 1 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: isLight ? surfacesLight.text.primary : surfacesDark.text.primary,
            }}
          >
            {displayName}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.65rem',
              color: emeraldCore.primary,
              fontWeight: 600,
            }}
          >
            {formatCurrency(item.precioCOP)}
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
          <Skeleton variant="rectangular" height={100} />
          <Box sx={{ p: 1 }}>
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="text" width="50%" />
          </Box>
        </Box>
      ))}
    </Box>
  );
}
