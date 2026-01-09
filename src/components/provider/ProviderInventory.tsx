/**
 * ProviderInventory - List of provider's submitted quotations
 *
 * Shows all quotations submitted by the provider with their status.
 * Designed with iOS HIG compliance.
 *
 * Designed by Aria - Capitana del Concilio de Creación
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Stack,
  Tab,
  Tabs,
  alpha,
  CircularProgress,
  IconButton,
  useTheme,
} from '@mui/material';
import { Package, Eye, EyeOff, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useGoogleAuth } from '../../contexts/GoogleAuthContext';
import { brand, iosSemanticColors, iosTypographyScale, typography, radius } from '../../design-system';
import { PRODUCT_TYPE_LABELS, QUOTATION_STATUS_LABELS } from '../../types/provider';
import type { ProviderQuotation, QuotationStatus } from '../../types/provider';

export default function ProviderInventory() {
  const theme = useTheme();
  const { user } = useGoogleAuth();
  const [quotations, setQuotations] = useState<ProviderQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | QuotationStatus>('all');

  // iOS HIG semantic colors
  const isDark = theme.palette.mode === 'dark';
  const mode = isDark ? 'dark' : 'light';
  const labelColor = iosSemanticColors.label[mode];
  const secondaryLabelColor = iosSemanticColors.secondaryLabel[mode];
  const tertiaryLabelColor = iosSemanticColors.tertiaryLabel[mode];

  useEffect(() => {
    const fetchQuotations = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/provider-quotations?email=${encodeURIComponent(user.email)}`);
        const data = await response.json();

        if (data.success) {
          setQuotations(data.quotations || []);
        }
      } catch (error) {
        console.error('Error fetching quotations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotations();
  }, [user?.email]);

  const filteredQuotations = activeTab === 'all'
    ? quotations
    : quotations.filter(q => q.status === activeTab);

  const getStatusColor = (status: QuotationStatus) => {
    switch (status) {
      case 'disponible': return brand.emerald[500];
      case 'reservado': return '#f59e0b';
      case 'vendido': return '#6366f1';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: QuotationStatus) => {
    switch (status) {
      case 'disponible': return CheckCircle;
      case 'reservado': return Clock;
      case 'vendido': return XCircle;
      default: return Package;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatPrice = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    return `$${(amount / 1000).toFixed(0)}K`;
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Seguro que deseas eliminar esta cotizacion?')) return;

    try {
      const response = await fetch(`/api/provider-quotations?id=${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        setQuotations(prev => prev.filter(q => q.id !== id));
      }
    } catch (error) {
      console.error('Error deleting quotation:', error);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress sx={{ color: brand.emerald[500] }} />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 10 }}>
      {/* Header - iOS Large Title style */}
      <Box sx={{ p: 2, pb: 0 }}>
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
            color: secondaryLabelColor,
            letterSpacing: typography.letterSpacing.tight,
          }}
        >
          {quotations.length} cotizacion{quotations.length !== 1 ? 'es' : ''} enviada{quotations.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {/* Tabs - iOS Segmented Control style */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          px: 2,
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: typography.weight.semibold,
            fontSize: iosTypographyScale.subhead,
            minWidth: 'auto',
            px: 2,
          },
          '& .Mui-selected': {
            color: brand.emerald[500],
          },
          '& .MuiTabs-indicator': {
            bgcolor: brand.emerald[500],
          },
        }}
      >
        <Tab label={`Todas (${quotations.length})`} value="all" />
        <Tab label={`Disponibles (${quotations.filter(q => q.status === 'disponible').length})`} value="disponible" />
        <Tab label="Reservadas" value="reservado" />
        <Tab label="Vendidas" value="vendido" />
      </Tabs>

      {/* Quotation List */}
      <Box sx={{ p: 2 }}>
        {filteredQuotations.length === 0 ? (
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
                No hay cotizaciones {activeTab !== 'all' ? QUOTATION_STATUS_LABELS[activeTab].toLowerCase() + 's' : ''}
              </Typography>
              <Typography
                sx={{
                  fontSize: iosTypographyScale.caption1,
                  color: tertiaryLabelColor,
                }}
              >
                Envia tu primera cotizacion para verla aqui
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={2}>
            {filteredQuotations.map((quotation) => {
              const StatusIcon = getStatusIcon(quotation.status);

              return (
                <Card
                  key={quotation.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: 'none',
                    borderRadius: radius.md,
                    position: 'relative',
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          sx={{
                            fontSize: iosTypographyScale.headline,
                            fontWeight: typography.weight.semibold,
                            color: labelColor,
                          }}
                        >
                          {PRODUCT_TYPE_LABELS[quotation.productType]}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: iosTypographyScale.caption1,
                            color: secondaryLabelColor,
                          }}
                        >
                          {formatDate(quotation.createdAt)} | {quotation.weightCarats} ct
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          icon={<StatusIcon size={14} />}
                          label={QUOTATION_STATUS_LABELS[quotation.status]}
                          size="small"
                          sx={{
                            bgcolor: alpha(getStatusColor(quotation.status), 0.1),
                            color: getStatusColor(quotation.status),
                            fontWeight: typography.weight.semibold,
                            fontSize: iosTypographyScale.caption2,
                            borderRadius: radius.sm,
                            '& .MuiChip-icon': {
                              color: 'inherit',
                            },
                          }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(quotation.id)}
                          sx={{ color: tertiaryLabelColor }}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </Stack>
                    </Box>

                    {/* Description */}
                    <Typography
                      sx={{
                        fontSize: iosTypographyScale.subhead,
                        color: secondaryLabelColor,
                        mb: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {quotation.description}
                    </Typography>

                    {/* Specs */}
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1.5, gap: 0.5 }}>
                      <Chip
                        label={quotation.color}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: 'divider',
                          fontSize: iosTypographyScale.caption2,
                          borderRadius: radius.sm,
                        }}
                      />
                      <Chip
                        label={quotation.quality}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: 'divider',
                          fontSize: iosTypographyScale.caption2,
                          borderRadius: radius.sm,
                        }}
                      />
                      <Chip
                        label={formatPrice(quotation.priceCOP)}
                        size="small"
                        sx={{
                          bgcolor: alpha(brand.emerald[500], 0.1),
                          color: brand.emerald[500],
                          fontWeight: typography.weight.semibold,
                          fontSize: iosTypographyScale.caption2,
                          borderRadius: radius.sm,
                        }}
                      />
                      <Chip
                        label={`${quotation.availability} disponible${quotation.availability !== 1 ? 's' : ''}`}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: 'divider',
                          fontSize: iosTypographyScale.caption2,
                          borderRadius: radius.sm,
                        }}
                      />
                    </Stack>

                    {/* Admin view status */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {quotation.viewedByAdmin ? (
                        <>
                          <Eye size={14} color={brand.emerald[500]} />
                          <Typography
                            sx={{
                              fontSize: iosTypographyScale.caption1,
                              color: brand.emerald[500],
                            }}
                          >
                            Vista por el administrador
                          </Typography>
                        </>
                      ) : (
                        <>
                          <EyeOff size={14} color={tertiaryLabelColor} />
                          <Typography
                            sx={{
                              fontSize: iosTypographyScale.caption1,
                              color: tertiaryLabelColor,
                            }}
                          >
                            Pendiente de revision
                          </Typography>
                        </>
                      )}
                    </Box>

                    {/* Request link */}
                    {quotation.requestId && (
                      <Typography
                        sx={{
                          fontSize: iosTypographyScale.caption2,
                          color: tertiaryLabelColor,
                          display: 'block',
                          mt: 1,
                        }}
                      >
                        Respuesta a solicitud #{quotation.requestId}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
