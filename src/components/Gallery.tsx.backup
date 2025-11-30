import { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  alpha,
  Chip,
  useTheme,
} from '@mui/material';
import { Gem, Search, Package, CheckCircle, Clock, ShoppingBag, Filter, LayoutGrid } from 'lucide-react';
import EmeraldCard from './EmeraldCard';
import { useEmeralds } from '../hooks/useEmeralds';
import { EmeraldStatus, EmeraldCategory } from '../types';
import {
  brand,
  gradients,
  radius,
  animation,
  getTokens,
  getShadows,
  getHeaderStyles,
} from '../design-system';

export default function Gallery() {
  const theme = useTheme();
  const mode = theme.palette.mode;
  const tokens = getTokens(mode);
  const shadows = getShadows(mode);
  const headerStyle = getHeaderStyles(mode);
  const brandColor = tokens.interactive.primary;

  const { emeralds, deleteEmerald, updateStatus, totalCount, availableCount } = useEmeralds();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EmeraldStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<EmeraldCategory | 'all'>('all');

  const filteredEmeralds = emeralds.filter(emerald => {
    const matchesSearch = emerald.name.toLowerCase().includes(search.toLowerCase()) ||
      emerald.aiDescription?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || emerald.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || emerald.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar esta esmeralda?')) {
      deleteEmerald(id);
    }
  };

  // Calculate stats
  const soldCount = emeralds.filter(e => e.status === 'sold').length;
  const reservedCount = emeralds.filter(e => e.status === 'reserved').length;
  const availabilityPercent = totalCount > 0 ? (availableCount / totalCount) * 100 : 0;

  if (totalCount === 0) {
    return (
      <Box sx={{ maxWidth: 960, mx: 'auto' }}>
        {/* TM Studio Header - Empty State */}
        <Paper
          elevation={0}
          sx={{
            mb: 4,
            borderRadius: radius.xl,
            background: headerStyle.background,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: shadows.lg,
          }}
        >
          {/* Emerald accent line */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: headerStyle.accentLine,
            }}
          />
          <Box sx={{ p: 3, pt: 3.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: radius.lg,
                  bgcolor: alpha(headerStyle.brandColor, 0.15),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${alpha(headerStyle.brandColor, 0.3)}`,
                }}
              >
                <Gem size={26} color={headerStyle.brandColor} />
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: headerStyle.brandColor,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    mb: 0.25,
                  }}
                >
                  TM STUDIO
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: headerStyle.titleColor, letterSpacing: '-0.01em' }}>
                  Galería de Esmeraldas
                </Typography>
                <Typography variant="body2" sx={{ color: headerStyle.subtitleColor, fontWeight: 400 }}>
                  Tu colección de joyas colombianas
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Empty State */}
        <Paper
          elevation={0}
          sx={{
            p: 6,
            borderRadius: radius.xl,
            border: `2px dashed ${tokens.border.default}`,
            bgcolor: tokens.background.surface,
            textAlign: 'center',
            boxShadow: shadows.card,
          }}
        >
          <Box
            sx={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              bgcolor: alpha(brandColor, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <Gem size={48} color={brandColor} style={{ opacity: 0.6 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: tokens.text.primary, mb: 1 }}>
            No hay esmeraldas en la galería
          </Typography>
          <Typography variant="body1" sx={{ color: tokens.text.secondary, mb: 3 }}>
            Ve a la pestaña "Subir" para agregar tu primera esmeralda
          </Typography>
          <Chip
            label="Comenzar a subir"
            sx={{
              bgcolor: brandColor,
              color: '#FFFFFF',
              fontWeight: 600,
              px: 2,
              py: 2.5,
              fontSize: '0.875rem',
              '&:hover': {
                bgcolor: tokens.interactive.primaryHover,
              },
            }}
          />
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* TM Studio Header */}
      <Paper
        elevation={0}
        sx={{
          mb: 4,
          borderRadius: radius.xl,
          background: headerStyle.background,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: shadows.lg,
        }}
      >
        {/* Emerald accent line */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: headerStyle.accentLine,
          }}
        />
        <Box sx={{ p: 3, pt: 3.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: radius.lg,
                  bgcolor: alpha(headerStyle.brandColor, 0.15),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${alpha(headerStyle.brandColor, 0.3)}`,
                }}
              >
                <Gem size={26} color={headerStyle.brandColor} />
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: headerStyle.brandColor,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    mb: 0.25,
                  }}
                >
                  TM STUDIO
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: headerStyle.titleColor, letterSpacing: '-0.01em' }}>
                  Galería de Esmeraldas
                </Typography>
                <Typography variant="body2" sx={{ color: headerStyle.subtitleColor, fontWeight: 400 }}>
                  Tu colección de joyas colombianas
                </Typography>
              </Box>
            </Box>

            {/* Quick Stats in Header */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box
                sx={{
                  px: 2.5,
                  py: 1.5,
                  borderRadius: radius.md,
                  bgcolor: alpha('#FFFFFF', 0.1),
                  border: `1px solid ${alpha('#FFFFFF', 0.15)}`,
                  textAlign: 'center',
                  minWidth: 80,
                }}
              >
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', lineHeight: 1, fontFamily: 'monospace' }}>
                  {totalCount}
                </Typography>
                <Typography sx={{ fontSize: '0.65rem', color: alpha('#FFFFFF', 0.7), fontWeight: 500 }}>
                  Total
                </Typography>
              </Box>
              <Box
                sx={{
                  px: 2.5,
                  py: 1.5,
                  borderRadius: radius.md,
                  bgcolor: alpha('#FFFFFF', 0.2),
                  border: `1px solid ${alpha('#FFFFFF', 0.25)}`,
                  textAlign: 'center',
                  minWidth: 80,
                }}
              >
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: headerStyle.brandColor, lineHeight: 1, fontFamily: 'monospace' }}>
                  {availableCount}
                </Typography>
                <Typography sx={{ fontSize: '0.65rem', color: alpha('#FFFFFF', 0.7), fontWeight: 500 }}>
                  Disponibles
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Availability Progress */}
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
              <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.7), fontWeight: 500 }}>
                Inventario disponible
              </Typography>
              <Typography variant="caption" sx={{ color: headerStyle.brandColor, fontWeight: 700 }}>
                {availabilityPercent.toFixed(0)}%
              </Typography>
            </Box>
            <Box
              sx={{
                height: 6,
                borderRadius: radius.full,
                bgcolor: alpha('#FFFFFF', 0.15),
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  height: '100%',
                  width: `${availabilityPercent}%`,
                  borderRadius: radius.full,
                  background: gradients.emerald,
                  transition: 'width 0.3s ease',
                }}
              />
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 4 }}>
        {/* Total */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: radius.lg,
            bgcolor: tokens.background.surface,
            border: `1px solid ${tokens.border.card}`,
            boxShadow: shadows.card,
            transition: animation.transition.default,
            '&:hover': {
              boxShadow: shadows.cardHover,
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: radius.md,
                bgcolor: alpha(tokens.text.muted, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LayoutGrid size={18} color={tokens.text.muted} />
            </Box>
            <Typography variant="body2" sx={{ color: tokens.text.secondary, fontWeight: 500 }}>
              Total
            </Typography>
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: tokens.text.primary, fontFamily: 'monospace' }}>
            {totalCount}
          </Typography>
        </Paper>

        {/* Available */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: radius.lg,
            bgcolor: alpha(brandColor, 0.06),
            border: `1px solid ${alpha(brandColor, 0.2)}`,
            boxShadow: shadows.card,
            transition: animation.transition.default,
            '&:hover': {
              boxShadow: shadows.cardHover,
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: radius.md,
                bgcolor: alpha(brandColor, 0.15),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle size={18} color={brandColor} />
            </Box>
            <Typography variant="body2" sx={{ color: brandColor, fontWeight: 500 }}>
              Disponibles
            </Typography>
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: brandColor, fontFamily: 'monospace' }}>
            {availableCount}
          </Typography>
        </Paper>

        {/* Reserved */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: radius.lg,
            bgcolor: alpha(brand.gold[500], 0.06),
            border: `1px solid ${alpha(brand.gold[500], 0.2)}`,
            boxShadow: shadows.card,
            transition: animation.transition.default,
            '&:hover': {
              boxShadow: shadows.cardHover,
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: radius.md,
                bgcolor: alpha(brand.gold[500], 0.15),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={18} color={brand.gold[500]} />
            </Box>
            <Typography variant="body2" sx={{ color: tokens.text.gold, fontWeight: 500 }}>
              Reservados
            </Typography>
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: tokens.text.gold, fontFamily: 'monospace' }}>
            {reservedCount}
          </Typography>
        </Paper>

        {/* Sold */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: radius.lg,
            bgcolor: tokens.background.muted,
            border: `1px solid ${tokens.border.light}`,
            boxShadow: shadows.card,
            transition: animation.transition.default,
            '&:hover': {
              boxShadow: shadows.cardHover,
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: radius.md,
                bgcolor: alpha(tokens.text.muted, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShoppingBag size={18} color={tokens.text.muted} />
            </Box>
            <Typography variant="body2" sx={{ color: tokens.text.muted, fontWeight: 500 }}>
              Vendidos
            </Typography>
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: tokens.text.secondary, fontFamily: 'monospace' }}>
            {soldCount}
          </Typography>
        </Paper>
      </Box>

      {/* Filters Section */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 4,
          borderRadius: radius.lg,
          bgcolor: tokens.background.surface,
          border: `1px solid ${tokens.border.card}`,
          boxShadow: shadows.card,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Filter size={18} color={tokens.text.muted} />
          <Typography variant="body1" sx={{ fontWeight: 600, color: tokens.text.primary }}>
            Filtros
          </Typography>
          {(statusFilter !== 'all' || categoryFilter !== 'all' || search) && (
            <Chip
              label="Limpiar"
              size="small"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setCategoryFilter('all');
              }}
              sx={{
                height: 24,
                fontSize: '0.6875rem',
                fontWeight: 600,
                bgcolor: tokens.status.errorBg,
                color: tokens.status.error,
                cursor: 'pointer',
                '&:hover': { bgcolor: alpha(tokens.status.error, 0.15) },
              }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{
              minWidth: 280,
              '& .MuiOutlinedInput-root': {
                borderRadius: radius.md,
                bgcolor: tokens.background.muted,
                '& fieldset': { borderColor: tokens.border.default },
                '&:hover fieldset': { borderColor: brandColor },
                '&.Mui-focused fieldset': { borderColor: brandColor },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} color={tokens.text.muted} />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Estado</InputLabel>
            <Select
              value={statusFilter}
              label="Estado"
              onChange={(e) => setStatusFilter(e.target.value as EmeraldStatus | 'all')}
              sx={{
                borderRadius: radius.md,
                bgcolor: tokens.background.muted,
                '& fieldset': { borderColor: tokens.border.default },
                '&:hover fieldset': { borderColor: brandColor },
                '&.Mui-focused fieldset': { borderColor: brandColor },
              }}
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="available">Disponible</MenuItem>
              <MenuItem value="reserved">Reservado</MenuItem>
              <MenuItem value="sold">Vendido</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Categoría</InputLabel>
            <Select
              value={categoryFilter}
              label="Categoría"
              onChange={(e) => setCategoryFilter(e.target.value as EmeraldCategory | 'all')}
              sx={{
                borderRadius: radius.md,
                bgcolor: tokens.background.muted,
                '& fieldset': { borderColor: tokens.border.default },
                '&:hover fieldset': { borderColor: brandColor },
                '&.Mui-focused fieldset': { borderColor: brandColor },
              }}
            >
              <MenuItem value="all">Todas</MenuItem>
              <MenuItem value="loose">Suelta</MenuItem>
              <MenuItem value="ring">Anillo</MenuItem>
              <MenuItem value="pendant">Dije</MenuItem>
              <MenuItem value="earrings">Aretes</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Results Count */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="body2" sx={{ color: tokens.text.secondary, fontWeight: 500 }}>
          Mostrando <strong style={{ color: tokens.text.primary }}>{filteredEmeralds.length}</strong> de {totalCount} esmeraldas
        </Typography>
      </Box>

      {/* Grid */}
      <Grid container spacing={3}>
        {filteredEmeralds.map((emerald) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={emerald.id}>
            <EmeraldCard
              emerald={emerald}
              onDelete={handleDelete}
              onStatusChange={updateStatus}
            />
          </Grid>
        ))}
      </Grid>

      {filteredEmeralds.length === 0 && totalCount > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: radius.lg,
            textAlign: 'center',
            bgcolor: tokens.background.muted,
            border: `1px solid ${tokens.border.default}`,
            boxShadow: shadows.card,
          }}
        >
          <Package size={48} color={tokens.text.muted} style={{ marginBottom: 16, opacity: 0.5 }} />
          <Typography variant="h6" sx={{ color: tokens.text.secondary, mb: 1 }}>
            Sin resultados
          </Typography>
          <Typography variant="body2" sx={{ color: tokens.text.muted }}>
            No se encontraron esmeraldas con los filtros seleccionados
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
