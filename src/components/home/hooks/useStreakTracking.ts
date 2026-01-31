/**
 * useStreakTracking Hook
 *
 * Manages user streak data for daily engagement tracking.
 * Persists to localStorage with automatic streak calculation.
 *
 * Designed by Steve - Data Architecture Specialist
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { STORAGE_KEYS } from '../../../constants/storage-keys';

// =============================================================================
// TYPES
// =============================================================================

export interface StreakData {
  /** Current consecutive days */
  current: number;
  /** Longest streak ever achieved */
  longest: number;
  /** Last visit date (ISO string) */
  lastVisit: string;
  /** Milestones achieved */
  milestones: number[];
}

export interface StreakMilestone {
  days: number;
  label: string;
  achieved: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = STORAGE_KEYS.STREAK;

const MILESTONES = [7, 14, 30, 60, 100, 365];

const MILESTONE_LABELS: Record<number, string> = {
  7: 'Primera Semana',
  14: 'Dos Semanas',
  30: 'Un Mes',
  60: 'Dos Meses',
  100: 'Centenario',
  365: 'Un Año',
};

// =============================================================================
// HELPERS
// =============================================================================

const getToday = (): string => new Date().toDateString();
const getYesterday = (): string => new Date(Date.now() - 86400000).toDateString();

const getInitialStreak = (): StreakData => {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {
    try {
      const data: StreakData = JSON.parse(saved);
      const today = getToday();
      const lastVisit = new Date(data.lastVisit).toDateString();
      const yesterday = getYesterday();

      // Ensure milestones array exists (migration for old data)
      const milestones = Array.isArray(data.milestones) ? data.milestones : [];

      // Already visited today
      if (lastVisit === today) {
        return { ...data, milestones };
      }

      // Visited yesterday - increment streak
      if (lastVisit === yesterday) {
        const newCurrent = (data.current || 0) + 1;
        return {
          current: newCurrent,
          lastVisit: today,
          longest: Math.max(data.longest || 0, newCurrent),
          milestones,
        };
      }

      // Streak broken - reset to 1
      return {
        current: 1,
        lastVisit: today,
        longest: data.longest || 0,
        milestones,
      };
    } catch {
      // Invalid data, reset
    }
  }

  // First visit ever
  return {
    current: 1,
    lastVisit: getToday(),
    longest: 1,
    milestones: [],
  };
};

// =============================================================================
// HOOK
// =============================================================================

export const useStreakTracking = () => {
  const [streak, setStreak] = useState<StreakData>(() => {
    const initial = getInitialStreak();
    // Ensure milestones is always an array (migration safety)
    return {
      ...initial,
      milestones: Array.isArray(initial.milestones) ? initial.milestones : [],
    };
  });
  const [newMilestone, setNewMilestone] = useState<number | null>(null);

  // Persist streak data
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(streak));
  }, [streak]);

  // Safe milestones array (always defined)
  const safeMilestones = Array.isArray(streak.milestones) ? streak.milestones : [];

  // Check for new milestones
  useEffect(() => {
    const unachievedMilestones = MILESTONES.filter(
      m => streak.current >= m && !safeMilestones.includes(m)
    );

    if (unachievedMilestones.length > 0) {
      const latestMilestone = Math.max(...unachievedMilestones);
      setNewMilestone(latestMilestone);

      // Update milestones in streak data
      setStreak(prev => ({
        ...prev,
        milestones: [...(Array.isArray(prev.milestones) ? prev.milestones : []), ...unachievedMilestones],
      }));
    }
  }, [streak.current, safeMilestones]);

  // Clear milestone notification
  const dismissMilestone = useCallback(() => {
    setNewMilestone(null);
  }, []);

  // Get milestone status
  const milestones = useMemo<StreakMilestone[]>(() => {
    const currentMilestones = Array.isArray(streak.milestones) ? streak.milestones : [];
    return MILESTONES.map(days => ({
      days,
      label: MILESTONE_LABELS[days],
      achieved: currentMilestones.includes(days) || streak.current >= days,
    }));
  }, [streak.milestones, streak.current]);

  // Next milestone to achieve
  const nextMilestone = useMemo(() => {
    const next = MILESTONES.find(m => streak.current < m);
    return next ? {
      days: next,
      label: MILESTONE_LABELS[next],
      daysRemaining: next - streak.current,
    } : null;
  }, [streak.current]);

  // Is streak at risk (last visit was yesterday)?
  const isStreakAtRisk = useMemo(() => {
    const lastVisitDate = new Date(streak.lastVisit).toDateString();
    return lastVisitDate !== getToday();
  }, [streak.lastVisit]);

  return {
    /** Current streak count */
    current: streak.current,
    /** Longest streak ever */
    longest: streak.longest,
    /** Last visit date */
    lastVisit: streak.lastVisit,
    /** All milestones with status */
    milestones,
    /** Next milestone to achieve */
    nextMilestone,
    /** Newly achieved milestone (for celebration) */
    newMilestone,
    /** Dismiss milestone notification */
    dismissMilestone,
    /** Is the streak at risk of breaking? */
    isStreakAtRisk,
  };
};

export default useStreakTracking;
