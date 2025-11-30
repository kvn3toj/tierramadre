// Ambassador Directory Component
// Browse and filter ambassadors by trust score, specialty, and location

import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  useTheme,
  Skeleton,
  Button,
} from '@mui/material';
import {
  Search,
  Grid3X3,
  List,
  SlidersHorizontal,
  Star,
  MapPin,
  Filter,
  X,
} from 'lucide-react';
import { AmbassadorProfile, PriceRange } from '../../types/ambassador';
import { loadAmbassadors } from '../../data/ambassadors';
import AmbassadorCard from './AmbassadorCard';

interface AmbassadorDirectoryProps {
  onViewProfile?: (ambassador: AmbassadorProfile) => void;
  onContact?: (ambassador: AmbassadorProfile) => void;
  maxVisible?: number;
  showFilters?: boolean;
  title?: string;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'trust' | 'rating' | 'sales' | 'response';

const PRICE_RANGE_LABELS: Record<PriceRange, string> = {
  'budget': 'Accesible',
  'mid-range': 'Intermedio',
  'luxury': 'Lujo',
  'investment': 'Inversion',
  'all': 'Todos',
};

export default function AmbassadorDirectory({
  onViewProfile,
  onContact,
  maxVisible,
  showFilters = true,
  title = 'Nuestros Asesores',
}: AmbassadorDirectoryProps) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('trust');
  const [priceRangeFilter, setPriceRangeFilter] = useState<PriceRange | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Load ambassadors
  const allAmbassadors = useMemo(() => loadAmbassadors(), []);

  // Get unique locations for filter
  const locations = useMemo(() => {
    const cities = new Set(allAmbassadors.map(a => a.location.city));
    return Array.from(cities).sort();
  }, [allAmbassadors]);

  // Filter and sort ambassadors
  const filteredAmbassadors = useMemo(() => {
    let result = allAmbassadors.filter(a => a.status === 'active');

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.displayName.toLowerCase().includes(query) ||
        a.tagline.toLowerCase().includes(query) ||
        a.specialties.some(s => s.name.toLowerCase().includes(query))
      );
    }

    // Price range filter
    if (priceRangeFilter !== 'all') {
      result = result.filter(a => a.priceRange === priceRangeFilter || a.priceRange === 'all');
    }

