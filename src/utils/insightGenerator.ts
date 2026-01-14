/**
 * Insight Generator Utility
 *
 * Client-side AI recommendation engine that analyzes analytics data
 * and generates actionable insights for the dashboard.
 *
 * Designed by ARIA - Capitana del Concilio de Creacion
 */

import type { InsightType } from '../components/analytics/InsightCard';

// =============================================================================
// TYPES
// =============================================================================

export interface AnalyticsData {
  metrics: {
    totalCotizaciones: number;
    totalProductViews: number;
    streak: number;
    totalSessions?: number;
  };
  viewStats: {
    totalViews: number;
    todayViews: number;
    weekViews: number;
    uniqueProducts: number;
    uniqueViewers: number;
    loggedInViews: number;
    guestViews: number;
  } | null;
  topProducts: Array<{
    itemId: string | number;
    productName: string;
    views: number;
  }>;
  topViewers: Array<{
    name: string;
    email?: string | null;
    views: number;
  }>;
  totalProductCount?: number;
}

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  priority: number;
  metric?: {
    value: string | number;
    label: string;
  };
}

// =============================================================================
// INSIGHT RULES
// =============================================================================

const generateLowViewsInsight = (data: AnalyticsData): Insight | null => {
  if (!data.viewStats || data.viewStats.weekViews === 0) return null;

  const avgDailyViews = data.viewStats.weekViews / 7;
  const todayViews = data.viewStats.todayViews;

  if (avgDailyViews > 0 && todayViews < avgDailyViews * 0.6) {
    const percentBelow = Math.round((1 - todayViews / avgDailyViews) * 100);
    return {
      id: 'low_views',
      type: 'warning',
      title: 'Actividad por debajo del promedio',
      description: `Las vistas de hoy (${todayViews}) están ${percentBelow}% por debajo del promedio diario. Considera promocionar productos destacados.`,
      priority: 7,
      metric: { value: todayViews, label: 'vistas hoy' },
    };
  }

  return null;
};

const generateNeglectedProductsInsight = (data: AnalyticsData): Insight | null => {
  if (!data.viewStats) return null;

  const totalProducts = data.totalProductCount || 50;
  const productsWithViews = data.viewStats.uniqueProducts;
  const neglectedProducts = totalProducts - productsWithViews;

  if (neglectedProducts > 5) {
    return {
      id: 'neglected_products',
      type: 'opportunity',
      title: 'Productos sin visitas',
      description: `${neglectedProducts} productos no han sido vistos esta semana. Considera destacarlos en el catálogo o crear contenido promocional.`,
      priority: 6,
      metric: { value: neglectedProducts, label: 'productos' },
    };
  }

  return null;
};

const generateHighGuestRatioInsight = (data: AnalyticsData): Insight | null => {
  if (!data.viewStats || data.viewStats.totalViews === 0) return null;

  const guestRatio = data.viewStats.guestViews / data.viewStats.totalViews;

  if (guestRatio > 0.7) {
    return {
      id: 'high_guest_ratio',
      type: 'opportunity',
      title: 'Oportunidad de conversión',
      description: `El ${Math.round(guestRatio * 100)}% de las vistas son de invitados. Invítalos a registrarse para mejorar el seguimiento y engagement.`,
      priority: 5,
      metric: { value: `${Math.round(guestRatio * 100)}%`, label: 'invitados' },
    };
  }

  return null;
};

const generateStreakInsight = (data: AnalyticsData): Insight | null => {
  if (data.metrics.streak >= 7) {
    return {
      id: 'streak_success',
      type: 'success',
      title: 'Racha activa',
      description: `Llevas ${data.metrics.streak} días consecutivos usando la app. ¡Excelente constancia!`,
      priority: 3,
      metric: { value: data.metrics.streak, label: 'días' },
    };
  }

  if (data.metrics.streak === 0) {
    return {
      id: 'streak_lost',
      type: 'warning',
      title: 'Racha perdida',
      description: 'Tu racha se ha reiniciado. Usa la app diariamente para mantener el momentum.',
      priority: 4,
    };
  }

  return null;
};

