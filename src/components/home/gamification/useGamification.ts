/**
 * useGamification Hook
 *
 * Unified gamification state management with XP, levels, and achievements.
 * Implements Octalysis Core Drives for engagement.
 *
 * Designed by: Moksart (Gamification Framework) + Steve (Data Architecture)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Achievement } from './AchievementToast';

// =============================================================================
// TYPES
// =============================================================================

export interface GamificationState {
  /** Total XP earned */
  xp: number;
  /** Current level */
  level: number;
  /** XP required for next level */
  xpToNextLevel: number;
  /** Progress to next level (0-100) */
  levelProgress: number;
  /** Level title */
  levelTitle: string;
  /** Achievements earned */
  achievements: string[];
  /** Daily actions completed */
  dailyActions: DailyActions;
}

export interface DailyActions {
  factsViewed: number;
  factsSaved: number;
  meditationsCompleted: number;
  productsExplored: number;
  loginStreak: number;
}

export interface GamificationActions {
  /** Award XP for an action */
  awardXP: (amount: number, reason: string) => void;
  /** Record a daily action */
  recordAction: (action: keyof DailyActions, value?: number) => void;
  /** Check if achievement is unlocked */
  hasAchievement: (id: string) => boolean;
  /** Unlock an achievement */
  unlockAchievement: (achievement: Achievement) => void;
  /** Reset daily actions (called at midnight) */
  resetDailyActions: () => void;
  /** Dismiss pending achievement notification */
  dismissAchievement: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = 'tierra-madre-gamification';

// Level progression (XP required for each level)
const LEVEL_THRESHOLDS = [
  0,      // Level 1
  100,    // Level 2
  300,    // Level 3
  600,    // Level 4
  1000,   // Level 5
  1500,   // Level 6
  2200,   // Level 7
  3000,   // Level 8
  4000,   // Level 9
  5500,   // Level 10 (Maestro)
];

const LEVEL_TITLES = [
  'Novato',        // 1
  'Aprendiz',      // 2
  'Estudiante',    // 3
  'Conocedor',     // 4
  'Experto',       // 5
  'Especialista',  // 6
  'Veterano',      // 7
  'Sabio',         // 8
  'Maestro',       // 9
  'Leyenda',       // 10
];

// XP rewards for actions
export const XP_REWARDS = {
  viewFact: 5,
  saveFact: 10,
  completeMeditation: 25,
  exploreProduct: 5,
  dailyLogin: 15,
  streakBonus: (streak: number) => Math.min(streak * 5, 50), // Cap at 50
  achievementBonus: 100,
};

// Default state
const DEFAULT_STATE: GamificationState = {
  xp: 0,
  level: 1,
  xpToNextLevel: LEVEL_THRESHOLDS[1],
  levelProgress: 0,
  levelTitle: LEVEL_TITLES[0],
  achievements: [],
  dailyActions: {
    factsViewed: 0,
    factsSaved: 0,
    meditationsCompleted: 0,
    productsExplored: 0,
    loginStreak: 0,
  },
};

// =============================================================================
// HELPERS
// =============================================================================

const calculateLevel = (xp: number): { level: number; progress: number; xpToNext: number } => {
  let level = 1;

  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }

  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const xpInLevel = xp - currentThreshold;
  const xpForLevel = nextThreshold - currentThreshold;
  const progress = Math.min((xpInLevel / xpForLevel) * 100, 100);

  return {
    level: Math.min(level, LEVEL_TITLES.length),
    progress,
    xpToNext: nextThreshold - xp,
  };
};

const loadState = (): GamificationState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Check if daily actions need reset (new day)
      const lastUpdate = new Date(parsed.lastUpdate || 0);
      const today = new Date();
      if (lastUpdate.toDateString() !== today.toDateString()) {
        parsed.dailyActions = DEFAULT_STATE.dailyActions;
      }
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load gamification state:', e);
  }
  return DEFAULT_STATE;
};

const saveState = (state: GamificationState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...state,
      lastUpdate: new Date().toISOString(),
    }));
  } catch (e) {
    console.error('Failed to save gamification state:', e);
  }
};

// =============================================================================
// HOOK
// =============================================================================

export const useGamification = (): [GamificationState, GamificationActions, Achievement | null] => {
  const [state, setState] = useState<GamificationState>(loadState);
  const [pendingAchievement, setPendingAchievement] = useState<Achievement | null>(null);

  // Persist state changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Recalculate level on XP change
  useEffect(() => {
    const { level, progress, xpToNext } = calculateLevel(state.xp);
    if (level !== state.level || progress !== state.levelProgress) {
      setState(prev => ({
        ...prev,
        level,
        levelProgress: progress,
        xpToNextLevel: xpToNext,
        levelTitle: LEVEL_TITLES[level - 1] || LEVEL_TITLES[LEVEL_TITLES.length - 1],
      }));
    }
  }, [state.xp, state.level, state.levelProgress]);

  // Award XP
  const awardXP = useCallback((amount: number, reason: string) => {
    setState(prev => ({
      ...prev,
      xp: prev.xp + amount,
    }));
    console.log(`[Gamification] +${amount} XP: ${reason}`);
  }, []);

  // Record action
  const recordAction = useCallback((action: keyof DailyActions, value = 1) => {
    setState(prev => ({
      ...prev,
      dailyActions: {
        ...prev.dailyActions,
        [action]: prev.dailyActions[action] + value,
      },
    }));

    // Auto-award XP based on action
    switch (action) {
      case 'factsViewed':
        awardXP(XP_REWARDS.viewFact, 'Ver dato');
        break;
      case 'factsSaved':
        awardXP(XP_REWARDS.saveFact, 'Guardar dato');
        break;
      case 'meditationsCompleted':
        awardXP(XP_REWARDS.completeMeditation, 'Completar meditación');
        break;
      case 'productsExplored':
        awardXP(XP_REWARDS.exploreProduct, 'Explorar producto');
        break;
    }
  }, [awardXP]);

  // Check achievement
  const hasAchievement = useCallback((id: string) => {
    return state.achievements.includes(id);
  }, [state.achievements]);

  // Unlock achievement
  const unlockAchievement = useCallback((achievement: Achievement) => {
    if (state.achievements.includes(achievement.id)) return;

    setState(prev => ({
      ...prev,
      achievements: [...prev.achievements, achievement.id],
      xp: prev.xp + (achievement.xpReward || XP_REWARDS.achievementBonus),
    }));

    setPendingAchievement(achievement);
  }, [state.achievements]);

  // Reset daily actions
  const resetDailyActions = useCallback(() => {
    setState(prev => ({
      ...prev,
      dailyActions: DEFAULT_STATE.dailyActions,
    }));
  }, []);

  // Dismiss pending achievement
  const dismissAchievement = useCallback(() => {
    setPendingAchievement(null);
  }, []);

  // Actions object
  const actions: GamificationActions = useMemo(() => ({
    awardXP,
    recordAction,
    hasAchievement,
    unlockAchievement,
    resetDailyActions,
    dismissAchievement,
  }), [awardXP, recordAction, hasAchievement, unlockAchievement, resetDailyActions, dismissAchievement]);

  return [state, actions, pendingAchievement];
};

export default useGamification;
