/**
 * Tracking Context - Tierra Madre Studio
 *
 * Global context for analytics tracking and achievement system.
 * Provides tracking functions and achievement state to all components.
 */

import React, { createContext, useContext, useCallback, useEffect, useRef, useState, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import type {
  AnalyticsEvent,
  Achievement,
  UserAchievements,
  AnalyticsStorage,
} from '../types/analytics';
import { createLogger } from '../utils/logger';

const log = createLogger('Tracking');

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = 'tierra-madre-analytics';
const SESSION_KEY = 'tierra-madre-session';
const MAX_STORED_EVENTS = 500;
const DEBUG_MODE = import.meta.env.DEV;

// Feature flag: Only enable tracking for admins during testing phase
const ADMIN_ONLY_MODE = true;

// =============================================================================
// ACHIEVEMENT DEFINITIONS
// =============================================================================

export const ACHIEVEMENTS: Achievement[] = [
  // Discovery Achievements
  {
    id: 'curador_experto',
    name: 'Curador Experto',
    description: 'Guardar 5 filtros personalizados',
    icon: '🎯',
    xp: 50,
    category: 'discovery',
    condition: { type: 'count', target: 5, metric: 'filters_saved' },
  },
  {
    id: 'coleccionista',
    name: 'Coleccionista',
    description: 'Agregar 10 productos a favoritos',
    icon: '💎',
    xp: 75,
    category: 'discovery',
    condition: { type: 'count', target: 10, metric: 'favorites_added' },
  },
  {
    id: 'estratega',
    name: 'Estratega',
    description: 'Realizar tu primera comparación de productos',
    icon: '⚖️',
    xp: 25,
    category: 'discovery',
    condition: { type: 'count', target: 1, metric: 'comparisons_made' },
  },
  {
    id: 'explorador_total',
    name: 'Explorador Total',
    description: 'Visitar 50 productos diferentes',
    icon: '🗺️',
    xp: 100,
    category: 'discovery',
    condition: { type: 'count', target: 50, metric: 'products_viewed' },
  },
  // Cotización Achievements
  {
    id: 'cerrador_profesional',
    name: 'Cerrador Profesional',
    description: 'Exportar 5 cotizaciones',
    icon: '📋',
    xp: 100,
    category: 'cotizacion',
    condition: { type: 'count', target: 5, metric: 'cotizaciones_exported' },
  },
  {
    id: 'velocista',
    name: 'Velocista',
    description: 'Completar una cotización en menos de 5 minutos',
    icon: '⚡',
    xp: 50,
    category: 'cotizacion',
    condition: { type: 'time', target: 300, metric: 'cotizacion_time' },
  },
  {
    id: 'leyenda_ventas',
    name: 'Leyenda de Ventas',
    description: 'Exportar 50 cotizaciones',
    icon: '👑',
    xp: 500,
    category: 'cotizacion',
    condition: { type: 'count', target: 50, metric: 'cotizaciones_exported' },
  },
  // Simulator Achievements
  {
    id: 'maestro_valor',
    name: 'Maestro del Valor',
    description: 'Realizar 20 simulaciones de precio',
    icon: '💰',
    xp: 75,
    category: 'simulator',
    condition: { type: 'count', target: 20, metric: 'simulations_completed' },
  },
  // Engagement Achievements
  {
    id: 'sabio_oracle',
    name: 'Sabio del Oracle',
    description: '7 días consecutivos visitando el Oracle',
    icon: '🔮',
    xp: 150,
    category: 'streak',
    condition: { type: 'streak', target: 7, metric: 'oracle_streak' },
  },
  {
    id: 'embajador_conectado',
    name: 'Embajador Conectado',
    description: 'Visitar 10 perfiles de colegas',
    icon: '🤝',
    xp: 50,
    category: 'engagement',
    condition: { type: 'count', target: 10, metric: 'ambassador_profiles_viewed' },
  },
  // Streak Achievements
  {
    id: 'constante',
    name: 'Constante',
    description: 'Usar la app 7 días seguidos',
    icon: '🔥',
    xp: 100,
    category: 'streak',
    condition: { type: 'streak', target: 7, metric: 'daily_streak' },
  },
  {
    id: 'imparable',
    name: 'Imparable',
    description: 'Usar la app 30 días seguidos',
    icon: '🚀',
    xp: 300,
    category: 'streak',
    condition: { type: 'streak', target: 30, metric: 'daily_streak' },
  },
];

// =============================================================================
// XP LEVEL THRESHOLDS
// =============================================================================

export const XP_LEVELS = [
  { level: 1, name: 'Aprendiz', minXp: 0 },
  { level: 2, name: 'Conocedor', minXp: 100 },
  { level: 3, name: 'Experto', minXp: 300 },
  { level: 4, name: 'Maestro', minXp: 600 },
  { level: 5, name: 'Gran Maestro', minXp: 1000 },
  { level: 6, name: 'Leyenda', minXp: 1500 },
];

export const getLevelFromXp = (xp: number): { level: number; name: string; progress: number; nextLevelXp: number } => {
  let currentLevel = XP_LEVELS[0];
  let nextLevel = XP_LEVELS[1];

  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].minXp) {
      currentLevel = XP_LEVELS[i];
      nextLevel = XP_LEVELS[i + 1] || currentLevel;
      break;
    }
  }

  const xpInCurrentLevel = xp - currentLevel.minXp;
  const xpNeededForNext = nextLevel.minXp - currentLevel.minXp;
  const progress = xpNeededForNext > 0 ? (xpInCurrentLevel / xpNeededForNext) * 100 : 100;

  return {
    level: currentLevel.level,
    name: currentLevel.name,
    progress,
    nextLevelXp: nextLevel.minXp,
  };
};

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
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    log.error('Failed to load analytics storage', error);
  }

  return {
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
};

