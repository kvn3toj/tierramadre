// Ambassador Directory Component
// Premium editorial directory for Tierra Madre embajadores

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
  alpha,
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
import { useLanguage } from '../../contexts/LanguageContext';
import { useAsesores, Asesor } from '../../hooks/useAsesores';
import { useTreasure } from '../../hooks/useTreasure';
import AsesorCard from './AsesorCard';
import {
  emeraldCore,
  goldAccent,
  accentColors,
  fontFamilies,
  cssTransition,
  surfacesLight,
  surfacesDark,
} from '../../design-system/index';
import { fadeInUp, staggerContainer, staggerItem } from '../../design-system/tokens/motion';
import { iosSemanticColors } from '../../design-system/tokens/ios-semantic';
import { useReducedMotion } from '../../hooks/useReducedMotion';

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
  const { t } = useLanguage();
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const prefersReducedMotion = useReducedMotion();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('products');

  const { treasure } = useTreasure();
  const { asesores, isLoading, error } = useAsesores(treasure);

  const embajadores = useMemo(() => {
    return asesores.filter(a =>
      (a.role || '').toLowerCase().includes('embajador')
    );
  }, [asesores]);

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

  const filteredAsesores = useMemo(() => {
    let result = [...embajadores];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.name.toLowerCase().includes(query)
      );
    }

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

    if (maxVisible) {
      result = result.slice(0, maxVisible);
    }

    return result;
  }, [embajadores, searchQuery, sortBy, maxVisible]);

  const hasActiveFilters = !!searchQuery;

  const clearFilters = () => {
    setSearchQuery('');
  };

  if (isLoading) {
    return (
      <Box>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={18} aria-label={t.loading.general} sx={{ color: goldAccent.primary }} />
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontFamily: fontFamilies.mono,
              fontSize: '0.7rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {t.loading.ambassadors}
          </Typography>
        </Box>
        <AmbassadorDirectorySkeleton isLight={isLight} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          {t.ambassador.loadError}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Stats Row */}
      <motion.div
        variants={fadeInUp}
        initial={prefersReducedMotion ? false : "initial"}
        animate="animate"
      >
        <Box
          sx={{
            mb: 3.5,
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 0,
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: isLight
              ? alpha(goldAccent.primary, 0.12)
              : alpha(goldAccent.primary, 0.08),
            bgcolor: isLight ? alpha('#fff', 0.6) : alpha('#fff', 0.015),
          }}
        >
          <StatCard
            icon={<Users size={15} strokeWidth={1.5} />}
            value={stats.activeEmbajadores.toString()}
            label={t.ambassador.activeAmbassadors}
            isLight={isLight}
            accentColor={emeraldCore.primary}
          />
          <StatCard
            icon={<Package size={15} strokeWidth={1.5} />}
            value={stats.totalProducts.toString()}
            label={t.ambassador.totalProducts}
            isLight={isLight}
            accentColor={accentColors.info.light}
            hasDivider
          />
          <StatCard
            icon={<Gem size={15} strokeWidth={1.5} />}
            value={stats.looseCount.toString()}
            label={t.ambassador.looseGems}
            isLight={isLight}
            accentColor={isLight ? accentColors.purple.light : accentColors.purple.dark}
            hasDivider
          />
          <StatCard
            icon={<DollarSign size={15} strokeWidth={1.5} />}
            value={formatValue(stats.totalValue)}
            label={t.ambassador.availableValue}
            isLight={isLight}
            accentColor={goldAccent.primary}
            hasDivider
          />
        </Box>
      </motion.div>

      {/* Search & Controls */}
      {showFilters && (
        <motion.div
          variants={fadeInUp}
          initial={prefersReducedMotion ? false : "initial"}
          animate="animate"
        >
          <Box
            sx={{
              mb: 3,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1.5,
              alignItems: { sm: 'center' },
            }}
          >
            <TextField
              fullWidth
              placeholder={t.ambassador.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={15} strokeWidth={1.5} style={{ opacity: 0.35 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2.5,
                  bgcolor: isLight ? alpha('#000', 0.015) : alpha('#fff', 0.025),
                  fontSize: '0.82rem',
                  letterSpacing: '0.01em',
                  '& fieldset': {
                    borderColor: isLight
                      ? alpha('#000', 0.07)
                      : alpha('#fff', 0.07),
                    transition: cssTransition.default,
                  },
                  '&:hover fieldset': {
                    borderColor: isLight
                      ? alpha('#000', 0.12)
                      : alpha('#fff', 0.12),
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: alpha(goldAccent.primary, 0.4),
                    borderWidth: '1px !important',
                  },
                },
              }}
            />

            <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_, value) => value && setViewMode(value)}
                size="small"
                sx={{
                  '& .MuiToggleButtonGroup-grouped': {
                    border: '1px solid',
                    borderColor: isLight ? alpha('#000', 0.07) : alpha('#fff', 0.07),
                    '&:not(:first-of-type)': {
                      borderLeft: '1px solid',
                      borderColor: isLight ? alpha('#000', 0.07) : alpha('#fff', 0.07),
                    },
                  },
                  '& .MuiToggleButton-root': {
                    color: isLight ? alpha('#000', 0.35) : alpha('#fff', 0.35),
                    px: 1.25,
                    transition: cssTransition.default,
                    '&.Mui-selected': {
                      bgcolor: isLight ? alpha(emeraldCore.primary, 0.07) : alpha(emeraldCore.primary, 0.12),
                      color: emeraldCore.primary,
                      '&:hover': {
                        bgcolor: isLight ? alpha(emeraldCore.primary, 0.1) : alpha(emeraldCore.primary, 0.15),
                      },
                    },
                    '&:hover': {
                      bgcolor: isLight ? alpha('#000', 0.03) : alpha('#fff', 0.03),
                    },
                  },
                }}
              >
                <ToggleButton value="grid" aria-label={t.ambassador.gridView}>
                  <Grid3X3 size={15} strokeWidth={1.5} />
                </ToggleButton>
                <ToggleButton value="list" aria-label={t.ambassador.listView}>
                  <List size={15} strokeWidth={1.5} />
                </ToggleButton>
              </ToggleButtonGroup>

              <ToggleButtonGroup
                value={sortBy}
                exclusive
                onChange={(_, value) => value && setSortBy(value)}
                size="small"
                sx={{
                  '& .MuiToggleButtonGroup-grouped': {
                    border: '1px solid',
                    borderColor: isLight ? alpha('#000', 0.07) : alpha('#fff', 0.07),
                    '&:not(:first-of-type)': {
                      borderLeft: '1px solid',
                      borderColor: isLight ? alpha('#000', 0.07) : alpha('#fff', 0.07),
                    },
                  },
                  '& .MuiToggleButton-root': {
                    textTransform: 'none',
                    px: 1.75,
                    fontSize: '0.72rem',
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                    color: isLight ? alpha('#000', 0.45) : alpha('#fff', 0.45),
                    transition: cssTransition.default,
                    '&.Mui-selected': {
                      bgcolor: isLight ? alpha(emeraldCore.primary, 0.07) : alpha(emeraldCore.primary, 0.12),
                      color: emeraldCore.primary,
                      fontWeight: 600,
                      '&:hover': {
                        bgcolor: isLight ? alpha(emeraldCore.primary, 0.1) : alpha(emeraldCore.primary, 0.15),
                      },
                    },
                    '&:hover': {
                      bgcolor: isLight ? alpha('#000', 0.03) : alpha('#fff', 0.03),
                    },
                  },
                }}
              >
                <ToggleButton value="products">
                  {t.ambassador.sortByProducts}
                </ToggleButton>
                <ToggleButton value="name">
                  {t.ambassador.sortByName}
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>
        </motion.div>
      )}

      {/* Results Count */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 16,
            height: '1px',
            bgcolor: isLight ? alpha(goldAccent.primary, 0.3) : alpha(goldAccent.primary, 0.2),
          }}
        />
        <Typography
          variant="overline"
          sx={{
            color: 'text.secondary',
            letterSpacing: '0.15em',
            fontSize: '0.6rem',
            fontWeight: 500,
          }}
        >
          {filteredAsesores.length} {t.ambassador.ambassadorsFound}
        </Typography>
      </Box>

      {/* Ambassador Grid/List */}
      {filteredAsesores.length === 0 ? (
        <motion.div
          variants={fadeInUp}
          initial={prefersReducedMotion ? false : "initial"}
          animate="animate"
        >
          <Box
            sx={{
              textAlign: 'center',
              py: 10,
              px: 4,
              borderRadius: 3,
              border: '1px solid',
              borderColor: isLight ? alpha('#000', 0.05) : alpha('#fff', 0.05),
            }}
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                border: '1px solid',
                borderColor: alpha(goldAccent.primary, 0.2),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2.5,
              }}
            >
              <Gem size={24} strokeWidth={1} style={{ color: alpha(goldAccent.primary, 0.5) }} />
            </Box>
            <Typography
              sx={{
                mb: 0.75,
                color: 'text.secondary',
                fontWeight: 500,
                fontSize: '1rem',
              }}
            >
              {t.ambassador.noResults}
            </Typography>
            <Typography sx={{ color: 'text.secondary', mb: 3, fontSize: '0.78rem', opacity: 0.7 }}>
              {hasActiveFilters ? t.ambassador.tryOtherCriteria : t.ambassador.noAmbassadors}
            </Typography>
            {hasActiveFilters && (
              <Button
                variant="outlined"
                onClick={clearFilters}
                sx={{
                  textTransform: 'none',
                  borderColor: alpha(goldAccent.primary, 0.25),
                  color: isLight ? goldAccent.dark : goldAccent.light,
                  fontSize: '0.78rem',
                  fontWeight: 500,
                  px: 3,
                  py: 0.75,
                  borderRadius: 2,
                  '&:hover': {
                    borderColor: goldAccent.primary,
                    bgcolor: alpha(goldAccent.primary, 0.04),
                  },
                }}
              >
                {t.ambassador.clearFilters}
              </Button>
            )}
          </Box>
        </motion.div>
      ) : viewMode === 'grid' ? (
        <motion.div
          variants={staggerContainer}
          initial={prefersReducedMotion ? false : "initial"}
          animate="animate"
        >
          <Grid container spacing={{ xs: 2, md: 2.5 }}>
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
          initial={prefersReducedMotion ? false : "initial"}
          animate="animate"
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {filteredAsesores.map((asesor) => (
              <motion.div key={asesor.id} variants={staggerItem}>
                <AsesorCard
                  asesor={asesor}
                  onViewProducts={onViewProducts}
                  onContact={onContact}
                  variant="list"
                />
              </motion.div>
            ))}
          </Box>
        </motion.div>
      )}
    </Box>
  );
}

