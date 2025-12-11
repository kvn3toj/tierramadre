/**
 * useAnalytics Hook
 *
 * Tracks user interactions and engagement metrics.
 * Stores data locally and provides insights for the gamification system.
 *
 * Designed by: Steve (Data Architecture) + Nira (Analytics)
 */

import { useCallback, useEffect, useRef } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface AnalyticsEvent {
  type: EventType;
  category: EventCategory;
  action: string;
  label?: string;
  value?: number;
  timestamp: number;
  sessionId: string;
  metadata?: Record<string, unknown>;
}

export type EventType =
  | 'page_view'
  | 'interaction'
  | 'engagement'
  | 'conversion'
  | 'error';

export type EventCategory =
  | 'navigation'
  | 'oracle'
  | 'meditation'
  | 'inventory'
  | 'knowledge'
  | 'gamification'
  | 'share'
  | 'system'
  | 'engagement';

export interface SessionMetrics {
  sessionId: string;
  startTime: number;
  pageViews: number;
  interactions: number;
  timeOnPage: number;
  scrollDepth: number;
  engagementScore: number;
}

export interface AnalyticsActions {
  /** Track a custom event */
  trackEvent: (
    category: EventCategory,
    action: string,
    label?: string,
    value?: number,
    metadata?: Record<string, unknown>
  ) => void;
  /** Track page view */
  trackPageView: (pageName: string) => void;
  /** Track time spent on section */
  trackTimeOnSection: (sectionId: string, duration: number) => void;
  /** Track scroll depth */
  trackScrollDepth: (depth: number) => void;
  /** Track engagement */
  trackEngagement: (action: string, points: number) => void;
  /** Get session metrics */
  getSessionMetrics: () => SessionMetrics;
  /** Get all events (for debugging) */
  getEvents: () => AnalyticsEvent[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = 'tierra-madre-analytics';
const SESSION_KEY = 'tierra-madre-session';
const MAX_EVENTS = 1000;

// Engagement weights
const ENGAGEMENT_WEIGHTS = {
  page_view: 1,
  scroll: 0.5,
  interaction: 2,
  share: 5,
  save: 3,
  meditation_complete: 10,
  achievement: 15,
};

// =============================================================================
// HELPERS
// =============================================================================

const generateSessionId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const getOrCreateSession = (): { sessionId: string; startTime: number } => {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore
  }

  const session = {
    sessionId: generateSessionId(),
    startTime: Date.now(),
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
};

const loadEvents = (): AnalyticsEvent[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveEvents = (events: AnalyticsEvent[]) => {
  try {
    // Keep only the last MAX_EVENTS
    const trimmed = events.slice(-MAX_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('[Analytics] Failed to save events:', e);
  }
};

// =============================================================================
// HOOK
// =============================================================================

export const useAnalytics = (): AnalyticsActions => {
  const sessionRef = useRef(getOrCreateSession());
  const eventsRef = useRef<AnalyticsEvent[]>(loadEvents());
  const metricsRef = useRef<SessionMetrics>({
    sessionId: sessionRef.current.sessionId,
    startTime: sessionRef.current.startTime,
    pageViews: 0,
    interactions: 0,
    timeOnPage: 0,
    scrollDepth: 0,
    engagementScore: 0,
  });

  // Track scroll depth
  useEffect(() => {
    let maxScrollDepth = 0;

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const currentDepth = scrollHeight > 0
        ? Math.round((window.scrollY / scrollHeight) * 100)
        : 0;

      if (currentDepth > maxScrollDepth) {
        maxScrollDepth = currentDepth;
        metricsRef.current.scrollDepth = maxScrollDepth;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update time on page
  useEffect(() => {
    const interval = setInterval(() => {
      metricsRef.current.timeOnPage = Date.now() - sessionRef.current.startTime;
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Save events on unmount
  useEffect(() => {
    return () => {
      saveEvents(eventsRef.current);
    };
  }, []);

  // Track event
  const trackEvent = useCallback((
    category: EventCategory,
    action: string,
    label?: string,
    value?: number,
    metadata?: Record<string, unknown>
  ) => {
    const event: AnalyticsEvent = {
      type: 'interaction',
      category,
      action,
      label,
      value,
      timestamp: Date.now(),
      sessionId: sessionRef.current.sessionId,
      metadata,
    };

    eventsRef.current.push(event);
    metricsRef.current.interactions++;

    // Update engagement score
    const weight = ENGAGEMENT_WEIGHTS[action as keyof typeof ENGAGEMENT_WEIGHTS] || 1;
    metricsRef.current.engagementScore += weight * (value || 1);

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', { category, action, label, value });
    }

    // Batch save (every 10 events)
    if (eventsRef.current.length % 10 === 0) {
      saveEvents(eventsRef.current);
    }
  }, []);

  // Track page view
  const trackPageView = useCallback((pageName: string) => {
    const event: AnalyticsEvent = {
      type: 'page_view',
      category: 'navigation',
      action: 'view',
      label: pageName,
      timestamp: Date.now(),
      sessionId: sessionRef.current.sessionId,
    };

    eventsRef.current.push(event);
    metricsRef.current.pageViews++;
    metricsRef.current.engagementScore += ENGAGEMENT_WEIGHTS.page_view;
  }, []);

  // Track time on section
  const trackTimeOnSection = useCallback((sectionId: string, duration: number) => {
    trackEvent('engagement', 'time_on_section', sectionId, Math.round(duration / 1000), {
      durationMs: duration,
    });
  }, [trackEvent]);

  // Track scroll depth
  const trackScrollDepth = useCallback((depth: number) => {
    trackEvent('engagement', 'scroll', undefined, depth);
    metricsRef.current.engagementScore += ENGAGEMENT_WEIGHTS.scroll;
  }, [trackEvent]);

  // Track engagement
  const trackEngagement = useCallback((action: string, points: number) => {
    trackEvent('gamification', action, undefined, points);
    metricsRef.current.engagementScore += points;
  }, [trackEvent]);

  // Get session metrics
  const getSessionMetrics = useCallback((): SessionMetrics => {
    return { ...metricsRef.current };
  }, []);

  // Get all events
  const getEvents = useCallback((): AnalyticsEvent[] => {
    return [...eventsRef.current];
  }, []);

  return {
    trackEvent,
    trackPageView,
    trackTimeOnSection,
    trackScrollDepth,
    trackEngagement,
    getSessionMetrics,
    getEvents,
  };
};

export default useAnalytics;
