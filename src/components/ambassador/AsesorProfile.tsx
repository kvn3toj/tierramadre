/**
 * AsesorProfile Component
 * Shows asesor details and their inventory products with filtering
 */

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Avatar,
  Button,
  Grid,
  Paper,
  CircularProgress,
  alpha,
  useTheme,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowLeft,
  Package,
  Phone,
  Gem,
  DollarSign,
  Search,
  Grid3X3,
  List,
  Share2,
  Filter,
  SortAsc,
  CheckCircle,
  XCircle,
  Crown,
} from 'lucide-react';
import { useAsesores } from '../../hooks/useAsesores';
import { useInventory } from '../../hooks/useInventory';
import { InventoryItem } from '../../types';
import { InventoryCard } from '../inventory/InventoryCard';

// Normalize name for comparison
const normalizeName = (name: string): string => {
  let result = '';
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    if ((char >= 65 && char <= 90) || (char >= 97 && char <= 122)) {
      result += name[i].toUpperCase();
    }
  }
  return result;
};

type ViewMode = 'grid' | 'list';
type SortOption = 'newest' | 'price-high' | 'price-low' | 'name';
type StatusFilter = 'all' | 'disponible' | 'vendida';
type TypeFilter = 'all' | 'loose' | 'jewelry';

export default function AsesorProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  // State for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  const { inventory } = useInventory();
  const { asesores, isLoading } = useAsesores(inventory);

  // Find the asesor by slug
  const asesor = useMemo(() => {
    if (!slug || !asesores.length) return null;
    return asesores.find(a => a.slug === slug) || null;
  }, [slug, asesores]);

  // Get products for this asesor
  const allProducts = useMemo(() => {
    if (!asesor || !inventory) return [];
    const normalizedAsesorName = normalizeName(asesor.name);
    return inventory.filter(item => {
      if (!item.asesor) return false;
      return normalizeName(item.asesor) === normalizedAsesorName;
    });
  }, [asesor, inventory]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.nombre.toLowerCase().includes(query) ||
        item.color?.toLowerCase().includes(query) ||
        item.calidad?.toLowerCase().includes(query) ||
        String(item.item).includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(item =>
        statusFilter === 'disponible'
          ? item.estado === 'DISPONIBLE'
          : item.estado === 'VENDIDA'
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(item =>
        typeFilter === 'loose' ? !item.isJewelry : item.isJewelry
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'price-high':
          return (b.precioCOP || 0) - (a.precioCOP || 0);
        case 'price-low':
          return (a.precioCOP || 0) - (b.precioCOP || 0);
        case 'name':
          return a.nombre.localeCompare(b.nombre, 'es');
        case 'newest':
        default:
          return b.item - a.item;
      }
    });

    return result;
  }, [allProducts, searchQuery, statusFilter, typeFilter, sortBy]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!allProducts.length) return {
      totalValue: 0,
      avgPrice: 0,
      looseCount: 0,
      jewelryCount: 0,
      disponibleCount: 0,
      vendidaCount: 0,
    };

    const disponible = allProducts.filter(p => p.estado === 'DISPONIBLE');
    const totalValue = disponible.reduce((sum, p) => sum + (p.precioCOP || 0), 0);
    const looseCount = allProducts.filter(p => !p.isJewelry).length;
    const jewelryCount = allProducts.filter(p => p.isJewelry).length;

    return {
      totalValue,
      avgPrice: disponible.length ? totalValue / disponible.length : 0,
      looseCount,
      jewelryCount,
      disponibleCount: disponible.length,
      vendidaCount: allProducts.length - disponible.length,
    };
  }, [allProducts]);

  const handleBack = () => {
    navigate('/ambassadors');
  };

  const handleProductClick = (item: InventoryItem) => {
    navigate(`/product/${item.item}`);
  };

  const handleContact = () => {
    if (asesor) {
      // For now, just show the message since we don't have phone numbers yet
      // Later can use WhatsApp API with phone number from sheets
      alert(`Contactar a ${asesor.name}\n\nEsta funcionalidad se habilitará próximamente con WhatsApp.`);
    }
  };

  const handleShare = async () => {
    if (asesor) {
      const url = window.location.href;
      const text = `Mira el catálogo de ${asesor.name} en Tierra Madre - ${stats.disponibleCount} esmeraldas disponibles`;

      if (navigator.share) {
        try {
          await navigator.share({ title: `${asesor.name} - Tierra Madre`, text, url });
        } catch (err) {
          // User cancelled or error
        }
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(url);
        alert('Enlace copiado al portapapeles');
      }
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setSortBy('newest');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || typeFilter !== 'all';

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress sx={{ color: '#059669' }} />
      </Box>
    );
  }

  if (!asesor) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Asesor no encontrado
        </Typography>
        <Button
          startIcon={<ArrowLeft size={18} />}
          onClick={handleBack}
          sx={{ textTransform: 'none' }}
        >
          Volver a Asesores
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      {/* Back Button */}
      <Button
        startIcon={<ArrowLeft size={18} />}
        onClick={handleBack}
        sx={{
          textTransform: 'none',
          color: 'text.secondary',
          mb: 2,
          '&:hover': { color: '#059669' },
        }}
      >
        Volver a Asesores
      </Button>

      {/* Profile Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          bgcolor: isLight ? '#FFFFFF' : '#1C1C1E',
          border: '1px solid',
          borderColor: isLight ? '#E5E7EB' : '#2C2C2E',
        }}
      >
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Avatar and Name */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 250 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: '#059669',
                fontSize: '2rem',
                fontWeight: 700,
              }}
            >
              {asesor.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                {asesor.name}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                Asesor de Esmeraldas - Tierra Madre
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  size="small"
                  icon={<CheckCircle size={12} />}
                  label={`${stats.disponibleCount} disponibles`}
                  sx={{
                    bgcolor: alpha('#059669', 0.1),
                    color: '#059669',
                    fontSize: '0.7rem',
                  }}
                />
                {stats.vendidaCount > 0 && (
                  <Chip
                    size="small"
                    label={`${stats.vendidaCount} vendidas`}
                    sx={{
                      bgcolor: alpha('#9CA3AF', 0.1),
                      color: '#6B7280',
                      fontSize: '0.7rem',
                    }}
                  />
                )}
              </Box>
            </Box>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Tooltip title="Compartir perfil">
              <IconButton onClick={handleShare} sx={{ color: 'text.secondary' }}>
                <Share2 size={20} />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<Phone size={18} />}
              onClick={handleContact}
              sx={{
                bgcolor: '#059669',
                '&:hover': { bgcolor: '#047857' },
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Contactar
            </Button>
          </Box>
        </Box>

        {/* Stats */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            mt: 3,
            pt: 3,
            borderTop: '1px solid',
            borderColor: isLight ? '#E5E7EB' : '#2C2C2E',
            flexWrap: 'wrap',
          }}
        >
          <StatBox
            icon={<Package size={20} />}
            value={allProducts.length.toString()}
            label="Total Productos"
            color="#059669"
          />
          <StatBox
            icon={<Gem size={20} />}
            value={stats.looseCount.toString()}
            label="Gemas Sueltas"
            color="#3B82F6"
          />
          <StatBox
            icon={<Crown size={20} />}
            value={stats.jewelryCount.toString()}
            label="Joyería"
            color="#8B5CF6"
          />
          <StatBox
            icon={<DollarSign size={20} />}
            value={formatCurrency(stats.totalValue)}
            label="Valor Disponible"
            color="#F59E0B"
          />
        </Box>
      </Paper>

      {/* Search and Filters */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2,
          bgcolor: isLight ? '#FFFFFF' : '#1C1C1E',
          border: '1px solid',
          borderColor: isLight ? '#E5E7EB' : '#2C2C2E',
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <TextField
            placeholder="Buscar en catálogo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ flex: 1, minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            }}
          />

          {/* View Toggle */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, v) => v && setViewMode(v)}
            size="small"
          >
            <ToggleButton value="grid">
              <Grid3X3 size={18} />
            </ToggleButton>
            <ToggleButton value="list">
              <List size={18} />
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Filter Toggle */}
          <Button
            variant={showFilters ? 'contained' : 'outlined'}
            startIcon={<Filter size={16} />}
            onClick={() => setShowFilters(!showFilters)}
            size="small"
            sx={{
              textTransform: 'none',
              ...(showFilters && {
                bgcolor: '#059669',
                '&:hover': { bgcolor: '#047857' },
              }),
            }}
          >
            Filtros
            {hasActiveFilters && (
              <Chip
                size="small"
                label="!"
                sx={{
                  ml: 0.5,
                  height: 16,
                  fontSize: '0.6rem',
                  bgcolor: '#EF4444',
                  color: 'white',
                }}
              />
            )}
          </Button>
        </Box>

        {/* Expanded Filters */}
        {showFilters && (
          <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Status Filter */}
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Estado</InputLabel>
              <Select
                value={statusFilter}
                label="Estado"
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="disponible">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle size={14} color="#059669" />
                    Disponible
                  </Box>
                </MenuItem>
                <MenuItem value="vendida">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <XCircle size={14} color="#9CA3AF" />
                    Vendida
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            {/* Type Filter */}
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Tipo</InputLabel>
              <Select
                value={typeFilter}
                label="Tipo"
                onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="loose">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Gem size={14} />
                    Gemas
                  </Box>
                </MenuItem>
                <MenuItem value="jewelry">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Crown size={14} />
                    Joyería
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            {/* Sort */}
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Ordenar</InputLabel>
              <Select
                value={sortBy}
                label="Ordenar"
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                startAdornment={
                  <InputAdornment position="start">
                    <SortAsc size={14} />
                  </InputAdornment>
                }
              >
                <MenuItem value="newest">Más recientes</MenuItem>
                <MenuItem value="price-high">Mayor precio</MenuItem>
                <MenuItem value="price-low">Menor precio</MenuItem>
                <MenuItem value="name">Nombre A-Z</MenuItem>
              </Select>
            </FormControl>

            {hasActiveFilters && (
              <Button
                size="small"
                onClick={clearFilters}
                sx={{ textTransform: 'none', color: 'text.secondary' }}
              >
                Limpiar filtros
              </Button>
            )}
          </Box>
        )}
      </Paper>

      {/* Results Count */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {filteredProducts.length} de {allProducts.length} productos
        </Typography>
      </Box>

      {/* Products Grid/List */}
      {filteredProducts.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
            bgcolor: isLight ? '#F9FAFB' : '#2C2C2E',
          }}
        >
          <Package size={48} style={{ color: '#9CA3AF', marginBottom: 16 }} />
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2 }}>
            {hasActiveFilters
              ? 'No se encontraron productos con los filtros seleccionados'
              : 'Este asesor no tiene productos asignados actualmente'}
          </Typography>
          {hasActiveFilters && (
            <Button
              variant="outlined"
              onClick={clearFilters}
              sx={{ textTransform: 'none' }}
            >
              Limpiar filtros
            </Button>
          )}
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filteredProducts.map((item) => (
            <Grid
              item
              xs={12}
              sm={viewMode === 'list' ? 12 : 6}
              md={viewMode === 'list' ? 12 : 4}
              key={item.item}
            >
              <InventoryCard
                item={item}
                isCompact={viewMode === 'list'}
                onCertClick={() => {}}
                onClick={() => handleProductClick(item)}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

// Stat Box Component
function StatBox({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
}) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 1.5,
        borderRadius: 2,
        bgcolor: alpha(color, isLight ? 0.1 : 0.15),
        minWidth: 130,
        flex: '1 1 auto',
      }}
    >
      <Box sx={{ color }}>{icon}</Box>
      <Box>
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, fontSize: '1.1rem', lineHeight: 1, color }}
        >
          {value}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {label}
        </Typography>
      </Box>
    </Box>
  );
}

// Format currency helper
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${Math.round(value / 1000)}K`;
  }
  return `$${value.toLocaleString('es-CO')}`;
}
