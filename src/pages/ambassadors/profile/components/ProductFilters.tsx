/**
 * ProductFilters Component
 * Search, filter, and sort controls for asesor product listing.
 */

import React from 'react';
import {
  Box,
  Paper,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  useTheme,
} from '@mui/material';
import {
  Search,
  Grid3X3,
  List,
  Filter,
  SortAsc,
  CheckCircle,
  XCircle,
  Gem,
  Crown,
} from 'lucide-react';
import { brand, lightTokens, darkTokens, accentColors } from '../../../../design-system';

export type ViewMode = 'grid' | 'list';
export type SortOption = 'newest' | 'price-high' | 'price-low' | 'name';
export type StatusFilter = 'all' | 'disponible' | 'vendida';
export type TypeFilter = 'all' | 'loose' | 'jewelry';

interface ProductFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (status: StatusFilter) => void;
  typeFilter: TypeFilter;
  onTypeFilterChange: (type: TypeFilter) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  showFilters,
  onToggleFilters,
  onClearFilters,
  hasActiveFilters,
}) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 3,
        borderRadius: 2,
        bgcolor: isLight ? lightTokens.background.surface : darkTokens.background.surface,
        border: '1px solid',
        borderColor: isLight ? lightTokens.border.default : darkTokens.border.default,
      }}
    >
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <TextField
          placeholder="Buscar en catalogo..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
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
          onChange={(_, v) => v && onViewModeChange(v)}
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
          onClick={onToggleFilters}
          size="small"
          sx={{
            textTransform: 'none',
            ...(showFilters && {
              bgcolor: brand.emerald[500],
              '&:hover': { bgcolor: brand.emerald[600] },
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
                bgcolor: accentColors.error.light,
                color: lightTokens.text.inverse,
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
              onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="disponible">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle size={14} color={brand.emerald[500]} />
                  Disponible
                </Box>
              </MenuItem>
              <MenuItem value="vendida">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <XCircle size={14} color={lightTokens.text.muted} />
                  Vendida
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          {/* Type Filter */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Categoria</InputLabel>
            <Select
              value={typeFilter}
              label="Categoria"
              onChange={(e) => onTypeFilterChange(e.target.value as TypeFilter)}
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
                  Joyeria
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
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              startAdornment={
                <InputAdornment position="start">
                  <SortAsc size={14} />
                </InputAdornment>
              }
            >
              <MenuItem value="newest">Mas recientes</MenuItem>
              <MenuItem value="price-high">Mayor precio</MenuItem>
              <MenuItem value="price-low">Menor precio</MenuItem>
              <MenuItem value="name">Nombre A-Z</MenuItem>
            </Select>
          </FormControl>

          {hasActiveFilters && (
            <Button
              size="small"
              onClick={onClearFilters}
              sx={{ textTransform: 'none', color: 'text.secondary' }}
            >
              Limpiar filtros
            </Button>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default ProductFilters;
