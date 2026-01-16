/**
 * Gamification Components
 *
 * Components for the achievement and progress system.
 * Consolidated from /home/gamification/ merge.
 */

// Core components (simple, context-integrated)
export { default as AchievementToast } from './AchievementToast';
export { default as ProgressRing } from './ProgressRing';
export { default as LevelBadge } from './LevelBadge';

// Animated variants (framer-motion, props-based)
export { default as AchievementToastAnimated } from './AchievementToastAnimated';
export type { Achievement } from './AchievementToastAnimated';
export { default as ProgressRingAnimated } from './ProgressRingAnimated';

// Streak components
export { default as StreakBadge } from './StreakBadge';

// Hooks
export { default as useGamification, XP_REWARDS } from './useGamification';
export type { GamificationState, GamificationActions, DailyActions } from './useGamification';
