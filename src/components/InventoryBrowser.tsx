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
  alpha,
  useTheme,
  ToggleButton,
  ToggleButtonGroup,
  Collapse,
  Button,
  Slider,
  Fab,
  Tooltip,
} from '@mui/material';
import {
  Search,
  Package,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronUp,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useThemeMode } from '../contexts/ThemeContext';
import { getInventoryStats } from '../data/inventory';
import { useInventory } from '../hooks/useInventory';
import { useInventoryFiltering, type StatusFilter, type TypeFilter, type SortOption } from '../hooks/useInventoryFiltering';
import { InventoryItem, TrustScoreBreakdown } from '../types';
import CertificationUpload from './CertificationUpload';
import AddToInventoryModal from './AddToInventoryModal';
import { calculateTrustScore } from '../utils/trustScore';
import { formatCurrency, formatFullCurrency, getColorDot } from '../utils/formatting';
// Design System Tokens
import { emeraldCore, goldAccent, surfacesLight, surfacesDark, semanticColors } from '../design-system/tokens/colors';
import { emeraldGradients } from '../design-system/tokens/gradients';
// Extracted InventoryCard component (saves ~526 lines)
import { InventoryCard } from './inventory';

export default function InventoryBrowser() {
  const theme = useTheme();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const navigate = useNavigate();

  // Get inventory with media from hook
  const { inventory: inventoryData } = useInventory();

  // Filtering hook - handles all filter state and computed values
  const {
    filters,
    setSearch,
    setColorFilter,
    setQualityFilter,
    setTypeFilter,
    setStatusFilter,
    setShapeFilter,
    setPriceRange,
    setSortBy,
    clearFilters,
    hasFilters,
    sortedInventory,
    filteredStats,
    filterOptions,
  } = useInventoryFiltering({ inventory: inventoryData });

  // Destructure filter values for convenience
  const { search, colorFilter, qualityFilter, typeFilter, statusFilter, shapeFilter, priceRange, sortBy } = filters;

  // UI-only state (not part of filtering)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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

  // Stats for header (separate from filtering)
  const stats = getInventoryStats();

  // Filter options from hook for convenience
  const { colors, shapes, qualities, priceMinMax } = filterOptions;

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

  // Note: filteredInventory, sortedInventory, filteredStats, clearFilters, hasFilters
  // are now provided by useInventoryFiltering hook

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
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
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
              onChange={(e) => setSortBy(e.target.value as SortOption)}
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
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
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
