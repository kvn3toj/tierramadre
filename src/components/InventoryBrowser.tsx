import { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Paper,
  Chip,
  FormControl,
  Select,
  MenuItem,
  Card,
  CardContent,
  alpha,
  useTheme,
  ToggleButton,
  ToggleButtonGroup,
  Collapse,
  IconButton,
  Button,
  LinearProgress,
} from '@mui/material';
import {
  Search,
  Gem,
  Package,
  LayoutGrid,
  List,
  Crown,
  ChevronDown,
  MapPin,
  User,
  FileCheck,
} from 'lucide-react';
import { useThemeMode } from '../context/ThemeContext';
import {
  inventoryData,
  getInventoryStats,
  getUniqueColors,
} from '../data/inventory';
import { InventoryItem, TrustScoreBreakdown } from '../types';
import { TrustBadgeCompact } from './TrustBadge';
import CertificationUpload from './CertificationUpload';
import { calculateTrustScore, getTrustBadge } from '../utils/trustScore';

// Format currency in COP
const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatFullCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Get color dot style
const getColorDot = (color: string): string => {
  const colorMap: Record<string, string> = {
    'Verde Vivido': '#059669',
    'Verde Muzo': '#065F46',
    'Verde Limón': '#84CC16',
    'Verde Menta': '#34D399',
    'Verde Natural': '#22C55E',
  };
  return colorMap[color] || '#6B7280';
};

// Get quality badge style - Warm tones, not green
const getQualityBadge = (calidad: string): { label: string; bg: string; color: string; border: string } => {
  if (calidad.includes('SuperFina') || calidad === 'Fina') {
    return {
      label: 'Premium',
      bg: '#FEF3C7',      // Amber 100
      color: '#92400E',   // Amber 900
      border: '#F59E0B',  // Amber 500
    };
  }
  if (calidad.includes('Superior')) {
    return {
      label: 'Superior',
      bg: '#DBEAFE',      // Blue 100
      color: '#1E3A8A',   // Blue 900
      border: '#3B82F6',  // Blue 500
    };
  }
  if (calidad.includes('Fina')) {
    return {
      label: 'Fina',
      bg: '#F3E8FF',      // Purple 100
      color: '#6B21A8',   // Purple 800
      border: '#A855F7',  // Purple 500
    };
  }
  return {
    label: 'Comercial',
    bg: '#F3F4F6',        // Gray 100
    color: '#374151',     // Gray 700
    border: '#9CA3AF',    // Gray 400
  };
};

// Simplified Inventory Card - Clean design with hover details
interface InventoryCardProps {
  item: InventoryItem;
  isCompact: boolean;
  trustScore: TrustScoreBreakdown;
  onCertClick: () => void;
}

