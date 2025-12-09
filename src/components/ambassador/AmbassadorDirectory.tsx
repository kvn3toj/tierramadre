// Ambassador Directory Component
// Browse and filter asesores from Google Sheets

import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Grid,
  useTheme,
  Skeleton,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Search,
  Grid3X3,
  List,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { useAsesores, Asesor } from '../../hooks/useAsesores';
import { useInventory } from '../../hooks/useInventory';
import AsesorCard from './AsesorCard';

interface AmbassadorDirectoryProps {
  onViewProducts?: (asesor: Asesor) => void;
  onContact?: (asesor: Asesor) => void;
  maxVisible?: number;
  showFilters?: boolean;
  title?: string;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'products' | 'name';

export default function AmbassadorDirectory({
  onViewProducts,
  onContact,
  maxVisible,
  showFilters = true,
  title = 'Nuestros Asesores',
}: AmbassadorDirectoryProps) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('products');

  // Load inventory and asesores from Google Sheets
  const { inventory } = useInventory();
  const { asesores, isLoading, error, refreshAsesores } = useAsesores(inventory);

  // Filter and sort asesores
  const filteredAsesores = useMemo(() => {
    let result = [...asesores];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.name.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'products':
          return (b.productCount || 0) - (a.productCount || 0);
        case 'name':
          return a.name.localeCompare(b.name, 'es');
        default:
          return 0;
      }
    });

    // Limit if maxVisible is set
    if (maxVisible) {
      result = result.slice(0, maxVisible);
    }

    return result;
  }, [asesores, searchQuery, sortBy, maxVisible]);

  const hasActiveFilters = !!searchQuery;

  const clearFilters = () => {
    setSearchQuery('');
  };

  // Loading state
  if (isLoading) {
    return (
      <Box>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={24} sx={{ color: '#059669' }} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Cargando asesores desde Google Sheets...
          </Typography>
        </Box>
        <AmbassadorDirectorySkeleton />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box>
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={refreshAsesores}>
              Reintentar
            </Button>
          }
        >
          No se pudieron cargar los asesores: {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
          <Button
            size="small"
            startIcon={<RefreshCw size={14} />}
            onClick={refreshAsesores}
            sx={{ textTransform: 'none' }}
          >
            Actualizar
          </Button>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Asesores cargados desde Google Sheets - {asesores.length} registrados
        </Typography>
      </Box>

      {/* Search and View Toggle */}
      {showFilters && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Buscar asesor por nombre..."
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

            <ToggleButtonGroup
              value={sortBy}
              exclusive
              onChange={(_, value) => value && setSortBy(value)}
              size="small"
            >
              <ToggleButton value="products" sx={{ textTransform: 'none', px: 2 }}>
                Por Productos
              </ToggleButton>
              <ToggleButton value="name" sx={{ textTransform: 'none', px: 2 }}>
                Por Nombre
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      )}

      {/* Results Count */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {filteredAsesores.length} asesores encontrados
        </Typography>
      </Box>

      {/* Asesor Grid/List */}
      {filteredAsesores.length === 0 ? (
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
            {hasActiveFilters ? 'Intenta con otros criterios de busqueda' : 'No hay asesores registrados en Google Sheets'}
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
        <Grid container spacing={{ xs: 1.5, md: 2 }}>
          {filteredAsesores.map((asesor) => (
            <Grid item xs={12} sm={6} md={4} key={asesor.id}>
              <AsesorCard
                asesor={asesor}
                onViewProducts={onViewProducts}
                onContact={onContact}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {filteredAsesores.map((asesor) => (
            <AsesorCard
              key={asesor.id}
              asesor={asesor}
              onViewProducts={onViewProducts}
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
    <Grid container spacing={{ xs: 1.5, md: 2 }}>
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
