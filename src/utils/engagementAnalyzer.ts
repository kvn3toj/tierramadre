/**
 * Engagement Analyzer - Tierra Madre Studio
 *
 * Calculates DAU, average session time, and 7-day retention
 * per feature area for the engagement heatmap visualization.
 */

import type {
  AnalyticsEvent,
  FeatureArea,
  FeatureEngagement,
  EngagementHeatmapData,
} from '../types/analytics';

// =============================================================================
// FEATURE DEFINITIONS
// =============================================================================

export const FEATURE_AREAS: FeatureArea[] = [
  {
    id: 'treasure',
    name: 'Treasure Browser',
    icon: '💎',
    pagePathPatterns: ['/treasure', '/product'],
    eventPatterns: [
      'treasure_view',
      'treasure_filter_applied',
      'treasure_entry_point',
      'product_clicked',
      'product_engaged',
      'product_favorited',
      'product_comparison_added',
      'comparison_viewed',
      'filter_saved',
    ],
    color: '#00AE7A',
  },
  {
    id: 'cotizacion',
    name: 'Cotizacion',
    icon: '📋',
    pagePathPatterns: ['/cotizacion', '/accounts'],
    eventPatterns: [
      'cotizacion_started',
      'cotizacion_client_info_complete',
      'cotizacion_product_added',
      'cotizacion_investment_set',
      'cotizacion_discount_applied',
      'cotizacion_exported',
      'cotizacion_printed',
    ],
    color: '#D4AF37',
  },
  {
    id: 'oracle',
    name: 'Oracle',
    icon: '🔮',
    pagePathPatterns: ['/home', '/oracle'],
    eventPatterns: ['oracle_viewed', 'oracle_saved', 'oracle_shared'],
    color: '#8B5CF6',
  },
  {
    id: 'simulator',
    name: 'Simulator',
    icon: '🧮',
    pagePathPatterns: ['/simulator'],
    eventPatterns: [
      'simulator_started',
      'simulator_factors_adjusted',
      'simulator_to_quotation',
    ],
    color: '#3B82F6',
  },
  {
    id: 'recibos',
    name: 'Recibos',
    icon: '🧾',
    pagePathPatterns: ['/receipt', '/recibo'],
    eventPatterns: ['receipt_started', 'receipt_exported'],
    color: '#10B981',
  },
  {
    id: 'embajadores',
    name: 'Embajadores',
    icon: '🤝',
    pagePathPatterns: ['/ambassadors', '/embajador'],
    eventPatterns: ['ambassador_profile_viewed', 'ambassadors_viewed'],
    color: '#F59E0B',
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get unique sessions from events
 */
function getUniqueSessions(events: AnalyticsEvent[]): Set<string> {
  return new Set(events.map((e) => e.sessionId));
}

/**
 * Calculate average time spent on feature
 * Uses time_on_page from product_engaged events and
 * time_to_complete from cotizacion/receipt events,
 * or estimates from session event timestamps
 */
function calculateAvgTime(events: AnalyticsEvent[]): number {
  const explicitTimes: number[] = [];

  events.forEach((e) => {
    const props = e.properties as Record<string, unknown>;
    if (props?.time_on_page && typeof props.time_on_page === 'number') {
      explicitTimes.push(props.time_on_page);
    }
    if (props?.time_to_complete && typeof props.time_to_complete === 'number') {
      explicitTimes.push(props.time_to_complete);
    }
  });

  if (explicitTimes.length > 0) {
    return explicitTimes.reduce((a, b) => a + b, 0) / explicitTimes.length;
  }

  // Fallback: estimate from event timestamps per session
  const sessionEvents: Record<string, number[]> = {};
  events.forEach((e) => {
    if (!sessionEvents[e.sessionId]) {
      sessionEvents[e.sessionId] = [];
    }
    sessionEvents[e.sessionId].push(e.timestamp);
  });

  const sessionDurations: number[] = [];
  Object.values(sessionEvents).forEach((timestamps) => {
    if (timestamps.length >= 2) {
      const sorted = timestamps.sort((a, b) => a - b);
      const duration = (sorted[sorted.length - 1] - sorted[0]) / 1000;
      if (duration > 0 && duration < 3600) {
        sessionDurations.push(duration);
      }
    }
  });

  if (sessionDurations.length > 0) {
    return sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length;
  }

  return 0;
}

/**
 * Calculate 7-day retention rate
 * Retention = % of sessions that appeared on multiple days
 */
function calculate7DayRetention(events: AnalyticsEvent[]): number {
  if (events.length === 0) return 0;

  // Track first appearance day per session
  const firstSeenDay: Record<string, string> = {};
  const allSessions = new Set<string>();
  const returningSessions = new Set<string>();

  events.forEach((e) => {
    const day = new Date(e.timestamp).toISOString().split('T')[0];
    if (!firstSeenDay[e.sessionId]) {
      firstSeenDay[e.sessionId] = day;
      allSessions.add(e.sessionId);
    } else if (firstSeenDay[e.sessionId] !== day) {
      returningSessions.add(e.sessionId);
    }
  });

  if (allSessions.size === 0) return 0;
  return (returningSessions.size / allSessions.size) * 100;
}

/**
 * Calculate heat intensity based on engagement metrics
 */
function calculateHeatIntensity(
  dau: number,
  avgTime: number,
  retention: number,
  maxDau: number
): number {
  // Weighted score: 40% DAU, 30% time, 30% retention
  const dauScore = maxDau > 0 ? (dau / maxDau) * 100 : 0;
  const timeScore = Math.min(100, (avgTime / 600) * 100); // 10min = 100%
  const retentionScore = retention;

  return Math.round(dauScore * 0.4 + timeScore * 0.3 + retentionScore * 0.3);
}

/**
 * Format seconds to human-readable time
 */
function formatTime(seconds: number): string {
  if (seconds === 0) return '0s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}min ${secs}s` : `${mins}min`;
}

/**
 * Check if an event matches a feature area
 */
function eventMatchesFeature(
  event: AnalyticsEvent,
  feature: FeatureArea
): boolean {
  // Check if event name matches feature patterns
  const matchesEvent = feature.eventPatterns.some(
    (pattern) => event.event === pattern
  );

  if (matchesEvent) return true;

  // Check if page_view matches feature paths
  if (event.event === 'page_view') {
    const props = event.properties as Record<string, unknown>;
    const path = (props?.page_path || '') as string;
    return feature.pagePathPatterns.some((p) => path.includes(p));
  }

  return false;
}

// =============================================================================
// MAIN ANALYSIS FUNCTION
// =============================================================================

/**
 * Analyze engagement data for all feature areas
 */
export function analyzeEngagement(
  events: AnalyticsEvent[],
  dateRange?: { start: number; end: number }
): EngagementHeatmapData {
  const now = Date.now();
  const defaultStart = now - 7 * 24 * 60 * 60 * 1000; // 7 days ago

  const range = {
    start: dateRange?.start || defaultStart,
    end: dateRange?.end || now,
    days: 7,
  };

  // Filter events by date range
  const filteredEvents = events.filter(
    (e) => e.timestamp >= range.start && e.timestamp <= range.end
  );

  // Group events by feature
  const eventsByFeature: Record<string, AnalyticsEvent[]> = {};
  FEATURE_AREAS.forEach((f) => {
    eventsByFeature[f.id] = [];
  });

  filteredEvents.forEach((event) => {
    FEATURE_AREAS.forEach((feature) => {
      if (eventMatchesFeature(event, feature)) {
        eventsByFeature[feature.id].push(event);
      }
    });
  });

  // First pass: calculate DAU to find max
  let maxDau = 0;
  FEATURE_AREAS.forEach((feature) => {
    const featureEvents = eventsByFeature[feature.id];
    const uniqueSessions = getUniqueSessions(featureEvents);
    const dau = uniqueSessions.size;
    if (dau > maxDau) maxDau = dau;
  });

  // Second pass: calculate all metrics
  const featureEngagements: FeatureEngagement[] = FEATURE_AREAS.map(
    (feature) => {
      const featureEvents = eventsByFeature[feature.id];
      const uniqueSessions = getUniqueSessions(featureEvents);
      const dau = uniqueSessions.size;
      const avgTimeSeconds = calculateAvgTime(featureEvents);
      const retentionRate = calculate7DayRetention(featureEvents);

      return {
        featureId: feature.id,
        featureName: feature.name,
        icon: feature.icon,
        color: feature.color,
        dau,
        dauTrend: 'neutral' as const,
        avgTimeSeconds,
        avgTimeFormatted: formatTime(avgTimeSeconds),
        timeTrend: 'neutral' as const,
        retentionRate: Math.round(retentionRate),
        retentionTrend: 'neutral' as const,
        totalEvents: featureEvents.length,
        heatIntensity: calculateHeatIntensity(
          dau,
          avgTimeSeconds,
          retentionRate,
          maxDau
        ),
      };
    }
  );

  // Sort by heat intensity (most engaged first)
  featureEngagements.sort((a, b) => b.heatIntensity - a.heatIntensity);

  // Calculate totals
  const totalDau = new Set(filteredEvents.map((e) => e.sessionId)).size;
  const avgRetention =
    featureEngagements.length > 0
      ? featureEngagements.reduce((sum, f) => sum + f.retentionRate, 0) /
        featureEngagements.length
      : 0;

  return {
    features: featureEngagements,
    dateRange: range,
    totalDau,
    avgRetention: Math.round(avgRetention),
    generatedAt: now,
  };
}
