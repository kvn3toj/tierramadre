/**
 * Admin Analytics Dashboard
 *
 * Simplified, intuitive dashboard showing key business metrics.
 * Designed for quick understanding at a glance.
 */

import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  alpha,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Eye,
  FileText,
  Award,
  Download,
  Activity,
  Zap,
  Target,
  BarChart3,
  RefreshCw,
  User,
  Users,
  UserCheck,
  ChevronRight,
} from 'lucide-react';
import { useThemeMode } from '../contexts/ThemeContext';
import { useTracking } from '../contexts/TrackingContext';
import { useProductViews } from '../hooks/useProductViews';
import { emeraldCore, goldAccent, semanticColors } from '../design-system/tokens/colors';
import { spacing } from '../design-system/tokens/primitives/spacing';

// =============================================================================
// SIMPLE STAT CARD
// =============================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  change?: number;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, color, change, subtitle }) => {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
        border: `1px solid ${alpha(color, 0.2)}`,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      {/* Icon and change indicator */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(color, 0.12),
          }}
        >
          <Icon size={22} color={color} />
        </Box>
        {change !== undefined && change !== 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1,
              py: 0.5,
              borderRadius: 1.5,
              bgcolor: alpha(change > 0 ? semanticColors.success.main : semanticColors.error.main, 0.1),
            }}
          >
            {change > 0 ? (
              <TrendingUp size={14} color={semanticColors.success.main} />
            ) : (
              <TrendingDown size={14} color={semanticColors.error.main} />
            )}
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: change > 0 ? semanticColors.success.main : semanticColors.error.main,
              }}
            >
              {change > 0 ? '+' : ''}{change}%
            </Typography>
          </Box>
        )}
      </Box>

      {/* Value */}
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
        {value}
      </Typography>

      {/* Label and subtitle */}
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          {label}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

// =============================================================================
// HEALTH SCORE RING
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
    <Box sx={{ position: 'relative', width: 140, height: 140 }}>
      <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
        {/* Background circle */}
        <circle
          cx="70"
          cy="70"
          r="54"
          fill="none"
          stroke={alpha(color, 0.15)}
          strokeWidth="12"
        />
        {/* Progress circle */}
        <circle
          cx="70"
          cy="70"
          r="54"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
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
        <Typography variant="h3" sx={{ fontWeight: 800, color: color, lineHeight: 1 }}>
          {score}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          {label}
        </Typography>
      </Box>
    </Box>
  );
};

// =============================================================================
// ACTIVITY ITEM
// =============================================================================

interface RecentActivity {
  event: string;
  timestamp: number;
  icon: string;
  label: string;
}

