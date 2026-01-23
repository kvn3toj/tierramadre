/**
 * useAnalyticsData Hook
 * Aggregates data from multiple sources for the Analytics Dashboard.
 */

import { useMemo, useCallback } from 'react';
import { useTracking } from '../../../../contexts/TrackingContext';
import { useProductViews } from '../../../../hooks/useProductViews';
import { useCotizacionStats } from '../../../../hooks/useCotizacionStats';
import { alpha } from '@mui/material';
import { emeraldCore, goldAccent, semanticColors } from '../../../../design-system/tokens/colors';
import {
  generateInsights,
  generateHealthInsights,
  generateWeeklyTrend,
  type AnalyticsData,
  type HealthScores,
} from '../../../../utils/insightGenerator';

export interface CombinedActivity {
  id: string;
  type: 'view' | 'cotizacion';
  timestamp: string;
  userName?: string | null;
  productName?: string;
  itemId?: number;
  asesorName?: string;
  clientName?: string;
  productsCount?: number;
}

export interface UserBreakdownSegment {
  id: string;
  label: string;
  value: number;
  color: string;
}

export function useAnalyticsData() {
  const { metrics, achievements, levelInfo, unlockedAchievements, ACHIEVEMENTS, getAchievementProgress, exportAnalytics } = useTracking();

  const {
    stats: viewStats,
    topProducts,
    topViewers,
    recentActivity: recentProductViews,
    isLoading: viewsLoading,
    refetch: refetchViews,
  } = useProductViews();

  const {
    stats: cotizacionStats,
    isLoading: cotizacionLoading,
    refetch: refetchCotizaciones,
  } = useCotizacionStats();

  // Use server-side cotización count (fallback to local metrics if not loaded)
  const totalCotizaciones = cotizacionStats?.totalCotizaciones ?? metrics.totalCotizaciones;
  const weekCotizaciones = cotizacionStats?.weekCotizaciones ?? 0;

  // Generate mock trend data
  const generateTrendData = useCallback((current: number, variance: number = 0.3) => {
    const data: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const factor = 1 - (variance * Math.random()) + (i * 0.05);
      data.push(Math.max(0, Math.round(current * factor)));
    }
    data[6] = current;
    return data;
  }, []);

  // Calculate Health Scores
  const healthScores: HealthScores = useMemo(() => {
    const cotizacion = Math.min(100, Math.round((totalCotizaciones / 10) * 100));
    const weeklyViewsScore = viewStats ? Math.min(100, Math.round((viewStats.weekViews / 50) * 100)) : 0;
    const uniqueProductScore = viewStats ? Math.min(100, Math.round((viewStats.uniqueProducts / 20) * 100)) : 0;
    const engagement = Math.round((weeklyViewsScore + uniqueProductScore) / 2);
    const streakScore = Math.min(100, Math.round((metrics.streak / 7) * 100));
    const sessionsScore = metrics.totalSessions ? Math.min(100, Math.round((metrics.totalSessions / 10) * 100)) : 50;
    const retention = Math.round((streakScore + sessionsScore) / 2);
    const viewToCotizacion = viewStats && viewStats.totalViews > 0
      ? (totalCotizaciones / viewStats.totalViews) * 100
      : 0;
    const conversionTarget = 5;
    const conversion = Math.min(100, Math.round((viewToCotizacion / conversionTarget) * 100));
    const overall = Math.round((cotizacion + engagement + retention + conversion) / 4);
    return { overall, cotizacion, engagement, retention, conversion };
  }, [totalCotizaciones, metrics, viewStats]);

  const healthColor = useMemo(() => {
    if (healthScores.overall >= 80) return semanticColors.success.main;
    if (healthScores.overall >= 60) return goldAccent.primary;
    if (healthScores.overall >= 40) return semanticColors.warning.main;
    return semanticColors.error.main;
  }, [healthScores.overall]);

  // User breakdown for donut chart
  const userBreakdown: UserBreakdownSegment[] = useMemo(() => {
    if (!viewStats) return [];
    return [
      { id: 'logged', label: 'Usuarios', value: viewStats.loggedInViews, color: emeraldCore.primary },
      { id: 'guest', label: 'Invitados', value: viewStats.guestViews, color: alpha(emeraldCore.primary, 0.4) },
    ];
  }, [viewStats]);

  // Combined recent activity from all users
  const combinedActivity: CombinedActivity[] = useMemo(() => {
    const activities: CombinedActivity[] = [];

    if (recentProductViews && recentProductViews.length > 0) {
      for (const view of recentProductViews) {
        activities.push({
          id: `view-${view.timestamp}-${view.itemId}`,
          type: 'view',
          timestamp: view.timestamp,
          userName: view.userName,
          productName: view.productName,
          itemId: view.itemId,
        });
      }
    }

    if (cotizacionStats?.recentCotizaciones && cotizacionStats.recentCotizaciones.length > 0) {
      for (const cot of cotizacionStats.recentCotizaciones) {
        activities.push({
          id: `cot-${cot.quotationNumber}`,
          type: 'cotizacion',
          timestamp: cot.createdAt,
          asesorName: cot.asesorName,
          clientName: cot.clientName,
          productsCount: cot.productsCount,
        });
      }
    }

    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [recentProductViews, cotizacionStats?.recentCotizaciones]);

  // AI Insights
  const analyticsDataForInsights: AnalyticsData = useMemo(() => ({
    metrics: {
      totalCotizaciones: metrics.totalCotizaciones,
      totalProductViews: metrics.totalProductViews,
      streak: metrics.streak,
      totalSessions: metrics.totalSessions,
    },
    viewStats,
    topProducts,
    topViewers,
    totalProductCount: 50,
  }), [metrics, viewStats, topProducts, topViewers]);

  const insights = useMemo(() => generateInsights(analyticsDataForInsights, 2), [analyticsDataForInsights]);
  const healthInsights = useMemo(() => generateHealthInsights(healthScores), [healthScores]);

  // Weekly trend data
  const weeklyTrendData = useMemo(() => {
    if (!viewStats) return [];
    return generateWeeklyTrend(viewStats.weekViews, viewStats.todayViews);
  }, [viewStats]);

  // Export handler
  const handleExport = useCallback(() => {
    const data = exportAnalytics();
    const summary = {
      exportDate: new Date().toISOString(),
      healthScore: healthScores.overall,
      healthBreakdown: healthScores,
      metrics,
      achievements: {
        totalXp: achievements.totalXp,
        level: levelInfo.level,
        levelName: levelInfo.name,
        unlockedCount: unlockedAchievements.length,
      },
      totalEvents: data.events.length,
    };
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [exportAnalytics, healthScores, metrics, achievements, levelInfo, unlockedAchievements]);

  // Refresh handlers
  const handleRefresh = useCallback(() => {
    refetchViews();
    refetchCotizaciones();
  }, [refetchViews, refetchCotizaciones]);

  return {
    // Raw data
    viewStats,
    cotizacionStats,
    topProducts,
    topViewers,
    recentProductViews,
    metrics,

    // Computed data
    totalCotizaciones,
    weekCotizaciones,
    healthScores,
    healthColor,
    userBreakdown,
    combinedActivity,
    insights,
    healthInsights,
    weeklyTrendData,

    // Achievement data
    achievements,
    levelInfo,
    unlockedAchievements,
    ACHIEVEMENTS,
    getAchievementProgress,

    // Utilities
    generateTrendData,
    handleExport,
    handleRefresh,

    // Loading states
    isLoading: viewsLoading || cotizacionLoading,
    viewsLoading,
    cotizacionLoading,
  };
}
