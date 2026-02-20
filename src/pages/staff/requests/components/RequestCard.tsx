/**
 * RequestCard Component
 * Displays a single product request with status, specs, and admin response.
 */

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  alpha,
} from '@mui/material';
import {
  CheckCircle,
  Clock,
  Send,
  XCircle,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { emeraldCore } from '../../../../design-system/tokens/colors';
import { accentColors, primitiveColors } from '../../../../design-system';
import {
  PRODUCT_TYPE_LABELS,
  PRIORITY_LABELS,
  PRODUCT_REQUEST_STATUS_LABELS,
  type ProductRequest,
  type ProductRequestStatus,
  type RequestPriority,
} from '../../../../types/provider';

// Helper functions
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

interface RequestCardProps {
  request: ProductRequest;
}

export const RequestCard: React.FC<RequestCardProps> = ({ request }) => {
  const StatusIcon = getStatusIcon(request.status);

  return (
    <Card
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
};

export default RequestCard;
