/**
 * Product Viewers Analytics Page
 *
 * Shows detailed analytics for who viewed a specific product:
 * - Total views and unique viewers
 * - List of all viewers with their view count
 * - Device/browser breakdown
 * - Recent view activity timeline
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  alpha,
  IconButton,
  Chip,
  Skeleton,
} from '@mui/material';
import {
  ArrowLeft,
  Eye,
  User,
  UserCheck,
  Clock,
  Smartphone,
  Monitor,
  Tablet,
  RefreshCw,
  TrendingUp,
  Users,
  FileText,
  DollarSign,
} from 'lucide-react';
import { useThemeMode } from '../contexts/ThemeContext';
import { useTreasure } from '../hooks/useTreasure';
import { emeraldCore, goldAccent, semanticColors } from '../design-system/tokens/colors';
import { spacing } from '../design-system/tokens/primitives/spacing';

// =============================================================================
// TYPES
// =============================================================================

interface Viewer {
  name: string;
  email: string | null;
  role: string;
  isLoggedIn: boolean;
  views: number;
  firstView: string;
  lastView: string;
  devices: string[];
  browsers: string[];
  countries: string[];
}

interface RecentView {
  timestamp: string;
  userName: string;
  userEmail: string | null;
  userRole: string;
  isLoggedIn: boolean;
  deviceType: string;
  browser: string;
  country: string;
  referrer: string | null;
}

interface QuotedByAsesor {
  email: string;
  name: string;
  count: number;
  totalValue: number;
  firstQuote: string;
  lastQuote: string;
}

interface RecentQuote {
  cotizacionId: string;
  asesorEmail: string;
  price: number;
  createdAt: string;
}

interface ProductCotizaciones {
  success: boolean;
  itemNumber: number;
  productName: string | null;
  totalCotizaciones: number;
  totalValue: number;
  uniqueAsesores: number;
  quotedBy: QuotedByAsesor[];
  recentQuotes: RecentQuote[];
}

interface ProductDetailViews {
  success: boolean;
  itemId: number;
  productName: string | null;
  totalViews: number;
  uniqueViewers: number;
  loggedInViewers: number;
  guestViewers: number;
  viewers: Viewer[];
  viewsByDate: Array<{ date: string; views: number }>;
  viewsByDevice: Record<string, number>;
  viewsByBrowser: Record<string, number>;
  viewsByCountry: Record<string, number>;
  recentViews: RecentView[];
}

// =============================================================================
// STAT CARD COMPONENT
// =============================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, color }) => {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: alpha(color, isLight ? 0.08 : 0.15),
        border: `1px solid ${alpha(color, 0.2)}`,
        textAlign: 'center',
      }}
    >
      <Icon size={20} color={color} style={{ marginBottom: 4 }} />
      <Typography variant="h5" sx={{ fontWeight: 700, color }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
    </Box>
  );
};

// =============================================================================
// DEVICE ICON HELPER
// =============================================================================

const DeviceIcon: React.FC<{ device: string; size?: number }> = ({ device, size = 16 }) => {
  const deviceLower = device.toLowerCase();
  if (deviceLower === 'mobile') return <Smartphone size={size} />;
  if (deviceLower === 'tablet') return <Tablet size={size} />;
  return <Monitor size={size} />;
};

// =============================================================================
// TIME AGO HELPER
// =============================================================================

const formatTimeAgo = (timestamp: string): string => {
  const diff = Date.now() - new Date(timestamp).getTime();
  if (diff < 60000) return 'Ahora';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
  return new Date(timestamp).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const ProductViewersPage: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const { treasure } = useTreasure();

  const [data, setData] = useState<ProductDetailViews | null>(null);
  const [cotizacionData, setCotizacionData] = useState<ProductCotizaciones | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCotizacionLoading, setIsCotizacionLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get product info from treasure items
  const product = useMemo(() => {
    if (!itemId) return null;
    return treasure.find((item) => item.item === parseInt(itemId, 10));
  }, [treasure, itemId]);

  // Fetch detailed view data - uses merged product-views API
  const fetchData = useCallback(async () => {
    if (!itemId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/product-views?action=product&itemId=${itemId}`);
      const result = await response.json();

      if (result.success) {
        setData(result);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Error fetching view data');
      console.error('ProductViewersPage error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [itemId]);

  // Fetch cotización data - who quoted this product
  const fetchCotizacionData = useCallback(async () => {
    if (!itemId) return;

    setIsCotizacionLoading(true);

    try {
      const response = await fetch(`/api/cotizacion-save?action=productCotizaciones&itemId=${itemId}`);
      const result = await response.json();

      if (result.success) {
        setCotizacionData(result);
      }
    } catch (err) {
      console.error('ProductViewersPage cotización error:', err);
    } finally {
      setIsCotizacionLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    fetchData();
    fetchCotizacionData();
  }, [fetchData, fetchCotizacionData]);

  // Get display name
  const productName = data?.productName || product?.nombre || `Item #${itemId}`;

  // Role display helper - handles both accessLevel and actual role text
  const getRoleLabel = (role: string): string => {
    const r = role.toLowerCase();
    if (r === 'admin' || r.includes('admin')) return 'Admin';
    if (r === 'embajador' || r === 'ambassador') return 'Embajador';
    if (r === 'full' || r === 'asesor') return 'Asesor';
    if (r === 'provider' || r === 'proveedor') return 'Proveedor';
    return 'Usuario';
  };

  const getRoleColor = (role: string): string => {
    const r = role.toLowerCase();
    if (r === 'admin' || r.includes('admin')) return goldAccent.primary;
    if (r === 'embajador' || r === 'ambassador') return '#8B5CF6'; // Purple for ambassadors
    if (r === 'full' || r === 'asesor') return emeraldCore.primary;
    if (r === 'provider' || r === 'proveedor') return '#3B82F6';
    return '#6B7280';
  };

  return (
    <Box sx={{ minHeight: '100%', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          bgcolor: 'background.default',
          borderBottom: `1px solid ${alpha(isLight ? '#000' : '#fff', 0.1)}`,
          px: 2,
          py: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton
            onClick={() => navigate('/admin/analytics')}
            sx={{
              bgcolor: alpha(emeraldCore.primary, 0.1),
              '&:hover': { bgcolor: alpha(emeraldCore.primary, 0.2) },
            }}
          >
            <ArrowLeft size={20} color={emeraldCore.primary} />
          </IconButton>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {productName}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Item #{itemId} - Analytics de vistas y cotizaciones
            </Typography>
          </Box>
          <IconButton
            onClick={() => { fetchData(); fetchCotizacionData(); }}
            disabled={isLoading || isCotizacionLoading}
            sx={{ color: emeraldCore.primary }}
          >
            <RefreshCw size={18} className={(isLoading || isCotizacionLoading) ? 'animate-spin' : ''} />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ p: spacing.md, pb: 12 }}>
        {/* Loading State */}
        {isLoading && !data && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Paper
            sx={{
              p: 3,
              textAlign: 'center',
              bgcolor: alpha(semanticColors.error.main, 0.1),
              border: `1px solid ${alpha(semanticColors.error.main, 0.3)}`,
              borderRadius: 2,
            }}
          >
            <Typography color="error">{error}</Typography>
          </Paper>
        )}

        {/* Data Display */}
        {data && (
          <>
            {/* Stats Overview */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 1.5,
                mb: 3,
              }}
            >
              <StatCard
                label="Total Vistas"
                value={data.totalViews}
                icon={Eye}
                color="#3B82F6"
              />
              <StatCard
                label="Viewers Únicos"
                value={data.uniqueViewers}
                icon={Users}
                color={emeraldCore.primary}
              />
              <StatCard
                label="Registrados"
                value={data.loggedInViewers}
                icon={UserCheck}
                color={goldAccent.primary}
              />
              <StatCard
                label="Invitados"
                value={data.guestViewers}
                icon={User}
                color="#6B7280"
              />
            </Box>

            {/* Device Breakdown */}
            {Object.keys(data.viewsByDevice).length > 0 && (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 3,
                  borderRadius: 3,
                  bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
                  border: `1px solid ${isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1)}`,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Monitor size={16} color={emeraldCore.primary} />
                  Dispositivos
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Object.entries(data.viewsByDevice)
                    .sort(([, a], [, b]) => b - a)
                    .map(([device, count]) => (
                      <Chip
                        key={device}
                        icon={<DeviceIcon device={device} />}
                        label={`${device}: ${count}`}
                        size="small"
                        sx={{
                          bgcolor: alpha(emeraldCore.primary, 0.1),
                          '& .MuiChip-icon': { color: emeraldCore.primary },
                        }}
                      />
                    ))}
                </Box>
              </Paper>
            )}

            {/* Viewers List */}
            {data.viewers.length > 0 && (
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 3,
                  bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
                  border: `1px solid ${isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1)}`,
                  overflow: 'hidden',
                  mb: 3,
                }}
              >
                <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${alpha('#000', 0.06)}` }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Users size={16} color="#8B5CF6" />
                    Quién vio este producto ({data.viewers.length})
                  </Typography>
                </Box>
                {data.viewers.map((viewer, idx) => (
                  <Box
                    key={viewer.email || viewer.name + idx}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      px: 2.5,
                      py: 1.5,
                      borderBottom: idx < data.viewers.length - 1 ? `1px solid ${alpha('#000', 0.06)}` : 'none',
                    }}
                  >
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        bgcolor: alpha(viewer.isLoggedIn ? emeraldCore.primary : '#6B7280', 0.12),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {viewer.isLoggedIn ? (
                        <UserCheck size={18} color={emeraldCore.primary} />
                      ) : (
                        <User size={18} color="#6B7280" />
                      )}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {viewer.name}
                        </Typography>
                        {viewer.isLoggedIn && (
                          <Chip
                            label={getRoleLabel(viewer.role)}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.65rem',
                              bgcolor: alpha(getRoleColor(viewer.role), 0.15),
                              color: getRoleColor(viewer.role),
                            }}
                          />
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {viewer.views} {viewer.views === 1 ? 'vista' : 'vistas'}
                        </Typography>
                        {viewer.devices?.length > 0 && (
                          <>
                            <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled' }} />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {viewer.devices.slice(0, 2).map((device) => (
                                <DeviceIcon key={device} device={device} size={12} />
                              ))}
                            </Box>
                          </>
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Clock size={12} />
                        {formatTimeAgo(viewer.lastView)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Paper>
            )}

            {/* Cotización Export Section */}
            {cotizacionData && cotizacionData.totalCotizaciones > 0 && (
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 3,
                  bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
                  border: `1px solid ${alpha(goldAccent.primary, 0.2)}`,
                  overflow: 'hidden',
                  mb: 3,
                }}
              >
                <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${alpha(goldAccent.primary, 0.15)}`, bgcolor: alpha(goldAccent.primary, 0.05) }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1, color: goldAccent.primary }}>
                      <FileText size={16} />
                      Quién cotizó este producto ({cotizacionData.quotedBy.length} asesores)
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <DollarSign size={14} color={emeraldCore.primary} />
                      <Typography variant="caption" sx={{ fontWeight: 600, color: emeraldCore.primary }}>
                        ${(cotizacionData.totalValue / 1000000).toFixed(1)}M total
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                {cotizacionData.quotedBy.map((asesor, idx) => (
                  <Box
                    key={asesor.email}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      px: 2.5,
                      py: 1.5,
                      borderBottom: idx < cotizacionData.quotedBy.length - 1 ? `1px solid ${alpha('#000', 0.06)}` : 'none',
                    }}
                  >
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        bgcolor: alpha(goldAccent.primary, 0.12),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FileText size={18} color={goldAccent.primary} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {asesor.name}
                        </Typography>
                        <Chip
                          label="Asesor"
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.65rem',
                            bgcolor: alpha(goldAccent.primary, 0.15),
                            color: goldAccent.primary,
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {asesor.count} {asesor.count === 1 ? 'cotización' : 'cotizaciones'}
                        </Typography>
                        <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled' }} />
                        <Typography variant="caption" sx={{ color: emeraldCore.primary, fontWeight: 500 }}>
                          ${(asesor.totalValue / 1000000).toFixed(2)}M
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Clock size={12} />
                        {formatTimeAgo(asesor.lastQuote)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Paper>
            )}

            {/* No Cotizaciones State - show only if we have view data but no cotizaciones */}
            {cotizacionData && cotizacionData.totalCotizaciones === 0 && data && data.totalViews > 0 && (
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  mb: 3,
                  borderRadius: 3,
                  bgcolor: alpha(goldAccent.primary, 0.05),
                  border: `1px dashed ${alpha(goldAccent.primary, 0.3)}`,
                  textAlign: 'center',
                }}
              >
                <FileText size={28} color={alpha(goldAccent.primary, 0.4)} />
                <Typography variant="body2" sx={{ mt: 1, fontWeight: 500, color: 'text.secondary' }}>
                  Sin cotizaciones registradas
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  Este producto aún no ha sido incluido en ninguna cotización
                </Typography>
              </Paper>
            )}

            {/* Recent Activity */}
            {data.recentViews.length > 0 && (
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 3,
                  bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
                  border: `1px solid ${isLight ? alpha('#000', 0.08) : alpha('#fff', 0.1)}`,
                  overflow: 'hidden',
                }}
              >
                <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${alpha('#000', 0.06)}` }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUp size={16} color={semanticColors.info.main} />
                    Actividad Reciente
                  </Typography>
                </Box>
                {data.recentViews.slice(0, 20).map((view, idx) => (
                  <Box
                    key={`${view.timestamp}-${idx}`}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      px: 2.5,
                      py: 1,
                      borderBottom: idx < Math.min(data.recentViews.length, 20) - 1 ? `1px solid ${alpha('#000', 0.04)}` : 'none',
                    }}
                  >
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        bgcolor: view.isLoggedIn ? alpha(emeraldCore.primary, 0.1) : alpha('#000', 0.05),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {view.isLoggedIn ? (
                        <UserCheck size={12} color={emeraldCore.primary} />
                      ) : (
                        <User size={12} color={isLight ? '#666' : '#999'} />
                      )}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'block',
                        }}
                      >
                        {view.userName}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DeviceIcon device={view.deviceType} size={12} />
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {formatTimeAgo(view.timestamp)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Paper>
            )}

            {/* No Views State */}
            {data.totalViews === 0 && (
              <Paper
                sx={{
                  p: 4,
                  textAlign: 'center',
                  bgcolor: alpha('#000', 0.03),
                  borderRadius: 3,
                }}
              >
                <Eye size={40} color={alpha(isLight ? '#000' : '#fff', 0.2)} />
                <Typography variant="body1" sx={{ mt: 2, fontWeight: 600 }}>
                  Sin vistas registradas
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  Este producto aún no ha sido visualizado
                </Typography>
              </Paper>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default ProductViewersPage;
