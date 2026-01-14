/**
 * ProviderDashboard - Provider's personal activity center
 *
 * Shows the provider's own submitted quotations, their status,
 * and engagement metrics. Distinct from Solicitudes (TM's requests).
 *
 * Designed by Aria - Capitana del Concilio de Creacion
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  alpha,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  Package,
  Eye,
  CheckCircle,
  Clock,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';
import { useGoogleAuth } from '../../contexts/GoogleAuthContext';
import { brand, iosSemanticColors, iosTypographyScale, typography, radius } from '../../design-system';
import { PRODUCT_TYPE_LABELS, QUOTATION_STATUS_LABELS, type ProviderQuotation, type QuotationStatus } from '../../types/provider';

interface DashboardStats {
  totalQuotations: number;
  disponibles: number;
  reservados: number;
  vendidos: number;
  viewedByAdmin: number;
}

export default function ProviderDashboard() {
  const theme = useTheme();
  const { user } = useGoogleAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalQuotations: 0,
    disponibles: 0,
    reservados: 0,
    vendidos: 0,
    viewedByAdmin: 0,
  });
  const [myQuotations, setMyQuotations] = useState<ProviderQuotation[]>([]);
  const [loading, setLoading] = useState(true);

  // iOS HIG semantic colors
  const isDark = theme.palette.mode === 'dark';
  const mode = isDark ? 'dark' : 'light';
  const labelColor = iosSemanticColors.label[mode];
  const secondaryLabelColor = iosSemanticColors.secondaryLabel[mode];
  const tertiaryLabelColor = iosSemanticColors.tertiaryLabel[mode];

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        // Fetch provider's own quotations
        const quotationsRes = await fetch(`/api/provider-quotations?email=${encodeURIComponent(user.email)}`);
        const quotationsData = await quotationsRes.json();

        if (quotationsData.success) {
          const quotations: ProviderQuotation[] = quotationsData.quotations || [];
          // Sort by date (newest first)
          quotations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          setMyQuotations(quotations);
          setStats({
            totalQuotations: quotations.length,
            disponibles: quotations.filter(q => q.status === 'disponible').length,
            reservados: quotations.filter(q => q.status === 'reservado').length,
            vendidos: quotations.filter(q => q.status === 'vendido').length,
            viewedByAdmin: quotations.filter(q => q.viewedByAdmin).length,
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.email]);

  const getStatusColor = (status: QuotationStatus) => {
    switch (status) {
      case 'disponible': return brand.emerald[500];
      case 'reservado': return '#f59e0b';
      case 'vendido': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: QuotationStatus) => {
    switch (status) {
      case 'disponible': return CheckCircle;
      case 'reservado': return Clock;
      case 'vendido': return ShoppingBag;
      default: return Package;
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    }
    return `$${price.toLocaleString('es-CO')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} dias`;

    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress sx={{ color: brand.emerald[500] }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, pb: 10 }}>
      {/* Welcome Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontSize: iosTypographyScale.largeTitle,
            fontWeight: typography.weight.bold,
            color: labelColor,
            letterSpacing: typography.letterSpacing.tighter,
            mb: 0.5,
          }}
        >
          Mis Cotizaciones
        </Typography>
        <Typography
          sx={{
            fontSize: iosTypographyScale.subhead,
            fontWeight: typography.weight.normal,
            color: secondaryLabelColor,
            letterSpacing: typography.letterSpacing.tight,
          }}
        >
          Hola, {user?.name?.split(' ')[0] || 'Proveedor'}
        </Typography>
      </Box>

      {/* Stats Summary - Horizontal scroll on mobile */}
      <Box sx={{ mb: 3, mx: -2, px: 2, overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
        <Stack direction="row" spacing={1.5} sx={{ minWidth: 'max-content' }}>
          {/* Total */}
          <Card
            sx={{
              minWidth: 100,
              bgcolor: alpha(brand.emerald[500], 0.08),
              border: 'none',
              boxShadow: 'none',
              borderRadius: radius.lg,
            }}
          >
            <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Package size={16} color={brand.emerald[500]} />
                <Typography sx={{ fontSize: iosTypographyScale.caption1, color: secondaryLabelColor }}>
                  Enviadas
                </Typography>
              </Box>
              <Typography sx={{ fontSize: iosTypographyScale.title2, fontWeight: typography.weight.bold, color: brand.emerald[500] }}>
                {stats.totalQuotations}
              </Typography>
            </CardContent>
          </Card>

          {/* Disponibles */}
          <Card
            sx={{
              minWidth: 100,
              bgcolor: alpha(brand.emerald[500], 0.08),
              border: 'none',
              boxShadow: 'none',
              borderRadius: radius.lg,
            }}
          >
            <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <CheckCircle size={16} color={brand.emerald[500]} />
                <Typography sx={{ fontSize: iosTypographyScale.caption1, color: secondaryLabelColor }}>
                  Activas
                </Typography>
              </Box>
              <Typography sx={{ fontSize: iosTypographyScale.title2, fontWeight: typography.weight.bold, color: brand.emerald[500] }}>
                {stats.disponibles}
              </Typography>
            </CardContent>
          </Card>

          {/* Vistas */}
          <Card
            sx={{
              minWidth: 100,
              bgcolor: alpha('#6366f1', 0.08),
              border: 'none',
              boxShadow: 'none',
              borderRadius: radius.lg,
            }}
          >
            <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Eye size={16} color="#6366f1" />
                <Typography sx={{ fontSize: iosTypographyScale.caption1, color: secondaryLabelColor }}>
                  Vistas
                </Typography>
              </Box>
              <Typography sx={{ fontSize: iosTypographyScale.title2, fontWeight: typography.weight.bold, color: '#6366f1' }}>
                {stats.viewedByAdmin}
              </Typography>
            </CardContent>
          </Card>

          {/* Vendidas */}
          <Card
            sx={{
              minWidth: 100,
              bgcolor: alpha('#10b981', 0.08),
              border: 'none',
              boxShadow: 'none',
              borderRadius: radius.lg,
            }}
          >
            <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <TrendingUp size={16} color="#10b981" />
                <Typography sx={{ fontSize: iosTypographyScale.caption1, color: secondaryLabelColor }}>
                  Vendidas
                </Typography>
              </Box>
              <Typography sx={{ fontSize: iosTypographyScale.title2, fontWeight: typography.weight.bold, color: '#10b981' }}>
                {stats.vendidos}
              </Typography>
            </CardContent>
          </Card>
        </Stack>
      </Box>

      {/* My Quotations History */}
      <Typography
        sx={{
          fontSize: iosTypographyScale.footnote,
          fontWeight: typography.weight.semibold,
          color: secondaryLabelColor,
          textTransform: 'uppercase',
          letterSpacing: typography.letterSpacing.wide,
          mb: 1.5,
        }}
      >
        Historial de Cotizaciones
      </Typography>

      {myQuotations.length === 0 ? (
        <Card
          sx={{
            bgcolor: alpha(brand.emerald[500], 0.04),
            border: 'none',
            boxShadow: 'none',
            borderRadius: radius.lg,
          }}
        >
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Package size={48} color={brand.emerald[500]} style={{ marginBottom: 16, opacity: 0.5 }} />
            <Typography
              sx={{
                fontSize: iosTypographyScale.body,
                color: secondaryLabelColor,
                mb: 1,
              }}
            >
              Aun no has enviado cotizaciones
            </Typography>
            <Typography
              sx={{
                fontSize: iosTypographyScale.caption1,
                color: tertiaryLabelColor,
              }}
            >
              Usa el tab "Cotizar" para enviar tu primera oferta
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={1.5}>
          {myQuotations.map((quotation) => {
            const StatusIcon = getStatusIcon(quotation.status);

            return (
              <Card
                key={quotation.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: 'none',
                  borderRadius: radius.md,
                  overflow: 'hidden',
                }}
              >
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                  <Box sx={{ display: 'flex' }}>
                    {/* Thumbnail */}
                    {quotation.photoUrls && quotation.photoUrls.length > 0 ? (
                      <Box
                        sx={{
                          width: 80,
                          height: 80,
                          flexShrink: 0,
                          bgcolor: alpha(brand.emerald[500], 0.1),
                          backgroundImage: `url(${quotation.photoUrls[0]})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 80,
                          height: 80,
                          flexShrink: 0,
                          bgcolor: alpha(brand.emerald[500], 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Package size={32} color={brand.emerald[500]} />
                      </Box>
                    )}

                    {/* Content */}
                    <Box sx={{ flex: 1, p: 1.5, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                        <Typography
                          sx={{
                            fontSize: iosTypographyScale.subhead,
                            fontWeight: typography.weight.semibold,
                            color: labelColor,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {PRODUCT_TYPE_LABELS[quotation.productType]} - {quotation.color}
                        </Typography>
                        <Chip
                          icon={<StatusIcon size={12} />}
                          label={QUOTATION_STATUS_LABELS[quotation.status]}
                          size="small"
                          sx={{
                            bgcolor: alpha(getStatusColor(quotation.status), 0.1),
                            color: getStatusColor(quotation.status),
                            fontWeight: typography.weight.semibold,
                            fontSize: '10px',
                            height: 20,
                            ml: 1,
                            '& .MuiChip-icon': { color: 'inherit' },
                            '& .MuiChip-label': { px: 0.75 },
                          }}
                        />
                      </Box>

                      <Typography
                        sx={{
                          fontSize: iosTypographyScale.caption1,
                          color: secondaryLabelColor,
                          mb: 0.5,
                        }}
                      >
                        {quotation.quality} {quotation.weightCarats > 0 && `| ${quotation.weightCarats} ct`}
                      </Typography>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography
                          sx={{
                            fontSize: iosTypographyScale.subhead,
                            fontWeight: typography.weight.bold,
                            color: brand.emerald[600],
                          }}
                        >
                          {formatPrice(quotation.priceCOP)}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {quotation.viewedByAdmin && (
                            <Eye size={12} color="#6366f1" />
                          )}
                          <Typography
                            sx={{
                              fontSize: iosTypographyScale.caption2,
                              color: tertiaryLabelColor,
                            }}
                          >
                            {formatDate(quotation.createdAt)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
