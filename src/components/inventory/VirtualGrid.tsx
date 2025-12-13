/**
 * VirtualGrid Component
 * Virtualized grid rendering using react-window 2.x for smooth scrolling with 500+ items.
 * Only renders items visible in the viewport + overscan for performance.
 */
import React, { useCallback, useMemo, ReactElement, CSSProperties } from 'react';
import { Grid } from 'react-window';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { InventoryItem, TrustScoreBreakdown } from '../../types';

interface VirtualGridProps {
  items: InventoryItem[];
  trustScores: Map<number, TrustScoreBreakdown>;
  favorites: number[];
  onItemClick: (item: InventoryItem) => void;
  onCertClick: (item: InventoryItem) => void;
  onToggleFavorite: (itemId: number) => void;
  renderCard: (props: {
    item: InventoryItem;
    trustScore: TrustScoreBreakdown;
    isFavorite: boolean;
    onItemClick: () => void;
    onCertClick: () => void;
    onToggleFavorite: () => void;
  }) => React.ReactNode;
  /** Minimum height for the grid container */
  minHeight?: number;
}

// Card dimensions (matching GridCard design)
const CARD_HEIGHT = 420; // Image (180px) + content area
const GAP = 20;

// Cell props passed via cellProps in react-window 2.x
interface GridCellProps {
  items: InventoryItem[];
  columnCount: number;
  trustScores: Map<number, TrustScoreBreakdown>;
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
  trustScores,
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
  const trustScore = trustScores.get(item.item) || {
    provenance: 0,
    quality: 0,
    aesthetic: 0,
    market: 0,
    overall: 0,
  };
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
        trustScore,
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
  trustScores,
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
  const getColumnCount = useCallback(() => {
    if (isXs) return 1;
    if (isSm) return 2;
    if (isMd) return 3;
    return 4; // lg and up
  }, [isXs, isSm, isMd]);

  const columnCount = getColumnCount();

  // Memoize cell props to prevent unnecessary re-renders
  const cellProps = useMemo<GridCellProps>(() => ({
    items,
    columnCount,
    trustScores,
    favorites,
    onItemClick,
    onCertClick,
    onToggleFavorite,
    renderCard,
  }), [items, columnCount, trustScores, favorites, onItemClick, onCertClick, onToggleFavorite, renderCard]);

  if (items.length === 0) {
    return null;
  }

  // Calculate row count based on items and columns
  const rowCount = Math.ceil(items.length / columnCount);

  // Mobile: 85% width for breathing room, desktop: full width divided by columns
  const isMobile = columnCount === 1;
  const mobileColumnWidth = '85%';

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
        columnWidth={isMobile ? mobileColumnWidth : `${100 / columnCount}%`} // 85% xs (centered), 50% sm, 33% md, 25% lg
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
