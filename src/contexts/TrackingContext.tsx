/**
 * Tracking Context - Tierra Madre Studio
 *
 * Global context for analytics tracking and achievement system.
 * Split into two contexts for performance:
 * - TrackingDispatchContext: stable callbacks (track, trackPageView, etc.)
 * - TrackingStateContext: reactive state (achievements, metrics, etc.)
 *
 * Components that only fire events (TreasureBrowser, CotizacionGenerator) use
 * useTrackingDispatch() and never re-render on state changes.
 */

import React, { createContext, useContext, useCallback, useEffect, useRef, useState, useMemo, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import type {
  AnalyticsEvent,
  Achievement,
  UserAchievements,
  AnalyticsStorage,
} from '../types/analytics';
import { createLogger } from '../utils/logger';
import { STORAGE_KEYS, SESSION_KEYS } from '../constants/storage-keys';
import { ACHIEVEMENTS, getLevelFromXp } from './tracking/achievements';

export { ACHIEVEMENTS, XP_LEVELS, getLevelFromXp } from './tracking/achievements';

const log = createLogger('Tracking');

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = STORAGE_KEYS.ANALYTICS;
const SESSION_KEY = SESSION_KEYS.SESSION;
const MAX_STORED_EVENTS = 500;
const DEBUG_MODE = import.meta.env.DEV;

// Feature flag: Track all authenticated users (guests, asesores, embajadores, admins)
const ADMIN_ONLY_MODE = false;

// Events that modify metrics or achievement progress — only these trigger state updates
const STATE_MODIFYING_EVENTS = new Set([
  'cotizacion_exported',
  'product_favorited',
  'comparison_viewed',
  'filter_saved',
  'product_engaged',
  'simulator_factors_adjusted',
  'oracle_viewed',
  'ambassador_profile_viewed',
]);

// =============================================================================
// STORAGE HELPERS
// =============================================================================

const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
};

const getStoredAnalytics = (): AnalyticsStorage => {
  const defaults: AnalyticsStorage = {
    events: [],
    achievements: {
      unlocked: [],
      progress: {},
      totalXp: 0,
      level: 1,
    },
    metrics: {
      totalSessions: 0,
      totalCotizaciones: 0,
      totalFavorites: 0,
      totalComparisons: 0,
      lastVisit: 0,
      streak: 0,
    },
  };

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Deep merge with defaults to handle incomplete stored data
      return {
        events: Array.isArray(parsed.events) ? parsed.events : defaults.events,
        achievements: {
          unlocked: Array.isArray(parsed.achievements?.unlocked) ? parsed.achievements.unlocked : defaults.achievements.unlocked,
          progress: parsed.achievements?.progress && typeof parsed.achievements.progress === 'object' ? parsed.achievements.progress : defaults.achievements.progress,
          totalXp: typeof parsed.achievements?.totalXp === 'number' ? parsed.achievements.totalXp : defaults.achievements.totalXp,
          level: typeof parsed.achievements?.level === 'number' ? parsed.achievements.level : defaults.achievements.level,
        },
        metrics: {
          ...defaults.metrics,
          ...(parsed.metrics && typeof parsed.metrics === 'object' ? parsed.metrics : {}),
        },
      };
    }
  } catch (error) {
    log.error('Failed to load analytics storage', error);
  }

  return defaults;
};

const saveAnalytics = (data: AnalyticsStorage): void => {
  try {
    const toSave = { ...data };
    if (toSave.events.length > MAX_STORED_EVENTS) {
      toSave.events = toSave.events.slice(-MAX_STORED_EVENTS);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    log.error('Failed to save analytics', error);
  }
};

const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

const isPWA = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
};

// =============================================================================
// CONTEXT TYPES
// =============================================================================

/** Stable dispatch callbacks — rarely change */
export interface TrackingDispatchType {
  track: (eventName: string, properties: Record<string, any>) => void;
  trackPageView: (pagePath: string, pageTitle: string) => void;
  checkAchievements: () => Achievement[];
  dismissAchievement: () => void;
  clearAnalytics: () => void;
  getSessionDuration: () => number;
}

