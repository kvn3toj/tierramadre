import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Slider,
  Fab,
  Tooltip,
} from '@mui/material';
import {
  Search,
  Gem,
  Package,
  LayoutGrid,
  List,
  Crown,
  ChevronDown,
  ChevronUp,
  MapPin,
  User,
  FileCheck,
  Play,
  Images,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useThemeMode } from '../contexts/ThemeContext';
import {
  getInventoryStats,
  getUniqueColors,
} from '../data/inventory';
import { useInventory } from '../hooks/useInventory';
import { InventoryItem, TrustScoreBreakdown } from '../types';
import { fuzzyMatch } from '../utils/fuzzySearch';
import { TrustBadgeCompact } from './TrustBadge';
import CertificationUpload from './CertificationUpload';
import AddToInventoryModal from './AddToInventoryModal';
import { calculateTrustScore, getTrustBadge } from '../utils/trustScore';
import { formatCurrency, formatFullCurrency, getColorDot, getQualityBadge } from '../utils/formatting';
import { PriceDisplay } from './PriceDisplay';
// Design System Tokens
import { emeraldCore, goldAccent, surfacesLight, surfacesDark, semanticColors } from '../design-system/tokens/colors';
import { emeraldGradients } from '../design-system/tokens/gradients';
// Shadows available if needed: cardShadows, emeraldShadows

// Simplified Inventory Card - Clean design with hover details
interface InventoryCardProps {
  item: InventoryItem;
  isCompact: boolean;
  trustScore: TrustScoreBreakdown;
  onCertClick: () => void;
  onClick: () => void;
}

