/**
 * OverviewTab Component
 * Main overview dashboard with KPIs, trends, and recent activity.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, alpha } from '@mui/material';
import {
  Eye,
  FileText,
  Calendar,
  Zap,
  Activity,
  BarChart3,
  Sparkles,
  UserCheck,
  User,
  TrendingUp as TrendUp,
  ChevronRight,
} from 'lucide-react';
import { useThemeMode } from '../../../../contexts/ThemeContext';
import { emeraldCore, goldAccent } from '../../../../design-system/tokens/colors';
import { AreaChart } from '../../../../components/analytics/AreaChart';
import { HorizontalBarChart } from '../../../../components/analytics/HorizontalBarChart';
import { InsightCard } from '../../../../components/analytics/InsightCard';
import { formatTimeAgo } from '../../../../utils/formatting';
import {
  TabPanel,
  MetricCard,
  SectionHeader,
  GlassCard,
  ActivityItem,
} from '../../../../components/shared';
import type { CombinedActivity } from '../hooks/useAnalyticsData';
import type { HealthScores, Insight } from '../../../../utils/insightGenerator';

interface OverviewTabProps {
  activeTab: number;
  viewStats: {
    todayViews: number;
    weekViews: number;
    uniqueProducts: number;
    uniqueViewers: number;
  } | null;
  totalCotizaciones: number;
  weekCotizaciones: number;
  healthScores: HealthScores;
  weeklyTrendData: Array<{ date: string; value: number }>;
  insights: Insight[];
  combinedActivity: CombinedActivity[];
  cotizacionTopProducts?: Array<{ itemNumber: number; name: string; count: number }>;
  metrics: { streak: number };
  generateTrendData: (current: number, variance?: number) => number[];
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  activeTab,
  viewStats,
  totalCotizaciones,
  weekCotizaciones,
  healthScores,
  weeklyTrendData,
  insights,
  combinedActivity,
  cotizacionTopProducts,
  metrics,
  generateTrendData,
}) => {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  return (
    <TabPanel value={activeTab} index={0}>
      {/* Hero KPI Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mb: 3 }}>
        <MetricCard
          label="Views Hoy"
          value={viewStats?.todayViews || 0}
          icon={Eye}
          color={emeraldCore.primary}
          tooltip="Vistas totales de productos hoy por todos los usuarios"
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
          tooltip="Total de cotizaciones PDF exportadas por asesores"
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
          tooltip="Vistas acumuladas de los últimos 7 días"
          trend={{ data: generateTrendData(viewStats?.weekViews || 0) }}
          subtitle="Últimos 7 días"
          compact
        />
        <MetricCard
          label="Racha"
          value={`${metrics.streak} días`}
          icon={Zap}
          color="#F59E0B"
          tooltip="Días consecutivos con al menos una actividad registrada"
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
      {cotizacionTopProducts && cotizacionTopProducts.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <SectionHeader title="Top Productos Cotizados" icon={FileText} />
          <GlassCard noPadding>
            <HorizontalBarChart
              data={cotizacionTopProducts.slice(0, 5).map(p => ({
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
                secondary={
                  item.type === 'cotizacion'
                    ? `Cliente: ${item.clientName}`
                    : item.inviterName
                      ? `inv. por ${item.inviterName}`
                      : undefined
                }
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
  );
};

export default OverviewTab;