/** Reactive state — changes on tracking events */
export interface TrackingStateType {
  achievements: UserAchievements;
  unlockedAchievements: Achievement[];
  recentAchievement: Achievement | null;
  getAchievementProgress: (achievementId: string) => number;
  ACHIEVEMENTS: Achievement[];
  levelInfo: { level: number; name: string; progress: number; nextLevelXp: number };
  metrics: AnalyticsStorage['metrics'] & { totalProductViews: number };
  exportAnalytics: () => AnalyticsStorage;
}

/** Combined type for backward compatibility */
export interface TrackingContextType extends TrackingDispatchType, TrackingStateType {}

// =============================================================================
// CONTEXTS
// =============================================================================

const TrackingDispatchContext = createContext<TrackingDispatchType | undefined>(undefined);
const TrackingStateContext = createContext<TrackingStateType | undefined>(undefined);

/**
 * Use for components that only fire events (TreasureBrowser, CotizacionGenerator).
 * Does NOT re-render when achievements/metrics change.
 */
export const useTrackingDispatch = (): TrackingDispatchType => {
  const context = useContext(TrackingDispatchContext);
  if (!context) {
    throw new Error('useTrackingDispatch must be used within TrackingProvider');
  }
  return context;
};

/**
 * Use for components that display achievement/metric data (Dashboard, Profile).
 * Re-renders when state changes.
 */
export const useTrackingState = (): TrackingStateType => {
  const context = useContext(TrackingStateContext);
  if (!context) {
    throw new Error('useTrackingState must be used within TrackingProvider');
  }
  return context;
};

/**
 * Combined hook — backward compatible. Returns both dispatch and state.
 * Components using this will re-render on state changes.
 */
export const useTracking = (): TrackingContextType => {
  const dispatch = useTrackingDispatch();
  const state = useTrackingState();
  return useMemo(() => ({ ...dispatch, ...state }), [dispatch, state]);
};

// =============================================================================
// PROVIDER
// =============================================================================

interface TrackingProviderProps {
  children: ReactNode;
}