const InventoryCard = ({ item, isCompact, trustScore, onCertClick, onClick }: InventoryCardProps) => {
  const theme = useTheme();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const [showDetails] = useState(false);

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
          bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.primary,
          border: '1px solid',
          borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: emeraldCore.dark,
            bgcolor: isLight ? emeraldCore.lightest : alpha(emeraldCore.dark, 0.08),
          },
        }}
        onClick={onClick}
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

        {/* Price - Dual display */}
        <Box sx={{ minWidth: 100, textAlign: 'right' }}>
          <PriceDisplay price={item.precioCOP} compact />
        </Box>
      </Paper>
    );
  }

  // Grid card view - Simplified
  return (
    <Card
      elevation={0}
      onClick={onClick}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
        bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.primary,
        overflow: 'hidden',
        transition: 'all 0.25s ease',
        cursor: 'pointer',
        '&:hover': {
          borderColor: emeraldCore.primary,
          transform: 'translateY(-4px)',
          boxShadow: isLight
            ? '0 20px 40px rgba(0, 0, 0, 0.08)'
            : '0 20px 40px rgba(0, 0, 0, 0.3)',
          '& .price-text': {
            color: emeraldCore.primary,
          },
        },
      }}
    >
      {/* Product Image/Video Section */}
      {item.imagen ? (
        <Box
          sx={{
            height: 140,
            position: 'relative',
            overflow: 'hidden',
            bgcolor: isLight ? surfacesLight.background.secondary : surfacesDark.background.secondary,
          }}
        >
          {item.mediaType === 'video' ? (
            // Video with thumbnail and play icon
            <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
              <img
                src={item.thumbnailUrl || item.imagen}
                alt={item.nombre}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  bgcolor: 'rgba(0, 0, 0, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Play size={24} color="white" fill="white" />
              </Box>
            </Box>
          ) : (
            // Image
            <img
              src={item.imagen}
              alt={item.nombre}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          )}

          {/* Gallery count badge if multiple media items */}
          {(item.galleryCount ?? 0) > 1 && (
            <Chip
              icon={<Images size={14} />}
              label={item.galleryCount}
              size="small"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                bgcolor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                fontSize: '0.7rem',
                fontWeight: 600,
                height: 24,
                '& .MuiChip-icon': {
                  color: 'white',
                },
              }}
            />
          )}
        </Box>
      ) : (
        // Placeholder for items without media
        <Box
          sx={{
            height: 80,
            bgcolor: isLight ? surfacesLight.background.secondary : surfacesDark.background.secondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Gem size={32} color={isLight ? surfacesLight.text.disabled : surfacesDark.text.disabled} />
        </Box>
      )}

      {/* Minimal header - Small accent bar + icon (no green blocks - Moksart) */}
      <Box
        sx={{
          height: 56,
          bgcolor: isLight ? surfacesLight.background.tertiary : surfacesDark.background.secondary,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          px: 2.5,
          borderBottom: '1px solid',
          borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
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
            bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.primary,
            border: '1px solid',
            borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 2,
          }}
        >
          {item.isJewelry ? (
            <Crown size={18} color={isLight ? surfacesLight.text.secondary : surfacesDark.text.secondary} />
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
            bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.primary,
            border: '1px solid',
            borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
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
              bgcolor: isLight ? surfacesLight.text.primary : surfacesDark.text.primary,
              color: isLight ? surfacesLight.background.primary : surfacesDark.background.primary,
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
          component="div"
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
              <Box sx={{ color: surfacesLight.text.disabled }}>•</Box>
              {item.peso} ct
            </>
          )}
          {item.isJewelry && item.metalType && (
            <>
              <Box sx={{ color: surfacesLight.text.disabled }}>•</Box>
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
          <Box className="price-text" sx={{ flex: 1 }}>
            <PriceDisplay price={item.precioCOP} compact />
          </Box>

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
              borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
                <MapPin size={12} color={surfacesLight.text.tertiary} />
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                  {item.ubicacion}
                </Typography>
                <Box sx={{ flex: 1 }} />
                <User size={12} color={surfacesLight.text.tertiary} />
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
                  borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
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
                    borderColor: emeraldCore.dark,
                    color: emeraldCore.dark,
                    fontSize: '0.75rem',
                    py: 0.5,
                    '&:hover': {
                      bgcolor: alpha(emeraldCore.dark, 0.08),
                      borderColor: emeraldCore.darker,
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
  const navigate = useNavigate();

  // Get inventory with media from hook
  const { inventory: inventoryData } = useInventory();

  // Filters
  const [search, setSearch] = useState('');
  const [colorFilter, setColorFilter] = useState<string>('all');
  const [qualityFilter, setQualityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'loose' | 'jewelry'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'sold'>('all');
  const [shapeFilter, setShapeFilter] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000000]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<string>('price-desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Certification dialog state
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Add to inventory modal state
  const [addInventoryOpen, setAddInventoryOpen] = useState(false);

  // Sync pricing sheet state
  const [isSyncing, setIsSyncing] = useState(false);

  // Handle sync pricing sheet
  const handleSyncPricing = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/sync-pricing-sheet', {
        method: 'POST',
      });
      const result = await response.json();
      if (result.success) {
        alert(`Sincronizado: ${result.synced} productos agregados a la hoja de precios`);
      } else {
        alert(`Error: ${result.message || 'Error al sincronizar'}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('Error al conectar con el servidor');
    } finally {
      setIsSyncing(false);
    }
  };

  // Get filter options
  const colors = getUniqueColors();
  const stats = getInventoryStats();

  // Get unique shapes and qualities
  const shapes = useMemo(() => {
    const uniqueShapes = new Set(inventoryData.map(item => item.talla).filter(Boolean));
    return Array.from(uniqueShapes).sort();
  }, []);

  const qualities = useMemo(() => {
    const uniqueQualities = new Set(inventoryData.map(item => item.calidad).filter(Boolean));
    return Array.from(uniqueQualities).sort();
  }, []);

  // Get price range from inventory
  const priceMinMax = useMemo(() => {
    const prices = inventoryData.map(item => item.precioCOP).filter(p => p > 0);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices)
    };
  }, []);

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

  const handleProductClick = useCallback((item: InventoryItem) => {
    navigate(`/product/${item.item}`);
  }, [navigate]);

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

      // Smart search: exact/contains for short queries, fuzzy for longer with typos
      const matchesSearch =
        !search ||
        fuzzyMatch(item.nombre, search) ||
        fuzzyMatch(item.color, search) ||
        fuzzyMatch(item.calidad, search) ||
        item.item.toString().includes(search.trim());

      const matchesColor = colorFilter === 'all' || item.color === colorFilter;
      const matchesQuality = qualityFilter === 'all' || item.calidad === qualityFilter;
      const matchesType =
        typeFilter === 'all' ||
        (typeFilter === 'loose' && !item.isJewelry) ||
        (typeFilter === 'jewelry' && item.isJewelry);
      const matchesShape = shapeFilter === 'all' || item.talla === shapeFilter;
      const matchesPrice = item.precioCOP >= priceRange[0] && item.precioCOP <= priceRange[1];

      return matchesSearch && matchesColor && matchesQuality && matchesType && matchesShape && matchesPrice;
    });
  }, [search, colorFilter, qualityFilter, typeFilter, statusFilter, shapeFilter, priceRange]);

  // Sort inventory based on selected option
  const sortedInventory = useMemo(() => {
    const sorted = [...filteredInventory];

    switch (sortBy) {
      case 'name-asc':
        return sorted.sort((a, b) => a.nombre.localeCompare(b.nombre));
      case 'name-desc':
        return sorted.sort((a, b) => b.nombre.localeCompare(a.nombre));
      case 'price-asc':
        return sorted.sort((a, b) => a.precioCOP - b.precioCOP);
      case 'price-desc':
        return sorted.sort((a, b) => b.precioCOP - a.precioCOP);
      case 'quality-premium':
        return sorted.sort((a, b) => {
          const qualityOrder: Record<string, number> = {
            'SuperFina': 4,
            'Fina': 3,
            'Superior': 2,
            'Comercial': 1,
          };
          const aScore = qualityOrder[a.calidad.split(' ').pop() || ''] || 0;
          const bScore = qualityOrder[b.calidad.split(' ').pop() || ''] || 0;
          return bScore - aScore;
        });
      case 'item-number':
        return sorted.sort((a, b) => a.item - b.item);
      case 'newest':
        return sorted.sort((a, b) => {
          // Parse dates in format "20-nov-2025"
          const parseDate = (dateStr: string) => {
            if (!dateStr) return 0;
            return new Date(dateStr).getTime();
          };
          return parseDate(b.fechaIngreso) - parseDate(a.fechaIngreso);
        });
      default:
        return sorted.sort((a, b) => b.precioCOP - a.precioCOP);
    }
  }, [filteredInventory, sortBy]);

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
    setStatusFilter('all');
    setShapeFilter('all');
    setPriceRange([priceMinMax.min, priceMinMax.max]);
  };

  const hasFilters = search || colorFilter !== 'all' || qualityFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'all' || shapeFilter !== 'all' || priceRange[0] !== priceMinMax.min || priceRange[1] !== priceMinMax.max;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3, md: 0 } }}>
      {/* Premium Header - Simplified */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 3,
          borderRadius: 4,
          bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.primary,
          border: '1px solid',
          borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
          position: 'relative',
          overflow: 'hidden',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: emeraldGradients.horizontal,
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
                  bgcolor: isLight ? emeraldCore.lightest : alpha(emeraldCore.primary, 0.15),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Package size={24} color={emeraldCore.primary} />
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
                  bgcolor: isLight ? surfacesLight.background.secondary : surfacesDark.background.secondary,
                  border: '1px solid',
                  borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
                  textAlign: 'center',
                }}
              >
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: theme.palette.text.primary }}>
                  {stats.looseStones}
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', color: theme.palette.text.secondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Gemas
                </Typography>
              </Box>
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: isLight ? surfacesLight.background.secondary : surfacesDark.background.secondary,
                  border: '1px solid',
                  borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
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
          bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.primary,
          border: '1px solid',
          borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: showAdvancedFilters ? 2 : 0 }}>
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
                bgcolor: isLight ? surfacesLight.background.secondary : surfacesDark.background.secondary,
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} color={surfacesLight.text.tertiary} />
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
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: emeraldCore.primary }} />
                  Disponibles
                </Box>
              </MenuItem>
              <MenuItem value="sold">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: semanticColors.error.main }} />
                  Vendidas
                </Box>
              </MenuItem>
              <MenuItem value="all">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: surfacesLight.text.secondary }} />
                  Todas
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          {/* Sort dropdown */}
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              displayEmpty
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="price-desc">💰 Precio: Mayor a Menor</MenuItem>
              <MenuItem value="price-asc">💸 Precio: Menor a Mayor</MenuItem>
              <MenuItem value="name-asc">🔤 Nombre A-Z</MenuItem>
              <MenuItem value="name-desc">🔤 Nombre Z-A</MenuItem>
              <MenuItem value="quality-premium">⭐ Mejor Calidad Primero</MenuItem>
              <MenuItem value="item-number">🔢 Número de Item</MenuItem>
              <MenuItem value="newest">✨ Más Recientes</MenuItem>
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
              <MenuItem value="loose">Gemas</MenuItem>
              <MenuItem value="jewelry">Joyería</MenuItem>
            </Select>
          </FormControl>

          {/* Advanced Filters Toggle */}
          <Button
            size="small"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            startIcon={showAdvancedFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            sx={{
              color: theme.palette.text.secondary,
              textTransform: 'none',
              fontWeight: 500,
            }}
          >
            Filtros Avanzados
          </Button>

          {/* Clear filters */}
          {hasFilters && (
            <Chip
              label="Limpiar"
              size="small"
              onClick={clearFilters}
              sx={{
                bgcolor: alpha(semanticColors.error.main, 0.1),
                color: semanticColors.error.main,
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

        {/* Collapsible Advanced Filters */}
        <Collapse in={showAdvancedFilters}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mt: 2, pt: 2, borderTop: '1px solid', borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default }}>
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

            {/* Shape filter */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={shapeFilter}
                onChange={(e) => setShapeFilter(e.target.value)}
                displayEmpty
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="all">Talla</MenuItem>
                {shapes.map((shape) => (
                  <MenuItem key={shape} value={shape}>
                    {shape}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Quality filter */}
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value={qualityFilter}
                onChange={(e) => setQualityFilter(e.target.value)}
                displayEmpty
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="all">Calidad</MenuItem>
                {qualities.map((quality) => (
                  <MenuItem key={quality} value={quality}>
                    {quality}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Price Range Slider */}
          <Box sx={{ mt: 2, px: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
              Rango de Precio
            </Typography>
            <Typography variant="caption" sx={{ color: emeraldCore.dark, fontWeight: 600 }}>
              {formatCurrency(priceRange[0])} - {formatCurrency(priceRange[1])}
            </Typography>
          </Box>
          <Slider
            value={priceRange}
            onChange={(_, value) => setPriceRange(value as [number, number])}
            min={priceMinMax.min}
            max={priceMinMax.max}
            step={100000}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => formatCurrency(value)}
            sx={{
              color: emeraldCore.dark,
              '& .MuiSlider-thumb': {
                width: 20,
                height: 20,
              },
              '& .MuiSlider-track': {
                height: 4,
              },
              '& .MuiSlider-rail': {
                height: 4,
                bgcolor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
              },
            }}
          />
          </Box>
        </Collapse>
      </Paper>

      {/* Results info */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
          <strong style={{ color: theme.palette.text.primary }}>{sortedInventory.length}</strong> resultados
        </Typography>
        <Typography variant="body2" sx={{ color: emeraldCore.dark, fontWeight: 600 }}>
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
              onClick={() => handleProductClick(item)}
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
              onClick={() => handleProductClick(item)}
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
            borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
            textAlign: 'center',
          }}
        >
          <Package size={48} color={surfacesLight.text.tertiary} style={{ marginBottom: 16, opacity: 0.5 }} />
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

      {/* Floating Action Button - Sync Pricing Sheet */}
      <Tooltip title="Sincronizar hoja de precios" placement="left">
        <Fab
          color="secondary"
          onClick={handleSyncPricing}
          disabled={isSyncing}
          sx={{
            position: 'fixed',
            bottom: 170,
            right: 24,
            bgcolor: goldAccent.primary,
            '&:hover': { bgcolor: goldAccent.dark },
            '&:disabled': { bgcolor: surfacesLight.border.light },
            boxShadow: '0 4px 20px rgba(212, 175, 55, 0.4)',
          }}
        >
          <RefreshCw size={24} className={isSyncing ? 'animate-spin' : ''} />
        </Fab>
      </Tooltip>

      {/* Floating Action Button - Add to Inventory */}
      <Tooltip title="Agregar producto al inventario" placement="left">
        <Fab
          color="primary"
          onClick={() => setAddInventoryOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 100,
            right: 24,
            bgcolor: emeraldCore.dark,
            '&:hover': { bgcolor: emeraldCore.darker },
            boxShadow: '0 4px 20px rgba(5, 150, 105, 0.4)',
          }}
        >
          <Plus size={24} />
        </Fab>
      </Tooltip>

      {/* Add to Inventory Modal */}
      <AddToInventoryModal
        open={addInventoryOpen}
        onClose={() => setAddInventoryOpen(false)}
        onSuccess={(itemNumber) => {
          console.log('New product added:', itemNumber);
          // Optionally refresh the inventory
        }}
      />
    </Box>
  );
}
