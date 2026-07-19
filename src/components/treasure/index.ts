/**
 * Treasure Module
 * Contains all treasure-related components for browsing Colombian emeralds.
 */

// Main entry component
export { default as TreasureBrowser } from './TreasureBrowser';

// Optimized display components
export { default as GridCard } from './GridCard';
export { default as ListRow } from './ListRow';
export { default as VirtualGrid } from './VirtualGrid';
export { default as EmeraldCard } from './EmeraldCard';

// Filter components
export { FilterContent } from './FilterContent';
export type {
  FilterContentProps,
  FilterContentPropsGrouped,
} from './FilterContent';
export { ActiveFilterChips } from './ActiveFilterChips';
export type { ActiveFilterChipsProps } from './ActiveFilterChips';
export { default as SavedFiltersDropdown } from './SavedFiltersDropdown';

// Supporting components
export { default as RecentlyViewedCarousel } from './RecentlyViewedCarousel';
export { default as CertificationUpload } from './CertificationUpload';
