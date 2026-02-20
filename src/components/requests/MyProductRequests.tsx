/**
 * MyProductRequests - Asesor/Embajador view of their own product requests
 *
 * Shows requests submitted by the logged-in asesor/embajador and their status.
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
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  ArrowLeft,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGoogleAuth } from '../../contexts/GoogleAuthContext';
import { emeraldCore } from '../../design-system/tokens/colors';
import { accentColors, primitiveColors } from '../../design-system';
import {
  PRODUCT_TYPE_LABELS,
  PRODUCT_REQUEST_STATUS_LABELS,
  PRIORITY_LABELS,
} from '../../types/provider';
import type { ProductRequest, ProductRequestStatus, RequestPriority } from '../../types/provider';

export default function MyProductRequests() {
  const navigate = useNavigate();
  const { user } = useGoogleAuth();
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | ProductRequestStatus>('all');

  useEffect(() => {
    if (user?.email) {
      fetchMyRequests();
    }
  }, [user?.email]);

  const fetchMyRequests = async () => {
    try {
      const response = await fetch(`/api/product-requests?email=${encodeURIComponent(user?.email || '')}`);
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

  const filteredRequests = activeTab === 'all'
    ? requests
    : requests.filter(r => r.status === activeTab);

  const getStatusColor = (status: ProductRequestStatus) => {
    switch (status) {
      case 'pendiente': return accentColors.warning.light;
      case 'aprobada': return emeraldCore.primary;
      case 'enviada_proveedor': return accentColors.info.light;
      case 'rechazada': return accentColors.error.light;
      case 'completada': return accentColors.success.light;
      default: return primitiveColors.metallic.silver[500];
    }
  };

  const getStatusIcon = (status: ProductRequestStatus) => {
    switch (status) {
      case 'pendiente': return Clock;
      case 'aprobada': return CheckCircle;
      case 'enviada_proveedor': return Send;
      case 'rechazada': return XCircle;
      case 'completada': return CheckCircle;
      default: return FileText;
    }
  };

  const getPriorityColor = (priority: RequestPriority) => {
    switch (priority) {
      case 'muy_urgente': return accentColors.error.light;
      case 'urgente': return accentColors.warning.light;
      default: return primitiveColors.metallic.silver[500];
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatBudget = (amount: number) => {
    if (!amount) return '-';
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    return `$${(amount / 1000).toFixed(0)}K`;
  };

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
            onClick={() => navigate(-1)}
            sx={{ minWidth: 'auto', p: 1 }}
          >
            <ArrowLeft size={20} />
          </Button>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
              Mis Solicitudes
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {requests.length} solicitud{requests.length !== 1 ? 'es' : ''} enviada{requests.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => navigate('/solicitar-producto')}
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
        <Tab label={`Todas (${requests.length})`} value="all" />
        <Tab label={`Pendientes (${requests.filter(r => r.status === 'pendiente').length})`} value="pendiente" />
        <Tab label="Aprobadas" value="aprobada" />
        <Tab label="Completadas" value="completada" />
      </Tabs>

      {/* Request List */}
      <Box sx={{ p: 2 }}>
        {filteredRequests.length === 0 ? (
          <Card sx={{ bgcolor: alpha(emeraldCore.primary, 0.04), border: 'none', boxShadow: 'none' }}>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <FileText size={48} color={emeraldCore.primary} style={{ marginBottom: 16, opacity: 0.5 }} />
              <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2 }}>
                {activeTab === 'all'
                  ? 'No has enviado ninguna solicitud aun'
                  : `No tienes solicitudes ${PRODUCT_REQUEST_STATUS_LABELS[activeTab].toLowerCase()}s`
                }
              </Typography>
              {activeTab === 'all' && (
                <Button
                  variant="contained"
                  startIcon={<Plus size={18} />}
                  onClick={() => navigate('/solicitar-producto')}
                  sx={{
                    bgcolor: emeraldCore.primary,
                    '&:hover': { bgcolor: alpha(emeraldCore.primary, 0.87) },
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  Crear Primera Solicitud
                </Button>
              )}
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
                          {formatDate(request.createdAt)}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {request.priority !== 'normal' && (
                          <Chip
                            icon={<AlertTriangle size={12} />}
                            label={PRIORITY_LABELS[request.priority]}
                            size="small"
                            sx={{
                              bgcolor: alpha(getPriorityColor(request.priority), 0.1),
                              color: getPriorityColor(request.priority),
                              fontWeight: 600,
                              '& .MuiChip-icon': { color: 'inherit' },
                            }}
                          />
                        )}
                        <Chip
                          icon={<StatusIcon size={14} />}
                          label={PRODUCT_REQUEST_STATUS_LABELS[request.status]}
                          size="small"
                          sx={{
                            bgcolor: alpha(getStatusColor(request.status), 0.1),
                            color: getStatusColor(request.status),
                            fontWeight: 600,
                            '& .MuiChip-icon': { color: 'inherit' },
                          }}
                        />
                      </Stack>
                    </Box>

                    {/* Description */}
                    <Typography
                      variant="body2"
                      sx={{
                        mb: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {request.description}
                    </Typography>

                    {/* Specs */}
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1.5, gap: 0.5 }}>
                      <Chip
                        label={`${request.weightMin}-${request.weightMax} ct`}
                        size="small"
                        variant="outlined"
                        sx={{ borderColor: 'divider' }}
                      />
                      {request.colorPreference && (
                        <Chip
                          label={request.colorPreference}
                          size="small"
                          variant="outlined"
                          sx={{ borderColor: 'divider' }}
                        />
                      )}
                      {request.qualityPreference && (
                        <Chip
                          label={request.qualityPreference}
                          size="small"
                          variant="outlined"
                          sx={{ borderColor: 'divider' }}
                        />
                      )}
                      <Chip
                        label={`x${request.quantity}`}
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

                    {/* Client Info */}
                    {request.clientName && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                        Cliente: {request.clientName}
                      </Typography>
                    )}

                    {/* Needed By */}
                    {request.neededBy && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                        Necesario para: {formatDate(request.neededBy)}
                      </Typography>
                    )}

                    {/* Admin Response */}
                    {request.adminResponse && (
                      <Box sx={{ mt: 1, p: 1.5, bgcolor: alpha(emeraldCore.primary, 0.05), borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 600 }}>
                          Respuesta de Tierra Madre:
                        </Typography>
                        <Typography variant="body2">{request.adminResponse}</Typography>
                        {request.respondedAt && (
                          <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.5 }}>
                            {formatDate(request.respondedAt)}
                          </Typography>
                        )}
                      </Box>
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
