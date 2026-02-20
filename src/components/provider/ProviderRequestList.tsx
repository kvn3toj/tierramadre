/**
 * ProviderRequestList - List of quotation requests from admin
 *
 * Shows all pending and responded requests for provider to respond to.
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
  Button,
  useTheme,
} from '@mui/material';
import { FileText, ChevronRight, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { brand, iosSemanticColors, iosTypographyScale, legacyTypography as typography, radius, cssTransition } from '../../design-system';
import { PRODUCT_TYPE_LABELS, REQUEST_STATUS_LABELS } from '../../types/provider';
import type { QuotationRequest, RequestStatus } from '../../types/provider';

export default function ProviderRequestList() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState<QuotationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | RequestStatus>('all');

  // iOS HIG semantic colors
  const isDark = theme.palette.mode === 'dark';
  const mode = isDark ? 'dark' : 'light';
  const labelColor = iosSemanticColors.label[mode];
  const secondaryLabelColor = iosSemanticColors.secondaryLabel[mode];
  const tertiaryLabelColor = iosSemanticColors.tertiaryLabel[mode];

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
      case 'respondida': return brand.emerald[500];
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
          Solicitudes de Cotizacion
        </Typography>
        <Typography
          sx={{
            fontSize: iosTypographyScale.subhead,
            color: secondaryLabelColor,
            letterSpacing: typography.letterSpacing.tight,
          }}
        >
          Responde a las solicitudes de Tierra Madre
        </Typography>
      </Box>

      {/* Tabs - iOS Segmented Control style */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
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
        <Tab label={`Todas (${requests.length})`} value="all" />
        <Tab label={`Pendientes (${requests.filter(r => r.status === 'pendiente').length})`} value="pendiente" />
        <Tab label="Respondidas" value="respondida" />
      </Tabs>

      {/* Request List */}
      <Box sx={{ p: 2 }}>
        {filteredRequests.length === 0 ? (
          <Card
            sx={{
              bgcolor: alpha(brand.emerald[500], 0.04),
              border: 'none',
              boxShadow: 'none',
              borderRadius: radius.lg,
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <FileText size={48} color={brand.emerald[500]} style={{ marginBottom: 16, opacity: 0.5 }} />
              <Typography
                sx={{
                  fontSize: iosTypographyScale.body,
                  color: secondaryLabelColor,
                  mb: 1,
                }}
              >
                No hay solicitudes {activeTab !== 'all' ? REQUEST_STATUS_LABELS[activeTab].toLowerCase() + 's' : ''}
              </Typography>
              <Typography
                sx={{
                  fontSize: iosTypographyScale.caption1,
                  color: tertiaryLabelColor,
                }}
              >
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
                    borderColor: isHighlighted ? brand.emerald[500] : 'divider',
                    boxShadow: isHighlighted ? `0 0 0 4px ${alpha(brand.emerald[500], 0.1)}` : 'none',
                    borderRadius: radius.md,
                    '&:hover': {
                      bgcolor: alpha(brand.emerald[500], 0.04),
                    },
                    transition: cssTransition.default,
                  }}
                  onClick={() => navigate(`/provider/submit?requestId=${request.id}`)}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box>
                        <Typography
                          sx={{
                            fontSize: iosTypographyScale.headline,
                            fontWeight: typography.weight.semibold,
                            color: labelColor,
                          }}
                        >
                          {PRODUCT_TYPE_LABELS[request.productType]}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: iosTypographyScale.caption1,
                            color: secondaryLabelColor,
                          }}
                        >
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
                          fontWeight: typography.weight.semibold,
                          fontSize: iosTypographyScale.caption2,
                          borderRadius: radius.sm,
                          '& .MuiChip-icon': {
                            color: 'inherit',
                          },
                        }}
                      />
                    </Box>

                    {/* Specs */}
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1.5, gap: 0.5 }}>
                      <Chip
                        label={`${request.weightMin}-${request.weightMax} ct`}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: 'divider',
                          fontSize: iosTypographyScale.caption2,
                          borderRadius: radius.sm,
                        }}
                      />
                      <Chip
                        label={request.colorPreference}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: 'divider',
                          fontSize: iosTypographyScale.caption2,
                          borderRadius: radius.sm,
                        }}
                      />
                      <Chip
                        label={request.qualityPreference}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: 'divider',
                          fontSize: iosTypographyScale.caption2,
                          borderRadius: radius.sm,
                        }}
                      />
                      <Chip
                        label={`Max ${formatBudget(request.budgetMax)}`}
                        size="small"
                        sx={{
                          bgcolor: alpha(brand.emerald[500], 0.1),
                          color: brand.emerald[500],
                          fontWeight: typography.weight.semibold,
                          fontSize: iosTypographyScale.caption2,
                          borderRadius: radius.sm,
                        }}
                      />
                    </Stack>

                    {/* Notes preview */}
                    {request.notes && (
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
                          bgcolor: brand.emerald[500],
                          '&:hover': { bgcolor: alpha(brand.emerald[500], 0.87) },
                          textTransform: 'none',
                          fontWeight: typography.weight.semibold,
                          fontSize: iosTypographyScale.subhead,
                          borderRadius: radius.sm,
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
