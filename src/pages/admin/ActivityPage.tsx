/**
 * Activity Page
 *
 * Full-page activity feed showing all users' activity.
 * Features filtering by activity type and time range.
 *
 * Designed by ARIA - Capitana del Concilio de Creacion
 */

import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  FileText,
  User,
  UserCheck,
  RefreshCw,
  Filter,
  Clock,
  Package,
} from 'lucide-react';
import { useThemeMode } from '../../contexts/ThemeContext';
import { useAllActivity, ActivityFilters, TimeFilter, TypeFilter, Activity } from '../../hooks/useAllActivity';
import { emeraldCore, goldAccent } from '../../design-system/tokens/colors';
import { spacing, iosDimensions } from '../../design-system/tokens/primitives/spacing';

// Filter chip options
const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'view', label: 'Vistas' },
  { value: 'cotizacion', label: 'Cotizaciones' },
];

const TIME_OPTIONS: { value: TimeFilter; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Esta Semana' },
  { value: 'month', label: 'Este Mes' },
  { value: 'all', label: 'Todas' },
];

// Format time ago
function formatTimeAgo(ts: string): string {
  const date = new Date(ts);
  const diff = Date.now() - date.getTime();
  if (diff < 60000) return 'Ahora';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)}d`;
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

// Format currency
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

// Get role label in Spanish
function getRoleLabel(role: string): string {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'asesor':
    case 'full':
      return 'Asesor';
    case 'embajador':
      return 'Embajador';
    default:
      return 'Invitado';
  }
}

// Activity Item Component
interface ActivityItemProps {
  activity: Activity;
  isLight: boolean;
  onProductClick?: (itemId: number) => void;
  isLast?: boolean;
}

const ActivityItem: React.FC<ActivityItemProps> = ({
  activity,
  isLight,
  onProductClick,
  isLast,
}) => {
  const isView = activity.type === 'view';
  const isLoggedIn = isView
    ? !!(activity.userName || activity.userEmail)
    : true;

  const handleProductClick = () => {
    if (isView && activity.itemId && onProductClick) {
      onProductClick(activity.itemId);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        py: 1.5,
        px: 2,
        borderBottom: isLast
          ? 'none'
          : `1px solid ${alpha(isLight ? '#000' : '#fff', 0.06)}`,
      }}
    >
      {/* Icon */}
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          bgcolor: isView
            ? alpha(emeraldCore.primary, 0.12)
            : alpha(goldAccent.primary, 0.12),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {isView ? (
          isLoggedIn ? (
            <UserCheck size={16} color={emeraldCore.primary} />
          ) : (
            <User size={16} color={isLight ? '#666' : '#999'} />
          )
        ) : (
          <FileText size={16} color={goldAccent.primary} />
        )}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {isView ? (
          <>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 0.5,
              }}
            >
              <span style={{ fontWeight: 600 }}>
                {activity.userName || 'Invitado'}
              </span>
              {' vio '}
              <Typography
                component="span"
                onClick={handleProductClick}
                sx={{
                  color: emeraldCore.primary,
                  fontWeight: 600,
                  fontSize: 'inherit',
                  cursor: activity.itemId ? 'pointer' : 'default',
                  '&:hover': activity.itemId
                    ? { textDecoration: 'underline' }
                    : {},
                }}
              >
                {activity.productName}
              </Typography>
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
              {activity.inviterName && (
                <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                  inv. por {activity.inviterName}
                </Typography>
              )}
              {activity.userRole && activity.userRole !== 'guest' && (
                <Chip
                  label={getRoleLabel(activity.userRole)}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.65rem',
                    bgcolor: alpha(emeraldCore.primary, 0.1),
                    color: emeraldCore.primary,
                  }}
                />
              )}
            </Box>
          </>
        ) : (
          <>
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, fontSize: '0.85rem' }}
            >
              <span style={{ fontWeight: 600 }}>{activity.asesorName}</span>
              {' cotizo '}
              <span style={{ fontWeight: 600 }}>
                {activity.productsCount} producto
                {activity.productsCount !== 1 ? 's' : ''}
              </span>
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mt: 0.5,
              }}
            >
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Cliente: {activity.clientName}
              </Typography>
              {activity.total && activity.total > 0 && (
                <Chip
                  label={formatCurrency(activity.total)}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.65rem',
                    bgcolor: alpha(goldAccent.primary, 0.1),
                    color: goldAccent.primary,
                  }}
                />
              )}
            </Box>
          </>
        )}
      </Box>

      {/* Time */}
      <Typography
        variant="caption"
        sx={{ color: 'text.disabled', flexShrink: 0, mt: 0.5 }}
      >
        {formatTimeAgo(activity.timestamp)}
      </Typography>
    </Box>
  );
};

// Loading skeleton
const ActivitySkeleton: React.FC = () => (
  <Box sx={{ px: 2, py: 1.5 }}>
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
      <Skeleton variant="circular" width={36} height={36} />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width="70%" height={20} />
        <Skeleton variant="text" width="40%" height={16} />
      </Box>
      <Skeleton variant="text" width={30} height={16} />
    </Box>
  </Box>
);

// Main Component
const ActivityPage: React.FC = () => {
  const { mode } = useThemeMode();
  const navigate = useNavigate();
  const isLight = mode === 'light';

  const {
    filteredActivities,
    isLoading,
    refetch,
    filters,
    setFilters,
    totalCount,
  } = useAllActivity();

  const handleFilterChange = useCallback(
    (key: keyof ActivityFilters, value: TypeFilter | TimeFilter) => {
      setFilters({ ...filters, [key]: value });
    },
    [filters, setFilters]
  );

  const handleProductClick = useCallback(
    (itemId: number) => {
      navigate(`/product/${itemId}`);
    },
    [navigate]
  );

  return (
    <Box sx={{ pb: 12, bgcolor: 'background.default' }}>
      {/* Header */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          bgcolor: isLight
            ? alpha('#fff', 0.9)
            : alpha('#121212', 0.9),
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${alpha(
            isLight ? '#000' : '#fff',
            0.08
          )}`,
          px: 2,
          py: 1.5,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            maxWidth: 600,
            mx: 'auto',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              onClick={() => navigate(-1)}
              size="small"
              sx={{ color: 'text.primary' }}
            >
              <ArrowLeft size={20} />
            </IconButton>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                Actividad
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {totalCount} eventos totales
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => refetch()}
            disabled={isLoading}
            size="small"
            sx={{ color: emeraldCore.primary }}
          >
            <RefreshCw
              size={18}
              className={isLoading ? 'animate-spin' : ''}
            />
          </IconButton>
        </Box>
      </Box>

      {/* Filters */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          maxWidth: 600,
          mx: 'auto',
        }}
      >
        {/* Type Filter */}
        <Box sx={{ mb: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              mb: 1,
            }}
          >
            <Filter size={12} color={isLight ? '#666' : '#999'} />
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                fontSize: '0.65rem',
              }}
            >
              Tipo
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {TYPE_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                size="small"
                onClick={() => handleFilterChange('type', option.value)}
                sx={{
                  height: 28,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  bgcolor:
                    filters.type === option.value
                      ? emeraldCore.primary
                      : alpha(isLight ? '#000' : '#fff', 0.08),
                  color:
                    filters.type === option.value
                      ? '#fff'
                      : 'text.primary',
                  '&:hover': {
                    bgcolor:
                      filters.type === option.value
                        ? emeraldCore.dark
                        : alpha(isLight ? '#000' : '#fff', 0.12),
                  },
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Time Filter */}
        <Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              mb: 1,
            }}
          >
            <Clock size={12} color={isLight ? '#666' : '#999'} />
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                fontSize: '0.65rem',
              }}
            >
              Tiempo
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {TIME_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                size="small"
                onClick={() => handleFilterChange('time', option.value)}
                sx={{
                  height: 28,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  bgcolor:
                    filters.time === option.value
                      ? emeraldCore.primary
                      : alpha(isLight ? '#000' : '#fff', 0.08),
                  color:
                    filters.time === option.value
                      ? '#fff'
                      : 'text.primary',
                  '&:hover': {
                    bgcolor:
                      filters.time === option.value
                        ? emeraldCore.dark
                        : alpha(isLight ? '#000' : '#fff', 0.12),
                  },
                }}
              />
            ))}
          </Box>
        </Box>
      </Box>

      {/* Activity List */}
      <Box sx={{ maxWidth: 600, mx: 'auto', px: spacing.md }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: iosDimensions.borderRadiusLarge,
            bgcolor: isLight ? 'background.paper' : alpha('#000', 0.2),
            border: `1px solid ${alpha(isLight ? '#000' : '#fff', 0.08)}`,
            overflow: 'hidden',
          }}
        >
          {isLoading ? (
            // Loading skeletons
            <>
              {[...Array(8)].map((_, i) => (
                <ActivitySkeleton key={i} />
              ))}
            </>
          ) : filteredActivities.length > 0 ? (
            // Activity items
            filteredActivities.map((activity, idx) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                isLight={isLight}
                onProductClick={handleProductClick}
                isLast={idx === filteredActivities.length - 1}
              />
            ))
          ) : (
            // Empty state
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Package
                size={40}
                color={alpha(isLight ? '#000' : '#fff', 0.2)}
              />
              <Typography
                variant="body2"
                sx={{ color: 'text.secondary', mt: 1.5, fontWeight: 500 }}
              >
                Sin actividad para mostrar
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'text.disabled', display: 'block' }}
              >
                Ajusta los filtros para ver mas resultados
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Results count */}
        {!isLoading && filteredActivities.length > 0 && (
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              textAlign: 'center',
              mt: 2,
              color: 'text.disabled',
            }}
          >
            Mostrando {filteredActivities.length} de {totalCount} eventos
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default ActivityPage;
