/**
 * UsersTab Component
 * User analytics with breakdown and top viewers.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import {
  Eye,
  Users,
  PieChart,
} from 'lucide-react';
import { emeraldCore } from '../../../../design-system/tokens/colors';
import { DonutChart } from '../../../../components/analytics/DonutChart';
import { HorizontalBarChart } from '../../../../components/analytics/HorizontalBarChart';
import {
  TabPanel,
  MetricCard,
  SectionHeader,
  GlassCard,
} from '../../../../components/shared';
import type { UserBreakdownSegment } from '../hooks/useAnalyticsData';

interface UsersTabProps {
  activeTab: number;
  viewStats: {
    totalViews: number;
    uniqueViewers: number;
  } | null;
  userBreakdown: UserBreakdownSegment[];
  topViewers: Array<{
    name: string;
    email: string | null;
    views: number;
    role: string;
  }>;
}

export const UsersTab: React.FC<UsersTabProps> = ({
  activeTab,
  viewStats,
  userBreakdown,
  topViewers,
}) => {
  const navigate = useNavigate();

  return (
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
  );
};

export default UsersTab;
