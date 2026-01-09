/**
 * ProviderQuotationsList - Admin view of all provider quotations
 *
 * Shows all quotations submitted by providers for admin review.
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
  Button,
} from '@mui/material';
import { Package, Eye, EyeOff, ArrowLeft, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { emeraldCore } from '../../design-system/tokens/colors';
import { PRODUCT_TYPE_LABELS, QUOTATION_STATUS_LABELS } from '../../types/provider';
import type { ProviderQuotation, QuotationStatus } from '../../types/provider';

export default function ProviderQuotationsList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [quotations, setQuotations] = useState<ProviderQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | QuotationStatus | 'new'>('all');

  const highlightId = searchParams.get('id');

  useEffect(() => {
    const fetchQuotations = async () => {
      try {
        const response = await fetch('/api/provider-quotations');
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
  }, []);

  const filteredQuotations = activeTab === 'all'
    ? quotations
    : activeTab === 'new'
    ? quotations.filter(q => !q.viewedByAdmin)
    : quotations.filter(q => q.status === activeTab);

  const getStatusColor = (status: QuotationStatus) => {
    switch (status) {
      case 'disponible': return emeraldCore.primary;
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
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleMarkAsViewed = async (id: string) => {
    try {
      const response = await fetch('/api/mark-quotation-viewed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();

      if (data.success) {
        setQuotations(prev =>
          prev.map(q => q.id === id ? { ...q, viewedByAdmin: true } : q)
        );
      }
    } catch (error) {
      console.error('Error marking as viewed:', error);
    }
  };

  const newCount = quotations.filter(q => !q.viewedByAdmin).length;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress sx={{ color: emeraldCore.primary }} />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 10 }}>
      {/* Header */}
      <Box sx={{ p: 2, pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Button
            onClick={() => navigate('/cuentas')}
            sx={{ minWidth: 'auto', p: 1 }}
          >
            <ArrowLeft size={20} />
          </Button>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
              Cotizaciones de Proveedores
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {quotations.length} cotizacion{quotations.length !== 1 ? 'es' : ''} recibida{quotations.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
          {newCount > 0 && (
            <Chip
              label={`${newCount} nueva${newCount !== 1 ? 's' : ''}`}
              size="small"
              sx={{
                bgcolor: alpha('#f59e0b', 0.1),
                color: '#f59e0b',
                fontWeight: 600,
              }}
            />
          )}
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          px: 2,
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 600,
            minWidth: 'auto',
            px: 2,
          },
          '& .Mui-selected': {
            color: emeraldCore.primary,
          },
          '& .MuiTabs-indicator': {
            bgcolor: emeraldCore.primary,
          },
        }}
      >
        <Tab label={`Todas (${quotations.length})`} value="all" />
        {newCount > 0 && <Tab label={`Nuevas (${newCount})`} value="new" />}
        <Tab label="Disponibles" value="disponible" />
        <Tab label="Reservadas" value="reservado" />
        <Tab label="Vendidas" value="vendido" />
      </Tabs>

      {/* Quotation List */}
      <Box sx={{ p: 2 }}>
        {filteredQuotations.length === 0 ? (
          <Card sx={{ bgcolor: alpha(emeraldCore.primary, 0.04), border: 'none', boxShadow: 'none' }}>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Package size={48} color={emeraldCore.primary} style={{ marginBottom: 16, opacity: 0.5 }} />
              <Typography variant="body1" sx={{ color: 'text.secondary', mb: 1 }}>
                No hay cotizaciones {activeTab !== 'all' ? (activeTab === 'new' ? 'nuevas' : QUOTATION_STATUS_LABELS[activeTab as QuotationStatus].toLowerCase() + 's') : ''}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                Las cotizaciones de proveedores apareceran aqui
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={2}>
            {filteredQuotations.map((quotation) => {
              const StatusIcon = getStatusIcon(quotation.status);
              const isHighlighted = quotation.id === highlightId;
              const isNew = !quotation.viewedByAdmin;

              return (
                <Card
                  key={quotation.id}
                  sx={{
                    border: isHighlighted ? '2px solid' : '1px solid',
                    borderColor: isHighlighted ? emeraldCore.primary : isNew ? '#f59e0b' : 'divider',
                    boxShadow: isHighlighted ? `0 0 0 4px ${alpha(emeraldCore.primary, 0.1)}` : 'none',
                    position: 'relative',
                  }}
                  onClick={() => !quotation.viewedByAdmin && handleMarkAsViewed(quotation.id)}
                >
                  {isNew && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: '#f59e0b',
                      }}
                    />
                  )}
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {PRODUCT_TYPE_LABELS[quotation.productType]}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {formatDate(quotation.createdAt)} | De: {quotation.providerName || quotation.providerEmail}
                        </Typography>
                      </Box>
                      <Chip
                        icon={<StatusIcon size={14} />}
                        label={QUOTATION_STATUS_LABELS[quotation.status]}
                        size="small"
                        sx={{
                          bgcolor: alpha(getStatusColor(quotation.status), 0.1),
                          color: getStatusColor(quotation.status),
                          fontWeight: 600,
                          '& .MuiChip-icon': {
                            color: 'inherit',
                          },
                        }}
                      />
                    </Box>

                    {/* Description */}
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
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
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1.5 }}>
                      <Chip
                        label={`${quotation.weightCarats} ct`}
                        size="small"
                        variant="outlined"
                        sx={{ borderColor: 'divider' }}
                      />
                      <Chip
                        label={quotation.color}
                        size="small"
                        variant="outlined"
                        sx={{ borderColor: 'divider' }}
                      />
                      <Chip
                        label={quotation.quality}
                        size="small"
                        variant="outlined"
                        sx={{ borderColor: 'divider' }}
                      />
                      <Chip
                        label={`${quotation.availability} disp.`}
                        size="small"
                        variant="outlined"
                        sx={{ borderColor: 'divider' }}
                      />
                    </Stack>

                    {/* Price */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: emeraldCore.primary }}>
                        {formatPrice(quotation.priceCOP)}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {quotation.viewedByAdmin ? (
                          <>
                            <Eye size={14} color={emeraldCore.primary} />
                            <Typography variant="caption" sx={{ color: emeraldCore.primary }}>
                              Vista
                            </Typography>
                          </>
                        ) : (
                          <>
                            <EyeOff size={14} color="#f59e0b" />
                            <Typography variant="caption" sx={{ color: '#f59e0b' }}>
                              Nueva
                            </Typography>
                          </>
                        )}
                      </Box>
                    </Box>

                    {/* Request link */}
                    {quotation.requestId && (
                      <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 1 }}>
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
