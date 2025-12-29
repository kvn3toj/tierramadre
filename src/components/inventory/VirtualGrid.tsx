/**
 * VirtualGrid Component
 * Virtualized grid rendering using react-window 2.x for smooth scrolling with 500+ items.
 * Only renders items visible in the viewport + overscan for performance.
 */
import React, { useCallback, useMemo, ReactElement, CSSProperties, useState, useEffect } from 'react';
import { Grid } from 'react-window';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { InventoryItem } from '../../types';

interface VirtualGridProps {
  items: InventoryItem[];
  favorites: number[];
  onItemClick: (item: InventoryItem) => void;
  onCertClick: (item: InventoryItem) => void;
  onToggleFavorite: (itemId: number) => void;
  renderCard: (props: {
    item: InventoryItem;
    isFavorite: boolean;
    onItemClick: () => void;
    onCertClick: () => void;
    onToggleFavorite: () => void;
  }) => React.ReactNode;
  /** Minimum height for the grid container */
  minHeight?: number;
}

// Card dimensions (compact design)
const CARD_HEIGHT = 260; // Image (180px) + content (~80px)
const GAP = 12; // Comfortable gap for grid

// Cell props passed via cellProps in react-window 2.x
interface GridCellProps {
  items: InventoryItem[];
  columnCount: number;
  favorites: number[];
  onItemClick: (item: InventoryItem) => void;
  onCertClick: (item: InventoryItem) => void;
  onToggleFavorite: (itemId: number) => void;
  renderCard: VirtualGridProps['renderCard'];
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
}: CellRendererProps): ReactElement {
  const index = rowIndex * columnCount + columnIndex;

  // Don't render if beyond items array
  if (index >= items.length) {
    return <div style={style} />;
  }

  const item = items[index];
  const isFavorite = favorites.includes(item.item);

  // For single column (mobile), no side padding needed
  const isSingleColumn = columnCount === 1;

  return (
    <div
      style={{
        ...style,
        // Add gap padding inside each cell (no side gaps on mobile single column)
        paddingRight: isSingleColumn ? 0 : GAP / 2,
        paddingBottom: GAP,
        paddingLeft: isSingleColumn || columnIndex === 0 ? 0 : GAP / 2,
      }}
    >
      {renderCard({
        item,
        isFavorite,
        onItemClick: () => onItemClick(item),
        onCertClick: () => onCertClick(item),
        onToggleFavorite: () => onToggleFavorite(item.item),
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

  // Track viewport width for mobile 2-column logic
  const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Responsive breakpoint detection
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isSm = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isMd = useMediaQuery(theme.breakpoints.between('md', 'lg'));

  // Calculate column count based on breakpoints
  // Mobile: 2 columns if screen >= 340px (optimized for 720x1440 devices)
  const getColumnCount = useCallback(() => {
    if (isXs) {
      return viewportWidth >= 340 ? 2 : 1;
    }
    if (isSm) return 2;
    if (isMd) return 3;
    return 4; // lg and up
  }, [isXs, isSm, isMd, viewportWidth]);

  const columnCount = getColumnCount();

  // Memoize cell props to prevent unnecessary re-renders
  const cellProps = useMemo<GridCellProps>(() => ({
    items,
    columnCount,
    favorites,
    onItemClick,
    onCertClick,
    onToggleFavorite,
    renderCard,
  }), [items, columnCount, favorites, onItemClick, onCertClick, onToggleFavorite, renderCard]);

  if (items.length === 0) {
    return null;
  }

  // Calculate row count based on items and columns
  const rowCount = Math.ceil(items.length / columnCount);

  // Mobile: adaptive width based on column count
  const isMobile = columnCount === 1;
  const isMobileTwoColumn = isXs && columnCount === 2;
  const mobileColumnWidth = isMobile ? '92%' : (isMobileTwoColumn ? '50%' : `${100 / columnCount}%`);

  return (
    <Box
      sx={{
        height: `calc(100vh - 280px)`,
        minHeight,
        width: '100%',
        // Center grid on mobile for balanced margins
        display: 'flex',
        justifyContent: 'center',
        // Grid container styles for react-window 2.x
        '& > div': {
          overflowX: 'hidden !important',
        },
      }}
    >
      <Grid<GridCellProps>
        cellComponent={CellRenderer}
        cellProps={cellProps}
        columnCount={columnCount}
        columnWidth={mobileColumnWidth} // 92% (1 col mobile), 50% (2 col mobile/tablet), 33% md, 25% lg
        rowCount={rowCount}
        rowHeight={CARD_HEIGHT + GAP}
        overscanCount={2}
        style={{
          height: '100%',
          width: '100%',
        }}
      />
    </Box>
  );
}
