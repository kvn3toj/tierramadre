/**
 * Analytics Types - Tierra Madre Studio
 *
 * Type definitions for the tracking system.
 * Based on the funnel strategy document.
 */

// =============================================================================
// BASE EVENT TYPES
// =============================================================================

export interface BaseEvent {
  timestamp: number;
  sessionId: string;
  userId?: string;
  accessLevel: 'guest' | 'asesor' | 'embajador' | 'admin' | 'provider';
}

// =============================================================================
// DISCOVERY FUNNEL EVENTS
// =============================================================================

export interface TreasureEntryPointEvent extends BaseEvent {
  event: 'treasure_entry_point';
  properties: {
    source: 'carousel' | 'hero_cta' | 'tab_nav' | 'direct_link';
    category?: string;
  };
}

export interface TreasureViewEvent extends BaseEvent {
  event: 'treasure_view';
  properties: {
    total_items: number;
    view_mode: 'grid' | 'list';
  };
}

export interface TreasureFilterAppliedEvent extends BaseEvent {
  event: 'treasure_filter_applied';
  properties: {
    filter_type: 'color' | 'quality' | 'shape' | 'price' | 'type' | 'coleccion' | 'cantidad';
    filter_value: string;
    filters_count: number;
    results_count: number;
  };
}

export interface FilterSavedEvent extends BaseEvent {
  event: 'filter_saved';
  properties: {
    filter_name: string;
    criteria_count: number;
  };
}

export interface ProductClickedEvent extends BaseEvent {
  event: 'product_clicked';
  properties: {
    item_id: number;
    item_name: string;
    position_in_list: number;
    filters_active: boolean;
    view_mode: 'grid' | 'list';
  };
}

export interface ProductEngagedEvent extends BaseEvent {
  event: 'product_engaged';
  properties: {
    item_id: number;
    time_on_page: number;
    gallery_interactions: number;
    qr_scanned: boolean;
  };
}

export interface ProductFavoritedEvent extends BaseEvent {
  event: 'product_favorited';
  properties: {
    item_id: number;
    favorites_count: number;
    action: 'add' | 'remove';
  };
}

export interface ProductComparisonAddedEvent extends BaseEvent {
  event: 'product_comparison_added';
  properties: {
    item_id: number;
    comparison_size: number;
  };
}

export interface ComparisonViewedEvent extends BaseEvent {
  event: 'comparison_viewed';
  properties: {
    products_count: number;
    product_ids: number[];
  };
}

// =============================================================================
// COTIZACION FUNNEL EVENTS
// =============================================================================

export interface CotizacionStartedEvent extends BaseEvent {
  event: 'cotizacion_started';
  properties: {
    entry_source: 'accounts_hub' | 'direct_link' | 'product_detail';
  };
}

export interface CotizacionClientInfoCompleteEvent extends BaseEvent {
  event: 'cotizacion_client_info_complete';
  properties: {
    has_phone: boolean;
    has_email: boolean;
    has_document: boolean;
    asesor_selected: string;
  };
}

export interface CotizacionProductAddedEvent extends BaseEvent {
  event: 'cotizacion_product_added';
  properties: {
    product_id: number | null;
    product_name: string;
    product_price: number;
    entry_mode: 'inventory' | 'manual';
    products_count: number;
  };
}

export interface CotizacionInvestmentSetEvent extends BaseEvent {
  event: 'cotizacion_investment_set';
  properties: {
    total_investment: number;
    has_custom_costs: boolean;
  };
}

export interface CotizacionDiscountAppliedEvent extends BaseEvent {
  event: 'cotizacion_discount_applied';
  properties: {
    discount_percent: number;
    discount_amount: number;
  };
}

export interface CotizacionExportedEvent extends BaseEvent {
  event: 'cotizacion_exported';
  properties: {
    quotation_number: string;
    products_count: number;
    total_amount: number;
    has_discount: boolean;
    time_to_complete: number; // seconds
  };
}

export interface CotizacionPrintedEvent extends BaseEvent {
  event: 'cotizacion_printed';
  properties: {
    quotation_number: string;
  };
}

// =============================================================================
// SIMULATOR FUNNEL EVENTS
// =============================================================================

export interface SimulatorStartedEvent extends BaseEvent {
  event: 'simulator_started';
  properties: {
    entry_source: 'accounts_hub' | 'direct_link';
  };
}

export interface SimulatorFactorsAdjustedEvent extends BaseEvent {
  event: 'simulator_factors_adjusted';
  properties: {
    factors_changed: string[];
    final_price: number;
    adjustments_count: number;
  };
}

export interface SimulatorToQuotationEvent extends BaseEvent {
  event: 'simulator_to_quotation';
  properties: {
    simulated_price: number;
    factors_used: string[];
  };
}

// =============================================================================
// RECEIPT FUNNEL EVENTS
// =============================================================================

export interface ReceiptStartedEvent extends BaseEvent {
  event: 'receipt_started';
  properties: {
    entry_source: 'accounts_hub' | 'direct_link';
  };
}

export interface ReceiptExportedEvent extends BaseEvent {
  event: 'receipt_exported';
  properties: {
    receipt_number: string;
    total_amount: number;
    time_to_complete: number;
  };
}

// =============================================================================
// ENGAGEMENT EVENTS
// =============================================================================

export interface OracleViewedEvent extends BaseEvent {
  event: 'oracle_viewed';
  properties: {
    content_id: string;
    content_type: 'daily_emerald' | 'knowledge' | 'meditation';
  };
}

export interface AmbassadorProfileViewedEvent extends BaseEvent {
  event: 'ambassador_profile_viewed';
  properties: {
    ambassador_slug: string;
    ambassador_name: string;
    entry_source: 'list' | 'product' | 'direct_link';
  };
}

