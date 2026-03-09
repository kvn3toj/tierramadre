/**
 * User Views Analytics Page
 *
 * Shows detailed analytics for what products a specific user viewed:
 * - Total views and unique products
 * - List of all products viewed with view counts
 * - Device/browser usage patterns
 * - Recent view activity timeline
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  Package,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { useThemeMode } from '../../contexts/ThemeContext';
import { emeraldCore, goldAccent, semanticColors } from '../../design-system/tokens/colors';
import { accentColors, cssTransition, primitiveColors, primitiveSpacing as spacing, zIndex } from '../../design-system';

// =============================================================================
// TYPES
// =============================================================================

interface ProductView {
  itemId: number;
  productName: string;
  views: number;
  firstView: string;
  lastView: string;
  devices: string[];
  browsers: string[];
}

interface RecentView {
  timestamp: string;
  itemId: number;
  productName: string;
  deviceType: string;
  browser: string;
  country: string;
}

interface UserViewsData {
  success: boolean;
  user: {
    email: string | null;
    name: string | null;
    role: string;
    firstSeen: string | null;
    lastSeen: string | null;
  };
  totalViews: number;
  uniqueProducts: number;
  products: ProductView[];
  recentViews: RecentView[];
  deviceBreakdown: Record<string, number>;
  browserBreakdown: Record<string, number>;
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

const formatDate = (timestamp: string): string => {
  return new Date(timestamp).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const UserViewsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  const email = searchParams.get('email');
  const name = searchParams.get('name');

  const [data, setData] = useState<UserViewsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user view data - uses merged product-views API
  const fetchData = useCallback(async () => {
    if (!email && !name) {
      setError('No user specified');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ action: 'user' });
      if (email) params.set('email', email);
      else if (name) params.set('name', name);

      const response = await fetch(`/api/product-views?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setData(result);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Error fetching view data');
      console.error('UserViewsPage error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [email, name]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    if (r === 'embajador' || r === 'ambassador') return accentColors.purple.light;
    if (r === 'full' || r === 'asesor') return emeraldCore.primary;
    if (r === 'provider' || r === 'proveedor') return accentColors.info.light;
    return primitiveColors.metallic.silver[500];
  };

  const userName = data?.user?.name || name || 'Usuario';
  const userRole = data?.user?.role || 'guest';

  return (
    <Box sx={{ minHeight: '100%', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: zIndex.base,
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {userName}
              </Typography>
              <Chip
                label={getRoleLabel(userRole)}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  bgcolor: alpha(getRoleColor(userRole), 0.15),
                  color: getRoleColor(userRole),
                }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Historial de productos vistos
            </Typography>
          </Box>
          <IconButton
            onClick={fetchData}
            disabled={isLoading}
            sx={{ color: emeraldCore.primary }}
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
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
            {/* User Info Card */}
            {data.user.firstSeen && (
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      bgcolor: alpha(getRoleColor(userRole), 0.15),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {userRole === 'guest' ? (
                      <User size={24} color={getRoleColor(userRole)} />
                    ) : (
                      <UserCheck size={24} color={getRoleColor(userRole)} />
                    )}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {data.user.email || 'Sin email registrado'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Calendar size={12} color={isLight ? '#666' : '#999'} />
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Primera visita: {formatDate(data.user.firstSeen)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Paper>
            )}

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
                color={accentColors.info.light}
              />
              <StatCard
                label="Productos Únicos"
                value={data.uniqueProducts}
                icon={Package}
                color={emeraldCore.primary}
              />
            </Box>

            {/* Device Breakdown */}
            {Object.keys(data.deviceBreakdown).length > 0 && (
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
                  Dispositivos utilizados
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Object.entries(data.deviceBreakdown)
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

            {/* Products Viewed List */}
            {data.products.length > 0 && (
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
                    <Package size={16} color={goldAccent.primary} />
                    Productos vistos ({data.products.length})
                  </Typography>
                </Box>
                {data.products.map((product, idx) => (
                  <Box
                    key={product.itemId}
                    onClick={() => navigate(`/admin/analytics/item/${product.itemId}`)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      px: 2.5,
                      py: 1.5,
                      borderBottom: idx < data.products.length - 1 ? `1px solid ${alpha('#000', 0.06)}` : 'none',
                      cursor: 'pointer',
                      transition: cssTransition.fast,
                      '&:hover': {
                        bgcolor: alpha(emeraldCore.primary, 0.05),
                      },
                      '&:active': {
                        bgcolor: alpha(emeraldCore.primary, 0.1),
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 2,
                        bgcolor: alpha(goldAccent.primary, idx < 3 ? 0.15 : 0.08),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        color: idx < 3 ? goldAccent.primary : 'text.secondary',
                      }}
                    >
                      #{product.itemId}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {product.productName}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Última: {formatTimeAgo(product.lastView)}
                        </Typography>
                        {product.devices?.length > 0 && (
                          <>
                            <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled' }} />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {product.devices.slice(0, 2).map((device) => (
                                <DeviceIcon key={device} device={device} size={12} />
                              ))}
                            </Box>
                          </>
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Eye size={14} color={emeraldCore.primary} />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: emeraldCore.primary }}>
                        {product.views}
                      </Typography>
                    </Box>
                    <ChevronRight size={16} color={alpha(isLight ? '#000' : '#fff', 0.3)} />
                  </Box>
                ))}
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
                    <Clock size={16} color={semanticColors.info.main} />
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
                        bgcolor: alpha(emeraldCore.primary, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Eye size={12} color={emeraldCore.primary} />
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
                        {view.productName}
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
                  Este usuario no ha visualizado productos
                </Typography>
              </Paper>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default UserViewsPage;