const generateTopProductInsight = (data: AnalyticsData): Insight | null => {
  if (!data.viewStats || !data.topProducts.length) return null;

  const topProduct = data.topProducts[0];
  const viewShare = topProduct.views / (data.viewStats.totalViews || 1);

  if (viewShare > 0.3) {
    return {
      id: 'top_product_highlight',
      type: 'success',
      title: 'Producto destacado',
      description: `"${topProduct.productName}" concentra el ${Math.round(viewShare * 100)}% de las vistas. Considera crear productos similares.`,
      priority: 4,
      metric: { value: topProduct.views, label: 'vistas' },
    };
  }

  return null;
};

const generateCotizacionInsight = (data: AnalyticsData): Insight | null => {
  if (data.metrics.totalCotizaciones === 0 && data.viewStats && data.viewStats.totalViews > 10) {
    return {
      id: 'no_cotizaciones',
      type: 'critical',
      title: 'Sin cotizaciones',
      description: `Tienes ${data.viewStats.totalViews} vistas pero ninguna cotización exportada. Considera usar la función de cotización para dar seguimiento a clientes.`,
      priority: 8,
    };
  }

  if (data.metrics.totalCotizaciones >= 5) {
    return {
      id: 'cotizaciones_active',
      type: 'success',
      title: 'Cotizaciones activas',
      description: `Has generado ${data.metrics.totalCotizaciones} cotizaciones. ¡Buen trabajo convirtiendo interés en oportunidades!`,
      priority: 3,
      metric: { value: data.metrics.totalCotizaciones, label: 'cotizaciones' },
    };
  }

  return null;
};

const generateEngagementPeakInsight = (data: AnalyticsData): Insight | null => {
  if (!data.viewStats || data.viewStats.todayViews === 0) return null;

  const avgDailyViews = data.viewStats.weekViews / 7;

  if (data.viewStats.todayViews > avgDailyViews * 1.5) {
    return {
      id: 'engagement_peak',
      type: 'success',
      title: 'Pico de engagement',
      description: `Las vistas de hoy superan el promedio en ${Math.round((data.viewStats.todayViews / avgDailyViews - 1) * 100)}%. ¡Aprovecha este momentum!`,
      priority: 6,
      metric: { value: data.viewStats.todayViews, label: 'vistas hoy' },
    };
  }

  return null;
};

const generateViewerDiversityInsight = (data: AnalyticsData): Insight | null => {
  if (!data.viewStats) return null;

  const viewsPerViewer = data.viewStats.uniqueViewers > 0
    ? data.viewStats.totalViews / data.viewStats.uniqueViewers
    : 0;

  if (viewsPerViewer > 5 && data.viewStats.uniqueViewers < 5) {
    return {
      id: 'low_diversity',
      type: 'opportunity',
      title: 'Expandir audiencia',
      description: `Tienes pocos viewers (${data.viewStats.uniqueViewers}) pero alto engagement. Considera estrategias para atraer más usuarios.`,
      priority: 5,
    };
  }

  return null;
};

// =============================================================================
// MAIN GENERATOR
// =============================================================================

export const generateInsights = (data: AnalyticsData, maxInsights: number = 3): Insight[] => {
  const insights: Insight[] = [];

  // Run all insight generators
  const generators = [
    generateLowViewsInsight,
    generateNeglectedProductsInsight,
    generateHighGuestRatioInsight,
    generateStreakInsight,
    generateTopProductInsight,
    generateCotizacionInsight,
    generateEngagementPeakInsight,
    generateViewerDiversityInsight,
  ];

  for (const generator of generators) {
    const insight = generator(data);
    if (insight) {
      insights.push(insight);
    }
  }

  // Sort by priority (higher = more important) and limit
  return insights
    .sort((a, b) => b.priority - a.priority)
    .slice(0, maxInsights);
};

// =============================================================================
// HEALTH-SPECIFIC INSIGHTS
// =============================================================================

export interface HealthScores {
  overall: number;
  cotizacion: number;
  engagement: number;
  retention: number;
  conversion: number;
}

