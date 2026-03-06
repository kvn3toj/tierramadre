// Ambassador Directory Component
// Browse and filter embajadores from Google Sheets (only role=Embajador*)

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
  Users,
  Package,
  Gem,
  DollarSign,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAsesores, Asesor } from '../../hooks/useAsesores';
import { useTreasure } from '../../hooks/useTreasure';
import AsesorCard from './AsesorCard';
import { StatItem } from './StatItem';
import {
  emeraldCore,
  accentColors,
  applyGlass,
  glassEmerald,
  glassLight,
  glassDark,
} from '../../design-system/index';
import { fadeInUp, staggerContainer, staggerItem } from '../../design-system/tokens/motion';

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
}: AmbassadorDirectoryProps) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('products');

  // Load treasure and asesores from Google Sheets
  const { treasure } = useTreasure();
  const { asesores, isLoading, error } = useAsesores(treasure);

  // Only show people whose role contains "Embajador" on the directory page
  const embajadores = useMemo(() => {
    return asesores.filter(a =>
      (a.role || '').toLowerCase().includes('embajador')
    );
  }, [asesores]);

  // Calculate aggregate stats
  const stats = useMemo(() => {
    const totalProducts = embajadores.reduce((sum, a) => sum + (a.productCount || 0), 0);
    const totalValue = embajadores.reduce((sum, a) => {
      if (!a.products) return sum;
      return sum + a.products
        .filter(p => p.estado === 'DISPONIBLE')
        .reduce((pSum, p) => pSum + (p.precioCOP || 0), 0);
    }, 0);
    const activeEmbajadores = embajadores.filter(a => (a.productCount || 0) > 0).length;
    const looseCount = embajadores.reduce((sum, a) => {
      if (!a.products) return sum;
      return sum + a.products.filter(p => !p.isJewelry).length;
    }, 0);

    return { totalProducts, totalValue, activeEmbajadores, looseCount };
  }, [embajadores]);

  // Filter and sort embajadores
  const filteredAsesores = useMemo(() => {
    let result = [...embajadores];

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
  }, [embajadores, searchQuery, sortBy, maxVisible]);

  const hasActiveFilters = !!searchQuery;

  const clearFilters = () => {
    setSearchQuery('');
  };

  // Loading state
  if (isLoading) {
    return (
      <Box>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={24} sx={{ color: emeraldCore.primary }} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Cargando embajadores...
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
        <Alert severity="warning" sx={{ mb: 2 }}>
          No se pudieron cargar los embajadores. Recarga la p&aacute;gina para intentar de nuevo.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Stats Bar */}
      <motion.div
        variants={fadeInUp}
        initial="initial"
        animate="animate"
      >
        <Box
          sx={{
            mb: 3,
            p: 2,
            borderRadius: 3,
            ...applyGlass(isLight ? glassEmerald.light : glassEmerald.dark),
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: { xs: 0.5, md: 1 },
          }}
        >
          <StatItem
            icon={<Users size={18} />}
            value={stats.activeEmbajadores.toString()}
            label="Embajadores activos"
            color={emeraldCore.primary}
            variant="stacked"
          />
          <StatItem
            icon={<Package size={18} />}
            value={stats.totalProducts.toString()}
            label="Productos totales"
            color={accentColors.info.light}
            variant="stacked"
          />
          <StatItem
            icon={<Gem size={18} />}
            value={stats.looseCount.toString()}
            label="Gemas"
            color={accentColors.purple.light}
            variant="stacked"
          />
          <StatItem
            icon={<DollarSign size={18} />}
            value={formatValue(stats.totalValue)}
            label="Valor disponible"
            color={accentColors.warning.light}
            variant="stacked"
          />
        </Box>
      </motion.div>

      {/* Search and View Toggle */}
      {showFilters && (
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              mb: 2,
            }}
          >
            <TextField
              fullWidth
              placeholder="Buscar embajador por nombre..."
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
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: emeraldCore.primary,
                  },
                },
              }}
            />

            <Box sx={{ display: 'flex', gap: 1 }}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_, value) => value && setViewMode(value)}
                size="small"
              >
                <ToggleButton value="grid" aria-label="Vista cuadrícula">
                  <Grid3X3 size={18} />
                </ToggleButton>
                <ToggleButton value="list" aria-label="Vista lista">
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
        </Box>
      )}

      {/* Results Count */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography
          variant="overline"
          sx={{
            color: 'text.secondary',
            letterSpacing: '0.1em',
            fontSize: '0.7rem',
          }}
        >
          {filteredAsesores.length} embajadores encontrados
        </Typography>
      </Box>

      {/* Asesor Grid/List */}
      {filteredAsesores.length === 0 ? (
        <motion.div
          variants={fadeInUp}
          initial="initial"
          animate="animate"
        >
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              px: 4,
              borderRadius: 3,
              ...applyGlass(isLight ? glassLight.ultraThin : glassDark.ultraThin),
            }}
          >
            <Gem size={48} style={{ color: emeraldCore.light, marginBottom: 16 }} />
            <Typography
              variant="h6"
              sx={{ mb: 1, color: 'text.secondary' }}
            >
              No se encontraron embajadores
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              {hasActiveFilters ? 'Intenta con otros criterios de b\u00fasqueda' : 'No hay embajadores registrados'}
            </Typography>
            {hasActiveFilters && (
              <Button
                variant="outlined"
                onClick={clearFilters}
                sx={{
                  textTransform: 'none',
                  borderColor: emeraldCore.primary,
                  color: emeraldCore.primary,
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </Box>
        </motion.div>
      ) : viewMode === 'grid' ? (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <Grid container spacing={{ xs: 1.5, md: 2 }}>
            {filteredAsesores.map((asesor) => (
              <Grid item xs={12} sm={6} md={4} key={asesor.id}>
                <motion.div variants={staggerItem}>
                  <AsesorCard
                    asesor={asesor}
                    onViewProducts={onViewProducts}
                    onContact={onContact}
                  />
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </motion.div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {filteredAsesores.map((asesor) => (
              <motion.div key={asesor.id} variants={staggerItem}>
                <AsesorCard
                  asesor={asesor}
                  onViewProducts={onViewProducts}
                  onContact={onContact}
                />
              </motion.div>
            ))}
          </Box>
        </motion.div>
      )}
    </Box>
  );
}

// Loading Skeleton
export function AmbassadorDirectorySkeleton() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <Grid container spacing={{ xs: 1.5, md: 2 }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Grid item xs={12} sm={6} md={4} key={i}>
            <motion.div variants={staggerItem}>
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Skeleton variant="circular" width={56} height={56} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="40%" />
                  </Box>
                </Box>
                <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 2, mb: 2 }} />
                <Box sx={{ display: 'flex', gap: 0.5, mb: 2 }}>
                  {[1, 2, 3].map(j => (
                    <Skeleton key={j} variant="rectangular" width={52} height={52} sx={{ borderRadius: 2 }} />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Skeleton variant="rectangular" height={36} sx={{ flex: 1, borderRadius: 1 }} />
                  <Skeleton variant="rectangular" height={36} width={80} sx={{ borderRadius: 1 }} />
                </Box>
              </Box>
            </motion.div>
          </Grid>
        ))}
      </Grid>
    </motion.div>
  );
}

// Format currency value
function formatValue(value: number): string {
  if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(1)}B`;
  }
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${Math.round(value / 1000)}K`;
  }
  return `$${value.toLocaleString('es-CO')}`;
}
