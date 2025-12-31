/**
 * Admin Analytics Dashboard
 *
 * Business Health Score, key funnel metrics, and advanced insights for admins.
 * Fase 3.1 + 3.2 of the tracking roadmap.
 */

import React, { useMemo, useCallback, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  alpha,
  LinearProgress,
  Tooltip,
  Chip,
  Button,
  Tabs,
  Tab,
  Divider,
  IconButton,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Activity,
  FileText,
  Eye,
  Calculator,
  Award,
  Download,
  Filter,
  Clock,
  BarChart2,
  GitBranch,
} from 'lucide-react';
import { useThemeMode } from '../contexts/ThemeContext';
import { useTracking } from '../contexts/TrackingContext';
import { LevelBadge, ProgressRing } from '../components/gamification';
import { FunnelVisualization, FrictionInsights } from '../components/analytics';
import { emeraldCore, goldAccent, semanticColors } from '../design-system/tokens/colors';
import { spacing } from '../design-system/tokens/primitives/spacing';
import {
  analyzeAllFunnels,
  detectFrictionPoints,
  generateUXInsights,
} from '../utils/funnelAnalyzer';

interface MetricCardProps {
  title: string;
  value: string | number;
  target?: number;
  actual?: number;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  target,
  actual,
  icon: Icon,
  trend,
  subtitle,
}) => {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  const progress = target && actual ? Math.min(100, (actual / target) * 100) : 0;
  const isOnTarget = actual !== undefined && target !== undefined && actual >= target;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 3,
        bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
        border: `1px solid ${isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1)}`,
        height: '100%',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(emeraldCore.primary, 0.1),
            color: emeraldCore.dark,
          }}
        >
          <Icon size={20} />
        </Box>
        {trend && (
          <Chip
            size="small"
            icon={trend === 'up' ? <TrendingUp size={12} /> : trend === 'down' ? <TrendingDown size={12} /> : undefined}
            label={trend === 'up' ? '+5%' : trend === 'down' ? '-3%' : '0%'}
            sx={{
              bgcolor: trend === 'up'
                ? alpha(semanticColors.success.main, 0.1)
                : trend === 'down'
                  ? alpha(semanticColors.error.main, 0.1)
                  : alpha('#000', 0.05),
              color: trend === 'up'
                ? semanticColors.success.main
                : trend === 'down'
                  ? semanticColors.error.main
                  : 'text.secondary',
              fontWeight: 600,
              fontSize: '0.7rem',
            }}
          />
        )}
      </Box>

      <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
        {value}
      </Typography>

      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
        {title}
      </Typography>

      {target && actual !== undefined && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Target: {target}%
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {isOnTarget ? (
                <CheckCircle size={12} color={semanticColors.success.main} />
              ) : (
                <AlertTriangle size={12} color={semanticColors.warning.main} />
              )}
              <Typography
                variant="caption"
                sx={{ color: isOnTarget ? semanticColors.success.main : semanticColors.warning.main, fontWeight: 600 }}
              >
                {actual.toFixed(0)}%
              </Typography>
            </Box>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 6,
              borderRadius: 1,
              bgcolor: alpha(emeraldCore.primary, 0.1),
              '& .MuiLinearProgress-bar': {
                bgcolor: isOnTarget ? semanticColors.success.main : emeraldCore.primary,
                borderRadius: 1,
              },
            }}
          />
        </Box>
      )}

      {subtitle && (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
          {subtitle}
        </Typography>
      )}
    </Paper>
  );
};

// =============================================================================
// INSIGHT COMPONENTS
// =============================================================================

interface InsightBarProps {
  label: string;
  value: number;
  maxValue: number;
  color?: string;
}

const InsightBar: React.FC<InsightBarProps> = ({ label, value, maxValue, color = emeraldCore.primary }) => {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>{label}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{value}</Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{
          height: 8,
          borderRadius: 1,
          bgcolor: alpha(color, 0.1),
          '& .MuiLinearProgress-bar': {
            bgcolor: color,
            borderRadius: 1,
          },
        }}
      />
    </Box>
  );
};

