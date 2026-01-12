/**
 * Admin Analytics Dashboard
 *
 * Redesigned with iOS HIG principles:
 * - Tabbed navigation (Overview/Products/Users)
 * - Sparkline trend charts
 * - Horizontal bar visualizations
 * - Donut charts for breakdowns
 * - Comparison badges (vs yesterday/week)
 *
 * Designed by ARIA - Capitana del Concilio de Creación
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
  Chip,
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
} from 'lucide-react';
import { useThemeMode } from '../contexts/ThemeContext';
import { useTracking } from '../contexts/TrackingContext';
import { useProductViews } from '../hooks/useProductViews';
import { emeraldCore, goldAccent, semanticColors } from '../design-system/tokens/colors';
import { spacing, iosDimensions } from '../design-system/tokens/primitives/spacing';
import { SparklineChart } from '../components/analytics/SparklineChart';
import { HorizontalBarChart } from '../components/analytics/HorizontalBarChart';
import { DonutChart } from '../components/analytics/DonutChart';

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
}) => {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  return (
    <Paper
      elevation={0}
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
// HEALTH SCORE RING (Improved)
// =============================================================================

interface HealthScoreProps {
  score: number;
  label: string;
  color: string;
}

const HealthScoreRing: React.FC<HealthScoreProps> = ({ score, label, color }) => {
  const circumference = 2 * Math.PI * 54;
  const progress = (score / 100) * circumference;

  return (
    <Box sx={{ position: 'relative', width: 120, height: 120 }}>
      <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke={alpha(color, 0.12)}
          strokeWidth="8"
        />
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{
            transition: 'stroke-dashoffset 1s ease-out',
            filter: `drop-shadow(0 0 8px ${alpha(color, 0.4)})`,
          }}
        />
      </svg>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 800, color: color, lineHeight: 1 }}>
          {score}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.65rem' }}
        >
          {label}
        </Typography>
      </Box>
    </Box>
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
  const { metrics, achievements, levelInfo, unlockedAchievements, ACHIEVEMENTS, exportAnalytics } = useTracking();
  const {
    stats: viewStats,
    topProducts,
    topViewers,
    recentActivity: recentProductViews,
    isLoading: viewsLoading,
    refetch: refetchViews,
  } = useProductViews();
  const isLight = mode === 'light';

  // Generate mock trend data (in real app, this would come from API)
  const generateTrendData = useCallback((current: number, variance: number = 0.3) => {
    const data: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const factor = 1 - (variance * Math.random()) + (i * 0.05);
      data.push(Math.max(0, Math.round(current * factor)));
    }
    data[6] = current; // Ensure last point is current value
    return data;
  }, []);

  // Calculate Business Health Score
  const healthScore = useMemo(() => {
    const scores = {
      cotizacion: Math.min(100, (metrics.totalCotizaciones / 10) * 100),
      engagement: Math.min(100, (metrics.totalProductViews / 50) * 100),
      retention: 60,
      conversion: 25,
    };
    const avg = Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length;
    return Math.min(100, Math.round(avg));
  }, [metrics]);

  const healthColor = useMemo(() => {
    if (healthScore >= 80) return semanticColors.success.main;
    if (healthScore >= 60) return goldAccent.primary;
    if (healthScore >= 40) return semanticColors.warning.main;
    return semanticColors.error.main;
  }, [healthScore]);

  const healthLabel = useMemo(() => {
    if (healthScore >= 80) return 'Excelente';
    if (healthScore >= 60) return 'Bueno';
    if (healthScore >= 40) return 'Regular';
    return 'Atenci\u00f3n';
  }, [healthScore]);

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

  // Recent activity from tracking
  const analyticsData = useMemo(() => exportAnalytics(), [exportAnalytics]);
  const recentActivity = useMemo(() => {
    const eventConfig: Record<string, { icon: string; label: string }> = {
      'session_start': { icon: '\ud83d\udfe2', label: 'Sesi\u00f3n iniciada' },
      'page_view': { icon: '\ud83d\udcc4', label: 'P\u00e1gina vista' },
      'treasure_view': { icon: '\ud83d\udc8e', label: 'Explor\u00f3 tesoros' },
      'product_clicked': { icon: '\ud83d\udc46', label: 'Producto seleccionado' },
      'product_engaged': { icon: '\ud83d\udc41\ufe0f', label: 'Producto visualizado' },
      'cotizacion_exported': { icon: '\ud83d\udccb', label: 'Cotizaci\u00f3n exportada' },
      'treasure_filter_applied': { icon: '\ud83d\udd0d', label: 'Filtro aplicado' },
      'simulator_factors_adjusted': { icon: '\ud83e\uddee', label: 'Simulaci\u00f3n' },
    };
    return analyticsData.events
      .slice(-10)
      .reverse()
      .map(event => ({
        event: event.event,
        timestamp: event.timestamp,
        ...eventConfig[event.event] || { icon: '\ud83d\udcca', label: event.event },
      }));
  }, [analyticsData.events]);

  // Export handler
  const handleExport = useCallback(() => {
    const data = exportAnalytics();
    const summary = {
      exportDate: new Date().toISOString(),
      healthScore,
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
  }, [exportAnalytics, healthScore, metrics, achievements, levelInfo, unlockedAchievements]);

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
              onClick={() => refetchViews()}
              size="small"
              disabled={viewsLoading}
              sx={{ color: emeraldCore.primary }}
            >
              <RefreshCw size={18} className={viewsLoading ? 'animate-spin' : ''} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Exportar">
            <IconButton onClick={handleExport} size="small" sx={{ color: emeraldCore.primary }}>
              <Download size={18} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* iOS-style Segmented Control Tabs */}
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
              fontSize: '0.8rem',
              color: 'text.secondary',
              transition: 'all 0.2s ease',
              py: 0.5,
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
        </Tabs>
      </Paper>

      {/* ========== TAB: OVERVIEW ========== */}
      <TabPanel value={activeTab} index={0}>
        {/* Health Score Hero */}
        <GlassCard>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            <HealthScoreRing score={healthScore} label={healthLabel} color={healthColor} />
            <Box sx={{ flex: 1, minWidth: 180 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                Business Health
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5, fontSize: '0.8rem' }}>
                Basado en cotizaciones, engagement y actividad
              </Typography>

              {/* Quick stats */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip
                  icon={<FileText size={12} />}
                  label={`${metrics.totalCotizaciones} cotizaciones`}
                  size="small"
                  sx={{
                    bgcolor: alpha(emeraldCore.primary, 0.1),
                    color: emeraldCore.primary,
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    '& .MuiChip-icon': { color: emeraldCore.primary },
                  }}
                />
                <Chip
                  icon={<Eye size={12} />}
                  label={`${viewStats?.totalViews || 0} views`}
                  size="small"
                  sx={{
                    bgcolor: alpha(goldAccent.primary, 0.1),
                    color: goldAccent.primary,
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    '& .MuiChip-icon': { color: goldAccent.primary },
                  }}
                />
              </Box>
            </Box>
          </Box>
        </GlassCard>

        {/* Key Metrics Grid */}
        <Box sx={{ mt: 3 }}>
          <SectionHeader title="M\u00e9tricas Clave" icon={BarChart3} />
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
            <MetricCard
              label="Cotizaciones"
              value={metrics.totalCotizaciones}
              icon={FileText}
              color={emeraldCore.primary}
              trend={{ data: generateTrendData(metrics.totalCotizaciones) }}
              subtitle="Exportadas"
              compact
            />
            <MetricCard
              label="Views Hoy"
              value={viewStats?.todayViews || 0}
              icon={Eye}
              color={goldAccent.primary}
              comparison={
                viewStats && viewStats.todayViews > 0
                  ? { value: Math.round((viewStats.todayViews / Math.max(viewStats.weekViews / 7, 1)) * 100 - 100), label: 'vs promedio' }
                  : undefined
              }
              subtitle="Productos vistos"
              compact
            />
            <MetricCard
              label="Esta Semana"
              value={viewStats?.weekViews || 0}
              icon={Calendar}
              color="#8B5CF6"
              trend={{ data: generateTrendData(viewStats?.weekViews || 0) }}
              subtitle="\u00daltimos 7 d\u00edas"
              compact
            />
            <MetricCard
              label="Racha"
              value={`${metrics.streak} d\u00edas`}
              icon={Zap}
              color="#F59E0B"
              subtitle="D\u00edas consecutivos"
              compact
            />
          </Box>
        </Box>

        {/* Achievements Progress */}
        <Box sx={{ mt: 3 }}>
          <GlassCard>
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
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: goldAccent.primary, lineHeight: 1 }}>
                  {Math.round((unlockedAchievements.length / ACHIEVEMENTS.length) * 100)}%
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {achievements.totalXp} XP
                </Typography>
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
          </GlassCard>
        </Box>

        {/* Recent Activity */}
        <Box sx={{ mt: 3 }}>
          <SectionHeader title="Actividad Reciente" icon={Activity} />
          <GlassCard noPadding>
            {recentActivity.length > 0 ? (
              recentActivity.slice(0, 5).map((item, idx) => (
                <ActivityItem
                  key={idx}
                  icon={<Typography sx={{ fontSize: '1.1rem' }}>{item.icon}</Typography>}
                  primary={item.label}
                  time={formatTimeAgo(item.timestamp)}
                  isLast={idx === Math.min(recentActivity.length, 5) - 1}
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
                      {activity.userName || 'Guest'} vi\u00f3{' '}
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
            subtitle="\u00danicos este mes"
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
                  sublabel: v.role === 'admin' ? 'Admin' : v.role === 'full' ? 'Asesor' : 'Usuario',
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
