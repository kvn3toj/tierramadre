/**
 * iOS Components - Main Export
 * "Emerald iOS" Design System
 *
 * Central export point for all iOS components.
 * Import from here to access the complete component library.
 */

// Core Components
export { default as IOSCard } from './core/IOSCard';
export type {
  IOSCardProps,
  IOSCardVariant,
  IOSCardPadding,
} from './core/IOSCard';

// Input Components
export { default as IOSFilePicker } from './input/IOSFilePicker';
export type {
  IOSFilePickerProps,
  IOSFilePickerMode,
  FileWithPreview,
} from './input/IOSFilePicker';

// Feedback Components
export { default as IOSProgress } from './feedback/IOSProgress';
export type {
  IOSProgressProps,
  IOSProgressVariant,
  IOSProgressSize,
} from './feedback/IOSProgress';

// Navigation Components
// (IOSTabBar removed — the unified DS v3 `TabBar` from @/design-system replaces
//  it; storefront/provider slots + theme live in components/navigation/tabBarConfig.)
export { default as IOSNavigationBar } from './IOSNavigationBar';
export type { NavigationBarMode, NavigationAction } from './IOSNavigationBar';

export { default as IOSMoreSheet } from './IOSMoreSheet';
export type { MoreToolConfig } from './IOSMoreSheet';

export { default as IOSSettingsSheet } from './IOSSettingsSheet';

export { default as IOSFilterSheet } from './IOSFilterSheet';
export type { IOSFilterSheetProps } from './IOSFilterSheet';

export { default as GlobalSearchFAB } from './GlobalSearchFAB';

export { default as IOSLayout } from './IOSLayout';