const formatTimeAgo = (ts: number): string => {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'Ahora';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const AdminAnalyticsPage: React.FC = () => {
  const { mode } = useThemeMode();
  const navigate = useNavigate();
  const { metrics, achievements, levelInfo, unlockedAchievements, ACHIEVEMENTS, exportAnalytics } = useTracking();
  const { stats: viewStats, topProducts, topViewers, recentActivity: recentProductViews, isLoading: viewsLoading, refetch: refetchViews } = useProductViews();
  const isLight = mode === 'light';

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

  // Health color based on score
  const healthColor = useMemo(() => {
    if (healthScore >= 80) return semanticColors.success.main;
    if (healthScore >= 60) return goldAccent.primary;
    if (healthScore >= 40) return semanticColors.warning.main;
    return semanticColors.error.main;
  }, [healthScore]);

  // Health label
  const healthLabel = useMemo(() => {
    if (healthScore >= 80) return 'Excelente';
    if (healthScore >= 60) return 'Bueno';
    if (healthScore >= 40) return 'Regular';
    return 'Atención';
  }, [healthScore]);

  // Get analytics data
  const analyticsData = useMemo(() => exportAnalytics(), [exportAnalytics]);

  // Recent activity
  const recentActivity = useMemo((): RecentActivity[] => {
    const eventConfig: Record<string, { icon: string; label: string }> = {
      'session_start': { icon: '🟢', label: 'Sesión iniciada' },
      'page_view': { icon: '📄', label: 'Página vista' },
      'treasure_view': { icon: '💎', label: 'Exploró tesoros' },
      'product_clicked': { icon: '👆', label: 'Producto seleccionado' },
      'product_engaged': { icon: '👁️', label: 'Producto visualizado' },
      'cotizacion_exported': { icon: '📋', label: 'Cotización exportada' },
      'treasure_filter_applied': { icon: '🔍', label: 'Filtro aplicado' },
      'simulator_factors_adjusted': { icon: '🧮', label: 'Simulación' },
    };

    return analyticsData.events
      .slice(-10)
      .reverse()
      .map(event => ({
        event: event.event,
        timestamp: event.timestamp,
        ...eventConfig[event.event] || { icon: '📊', label: event.event },
      }));
  }, [analyticsData.events]);

  // Export handlers
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

  return (
    <Box sx={{ p: spacing.md, pb: 12 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Analytics
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Resumen de tu negocio
          </Typography>
        </Box>
        <Tooltip title="Exportar datos">
          <IconButton onClick={handleExport} sx={{ color: emeraldCore.primary }}>
            <Download size={20} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Hero: Business Health Score */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 4,
          background: isLight
            ? `linear-gradient(135deg, ${alpha(healthColor, 0.08)} 0%, ${alpha(healthColor, 0.02)} 100%)`
            : `linear-gradient(135deg, ${alpha(healthColor, 0.15)} 0%, ${alpha('#000', 0.3)} 100%)`,
          border: `1px solid ${alpha(healthColor, 0.2)}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
          <HealthScoreRing score={healthScore} label={healthLabel} color={healthColor} />

          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Business Health
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              Basado en cotizaciones, engagement y actividad
            </Typography>

            {/* Mini metrics */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FileText size={14} color={emeraldCore.primary} />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {metrics.totalCotizaciones} cotizaciones
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Eye size={14} color={goldAccent.primary} />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {metrics.totalProductViews} vistas
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Stats Grid */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Métricas Principales
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 2,
          mb: 3,
        }}
      >
        <StatCard
          label="Cotizaciones"
          value={metrics.totalCotizaciones}
          icon={FileText}
          color={emeraldCore.primary}
          subtitle="Exportadas"
        />
        <StatCard
          label="Productos Vistos"
          value={metrics.totalProductViews}
          icon={Eye}
          color={goldAccent.primary}
          subtitle="Total interacciones"
        />
        <StatCard
          label="Racha"
          value={`${metrics.streak} días`}
          icon={Zap}
          color="#F59E0B"
          subtitle="Días consecutivos"
        />
        <StatCard
          label="XP Total"
          value={achievements.totalXp}
          icon={Award}
          color="#8B5CF6"
          subtitle={`Nivel ${levelInfo.level}`}
        />
      </Box>

      {/* Product Views from Google Sheets */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Product Views (Sheets)
        </Typography>
        <Tooltip title="Actualizar datos">
          <IconButton
            onClick={refetchViews}
            size="small"
            disabled={viewsLoading}
            sx={{ color: emeraldCore.primary }}
          >
            <RefreshCw size={16} className={viewsLoading ? 'animate-spin' : ''} />
          </IconButton>
        </Tooltip>
      </Box>

      {viewStats && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 2,
            mb: 3,
          }}
        >
          <StatCard
            label="Total Views"
            value={viewStats.totalViews}
            icon={Eye}
            color="#3B82F6"
            subtitle="Todas las vistas"
          />
          <StatCard
            label="Hoy"
            value={viewStats.todayViews}
            icon={BarChart3}
            color={emeraldCore.primary}
            subtitle="Views de hoy"
          />
          <StatCard
            label="Esta Semana"
            value={viewStats.weekViews}
            icon={TrendingUp}
            color="#8B5CF6"
            subtitle="Últimos 7 días"
          />
          <StatCard
            label="Productos"
            value={viewStats.uniqueProducts}
            icon={Target}
            color={goldAccent.primary}
            subtitle="Con al menos 1 vista"
          />
        </Box>
      )}

      {/* Top Viewed Products */}
      {topProducts.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
            border: `1px solid ${isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1)}`,
            overflow: 'hidden',
            mb: 3,
          }}
        >
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${alpha('#000', 0.06)}` }}>
            <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <BarChart3 size={16} color={emeraldCore.primary} />
              Top 10 Productos Más Vistos
            </Typography>
          </Box>
          {topProducts.slice(0, 10).map((product, idx) => (
            <Box
              key={product.itemId}
              onClick={() => navigate(`/admin/analytics/item/${product.itemId}`)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2.5,
                py: 1.5,
                borderBottom: idx < Math.min(topProducts.length, 10) - 1 ? `1px solid ${alpha('#000', 0.06)}` : 'none',
                cursor: 'pointer',
                transition: 'background-color 0.15s',
                '&:hover': {
                  bgcolor: alpha(emeraldCore.primary, 0.05),
                },
                '&:active': {
                  bgcolor: alpha(emeraldCore.primary, 0.1),
                },
              }}
            >
              <Typography
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  bgcolor: idx < 3 ? alpha(goldAccent.primary, 0.15) : alpha('#000', 0.05),
                  color: idx < 3 ? goldAccent.primary : 'text.secondary',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                {idx + 1}
              </Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {product.productName}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Item #{product.itemId}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Eye size={14} color={emeraldCore.primary} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: emeraldCore.primary }}>
                  {product.views}
                </Typography>
              </Box>
              <ChevronRight size={16} color={alpha(isLight ? '#000' : '#fff', 0.3)} />
            </Box>
          ))}
        </Paper>
      )}

      {/* Top Viewers (Who is viewing products) */}
      {topViewers.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
            border: `1px solid ${isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1)}`,
            overflow: 'hidden',
            mb: 3,
          }}
        >
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${alpha('#000', 0.06)}` }}>
            <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Users size={16} color="#8B5CF6" />
              Top Viewers (Usuarios que vieron productos)
            </Typography>
          </Box>
          {topViewers.map((viewer, idx) => (
            <Box
              key={viewer.email || viewer.name}
              onClick={() => {
                const params = new URLSearchParams();
                if (viewer.email) params.set('email', viewer.email);
                else params.set('name', viewer.name);
                navigate(`/admin/analytics/user?${params.toString()}`);
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2.5,
                py: 1.5,
                borderBottom: idx < topViewers.length - 1 ? `1px solid ${alpha('#000', 0.06)}` : 'none',
                cursor: 'pointer',
                transition: 'background-color 0.15s',
                '&:hover': {
                  bgcolor: alpha('#8B5CF6', 0.05),
                },
                '&:active': {
                  bgcolor: alpha('#8B5CF6', 0.1),
                },
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  bgcolor: alpha('#8B5CF6', 0.12),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <User size={16} color="#8B5CF6" />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {viewer.name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {viewer.role === 'admin' ? 'Admin' : viewer.role === 'full' ? 'Asesor' : 'Usuario'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Eye size={14} color="#8B5CF6" />
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#8B5CF6' }}>
                  {viewer.views}
                </Typography>
              </Box>
              <ChevronRight size={16} color={alpha(isLight ? '#000' : '#fff', 0.3)} />
            </Box>
          ))}
        </Paper>
      )}

      {/* Recent Activity (Who viewed what) */}
      {recentProductViews.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
            border: `1px solid ${isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1)}`,
            overflow: 'hidden',
            mb: 3,
          }}
        >
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${alpha('#000', 0.06)}` }}>
            <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Activity size={16} color={semanticColors.info.main} />
              Actividad Reciente de Productos
            </Typography>
          </Box>
          {recentProductViews.slice(0, 10).map((activity, idx) => {
            const timeAgo = (() => {
              const diff = Date.now() - new Date(activity.timestamp).getTime();
              if (diff < 60000) return 'Ahora';
              if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
              if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
              return `${Math.floor(diff / 86400000)}d`;
            })();

            return (
              <Box
                key={`${activity.timestamp}-${activity.itemId}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 2.5,
                  py: 1.5,
                  borderBottom: idx < Math.min(recentProductViews.length, 10) - 1 ? `1px solid ${alpha('#000', 0.06)}` : 'none',
                }}
              >
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    bgcolor: activity.userName ? alpha(emeraldCore.primary, 0.12) : alpha('#000', 0.08),
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
                    {activity.userName || 'Guest'} vió{' '}
                    <Typography component="span" sx={{ color: emeraldCore.primary, fontWeight: 600, fontSize: 'inherit' }}>
                      {activity.productName}
                    </Typography>
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', flexShrink: 0 }}>
                  {timeAgo}
                </Typography>
              </Box>
            );
          })}
        </Paper>
      )}

      {/* Achievements Progress */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
          border: `1px solid ${isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1)}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
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
          <Typography variant="h6" sx={{ fontWeight: 700, color: goldAccent.primary }}>
            {Math.round((unlockedAchievements.length / ACHIEVEMENTS.length) * 100)}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={(unlockedAchievements.length / ACHIEVEMENTS.length) * 100}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: alpha(goldAccent.primary, 0.1),
            '& .MuiLinearProgress-bar': {
              bgcolor: goldAccent.primary,
              borderRadius: 4,
            },
          }}
        />
      </Paper>

      {/* Recent Activity */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Actividad Reciente
      </Typography>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
          border: `1px solid ${isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1)}`,
          overflow: 'hidden',
        }}
      >
        {recentActivity.length > 0 ? (
          recentActivity.map((item, idx) => (
            <Box
              key={idx}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2.5,
                py: 1.5,
                borderBottom: idx < recentActivity.length - 1 ? `1px solid ${alpha('#000', 0.06)}` : 'none',
              }}
            >
              <Typography sx={{ fontSize: '1.25rem' }}>{item.icon}</Typography>
              <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
                {item.label}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {formatTimeAgo(item.timestamp)}
              </Typography>
            </Box>
          ))
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Activity size={32} color={alpha(isLight ? '#000' : '#fff', 0.2)} />
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
              Sin actividad registrada
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Footer note */}
      <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 3, color: 'text.secondary' }}>
        Los datos se guardan localmente en tu dispositivo
      </Typography>
    </Box>
  );
};

export default AdminAnalyticsPage;
