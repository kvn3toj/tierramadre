/**
 * RequestList Component
 * List view with status filters for product requests.
 */

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Card,
  CardContent,
  Tabs,
  Tab,
  CircularProgress,
  alpha,
} from '@mui/material';
import { Plus, ShoppingBag } from 'lucide-react';
import { emeraldCore } from '../../../../design-system/tokens/colors';
import {
  PRODUCT_REQUEST_STATUS_LABELS,
  type ProductRequest,
  type ProductRequestStatus,
} from '../../../../types/provider';
import { RequestCard } from './RequestCard';

interface RequestListProps {
  requests: ProductRequest[];
  loading: boolean;
  statusFilter: 'all' | ProductRequestStatus;
  onStatusFilterChange: (status: 'all' | ProductRequestStatus) => void;
  onCreateNew: () => void;
}

export const RequestList: React.FC<RequestListProps> = ({
  requests,
  loading,
  statusFilter,
  onStatusFilterChange,
  onCreateNew,
}) => {
  const filteredRequests = statusFilter === 'all'
    ? requests
    : requests.filter(r => r.status === statusFilter);

  return (
    <Box>
      {/* Status Filter Tabs */}
      <Tabs
        value={statusFilter}
        onChange={(_, v) => onStatusFilterChange(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          px: 2,
          mt: 1,
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 500,
            minWidth: 'auto',
            px: 1.5,
            fontSize: '0.8rem',
          },
          '& .Mui-selected': {
            color: emeraldCore.primary,
          },
          '& .MuiTabs-indicator': {
            bgcolor: emeraldCore.primary,
            height: 2,
          },
        }}
      >
        <Tab label="Todas" value="all" />
        <Tab label={`Pendientes (${requests.filter(r => r.status === 'pendiente').length})`} value="pendiente" />
        <Tab label="Aprobadas" value="aprobada" />
        <Tab label="Completadas" value="completada" />
      </Tabs>

      {/* Request List */}
      <Box sx={{ p: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress sx={{ color: emeraldCore.primary }} />
          </Box>
        ) : filteredRequests.length === 0 ? (
          <Card sx={{ bgcolor: alpha(emeraldCore.primary, 0.04), border: 'none', boxShadow: 'none' }}>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <ShoppingBag size={48} color={emeraldCore.primary} style={{ marginBottom: 16, opacity: 0.5 }} />
              <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2 }}>
                {statusFilter === 'all'
                  ? 'No has enviado ninguna solicitud aun'
                  : `No tienes solicitudes ${PRODUCT_REQUEST_STATUS_LABELS[statusFilter].toLowerCase()}s`
                }
              </Typography>
              {statusFilter === 'all' && (
                <Button
                  variant="contained"
                  startIcon={<Plus size={18} />}
                  onClick={onCreateNew}
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
            {filteredRequests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default RequestList;
