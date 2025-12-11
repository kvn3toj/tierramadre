import { useState, useMemo, useCallback, useRef } from 'react';
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
  Badge,
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
  SlidersHorizontal,
  SearchX,
  Heart,
  X,
} from 'lucide-react';
import { useThemeMode } from '../contexts/ThemeContext';
import { useInventory } from '../hooks/useInventory';
import { useInventoryFiltering, type StatusFilter, type TypeFilter, type SortOption } from '../hooks/useInventoryFiltering';
import { useFavorites } from '../hooks/useFavorites';
import { usePagination } from '../hooks/usePagination';
import { useBrowsingProgress } from '../hooks/useBrowsingProgress';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { useComparison } from '../hooks/useComparison';
import { useSavedFilters } from '../hooks/useSavedFilters';
// TODO: Re-enable keyboard nav when adapted for virtualized grid (react-window)
// import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { useInventoryAnalytics } from '../hooks/useInventoryAnalytics';
import { InventoryItem, TrustScoreBreakdown } from '../types';
import CertificationUpload from './CertificationUpload';
import AddToInventoryModal from './AddToInventoryModal';
import { calculateTrustScore } from '../utils/trustScore';
import { formatCurrency, formatFullCurrency, getColorDot } from '../utils/formatting';
// Design System Tokens
import { emeraldCore, goldAccent, surfacesLight, surfacesDark, semanticColors } from '../design-system/tokens/colors';
import { emeraldGradients } from '../design-system/tokens/gradients';
// Inventory components
import { GridCard, ListRow, VirtualGrid } from './inventory';
import ProgressBadge from './ProgressBadge';
import ComparisonBar from './ComparisonBar';
import ComparisonModal from './ComparisonModal';
import RecentlyViewedCarousel from './RecentlyViewedCarousel';
import SavedFiltersDropdown from './SavedFiltersDropdown';
import KeyboardShortcutsHelp, { KeyboardShortcutsButton } from './KeyboardShortcutsHelp';

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

  // Favorites hook
  const { isFavorite, toggleFavorite, favoritesCount } = useFavorites();

  // Pagination hook (24 items per page)
  const pagination = usePagination({
    totalItems: sortedInventory.length,
    itemsPerPage: 24,
  });

  // Browsing progress hook (gamification)
  const totalAvailable = useMemo(() =>
    inventoryData.filter(i => i.estado?.toUpperCase() === 'DISPONIBLE').length,
    [inventoryData]
  );
  const browsingProgress = useBrowsingProgress(totalAvailable);

  // Recently viewed hook
  const { addToRecent, recentItems, clearRecent } = useRecentlyViewed();

  // Comparison hook
  const comparison = useComparison();

  // Saved filters hook
  const savedFilters = useSavedFilters();

  // Analytics hook
  const analyticsHook = useInventoryAnalytics();

  // Search input ref for keyboard navigation
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get visible items based on pagination
  const visibleInventory = useMemo(
    () => pagination.getVisibleItems(sortedInventory),
    [pagination, sortedInventory]
  );

  // Destructure filter values for convenience
  const { search, colorFilter, qualityFilter, typeFilter, statusFilter, shapeFilter, priceRange, sortBy } = filters;

  // UI-only state (not part of filtering)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Filter by favorites if enabled
  const displayInventory = useMemo(() => {
    if (!showFavoritesOnly) return visibleInventory;
    return visibleInventory.filter(item => isFavorite(item.item));
  }, [visibleInventory, showFavoritesOnly, isFavorite]);

  // Compute trust scores for comparison (only for selected items)
  const trustScoresMap = useMemo(() => {
    const map = new Map<number, TrustScoreBreakdown>();
    comparison.selectedItems.forEach(item => {
      const score = calculateTrustScore(item);
      map.set(item.item, score);
    });
    return map;
  }, [comparison.selectedItems]);

  // Map recent item IDs to actual inventory items
  const recentlyViewedItems = useMemo(() => {
    const itemMap = new Map(inventoryData.map(item => [item.item, item]));
    return recentItems
      .map(id => itemMap.get(id))
      .filter((item): item is InventoryItem => item !== undefined);
  }, [inventoryData, recentItems]);

  // TODO: Re-enable keyboard navigation when adapted for virtualized grid
  // Currently disabled because react-window only renders visible DOM items
  // const keyboardNav = useKeyboardNavigation({
  //   items: displayInventory,
  //   columns: gridColumns,
  //   onSelect: (item) => handleProductClick(item),
  //   onToggleFavorite: (itemId) => {
  //     toggleFavorite(itemId);
  //     analyticsHook.trackFavorite(itemId, !isFavorite(itemId));
  //   },
  //   onToggleComparison: (item) => {
  //     comparison.toggleComparison(item);
  //     if (comparison.isSelected(item.item)) {
  //       analyticsHook.trackCompareRemove(item.item);
  //     } else {
  //       analyticsHook.trackCompareAdd(item.item);
  //     }
  //   },
  //   onFocusSearch: () => searchInputRef.current?.focus(),
  //   enabled: viewMode === 'grid',
  // });

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

  // Stats for header - calculated from actual inventory data (not static)
  const stats = useMemo(() => {
    const available = inventoryData.filter(i => i.estado?.toUpperCase() === 'DISPONIBLE');
    return {
      totalItems: available.length,
      looseStones: available.filter(i => !i.isJewelry).length,
      jewelry: available.filter(i => i.isJewelry).length,
    };
  }, [inventoryData]);

  // Filter options from hook for convenience
  const { colors, shapes, qualities, priceMinMax } = filterOptions;

  // Calculate trust scores for all items (memoized)
  const itemTrustScores = useMemo(() => {
    const scores = new Map<number, TrustScoreBreakdown>();
    inventoryData.forEach(item => {
      scores.set(item.item, calculateTrustScore(item));
    });
    return scores;
  }, [inventoryData]);

  // Active filter count for badge visibility (MOKSART UX improvement)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search !== '') count++;
    if (colorFilter !== 'all') count++;
    if (qualityFilter !== 'all') count++;
    if (typeFilter !== 'all') count++;
    if (statusFilter !== 'all' && statusFilter !== 'available') count++; // available is default
    if (shapeFilter !== 'all') count++;
    // Price range check
    if (priceRange[0] !== priceMinMax.min || priceRange[1] !== priceMinMax.max) count++;
    return count;
  }, [search, colorFilter, qualityFilter, typeFilter, statusFilter, shapeFilter, priceRange, priceMinMax]);

  // Handle opening certification dialog
  const handleCertClick = useCallback((item: InventoryItem) => {
    setSelectedItem(item);
    setCertDialogOpen(true);
  }, []);

  const handleProductClick = useCallback((item: InventoryItem) => {
    // Track browsing progress
    browsingProgress.markViewed(item.item);
    // Add to recently viewed
    addToRecent(item.item);
    // Track analytics
    analyticsHook.trackItemView(item.item, item.nombre);
    // Navigate to product detail
    navigate(`/product/${item.item}`);
  }, [navigate, browsingProgress, addToRecent, analyticsHook]);

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
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {/* Progress Badge - Gamification */}
              <ProgressBadge
                level={browsingProgress.level}
                percentageExplored={browsingProgress.percentageExplored}
                viewedCount={browsingProgress.viewedCount}
                totalItems={totalAvailable}
                levelProgress={browsingProgress.levelProgress}
                nextLevel={browsingProgress.nextLevel}
              />

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
            placeholder="Buscar... (presiona /)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              // Track search after debounce would be better, but for now track on change
            }}
            onBlur={() => {
              // Track search when user finishes typing
              if (search.trim()) {
                analyticsHook.trackSearch(search, sortedInventory.length);
              }
            }}
            size="small"
            inputRef={searchInputRef}
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

          {/* Advanced Filters Toggle with Badge */}
          <Badge
            badgeContent={activeFilterCount}
            color="primary"
            invisible={activeFilterCount === 0}
            sx={{
              '& .MuiBadge-badge': {
                bgcolor: emeraldCore.primary,
                color: 'white',
                fontWeight: 700,
                fontSize: '0.65rem',
              },
            }}
          >
            <Button
              size="small"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              startIcon={<SlidersHorizontal size={16} />}
              endIcon={showAdvancedFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              sx={{
                color: activeFilterCount > 0 ? emeraldCore.primary : theme.palette.text.secondary,
                textTransform: 'none',
                fontWeight: activeFilterCount > 0 ? 600 : 500,
                bgcolor: activeFilterCount > 0 ? alpha(emeraldCore.primary, 0.08) : 'transparent',
                '&:hover': {
                  bgcolor: alpha(emeraldCore.primary, 0.12),
                },
              }}
            >
              Filtros
            </Button>
          </Badge>

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

          {/* Saved Filters Dropdown */}
          <SavedFiltersDropdown
            presets={savedFilters.presets}
            onSavePreset={(name) => savedFilters.savePreset(name, {
              search,
              colorFilter,
              qualityFilter,
              typeFilter,
              statusFilter,
              shapeFilter,
              priceRange,
              sortBy,
            })}
            onApplyPreset={(preset) => {
              // Apply saved filters
              setSearch(preset.filters.search);
              setColorFilter(preset.filters.colorFilter);
              setQualityFilter(preset.filters.qualityFilter);
              setTypeFilter(preset.filters.typeFilter as TypeFilter);
              setStatusFilter(preset.filters.statusFilter as StatusFilter);
              setShapeFilter(preset.filters.shapeFilter);
              setPriceRange(preset.filters.priceRange);
              setSortBy(preset.filters.sortBy as SortOption);
            }}
            onDeletePreset={savedFilters.deletePreset}
            hasActiveFilters={hasFilters}
          />

          <Box sx={{ flex: 1 }} />

          {/* View toggle */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, value) => {
              if (value) {
                setViewMode(value);
                analyticsHook.trackViewModeChange(value);
              }
            }}
            size="small"
          >
            <ToggleButton value="grid" sx={{ px: 1.5 }}>
              <LayoutGrid size={18} />
            </ToggleButton>
            <ToggleButton value="list" sx={{ px: 1.5 }}>
              <List size={18} />
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Keyboard shortcuts help button */}
          <KeyboardShortcutsButton onClick={() => setShowKeyboardHelp(true)} />
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

      {/* Active Filter Chips - Individual removal */}
      {hasFilters && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          {search && (
            <Chip
              label={`Búsqueda: "${search}"`}
              size="small"
              onDelete={() => setSearch('')}
              deleteIcon={<X size={14} />}
              sx={{
                bgcolor: alpha(emeraldCore.primary, 0.1),
                color: emeraldCore.dark,
                '& .MuiChip-deleteIcon': { color: emeraldCore.dark },
              }}
            />
          )}
          {colorFilter !== 'all' && (
            <Chip
              icon={<Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: getColorDot(colorFilter), ml: 1 }} />}
              label={colorFilter.replace('Verde ', '')}
              size="small"
              onDelete={() => setColorFilter('all')}
              deleteIcon={<X size={14} />}
              sx={{
                bgcolor: alpha(emeraldCore.primary, 0.1),
                color: emeraldCore.dark,
                '& .MuiChip-deleteIcon': { color: emeraldCore.dark },
              }}
            />
          )}
          {qualityFilter !== 'all' && (
            <Chip
              label={`Calidad: ${qualityFilter}`}
              size="small"
              onDelete={() => setQualityFilter('all')}
              deleteIcon={<X size={14} />}
              sx={{
                bgcolor: alpha(goldAccent.primary, 0.15),
                color: goldAccent.dark,
                '& .MuiChip-deleteIcon': { color: goldAccent.dark },
              }}
            />
          )}
          {typeFilter !== 'all' && (
            <Chip
              label={typeFilter === 'loose' ? 'Gemas' : 'Joyería'}
              size="small"
              onDelete={() => setTypeFilter('all')}
              deleteIcon={<X size={14} />}
              sx={{
                bgcolor: alpha(emeraldCore.primary, 0.1),
                color: emeraldCore.dark,
                '& .MuiChip-deleteIcon': { color: emeraldCore.dark },
              }}
            />
          )}
          {statusFilter !== 'available' && statusFilter !== 'all' && (
            <Chip
              label={statusFilter === 'sold' ? 'Vendidas' : 'Todas'}
              size="small"
              onDelete={() => setStatusFilter('available')}
              deleteIcon={<X size={14} />}
              sx={{
                bgcolor: alpha(semanticColors.error.main, 0.1),
                color: semanticColors.error.main,
                '& .MuiChip-deleteIcon': { color: semanticColors.error.main },
              }}
            />
          )}
          {shapeFilter !== 'all' && (
            <Chip
              label={`Talla: ${shapeFilter}`}
              size="small"
              onDelete={() => setShapeFilter('all')}
              deleteIcon={<X size={14} />}
              sx={{
                bgcolor: alpha(emeraldCore.primary, 0.1),
                color: emeraldCore.dark,
                '& .MuiChip-deleteIcon': { color: emeraldCore.dark },
              }}
            />
          )}
          {(priceRange[0] !== priceMinMax.min || priceRange[1] !== priceMinMax.max) && (
            <Chip
              label={`${formatCurrency(priceRange[0])} - ${formatCurrency(priceRange[1])}`}
              size="small"
              onDelete={() => setPriceRange([priceMinMax.min, priceMinMax.max])}
              deleteIcon={<X size={14} />}
              sx={{
                bgcolor: alpha(emeraldCore.primary, 0.1),
                color: emeraldCore.dark,
                '& .MuiChip-deleteIcon': { color: emeraldCore.dark },
              }}
            />
          )}
        </Box>
      )}

      {/* Results info - Enhanced display */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            {sortedInventory.length === inventoryData.length ? (
              <>
                <strong style={{ color: theme.palette.text.primary }}>{inventoryData.length}</strong> esmeraldas en total
              </>
            ) : (
              <>
                Mostrando <strong style={{ color: theme.palette.text.primary }}>{displayInventory.length}</strong> de {sortedInventory.length} esmeraldas
              </>
            )}
          </Typography>
          {/* Favorites toggle */}
          <Chip
            icon={<Heart size={14} fill={showFavoritesOnly ? '#ef4444' : 'none'} color={showFavoritesOnly ? '#ef4444' : '#6b7280'} />}
            label={`Favoritos (${favoritesCount})`}
            size="small"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            sx={{
              cursor: 'pointer',
              bgcolor: showFavoritesOnly ? alpha('#ef4444', 0.1) : 'transparent',
              color: showFavoritesOnly ? '#ef4444' : theme.palette.text.secondary,
              border: '1px solid',
              borderColor: showFavoritesOnly ? '#ef4444' : isLight ? surfacesLight.border.light : surfacesDark.border.default,
              fontWeight: showFavoritesOnly ? 600 : 400,
              '&:hover': {
                bgcolor: alpha('#ef4444', 0.1),
              },
            }}
          />
        </Box>
        <Typography variant="body2" sx={{ color: emeraldCore.dark, fontWeight: 600 }}>
          {formatFullCurrency(filteredStats.totalValue)} total
        </Typography>
      </Box>

      {/* Recently Viewed Carousel */}
      {recentlyViewedItems.length > 0 && (
        <RecentlyViewedCarousel
          items={recentlyViewedItems}
          onItemClick={handleProductClick}
          onClear={clearRecent}
        />
      )}

      {/* Inventory Grid/List */}
      {viewMode === 'grid' ? (
        <VirtualGrid
          items={showFavoritesOnly ? displayInventory : sortedInventory}
          trustScores={itemTrustScores}
          favorites={Array.from(itemTrustScores.keys()).filter(id => isFavorite(id))}
          onItemClick={handleProductClick}
          onCertClick={handleCertClick}
          onToggleFavorite={toggleFavorite}
          renderCard={(props) => (
            <GridCard
              item={props.item}
              trustScore={props.trustScore}
              isFavorite={props.isFavorite}
              onCertClick={props.onCertClick}
              onItemClick={props.onItemClick}
              onToggleFavorite={props.onToggleFavorite}
              isSelectedForComparison={comparison.isSelected(props.item.item)}
              onToggleComparison={() => comparison.toggleComparison(props.item)}
              canAddToComparison={comparison.canAddMore}
            />
          )}
        />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {displayInventory.map((item) => (
            <ListRow
              key={item.item}
              item={item}
              trustScore={itemTrustScores.get(item.item) || calculateTrustScore(item)}
              isFavorite={isFavorite(item.item)}
              onCertClick={() => handleCertClick(item)}
              onItemClick={() => handleProductClick(item)}
              onToggleFavorite={() => toggleFavorite(item.item)}
              isSelectedForComparison={comparison.isSelected(item.item)}
              onToggleComparison={() => comparison.toggleComparison(item)}
              canAddToComparison={comparison.canAddMore}
            />
          ))}
        </Box>
      )}

      {/* Load More Button - Only for list view (grid uses virtualization) */}
      {viewMode === 'list' && pagination.hasMore && !showFavoritesOnly && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => {
              pagination.loadMore();
              analyticsHook.trackLoadMore(pagination.visibleCount, sortedInventory.length);
            }}
            sx={{
              borderColor: emeraldCore.primary,
              color: emeraldCore.primary,
              textTransform: 'none',
              fontWeight: 600,
              px: 4,
              py: 1.5,
              borderRadius: 2,
              '&:hover': {
                bgcolor: alpha(emeraldCore.primary, 0.08),
                borderColor: emeraldCore.dark,
              },
            }}
          >
            Cargar más ({sortedInventory.length - pagination.visibleCount} restantes)
          </Button>
        </Box>
      )}

      {/* Empty State - Enhanced with guidance */}
      {(displayInventory.length === 0 || (showFavoritesOnly && favoritesCount === 0)) && (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            borderRadius: 4,
            border: '2px dashed',
            borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
            textAlign: 'center',
            bgcolor: isLight ? alpha(surfacesLight.background.secondary, 0.5) : alpha(surfacesDark.background.secondary, 0.5),
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: isLight ? surfacesLight.background.tertiary : surfacesDark.background.tertiary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
            }}
          >
            <SearchX size={32} color={isLight ? surfacesLight.text.tertiary : surfacesDark.text.tertiary} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 0.5 }}>
            Sin resultados
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2, maxWidth: 300, mx: 'auto' }}>
            No encontramos esmeraldas con los filtros seleccionados. Prueba ajustando los criterios de búsqueda.
          </Typography>
          {hasFilters && (
            <Button
              variant="outlined"
              size="small"
              onClick={clearFilters}
              sx={{
                borderColor: emeraldCore.primary,
                color: emeraldCore.primary,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: alpha(emeraldCore.primary, 0.08),
                  borderColor: emeraldCore.dark,
                },
              }}
            >
              Limpiar {activeFilterCount} filtro{activeFilterCount !== 1 ? 's' : ''}
            </Button>
          )}
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

      {/* Comparison Bar - Sticky bottom bar */}
      <ComparisonBar
        selectedItems={comparison.selectedItems}
        onRemove={comparison.removeFromComparison}
        onClear={comparison.clearComparison}
        onCompare={comparison.openComparisonModal}
      />

      {/* Comparison Modal - Side-by-side comparison */}
      <ComparisonModal
        open={comparison.showComparisonModal}
        onClose={() => {
          comparison.closeComparisonModal();
          analyticsHook.trackComparisonOpen(comparison.selectedItems.map(i => i.item));
        }}
        items={comparison.selectedItems}
        trustScores={trustScoresMap}
      />

      {/* Keyboard Shortcuts Help Dialog */}
      <KeyboardShortcutsHelp
        open={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />
    </Box>
  );
}
