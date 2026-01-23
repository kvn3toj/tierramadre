/**
 * Product Viewers Analytics Page
 *
 * Shows detailed analytics for who viewed a specific product:
 * - Total views and unique viewers
 * - List of all viewers with their view count
 * - Device/browser breakdown
 * - Cotizaciones that include this product
 * - Recent view activity timeline
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, alpha, IconButton, Skeleton } from '@mui/material';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useThemeMode } from '../../../contexts/ThemeContext';
import { useTreasure } from '../../../hooks/useTreasure';
import { emeraldCore } from '../../../design-system/tokens/colors';
import { spacing } from '../../../design-system/tokens/primitives/spacing';
import type { ProductDetailViews, ProductCotizaciones } from './types';
import {
  ViewerStats,
  DeviceBreakdown,
  ViewersList,
  CotizacionesList,
  RecentActivity,
  NoViews,
  NoCotizaciones,
} from './components';

const ProductViewersPage: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const { treasure } = useTreasure();

  const [data, setData] = useState<ProductDetailViews | null>(null);
  const [cotizacionData, setCotizacionData] = useState<ProductCotizaciones | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCotizacionLoading, setIsCotizacionLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get product info from treasure items
  const product = useMemo(() => {
    if (!itemId) return null;
    return treasure.find((item) => item.item === parseInt(itemId, 10));
  }, [treasure, itemId]);

  // Fetch detailed view data
  const fetchData = useCallback(async () => {
    if (!itemId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/product-views?action=product&itemId=${itemId}`);
      const result = await response.json();

      if (result.success) {
        setData(result);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Error fetching view data');
      console.error('ProductViewersPage error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [itemId]);

  // Fetch cotización data - who quoted this product
  const fetchCotizacionData = useCallback(async () => {
    if (!itemId) return;

    setIsCotizacionLoading(true);

    try {
      const response = await fetch(
        `/api/cotizacion-save?action=productCotizaciones&itemId=${itemId}`
      );
      const result = await response.json();

      if (result.success) {
        setCotizacionData(result);
      }
    } catch (err) {
      console.error('ProductViewersPage cotización error:', err);
    } finally {
      setIsCotizacionLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    fetchData();
    fetchCotizacionData();
  }, [fetchData, fetchCotizacionData]);

  // Get display name
  const productName = data?.productName || product?.nombre || `Item #${itemId}`;
  const isRefreshing = isLoading || isCotizacionLoading;

  return (
    <Box sx={{ minHeight: '100%', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          bgcolor: 'background.default',
          borderBottom: `1px solid ${alpha(isLight ? '#000' : '#fff', 0.1)}`,
          px: 2,
          py: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton
            onClick={() => navigate('/admin/analytics')}
            sx={{
              bgcolor: alpha(emeraldCore.primary, 0.1),
              '&:hover': { bgcolor: alpha(emeraldCore.primary, 0.2) },
            }}
          >
            <ArrowLeft size={20} color={emeraldCore.primary} />
          </IconButton>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {productName}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Item #{itemId} - Analytics de vistas y cotizaciones
            </Typography>
          </Box>
          <IconButton
            onClick={() => {
              fetchData();
              fetchCotizacionData();
            }}
            disabled={isRefreshing}
            sx={{ color: emeraldCore.primary }}
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ p: spacing.md, pb: 12 }}>
        {/* Loading State */}
        {isLoading && !data && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Box
            sx={{
              p: 3,
              textAlign: 'center',
              bgcolor: alpha('#EF4444', 0.1),
              border: `1px solid ${alpha('#EF4444', 0.3)}`,
              borderRadius: 2,
            }}
          >
            <Typography color="error">{error}</Typography>
          </Box>
        )}

        {/* Data Display */}
        {data && (
          <>
            {/* Stats Overview */}
            <ViewerStats
              totalViews={data.totalViews}
              uniqueViewers={data.uniqueViewers}
              loggedInViewers={data.loggedInViewers}
              guestViewers={data.guestViewers}
            />

            {/* Device Breakdown */}
            <DeviceBreakdown viewsByDevice={data.viewsByDevice} isLight={isLight} />

            {/* Viewers List */}
            <ViewersList viewers={data.viewers} isLight={isLight} />

            {/* Cotizaciones Section */}
            {cotizacionData && cotizacionData.totalCotizaciones > 0 && (
              <CotizacionesList data={cotizacionData} isLight={isLight} />
            )}

            {/* No Cotizaciones State */}
            {cotizacionData && cotizacionData.totalCotizaciones === 0 && (
              <NoCotizaciones hasViews={data.totalViews > 0} />
            )}

            {/* Recent Activity */}
            <RecentActivity recentViews={data.recentViews} isLight={isLight} />

            {/* No Views State */}
            {data.totalViews === 0 && <NoViews isLight={isLight} />}
          </>
        )}
      </Box>
    </Box>
  );
};

export default ProductViewersPage;