    // Location filter
    if (locationFilter !== 'all') {
      result = result.filter(a => a.location.city === locationFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'trust':
          return (b.trustScore?.overall || 0) - (a.trustScore?.overall || 0);
        case 'rating':
          return (b.reputation?.averageRating || 0) - (a.reputation?.averageRating || 0);
        case 'sales':
          return (b.reputation?.totalSales || 0) - (a.reputation?.totalSales || 0);
        case 'response':
          return (a.reputation?.avgResponseTime || 99) - (b.reputation?.avgResponseTime || 99);
        default:
          return 0;
      }
    });

    // Limit if maxVisible is set
    if (maxVisible) {
      result = result.slice(0, maxVisible);
    }

    return result;
  }, [allAmbassadors, searchQuery, priceRangeFilter, locationFilter, sortBy, maxVisible]);

  const hasActiveFilters = searchQuery || priceRangeFilter !== 'all' || locationFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setPriceRangeFilter('all');
    setLocationFilter('all');
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 800,
            mb: 1,
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Conecta con asesores de confianza verificados por Tierra Madre
        </Typography>
      </Box>

      {/* Search and Filters */}
      {showFilters && (
        <Box sx={{ mb: 3 }}>
          {/* Search Bar */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Buscar por nombre o especialidad..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />

            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, value) => value && setViewMode(value)}
              size="small"
            >
              <ToggleButton value="grid">
                <Grid3X3 size={18} />
              </ToggleButton>
              <ToggleButton value="list">
                <List size={18} />
              </ToggleButton>
            </ToggleButtonGroup>

            <Button
              variant={showFiltersPanel ? 'contained' : 'outlined'}
              startIcon={<SlidersHorizontal size={18} />}
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                ...(showFiltersPanel && {
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
                    ml: 1,
                    height: 18,
                    fontSize: '0.65rem',
                    bgcolor: '#EF4444',
                    color: 'white',
                  }}
                />
              )}
            </Button>
          </Box>

          {/* Filters Panel */}
          {showFiltersPanel && (
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                p: 2,
                bgcolor: isLight ? '#F9FAFB' : '#2C2C2E',
                borderRadius: 2,
                mb: 2,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Ordenar por</InputLabel>
                <Select
                  value={sortBy}
                  label="Ordenar por"
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                >
                  <MenuItem value="trust">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Star size={14} />
                      Confianza
                    </Box>
                  </MenuItem>
                  <MenuItem value="rating">Calificacion</MenuItem>
                  <MenuItem value="sales">Ventas</MenuItem>
                  <MenuItem value="response">Tiempo Respuesta</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Rango Precio</InputLabel>
                <Select
                  value={priceRangeFilter}
                  label="Rango Precio"
                  onChange={(e) => setPriceRangeFilter(e.target.value as PriceRange | 'all')}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="budget">Accesible</MenuItem>
                  <MenuItem value="mid-range">Intermedio</MenuItem>
                  <MenuItem value="luxury">Lujo</MenuItem>
                  <MenuItem value="investment">Inversion</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Ciudad</InputLabel>
                <Select
                  value={locationFilter}
                  label="Ciudad"
                  onChange={(e) => setLocationFilter(e.target.value)}
                  startAdornment={
                    <InputAdornment position="start">
                      <MapPin size={14} />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="all">Todas</MenuItem>
                  {locations.map(city => (
                    <MenuItem key={city} value={city}>{city}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {hasActiveFilters && (
                <Button
                  size="small"
                  startIcon={<X size={14} />}
                  onClick={clearFilters}
                  sx={{ textTransform: 'none' }}
                >
                  Limpiar filtros
                </Button>
              )}
            </Box>
          )}

          {/* Active Filters Tags */}
          {hasActiveFilters && !showFiltersPanel && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {searchQuery && (
                <Chip
                  size="small"
                  label={`Busqueda: "${searchQuery}"`}
                  onDelete={() => setSearchQuery('')}
                />
              )}
              {priceRangeFilter !== 'all' && (
                <Chip
                  size="small"
                  label={`Precio: ${PRICE_RANGE_LABELS[priceRangeFilter]}`}
                  onDelete={() => setPriceRangeFilter('all')}
                />
              )}
              {locationFilter !== 'all' && (
                <Chip
                  size="small"
                  label={`Ciudad: ${locationFilter}`}
                  onDelete={() => setLocationFilter('all')}
                />
              )}
            </Box>
          )}
        </Box>
      )}

      {/* Results Count */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {filteredAmbassadors.length} asesores encontrados
        </Typography>

        {/* Trust Level Legend */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          {['Elite', 'Confiable', 'Establecido', 'Nuevo'].map((level, idx) => {
            const colors = ['#FFD700', '#059669', '#3B82F6', '#9CA3AF'];
            return (
              <Box key={level} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: colors[idx],
                  }}
                />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {level}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Ambassador Grid/List */}
      {filteredAmbassadors.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            px: 4,
            bgcolor: isLight ? '#F9FAFB' : '#2C2C2E',
            borderRadius: 3,
          }}
        >
          <Filter size={48} style={{ color: '#9CA3AF', marginBottom: 16 }} />
          <Typography variant="h6" sx={{ mb: 1, color: 'text.secondary' }}>
            No se encontraron asesores
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Intenta con otros filtros o criterios de busqueda
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
        </Box>
      ) : viewMode === 'grid' ? (
        <Grid container spacing={2}>
          {filteredAmbassadors.map((ambassador) => (
            <Grid item xs={12} sm={6} md={4} key={ambassador.id}>
              <AmbassadorCard
                ambassador={ambassador}
                onViewProfile={onViewProfile}
                onContact={onContact}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {filteredAmbassadors.map((ambassador) => (
            <AmbassadorCard
              key={ambassador.id}
              ambassador={ambassador}
              variant="compact"
              onViewProfile={onViewProfile}
              onContact={onContact}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

// Loading Skeleton
export function AmbassadorDirectorySkeleton() {
  return (
    <Grid container spacing={2}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Grid item xs={12} sm={6} md={4} key={i}>
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Skeleton variant="circular" width={64} height={64} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="40%" />
                <Skeleton variant="text" width="30%" />
              </Box>
            </Box>
            <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 2, mb: 2 }} />
            <Box sx={{ display: 'flex', gap: 0.5, mb: 2 }}>
              <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 2 }} />
              <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 2 }} />
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Skeleton variant="rectangular" height={36} sx={{ flex: 1, borderRadius: 1 }} />
              <Skeleton variant="rectangular" height={36} sx={{ flex: 1, borderRadius: 1 }} />
            </Box>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
}
