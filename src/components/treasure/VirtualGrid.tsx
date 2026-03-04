/**
 * VirtualGrid Component
 * Virtualized grid rendering using react-window 2.x for smooth scrolling with 500+ items.
 * Only renders items visible in the viewport + overscan for performance.
 *
 * iOS HIG Compliant:
 * - 2 columns on mobile (iPhone) for optimal scanning
 * - 3 columns on tablet (iPad)
 * - 4 columns on desktop
 * - 8pt grid system spacing
 * - 4:5 aspect ratio images for compact cards
 *
 * iOS Safari Fix:
 * Uses CSS custom property (--vh) for viewport height instead of 100vh.
 * This prevents layout shift when the address bar hides/shows on iOS Safari.
 */
import React, { useCallback, useMemo, ReactElement, CSSProperties, useState, useEffect } from 'react';
import { Grid } from 'react-window';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { TreasureItem } from '../../types';
import { vhCalc } from '../../hooks/useViewportHeight';
import { usePriceShare } from '../../contexts/PriceShareContext';

interface VirtualGridProps {
  items: TreasureItem[];
  favorites: number[];
  onItemClick: (item: TreasureItem) => void;
  onCertClick: (item: TreasureItem) => void;
  onToggleFavorite: (itemId: number) => void;
  renderCard: (props: {
    item: TreasureItem;
    isFavorite: boolean;
    onItemClick: (item: TreasureItem) => void;
    onCertClick: (item: TreasureItem) => void;
    onToggleFavorite: (itemId: number) => void;
    isMobile: boolean;
  }) => React.ReactNode;
  /** Minimum height for the grid container */
  minHeight?: number;
  /** Callback when scroll direction changes */
  onScrollDirectionChange?: (direction: 'up' | 'down') => void;
}

/**
 * iOS HIG Card Dimensions
 * Based on Apple Human Interface Guidelines:
 * - 8pt grid system for spacing
 * - 44pt minimum touch targets
 * - 4:5 aspect ratio for product images (more compact than 1:1)
 */

// Gap sizes following 8pt grid (iOS HIG)
const MOBILE_GAP = 8;   // 8pt - iOS standard for compact layouts
const TABLET_GAP = 12;  // 12pt - 1.5x base for tablet
const DESKTOP_GAP = 16; // 16pt - 2x base for desktop

// Cell props passed via cellProps in react-window 2.x
interface GridCellProps {
  items: TreasureItem[];
  columnCount: number;
  favoritesSet: Set<number>;
  onItemClick: (item: TreasureItem) => void;
  onCertClick: (item: TreasureItem) => void;
  onToggleFavorite: (itemId: number) => void;
  renderCard: VirtualGridProps['renderCard'];
  isMobile: boolean;
  gap: number;
}

// Props received by the cell component from react-window 2.x
interface CellRendererProps extends GridCellProps {
  ariaAttributes: {
    'aria-colindex': number;
    role: 'gridcell';
  };
  columnIndex: number;
  rowIndex: number;
  style: CSSProperties;
}

/**
 * Cell renderer for react-window 2.x Grid.
 * Receives columnIndex, rowIndex, style from Grid, plus custom props from cellProps.
 */
function CellRenderer({
  columnIndex,
  rowIndex,
  style,
  items,
  columnCount,
  favoritesSet,
  onItemClick,
  onCertClick,
  onToggleFavorite,
  renderCard,
  isMobile,
  gap,
}: CellRendererProps): ReactElement {
  const index = rowIndex * columnCount + columnIndex;

  // Don't render if beyond items array
  if (index >= items.length) {
    return <div style={style} />;
  }

  const item = items[index];
  const isFavorite = favoritesSet.has(item.item);

  return (
    <div
      key={`cell-${item.item}`}
      style={{
        ...style,
        // iOS HIG: 8pt grid spacing between cards
        // Distribute gap evenly: half on each side
        paddingRight: columnIndex === columnCount - 1 ? 0 : gap / 2,
        paddingBottom: gap,
        paddingLeft: columnIndex === 0 ? 0 : gap / 2,
        boxSizing: 'border-box',
      }}
    >
      {renderCard({
        item,
        isFavorite,
        onItemClick,
        onCertClick,
        onToggleFavorite,
        isMobile,
      })}
    </div>
  );
}

/**
 * VirtualGrid renders items using react-window for virtualization.
 * Only items visible in the viewport are rendered to DOM.
 *
 * Responsive column counts:
 * - xs (< 600px): 2 columns - iPhone
 * - sm (600-900px): 2 columns - iPhone landscape / small tablets
 * - md (900-1200px): 3 columns - iPad
 * - lg (> 1200px): 4 columns - Desktop / large tablets
 */
