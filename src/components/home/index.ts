/**
 * Home Component Index
 *
 * Main entry point for the home page module.
 *
 * Refactored by: CoomÜnity Council - Evolutionary Refactor
 */

export { default } from './Home';
export * from './sections';
export * from './hooks';
export * from './navigation';
export * from './common';
export * from './constants';

// Re-export gamification from consolidated module
export {
  StreakBadge,
  ProgressRingAnimated as ProgressRing,
  AchievementToastAnimated as AchievementToast,
  useGamification,
  XP_REWARDS,
} from '../gamification';
export type { Achievement, GamificationState, GamificationActions, DailyActions } from '../gamification';
