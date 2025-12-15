/**
 * Home Hooks Index
 *
 * Export all custom hooks for the home page.
 *
 * Refactored by: CoomÜnity Council - Evolutionary Refactor
 */

export { default as useStreakTracking, type StreakData, type StreakMilestone } from './useStreakTracking';
export { default as useMeditationTimer, type MeditationTimerState, type MeditationTimerActions } from './useMeditationTimer';
export {
  default as useAnalytics,
  type AnalyticsEvent,
  type EventType,
  type EventCategory,
  type SessionMetrics,
  type AnalyticsActions,
} from './useAnalytics';
export {
  default as useSavedFacts,
  type SavedFactsState,
  type SavedFactsActions,
} from './useSavedFacts';
