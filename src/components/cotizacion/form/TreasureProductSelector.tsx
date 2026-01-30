/**
 * TreasureProductSelector Component
 * Autocomplete selector for adding products from the treasure inventory.
 */

import React from 'react';
import {
  Autocomplete,
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  Chip,
  alpha,
} from '@mui/material';
import { Plus, Gem, ShoppingBag } from 'lucide-react';
import { brandColors } from '../constants';
import { formatCotizacionCurrency, getPesoDisplay } from '../../../hooks/useCotizacion';
import type { TreasureProductSelectorProps } from '../types';

const formatCurrency = formatCotizacionCurrency;

export const TreasureProductSelector: React.FC<TreasureProductSelectorProps> = ({
  availableTreasure,
  selectedItem,
  setSelectedItem,
  handleAddProduct,
}) => (
  <>
    <Autocomplete
      size="small"
      options={availableTreasure}
      getOptionLabel={(option) => `#${option.item} - ${option.nombre}`}
      value={selectedItem}
      onChange={(_, item) => setSelectedItem(item)}
      filterOptions={(options, { inputValue }) => {
        const term = inputValue.toLowerCase();
        return options.filter(
          (o) =>
            o.nombre.toLowerCase().includes(term) ||
            o.item.toString().includes(term) ||
            o.color.toLowerCase().includes(term)
        );
      }}
      renderOption={(props, option) => (
        <Box
          component="li"
          {...props}
          sx={{ display: 'flex', gap: 1.5, alignItems: 'center', py: 1 }}
        >
          <Avatar
            src={option.imagen}
            variant="rounded"
            sx={{ width: 48, height: 48, bgcolor: brandColors.lightGray }}
          >
            {option.isJewelry ? <ShoppingBag size={20} /> : <Gem size={20} />}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight={600}>
              #{option.item} - {option.nombre}
            </Typography>
            <Typography variant="caption" color="grey.500">
              {getPesoDisplay(option)} • {option.color} • {option.talla}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography
              variant="body2"
              sx={{ color: brandColors.emerald, fontWeight: 700 }}
            >
              {formatCurrency(option.precioCOP)}
            </Typography>
            <Chip
              label={option.isJewelry ? 'Joya' : 'Gema'}
              size="small"
              sx={{
                fontSize: '0.65rem',
                height: 20,
                bgcolor: option.isJewelry
                  ? alpha(brandColors.gold, 0.15)
                  : alpha(brandColors.emerald, 0.15),
                color: option.isJewelry ? brandColors.gold : brandColors.emerald,
              }}
            />
          </Box>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Buscar en inventario"
          placeholder="Nombre, numero, color..."
        />
      )}
      noOptionsText="No hay productos disponibles"
      sx={{ mb: 2 }}
    />
    <Button
      fullWidth
      variant="contained"
      startIcon={<Plus size={18} />}
      onClick={handleAddProduct}
      disabled={!selectedItem}
      sx={{
        bgcolor: brandColors.emerald,
        color: brandColors.white,
        textTransform: 'none',
        fontWeight: 600,
        py: 1.5,
        borderRadius: 2,
        mb: 3,
        boxShadow: selectedItem
          ? `0 4px 12px ${alpha(brandColors.emerald, 0.3)}`
          : 'none',
        '&:hover': {
          bgcolor: brandColors.emeraldDark,
          boxShadow: `0 6px 16px ${alpha(brandColors.emerald, 0.4)}`,
        },
        '&:disabled': {
          bgcolor: brandColors.borderSubtle,
          color: brandColors.textMuted,
        },
      }}
    >
      Agregar del Inventario
    </Button>
  </>
);

export default TreasureProductSelector;