const saveAnalytics = (data: AnalyticsStorage): void => {
  try {
    if (data.events.length > MAX_STORED_EVENTS) {
      data.events = data.events.slice(-MAX_STORED_EVENTS);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
// CONTEXT TYPE
// =============================================================================

export interface TrackingContextType {
  // Event tracking - using simpler type to avoid complex type inference issues
  track: (eventName: string, properties: Record<string, any>) => void;

  // Page view tracking
  trackPageView: (pagePath: string, pageTitle: string) => void;

  // Achievement system
  achievements: UserAchievements;
  unlockedAchievements: Achievement[];
  recentAchievement: Achievement | null;
  dismissAchievement: () => void;
  checkAchievements: () => Achievement[];
  getAchievementProgress: (achievementId: string) => number;

  // Achievement definitions (for admin dashboard)
  ACHIEVEMENTS: Achievement[];

  // Level system
  levelInfo: { level: number; name: string; progress: number; nextLevelXp: number };

  // Metrics
  metrics: AnalyticsStorage['metrics'] & { totalProductViews: number };

  // Utilities
  getSessionDuration: () => number;
  exportAnalytics: () => AnalyticsStorage;
  clearAnalytics: () => void;
}

const TrackingContext = createContext<TrackingContextType | undefined>(undefined);

export const useTracking = (): TrackingContextType => {
  const context = useContext(TrackingContext);
  if (!context) {
    throw new Error('useTracking must be used within TrackingProvider');
  }
  return context;
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
  const [storage, setStorage] = useState<AnalyticsStorage>(getStoredAnalytics);
  const [recentAchievement, setRecentAchievement] = useState<Achievement | null>(null);
  const lastPageRef = useRef<string>('');
  const initializedRef = useRef(false);

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

    // Track session start
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

    currentStorage.events.push(sessionEvent);
    saveAnalytics(currentStorage);
    setStorage(currentStorage);

    if (DEBUG_MODE) {
      log.info('Session started', sessionEvent.properties);
    }
  }, [accessLevel]);

  // Core tracking function
  const track = useCallback((
    eventName: string,
    properties: Record<string, any>
  ) => {
    // Only track for admins during testing phase
    if (ADMIN_ONLY_MODE && accessLevel !== 'admin') {
      return;
    }

    setStorage(prev => {
      const newStorage = { ...prev };
      const event = {
        event: eventName,
        timestamp: Date.now(),
        sessionId: getSessionId(),
        accessLevel: accessLevel || 'guest',
        properties,
      } as AnalyticsEvent;

      newStorage.events = [...prev.events, event];

      // Update metrics based on event type
      switch (eventName) {
        case 'cotizacion_exported':
          newStorage.metrics = { ...prev.metrics, totalCotizaciones: prev.metrics.totalCotizaciones + 1 };
          break;
        case 'product_favorited':
          if ((properties as any).action === 'add') {
            newStorage.metrics = { ...prev.metrics, totalFavorites: prev.metrics.totalFavorites + 1 };
          }
          break;
        case 'comparison_viewed':
          newStorage.metrics = { ...prev.metrics, totalComparisons: prev.metrics.totalComparisons + 1 };
          break;
      }

      // Update achievement progress
      const progress = { ...prev.achievements.progress };
      switch (eventName) {
        case 'filter_saved':
          progress.filters_saved = (progress.filters_saved || 0) + 1;
          break;
        case 'product_favorited':
          if ((properties as any).action === 'add') {
            progress.favorites_added = (progress.favorites_added || 0) + 1;
          }
          break;
        case 'comparison_viewed':
          progress.comparisons_made = (progress.comparisons_made || 0) + 1;
          break;
        case 'product_engaged':
          progress.products_viewed = (progress.products_viewed || 0) + 1;
          break;
        case 'cotizacion_exported':
          progress.cotizaciones_exported = (progress.cotizaciones_exported || 0) + 1;
          if ((properties as any).time_to_complete < 300) {
            progress.cotizacion_time = (properties as any).time_to_complete;
          }
          break;
        case 'simulator_factors_adjusted':
          progress.simulations_completed = (progress.simulations_completed || 0) + 1;
          break;
        case 'oracle_viewed':
          progress.oracle_streak = prev.metrics.streak;
          break;
        case 'ambassador_profile_viewed':
          progress.ambassador_profiles_viewed = (progress.ambassador_profiles_viewed || 0) + 1;
          break;
      }
      progress.daily_streak = prev.metrics.streak;

      newStorage.achievements = { ...prev.achievements, progress };

      saveAnalytics(newStorage);

      if (DEBUG_MODE) {
        log.info(`📊 ${eventName}`, properties);
      }

      return newStorage;
    });
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

    setStorage(prev => {
      const newStorage = { ...prev };
      let totalXpGained = 0;

      for (const achievement of ACHIEVEMENTS) {
        if (prev.achievements.unlocked.includes(achievement.id)) continue;

        const progress = prev.achievements.progress[achievement.condition.metric] || 0;
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
          newStorage.achievements = {
            ...newStorage.achievements,
            unlocked: [...newStorage.achievements.unlocked, achievement.id],
            totalXp: newStorage.achievements.totalXp + achievement.xp,
          };
          totalXpGained += achievement.xp;
          newlyUnlocked.push(achievement);

          if (DEBUG_MODE) {
            log.info(`🏆 Achievement unlocked: ${achievement.name}`);
          }
        }
      }

      if (newlyUnlocked.length > 0) {
        newStorage.achievements.level = getLevelFromXp(newStorage.achievements.totalXp).level;
        saveAnalytics(newStorage);

        // Show the first newly unlocked achievement
        setRecentAchievement(newlyUnlocked[0]);
      }

      return newlyUnlocked.length > 0 ? newStorage : prev;
    });

    return newlyUnlocked;
  }, []);

  // Get progress for specific achievement
  const getAchievementProgress = useCallback((achievementId: string): number => {
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) return 0;

    const progress = storage.achievements.progress[achievement.condition.metric] || 0;
    return Math.min((progress / achievement.condition.target) * 100, 100);
  }, [storage.achievements.progress]);

  // Dismiss achievement toast
  const dismissAchievement = useCallback(() => {
    setRecentAchievement(null);
  }, []);

  // Session duration
  const getSessionDuration = useCallback((): number => {
    return Math.floor((Date.now() - sessionStartRef.current) / 1000);
  }, []);

  // Export analytics for debugging
  const exportAnalytics = useCallback((): AnalyticsStorage => {
    return storage;
  }, [storage]);

  // Clear all analytics
  const clearAnalytics = useCallback(() => {
    const emptyStorage: AnalyticsStorage = {
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
    localStorage.removeItem(STORAGE_KEY);
    setStorage(emptyStorage);
    log.info('Analytics cleared');
  }, []);

  // Get unlocked achievements as objects
  const unlockedAchievements = ACHIEVEMENTS.filter(a =>
    storage.achievements.unlocked.includes(a.id)
  );

  // Level info
  const levelInfo = getLevelFromXp(storage.achievements.totalXp);

  // Calculate total product views from progress
  const totalProductViews = storage.achievements.progress.products_viewed || 0;

  const value: TrackingContextType = {
    track,
    trackPageView,
    achievements: storage.achievements,
    unlockedAchievements,
    recentAchievement,
    dismissAchievement,
    checkAchievements,
    getAchievementProgress,
    ACHIEVEMENTS,
    levelInfo,
    metrics: { ...storage.metrics, totalProductViews },
    getSessionDuration,
    exportAnalytics,
    clearAnalytics,
  };

  return (
    <TrackingContext.Provider value={value}>
      {children}
    </TrackingContext.Provider>
  );
};

export default TrackingProvider;
