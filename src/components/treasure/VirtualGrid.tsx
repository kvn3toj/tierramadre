/**
 * VirtualGrid Component
 * Virtualized grid rendering using react-window 2.x for smooth scrolling with 500+ items.
 * Only renders items visible in the viewport + overscan for performance.
 *
 * iOS Safari Fix:
 * Uses CSS custom property (--vh) for viewport height instead of 100vh.
 * This prevents layout shift when the address bar hides/shows on iOS Safari.
 * The --vh variable is set by useViewportHeight hook in the app root.
 */
import React, { useCallback, useMemo, ReactElement, CSSProperties } from 'react';
import { Grid } from 'react-window';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { TreasureItem } from '../../types';
import { vhCalc } from '../../hooks/useViewportHeight';

interface VirtualGridProps {
  items: TreasureItem[];
  favorites: number[];
  onItemClick: (item: TreasureItem) => void;
  onCertClick: (item: TreasureItem) => void;
  onToggleFavorite: (itemId: number) => void;
  renderCard: (props: {
    item: TreasureItem;
    isFavorite: boolean;
    onItemClick: () => void;
    onCertClick: () => void;
    onToggleFavorite: () => void;
    isMobile: boolean;
  }) => React.ReactNode;
  /** Minimum height for the grid container */
  minHeight?: number;
}

// Card dimensions - Mobile luxury vs Desktop compact
const MOBILE_CARD_HEIGHT = 420; // Square image (~320px on iPhone 12) + content (~100px)
const DESKTOP_CARD_HEIGHT = 260; // Image (180px) + content (~80px)
const MOBILE_GAP = 16; // Luxury spacing for mobile
const DESKTOP_GAP = 12; // Comfortable gap for desktop grid

// Cell props passed via cellProps in react-window 2.x
interface GridCellProps {
  items: TreasureItem[];
  columnCount: number;
  favorites: number[];
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
  favorites,
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
  const isFavorite = favorites.includes(item.item);

  return (
    <div
      style={{
        ...style,
        // iOS HIG: Add gap padding inside each cell with proper edge handling
        // First column: padding-right only
        // Middle columns: padding on both sides
        // Last column: padding-left only (prevents cutoff)
        paddingRight: columnIndex === columnCount - 1 ? 0 : gap / 2,
        paddingBottom: gap,
        paddingLeft: columnIndex === 0 ? 0 : gap / 2,
        // iOS HIG: Ensure content doesn't touch screen edges
        boxSizing: 'border-box',
      }}
    >
      {renderCard({
        item,
        isFavorite,
        onItemClick: () => onItemClick(item),
        onCertClick: () => onCertClick(item),
        onToggleFavorite: () => onToggleFavorite(item.item),
        isMobile,
      })}
    </div>
  );
}

/**
 * VirtualGrid renders items using react-window for virtualization.
 * Only items visible in the viewport are rendered to DOM.
 */
export default function VirtualGrid({
  items,
  favorites,
  onItemClick,
  onCertClick,
  onToggleFavorite,
  renderCard,
  minHeight = 600,
}: VirtualGridProps) {
  const theme = useTheme();

  // Responsive breakpoint detection
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isSm = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isMd = useMediaQuery(theme.breakpoints.between('md', 'lg'));

  // Calculate column count based on breakpoints
  // Mobile (xs): Always 1 column for luxury layout with full-width cards
  const getColumnCount = useCallback(() => {
    if (isXs) return 1; // 1-column luxury layout for mobile
    if (isSm) return 2;
    if (isMd) return 3;
    return 4; // lg and up
  }, [isXs, isSm, isMd]);

  const columnCount = getColumnCount();

  // Dynamic card dimensions based on device
  const cardHeight = isXs ? MOBILE_CARD_HEIGHT : DESKTOP_CARD_HEIGHT;
  const gap = isXs ? MOBILE_GAP : DESKTOP_GAP;

  // Memoize cell props to prevent unnecessary re-renders
  const cellProps = useMemo<GridCellProps>(() => ({
    items,
    columnCount,
    favorites,
    onItemClick,
    onCertClick,
    onToggleFavorite,
    renderCard,
    isMobile: isXs,
    gap,
  }), [items, columnCount, favorites, onItemClick, onCertClick, onToggleFavorite, renderCard, isXs, gap]);

  if (items.length === 0) {
    return null;
  }

  // Calculate row count based on items and columns
  const rowCount = Math.ceil(items.length / columnCount);

  // iOS HIG: Column width calculation with proper edge margins
  // react-window only supports percentage or number values (not calc())
  // We handle gaps via padding in the cell renderer instead
  const columnWidth = `${100 / columnCount}%`;

  // Header offset for grid height calculation
  // This accounts for: IOSNavigationBar (~64px) + search/filters (~120px) + safe areas (~96px)
  const HEADER_OFFSET = 280;

  return (
    <Box
      sx={{
        // iOS Safari fix: Use --vh custom property instead of 100vh
        // This prevents layout shift when the address bar hides/shows
        height: vhCalc(100, HEADER_OFFSET),
        minHeight,
        width: '100%',
        // iOS HIG: Horizontal padding to prevent edge cutoff
        px: isXs ? 2 : 0, // 16px margins on mobile
        boxSizing: 'border-box',
        // Grid container styles for react-window 2.x
        '& > div': {
          overflowX: 'hidden !important',
          // Ensure grid doesn't overflow horizontally
          width: '100% !important',
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
        overscanCount={2}
        style={{
          height: '100%',
          width: '100%',
        }}
      />
    </Box>
  );
}
