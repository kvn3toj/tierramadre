/**
 * Admin Analytics Dashboard
 *
 * Redesigned with iOS HIG principles:
 * - 4 Tabs: Overview, Products, Users, Health
 * - AI-powered recommendations
 * - Beautiful charts and visualizations
 * - Real-time health score breakdown
 *
 * Designed by ARIA - Capitana del Concilio de Creacion
 */

import React, { useMemo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  alpha,
  LinearProgress,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Eye,
  FileText,
  Download,
  Activity,
  Zap,
  Target,
  RefreshCw,
  User,
  Users,
  UserCheck,
  Package,
  Calendar,
  Clock,
  BarChart3,
  PieChart,
  Heart,
  Sparkles,
  TrendingUp as TrendUp,
  ChevronRight,
  ChevronDown,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { useThemeMode } from '../contexts/ThemeContext';
import { useTracking } from '../contexts/TrackingContext';
import { useProductViews } from '../hooks/useProductViews';
import { useCotizacionStats } from '../hooks/useCotizacionStats';
import { emeraldCore, goldAccent, semanticColors } from '../design-system/tokens/colors';
import { spacing, iosDimensions } from '../design-system/tokens/primitives/spacing';
import { SparklineChart } from '../components/analytics/SparklineChart';
import { HorizontalBarChart } from '../components/analytics/HorizontalBarChart';
import { DonutChart } from '../components/analytics/DonutChart';
import { AreaChart } from '../components/analytics/AreaChart';
import { InsightCard } from '../components/analytics/InsightCard';
import { ProgressBar } from '../components/analytics/ProgressBar';
import { HealthScoreHero } from '../components/analytics/HealthScoreHero';
import {
  generateInsights,
  generateHealthInsights,
  generateWeeklyTrend,
  type AnalyticsData,
  type HealthScores,
} from '../utils/insightGenerator';

// =============================================================================
// iOS HIG STYLED TAB COMPONENT
// =============================================================================

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <Box
    role="tabpanel"
    hidden={value !== index}
    sx={{
      pt: 2,
      animation: value === index ? 'fadeIn 0.2s ease-out' : undefined,
      '@keyframes fadeIn': {
        from: { opacity: 0, transform: 'translateY(4px)' },
        to: { opacity: 1, transform: 'translateY(0)' },
      },
    }}
  >
    {value === index && children}
  </Box>
);

