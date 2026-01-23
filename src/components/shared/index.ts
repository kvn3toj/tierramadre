/**
 * Shared Components
 * Cross-cutting UI components used throughout the application.
 */

// Loading states
export { default as LoadingFallback } from './LoadingFallback';
export { default as SplashScreen } from './SplashScreen';

// Error handling
export { ChunkErrorBoundary } from './ChunkErrorBoundary';

// Image components
export { default as ProgressiveImage } from './ProgressiveImage';
export { default as ImageWatermark } from './ImageWatermark';
export { default as MediaPreview } from './MediaPreview';

// Protection
export { default as ProtectedContent } from './ProtectedContent';

// Analytics & Dashboard Components
export { default as TabPanel, type TabPanelProps } from './TabPanel';
export { default as MetricCard, type MetricCardProps } from './MetricCard';
export { default as StatBox, type StatBoxProps } from './StatBox';
export { default as GlassCard, type GlassCardProps } from './GlassCard';
export { default as SectionHeader, type SectionHeaderProps } from './SectionHeader';
export { default as ActivityItem, type ActivityItemProps } from './ActivityItem';