export const TrackingProvider: React.FC<TrackingProviderProps> = ({ children }) => {
  const { accessLevel } = useAuth();
  const sessionStartRef = useRef<number>(Date.now());
  const lastPageRef = useRef<string>('');
  const initializedRef = useRef(false);

  // Events stored in ref — write-only, never displayed in UI
  const eventsRef = useRef<AnalyticsEvent[]>(getStoredAnalytics().events);

  // Only achievements and metrics are in state (displayed in UI)
  const initialData = getStoredAnalytics();
  const [achievements, setAchievements] = useState<UserAchievements>(initialData.achievements);
  const [metrics, setMetrics] = useState<AnalyticsStorage['metrics']>(initialData.metrics);
  const [recentAchievement, setRecentAchievement] = useState<Achievement | null>(null);

  // Refs for accessing current state in callbacks without dependencies
  const achievementsRef = useRef(achievements);
  const metricsRef = useRef(metrics);
  useEffect(() => { achievementsRef.current = achievements; }, [achievements]);
  useEffect(() => { metricsRef.current = metrics; }, [metrics]);

  // Initialize session on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const currentStorage = getStoredAnalytics();
    const now = Date.now();
    const lastVisit = currentStorage.metrics.lastVisit;
    const daysSinceLastVisit = lastVisit ? Math.floor((now - lastVisit) / (1000 * 60 * 60 * 24)) : 0;

    // Update streak
    if (daysSinceLastVisit === 1) {
      currentStorage.metrics.streak += 1;
    } else if (daysSinceLastVisit > 1) {
      currentStorage.metrics.streak = 1;
    } else if (daysSinceLastVisit === 0) {
      // Same day, keep streak
    } else {
      currentStorage.metrics.streak = 1;
    }

    currentStorage.metrics.totalSessions += 1;
    currentStorage.metrics.lastVisit = now;

    // Track session start event
    const sessionEvent = {
      event: 'session_start' as const,
      timestamp: now,
      sessionId: getSessionId(),
      accessLevel: accessLevel || 'guest',
      properties: {
        is_returning: currentStorage.metrics.totalSessions > 1,
        days_since_last_visit: daysSinceLastVisit,
        device_type: getDeviceType(),
        is_pwa: isPWA(),
      },
    };

    eventsRef.current = [...currentStorage.events, sessionEvent];
    setAchievements(currentStorage.achievements);
    setMetrics(currentStorage.metrics);
    saveAnalytics({ events: eventsRef.current, achievements: currentStorage.achievements, metrics: currentStorage.metrics });

    if (DEBUG_MODE) {
      log.info('Session started', sessionEvent.properties);
    }
  }, [accessLevel]);

  // Core tracking function — only triggers state update for state-modifying events
  const track = useCallback((
    eventName: string,
    properties: Record<string, any>
  ) => {
    if (ADMIN_ONLY_MODE && accessLevel !== 'admin') {
      return;
    }

    const event = {
      event: eventName,
      timestamp: Date.now(),
      sessionId: getSessionId(),
      accessLevel: accessLevel || 'guest',
      properties,
    } as AnalyticsEvent;

    // Always push event to ref (no re-render)
    eventsRef.current = [...eventsRef.current, event];
    if (eventsRef.current.length > MAX_STORED_EVENTS) {
      eventsRef.current = eventsRef.current.slice(-MAX_STORED_EVENTS);
    }

    if (DEBUG_MODE) {
      log.info(`\u{1F4CA} ${eventName}`, properties);
    }

    // Only update React state if this event modifies metrics/progress
    if (STATE_MODIFYING_EVENTS.has(eventName)) {
      // Update metrics
      setMetrics(prev => {
        switch (eventName) {
          case 'cotizacion_exported':
            return { ...prev, totalCotizaciones: prev.totalCotizaciones + 1 };
          case 'product_favorited':
            if ((properties as any).action === 'add') {
              return { ...prev, totalFavorites: prev.totalFavorites + 1 };
            }
            return prev;
          case 'comparison_viewed':
            return { ...prev, totalComparisons: prev.totalComparisons + 1 };
          default:
            return prev;
        }
      });

      // Update achievement progress
      setAchievements(prev => {
        const progress = { ...prev.progress };
        let changed = false;

        switch (eventName) {
          case 'filter_saved':
            progress.filters_saved = (progress.filters_saved || 0) + 1;
            changed = true;
            break;
          case 'product_favorited':
            if ((properties as any).action === 'add') {
              progress.favorites_added = (progress.favorites_added || 0) + 1;
              changed = true;
            }
            break;
          case 'comparison_viewed':
            progress.comparisons_made = (progress.comparisons_made || 0) + 1;
            changed = true;
            break;
          case 'product_engaged':
            progress.products_viewed = (progress.products_viewed || 0) + 1;
            changed = true;
            break;
          case 'cotizacion_exported':
            progress.cotizaciones_exported = (progress.cotizaciones_exported || 0) + 1;
            if ((properties as any).time_to_complete < 300) {
              progress.cotizacion_time = (properties as any).time_to_complete;
            }
            changed = true;
            break;
          case 'simulator_factors_adjusted':
            progress.simulations_completed = (progress.simulations_completed || 0) + 1;
            changed = true;
            break;
          case 'oracle_viewed':
            progress.oracle_streak = metricsRef.current.streak;
            changed = true;
            break;
          case 'ambassador_profile_viewed':
            progress.ambassador_profiles_viewed = (progress.ambassador_profiles_viewed || 0) + 1;
            changed = true;
            break;
        }

        if (changed) {
          progress.daily_streak = metricsRef.current.streak;
          const updated = { ...prev, progress };
          // Save to localStorage with events from ref
          saveAnalytics({ events: eventsRef.current, achievements: updated, metrics: metricsRef.current });
          return updated;
        }
        return prev;
      });
    } else {
      // Non-state event: just persist to localStorage
      saveAnalytics({ events: eventsRef.current, achievements: achievementsRef.current, metrics: metricsRef.current });
    }
  }, [accessLevel]);

  // Page view tracking
  const trackPageView = useCallback((pagePath: string, pageTitle: string) => {
    if (pagePath === lastPageRef.current) return;
    const referrer = lastPageRef.current;
    lastPageRef.current = pagePath;

    track('page_view', {
      page_path: pagePath,
      page_title: pageTitle,
      referrer_path: referrer || undefined,
    });
  }, [track]);

  // Check and unlock achievements
  const checkAchievements = useCallback((): Achievement[] => {
    const newlyUnlocked: Achievement[] = [];

    setAchievements(prev => {
      let updated = prev;
      let totalXpGained = 0;

      for (const achievement of ACHIEVEMENTS) {
        if (prev.unlocked.includes(achievement.id)) continue;

        const progress = prev.progress[achievement.condition.metric] || 0;
        let isUnlocked = false;

        switch (achievement.condition.type) {
          case 'count':
            isUnlocked = progress >= achievement.condition.target;
            break;
          case 'streak':
            isUnlocked = progress >= achievement.condition.target;
            break;
          case 'time':
            isUnlocked = progress > 0 && progress <= achievement.condition.target;
            break;
        }

        if (isUnlocked) {
          updated = {
            ...updated,
            unlocked: [...updated.unlocked, achievement.id],
            totalXp: updated.totalXp + achievement.xp,
          };
          totalXpGained += achievement.xp;
          newlyUnlocked.push(achievement);

          if (DEBUG_MODE) {
            log.info(`\u{1F3C6} Achievement unlocked: ${achievement.name}`);
          }
        }
      }

      if (newlyUnlocked.length > 0) {
        updated = { ...updated, level: getLevelFromXp(updated.totalXp).level };
        saveAnalytics({ events: eventsRef.current, achievements: updated, metrics: metricsRef.current });
        setRecentAchievement(newlyUnlocked[0]);
      }

      return newlyUnlocked.length > 0 ? updated : prev;
    });

    return newlyUnlocked;
  }, []);

  // Get progress for specific achievement
  const getAchievementProgress = useCallback((achievementId: string): number => {
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) return 0;

    const progress = achievements.progress[achievement.condition.metric] || 0;
    return Math.min((progress / achievement.condition.target) * 100, 100);
  }, [achievements.progress]);

  // Dismiss achievement toast
  const dismissAchievement = useCallback(() => {
    setRecentAchievement(null);
  }, []);

  // Session duration
  const getSessionDuration = useCallback((): number => {
    return Math.floor((Date.now() - sessionStartRef.current) / 1000);
  }, []);

  // Export analytics for debugging (includes events from ref)
  const exportAnalytics = useCallback((): AnalyticsStorage => {
    return { events: eventsRef.current, achievements, metrics };
  }, [achievements, metrics]);

  // Clear all analytics
  const clearAnalytics = useCallback(() => {
    const emptyAchievements: UserAchievements = {
      unlocked: [],
      progress: {},
      totalXp: 0,
      level: 1,
    };
    const emptyMetrics: AnalyticsStorage['metrics'] = {
      totalSessions: 0,
      totalCotizaciones: 0,
      totalFavorites: 0,
      totalComparisons: 0,
      lastVisit: 0,
      streak: 0,
    };
    eventsRef.current = [];
    localStorage.removeItem(STORAGE_KEY);
    setAchievements(emptyAchievements);
    setMetrics(emptyMetrics);
    log.info('Analytics cleared');
  }, []);

  // Get unlocked achievements as objects
  const unlockedAchievements = useMemo(() =>
    ACHIEVEMENTS.filter(a => achievements.unlocked.includes(a.id)),
    [achievements.unlocked]
  );

  // Level info
  const levelInfo = useMemo(() => getLevelFromXp(achievements.totalXp), [achievements.totalXp]);

  // Total product views from progress
  const totalProductViews = achievements.progress.products_viewed || 0;

  // Dispatch context — stable callbacks, rarely changes
  const dispatchValue = useMemo<TrackingDispatchType>(() => ({
    track,
    trackPageView,
    checkAchievements,
    dismissAchievement,
    clearAnalytics,
    getSessionDuration,
  }), [track, trackPageView, checkAchievements, dismissAchievement, clearAnalytics, getSessionDuration]);

  // State context — changes when achievements/metrics update
  const stateValue = useMemo<TrackingStateType>(() => ({
    achievements,
    unlockedAchievements,
    recentAchievement,
    getAchievementProgress,
    ACHIEVEMENTS,
    levelInfo,
    metrics: { ...metrics, totalProductViews },
    exportAnalytics,
  }), [achievements, unlockedAchievements, recentAchievement, getAchievementProgress,
    levelInfo, metrics, totalProductViews, exportAnalytics]);

  return (
    <TrackingDispatchContext.Provider value={dispatchValue}>
      <TrackingStateContext.Provider value={stateValue}>
        {children}
      </TrackingStateContext.Provider>
    </TrackingDispatchContext.Provider>
  );
};

export default TrackingProvider;
