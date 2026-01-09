/**
 * ProviderDashboard - Main dashboard for provider portal
 *
 * Shows overview of pending requests, submitted quotations, and quick actions.
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
  Button,
  Stack,
  Chip,
  alpha,
  CircularProgress,
  useTheme,
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
import { brand, iosSemanticColors, iosTypographyScale, typography, radius } from '../../design-system';
import type { QuotationRequest, ProviderQuotation } from '../../types/provider';

interface DashboardStats {
  pendingRequests: number;
  myQuotations: number;
  viewedByAdmin: number;
}

export default function ProviderDashboard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useGoogleAuth();
  const [stats, setStats] = useState<DashboardStats>({
    pendingRequests: 0,
    myQuotations: 0,
    viewedByAdmin: 0,
  });
  const [recentRequests, setRecentRequests] = useState<QuotationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // iOS HIG semantic colors
  const isDark = theme.palette.mode === 'dark';
  const mode = isDark ? 'dark' : 'light';
  const labelColor = iosSemanticColors.label[mode];
  const secondaryLabelColor = iosSemanticColors.secondaryLabel[mode];
  const tertiaryLabelColor = iosSemanticColors.tertiaryLabel[mode];

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
        borderRadius: radius.lg,
      }}
    >
      <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Icon size={18} color={color} />
          <Typography
            sx={{
              fontSize: iosTypographyScale.caption1,
              fontWeight: typography.weight.medium,
              color: secondaryLabelColor,
              letterSpacing: typography.letterSpacing.tight,
            }}
          >
            {label}
          </Typography>
        </Box>
        <Typography
          sx={{
            fontSize: iosTypographyScale.title1,
            fontWeight: typography.weight.bold,
            color,
            fontFeatureSettings: '"tnum"',
          }}
        >
          {value}
        </Typography>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress sx={{ color: brand.emerald[500] }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, pb: 10 }}>
      {/* Welcome Header - iOS Large Title style */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontSize: iosTypographyScale.largeTitle,
            fontWeight: typography.weight.bold,
            color: labelColor,
            letterSpacing: typography.letterSpacing.tighter,
            mb: 0.5,
          }}
        >
          Portal Proveedor
        </Typography>
        <Typography
          sx={{
            fontSize: iosTypographyScale.subhead,
            fontWeight: typography.weight.normal,
            color: secondaryLabelColor,
            letterSpacing: typography.letterSpacing.tight,
          }}
        >
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
          color={brand.emerald[500]}
        />
        <StatCard
          icon={Eye}
          label="Vistas"
          value={stats.viewedByAdmin}
          color="#6366f1"
        />
      </Stack>

      {/* Quick Actions - iOS Section Header style */}
      <Typography
        sx={{
          fontSize: iosTypographyScale.footnote,
          fontWeight: typography.weight.semibold,
          color: secondaryLabelColor,
          textTransform: 'uppercase',
          letterSpacing: typography.letterSpacing.wide,
          mb: 1.5,
        }}
      >
        Acciones Rapidas
      </Typography>
      <Stack spacing={1.5} sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<PlusCircle size={20} />}
          onClick={() => navigate('/provider/submit')}
          sx={{
            bgcolor: brand.emerald[500],
            '&:hover': { bgcolor: alpha(brand.emerald[500], 0.87) },
            py: 1.5,
            borderRadius: radius.md,
            textTransform: 'none',
            fontSize: iosTypographyScale.body,
            fontWeight: typography.weight.semibold,
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
            borderColor: brand.emerald[500],
            color: brand.emerald[500],
            '&:hover': {
              borderColor: brand.emerald[500],
              bgcolor: alpha(brand.emerald[500], 0.04),
            },
            py: 1.5,
            borderRadius: radius.md,
            textTransform: 'none',
            fontSize: iosTypographyScale.body,
            fontWeight: typography.weight.semibold,
          }}
          fullWidth
        >
          Ver Solicitudes ({stats.pendingRequests})
        </Button>
      </Stack>

      {/* Recent Requests - iOS Section Header style */}
      <Typography
        sx={{
          fontSize: iosTypographyScale.footnote,
          fontWeight: typography.weight.semibold,
          color: secondaryLabelColor,
          textTransform: 'uppercase',
          letterSpacing: typography.letterSpacing.wide,
          mb: 1.5,
        }}
      >
        Solicitudes Recientes
      </Typography>
      {recentRequests.length === 0 ? (
        <Card
          sx={{
            bgcolor: alpha(brand.emerald[500], 0.04),
            border: 'none',
            boxShadow: 'none',
            borderRadius: radius.lg,
          }}
        >
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircle size={40} color={brand.emerald[500]} style={{ marginBottom: 8 }} />
            <Typography
              sx={{
                fontSize: iosTypographyScale.subhead,
                color: tertiaryLabelColor,
              }}
            >
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
                '&:hover': { bgcolor: alpha(brand.emerald[500], 0.04) },
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: 'none',
                borderRadius: radius.md,
              }}
              onClick={() => navigate(`/provider/requests?id=${request.id}`)}
            >
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography
                      sx={{
                        fontSize: iosTypographyScale.body,
                        fontWeight: typography.weight.semibold,
                        color: labelColor,
                      }}
                    >
                      {request.productType === 'piedra_suelta' ? 'Piedra Suelta' : request.productType}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: iosTypographyScale.caption1,
                        color: secondaryLabelColor,
                      }}
                    >
                      {request.weightMin}-{request.weightMax} ct | {request.colorPreference}
                    </Typography>
                  </Box>
                  <Chip
                    label={request.status}
                    size="small"
                    sx={{
                      bgcolor: alpha('#f59e0b', 0.1),
                      color: '#f59e0b',
                      fontWeight: typography.weight.semibold,
                      fontSize: iosTypographyScale.caption2,
                      borderRadius: radius.sm,
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
