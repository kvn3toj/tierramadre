/**
 * ProductsTab Component
 * Product analytics with top products and recent views.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, alpha } from '@mui/material';
import { Eye, Package, BarChart3, Clock, UserCheck, User } from 'lucide-react';
import { useThemeMode } from '../../../../contexts/ThemeContext';
import { emeraldCore } from '../../../../design-system/tokens/colors';
import { Card, MetricCard } from '../../../../design-system';
import { HorizontalBarChart } from '../../../../components/analytics/HorizontalBarChart';
import { formatTimeAgo } from '../../../../utils/formatting';
import {
  TabPanel,
  SectionHeader,
  ActivityItem,
} from '../../../../components/shared';

interface ProductsTabProps {
  activeTab: number;
  viewStats: {
    totalViews: number;
    uniqueProducts: number;
  } | null;
  topProducts: Array<{
    itemId: number;
    productName: string;
    views: number;
  }>;
  recentProductViews: Array<{
    timestamp: string;
    itemId: number;
    productName: string;
    userName?: string | null;
    inviterName?: string | null;
  }>;
  generateTrendData: (current: number, variance?: number) => number[];
}

export const ProductsTab: React.FC<ProductsTabProps> = ({
  activeTab,
  viewStats,
  topProducts,
  recentProductViews,
  generateTrendData,
}) => {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  return (
    <TabPanel value={activeTab} index={1}>
      {/* Product Stats Summary */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 1.5,
          mb: 3,
        }}
      >
        <MetricCard
          label="Total Views"
          value={viewStats?.totalViews || 0}
          icon={Eye}
          trend={{ data: generateTrendData(viewStats?.totalViews || 0) }}
          compact
        />
        <MetricCard
          label="Productos"
          value={viewStats?.uniqueProducts || 0}
          icon={Package}
          subtitle="Con al menos 1 vista"
          compact
        />
      </Box>

      {/* Top Products Bar Chart */}
      <SectionHeader title="Top 10 Productos" icon={BarChart3} />
      <Card variant="outlined">
        {topProducts.length > 0 ? (
          <HorizontalBarChart
            data={topProducts.slice(0, 10).map((p) => ({
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
      </Card>

      {/* Recent Product Views */}
      {recentProductViews.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <SectionHeader title="Vistas Recientes" icon={Clock} />
          <Card variant="outlined">
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
                      sx={{
                        color: emeraldCore.primary,
                        fontWeight: 600,
                        fontSize: 'inherit',
                      }}
                    >
                      {activity.productName}
                    </Typography>
                  </>
                }
                secondary={
                  activity.inviterName
                    ? `inv. por ${activity.inviterName}`
                    : undefined
                }
                time={formatTimeAgo(activity.timestamp)}
                isLast={idx === Math.min(recentProductViews.length, 8) - 1}
              />
            ))}
          </Card>
        </Box>
      )}
    </TabPanel>
  );
};

export default ProductsTab;