export const generateHealthInsights = (scores: HealthScores): Insight[] => {
  const insights: Insight[] = [];

  // Find the lowest score
  const scoreEntries = [
    { key: 'cotizacion', label: 'Cotizaciones', value: scores.cotizacion },
    { key: 'engagement', label: 'Engagement', value: scores.engagement },
    { key: 'retention', label: 'Retención', value: scores.retention },
    { key: 'conversion', label: 'Conversión', value: scores.conversion },
  ];

  const lowest = scoreEntries.sort((a, b) => a.value - b.value)[0];
  const highest = scoreEntries.sort((a, b) => b.value - a.value)[0];

  // Insight for lowest score
  if (lowest.value < 40) {
    insights.push({
      id: `improve_${lowest.key}`,
      type: 'critical',
      title: `Mejorar ${lowest.label}`,
      description: getImprovementTip(lowest.key, lowest.value),
      priority: 9,
      metric: { value: `${lowest.value}%`, label: 'actual' },
    });
  } else if (lowest.value < 60) {
    insights.push({
      id: `improve_${lowest.key}`,
      type: 'warning',
      title: `Optimizar ${lowest.label}`,
      description: getImprovementTip(lowest.key, lowest.value),
      priority: 7,
      metric: { value: `${lowest.value}%`, label: 'actual' },
    });
  }

  // Insight for highest score
  if (highest.value >= 80) {
    insights.push({
      id: `strength_${highest.key}`,
      type: 'success',
      title: `Fortaleza: ${highest.label}`,
      description: `Tu ${highest.label.toLowerCase()} está excelente. Mantén este nivel y comparte buenas prácticas.`,
      priority: 4,
      metric: { value: `${highest.value}%`, label: 'score' },
    });
  }

  // Overall health insight
  if (scores.overall >= 80) {
    insights.push({
      id: 'health_excellent',
      type: 'success',
      title: 'Salud excelente',
      description: 'Tu negocio muestra indicadores saludables en todas las áreas. ¡Sigue así!',
      priority: 3,
    });
  } else if (scores.overall < 40) {
    insights.push({
      id: 'health_critical',
      type: 'critical',
      title: 'Atención requerida',
      description: 'Varios indicadores necesitan mejora. Enfócate en las métricas más bajas primero.',
      priority: 10,
    });
  }

  return insights.sort((a, b) => b.priority - a.priority).slice(0, 2);
};

const getImprovementTip = (key: string, _value: number): string => {
  const tips: Record<string, string> = {
    cotizacion: 'Usa la función de cotización cuando un cliente muestre interés. Cada cotización es una oportunidad de venta.',
    engagement: 'Comparte más productos en redes sociales y envía el catálogo a clientes potenciales.',
    retention: 'Usa la app diariamente para mantener tu racha. La consistencia mejora los resultados.',
    conversion: 'Haz seguimiento a los clientes que ven productos. Una llamada puede convertir interés en compra.',
  };
  return tips[key] || 'Enfócate en mejorar esta métrica con acciones consistentes.';
};

// =============================================================================
// WEEKLY TREND DATA GENERATOR
// =============================================================================

export interface DailyData {
  date: string;
  value: number;
  label?: string;
}

export const generateWeeklyTrend = (weekViews: number, todayViews: number): DailyData[] => {
  const days = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
  const today = new Date().getDay(); // 0 = Sunday

  // Weekday weights (Mon-Sun): weekdays higher, weekends lower
  const weights = [1.1, 1.2, 1.0, 1.1, 1.3, 0.7, 0.6];
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  const remainingViews = weekViews - todayViews;

  return days.map((day, i) => {
    // Calculate which actual day this represents
    const dayOffset = i - 6; // -6 to 0 (0 = today)
    const actualDayIndex = (today + dayOffset + 7) % 7;
    const isToday = i === 6;

    if (isToday) {
      return { date: day, value: todayViews, label: 'Hoy' };
    }

    // Distribute remaining views based on weights
    const dayWeight = weights[actualDayIndex === 0 ? 6 : actualDayIndex - 1]; // Adjust for Mon=0
    const baseValue = Math.round((remainingViews / 6) * (dayWeight / (totalWeight / 7)));
    // Add some variance
    const variance = Math.round(baseValue * (Math.random() * 0.3 - 0.15));

    return { date: day, value: Math.max(0, baseValue + variance) };
  });
};
