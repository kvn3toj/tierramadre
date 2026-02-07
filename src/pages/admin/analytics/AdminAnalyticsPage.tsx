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
import {
  Box,
  Typography,
  Paper,
  alpha,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Download,
  RefreshCw,
  Package,
  Users,
  BarChart3,
  Heart,
} from 'lucide-react';
import { useThemeMode } from '../../../contexts/ThemeContext';
import { spacing, iosDimensions } from '../../../design-system/tokens/primitives/spacing';
import { iosTypographyScale } from '../../../design-system';
import { emeraldCore } from '../../../design-system/tokens/colors';

// Tab components
import { OverviewTab, ProductsTab, UsersTab, HealthTab } from './components';
import { useAnalyticsData } from './hooks';
import Breadcrumbs from '../../../components/shared/Breadcrumbs';

const AdminAnalyticsPage: React.FC = () => {
  const { mode } = useThemeMode();
  const [activeTab, setActiveTab] = useState(0);
  const [relativeTime, setRelativeTime] = useState('ahora');
  const isLight = mode === 'light';

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

  // Auto-update relative time display
  useEffect(() => {
    const updateRelativeTime = () => {
      const diffMs = Date.now() - lastRefreshedAt.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) setRelativeTime('ahora');
      else if (diffMin < 60) setRelativeTime(`hace ${diffMin} min`);
      else setRelativeTime(`hace ${Math.floor(diffMin / 60)}h`);
    };
    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 30000);
    return () => clearInterval(interval);
  }, [lastRefreshedAt]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ p: spacing.md, pb: 12, maxWidth: 600, mx: 'auto' }}>
      {/* Breadcrumb navigation */}
      <Breadcrumbs
        items={[
          { label: 'Cuentas', path: '/cuentas' },
          { label: 'Analytics' },
        ]}
      />

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontSize: iosTypographyScale.title2, fontWeight: 700 }}>
            Analytics
          </Typography>
          <Typography variant="caption" sx={{ fontSize: iosTypographyScale.caption1, color: 'text.secondary' }}>
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
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
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

      {/* Tab Panels */}
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