const InventoryCard = ({ item, isCompact, trustScore, onCertClick }: InventoryCardProps) => {
  const theme = useTheme();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const [showDetails, setShowDetails] = useState(false);

  const displayName = item.nombre.replace(/^L:.*?\s/, '').replace(/^L:/, '').trim();
  const quality = getQualityBadge(item.calidad);
  const colorDot = getColorDot(item.color);
  const isLoose = !item.isJewelry;
  const weight = typeof item.peso === 'number' ? `${item.peso} ct` : item.metalType;
  const trustBadge = getTrustBadge(trustScore.overall);

  // Compact list view
  if (isCompact) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 2.5,
          bgcolor: isLight ? '#FFFFFF' : '#1C1C1E',
          border: '1px solid',
          borderColor: isLight ? '#E5E7EB' : '#2C2C2E',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: '#059669',
            bgcolor: isLight ? '#F0FDF4' : alpha('#059669', 0.08),
          },
        }}
        onClick={() => setShowDetails(!showDetails)}
      >
        {/* Color indicator */}
        <Box
          sx={{
            width: 8,
            height: 40,
            borderRadius: 4,
            bgcolor: colorDot,
            flexShrink: 0,
          }}
        />

        {/* Main info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body1"
            sx={{
              fontWeight: 600,
              color: theme.palette.text.primary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayName}
          </Typography>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
            {item.color} • {weight}
          </Typography>
        </Box>

        {/* Trust Badge - Compact */}
        <TrustBadgeCompact score={trustScore} />

        {/* Quality badge */}
        <Chip
          label={quality.label}
          size="small"
          sx={{
            height: 22,
            fontSize: '0.6875rem',
            fontWeight: 600,
            bgcolor: quality.bg,
            color: quality.color,
            border: `1px solid ${quality.border}`,
          }}
        />

        {/* Price */}
        <Typography
          sx={{
            fontWeight: 700,
            color: '#059669',
            fontSize: '1rem',
            fontFamily: 'monospace',
            minWidth: 80,
            textAlign: 'right',
          }}
        >
          {formatCurrency(item.precioCOP)}
        </Typography>
      </Paper>
    );
  }

  // Grid card view - Simplified
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: isLight ? '#E5E7EB' : '#2C2C2E',
        bgcolor: isLight ? '#FFFFFF' : '#1C1C1E',
        overflow: 'hidden',
        transition: 'all 0.25s ease',
        cursor: 'pointer',
        '&:hover': {
          borderColor: '#10B981',
          transform: 'translateY(-4px)',
          boxShadow: isLight
            ? '0 20px 40px rgba(0, 0, 0, 0.08)'
            : '0 20px 40px rgba(0, 0, 0, 0.3)',
          '& .price-text': {
            color: '#10B981',
          },
        },
      }}
      onClick={() => setShowDetails(!showDetails)}
    >
      {/* Minimal header - Small accent bar + icon (no green blocks - Moksart) */}
      <Box
        sx={{
          height: 56,
          bgcolor: isLight ? '#FAFAF9' : '#292524',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          px: 2.5,
          borderBottom: '1px solid',
          borderColor: isLight ? '#E5E7EB' : '#2C2C2E',
        }}
      >
        {/* Colored accent bar on left */}
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            bgcolor: colorDot,
          }}
        />

        {/* Icon based on type */}
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            bgcolor: isLight ? '#FFFFFF' : '#1C1C1E',
            border: '1px solid',
            borderColor: isLight ? '#E5E7EB' : '#3C3C3E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 2,
          }}
        >
          {item.isJewelry ? (
            <Crown size={18} color={isLight ? '#78716C' : '#A8A29E'} />
          ) : (
            <Gem size={18} color={colorDot} />
          )}
        </Box>

        {/* Color tag with dot */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.5,
            py: 0.5,
            borderRadius: 1.5,
            bgcolor: isLight ? '#FFFFFF' : '#1C1C1E',
            border: '1px solid',
            borderColor: isLight ? '#E5E7EB' : '#3C3C3E',
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: colorDot,
            }}
          />
          <Typography
            variant="caption"
            sx={{
              fontWeight: 500,
              color: theme.palette.text.secondary,
              fontSize: '0.7rem',
            }}
          >
            {item.color.replace('Verde ', '')}
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }} />

        {/* Item count if multiple */}
        {item.cantidad > 1 && (
          <Chip
            label={`×${item.cantidad}`}
            size="small"
            sx={{
              height: 22,
              fontSize: '0.7rem',
              fontWeight: 600,
              bgcolor: isLight ? '#1C1917' : '#FAFAF9',
              color: isLight ? '#FAFAF9' : '#1C1917',
              mr: 1,
            }}
          />
        )}

        {/* Quality badge - warm tones */}
        <Chip
          label={quality.label}
          size="small"
          sx={{
            height: 22,
            fontSize: '0.65rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            bgcolor: quality.bg,
            color: quality.color,
            border: `1px solid ${quality.border}`,
          }}
        />
      </Box>

      <CardContent sx={{ p: 2.5 }}>
        {/* Name */}
        <Typography
          variant="body1"
          sx={{
            fontWeight: 700,
            color: theme.palette.text.primary,
            mb: 0.5,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayName}
        </Typography>

        {/* Key specs - single line */}
        <Typography
          variant="body2"
          sx={{
            color: theme.palette.text.secondary,
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: colorDot,
            }}
          />
          {item.color}
          {isLoose && typeof item.peso === 'number' && (
            <>
              <Box sx={{ color: '#D1D5DB' }}>•</Box>
              {item.peso} ct
            </>
          )}
          {item.isJewelry && item.metalType && (
            <>
              <Box sx={{ color: '#D1D5DB' }}>•</Box>
              {item.metalType}
            </>
          )}
        </Typography>

        {/* Price - Black with green on hover (Moksart) */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            className="price-text"
            sx={{
              fontWeight: 700,
              color: theme.palette.text.primary,
              fontSize: '1.5rem',
              fontFamily: 'system-ui',
              letterSpacing: '-0.02em',
              transition: 'color 0.2s ease',
            }}
          >
            <Box
              component="span"
              sx={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: theme.palette.text.secondary,
                mr: 0.5,
              }}
            >
              $
            </Box>
            {formatCurrency(item.precioCOP).replace('$', '')}
          </Typography>

          <IconButton
            size="small"
            sx={{
              color: theme.palette.text.secondary,
              transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          >
            <ChevronDown size={18} />
          </IconButton>
        </Box>

        {/* Expandable details - Progressive disclosure */}
        <Collapse in={showDetails}>
          <Box
            sx={{
              mt: 2,
              pt: 2,
              borderTop: '1px solid',
              borderColor: isLight ? '#E5E7EB' : '#2C2C2E',
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                  Precio completo
                </Typography>
                <Typography variant="caption" sx={{ color: theme.palette.text.primary, fontWeight: 600 }}>
                  {formatFullCurrency(item.precioCOP)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                  Calidad
                </Typography>
                <Typography variant="caption" sx={{ color: theme.palette.text.primary, fontWeight: 500 }}>
                  {item.calidad}
                </Typography>
              </Box>

              {item.talla && item.talla !== '-' && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                    {item.isJewelry ? 'Talla' : 'Corte'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.text.primary, fontWeight: 500 }}>
                    {item.talla}
                  </Typography>
                </Box>
              )}

              {item.medidas && item.medidas !== '-' && item.medidas !== 'Anillo' && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                    Medidas
                  </Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.text.primary, fontWeight: 500 }}>
                    {item.medidas}
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                <MapPin size={12} color="#9CA3AF" />
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                  {item.ubicacion}
                </Typography>
                <Box sx={{ flex: 1 }} />
                <User size={12} color="#9CA3AF" />
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                  {item.asesor}
                </Typography>
              </Box>

              {/* Product Certification Section */}
              <Box
                sx={{
                  mt: 2,
                  pt: 2,
                  borderTop: '1px solid',
                  borderColor: isLight ? '#E5E7EB' : '#2C2C2E',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                    Certificacion del Producto
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, color: trustBadge.color }}
                  >
                    {trustScore.overall}/100
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontSize: '0.65rem',
                    display: 'block',
                    mb: 1,
                  }}
                >
                  Autenticidad de la esmeralda (no del vendedor)
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={trustScore.overall}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: alpha(trustBadge.color, 0.15),
                    mb: 1.5,
                    '& .MuiLinearProgress-bar': {
                      bgcolor: trustBadge.color,
                      borderRadius: 3,
                    },
                  }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<FileCheck size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCertClick();
                  }}
                  sx={{
                    width: '100%',
                    borderColor: '#059669',
                    color: '#059669',
                    fontSize: '0.75rem',
                    py: 0.5,
                    '&:hover': {
                      bgcolor: alpha('#059669', 0.08),
                      borderColor: '#047857',
                    },
                  }}
                >
                  Ver Certificaciones
                </Button>
              </Box>
            </Box>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default function InventoryBrowser() {
  const theme = useTheme();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  // Filters
  const [search, setSearch] = useState('');
  const [colorFilter, setColorFilter] = useState<string>('all');
  const [qualityFilter, setQualityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'loose' | 'jewelry'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'sold'>('available');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Certification dialog state
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Get filter options
  const colors = getUniqueColors();
  const stats = getInventoryStats();

  // Calculate trust scores for all items (memoized)
  const itemTrustScores = useMemo(() => {
    const scores = new Map<number, TrustScoreBreakdown>();
    inventoryData.forEach(item => {
      scores.set(item.item, calculateTrustScore(item));
    });
    return scores;
  }, []);

  // Handle opening certification dialog
  const handleCertClick = useCallback((item: InventoryItem) => {
    setSelectedItem(item);
    setCertDialogOpen(true);
  }, []);

  // Handle saving certifications
  const handleSaveCertifications = useCallback((certifications: InventoryItem['certifications']) => {
    if (selectedItem) {
      // In a real app, this would update the database
      // For now, we'll just update the local state
      console.log('Saving certifications for item:', selectedItem.item, certifications);
      // TODO: Persist to localStorage or API
    }
    setCertDialogOpen(false);
    setSelectedItem(null);
  }, [selectedItem]);

  // Filter inventory
  const filteredInventory = useMemo(() => {
    return inventoryData.filter(item => {
      // Status filter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'available' && item.estado === 'DISPONIBLE') ||
        (statusFilter === 'sold' && item.estado === 'VENDIDA');

      if (!matchesStatus) return false;

      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        item.nombre.toLowerCase().includes(searchLower) ||
        item.color.toLowerCase().includes(searchLower);

      const matchesColor = colorFilter === 'all' || item.color === colorFilter;
      const matchesQuality = qualityFilter === 'all' || item.calidad === qualityFilter;
      const matchesType =
        typeFilter === 'all' ||
        (typeFilter === 'loose' && !item.isJewelry) ||
        (typeFilter === 'jewelry' && item.isJewelry);

      return matchesSearch && matchesColor && matchesQuality && matchesType;
    });
  }, [search, colorFilter, qualityFilter, typeFilter, statusFilter]);

  // Sort by price (high to low)
  const sortedInventory = [...filteredInventory].sort((a, b) => b.precioCOP - a.precioCOP);

  // Calculate filtered stats
  const filteredStats = useMemo(() => {
    const totalValue = filteredInventory.reduce((sum, i) => sum + i.precioCOP, 0);
    return { count: filteredInventory.length, totalValue };
  }, [filteredInventory]);

  const clearFilters = () => {
    setSearch('');
    setColorFilter('all');
    setQualityFilter('all');
    setTypeFilter('all');
    setStatusFilter('available');
  };

  const hasFilters = search || colorFilter !== 'all' || qualityFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'available';

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* Premium Header - Simplified */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 3,
          borderRadius: 4,
          bgcolor: isLight ? '#FFFFFF' : '#1C1C1E',
          border: '1px solid',
          borderColor: isLight ? '#E5E7EB' : '#2C2C2E',
          position: 'relative',
          overflow: 'hidden',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #10B981 0%, #6EE7B7 100%)',
          },
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2.5,
                  bgcolor: isLight ? '#F0FDF4' : alpha('#10B981', 0.15),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Package size={24} color="#10B981" />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary, letterSpacing: '-0.02em' }}>
                  Inventario de Esmeraldas
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  Colección Premium · {stats.totalItems} piezas disponibles
                </Typography>
              </Box>
            </Box>

            {/* Quick stats - Subtle badges */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: isLight ? '#F9FAFB' : '#292524',
                  border: '1px solid',
                  borderColor: isLight ? '#E5E7EB' : '#3C3C3E',
                  textAlign: 'center',
                }}
              >
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: theme.palette.text.primary }}>
                  {stats.looseStones}
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', color: theme.palette.text.secondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Sueltas
                </Typography>
              </Box>
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: isLight ? '#F9FAFB' : '#292524',
                  border: '1px solid',
                  borderColor: isLight ? '#E5E7EB' : '#3C3C3E',
                  textAlign: 'center',
                }}
              >
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: theme.palette.text.primary }}>
                  {stats.jewelry}
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', color: theme.palette.text.secondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Joyería
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Filters - Compact */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          bgcolor: isLight ? '#FFFFFF' : '#1C1C1E',
          border: '1px solid',
          borderColor: isLight ? '#E5E7EB' : '#2C2C2E',
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <TextField
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{
              minWidth: 200,
              flex: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                bgcolor: isLight ? '#F9FAFB' : '#2C2C2E',
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} color="#9CA3AF" />
                </InputAdornment>
              ),
            }}
          />

          {/* Status filter */}
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'available' | 'sold')}
              displayEmpty
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="available">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10B981' }} />
                  Disponibles
                </Box>
              </MenuItem>
              <MenuItem value="sold">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#EF4444' }} />
                  Vendidas
                </Box>
              </MenuItem>
              <MenuItem value="all">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#6B7280' }} />
                  Todas
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          {/* Type filter */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | 'loose' | 'jewelry')}
              displayEmpty
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="all">Tipo</MenuItem>
              <MenuItem value="loose">Sueltas</MenuItem>
              <MenuItem value="jewelry">Joyería</MenuItem>
            </Select>
          </FormControl>

          {/* Color filter */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={colorFilter}
              onChange={(e) => setColorFilter(e.target.value)}
              displayEmpty
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="all">Todos colores</MenuItem>
              {colors.map((color) => (
                <MenuItem key={color} value={color}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: getColorDot(color) }} />
                    {color.replace('Verde ', '')}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Clear filters */}
          {hasFilters && (
            <Chip
              label="Limpiar"
              size="small"
              onClick={clearFilters}
              sx={{
                bgcolor: alpha('#EF4444', 0.1),
                color: '#EF4444',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            />
          )}

          <Box sx={{ flex: 1 }} />

          {/* View toggle */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, value) => value && setViewMode(value)}
            size="small"
          >
            <ToggleButton value="grid" sx={{ px: 1.5 }}>
              <LayoutGrid size={18} />
            </ToggleButton>
            <ToggleButton value="list" sx={{ px: 1.5 }}>
              <List size={18} />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>

      {/* Results info */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
          <strong style={{ color: theme.palette.text.primary }}>{sortedInventory.length}</strong> resultados
        </Typography>
        <Typography variant="body2" sx={{ color: '#059669', fontWeight: 600 }}>
          {formatFullCurrency(filteredStats.totalValue)} total
        </Typography>
      </Box>

      {/* Inventory Grid/List */}
      {viewMode === 'grid' ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: 2.5,
          }}
        >
          {sortedInventory.map((item) => (
            <InventoryCard
              key={item.item}
              item={item}
              isCompact={false}
              trustScore={itemTrustScores.get(item.item) || calculateTrustScore(item)}
              onCertClick={() => handleCertClick(item)}
            />
          ))}
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {sortedInventory.map((item) => (
            <InventoryCard
              key={item.item}
              item={item}
              isCompact={true}
              trustScore={itemTrustScores.get(item.item) || calculateTrustScore(item)}
              onCertClick={() => handleCertClick(item)}
            />
          ))}
        </Box>
      )}

      {/* Empty State */}
      {sortedInventory.length === 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            borderRadius: 4,
            border: '2px dashed',
            borderColor: isLight ? '#E5E7EB' : '#3C3C3E',
            textAlign: 'center',
          }}
        >
          <Package size={48} color="#9CA3AF" style={{ marginBottom: 16, opacity: 0.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 1 }}>
            Sin resultados
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            Ajusta los filtros para ver más items
          </Typography>
        </Paper>
      )}

      {/* Certification Upload Dialog */}
      {selectedItem && (
        <CertificationUpload
          open={certDialogOpen}
          onClose={() => {
            setCertDialogOpen(false);
            setSelectedItem(null);
          }}
          item={selectedItem}
          onSave={handleSaveCertifications}
        />
      )}
    </Box>
  );
}
