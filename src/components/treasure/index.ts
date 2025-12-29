/**
 * Treasure Module
 * Contains all treasure-related components.
 * Re-exports from inventory/ for backward compatibility while transitioning.
 */

// Re-export components with new names
export { InventoryCard as TreasureCard } from '../inventory/InventoryCard';
export type { InventoryCardProps as TreasureCardProps } from '../inventory/InventoryCard';

// Re-export optimized components
export { default as GridCard } from '../inventory/GridCard';
export { default as ListRow } from '../inventory/ListRow';
export { default as VirtualGrid } from '../inventory/VirtualGrid';

// Re-export filter components
export { FilterContent } from '../inventory/FilterContent';
export type { FilterContentProps } from '../inventory/FilterContent';

// Backward compatibility exports
export { InventoryCard, type InventoryCardProps } from '../inventory/InventoryCard';