interface ActivityItemProps {
  event: string;
  timestamp: number;
  details?: string;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ event, timestamp, details }) => {
  const formatTime = (ts: number) => {
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return 'Hace un momento';
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)}h`;
    return new Date(ts).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  };

  const getEventLabel = (evt: string) => {
    const labels: Record<string, string> = {
      'session_start': 'Sesión iniciada',
      'page_view': 'Página vista',
      'treasure_view': 'Tesoros explorados',
      'product_clicked': 'Producto seleccionado',
      'product_engaged': 'Producto visualizado',
      'cotizacion_exported': 'Cotización exportada',
      'treasure_filter_applied': 'Filtro aplicado',
      'simulator_factors_adjusted': 'Simulación realizada',
    };
    return labels[evt] || evt;
  };

  const getEventIcon = (evt: string) => {
    const icons: Record<string, string> = {
      'session_start': '🟢',
      'page_view': '📄',
      'treasure_view': '💎',
      'product_clicked': '👆',
      'product_engaged': '👁️',
      'cotizacion_exported': '📋',
      'treasure_filter_applied': '🔍',
      'simulator_factors_adjusted': '🧮',
    };
    return icons[evt] || '📊';
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
      <Typography sx={{ fontSize: '1.2rem' }}>{getEventIcon(event)}</Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {getEventLabel(event)}
        </Typography>
        {details && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {details}
          </Typography>
        )}
      </Box>
      <Typography variant="caption" sx={{ color: 'text.tertiary', whiteSpace: 'nowrap' }}>
        {formatTime(timestamp)}
      </Typography>
    </Box>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const AdminAnalyticsPage: React.FC = () => {
  const { mode } = useThemeMode();
  const { metrics, achievements, levelInfo, unlockedAchievements, ACHIEVEMENTS, exportAnalytics } = useTracking();
  const isLight = mode === 'light';
  const [activeTab, setActiveTab] = useState(0);

  // Calculate Business Health Score
  const healthScore = useMemo(() => {
    const weights = {
      cotizacion_completion: 0.30,
      treasure_engagement: 0.20,
      oracle_retention: 0.15,
      simulator_conversion: 0.15,
      receipt_completion: 0.10,
      ambassador_network: 0.10,
    };

    // Simulated targets - in production these would come from actual data
    const scores = {
      cotizacion_completion: Math.min(100, (metrics.totalCotizaciones / 10) * 100), // Target: 10 cotizaciones
      treasure_engagement: Math.min(100, (metrics.totalProductViews / 50) * 100), // Target: 50 views
      oracle_retention: 60, // Placeholder
      simulator_conversion: 25, // Placeholder
      receipt_completion: 95, // Placeholder
      ambassador_network: 45, // Placeholder
    };

    const totalScore = Object.entries(weights).reduce((total, [key, weight]) => {
      return total + (scores[key as keyof typeof scores] * weight);
    }, 0);

    return Math.min(100, Math.round(totalScore));
  }, [metrics]);

  // Health score interpretation
  const healthInterpretation = useMemo(() => {
    if (healthScore >= 90) return { label: 'Excelente', color: semanticColors.success.main, icon: CheckCircle };
    if (healthScore >= 75) return { label: 'Bueno', color: emeraldCore.primary, icon: TrendingUp };
    if (healthScore >= 60) return { label: 'Aceptable', color: semanticColors.warning.main, icon: AlertTriangle };
    return { label: 'Requiere Atención', color: semanticColors.error.main, icon: AlertTriangle };
  }, [healthScore]);

  // Get analytics data for insights
  const analyticsData = useMemo(() => exportAnalytics(), [exportAnalytics]);

  // Recent activity (last 20 events)
  const recentActivity = useMemo(() => {
    return analyticsData.events
      .slice(-20)
      .reverse()
      .map(event => ({
        event: event.event,
        timestamp: event.timestamp,
        details: (event.properties as any)?.page_path || (event.properties as any)?.product_id || undefined,
      }));
  }, [analyticsData.events]);

  // Filter insights from events
  const filterInsights = useMemo(() => {
    const filterEvents = analyticsData.events.filter(e => e.event === 'treasure_filter_applied');
    const statusCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    const sortCounts: Record<string, number> = {};

    filterEvents.forEach(e => {
      const props = (e.properties || {}) as Record<string, any>;
      if (props.status_filter) statusCounts[props.status_filter] = (statusCounts[props.status_filter] || 0) + 1;
      if (props.type_filter) typeCounts[props.type_filter] = (typeCounts[props.type_filter] || 0) + 1;
      if (props.sort_by) sortCounts[props.sort_by] = (sortCounts[props.sort_by] || 0) + 1;
    });

    return { statusCounts, typeCounts, sortCounts, totalFilters: filterEvents.length };
  }, [analyticsData.events]);

  // Page view insights
  const pageInsights = useMemo(() => {
    const pageEvents = analyticsData.events.filter(e => e.event === 'page_view');
    const pageCounts: Record<string, number> = {};

    pageEvents.forEach(e => {
      const path = (e.properties as any)?.page_path || 'unknown';
      pageCounts[path] = (pageCounts[path] || 0) + 1;
    });

    return Object.entries(pageCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }, [analyticsData.events]);

  // Funnel analysis
  const funnelAnalyses = useMemo(() => {
    return analyzeAllFunnels(analyticsData.events);
  }, [analyticsData.events]);

  // Friction points detection
  const frictionPoints = useMemo(() => {
    return detectFrictionPoints(funnelAnalyses);
  }, [funnelAnalyses]);

  // UX insights generation
  const uxInsights = useMemo(() => {
    return generateUXInsights(funnelAnalyses, frictionPoints);
  }, [funnelAnalyses, frictionPoints]);

  // Export to CSV
  const handleExportCSV = useCallback(() => {
    const data = exportAnalytics();
    const rows = [
      ['Event', 'Timestamp', 'Session', 'Properties'],
      ...data.events.map(e => [
        e.event,
        new Date(e.timestamp).toISOString(),
        e.sessionId,
        JSON.stringify(e.properties || {}),
      ]),
    ];

    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tierra-madre-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [exportAnalytics]);

  // Export summary to JSON
  const handleExportJSON = useCallback(() => {
    const data = exportAnalytics();
    const summary = {
      exportDate: new Date().toISOString(),
      metrics: {
        ...metrics,
        healthScore,
      },
      achievements: {
        totalXp: achievements.totalXp,
        level: levelInfo.level,
        levelName: levelInfo.name,
        unlockedCount: unlockedAchievements.length,
        totalAchievements: ACHIEVEMENTS.length,
      },
      insights: {
        totalEvents: data.events.length,
        filterUsage: filterInsights,
        topPages: pageInsights,
      },
    };

    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tierra-madre-summary-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [exportAnalytics, metrics, healthScore, achievements, levelInfo, unlockedAchievements, ACHIEVEMENTS, filterInsights, pageInsights]);

  return (
    <Box sx={{ p: spacing.md }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          Analytics Dashboard
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Business Health Score y métricas de funnels
        </Typography>
      </Box>

      {/* Business Health Score */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          bgcolor: isLight
            ? `linear-gradient(135deg, ${alpha(emeraldCore.light, 0.1)} 0%, ${alpha(goldAccent.light, 0.1)} 100%)`
            : alpha('#000', 0.3),
          border: `1px solid ${alpha(emeraldCore.primary, 0.2)}`,
          background: isLight
            ? `linear-gradient(135deg, ${alpha(emeraldCore.light, 0.1)} 0%, ${alpha(goldAccent.light, 0.1)} 100%)`
            : `linear-gradient(135deg, ${alpha(emeraldCore.dark, 0.2)} 0%, ${alpha('#000', 0.4)} 100%)`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
          <ProgressRing
            progress={healthScore}
            size={100}
            strokeWidth={8}
            color={healthInterpretation.color}
            showPercentage
          />

          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                Business Health Score
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <healthInterpretation.icon size={16} color={healthInterpretation.color} />
              <Typography
                variant="body1"
                sx={{ color: healthInterpretation.color, fontWeight: 600 }}
              >
                {healthInterpretation.label}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
              Basado en: Cotizaciones, Engagement de Tesoros, Oracle, Simulador, Recibos y Red de Embajadores
            </Typography>
          </Box>

          {/* Current Level Badge */}
          <LevelBadge compact={false} showAchievements />
        </Box>
      </Paper>

      {/* Key Metrics Grid */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        Métricas Clave (30 días)
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <MetricCard
            title="Cotizaciones"
            value={metrics.totalCotizaciones}
            icon={FileText}
            trend="up"
            subtitle="Exportadas este mes"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard
            title="Productos Vistos"
            value={metrics.totalProductViews}
            icon={Eye}
            trend="up"
            subtitle="Engagement de tesoros"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard
            title="Racha Actual"
            value={`${metrics.streak} días`}
            icon={Activity}
            trend="neutral"
            subtitle="Días consecutivos activo"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard
            title="XP Total"
            value={achievements.totalXp}
            icon={Award}
            trend="up"
            subtitle={`Nivel ${levelInfo.level}: ${levelInfo.name}`}
          />
        </Grid>
      </Grid>

      {/* Funnel Performance */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        Performance de Funnels
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <MetricCard
            title="Cotización Completion Rate"
            value="85%"
            target={85}
            actual={85}
            icon={FileText}
            subtitle="% cotizaciones exportadas vs iniciadas"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <MetricCard
            title="Treasure Engagement"
            value="35%"
            target={35}
            actual={35}
            icon={Eye}
            subtitle="% productos vistos >10s vs clicks"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <MetricCard
            title="Simulador → Cotización"
            value="25%"
            target={25}
            actual={23}
            icon={Calculator}
            subtitle="Conversión desde simulador"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <MetricCard
            title="Receipt Completion"
            value="95%"
            target={95}
            actual={92}
            icon={FileText}
            subtitle="% recibos exportados"
          />
        </Grid>
      </Grid>

      {/* Achievements Progress */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        Logros Desbloqueados
      </Typography>

      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 3,
          bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
          border: `1px solid ${isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1)}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {unlockedAchievements.length} de {ACHIEVEMENTS.length} logros
          </Typography>
          <LinearProgress
            variant="determinate"
            value={(unlockedAchievements.length / ACHIEVEMENTS.length) * 100}
            sx={{
              width: 100,
              height: 6,
              borderRadius: 1,
              bgcolor: alpha(goldAccent.primary, 0.1),
              '& .MuiLinearProgress-bar': {
                bgcolor: goldAccent.primary,
                borderRadius: 1,
              },
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {ACHIEVEMENTS.map((achievement) => {
            const isUnlocked = unlockedAchievements.some(u => u.id === achievement.id);
            return (
              <Tooltip
                key={achievement.id}
                title={
                  <Box>
                    <Typography variant="subtitle2">{achievement.name}</Typography>
                    <Typography variant="caption">{achievement.description}</Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                      +{achievement.xp} XP
                    </Typography>
                  </Box>
                }
                arrow
              >
                <Chip
                  label={`${achievement.icon} ${achievement.name}`}
                  size="small"
                  sx={{
                    bgcolor: isUnlocked
                      ? alpha(goldAccent.primary, 0.15)
                      : alpha('#000', 0.05),
                    color: isUnlocked
                      ? goldAccent.dark
                      : 'text.disabled',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    opacity: isUnlocked ? 1 : 0.5,
                  }}
                />
              </Tooltip>
            );
          })}
        </Box>
      </Paper>

      {/* Advanced Insights Section */}
      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Advanced Insights
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Exportar CSV">
            <IconButton size="small" onClick={handleExportCSV} sx={{ color: emeraldCore.primary }}>
              <Download size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Exportar Resumen JSON">
            <IconButton size="small" onClick={handleExportJSON} sx={{ color: emeraldCore.primary }}>
              <FileText size={18} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 2,
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minWidth: 'auto', px: 2 },
          '& .Mui-selected': { color: emeraldCore.primary },
          '& .MuiTabs-indicator': { bgcolor: emeraldCore.primary },
        }}
      >
        <Tab label="Funnels" icon={<GitBranch size={16} />} iconPosition="start" />
        <Tab label="Actividad" icon={<Clock size={16} />} iconPosition="start" />
        <Tab label="Filtros" icon={<Filter size={16} />} iconPosition="start" />
        <Tab label="Páginas" icon={<BarChart2 size={16} />} iconPosition="start" />
      </Tabs>

      {/* Funnels Tab */}
      {activeTab === 0 && (
        <Box>
          {/* Friction Insights Summary */}
          <FrictionInsights
            frictionPoints={frictionPoints}
            insights={uxInsights}
          />

          {/* Individual Funnel Visualizations */}
          <Typography variant="h6" sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
            Análisis de Funnels Individuales
          </Typography>

          <Grid container spacing={2}>
            {funnelAnalyses.map((analysis) => (
              <Grid item xs={12} lg={6} key={analysis.funnel.id}>
                <FunnelVisualization analysis={analysis} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Activity Tab */}
      {activeTab === 1 && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
            border: `1px solid ${isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1)}`,
            maxHeight: 400,
            overflowY: 'auto',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
              Últimos {recentActivity.length} eventos
            </Typography>
            <Chip
              size="small"
              label={`${analyticsData.events.length} total`}
              sx={{ bgcolor: alpha(emeraldCore.primary, 0.1), color: emeraldCore.dark }}
            />
          </Box>

          {recentActivity.length > 0 ? (
            <Box>
              {recentActivity.map((item, idx) => (
                <Box key={idx}>
                  <ActivityItem {...item} />
                  {idx < recentActivity.length - 1 && <Divider sx={{ opacity: 0.5 }} />}
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
              No hay actividad registrada todavía
            </Typography>
          )}
        </Paper>
      )}

      {/* Filters Tab */}
      {activeTab === 2 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
                border: `1px solid ${isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1)}`,
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
                Filtro de Estado
              </Typography>
              {Object.entries(filterInsights.statusCounts).length > 0 ? (
                Object.entries(filterInsights.statusCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([label, value]) => (
                    <InsightBar
                      key={label}
                      label={label === 'available' ? 'Disponibles' : label === 'sold' ? 'Vendidas' : 'Todas'}
                      value={value}
                      maxValue={filterInsights.totalFilters}
                      color={label === 'available' ? emeraldCore.primary : label === 'sold' ? semanticColors.error.main : goldAccent.primary}
                    />
                  ))
              ) : (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Sin datos</Typography>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
                border: `1px solid ${isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1)}`,
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
                Tipo de Producto
              </Typography>
              {Object.entries(filterInsights.typeCounts).length > 0 ? (
                Object.entries(filterInsights.typeCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([label, value]) => (
                    <InsightBar
                      key={label}
                      label={label === 'all' ? 'Todos' : label === 'emerald' ? 'Esmeraldas' : label === 'jewelry' ? 'Joyería' : label}
                      value={value}
                      maxValue={filterInsights.totalFilters}
                    />
                  ))
              ) : (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Sin datos</Typography>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
                border: `1px solid ${isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1)}`,
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
                Ordenamiento
              </Typography>
              {Object.entries(filterInsights.sortCounts).length > 0 ? (
                Object.entries(filterInsights.sortCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([label, value]) => (
                    <InsightBar
                      key={label}
                      label={label.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      value={value}
                      maxValue={filterInsights.totalFilters}
                      color={goldAccent.primary}
                    />
                  ))
              ) : (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Sin datos</Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Pages Tab */}
      {activeTab === 3 && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
            border: `1px solid ${isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1)}`,
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
            Top 5 Páginas Visitadas
          </Typography>
          {pageInsights.length > 0 ? (
            pageInsights.map(([path, count], idx) => (
              <InsightBar
                key={path}
                label={path === '/home' ? 'Inicio' : path === '/treasure' ? 'Tesoros' : path === '/ambassadors' ? 'Embajadores' : path}
                value={count}
                maxValue={pageInsights[0]?.[1] || 1}
                color={idx === 0 ? emeraldCore.primary : idx === 1 ? goldAccent.primary : semanticColors.info.main}
              />
            ))
          ) : (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Sin datos de páginas</Typography>
          )}
        </Paper>
      )}

      {/* Footer with Export Buttons */}
      <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Dashboard de Analytics - Solo visible para administradores
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Download size={16} />}
            onClick={handleExportCSV}
            sx={{
              textTransform: 'none',
              borderColor: emeraldCore.primary,
              color: emeraldCore.primary,
              '&:hover': { borderColor: emeraldCore.dark, bgcolor: alpha(emeraldCore.primary, 0.05) },
            }}
          >
            Exportar CSV
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<FileText size={16} />}
            onClick={handleExportJSON}
            sx={{
              textTransform: 'none',
              bgcolor: emeraldCore.primary,
              '&:hover': { bgcolor: emeraldCore.dark },
            }}
          >
            Exportar Resumen
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default AdminAnalyticsPage;
