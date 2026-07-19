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

import React, { useState, useEffect } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import {
  Download,
  RefreshCw,
  Package,
  Users,
  BarChart3,
  Heart,
} from 'lucide-react';
import {
  iosTypographyScale,
  primitiveSpacing as spacing,
} from '../../../design-system';
import { SegmentedControl } from '../../../design-system/components/SegmentedControl';
import { Card, Skeleton } from '../../../design-system';
import { emeraldCore } from '../../../design-system/tokens/colors';

// Tab components
import { OverviewTab, ProductsTab, UsersTab, HealthTab } from './components';
import { useAnalyticsData } from './hooks';
import Breadcrumbs from '../../../components/shared/Breadcrumbs';

const AdminAnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [relativeTime, setRelativeTime] = useState('ahora');
  // Tracks first load only — isLoading also flips true on manual refresh,
  // and we don't want an already-populated dashboard flashing back to a
  // skeleton every time the user hits the refresh button.
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Get all analytics data from the hook
  const {
    viewStats,
    cotizacionStats,
    topProducts,
    topViewers,
    recentProductViews,
    metrics,
    totalCotizaciones,
    weekCotizaciones,
    healthScores,
    healthColor,
    userBreakdown,
    combinedActivity,
    insights,
    healthInsights,
    weeklyTrendData,
    achievements,
    levelInfo,
    unlockedAchievements,
    ACHIEVEMENTS,
    getAchievementProgress,
    generateTrendData,
    handleExport,
    handleRefresh,
    isLoading,
    lastRefreshedAt,
  } = useAnalyticsData();

  useEffect(() => {
    if (!isLoading) setHasLoadedOnce(true);
  }, [isLoading]);

  // Auto-update relative time display
  useEffect(() => {
    const updateRelativeTime = () => {
      const diffMs = Date.now() - lastRefreshedAt.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) setRelativeTime('ahora');
      else if (diffMin < 60) setRelativeTime(`hace ${diffMin} min`);
      else setRelativeTime(`hace ${Math.floor(diffMin / 60)} h`);
    };
    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 30000);
    return () => clearInterval(interval);
  }, [lastRefreshedAt]);

  const handleTabChange = (newValue: string) => {
    setActiveTab(Number(newValue));
  };

  return (
    <Box sx={{ p: spacing.md, pb: 12, maxWidth: 600, mx: 'auto' }}>
      {/* Breadcrumb navigation */}
      <Breadcrumbs
        items={[{ label: 'Cuentas', path: '/cuentas' }, { label: 'Analytics' }]}
      />

      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{ fontSize: iosTypographyScale.title2, fontWeight: 700 }}
          >
            Analytics
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontSize: iosTypographyScale.caption1,
              color: 'text.secondary',
            }}
          >
            Dashboard de negocio · Actualizado {relativeTime}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Actualizar">
            <IconButton
              onClick={handleRefresh}
              size="small"
              disabled={isLoading}
              sx={{ color: emeraldCore.primary }}
            >
              <RefreshCw
                size={18}
                className={isLoading ? 'animate-spin' : ''}
              />
            </IconButton>
          </Tooltip>
          <Tooltip title="Exportar">
            <IconButton
              onClick={handleExport}
              size="small"
              sx={{ color: emeraldCore.primary }}
            >
              <Download size={18} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Segmented control tabs */}
      <Box sx={{ mb: 3 }}>
        <SegmentedControl
          ariaLabel="Sección de analytics"
          block
          value={String(activeTab)}
          onChange={handleTabChange}
          options={[
            {
              value: '0',
              label: (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <BarChart3 size={14} /> Overview
                </Box>
              ),
            },
            {
              value: '1',
              label: (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Package size={14} /> Products
                </Box>
              ),
            },
            {
              value: '2',
              label: (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Users size={14} /> Users
                </Box>
              ),
            },
            {
              value: '3',
              label: (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Heart size={14} /> Health
                </Box>
              ),
            },
          ]}
        />
      </Box>

      {/* Tab Panels */}
      {isLoading && !hasLoadedOnce ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 1.5,
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} variant="outlined">
              <Card.Content>
                <Skeleton variant="text" width="50%" height={14} />
                <Box sx={{ mt: 1 }}>
                  <Skeleton variant="text" width="70%" height={28} />
                </Box>
              </Card.Content>
            </Card>
          ))}
        </Box>
      ) : (
        <>
          <OverviewTab
            activeTab={activeTab}
            viewStats={viewStats}
            totalCotizaciones={totalCotizaciones}
            weekCotizaciones={weekCotizaciones}
            healthScores={healthScores}
            weeklyTrendData={weeklyTrendData}
            insights={insights}
            combinedActivity={combinedActivity}
            cotizacionTopProducts={cotizacionStats?.topProducts}
            metrics={metrics}
            generateTrendData={generateTrendData}
          />

          <ProductsTab
            activeTab={activeTab}
            viewStats={viewStats}
            topProducts={topProducts}
            recentProductViews={recentProductViews}
            generateTrendData={generateTrendData}
          />

          <UsersTab
            activeTab={activeTab}
            viewStats={viewStats}
            userBreakdown={userBreakdown}
            topViewers={topViewers}
          />

          <HealthTab
            activeTab={activeTab}
            healthScores={healthScores}
            healthColor={healthColor}
            healthInsights={healthInsights}
            cotizacionTopProducts={cotizacionStats?.topProducts}
            achievements={achievements}
            levelInfo={levelInfo}
            unlockedAchievements={unlockedAchievements}
            ACHIEVEMENTS={ACHIEVEMENTS}
            getAchievementProgress={getAchievementProgress}
          />
        </>
      )}

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
