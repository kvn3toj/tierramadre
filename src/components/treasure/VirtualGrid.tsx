/**
 * VirtualGrid Component
 * Virtualized grid rendering using react-window 2.x for smooth scrolling with 500+ items.
 * Only renders items visible in the viewport + overscan for performance.
 *
 * iOS HIG Compliant:
 * - 2 columns on mobile (iPhone) for optimal scanning
 * - 8pt grid system spacing
 * - near-square image wells for compact cards
 * (column counts above phone width follow the measured container — gridColumns.ts)
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
  useLayoutEffect,
  useRef,
} from 'react';
import { Grid, type GridImperativeAPI } from 'react-window';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { TreasureItem } from '../../types';
import { usePriceShare } from '../../contexts/PriceShareContext';
import { layoutConstants } from '../../design-system';
import { resolveColumnCount, MOBILE_COLUMNS } from './gridColumns';
import {
  saveScrollPos,
  readScrollPos,
  restoreScrollWhenReady,
} from '../../utils/scrollMemory';

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
  /** Callback when scroll direction changes */
  onScrollDirectionChange?: (direction: 'up' | 'down') => void;
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
  renderCard: VirtualGridProps['renderCard'];
  isMobile: boolean;
  colGap: number;
  rowGap: number;
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
 * Columns are derived from the MEASURED container width, not from viewport
 * breakpoints — the grid lives inside the shell's centered --maxw container, so
 * window width never described the box being divided. The card stays ~270px and
 * the count follows the container: 2 on phones, 3 on iPad landscape, 4 on a
 * laptop, 5 in the widened catalog container, up to 8 on a large display.
 * Rule and rationale in gridColumns.ts.
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
    typeof window !== 'undefined' ? document.documentElement.clientWidth : 390,
  );

  // Track scroll position for direction detection
  const lastScrollTop = React.useRef(0);
  const lastDirection = React.useRef<'up' | 'down' | null>(null);
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

    // Restore once, on back/forward navigations. The restore poll can run for
    // up to a few seconds waiting on slow data, so its cancel function must be
    // called on teardown — otherwise a fast back-and-forth navigation could
    // still be polling when `el` is detached and assign a stale scrollTop.
    let cancelRestore: (() => void) | null = null;
    if (!didRestoreRef.current) {
      didRestoreRef.current = true;
      if (restoreScroll) {
        const target = readScrollPos(scrollRestorationKey);
        if (target && target > 0) {
          cancelRestore = restoreScrollWhenReady(() => el, target);
        }
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
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelRestore?.();
      // Only persist here on a genuine effect re-run (element still attached).
      // On unmount React detaches the subtree BEFORE running this cleanup, so
      // el.scrollTop would read 0 and clobber the value saved during scrolling.
      // The continuous listener above already holds the latest offset.
      if (el.isConnected && el.scrollTop > 0) {
        saveScrollPos(scrollRestorationKey, el.scrollTop);
      }
      el.removeEventListener('scroll', onScroll);
    };
  }, [gridApi, scrollRestorationKey, restoreScroll]);

  // Observe container width for the card math. Height is measured separately
  // by the availableHeight effect below — that one supersedes the earlier
  // shell-derived measurement (Phase 1) because it also tracks changes in the
  // header stack above the grid, not just the shell's own bounds.
  //
  // Layout effect, not a plain one: the column count now reads this value, and
  // the seed below (full document width) over-estimates the container by the
  // shell's padding chain. Measuring after paint would show one frame at the
  // wrong count and then re-flow the whole grid — exactly the blink the catalog
  // spends so much effort avoiding elsewhere.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    setContainerWidth(el.clientWidth);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target !== el) continue;
        // contentBoxSize gives us width without padding
        const width =
          entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
        setContainerWidth(width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Measure the actual available height (viewport minus everything above the
  // grid), instead of the fixed HEADER_OFFSET magic number this used to subtract
  // from 100vh — that guess didn't track the real desktop header stack
  // (filters/summary/recently-viewed) and left dead space or clipped the last
  // row depending on how tall that stack was.
  //
  // It no longer subtracts the tab bar either. Stopping the grid 80px short of
  // the screen cut the last visible row with a hard edge and wasted the strip
  // behind a bar that is mostly transparent anyway. The grid now runs to the
  // bottom and the cards pass UNDER the pill; the clearance comes back as
  // scroll padding below, so the final row can still be brought into the clear.
  const [availableHeight, setAvailableHeight] = useState<number | null>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const top = el.getBoundingClientRect().top;
      const viewportHeight =
        window.visualViewport?.height ?? window.innerHeight;
      setAvailableHeight(Math.max(300, viewportHeight - top));
    };
    measure();
    window.addEventListener('resize', measure);
    // Re-measure when anything above the grid (filters, summary, carousel)
    // changes height, not just on window resize.
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    return () => {
      window.removeEventListener('resize', measure);
      ro.disconnect();
    };
  }, []);

  // Device tier — still a viewport question, and legitimately so: it decides
  // touch vs pointer affordances, gutter scale and which card body renders.
  // What it must NOT decide is how many columns fit; see below.
  const isXs = useMediaQuery(theme.breakpoints.down('sm')); // < 600px
  const isSm = useMediaQuery(theme.breakpoints.between('sm', 'md')); // 600-900px
  const isMobile = isXs || isSm;

  // Quiet Emerald gutters: phone 12col/18row, tablet & desktop 24col/30row.
  const colGap = isMobile ? MOBILE_COL_GAP : WIDE_COL_GAP;
  const rowGap = isMobile ? MOBILE_ROW_GAP : WIDE_ROW_GAP;

  // The box the columns actually divide. containerWidth is the measured inner
  // width of the Box (padding already excluded); the Grid inside takes 100% of
  // it, and its scrollbar eats the rest — overlay on mobile (0px), ~15px on
  // desktop.
  const scrollbarWidth = isMobile ? 0 : 15;
  const gridContentWidth = containerWidth - scrollbarWidth;

  // Column count comes from that measured box, never from the window. The grid
  // sits inside the shell's centered --maxw container, so a viewport-keyed
  // ladder was sizing against a box it could not see: at 1800px it asked for 5
  // columns and got a 1033px grid, i.e. 187px cards — narrower than the same
  // catalog renders on a 1440px laptop. See gridColumns.ts for the rule and its
  // test for the device table it has to keep reproducing.
  //
  // Phone and tablet-portrait keep their fixed two-up: that one IS a device
  // decision (touch scanning) rather than a fitting one, so it stays out of the
  // container math.
  const columnCount = isMobile
    ? MOBILE_COLUMNS
    : resolveColumnCount(gridContentWidth, colGap);

  // Dynamic card height based on measured container width and column count.
  // Quiet Emerald catalog cards are near-square: image aspect 1/1.06 on phone,
  // 1/1.04 on tablet/desktop (CatalogNew / CatalogWide).
  const cardHeight = useMemo(() => {
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

    // Footer height budget (PieceCard text block), vertical breakdown:
    //   padding      10+10 mobile / 12+12 desktop      = 20 / 24
    //   name         ONE line @ 17/20px × 1.2          = 20 / 24
    //   stone line   mt 3/5 + 16px glyph row           = 19 / 21
    //   value row    mt 4/6 + ~16/18px                 = 20 / 24
    //                                             total ≈ 79 / 93
    // The name is a single line now, so this is a real measurement rather than
    // the old 2-line guess (68/76) — that number under-counted the footer, and
    // since the footer is flex-shrink:0 and the well is flex:1, every card was
    // silently paying for it by squeezing the image well below its 1/1.04
    // target. Budgeting the true height gives the stone its full near-square well.
    const contentHeight = isMobile ? 79 : 93;

    // Card border adds 2px (top + bottom) to the total card height
    return imageHeight + contentHeight + 2;
  }, [gridContentWidth, columnCount, isMobile, colGap, shouldShowPrices]);

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
        const direction = delta > 0 ? 'down' : 'up';
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
  const rowCount = Math.ceil(items.length / columnCount);

  // One extra, empty row at the end: the clearance the grid height stopped
  // subtracting when the cards began passing under the tab bar.
  //
  // It has to be a row, not padding. `padding-bottom` on react-window's scroll
  // container is not counted in its scroll extent — measured: at the very end of
  // the scroll the last card still sat 72px beneath the pill, permanently
  // unreadable. A spacer row is inside the virtualizer's own height maths, so it
  // actually scrolls.
  const SPACER_ROW = 1;
  const totalRowCount = rowCount + SPACER_ROW;
  const rowHeightFor = useCallback(
    (index: number) =>
      index === rowCount
        ? layoutConstants.tabBarClearance
        : cardHeight + rowGap,
    [rowCount, cardHeight, rowGap],
  );

  // Column width as percentage
  const columnWidth = `${100 / columnCount}%`;

  return (
    <Box
      ref={containerRef}
      sx={{
        // Measured (see the availableHeight effect above) — falls back to a
        // sane floor until the first measurement lands, avoiding a 0-height flash.
        height: availableHeight ?? 480,
        width: '100%',
        // Responsive horizontal padding. ZERO on phones on purpose: the shell
        // already applies the DS3 §3.1 edge (16px), and this box plus
        // TreasureBrowser were each adding 8 more on top of it — 32px a side,
        // 17% of a 375px screen spent on margin, for an edge the spec puts at 16.
        px: { xs: 0, sm: 1, md: 2, lg: 0 },
        boxSizing: 'border-box',
        position: 'relative',
        isolation: 'isolate',
        // Grid container styles. react-window's inner div is the element that
        // actually scrolls in grid view, so scroll-containment belongs here:
        // `contain` stops the grid's scroll from chaining into the <main>
        // shell behind it, which is what produced the "two scrollbars
        // fighting" feel when reaching the top or bottom of the catalog.
        '& > div': {
          overflowX: 'hidden !important',
          width: '100% !important',
          boxSizing: 'border-box',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        },
        // PWA standalone mode consistency
        '@media (display-mode: standalone)': {
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
        rowCount={totalRowCount}
        rowHeight={rowHeightFor}
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
