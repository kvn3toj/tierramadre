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
import React, {
  useCallback,
  useMemo,
  ReactElement,
  CSSProperties,
  useState,
  useEffect,
  useRef,
} from "react";
import { Grid, type GridImperativeAPI } from "react-window";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { TreasureItem } from "../../types";
import { vhCalc } from "../../hooks/useViewportHeight";
import { usePriceShare } from "../../contexts/PriceShareContext";
import {
  saveScrollPos,
  readScrollPos,
  restoreScrollWhenReady,
} from "../../utils/scrollMemory";

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
  onScrollDirectionChange?: (direction: "up" | "down") => void;
  /**
   * Stable key (route + active filters) under which the grid's internal scroll
   * offset is persisted, so returning from a product page restores position.
   */
  scrollRestorationKey?: string;
  /** Restore the saved scroll offset on mount (true for back/forward navigations). */
  restoreScroll?: boolean;
  /**
   * Exposes the grid's internal scroll container to the parent (e.g. so the
   * "back to top" button can act on the element that actually scrolls in
   * grid view). Called with the element on mount and null on unmount.
   */
  onScrollElement?: (element: HTMLElement | null) => void;
}

/**
 * iOS HIG Card Dimensions
 * Based on Apple Human Interface Guidelines:
 * - 8pt grid system for spacing
 * - 44pt minimum touch targets
 * - 4:5 aspect ratio for product images (more compact than 1:1)
 */

// Quiet Emerald catalog spec: asymmetric gaps — phone 18px row / 12px col,
// tablet & desktop 30px row / 24px col (CatalogNew.dc.html / CatalogWide.dc.html).
const MOBILE_COL_GAP = 12;
const MOBILE_ROW_GAP = 18;
const WIDE_COL_GAP = 24;
const WIDE_ROW_GAP = 30;

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
  renderCard: VirtualGridProps["renderCard"];
  isMobile: boolean;
  colGap: number;
  rowGap: number;
}

