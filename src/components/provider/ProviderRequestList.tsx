/**
 * ProviderRequestList - List of quotation requests from admin
 *
 * Shows all pending and responded requests for provider to respond to.
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
import { FileText, ChevronRight, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { emeraldCore } from '../../design-system/tokens/colors';
import { PRODUCT_TYPE_LABELS, REQUEST_STATUS_LABELS } from '../../types/provider';
import type { QuotationRequest, RequestStatus } from '../../types/provider';

export default function ProviderRequestList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState<QuotationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | RequestStatus>('all');

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await fetch('/api/quotation-requests');
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

  // Check if we should highlight a specific request
  const highlightId = searchParams.get('id');

  const filteredRequests = activeTab === 'all'
    ? requests
    : requests.filter(r => r.status === activeTab);

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case 'pendiente': return '#f59e0b';
      case 'respondida': return emeraldCore.primary;
      case 'cancelada': return '#ef4444';
      default: return '#6b7280';
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
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          Solicitudes de Cotizacion
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Responde a las solicitudes de Tierra Madre
        </Typography>
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
      </Tabs>

      {/* Request List */}
      <Box sx={{ p: 2 }}>
        {filteredRequests.length === 0 ? (
          <Card sx={{ bgcolor: alpha(emeraldCore.primary, 0.04), border: 'none', boxShadow: 'none' }}>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <FileText size={48} color={emeraldCore.primary} style={{ marginBottom: 16, opacity: 0.5 }} />
              <Typography variant="body1" sx={{ color: 'text.secondary', mb: 1 }}>
                No hay solicitudes {activeTab !== 'all' ? REQUEST_STATUS_LABELS[activeTab].toLowerCase() + 's' : ''}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                Las nuevas solicitudes apareceran aqui
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={2}>
            {filteredRequests.map((request) => {
              const StatusIcon = getStatusIcon(request.status);
              const isHighlighted = request.id === highlightId;

              return (
                <Card
                  key={request.id}
                  sx={{
                    cursor: 'pointer',
                    border: isHighlighted ? '2px solid' : '1px solid',
                    borderColor: isHighlighted ? emeraldCore.primary : 'divider',
                    boxShadow: isHighlighted ? `0 0 0 4px ${alpha(emeraldCore.primary, 0.1)}` : 'none',
                    '&:hover': {
                      bgcolor: alpha(emeraldCore.primary, 0.04),
                    },
                    transition: 'all 0.2s',
                  }}
                  onClick={() => navigate(`/provider/submit?requestId=${request.id}`)}
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

                    {/* Notes preview */}
                    {request.notes && (
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
                        {request.notes}
                      </Typography>
                    )}

                    {/* Action */}
                    {request.status === 'pendiente' && (
                      <Button
                        variant="contained"
                        size="small"
                        endIcon={<ChevronRight size={16} />}
                        sx={{
                          bgcolor: emeraldCore.primary,
                          '&:hover': { bgcolor: alpha(emeraldCore.primary, 0.87) },
                          textTransform: 'none',
                          fontWeight: 600,
                        }}
                      >
                        Responder
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