// Refined stat card for the hero section
function StatCard({
  icon,
  value,
  label,
  isLight,
  accentColor,
  hasDivider,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  isLight: boolean;
  accentColor: string;
  hasDivider?: boolean;
}) {
  const isZero = value === '0' || value === '$0';

  return (
    <Box
      sx={{
        py: { xs: 2, md: 2.5 },
        px: { xs: 1.5, md: 2.5 },
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        opacity: isZero ? 0.45 : 1,
        transition: cssTransition.default,
        position: 'relative',
        ...(hasDivider && {
          '&::before': {
            content: '""',
            position: 'absolute',
            top: { xs: 0, md: '20%' },
            left: { xs: 0, md: 0 },
            width: { xs: '100%', md: '1px' },
            height: { xs: '1px', md: '60%' },
            bgcolor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
          },
        }),
        '&:hover': {
          bgcolor: isLight ? alpha(accentColor, 0.025) : alpha(accentColor, 0.04),
        },
      }}
    >
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha(accentColor, 0.07),
          color: accentColor,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="p"
          sx={{
            fontFamily: fontFamilies.mono,
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 600,
            fontSize: { xs: '1rem', md: '1.1rem' },
            lineHeight: 1.1,
            color: accentColor,
            letterSpacing: '-0.01em',
          }}
        >
          {value}
        </Typography>
        <Typography
          sx={{
            color: isLight ? iosSemanticColors.secondaryLabel.light : iosSemanticColors.secondaryLabel.dark,
            fontSize: '0.6rem',
            letterSpacing: '-0.01em',
            mt: 0.25,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </Typography>
      </Box>
    </Box>
  );
}

// Refined shimmer skeleton
export function AmbassadorDirectorySkeleton({ isLight = false }: { isLight?: boolean }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <Grid container spacing={{ xs: 2, md: 2.5 }}>
        {[1, 2, 3].map((i) => (
          <Grid item xs={12} sm={6} md={4} key={i}>
            <motion.div variants={staggerItem}>
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: isLight ? alpha('#000', 0.05) : alpha('#fff', 0.05),
                  bgcolor: isLight ? '#fff' : alpha('#fff', 0.02),
                  overflow: 'hidden',
                  position: 'relative',
                  // Shimmer overlay
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background: isLight
                      ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)'
                      : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
                    animation: 'shimmer 2s infinite',
                    '@keyframes shimmer': {
                      '0%': { left: '-100%' },
                      '100%': { left: '100%' },
                    },
                  },
                }}
              >
                <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
                  <Skeleton
                    variant="circular"
                    width={64}
                    height={64}
                    sx={{ bgcolor: isLight ? alpha('#000', 0.04) : alpha('#fff', 0.04) }}
                  />
                  <Box sx={{ flex: 1, pt: 0.5 }}>
                    <Skeleton variant="text" width="75%" sx={{ mb: 0.75, bgcolor: isLight ? alpha('#000', 0.05) : alpha('#fff', 0.04) }} />
                    <Skeleton variant="rounded" width={80} height={18} sx={{ borderRadius: 0.75, bgcolor: isLight ? alpha('#000', 0.03) : alpha('#fff', 0.03) }} />
                  </Box>
                </Box>
                <Skeleton variant="rounded" height={44} sx={{ borderRadius: 2, mb: 2, bgcolor: isLight ? alpha('#000', 0.03) : alpha('#fff', 0.03) }} />
                <Box sx={{ display: 'flex', gap: 0.75, mb: 2.5 }}>
                  {[1, 2, 3, 4].map(j => (
                    <Skeleton key={j} variant="rounded" width={56} height={56} sx={{ borderRadius: 2, bgcolor: isLight ? alpha('#000', 0.04) : alpha('#fff', 0.03) }} />
                  ))}
                </Box>
                <Skeleton variant="rounded" height={36} sx={{ borderRadius: 2, bgcolor: isLight ? alpha('#000', 0.04) : alpha('#fff', 0.04) }} />
              </Box>
            </motion.div>
          </Grid>
        ))}
      </Grid>
    </motion.div>
  );
}

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