// Props received by the cell component from react-window 2.x
interface CellRendererProps extends GridCellProps {
  ariaAttributes: {
    "aria-colindex": number;
    role: "gridcell";
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
  colGap,
  rowGap,
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
        // Quiet Emerald spec: asymmetric column vs row gutters.
        // Column gutter split half on each inner edge; row gutter below.
        paddingRight: columnIndex === columnCount - 1 ? 0 : colGap / 2,
        paddingBottom: rowGap,
        paddingLeft: columnIndex === 0 ? 0 : colGap / 2,
        boxSizing: "border-box",
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
  scrollRestorationKey,
  restoreScroll = false,
  onScrollElement,
}: VirtualGridProps) {
  const theme = useTheme();
  const { shouldShowPrices } = usePriceShare();

  // react-window 2.x imperative handle — gives us the scroll container element.
  const [gridApi, setGridApi] = useState<GridImperativeAPI | null>(null);

  // Measure actual container width via ref for accurate row height calculation.
  // This avoids guessing scrollbar widths and parent padding from viewport width.
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(
    typeof window !== "undefined" ? document.documentElement.clientWidth : 390,
  );

  // Track scroll position for direction detection
  const lastScrollTop = React.useRef(0);
  const lastDirection = React.useRef<"up" | "down" | null>(null);
  // Keep the latest onScrollElement callback in a ref for the notify effect.
  const onScrollElementRef = useRef(onScrollElement);
  onScrollElementRef.current = onScrollElement;

  // Expose the real scroll container to the parent (and clear it on unmount)
  // so affordances like "back to top" act on the element that truly scrolls.
  useEffect(() => {
    const el = gridApi?.element ?? null;
    onScrollElementRef.current?.(el);
    return () => onScrollElementRef.current?.(null);
  }, [gridApi]);

  // Scroll persistence + restoration, bound directly to the real scroll
  // element. We own the listener because react-window 2.x does NOT forward the
  // onScroll prop to its scroller, and reading the element at unmount is too
  // late (the Grid child detaches before this parent's cleanup runs). Capturing
  // `el` in the closure keeps the continuous saves — and the final save — valid.
  const didRestoreRef = useRef(false);
  useEffect(() => {
    const el = gridApi?.element;
    if (!el || !scrollRestorationKey) return;

    // Restore once, on back/forward navigations.
    if (!didRestoreRef.current) {
      didRestoreRef.current = true;
      if (restoreScroll) {
        const target = readScrollPos(scrollRestorationKey);
        if (target && target > 0) restoreScrollWhenReady(() => el, target);
      }
    }

    // Persist the offset continuously (rAF-throttled) so navigating away never
    // loses it, regardless of teardown ordering.
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        saveScrollPos(scrollRestorationKey, el.scrollTop);
        ticking = false;
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      // Only persist here on a genuine effect re-run (element still attached).
      // On unmount React detaches the subtree BEFORE running this cleanup, so
      // el.scrollTop would read 0 and clobber the value saved during scrolling.
      // The continuous listener above already holds the latest offset.
      if (el.isConnected && el.scrollTop > 0) {
        saveScrollPos(scrollRestorationKey, el.scrollTop);
      }
      el.removeEventListener("scroll", onScroll);
    };
  }, [gridApi, scrollRestorationKey, restoreScroll]);

  // Observe actual container width via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Initial measurement
    setContainerWidth(el.clientWidth);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // contentBoxSize gives us width without padding
        const width =
          entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
        setContainerWidth(width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Responsive breakpoint detection
  const isXs = useMediaQuery(theme.breakpoints.down("sm")); // < 600px
  const isSm = useMediaQuery(theme.breakpoints.between("sm", "md")); // 600-900px
  const isMd = useMediaQuery(theme.breakpoints.between("md", "lg")); // 900-1200px

  // Calculate column count based on breakpoints
  // iOS HIG: 2 columns is optimal for scanning on mobile
  const getColumnCount = useCallback(() => {
    if (isXs) return 2; // iPhone - 2 columns
    if (isSm) return 2; // iPhone landscape / small tablet - 2 columns
    if (isMd) return 3; // iPad - 3 columns
    return 4; // Desktop / large screens - 4 columns
  }, [isXs, isSm, isMd]);

  const columnCount = getColumnCount();

  // Determine if mobile for card rendering + geometry.
  const isMobile = isXs || isSm;

  // Quiet Emerald gutters: phone 12col/18row, tablet & desktop 24col/30row.
  const colGap = isMobile ? MOBILE_COL_GAP : WIDE_COL_GAP;
  const rowGap = isMobile ? MOBILE_ROW_GAP : WIDE_ROW_GAP;

  // Dynamic card height based on measured container width and column count.
  // Quiet Emerald catalog cards are near-square: image aspect 1/1.06 on phone,
  // 1/1.04 on tablet/desktop (CatalogNew / CatalogWide).
  const cardHeight = useMemo(() => {
    // containerWidth is the actual inner width of the Box measured via ResizeObserver.
    // This already excludes the Box's own padding (px: {xs:1, sm:1, md:2, lg:0}).
    // The Grid inside takes 100% of this, and its scrollbar reduces content area further.
    // react-window Grid scrollbar: mobile uses overlay (0px), desktop ~15px
    const scrollbarWidth = isXs || isSm ? 0 : 15;
    const gridContentWidth = containerWidth - scrollbarWidth;

    // Row height must accommodate the WIDEST card (edge columns: first/last).
    // Edge cells have only colGap/2 padding (one side), middle cells colGap (both).
    // Use edge column width to prevent overflow on wider cards.
    const cellWidth = gridContentWidth / columnCount;
    const maxCardWidth = cellWidth - colGap / 2;

    // Card border: 1px on each side reduces the inner width for the image
    const cardInnerWidth = maxCardWidth - 2;

    // Near-square image well (spec 1/1.06 phone, 1/1.04 wide).
    const imageAspect = isMobile ? 1.06 : 1.04;
    const imageHeight = Math.round(cardInnerWidth * imageAspect);

    // Content area breakdown (vertical layout):
    // - Padding: ~12px top + 12px bottom
    // - Name (up to 2 lines @ 16/19px × 1.12 lineHeight): ~36-43px
    // - Spec line (mono, single line): ~13px
    // - Price (single line): ~17px
    // Total: ~66px mobile, ~74px desktop (measured); generous to avoid clipping.
    const contentHeight = isMobile ? 68 : 76;

    // Card border adds 2px (top + bottom) to the total card height
    return imageHeight + contentHeight + 2;
  }, [
    containerWidth,
    columnCount,
    isXs,
    isSm,
    isMobile,
    colGap,
    shouldShowPrices,
  ]);

  // Memoize cell props to prevent unnecessary re-renders
  // Convert favorites/comparison arrays to Sets for O(1) lookups per cell
  const cellProps = useMemo<GridCellProps>(
    () => ({
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
      colGap,
      rowGap,
    }),
    [
      items,
      columnCount,
      favorites,
      comparisonIds,
      canAddToComparison,
      onItemClick,
      onCertClick,
      onToggleFavorite,
      renderCard,
      isMobile,
      colGap,
      rowGap,
    ],
  );

  // Optional scroll-direction detection. Scroll persistence is handled by the
  // dedicated listener above (react-window may not forward this prop).
  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (!onScrollDirectionChange) return;
      const scrollTop = event.currentTarget.scrollTop;
      const delta = scrollTop - lastScrollTop.current;
      if (Math.abs(delta) > 10) {
        const direction = delta > 0 ? "down" : "up";
        if (direction !== lastDirection.current) {
          lastDirection.current = direction;
          onScrollDirectionChange(direction);
        }
        lastScrollTop.current = scrollTop;
      }
    },
    [onScrollDirectionChange],
  );

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
        width: "100%",
        // Responsive horizontal padding
        px: { xs: 1, sm: 1, md: 2, lg: 0 },
        boxSizing: "border-box",
        position: "relative",
        isolation: "isolate",
        // Grid container styles
        "& > div": {
          overflowX: "hidden !important",
          width: "100% !important",
          boxSizing: "border-box",
        },
        // PWA standalone mode consistency
        "@media (display-mode: standalone)": {
          px: 1,
        },
      }}
    >
      <Grid<GridCellProps>
        gridRef={setGridApi}
        cellComponent={CellRenderer}
        cellProps={cellProps}
        columnCount={columnCount}
        columnWidth={columnWidth}
        rowCount={rowCount}
        rowHeight={cardHeight + rowGap}
        overscanCount={3}
        onScroll={handleScroll}
        style={{
          height: "100%",
          width: "100%",
        }}
      />
    </Box>
  );
}
