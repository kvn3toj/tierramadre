/**
 * Cotización Products Analytics Page
 *
 * Shows detailed analytics for products in cotizaciones:
 * - Top products by count and value
 * - Which asesores quote which products
 * - Product value breakdown
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  alpha,
  IconButton,
  Chip,
  Skeleton,
  Tooltip,
} from '@mui/material';
import {
  ArrowLeft,
  FileText,
  Package,
  User,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Award,
} from 'lucide-react';
import { useThemeMode } from '../../contexts/ThemeContext';
import { useCotizacionStats, TopProduct, AsesorProductStats } from '../../hooks/useCotizacionStats';
import { emeraldCore, goldAccent, semanticColors } from '../../design-system/tokens/colors';
import { spacing, iosDimensions } from '../../design-system/tokens/primitives/spacing';

// =============================================================================
// STAT CARD COMPONENT
// =============================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, color }) => {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: iosDimensions.borderRadiusLarge,
        bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
        border: `1px solid ${alpha(color, 0.15)}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: iosDimensions.borderRadiusStandard,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(color, 0.12),
          }}
        >
          <Icon size={20} color={color} />
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color }}>
            {value}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {label}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

// =============================================================================
// PRODUCT ROW COMPONENT
// =============================================================================

interface ProductRowProps {
  product: TopProduct;
  rank: number;
  maxCount: number;
  onNavigate: (itemNumber: number) => void;
}

const ProductRow: React.FC<ProductRowProps> = ({ product, rank, maxCount, onNavigate }) => {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const percentage = maxCount > 0 ? (product.count / maxCount) * 100 : 0;

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  const medal = getMedalEmoji(rank);

  return (
    <Box
      onClick={() => onNavigate(product.itemNumber)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        borderBottom: `1px solid ${alpha(isLight ? '#000' : '#fff', 0.08)}`,
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        '&:hover': {
          bgcolor: alpha(emeraldCore.primary, 0.05),
        },
        '&:last-child': {
          borderBottom: 'none',
        },
      }}
    >
      {/* Rank */}
      <Box sx={{ minWidth: 32, textAlign: 'center' }}>
        {medal ? (
          <Typography sx={{ fontSize: '1.2rem' }}>{medal}</Typography>
        ) : (
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: 'text.secondary' }}
          >
            #{rank}
          </Typography>
        )}
      </Box>

      {/* Product Info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body1"
          sx={{
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {product.name}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Item #{product.itemNumber}
        </Typography>
        {/* Progress bar */}
        <Box
          sx={{
            mt: 0.5,
            height: 4,
            borderRadius: 2,
            bgcolor: alpha(goldAccent.primary, 0.15),
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              width: `${percentage}%`,
              height: '100%',
              bgcolor: goldAccent.primary,
              borderRadius: 2,
              transition: 'width 0.5s ease-out',
            }}
          />
        </Box>
      </Box>

      {/* Stats */}
      <Box sx={{ textAlign: 'right' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: goldAccent.primary }}>
          {product.count}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          cotizaciones
        </Typography>
      </Box>

      {/* Value */}
      <Box sx={{ textAlign: 'right', minWidth: 80 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: emeraldCore.primary }}>
          ${(product.totalValue / 1000000).toFixed(1)}M
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          valor total
        </Typography>
      </Box>
    </Box>
  );
};

// =============================================================================
// ASESOR ROW COMPONENT
// =============================================================================

interface AsesorRowProps {
  asesor: AsesorProductStats;
}

