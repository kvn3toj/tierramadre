/**
 * AdminProductRequestList - Admin view of product requests from asesores/embajadores
 *
 * Shows all product requests submitted by asesores and embajadores.
 * Admin can approve, reject, or forward to provider.
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
} from '@mui/material';
import { TextField } from '../../design-system/components/TextField';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  ArrowLeft,
  User,
  AlertTriangle,
  MessageSquare,
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
import type {
  ProductRequest,
  ProductRequestStatus,
  RequestPriority,
} from '../../types/provider';

export default function AdminProductRequestList() {
  const navigate = useNavigate();
  const { user } = useGoogleAuth();
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | ProductRequestStatus>(
    'all',
  );
  const [selectedRequest, setSelectedRequest] = useState<ProductRequest | null>(
    null,
  );
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [responseData, setResponseData] = useState({
    status: '',
    adminResponse: '',
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/product-requests', {
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

  const filteredRequests =
    activeTab === 'all'
      ? requests
      : requests.filter((r) => r.status === activeTab);

  const getStatusColor = (status: ProductRequestStatus) => {
    switch (status) {
      case 'pendiente':
        return accentColors.warning.light;
      case 'aprobada':
        return emeraldCore.primary;
      case 'enviada_proveedor':
        return accentColors.info.light;
      case 'rechazada':
        return accentColors.error.light;
      case 'completada':
        return accentColors.success.light;
      default:
        return primitiveColors.metallic.silver[500];
    }
  };

  const getStatusIcon = (status: ProductRequestStatus) => {
    switch (status) {
      case 'pendiente':
        return Clock;
      case 'aprobada':
        return CheckCircle;
      case 'enviada_proveedor':
        return Send;
      case 'rechazada':
        return XCircle;
      case 'completada':
        return CheckCircle;
      default:
        return FileText;
    }
  };

  const getPriorityColor = (priority: RequestPriority) => {
    switch (priority) {
      case 'muy_urgente':
        return accentColors.error.light;
      case 'urgente':
        return accentColors.warning.light;
      default:
        return primitiveColors.metallic.silver[500];
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

  const handleOpenResponse = (request: ProductRequest) => {
    setSelectedRequest(request);
    setResponseData({
      status: request.status,
      adminResponse: request.adminResponse || '',
    });
    setResponseDialogOpen(true);
  };

  const handleUpdateRequest = async () => {
    if (!selectedRequest) return;

    setUpdating(true);
    try {
      const response = await fetch('/api/product-requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-requester-email': user?.email ?? '',
        },
        body: JSON.stringify({
          id: selectedRequest.id,
          status: responseData.status,
          adminResponse: responseData.adminResponse,
          respondedBy: user?.email,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === selectedRequest.id
              ? {
                  ...r,
                  status: responseData.status as ProductRequestStatus,
                  adminResponse: responseData.adminResponse,
                  respondedBy: user?.email,
                }
              : r,
          ),
        );
        setResponseDialogOpen(false);
      }
    } catch (error) {
      console.error('Error updating request:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleForwardToProvider = (request: ProductRequest) => {
    // Navigate to quotation request form with pre-filled data
    navigate('/cuentas/solicitudes/nueva', {
      state: {
        fromProductRequest: request.id,
        productType: request.productType,
        weightMin: request.weightMin,
        weightMax: request.weightMax,
        colorPreference: request.colorPreference,
        qualityPreference: request.qualityPreference,
        budgetMax: request.budgetMax,
        notes: `Solicitud de ${request.requesterName}: ${request.description}`,
      },
    });
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
        }}
      >
        <CircularProgress
          aria-label="Cargando"
          sx={{ color: emeraldCore.primary }}
        />
      </Box>
    );
  }

  const pendingCount = requests.filter((r) => r.status === 'pendiente').length;

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
              Solicitudes de Asesores
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {requests.length} solicitud{requests.length !== 1 ? 'es' : ''}{' '}
              recibida{requests.length !== 1 ? 's' : ''}
              {pendingCount > 0 && (
                <Chip
                  label={`${pendingCount} pendiente${pendingCount !== 1 ? 's' : ''}`}
                  size="small"
                  sx={{
                    ml: 1,
                    bgcolor: alpha(accentColors.warning.light, 0.1),
                    color: accentColors.warning.light,
                    fontWeight: 600,
                  }}
                />
              )}
            </Typography>
          </Box>
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
        <Tab
          label={`Pendientes (${requests.filter((r) => r.status === 'pendiente').length})`}
          value="pendiente"
        />
        <Tab label="Aprobadas" value="aprobada" />
        <Tab label="Enviadas" value="enviada_proveedor" />
        <Tab label="Completadas" value="completada" />
      </Tabs>

      {/* Request List */}
      <Box sx={{ p: 2 }}>
        {filteredRequests.length === 0 ? (
          <Card
            sx={{
              bgcolor: alpha(emeraldCore.primary, 0.04),
              border: 'none',
              boxShadow: 'none',
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <FileText
                size={48}
                color={emeraldCore.primary}
                style={{ marginBottom: 16, opacity: 0.5 }}
              />
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                No hay solicitudes{' '}
                {activeTab !== 'all'
                  ? PRODUCT_REQUEST_STATUS_LABELS[activeTab].toLowerCase() + 's'
                  : ''}
              </Typography>
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
                    borderColor:
                      request.status === 'pendiente'
                        ? alpha(accentColors.warning.light, 0.3)
                        : 'divider',
                    boxShadow: 'none',
                    bgcolor:
                      request.status === 'pendiente'
                        ? alpha(accentColors.warning.light, 0.02)
                        : 'background.paper',
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    {/* Header */}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 1.5,
                      }}
                    >
                      <Box>
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 700 }}
                        >
                          {PRODUCT_TYPE_LABELS[request.productType]}
                        </Typography>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                          }}
                        >
                          <User size={12} />
                          <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary' }}
                          >
                            {request.requesterName} ({request.requesterRole})
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: 'text.disabled' }}
                          >
                            | {formatDate(request.createdAt)}
                          </Typography>
                        </Box>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {request.priority !== 'normal' && (
                          <Chip
                            icon={<AlertTriangle size={12} />}
                            label={PRIORITY_LABELS[request.priority]}
                            size="small"
                            sx={{
                              bgcolor: alpha(
                                getPriorityColor(request.priority),
                                0.1,
                              ),
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
                    <Stack
                      direction="row"
                      spacing={1}
                      flexWrap="wrap"
                      sx={{ mb: 1.5, gap: 0.5 }}
                    >
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
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          display: 'block',
                          mb: 1,
                        }}
                      >
                        Cliente: {request.clientName}
                      </Typography>
                    )}

                    {/* Needed By */}
                    {request.neededBy && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          display: 'block',
                          mb: 1,
                        }}
                      >
                        Necesario para: {formatDate(request.neededBy)}
                      </Typography>
                    )}

                    {/* Admin Response */}
                    {request.adminResponse && (
                      <Box
                        sx={{
                          mt: 1,
                          p: 1.5,
                          bgcolor: alpha(emeraldCore.primary, 0.05),
                          borderRadius: 1,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{ color: 'text.secondary', display: 'block' }}
                        >
                          Respuesta de {request.respondedBy}:
                        </Typography>
                        <Typography variant="body2">
                          {request.adminResponse}
                        </Typography>
                      </Box>
                    )}

                    {/* Actions */}
                    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<MessageSquare size={16} />}
                        onClick={() => handleOpenResponse(request)}
                        sx={{
                          borderColor: emeraldCore.primary,
                          color: emeraldCore.primary,
                          textTransform: 'none',
                          fontWeight: 600,
                        }}
                      >
                        Responder
                      </Button>
                      {request.status === 'pendiente' && (
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<Send size={16} />}
                          onClick={() => handleForwardToProvider(request)}
                          sx={{
                            bgcolor: emeraldCore.primary,
                            '&:hover': {
                              bgcolor: alpha(emeraldCore.primary, 0.87),
                            },
                            textTransform: 'none',
                            fontWeight: 600,
                          }}
                        >
                          Enviar a Proveedor
                        </Button>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* Response Dialog */}
      <Dialog
        open={responseDialogOpen}
        onClose={() => setResponseDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Responder Solicitud</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Estado"
              value={responseData.status}
              onChange={(e) =>
                setResponseData((prev) => ({ ...prev, status: e.target.value }))
              }
              fullWidth
            >
              {(
                Object.keys(
                  PRODUCT_REQUEST_STATUS_LABELS,
                ) as ProductRequestStatus[]
              ).map((status) => (
                <MenuItem key={status} value={status}>
                  {PRODUCT_REQUEST_STATUS_LABELS[status]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Respuesta / Comentario"
              value={responseData.adminResponse}
              onChange={(e) =>
                setResponseData((prev) => ({
                  ...prev,
                  adminResponse: e.target.value,
                }))
              }
              fullWidth
              multiline
              rows={4}
              placeholder="Escribe una respuesta para el asesor/embajador..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResponseDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleUpdateRequest}
            disabled={updating}
            sx={{
              bgcolor: emeraldCore.primary,
              '&:hover': { bgcolor: alpha(emeraldCore.primary, 0.87) },
            }}
          >
            {updating ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