export default function VirtualGrid({
  items,
  favorites,
  onItemClick,
  onCertClick,
  onToggleFavorite,
  renderCard,
  minHeight = 600,
  onScrollDirectionChange,
}: VirtualGridProps) {
  const theme = useTheme();
  const { shouldShowPrices } = usePriceShare();

  // Track viewport width for dynamic height calculation
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 390
  );

  // Track scroll position for direction detection
  const lastScrollTop = React.useRef(0);
  const lastDirection = React.useRef<'up' | 'down' | null>(null);

  // Update viewport width on resize
  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Responsive breakpoint detection
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));  // < 600px
  const isSm = useMediaQuery(theme.breakpoints.between('sm', 'md')); // 600-900px
  const isMd = useMediaQuery(theme.breakpoints.between('md', 'lg')); // 900-1200px

  // Calculate column count based on breakpoints
  // iOS HIG: 2 columns is optimal for scanning on mobile
  const getColumnCount = useCallback(() => {
    if (isXs) return 2; // iPhone - 2 columns
    if (isSm) return 2; // iPhone landscape / small tablet - 2 columns
    if (isMd) return 3; // iPad - 3 columns
    return 4; // Desktop / large screens - 4 columns
  }, [isXs, isSm, isMd]);

  const columnCount = getColumnCount();

  // Dynamic card height based on viewport and column count
  // Uses 1:1 aspect ratio for images
  const cardHeight = useMemo(() => {
    // Calculate available width per card
    // Desktop/iPad respects maxWidth: 1200px container
    const isDesktop = !isXs && !isSm;
    const containerMaxWidth = 1200;
    const effectiveWidth = isDesktop
      ? Math.min(viewportWidth, containerMaxWidth)
      : viewportWidth;

    // Horizontal padding: 8px mobile, 16px tablet, 0 desktop (parent handles it)
    const horizontalPadding = isXs ? 16 : isSm ? 16 : isMd ? 32 : 0;
    const currentGap = isXs ? MOBILE_GAP : isSm ? MOBILE_GAP : isMd ? TABLET_GAP : DESKTOP_GAP;
    const totalGapWidth = (columnCount - 1) * currentGap;
    const availableWidth = effectiveWidth - horizontalPadding;
    const cardWidth = (availableWidth - totalGapWidth) / columnCount;

    // Image height with 1:1 aspect ratio
    const imageHeight = Math.round(cardWidth);

    // Content area breakdown for 2-line name support:
    // - Padding: 12px top + 12px bottom = 24px
    // - Header row (color dot + quality chip): ~20px
    // - Name (2 lines @ 0.85rem × 1.3 lineHeight): ~36px
    // - Specs: ~16px
    // - Price: ~18px (only when visible)
    // Total: ~114px with price, ~96px without (use reduced values for breathing room)
    // 4 columns = narrower cards = more wrapping = need full height
    const priceHeight = shouldShowPrices ? 18 : 0;
    const baseHeight = isXs ? 82 : isSm ? 82 : isMd ? 90 : 96;
    const contentHeight = baseHeight + priceHeight;

    return imageHeight + contentHeight;
  }, [viewportWidth, columnCount, isXs, isSm, isMd, shouldShowPrices]);

  // Gap based on device - larger gaps for bigger screens
  const gap = isXs ? MOBILE_GAP : isSm ? MOBILE_GAP : isMd ? TABLET_GAP : DESKTOP_GAP;

  // Determine if mobile for card rendering optimization
  const isMobile = isXs || isSm;

  // Memoize cell props to prevent unnecessary re-renders
  // Convert favorites array to Set for O(1) lookups per cell
  const cellProps = useMemo<GridCellProps>(() => ({
    items,
    columnCount,
    favoritesSet: new Set(favorites),
    onItemClick,
    onCertClick,
    onToggleFavorite,
    renderCard,
    isMobile,
    gap,
  }), [items, columnCount, favorites, onItemClick, onCertClick, onToggleFavorite, renderCard, isMobile, gap]);

  // Stable onScroll handler for react-window Grid
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    if (!onScrollDirectionChange) return;

    const target = event.currentTarget;
    const scrollTop = target.scrollTop;
    const scrollThreshold = 10;
    const delta = scrollTop - lastScrollTop.current;

    if (Math.abs(delta) > scrollThreshold) {
      const direction = delta > 0 ? 'down' : 'up';
      if (direction !== lastDirection.current) {
        lastDirection.current = direction;
        onScrollDirectionChange(direction);
      }
      lastScrollTop.current = scrollTop;
    }
  }, [onScrollDirectionChange]);

  if (items.length === 0) {
    return null;
  }

  // Calculate row count based on items and columns
  const rowCount = Math.ceil(items.length / columnCount);

  // Column width as percentage
  const columnWidth = `${100 / columnCount}%`;

  // Header offset for grid height calculation
  // Accounts for: Navigation bar + search/filters + safe areas
  const HEADER_OFFSET = 280;

  return (
    <Box
      sx={{
        // iOS Safari fix: Use --vh custom property instead of 100vh
        height: vhCalc(100, HEADER_OFFSET),
        minHeight,
        width: '100%',
        // Responsive horizontal padding
        px: { xs: 1, sm: 1, md: 2, lg: 0 },
        boxSizing: 'border-box',
        position: 'relative',
        isolation: 'isolate',
        // Grid container styles
        '& > div': {
          overflowX: 'hidden !important',
          width: '100% !important',
          boxSizing: 'border-box',
        },
        // PWA standalone mode consistency
        '@media (display-mode: standalone)': {
          px: 1,
        },
      }}
    >
      <Grid<GridCellProps>
        cellComponent={CellRenderer}
        cellProps={cellProps}
        columnCount={columnCount}
        columnWidth={columnWidth}
        rowCount={rowCount}
        rowHeight={cardHeight + gap}
        overscanCount={3}
        onScroll={handleScroll}
        style={{
          height: '100%',
          width: '100%',
        }}
      />
    </Box>
  );
}
