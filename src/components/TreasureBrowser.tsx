/**
 * TreasureBrowser Component
 *
 * Main treasure browsing interface for Colombian emeralds.
 * Re-exports from InventoryBrowser for backward compatibility.
 *
 * The internal implementation in InventoryBrowser.tsx uses hooks and types
 * that have been aliased to support both "inventory" and "treasure" naming.
 */

// Re-export the component with the new name
export { default as TreasureBrowser } from './InventoryBrowser';
export { default } from './InventoryBrowser';
