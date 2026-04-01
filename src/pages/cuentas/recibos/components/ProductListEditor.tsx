/**
 * ProductListEditor Component
 * Add/remove products using Treasure inventory selector or manual entry.
 * Includes undo-based deletion (Gerhardt-Powals forgiveness pattern).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Snackbar,
  alpha,
} from '@mui/material';
import { Plus, Trash2, Package, PenLine, Layers, Undo2 } from 'lucide-react';
import { ReceiptProduct, TreasureItem } from '../../../../types';
import { surfacesLight, semanticColors } from '../../../../design-system/tokens/colors';
import { primitiveColors, cssTransition } from '../../../../design-system';
import { TreasureProductSelector } from '../../../../components/cotizacion/form/TreasureProductSelector';
import { ProductThumbnail } from '../../../../components/cotizacion/form/ProductListSection';
import { useCotizacionFormat } from '../../../../hooks/useCotizacion';
import { formatCarats } from '../../../../utils/formatting';

interface ProductListEditorProps {
  availableTreasure: TreasureItem[];
  selectedItem: TreasureItem | null;
  setSelectedItem: (item: TreasureItem | null) => void;
  manualProduct: Partial<ReceiptProduct>;
  setManualProduct: (product: Partial<ReceiptProduct>) => void;
  products: ReceiptProduct[];
  onAddFromTreasure: () => void;
  onAddManual: () => void;
  onRemoveProduct: (productId: string) => void;
}

const UNDO_TIMEOUT_MS = 5000;

export const ProductListEditor: React.FC<ProductListEditorProps> = ({
  availableTreasure,
  selectedItem,
  setSelectedItem,
  manualProduct,
  setManualProduct,
  products,
  onAddFromTreasure,
  onAddManual,
  onRemoveProduct,
}) => {
  const { formatPrice } = useCotizacionFormat();
  const [entryMode, setEntryMode] = useState<'treasure' | 'manual'>('treasure');

  // Undo-based deletion
  const [pendingRemoval, setPendingRemoval] = useState<{ id: string; name: string } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleDelete = useCallback((productId: string, productName: string) => {
    if (pendingRemoval) {
      onRemoveProduct(pendingRemoval.id);
    }
    setPendingRemoval({ id: productId, name: productName });
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      onRemoveProduct(productId);
      setPendingRemoval(null);
    }, UNDO_TIMEOUT_MS);
  }, [onRemoveProduct, pendingRemoval]);

  const handleUndo = useCallback(() => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setPendingRemoval(null);
  }, []);

  const handleSnackbarClose = useCallback(() => {
    if (pendingRemoval) {
      onRemoveProduct(pendingRemoval.id);
      setPendingRemoval(null);
    }
  }, [pendingRemoval, onRemoveProduct]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const getPesoLabel = (product: ReceiptProduct): string => {
    if (product.isJewelry) return product.metalType || 'Joya';
    if (product.peso != null) {
      return typeof product.peso === 'number' ? `${formatCarats(product.peso)} ct` : String(product.peso);
    }
    if (product.weightCarats) return `${formatCarats(product.weightCarats)} ct`;
    return '';
  };

  return (
    <Box>
      {/* Section Header */}
      <Typography variant="subtitle2" sx={{ color: 'grey.400', mb: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
        Agregar Producto
      </Typography>

      {/* Entry Mode Toggle */}
      <ToggleButtonGroup
        value={entryMode}
        exclusive
        onChange={(_, v) => v && setEntryMode(v)}
        size="small"
        sx={{ mb: 2, width: '100%' }}
      >
        <ToggleButton
          value="treasure"
          sx={{
            flex: 1,
            textTransform: 'none',
            fontWeight: 600,
            gap: 0.5,
            '&.Mui-selected': {
              bgcolor: alpha(primitiveColors.emerald[600], 0.1),
              color: primitiveColors.emerald[600],
              borderColor: primitiveColors.emerald[600],
            },
          }}
        >
          <Package size={16} /> Inventario
        </ToggleButton>
        <ToggleButton
          value="manual"
          sx={{
            flex: 1,
            textTransform: 'none',
            fontWeight: 600,
            gap: 0.5,
            '&.Mui-selected': {
              bgcolor: alpha(primitiveColors.emerald[600], 0.1),
              color: primitiveColors.emerald[600],
              borderColor: primitiveColors.emerald[600],
            },
          }}
        >
          <PenLine size={16} /> Manual
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Treasure Selector Mode */}
      {entryMode === 'treasure' && (
        <TreasureProductSelector
          availableTreasure={availableTreasure}
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
          handleAddProduct={onAddFromTreasure}
        />
      )}

      {/* Manual Entry Mode */}
      {entryMode === 'manual' && (
        <Grid container spacing={{ xs: 1.5, md: 2 }} sx={{ mb: 2 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Nombre del Producto"
              value={manualProduct.name || ''}
              onChange={(e) => setManualProduct({ ...manualProduct, name: e.target.value })}
              size="small"
              placeholder="Ej: Esmeralda CLEOPATRA"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Descripcion (opcional)"
              value={manualProduct.description || ''}
              onChange={(e) => setManualProduct({ ...manualProduct, description: e.target.value })}
              size="small"
              placeholder="Ej: Corte octagonal, color verde intenso"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Quilates"
              type="number"
              value={manualProduct.weightCarats || ''}
              onChange={(e) => setManualProduct({ ...manualProduct, weightCarats: parseFloat(e.target.value) || undefined })}
              size="small"
              InputProps={{ endAdornment: <InputAdornment position="end">ct</InputAdornment> }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Precio COP"
              type="number"
              value={manualProduct.precioCOP || ''}
              onChange={(e) => setManualProduct({ ...manualProduct, precioCOP: parseFloat(e.target.value) || 0 })}
              size="small"
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Plus size={18} />}
              onClick={onAddManual}
              disabled={!manualProduct.name || !manualProduct.precioCOP}
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
              Agregar Producto Manual
            </Button>
          </Grid>
        </Grid>
      )}

      {/* Product List with Thumbnails */}
      {products.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Layers size={16} color={primitiveColors.emerald[600]} />
            <Typography variant="subtitle2" sx={{ color: surfacesLight.text.primary, fontWeight: 700 }}>
              Productos ({products.length})
            </Typography>
          </Box>
          {products.map((product) => (
            <Box
              key={product.id}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 1.5,
                px: 1.5,
                mb: 1,
                bgcolor: surfacesLight.background.tertiary,
                borderRadius: 1.5,
                border: `1px solid ${surfacesLight.border.light}`,
                opacity: pendingRemoval?.id === product.id ? 0.4 : 1,
                transition: cssTransition.default,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <ProductThumbnail
                  src={product.imagen}
                  isJewelry={product.isJewelry || false}
                  size={44}
                />
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {product.itemNumber ? `#${product.itemNumber} - ` : ''}{product.name}
                  </Typography>
                  <Typography variant="caption" color="grey.500">
                    {getPesoLabel(product)}
                    {product.color ? ` \u2022 ${product.color}` : ''}
                    {product.isManual ? ' \u2022 Manual' : ''}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ color: primitiveColors.emerald[600], fontWeight: 700 }}>
                  {formatPrice(product.precioCOP)}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => handleDelete(product.id, product.name)}
                  disabled={pendingRemoval?.id === product.id}
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

      {/* Undo Snackbar */}
      <Snackbar
        open={!!pendingRemoval}
        autoHideDuration={UNDO_TIMEOUT_MS}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        message={`${pendingRemoval?.name || 'Producto'} eliminado`}
        action={
          <Button
            size="small"
            onClick={handleUndo}
            sx={{ color: primitiveColors.emerald[600], fontWeight: 700, textTransform: 'none' }}
            startIcon={<Undo2 size={14} />}
          >
            Deshacer
          </Button>
        }
      />
    </Box>
  );
};

export default ProductListEditor;
