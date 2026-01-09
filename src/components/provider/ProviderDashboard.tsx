/**
 * ProviderDashboard - Main dashboard for provider portal
 *
 * Shows overview of pending requests, submitted quotations, and quick actions.
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Chip,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  FileText,
  PlusCircle,
  Package,
  Clock,
  CheckCircle,
  Eye,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGoogleAuth } from '../../contexts/GoogleAuthContext';
import { emeraldCore } from '../../design-system/tokens/colors';
import type { QuotationRequest, ProviderQuotation } from '../../types/provider';

interface DashboardStats {
  pendingRequests: number;
  myQuotations: number;
  viewedByAdmin: number;
}

export default function ProviderDashboard() {
  const navigate = useNavigate();
  const { user } = useGoogleAuth();
  const [stats, setStats] = useState<DashboardStats>({
    pendingRequests: 0,
    myQuotations: 0,
    viewedByAdmin: 0,
  });
  const [recentRequests, setRecentRequests] = useState<QuotationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch quotation requests
        const requestsRes = await fetch('/api/quotation-requests?status=pendiente');
        const requestsData = await requestsRes.json();

        // Fetch provider's quotations
        const quotationsRes = await fetch(`/api/provider-quotations?email=${encodeURIComponent(user?.email || '')}`);
        const quotationsData = await quotationsRes.json();

        if (requestsData.success) {
          const requests = requestsData.requests || [];
          setRecentRequests(requests.slice(0, 3));
          setStats(prev => ({
            ...prev,
            pendingRequests: requests.length,
          }));
        }

        if (quotationsData.success) {
          const quotations: ProviderQuotation[] = quotationsData.quotations || [];
          setStats(prev => ({
            ...prev,
            myQuotations: quotations.length,
            viewedByAdmin: quotations.filter(q => q.viewedByAdmin).length,
          }));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.email) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [user?.email]);

  const StatCard = ({
    icon: Icon,
    label,
    value,
    color,
  }: {
    icon: typeof FileText;
    label: string;
    value: number;
    color: string;
  }) => (
    <Card
      sx={{
        flex: 1,
        minWidth: 100,
        bgcolor: alpha(color, 0.08),
        border: 'none',
        boxShadow: 'none',
      }}
    >
      <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Icon size={18} color={color} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {label}
          </Typography>
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700, color }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress sx={{ color: emeraldCore.primary }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, pb: 10 }}>
      {/* Welcome Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          Portal Proveedor
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Bienvenido, {user?.name || 'Proveedor'}
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
        <StatCard
          icon={Clock}
          label="Solicitudes"
          value={stats.pendingRequests}
          color="#f59e0b"
        />
        <StatCard
          icon={Package}
          label="Mis Cotizaciones"
          value={stats.myQuotations}
          color={emeraldCore.primary}
        />
        <StatCard
          icon={Eye}
          label="Vistas"
          value={stats.viewedByAdmin}
          color="#6366f1"
        />
      </Stack>

      {/* Quick Actions */}
      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
        Acciones Rapidas
      </Typography>
      <Stack spacing={1.5} sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<PlusCircle size={20} />}
          onClick={() => navigate('/provider/submit')}
          sx={{
            bgcolor: emeraldCore.primary,
            '&:hover': { bgcolor: alpha(emeraldCore.primary, 0.87) },
            py: 1.5,
            textTransform: 'none',
            fontWeight: 600,
          }}
          fullWidth
        >
          Enviar Nueva Cotizacion
        </Button>
        <Button
          variant="outlined"
          startIcon={<FileText size={20} />}
          onClick={() => navigate('/provider/requests')}
          sx={{
            borderColor: emeraldCore.primary,
            color: emeraldCore.primary,
            '&:hover': {
              borderColor: emeraldCore.primary,
              bgcolor: alpha(emeraldCore.primary, 0.04),
            },
            py: 1.5,
            textTransform: 'none',
            fontWeight: 600,
          }}
          fullWidth
        >
          Ver Solicitudes ({stats.pendingRequests})
        </Button>
      </Stack>

      {/* Recent Requests */}
      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
        Solicitudes Recientes
      </Typography>
      {recentRequests.length === 0 ? (
        <Card sx={{ bgcolor: alpha(emeraldCore.primary, 0.04), border: 'none', boxShadow: 'none' }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircle size={40} color={emeraldCore.primary} style={{ marginBottom: 8 }} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No hay solicitudes pendientes
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={1.5}>
          {recentRequests.map((request) => (
            <Card
              key={request.id}
              sx={{
                cursor: 'pointer',
                '&:hover': { bgcolor: alpha(emeraldCore.primary, 0.04) },
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: 'none',
              }}
              onClick={() => navigate(`/provider/requests?id=${request.id}`)}
            >
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {request.productType === 'piedra_suelta' ? 'Piedra Suelta' : request.productType}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {request.weightMin}-{request.weightMax} ct | {request.colorPreference}
                    </Typography>
                  </Box>
                  <Chip
                    label={request.status}
                    size="small"
                    sx={{
                      bgcolor: alpha('#f59e0b', 0.1),
                      color: '#f59e0b',
                      fontWeight: 600,
                      fontSize: '0.7rem',
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
