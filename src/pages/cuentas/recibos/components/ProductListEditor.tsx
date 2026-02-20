/**
 * ProductListEditor Component
 * Add/remove products with emerald selector from gallery.
 */

import React from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Autocomplete,
  Avatar,
  Chip,
  alpha,
} from '@mui/material';
import { Plus, Trash2 } from 'lucide-react';
import { ReceiptProduct, Emerald } from '../../../../types';
import { surfacesLight, semanticColors } from '../../../../design-system/tokens/colors';
import { primitiveColors } from '../../../../design-system';
import { formatCurrency } from '../constants/receiptThemes';

interface ProductListEditorProps {
  emeralds: Emerald[];
  selectedEmerald: Emerald | null;
  setSelectedEmerald: (emerald: Emerald | null) => void;
  newProduct: Partial<ReceiptProduct>;
  setNewProduct: (product: Partial<ReceiptProduct>) => void;
  products: ReceiptProduct[];
  onAddProduct: () => void;
  onRemoveProduct: (productId: string) => void;
}

export const ProductListEditor: React.FC<ProductListEditorProps> = ({
  emeralds,
  selectedEmerald,
  setSelectedEmerald,
  newProduct,
  setNewProduct,
  products,
  onAddProduct,
  onRemoveProduct,
}) => {
  return (
    <Box>
      {/* Add Product Section */}
      <Typography variant="subtitle2" sx={{ color: 'grey.400', mb: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
        Agregar Producto
      </Typography>

      {/* Emerald Selector from Gallery */}
      {emeralds.length > 0 && (
        <Autocomplete
          size="small"
          options={emeralds.filter(e => e.status === 'available')}
          getOptionLabel={(option) => option.name}
          value={selectedEmerald}
          onChange={(_, emerald) => {
            setSelectedEmerald(emerald);
            if (emerald) {
              const priceUSD = emerald.priceCOP ? Math.round(emerald.priceCOP / 4000) : 0;
              setNewProduct({
                name: emerald.name,
                description: emerald.aiDescription || '',
                weightCarats: emerald.weightCarats,
                priceUSD: priceUSD,
              });
            }
          }}
          renderOption={(props, option) => (
            <Box component="li" {...props} sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <Avatar
                src={option.mediaData}
                variant="rounded"
                sx={{ width: 40, height: 40 }}
              />
              <Box>
                <Typography variant="body2" fontWeight={500}>
                  {option.name}
                </Typography>
                <Typography variant="caption" color="grey.500">
                  {option.weightCarats ? `${option.weightCarats} ct` : 'Sin peso'}
                  {option.priceCOP ? ` • $${Math.round(option.priceCOP / 4000).toLocaleString()} USD` : ''}
                </Typography>
              </Box>
              <Chip
                label={option.category}
                size="small"
                sx={{ ml: 'auto', fontSize: '0.7rem' }}
              />
            </Box>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Seleccionar de Galería"
              placeholder="Buscar esmeralda..."
              sx={{ mb: 2 }}
            />
          )}
          noOptionsText="No hay esmeraldas disponibles"
          sx={{ mb: 1 }}
        />
      )}

      {emeralds.length === 0 && (
        <Typography variant="caption" color="grey.500" sx={{ display: 'block', mb: 2 }}>
          No hay esmeraldas en la galería. Puedes agregar productos manualmente.
        </Typography>
      )}

      {/* Product Form */}
      <Grid container spacing={{ xs: 1.5, md: 2 }} sx={{ mb: 2 }}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Nombre de la Esmeralda"
            value={newProduct.name || ''}
            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
            size="small"
            placeholder="Ej: Esmeralda CLEOPATRA"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Descripción (opcional)"
            value={newProduct.description || ''}
            onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
            size="small"
            placeholder="Ej: Corte octagonal, color verde intenso"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Quilates"
            type="number"
            value={newProduct.weightCarats || ''}
            onChange={(e) => setNewProduct({ ...newProduct, weightCarats: parseFloat(e.target.value) || undefined })}
            size="small"
            InputProps={{
              endAdornment: <InputAdornment position="end">ct</InputAdornment>,
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Precio USD"
            type="number"
            value={newProduct.priceUSD || ''}
            onChange={(e) => setNewProduct({ ...newProduct, priceUSD: parseFloat(e.target.value) || 0 })}
            size="small"
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<Plus size={18} />}
            onClick={onAddProduct}
            disabled={!newProduct.name || !newProduct.priceUSD}
            sx={{
              borderColor: primitiveColors.emerald[600],
              color: primitiveColors.emerald[600],
              textTransform: 'none',
              fontWeight: 600,
              py: 1.25,
              borderRadius: 2,
              '&:hover': {
                borderColor: primitiveColors.emerald[700],
                bgcolor: alpha(primitiveColors.emerald[600], 0.05),
              },
            }}
          >
            Agregar Producto
          </Button>
        </Grid>
      </Grid>

      {/* Product List */}
      {products.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ color: 'grey.400', mb: 1 }}>
            Productos ({products.length})
          </Typography>
          {products.map((product) => (
            <Box
              key={product.id}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 1,
                borderBottom: '1px solid',
                borderColor: 'grey.800',
              }}
            >
              <Box>
                <Typography variant="body2">{product.name}</Typography>
                {product.weightCarats && (
                  <Typography variant="caption" color="grey.500">
                    {product.weightCarats} ct
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ color: primitiveColors.emerald[600], fontWeight: 600 }}>
                  {formatCurrency(product.priceUSD)}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => onRemoveProduct(product.id)}
                  sx={{
                    color: surfacesLight.text.tertiary,
                    '&:hover': { color: semanticColors.error.main, bgcolor: alpha(semanticColors.error.main, 0.1) },
                  }}
                >
                  <Trash2 size={16} />
                </IconButton>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default ProductListEditor;
