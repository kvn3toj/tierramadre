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
import React, { useCallback, useMemo, ReactElement, CSSProperties, useState, useEffect, useRef } from 'react';
import { Grid } from 'react-window';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { TreasureItem } from '../../types';
import { vhCalc } from '../../hooks/useViewportHeight';
import { usePriceShare } from '../../contexts/PriceShareContext';

interface VirtualGridProps {
  items: TreasureItem[];
  favorites: number[];
  /** Comparison-selected item IDs — flows through cellProps like favorites */
  comparisonIds?: number[];
  /** Whether more items can be added to comparison */
  canAddToComparison?: boolean;
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
    /** True for above-the-fold items (first row) — triggers eager loading */
    priority?: boolean;
    /** Whether item is selected for comparison */
    isSelectedForComparison?: boolean;
    /** Whether more items can be added to comparison */
    canAddToComparison?: boolean;
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
  comparisonIdsSet: Set<number>;
  canAddToComparison: boolean;
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
  comparisonIdsSet,
  canAddToComparison,
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
  const isSelectedForComparison = comparisonIdsSet.has(item.item);

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
        isSelectedForComparison,
        canAddToComparison,
        onItemClick,
        onCertClick,
        onToggleFavorite,
        isMobile,
        priority: rowIndex === 0,
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
  comparisonIds,
  canAddToComparison = false,
  onItemClick,
  onCertClick,
  onToggleFavorite,
  renderCard,
  minHeight = 600,
  onScrollDirectionChange,
}: VirtualGridProps) {
  const theme = useTheme();
  const { shouldShowPrices } = usePriceShare();

  // Measure actual container width via ref for accurate row height calculation.
  // This avoids guessing scrollbar widths and parent padding from viewport width.
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(
    typeof window !== 'undefined' ? document.documentElement.clientWidth : 390
  );

  // Track scroll position for direction detection
  const lastScrollTop = React.useRef(0);
  const lastDirection = React.useRef<'up' | 'down' | null>(null);

  // Observe actual container width via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Initial measurement
    setContainerWidth(el.clientWidth);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // contentBoxSize gives us width without padding
        const width = entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
        setContainerWidth(width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
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

  // Dynamic card height based on measured container width and column count
  // Uses 4:5 aspect ratio for product images (portrait crop)
  const cardHeight = useMemo(() => {
    // containerWidth is the actual inner width of the Box measured via ResizeObserver.
    // This already excludes the Box's own padding (px: {xs:1, sm:1, md:2, lg:0}).
    // The Grid inside takes 100% of this, and its scrollbar reduces content area further.
    // react-window Grid scrollbar: mobile uses overlay (0px), desktop ~15px
    const scrollbarWidth = (isXs || isSm) ? 0 : 15;
    const currentGap = isXs ? MOBILE_GAP : isSm ? MOBILE_GAP : isMd ? TABLET_GAP : DESKTOP_GAP;
    const gridContentWidth = containerWidth - scrollbarWidth;

    // Row height must accommodate the WIDEST card (edge columns: first/last).
    // Edge cells have only gap/2 padding (one side), middle cells have gap (both sides).
    // Use edge column width to prevent overflow on wider cards.
    const cellWidth = gridContentWidth / columnCount;
    const maxCardWidth = cellWidth - currentGap / 2;

    // Card border: 1px on each side reduces the inner width for the image
    const cardInnerWidth = maxCardWidth - 2;

    // Image height with 4:5 aspect ratio (width:height = 4:5)
    const imageHeight = Math.round(cardInnerWidth * 1.25);

    // Content area breakdown (vertical layout):
    // - Padding: 10px top + 10px bottom (mobile) or 12px + 12px (desktop)
    // - Name (up to 2 lines @ 14-15px × 1.25 lineHeight): ~35-38px
    // - Gap: 2px
    // - Specs + Price row (single line): ~16-18px
    // - Border-top on content: 1px
    // Total: ~65px mobile, ~70px desktop (measured)
    const contentHeight = isXs ? 65 : isSm ? 65 : isMd ? 70 : 70;

    // Card border adds 2px (top + bottom) to the total card height
    return imageHeight + contentHeight + 2;
  }, [containerWidth, columnCount, isXs, isSm, isMd, shouldShowPrices]);

  // Gap based on device - larger gaps for bigger screens
  const gap = isXs ? MOBILE_GAP : isSm ? MOBILE_GAP : isMd ? TABLET_GAP : DESKTOP_GAP;

  // Determine if mobile for card rendering optimization
  const isMobile = isXs || isSm;

  // Memoize cell props to prevent unnecessary re-renders
  // Convert favorites/comparison arrays to Sets for O(1) lookups per cell
  const cellProps = useMemo<GridCellProps>(() => ({
    items,
    columnCount,
    favoritesSet: new Set(favorites),
    comparisonIdsSet: new Set(comparisonIds || []),
    canAddToComparison,
    onItemClick,
    onCertClick,
    onToggleFavorite,
    renderCard,
    isMobile,
    gap,
  }), [items, columnCount, favorites, comparisonIds, canAddToComparison, onItemClick, onCertClick, onToggleFavorite, renderCard, isMobile, gap]);

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
  // Add 1 extra empty row at the bottom as spacer so the last real row
  // scrolls fully above the bottom tab bar (95px + safe-area)
  const rowCount = Math.ceil(items.length / columnCount) + 1;

  // Column width as percentage
  const columnWidth = `${100 / columnCount}%`;

  // Header offset for grid height calculation
  // Accounts for: Navigation bar + search/filters + safe areas
  const HEADER_OFFSET = 280;

  return (
    <Box
      ref={containerRef}
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
