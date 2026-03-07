/**
 * QuotationRequestList - Admin view of all quotation requests and responses
 *
 * Shows requests sent to providers and their responses.
 */

import { useState, useEffect } from 'react';
import { useGoogleAuth } from '../../contexts/GoogleAuthContext';
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
  IconButton,
} from '@mui/material';
import { FileText, Plus, Clock, CheckCircle, XCircle, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { emeraldCore } from '../../design-system/tokens/colors';
import { accentColors, primitiveColors } from '../../design-system';
import { useNotification } from '../../contexts/NotificationContext';
import { PRODUCT_TYPE_LABELS, REQUEST_STATUS_LABELS } from '../../types/provider';
import type { QuotationRequest, RequestStatus } from '../../types/provider';

export default function QuotationRequestList() {
  const navigate = useNavigate();
  const { confirmAction } = useNotification();
  const { user } = useGoogleAuth();
  const [requests, setRequests] = useState<QuotationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | RequestStatus>('all');

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await fetch('/api/quotation-requests', {
          headers: { 'x-requester-email': user?.email ?? '' },
        });
        const data = await response.json();

        if (data.success) {
          setRequests(data.requests || []);
        }
      } catch (error) {
        console.error('Error fetching requests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const filteredRequests = activeTab === 'all'
    ? requests
    : requests.filter(r => r.status === activeTab);

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case 'pendiente': return accentColors.warning.light;
      case 'respondida': return emeraldCore.primary;
      case 'cancelada': return accentColors.error.light;
      default: return primitiveColors.metallic.silver[500];
    }
  };

  const getStatusIcon = (status: RequestStatus) => {
    switch (status) {
      case 'pendiente': return Clock;
      case 'respondida': return CheckCircle;
      case 'cancelada': return XCircle;
      default: return FileText;
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

  const formatBudget = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    return `$${(amount / 1000).toFixed(0)}K`;
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmAction('¿Seguro que deseas eliminar esta solicitud?');
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/quotation-requests?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-requester-email': user?.email ?? '' },
      });
      const data = await response.json();

      if (data.success) {
        setRequests(prev => prev.filter(r => r.id !== id));
      }
    } catch (error) {
      console.error('Error deleting request:', error);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress aria-label="Cargando" sx={{ color: emeraldCore.primary }} />
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
              Solicitudes a Proveedores
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {requests.length} solicitud{requests.length !== 1 ? 'es' : ''} enviada{requests.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => navigate('/cuentas/solicitudes/nueva')}
            sx={{
              bgcolor: emeraldCore.primary,
              '&:hover': { bgcolor: alpha(emeraldCore.primary, 0.87) },
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Nueva
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
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
        <Tab label={`Todas (${requests.length})`} value="all" />
        <Tab label={`Pendientes (${requests.filter(r => r.status === 'pendiente').length})`} value="pendiente" />
        <Tab label="Respondidas" value="respondida" />
        <Tab label="Canceladas" value="cancelada" />
      </Tabs>

      {/* Request List */}
      <Box sx={{ p: 2 }}>
        {filteredRequests.length === 0 ? (
          <Card sx={{ bgcolor: alpha(emeraldCore.primary, 0.04), border: 'none', boxShadow: 'none' }}>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <FileText size={48} color={emeraldCore.primary} style={{ marginBottom: 16, opacity: 0.5 }} />
              <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2 }}>
                No hay solicitudes {activeTab !== 'all' ? REQUEST_STATUS_LABELS[activeTab].toLowerCase() + 's' : ''}
              </Typography>
              <Button
                variant="contained"
                startIcon={<Plus size={18} />}
                onClick={() => navigate('/cuentas/solicitudes/nueva')}
                sx={{
                  bgcolor: emeraldCore.primary,
                  '&:hover': { bgcolor: alpha(emeraldCore.primary, 0.87) },
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Crear Primera Solicitud
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={2}>
            {filteredRequests.map((request) => {
              const StatusIcon = getStatusIcon(request.status);

              return (
                <Card
                  key={request.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: 'none',
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {PRODUCT_TYPE_LABELS[request.productType]}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {formatDate(request.createdAt)} | Por: {request.createdBy}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          icon={<StatusIcon size={14} />}
                          label={REQUEST_STATUS_LABELS[request.status]}
                          size="small"
                          sx={{
                            bgcolor: alpha(getStatusColor(request.status), 0.1),
                            color: getStatusColor(request.status),
                            fontWeight: 600,
                            '& .MuiChip-icon': {
                              color: 'inherit',
                            },
                          }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(request.id)}
                          sx={{ color: 'text.disabled' }}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </Stack>
                    </Box>

                    {/* Specs */}
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1.5 }}>
                      <Chip
                        label={`${request.weightMin}-${request.weightMax} ct`}
                        size="small"
                        variant="outlined"
                        sx={{ borderColor: 'divider' }}
                      />
                      <Chip
                        label={request.colorPreference}
                        size="small"
                        variant="outlined"
                        sx={{ borderColor: 'divider' }}
                      />
                      <Chip
                        label={request.qualityPreference}
                        size="small"
                        variant="outlined"
                        sx={{ borderColor: 'divider' }}
                      />
                      <Chip
                        label={`Max ${formatBudget(request.budgetMax)}`}
                        size="small"
                        sx={{
                          bgcolor: alpha(emeraldCore.primary, 0.1),
                          color: emeraldCore.primary,
                          fontWeight: 600,
                        }}
                      />
                    </Stack>

                    {/* Assigned Provider */}
                    {request.assignedProvider && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                        Asignado a: {request.assignedProvider}
                      </Typography>
                    )}

                    {/* Notes */}
                    {request.notes && (
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'text.secondary',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {request.notes}
                      </Typography>
                    )}

                    {/* View Response Button */}
                    {request.status === 'respondida' && request.responseId && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => navigate(`/cuentas/cotizaciones-proveedor?id=${request.responseId}`)}
                        sx={{
                          mt: 1.5,
                          borderColor: emeraldCore.primary,
                          color: emeraldCore.primary,
                          textTransform: 'none',
                          fontWeight: 600,
                        }}
                      >
                        Ver Respuesta
                      </Button>
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
