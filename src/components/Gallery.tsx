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
  useTheme,
} from '@mui/material';
import { Search as SearchIcon, Diamond as DiamondIcon } from '@mui/icons-material';
import EmeraldCard from './EmeraldCard';
import { useEmeralds } from '../hooks/useEmeralds';
import { EmeraldStatus, EmeraldCategory } from '../types';
import { brandColors } from '../theme';
import { useThemeMode } from '../context/ThemeContext';

export default function Gallery() {
  const { emeralds, deleteEmerald, updateStatus, totalCount, availableCount } = useEmeralds();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EmeraldStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<EmeraldCategory | 'all'>('all');
  const { mode } = useThemeMode();
  const theme = useTheme();
  const isLight = mode === 'light';

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

  if (totalCount === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          gap: 2,
        }}
      >
        <DiamondIcon sx={{ fontSize: 80, color: brandColors.emeraldGreen, opacity: 0.5 }} />
        <Typography variant="h5" color="grey.500">
          No hay esmeraldas en la galería
        </Typography>
        <Typography variant="body2" color="grey.600">
          Ve a la pestaña "Subir" para agregar tu primera esmeralda
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Stats */}
      <Paper sx={{
        p: 2.5,
        mb: 3,
        bgcolor: isLight ? '#F9FAFB' : '#1C1C1E',
        border: `1px solid ${isLight ? '#E5E7EB' : '#2C2C2E'}`
      }}>
        <Box sx={{ display: 'flex', gap: 4 }}>
          <Box>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
              Total
            </Typography>
            <Typography variant="h5" sx={{ color: theme.palette.text.primary, fontWeight: 600 }}>
              {totalCount}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
              Disponibles
            </Typography>
            <Typography variant="h5" sx={{ color: brandColors.emeraldGreen, fontWeight: 600 }}>
              {availableCount}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ minWidth: 250 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Estado</InputLabel>
          <Select
            value={statusFilter}
            label="Estado"
            onChange={(e) => setStatusFilter(e.target.value as EmeraldStatus | 'all')}
          >
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="available">Disponible</MenuItem>
            <MenuItem value="reserved">Reservado</MenuItem>
            <MenuItem value="sold">Vendido</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Categoría</InputLabel>
          <Select
            value={categoryFilter}
            label="Categoría"
            onChange={(e) => setCategoryFilter(e.target.value as EmeraldCategory | 'all')}
          >
            <MenuItem value="all">Todas</MenuItem>
            <MenuItem value="loose">Suelta</MenuItem>
            <MenuItem value="ring">Anillo</MenuItem>
            <MenuItem value="pendant">Dije</MenuItem>
            <MenuItem value="earrings">Aretes</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Results count */}
      <Typography variant="body2" color="grey.500" sx={{ mb: 2 }}>
        Mostrando {filteredEmeralds.length} de {totalCount} esmeraldas
      </Typography>

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
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="grey.500">
            No se encontraron esmeraldas con los filtros seleccionados
          </Typography>
        </Box>
      )}
    </Box>
  );
}