// =============================================================================
// SESSION EVENTS
// =============================================================================

export interface SessionStartEvent extends BaseEvent {
  event: 'session_start';
  properties: {
    is_returning: boolean;
    days_since_last_visit: number;
    device_type: 'mobile' | 'tablet' | 'desktop';
    is_pwa: boolean;
  };
}

export interface PageViewEvent extends BaseEvent {
  event: 'page_view';
  properties: {
    page_path: string;
    page_title: string;
    referrer_path?: string;
  };
}

// =============================================================================
// ACHIEVEMENT EVENTS
// =============================================================================

export interface AchievementUnlockedEvent extends BaseEvent {
  event: 'achievement_unlocked';
  properties: {
    achievement_id: string;
    achievement_name: string;
    xp_earned: number;
    new_level?: number;
  };
}

// =============================================================================
// UNION TYPES
// =============================================================================

export type DiscoveryEvent =
  | TreasureEntryPointEvent
  | TreasureViewEvent
  | TreasureFilterAppliedEvent
  | FilterSavedEvent
  | ProductClickedEvent
  | ProductEngagedEvent
  | ProductFavoritedEvent
  | ProductComparisonAddedEvent
  | ComparisonViewedEvent;

export type CotizacionEvent =
  | CotizacionStartedEvent
  | CotizacionClientInfoCompleteEvent
  | CotizacionProductAddedEvent
  | CotizacionInvestmentSetEvent
  | CotizacionDiscountAppliedEvent
  | CotizacionExportedEvent
  | CotizacionPrintedEvent;

export type SimulatorEvent =
  | SimulatorStartedEvent
  | SimulatorFactorsAdjustedEvent
  | SimulatorToQuotationEvent;

export type ReceiptEvent =
  | ReceiptStartedEvent
  | ReceiptExportedEvent;

export type EngagementEvent =
  | OracleViewedEvent
  | AmbassadorProfileViewedEvent;

export type SessionEvent =
  | SessionStartEvent
  | PageViewEvent;

export type GamificationEvent = AchievementUnlockedEvent;

export type AnalyticsEvent =
  | DiscoveryEvent
  | CotizacionEvent
  | SimulatorEvent
  | ReceiptEvent
  | EngagementEvent
  | SessionEvent
  | GamificationEvent;

// =============================================================================
// TRACKING CONTEXT
// =============================================================================

export interface TrackingContext {
  sessionId: string;
  userId?: string;
  accessLevel: 'guest' | 'asesor' | 'embajador' | 'admin' | 'provider';
  sessionStartTime: number;
}

// =============================================================================
// ACHIEVEMENT DEFINITIONS
// =============================================================================

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
  category: 'discovery' | 'cotizacion' | 'simulator' | 'engagement' | 'streak';
  condition: {
    type: 'count' | 'streak' | 'time' | 'percentage';
    target: number;
    metric: string;
  };
}

export interface UserAchievements {
  unlocked: string[];
  progress: Record<string, number>;
  totalXp: number;
  level: number;
}

// =============================================================================
// ANALYTICS STORAGE
// =============================================================================

export interface AnalyticsStorage {
  events: AnalyticsEvent[];
  achievements: UserAchievements;
  metrics: {
    totalSessions: number;
    totalCotizaciones: number;
    totalFavorites: number;
    totalComparisons: number;
    lastVisit: number;
    streak: number;
  };
}

// =============================================================================
// FUNNEL ANALYSIS TYPES
// =============================================================================

export interface FunnelStep {
  id: string;
  name: string;
  event: string;
  count: number;
  percentage: number;
  dropOffRate: number;
  avgTimeToNext?: number; // seconds
}

export interface FunnelDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  steps: {
    id: string;
    name: string;
    event: string;
  }[];
  targets: {
    completionRate: number;
    avgTimeToComplete?: number;
  };
}

export interface FunnelAnalysis {
  funnel: FunnelDefinition;
  steps: FunnelStep[];
  totalEntries: number;
  totalCompletions: number;
  completionRate: number;
  avgTimeToComplete: number;
  isOnTarget: boolean;
  criticalDropOff?: {
    stepFrom: string;
    stepTo: string;
    dropOffRate: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface FrictionPoint {
  id: string;
  funnel: string;
  step: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  issue: string;
  recommendation: string;
  impact: string;
  metric: number;
  threshold: number;
}

export interface UXInsight {
  id: string;
  type: 'quick_win' | 'improvement' | 'critical_fix' | 'optimization';
  title: string;
  description: string;
  funnel: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedImpact: string;
  dataEvidence: string;
}

// =============================================================================
// ENGAGEMENT HEATMAP TYPES
// =============================================================================

/**
 * Feature area definition for heatmap analysis
 */
export interface FeatureArea {
  id: string;
  name: string;
  icon: string;
  pagePathPatterns: string[];
  eventPatterns: string[];
  color: string;
}

/**
 * Engagement metrics for a single feature
 */
export interface FeatureEngagement {
  featureId: string;
  featureName: string;
  icon: string;
  color: string;
  dau: number;
  dauTrend: 'up' | 'down' | 'neutral';
  avgTimeSeconds: number;
  avgTimeFormatted: string;
  timeTrend: 'up' | 'down' | 'neutral';
  retentionRate: number;
  retentionTrend: 'up' | 'down' | 'neutral';
  totalEvents: number;
  heatIntensity: number;
}

/**
 * Aggregated heatmap data
 */
export interface EngagementHeatmapData {
  features: FeatureEngagement[];
  dateRange: {
    start: number;
    end: number;
    days: number;
  };
  totalDau: number;
  avgRetention: number;
  generatedAt: number;
}