// =============================================================================
// METRIC CARD WITH SPARKLINE
// =============================================================================

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  trend?: { data: number[]; label?: string };
  comparison?: { value: number; label: string };
  subtitle?: string;
  compact?: boolean;
  onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon: Icon,
  color,
  trend,
  comparison,
  subtitle,
  compact = false,
  onClick,
}) => {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: compact ? 2 : 2.5,
        borderRadius: iosDimensions.borderRadiusLarge,
        bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
        border: `1px solid ${alpha(color, 0.15)}`,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 1 : 1.5,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 24px ${alpha(color, 0.12)}`,
        },
      }}
    >
      {/* Header row */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box
          sx={{
            width: compact ? 36 : 44,
            height: compact ? 36 : 44,
            borderRadius: iosDimensions.borderRadiusStandard,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(color, 0.12),
          }}
        >
          <Icon size={compact ? 18 : 22} color={color} />
        </Box>

        {/* Sparkline or comparison */}
        {trend && (
          <SparklineChart
            data={trend.data.map(v => ({ value: v }))}
            width={80}
            height={32}
            color={color}
            showArea={true}
            showTrend={false}
            animated={true}
          />
        )}
      </Box>

      {/* Value */}
      <Typography
        variant={compact ? 'h5' : 'h4'}
        sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.1 }}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Typography>

      {/* Label and comparison */}
      <Box>
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, color: 'text.primary', fontSize: compact ? '0.8rem' : '0.875rem' }}
        >
          {label}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            {subtitle}
          </Typography>
        )}
        {comparison && comparison.value !== 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
            {comparison.value > 0 ? (
              <TrendingUp size={12} color={semanticColors.success.main} />
            ) : (
              <TrendingDown size={12} color={semanticColors.error.main} />
            )}
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: comparison.value > 0 ? semanticColors.success.main : semanticColors.error.main,
              }}
            >
              {comparison.value > 0 ? '+' : ''}{comparison.value}%
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              {comparison.label}
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

// =============================================================================
// SECTION HEADER
// =============================================================================

interface SectionHeaderProps {
  title: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, icon: Icon, action }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {Icon && <Icon size={16} color={emeraldCore.primary} />}
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            fontSize: '0.7rem',
          }}
        >
          {title}
        </Typography>
      </Box>
      {action}
    </Box>
  );
};

// =============================================================================
// GLASS CARD WRAPPER
// =============================================================================

interface GlassCardProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, noPadding = false }) => {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: iosDimensions.borderRadiusLarge,
        bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
        border: `1px solid ${isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1)}`,
        overflow: 'hidden',
        ...(noPadding ? {} : { p: 2.5 }),
      }}
    >
      {children}
    </Paper>
  );
};

// =============================================================================
// ACTIVITY ITEM
// =============================================================================

interface ActivityItemProps {
  icon: React.ReactNode;
  primary: React.ReactNode;
  secondary?: string;
  time: string;
  isLast?: boolean;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ icon, primary, secondary, time, isLast }) => {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        py: 1.5,
        px: 2,
        borderBottom: isLast ? 'none' : `1px solid ${alpha(isLight ? '#000' : '#fff', 0.06)}`,
      }}
    >
      {icon}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            fontSize: '0.8rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {primary}
        </Typography>
        {secondary && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {secondary}
          </Typography>
        )}
      </Box>
      <Typography variant="caption" sx={{ color: 'text.disabled', flexShrink: 0 }}>
        {time}
      </Typography>
    </Box>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const AdminAnalyticsPage: React.FC = () => {
  const { mode } = useThemeMode();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [achievementsExpanded, setAchievementsExpanded] = useState(false);
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
  const isLight = mode === 'light';

  // Generate mock trend data (in real app, this would come from API)
  const generateTrendData = useCallback((current: number, variance: number = 0.3) => {
    const data: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const factor = 1 - (variance * Math.random()) + (i * 0.05);
      data.push(Math.max(0, Math.round(current * factor)));
    }
    data[6] = current;
    return data;
  }, []);

  // Use server-side cotización count (fallback to local metrics if not loaded)
  const totalCotizaciones = cotizacionStats?.totalCotizaciones ?? metrics.totalCotizaciones;
  const weekCotizaciones = cotizacionStats?.weekCotizaciones ?? 0;

  // Calculate Health Scores (real calculations using server-side data)
  const healthScores: HealthScores = useMemo(() => {
    // Cotizacion Score (target: 10 cotizaciones = 100%)
    const cotizacion = Math.min(100, Math.round((totalCotizaciones / 10) * 100));

    // Engagement Score (based on views and unique products)
    const weeklyViewsScore = viewStats ? Math.min(100, Math.round((viewStats.weekViews / 50) * 100)) : 0;
    const uniqueProductScore = viewStats ? Math.min(100, Math.round((viewStats.uniqueProducts / 20) * 100)) : 0;
    const engagement = Math.round((weeklyViewsScore + uniqueProductScore) / 2);

    // Retention Score (based on streak and sessions)
    const streakScore = Math.min(100, Math.round((metrics.streak / 7) * 100));
    const sessionsScore = metrics.totalSessions ? Math.min(100, Math.round((metrics.totalSessions / 10) * 100)) : 50;
    const retention = Math.round((streakScore + sessionsScore) / 2);

    // Conversion Score (cotizaciones per view)
    const viewToCotizacion = viewStats && viewStats.totalViews > 0
      ? (totalCotizaciones / viewStats.totalViews) * 100
      : 0;
    const conversionTarget = 5; // 5% target
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
  const userBreakdown = useMemo(() => {
    if (!viewStats) return [];
    return [
      { id: 'logged', label: 'Usuarios', value: viewStats.loggedInViews, color: emeraldCore.primary },
      { id: 'guest', label: 'Invitados', value: viewStats.guestViews, color: alpha(emeraldCore.primary, 0.4) },
    ];
  }, [viewStats]);

  // Format time ago
  const formatTimeAgo = useCallback((ts: string | number): string => {
    const date = typeof ts === 'string' ? new Date(ts) : new Date(ts);
    const diff = Date.now() - date.getTime();
    if (diff < 60000) return 'Ahora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  }, []);

  // Combined recent activity from all users (server-side data)
  const combinedActivity = useMemo(() => {
    const activities: Array<{
      id: string;
      type: 'view' | 'cotizacion';
      timestamp: string;
      userName?: string | null;
      productName?: string;
      itemId?: number;
      asesorName?: string;
      clientName?: string;
      productsCount?: number;
    }> = [];

    // Add product views from all users
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

    // Add cotizaciones from all users
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

    // Sort by timestamp descending and take top 5
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
    totalProductCount: 50, // Approximate
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

  // Tab content
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ p: spacing.md, pb: 12, maxWidth: 600, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Analytics
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Dashboard de negocio
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Actualizar">
            <IconButton
              onClick={() => { refetchViews(); refetchCotizaciones(); }}
              size="small"
              disabled={viewsLoading || cotizacionLoading}
              sx={{ color: emeraldCore.primary }}
            >
              <RefreshCw size={18} className={(viewsLoading || cotizacionLoading) ? 'animate-spin' : ''} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Exportar">
            <IconButton onClick={handleExport} size="small" sx={{ color: emeraldCore.primary }}>
              <Download size={18} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* iOS-style Segmented Control Tabs - Now 4 tabs */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: iosDimensions.borderRadiusStandard,
          bgcolor: isLight ? alpha('#000', 0.05) : alpha('#fff', 0.08),
          p: 0.5,
          mb: 3,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          TabIndicatorProps={{ sx: { display: 'none' } }}
          sx={{
            minHeight: 36,
            '& .MuiTab-root': {
              minHeight: 32,
              borderRadius: iosDimensions.borderRadiusStandard,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.75rem',
              color: 'text.secondary',
              transition: 'all 0.2s ease',
              py: 0.5,
              px: 1,
              minWidth: 0,
              '&.Mui-selected': {
                color: 'text.primary',
                bgcolor: isLight ? 'background.paper' : alpha('#fff', 0.12),
                boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              },
            },
          }}
        >
          <Tab icon={<BarChart3 size={14} />} iconPosition="start" label="Overview" />
          <Tab icon={<Package size={14} />} iconPosition="start" label="Products" />
          <Tab icon={<Users size={14} />} iconPosition="start" label="Users" />
          <Tab icon={<Heart size={14} />} iconPosition="start" label="Health" />
        </Tabs>
      </Paper>

      {/* ========== TAB: OVERVIEW ========== */}
      <TabPanel value={activeTab} index={0}>
        {/* Hero KPI Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mb: 3 }}>
          <MetricCard
            label="Views Hoy"
            value={viewStats?.todayViews || 0}
            icon={Eye}
            color={emeraldCore.primary}
            comparison={
              viewStats && viewStats.todayViews > 0
                ? { value: Math.round((viewStats.todayViews / Math.max(viewStats.weekViews / 7, 1)) * 100 - 100), label: 'vs promedio' }
                : undefined
            }
            subtitle="Productos vistos"
            compact
          />
          <MetricCard
            label="Cotizaciones"
            value={totalCotizaciones}
            icon={FileText}
            color={goldAccent.primary}
            trend={{ data: generateTrendData(totalCotizaciones) }}
            subtitle={weekCotizaciones > 0 ? `${weekCotizaciones} esta semana` : 'Exportadas'}
            compact
            onClick={() => navigate('/admin/cotizacion-products')}
          />
          <MetricCard
            label="Esta Semana"
            value={viewStats?.weekViews || 0}
            icon={Calendar}
            color="#8B5CF6"
            trend={{ data: generateTrendData(viewStats?.weekViews || 0) }}
            subtitle="Últimos 7 días"
            compact
          />
          <MetricCard
            label="Racha"
            value={`${metrics.streak} días`}
            icon={Zap}
            color="#F59E0B"
            subtitle="Días consecutivos"
            compact
          />
        </Box>

        {/* Weekly Trend Chart */}
        {weeklyTrendData.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <SectionHeader title="Actividad Semanal" icon={TrendUp} />
            <GlassCard>
              <AreaChart
                data={weeklyTrendData}
                height={160}
                color={emeraldCore.primary}
                showXAxis={true}
                showYAxis={true}
                showGrid={true}
                animated={true}
              />
            </GlassCard>
          </Box>
        )}

        {/* AI Recommendations */}
        {insights.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <SectionHeader title="Recomendaciones" icon={Sparkles} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {insights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  type={insight.type}
                  title={insight.title}
                  description={insight.description}
                  metric={insight.metric}
                  compact
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Quick Stats Row */}
        <Box sx={{ mb: 3 }}>
          <SectionHeader title="Resumen Rápido" icon={BarChart3} />
          <GlassCard>
            <Box sx={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: emeraldCore.primary }}>
                  {viewStats?.uniqueProducts || 0}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Productos únicos
                </Typography>
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#8B5CF6' }}>
                  {viewStats?.uniqueViewers || 0}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Viewers
                </Typography>
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: goldAccent.primary }}>
                  {healthScores.overall}%
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Health Score
                </Typography>
              </Box>
            </Box>
          </GlassCard>
        </Box>

        {/* Top Products in Cotizaciones */}
        {cotizacionStats?.topProducts && cotizacionStats.topProducts.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <SectionHeader title="Top Productos Cotizados" icon={FileText} />
            <GlassCard noPadding>
              <HorizontalBarChart
                data={cotizacionStats.topProducts.slice(0, 5).map(p => ({
                  id: p.itemNumber,
                  label: p.name,
                  sublabel: `Item #${p.itemNumber}`,
                  value: p.count,
                }))}
                color={goldAccent.primary}
                showMedals={true}
                unit="cotizaciones"
                onItemClick={(item) => navigate(`/admin/analytics/item/${item.id}`)}
              />
            </GlassCard>
          </Box>
        )}

        {/* Recent Activity (Compact) - All Users */}
        <Box>
          <SectionHeader
            title="Actividad Reciente"
            icon={Activity}
            action={
              <Box
                onClick={() => navigate('/admin/analytics/activity')}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  cursor: 'pointer',
                  color: emeraldCore.primary,
                  '&:hover': { opacity: 0.8 },
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  Ver Todas
                </Typography>
                <ChevronRight size={14} />
              </Box>
            }
          />
          <GlassCard noPadding>
            {combinedActivity.length > 0 ? (
              combinedActivity.map((item, idx) => (
                <ActivityItem
                  key={item.id}
                  icon={
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        bgcolor: item.type === 'view'
                          ? alpha(emeraldCore.primary, 0.12)
                          : alpha(goldAccent.primary, 0.12),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {item.type === 'view' ? (
                        item.userName ? (
                          <UserCheck size={14} color={emeraldCore.primary} />
                        ) : (
                          <User size={14} color={isLight ? '#666' : '#999'} />
                        )
                      ) : (
                        <FileText size={14} color={goldAccent.primary} />
                      )}
                    </Box>
                  }
                  primary={
                    item.type === 'view' ? (
                      <>
                        {item.userName || 'Invitado'} vio{' '}
                        <Typography
                          component="span"
                          sx={{ color: emeraldCore.primary, fontWeight: 600, fontSize: 'inherit' }}
                        >
                          {item.productName}
                        </Typography>
                      </>
                    ) : (
                      <>
                        {item.asesorName} cotizo{' '}
                        <Typography
                          component="span"
                          sx={{ color: goldAccent.primary, fontWeight: 600, fontSize: 'inherit' }}
                        >
                          {item.productsCount} producto{item.productsCount !== 1 ? 's' : ''}
                        </Typography>
                      </>
                    )
                  }
                  secondary={item.type === 'cotizacion' ? `Cliente: ${item.clientName}` : undefined}
                  time={formatTimeAgo(item.timestamp)}
                  isLast={idx === combinedActivity.length - 1}
                />
              ))
            ) : (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Activity size={32} color={alpha(isLight ? '#000' : '#fff', 0.2)} />
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                  Sin actividad registrada
                </Typography>
              </Box>
            )}
          </GlassCard>
        </Box>
      </TabPanel>

      {/* ========== TAB: PRODUCTS ========== */}
      <TabPanel value={activeTab} index={1}>
        {/* Product Stats Summary */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mb: 3 }}>
          <MetricCard
            label="Total Views"
            value={viewStats?.totalViews || 0}
            icon={Eye}
            color={emeraldCore.primary}
            trend={{ data: generateTrendData(viewStats?.totalViews || 0) }}
            compact
          />
          <MetricCard
            label="Productos"
            value={viewStats?.uniqueProducts || 0}
            icon={Package}
            color="#8B5CF6"
            subtitle="Con al menos 1 vista"
            compact
          />
        </Box>

        {/* Top Products Bar Chart */}
        <SectionHeader
          title="Top 10 Productos"
          icon={BarChart3}
        />
        <GlassCard noPadding>
          {topProducts.length > 0 ? (
            <HorizontalBarChart
              data={topProducts.slice(0, 10).map(p => ({
                id: p.itemId,
                label: p.productName,
                sublabel: `Item #${p.itemId}`,
                value: p.views,
              }))}
              color={emeraldCore.primary}
              showMedals={true}
              unit="views"
              onItemClick={(item) => navigate(`/admin/analytics/item/${item.id}`)}
            />
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Package size={32} color={alpha(isLight ? '#000' : '#fff', 0.2)} />
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                No hay datos de productos
              </Typography>
            </Box>
          )}
        </GlassCard>

        {/* Recent Product Views */}
        {recentProductViews.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <SectionHeader title="Vistas Recientes" icon={Clock} />
            <GlassCard noPadding>
              {recentProductViews.slice(0, 8).map((activity, idx) => (
                <ActivityItem
                  key={`${activity.timestamp}-${activity.itemId}`}
                  icon={
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        bgcolor: activity.userName
                          ? alpha(emeraldCore.primary, 0.12)
                          : alpha('#000', 0.08),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {activity.userName ? (
                        <UserCheck size={14} color={emeraldCore.primary} />
                      ) : (
                        <User size={14} color={isLight ? '#666' : '#999'} />
                      )}
                    </Box>
                  }
                  primary={
                    <>
                      {activity.userName || 'Guest'} vió{' '}
                      <Typography
                        component="span"
                        sx={{ color: emeraldCore.primary, fontWeight: 600, fontSize: 'inherit' }}
                      >
                        {activity.productName}
                      </Typography>
                    </>
                  }
                  time={formatTimeAgo(activity.timestamp)}
                  isLast={idx === Math.min(recentProductViews.length, 8) - 1}
                />
              ))}
            </GlassCard>
          </Box>
        )}
      </TabPanel>

      {/* ========== TAB: USERS ========== */}
      <TabPanel value={activeTab} index={2}>
        {/* User Stats Summary */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mb: 3 }}>
          <MetricCard
            label="Viewers"
            value={viewStats?.uniqueViewers || 0}
            icon={Users}
            color="#8B5CF6"
            subtitle="Únicos este mes"
            compact
          />
          <MetricCard
            label="Views/Usuario"
            value={
              viewStats && viewStats.uniqueViewers > 0
                ? Math.round(viewStats.totalViews / viewStats.uniqueViewers)
                : 0
            }
            icon={Eye}
            color={emeraldCore.primary}
            subtitle="Promedio"
            compact
          />
        </Box>

        {/* User Breakdown Donut */}
        <SectionHeader title="Tipo de Usuarios" icon={PieChart} />
        <GlassCard>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <DonutChart
              segments={userBreakdown}
              size={160}
              thickness={0.3}
              centerLabel="Total"
              centerValue={viewStats?.totalViews || 0}
              showLegend={true}
              legendPosition="bottom"
            />
          </Box>
        </GlassCard>

        {/* Top Viewers */}
        {topViewers.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <SectionHeader title="Top Viewers" icon={Users} />
            <GlassCard noPadding>
              <HorizontalBarChart
                data={topViewers.map(v => ({
                  id: v.email || v.name,
                  label: v.name,
                  sublabel: v.role === 'admin' ? 'Admin' : v.role === 'embajador' ? 'Embajador' : (v.role === 'full' || v.role === 'asesor') ? 'Asesor' : 'Usuario',
                  value: v.views,
                }))}
                color="#8B5CF6"
                showMedals={true}
                unit="views"
                onItemClick={(item) => {
                  const viewer = topViewers.find(v => (v.email || v.name) === item.id);
                  if (viewer) {
                    const params = new URLSearchParams();
                    if (viewer.email) params.set('email', viewer.email);
                    else params.set('name', viewer.name);
                    navigate(`/admin/analytics/user?${params.toString()}`);
                  }
                }}
              />
            </GlassCard>
          </Box>
        )}
      </TabPanel>

      {/* ========== TAB: HEALTH ========== */}
      <TabPanel value={activeTab} index={3}>
        {/* Health Score Hero */}
        <GlassCard>
          <HealthScoreHero
            score={healthScores.overall}
            breakdown={healthScores}
            animated={true}
            size={180}
          />
        </GlassCard>

        {/* Score Breakdown */}
        <Box sx={{ mt: 3 }}>
          <SectionHeader title="Desglose de Puntaje" icon={BarChart3} />
          <GlassCard noPadding>
            <ProgressBar
              value={healthScores.cotizacion}
              label="Cotizaciones"
              sublabel="Meta: 10 cotizaciones"
              color={emeraldCore.primary}
              icon={FileText}
              status={healthScores.cotizacion >= 60 ? 'Activo' : 'Bajo'}
              animated
            />
            <ProgressBar
              value={healthScores.engagement}
              label="Engagement"
              sublabel="Vistas y productos únicos"
              color={goldAccent.primary}
              icon={Eye}
              status={healthScores.engagement >= 60 ? 'Activo' : 'Bajo'}
              animated
            />
            <ProgressBar
              value={healthScores.retention}
              label="Retención"
              sublabel="Racha y sesiones"
              color="#8B5CF6"
              icon={Zap}
              status={healthScores.retention >= 60 ? 'Activo' : 'Bajo'}
              animated
            />
            <ProgressBar
              value={healthScores.conversion}
              label="Conversión"
              sublabel="Cotizaciones por vista"
              color="#F59E0B"
              icon={Target}
              status={healthScores.conversion >= 60 ? 'Activo' : 'Bajo'}
              animated
            />
          </GlassCard>
        </Box>

        {/* Health Recommendations */}
        {healthInsights.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <SectionHeader title="Recomendaciones para Mejorar" icon={Sparkles} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {healthInsights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  type={insight.type}
                  title={insight.title}
                  description={insight.description}
                  metric={insight.metric}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Benchmarks */}
        <Box sx={{ mt: 3 }}>
          <SectionHeader title="Benchmarks" icon={Target} />
          <GlassCard>
            <Box sx={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: semanticColors.success.main }}>
                  80%
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Meta
                </Typography>
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: healthColor }}>
                  {healthScores.overall}%
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Actual
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: healthScores.overall >= 80
                      ? semanticColors.success.main
                      : semanticColors.warning.main,
                  }}
                >
                  {Math.max(0, 80 - healthScores.overall)} pts
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Gap
                </Typography>
              </Box>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, (healthScores.overall / 80) * 100)}
              sx={{
                mt: 2,
                height: 8,
                borderRadius: 4,
                bgcolor: alpha(emeraldCore.primary, 0.1),
                '& .MuiLinearProgress-bar': {
                  bgcolor: healthColor,
                  borderRadius: 4,
                },
              }}
            />
          </GlassCard>
        </Box>

        {/* Top Products in Cotizaciones - Value Drivers */}
        {cotizacionStats?.topProducts && cotizacionStats.topProducts.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <SectionHeader title="Productos que Generan Valor" icon={Package} />
            <GlassCard noPadding>
              <HorizontalBarChart
                data={cotizacionStats.topProducts.slice(0, 5).map(p => ({
                  id: p.itemNumber,
                  label: p.name,
                  sublabel: `$${(p.totalValue / 1000000).toFixed(1)}M valor total`,
                  value: p.count,
                }))}
                color={goldAccent.primary}
                showMedals={true}
                unit="cotizaciones"
                onItemClick={(item) => navigate(`/admin/analytics/item/${item.id}`)}
              />
            </GlassCard>
            {cotizacionStats.topProducts.length > 0 && (
              <InsightCard
                type="success"
                title="Productos Estrella"
                description={`"${cotizacionStats.topProducts[0]?.name}" lidera con ${cotizacionStats.topProducts[0]?.count} cotizaciones. Considera destacarlo en tu portafolio.`}
                metric={{
                  value: `$${((cotizacionStats.topProducts[0]?.totalValue || 0) / 1000000).toFixed(1)}M`,
                  label: 'Valor generado',
                }}
                compact
              />
            )}
          </Box>
        )}

        {/* Achievements Progress - Expandable */}
        <Box sx={{ mt: 3 }}>
          <GlassCard noPadding>
            {/* Header - Clickable to expand */}
            <Box
              onClick={() => setAchievementsExpanded(!achievementsExpanded)}
              sx={{
                p: 2.5,
                cursor: 'pointer',
                '&:hover': { bgcolor: alpha(goldAccent.primary, 0.04) },
                transition: 'background-color 0.2s ease',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: iosDimensions.borderRadiusStandard,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(goldAccent.primary, 0.12),
                    }}
                  >
                    <Target size={18} color={goldAccent.primary} />
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Logros
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {unlockedAchievements.length} de {ACHIEVEMENTS.length} desbloqueados
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: goldAccent.primary, lineHeight: 1 }}>
                      {Math.round((unlockedAchievements.length / ACHIEVEMENTS.length) * 100)}%
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {achievements.totalXp} XP
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      transform: achievementsExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      color: 'text.secondary',
                    }}
                  >
                    <ChevronDown size={20} />
                  </Box>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(unlockedAchievements.length / ACHIEVEMENTS.length) * 100}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: alpha(goldAccent.primary, 0.1),
                  '& .MuiLinearProgress-bar': {
                    bgcolor: goldAccent.primary,
                    borderRadius: 3,
                  },
                }}
              />
            </Box>

            {/* Expanded Achievements List */}
            <Box
              sx={{
                maxHeight: achievementsExpanded ? 600 : 0,
                overflow: 'hidden',
                transition: 'max-height 0.3s ease-in-out',
              }}
            >
              <Box
                sx={{
                  borderTop: `1px solid ${alpha(isLight ? '#000' : '#fff', 0.08)}`,
                  p: 2,
                }}
              >
                {/* Level Info */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    mb: 2,
                    p: 1.5,
                    borderRadius: iosDimensions.borderRadiusStandard,
                    bgcolor: alpha(emeraldCore.primary, 0.08),
                  }}
                >
                  <Typography variant="h5" sx={{ fontSize: '1.5rem' }}>
                    {levelInfo.level <= 2 ? '🌱' : levelInfo.level <= 4 ? '💎' : '👑'}
                  </Typography>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: emeraldCore.primary }}>
                      Nivel {levelInfo.level}: {levelInfo.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {achievements.totalXp} / {levelInfo.nextLevelXp} XP para siguiente nivel
                    </Typography>
                  </Box>
                </Box>

                {/* Achievements Grid */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {ACHIEVEMENTS.map((achievement) => {
                    const isUnlocked = unlockedAchievements.some(a => a.id === achievement.id);
                    const progress = getAchievementProgress(achievement.id);

                    return (
                      <Box
                        key={achievement.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          p: 1.5,
                          borderRadius: iosDimensions.borderRadiusStandard,
                          bgcolor: isUnlocked
                            ? alpha(semanticColors.success.main, 0.08)
                            : alpha(isLight ? '#000' : '#fff', 0.03),
                          border: `1px solid ${isUnlocked
                            ? alpha(semanticColors.success.main, 0.2)
                            : alpha(isLight ? '#000' : '#fff', 0.06)}`,
                          opacity: isUnlocked ? 1 : 0.7,
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {/* Icon */}
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: isUnlocked
                              ? alpha(goldAccent.primary, 0.15)
                              : alpha(isLight ? '#000' : '#fff', 0.08),
                            fontSize: '1.2rem',
                            position: 'relative',
                          }}
                        >
                          {isUnlocked ? (
                            achievement.icon
                          ) : (
                            <Lock size={16} color={isLight ? '#999' : '#666'} />
                          )}
                          {isUnlocked && (
                            <Box
                              sx={{
                                position: 'absolute',
                                bottom: -2,
                                right: -2,
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                bgcolor: semanticColors.success.main,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <CheckCircle2 size={12} color="#fff" />
                            </Box>
                          )}
                        </Box>

                        {/* Info */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                color: isUnlocked ? 'text.primary' : 'text.secondary',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {achievement.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                px: 0.75,
                                py: 0.25,
                                borderRadius: 1,
                                bgcolor: alpha(goldAccent.primary, 0.12),
                                color: goldAccent.primary,
                                fontWeight: 600,
                                fontSize: '0.65rem',
                                flexShrink: 0,
                              }}
                            >
                              +{achievement.xp} XP
                            </Typography>
                          </Box>
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'text.secondary',
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {achievement.description}
                          </Typography>
                          {/* Progress bar for locked achievements */}
                          {!isUnlocked && progress > 0 && (
                            <Box sx={{ mt: 0.5 }}>
                              <LinearProgress
                                variant="determinate"
                                value={progress}
                                sx={{
                                  height: 4,
                                  borderRadius: 2,
                                  bgcolor: alpha(emeraldCore.primary, 0.1),
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: emeraldCore.primary,
                                    borderRadius: 2,
                                  },
                                }}
                              />
                              <Typography
                                variant="caption"
                                sx={{ color: emeraldCore.primary, fontSize: '0.6rem', fontWeight: 600 }}
                              >
                                {Math.round(progress)}% completado
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Box>
          </GlassCard>
        </Box>
      </TabPanel>

      {/* Footer */}
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          textAlign: 'center',
          mt: 4,
          color: 'text.disabled',
          fontSize: '0.65rem',
        }}
      >
        Datos actualizados cada 60 segundos
      </Typography>
    </Box>
  );
};

export default AdminAnalyticsPage;