const AsesorRow: React.FC<AsesorRowProps> = ({ asesor }) => {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const totalProducts = asesor.topProducts.reduce((sum, p) => sum + p.count, 0);

  return (
    <Box
      sx={{
        p: 2,
        borderBottom: `1px solid ${alpha(isLight ? '#000' : '#fff', 0.08)}`,
        '&:last-child': {
          borderBottom: 'none',
        },
      }}
    >
      {/* Asesor header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            bgcolor: alpha(emeraldCore.primary, 0.12),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <User size={16} color={emeraldCore.primary} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {asesor.email.split('@')[0]}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {totalProducts} productos cotizados
          </Typography>
        </Box>
      </Box>

      {/* Top products for this asesor */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, ml: 5.5 }}>
        {asesor.topProducts.slice(0, 3).map((product, idx) => (
          <Chip
            key={`${asesor.email}-${product.itemNumber}`}
            label={`${product.name} (${product.count})`}
            size="small"
            sx={{
              bgcolor: alpha(goldAccent.primary, idx === 0 ? 0.15 : 0.08),
              color: idx === 0 ? goldAccent.primary : 'text.secondary',
              fontWeight: idx === 0 ? 600 : 400,
              fontSize: '0.7rem',
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const CotizacionProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  const { stats, isLoading, refetch } = useCotizacionStats();

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!stats?.topProducts || stats.topProducts.length === 0) {
      return {
        totalProducts: 0,
        totalCotizaciones: 0,
        totalValue: 0,
        avgValuePerProduct: 0,
      };
    }

    const totalProducts = stats.topProducts.length;
    const totalCotizaciones = stats.topProducts.reduce((sum, p) => sum + p.count, 0);
    const totalValue = stats.topProducts.reduce((sum, p) => sum + p.totalValue, 0);
    const avgValuePerProduct = totalProducts > 0 ? totalValue / totalProducts : 0;

    return {
      totalProducts,
      totalCotizaciones,
      totalValue,
      avgValuePerProduct,
    };
  }, [stats]);

  const handleNavigateToProduct = (itemNumber: number) => {
    navigate(`/admin/analytics/item/${itemNumber}`);
  };

  const maxCount = stats?.topProducts?.[0]?.count || 0;

  return (
    <Box sx={{ p: spacing.md, pb: 12, maxWidth: 600, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton
          onClick={() => navigate(-1)}
          sx={{
            bgcolor: isLight ? alpha('#000', 0.05) : alpha('#fff', 0.08),
          }}
        >
          <ArrowLeft size={20} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Productos en Cotizaciones
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Análisis de productos más cotizados
          </Typography>
        </Box>
        <Tooltip title="Actualizar">
          <IconButton
            onClick={() => refetch()}
            disabled={isLoading}
            sx={{ color: emeraldCore.primary }}
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Loading State */}
      {isLoading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Skeleton variant="rounded" height={80} />
          <Skeleton variant="rounded" height={80} />
          <Skeleton variant="rounded" height={200} />
        </Box>
      )}

      {/* Summary Stats */}
      {!isLoading && (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mb: 3 }}>
            <StatCard
              label="Productos Únicos"
              value={summaryStats.totalProducts}
              icon={Package}
              color={emeraldCore.primary}
            />
            <StatCard
              label="En Cotizaciones"
              value={summaryStats.totalCotizaciones}
              icon={FileText}
              color={goldAccent.primary}
            />
            <StatCard
              label="Valor Total"
              value={`$${(summaryStats.totalValue / 1000000).toFixed(1)}M`}
              icon={DollarSign}
              color={semanticColors.success.main}
            />
            <StatCard
              label="Valor Promedio"
              value={`$${(summaryStats.avgValuePerProduct / 1000000).toFixed(1)}M`}
              icon={TrendingUp}
              color="#8B5CF6"
            />
          </Box>

          {/* Top Products List */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: iosDimensions.borderRadiusLarge,
              bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
              border: `1px solid ${alpha(isLight ? '#000' : '#fff', 0.08)}`,
              overflow: 'hidden',
              mb: 3,
            }}
          >
            <Box
              sx={{
                p: 2,
                borderBottom: `1px solid ${alpha(isLight ? '#000' : '#fff', 0.08)}`,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Award size={18} color={goldAccent.primary} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Ranking de Productos
              </Typography>
            </Box>

            {stats?.topProducts && stats.topProducts.length > 0 ? (
              stats.topProducts.map((product, idx) => (
                <ProductRow
                  key={`${product.itemNumber}-${product.name}`}
                  product={product}
                  rank={idx + 1}
                  maxCount={maxCount}
                  onNavigate={handleNavigateToProduct}
                />
              ))
            ) : (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Package size={40} color={alpha(isLight ? '#000' : '#fff', 0.2)} />
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2 }}>
                  No hay datos de productos en cotizaciones.
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Los productos aparecerán aquí cuando se exporten cotizaciones.
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Products by Asesor */}
          {stats?.productsByAsesor && stats.productsByAsesor.length > 0 && (
            <Paper
              elevation={0}
              sx={{
                borderRadius: iosDimensions.borderRadiusLarge,
                bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
                border: `1px solid ${alpha(isLight ? '#000' : '#fff', 0.08)}`,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  p: 2,
                  borderBottom: `1px solid ${alpha(isLight ? '#000' : '#fff', 0.08)}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <User size={18} color={emeraldCore.primary} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Productos por Asesor
                </Typography>
              </Box>

              {stats.productsByAsesor.map((asesor) => (
                <AsesorRow key={asesor.email} asesor={asesor} />
              ))}
            </Paper>
          )}
        </>
      )}
    </Box>
  );
};

export default CotizacionProductsPage;
