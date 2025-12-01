/**
 * iOS Components - Main Export
 * "Emerald iOS" Design System
 *
 * Central export point for all iOS components.
 * Import from here to access the complete component library.
 */

// Core Components
export { default as IOSCard } from './core/IOSCard';
export type { IOSCardProps, IOSCardVariant, IOSCardPadding } from './core/IOSCard';

export { default as IOSButton } from './core/IOSButton';
export type { IOSButtonProps, IOSButtonVariant, IOSButtonSize } from './core/IOSButton';

export { default as IOSTextField } from './core/IOSTextField';
export type { IOSTextFieldProps } from './core/IOSTextField';

// Input Components
export { default as IOSFilePicker } from './input/IOSFilePicker';
export type { IOSFilePickerProps, IOSFilePickerMode, FileWithPreview } from './input/IOSFilePicker';

// Feedback Components
export { default as IOSProgress } from './feedback/IOSProgress';
export type { IOSProgressProps, IOSProgressVariant, IOSProgressSize } from './feedback/IOSProgress';

// Navigation Components
export { default as IOSTabBar } from './IOSTabBar';
export type { TabConfig } from './IOSTabBar';

export { default as IOSNavigationBar } from './IOSNavigationBar';
export type { NavigationBarMode, NavigationAction } from './IOSNavigationBar';

export { default as IOSMoreSheet } from './IOSMoreSheet';
export type { MoreToolConfig } from './IOSMoreSheet';

export { default as IOSLayout } from './IOSLayout';
