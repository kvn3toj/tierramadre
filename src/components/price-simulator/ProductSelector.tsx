/**
 * ProductSelector Component
 * Handles product selection from gallery or inventory for price simulation.
 * Extracted from PriceSimulator.tsx for better modularity.
 */

import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Paper,
  Chip,
  Divider,
  IconButton,
  Autocomplete,
  Avatar,
  alpha,
} from '@mui/material';
import {
  Gem,
  FileText,
  Image,
  ShoppingBag,
  Layers,
  X,
  RotateCcw,
} from 'lucide-react';
import { Emerald, InventoryItem } from '../../types';
import { studioColors, studioShadows, accentColors } from '../../design-system';
import { semanticColors, goldAccent, surfacesLight } from '../../design-system/tokens/colors';
import { formatFullCurrency as formatCurrency } from '../../utils/formatting';
import { getCategoryLabel, ProductSource, STATUS_FILTERS, PRODUCT_TYPE_FILTERS } from './index';

// Use design system accent color for purple elements (multi-select, lot badges)
const PURPLE_ACCENT = accentColors.purple.light;

// =============================================================================
// TYPES
// =============================================================================

export interface ProductSelectorProps {
  productSource: ProductSource;
  setProductSource: (source: ProductSource) => void;
  multiSelectMode: boolean;
  toggleMultiSelectMode: () => void;
  emeralds: Emerald[];
  filteredInventory: InventoryItem[];
  productName: string;
  setProductName: (name: string) => void;
  selectedEmerald: Emerald | null;
  selectedInventoryItem: InventoryItem | null;
  handleEmeraldSelect: (emerald: Emerald | null) => void;
  handleInventorySelect: (item: InventoryItem | null) => void;
  selectedProducts: (Emerald | InventoryItem)[];
  totalProductsValue: number;
  removeProduct: (product: Emerald | InventoryItem) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  productTypeFilter: string;
  setProductTypeFilter: (filter: string) => void;
  shapeFilter: string;
  setShapeFilter: (filter: string) => void;
  uniqueShapes: string[];
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ProductSelector: React.FC<ProductSelectorProps> = ({
  productSource,
  setProductSource,
  multiSelectMode,
  toggleMultiSelectMode,
  emeralds,
  filteredInventory,
  productName,
  setProductName,
  selectedEmerald,
  selectedInventoryItem,
  handleEmeraldSelect,
  handleInventorySelect,
  selectedProducts,
  totalProductsValue,
  removeProduct,
  statusFilter,
  setStatusFilter,
  productTypeFilter,
  setProductTypeFilter,
  shapeFilter,
  setShapeFilter,
  uniqueShapes,
}) => (
  <Box sx={{ mb: 3 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <FileText size={18} color={studioColors.emerald} />
        <Typography variant="body2" sx={{ fontWeight: 600, color: studioColors.emerald }}>
          Nombre del Producto
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <SourceChip
          icon={<Image size={12} />}
          label={`Galeria (${emeralds.length})`}
          active={productSource === 'gallery'}
          onClick={() => setProductSource('gallery')}
        />
        <SourceChip
          icon={<ShoppingBag size={12} />}
          label={`Inventario (${filteredInventory.length})`}
          active={productSource === 'inventory'}
          onClick={() => setProductSource('inventory')}
        />
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: studioColors.border }} />
        <Chip
          icon={<Layers size={12} />}
          label="Multi-seleccion"
          size="small"
          onClick={toggleMultiSelectMode}
          sx={{
            height: 22,
            fontSize: '0.625rem',
            fontWeight: 500,
            bgcolor: multiSelectMode ? PURPLE_ACCENT : alpha(PURPLE_ACCENT, 0.1),
            color: multiSelectMode ? surfacesLight.text.primary : PURPLE_ACCENT,
            cursor: 'pointer',
            border: '1px solid',
            borderColor: multiSelectMode ? PURPLE_ACCENT : alpha(PURPLE_ACCENT, 0.3),
            '& .MuiChip-icon': { color: multiSelectMode ? surfacesLight.text.primary : PURPLE_ACCENT },
            '&:hover': {
              bgcolor: multiSelectMode ? PURPLE_ACCENT : alpha(PURPLE_ACCENT, 0.2),
              borderColor: PURPLE_ACCENT,
            },
          }}
        />
      </Box>
    </Box>

    {/* Gallery Autocomplete */}
    {productSource === 'gallery' && (
      <GalleryAutocomplete
        emeralds={emeralds}
        selectedEmerald={selectedEmerald}
        productName={productName}
        setProductName={setProductName}
        handleEmeraldSelect={handleEmeraldSelect}
      />
    )}

    {/* Inventory Autocomplete */}
    {productSource === 'inventory' && (
      <InventoryAutocomplete
        filteredInventory={filteredInventory}
        selectedInventoryItem={selectedInventoryItem}
        productName={productName}
        setProductName={setProductName}
        handleInventorySelect={handleInventorySelect}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        productTypeFilter={productTypeFilter}
        setProductTypeFilter={setProductTypeFilter}
        shapeFilter={shapeFilter}
        setShapeFilter={setShapeFilter}
        uniqueShapes={uniqueShapes}
      />
    )}

    {/* Selected Product Badges */}
    {selectedEmerald && !multiSelectMode && (
      <SelectedBadge
        type="gallery"
        label="Seleccionado de galeria"
        imageUrl={selectedEmerald.imageUrl}
        onClear={() => {
          handleEmeraldSelect(null);
          setProductName('');
        }}
      />
    )}

    {selectedInventoryItem && !multiSelectMode && (
      <SelectedBadge
        type="inventory"
        label={`Seleccionado de inventario #${selectedInventoryItem.item}`}
        onClear={() => {
          handleInventorySelect(null);
          setProductName('');
        }}
      />
    )}

    {/* Multi-Select Collection Display */}
    {multiSelectMode && selectedProducts.length > 0 && (
      <CollectionDisplay
        selectedProducts={selectedProducts}
        totalProductsValue={totalProductsValue}
        removeProduct={removeProduct}
      />
    )}
  </Box>
);

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface SourceChipProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

const SourceChip: React.FC<SourceChipProps> = ({ icon, label, active, onClick }) => (
  <Chip
    icon={icon as React.ReactElement}
    label={label}
    size="small"
    onClick={onClick}
    sx={{
      height: 22,
      fontSize: '0.625rem',
      fontWeight: 500,
      bgcolor: active ? studioColors.emerald : alpha(studioColors.emerald, 0.1),
      color: active ? surfacesLight.background.primary : studioColors.emerald,
      cursor: 'pointer',
      '& .MuiChip-icon': { color: active ? surfacesLight.background.primary : studioColors.emerald },
      '&:hover': {
        bgcolor: active ? studioColors.emerald : alpha(studioColors.emerald, 0.2),
      },
    }}
  />
);

// Gallery autocomplete
interface GalleryAutocompleteProps {
  emeralds: Emerald[];
  selectedEmerald: Emerald | null;
  productName: string;
  setProductName: (name: string) => void;
  handleEmeraldSelect: (emerald: Emerald | null) => void;
}

const GalleryAutocomplete: React.FC<GalleryAutocompleteProps> = ({
  emeralds,
  selectedEmerald,
  productName,
  setProductName,
  handleEmeraldSelect,
}) => (
  <Autocomplete
    freeSolo
    options={emeralds}
    value={selectedEmerald}
    inputValue={productName}
    onInputChange={(_, newValue) => setProductName(newValue)}
    onChange={(_, newValue) => {
      if (typeof newValue === 'string') {
        setProductName(newValue);
      } else {
        handleEmeraldSelect(newValue);
      }
    }}
    getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
    renderOption={(props, option) => (
      <Box
        component="li"
        {...props}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          py: 1,
          '&:hover': { bgcolor: alpha(studioColors.emerald, 0.06) },
        }}
      >
        <Avatar
          src={option.imageUrl}
          variant="rounded"
          sx={{ width: 40, height: 40, borderRadius: 1.5 }}
        >
          <Gem size={20} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: studioColors.textPrimary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {option.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ color: studioColors.textSecondary }}>
              {getCategoryLabel(option.category)}
            </Typography>
            {option.weightCarats && (
              <Typography variant="caption" sx={{ color: studioColors.emerald, fontWeight: 500 }}>
                {option.weightCarats} ct
              </Typography>
            )}
            {option.priceCOP && option.priceCOP > 0 && (
              <Typography variant="caption" sx={{ color: semanticColors.info.main, fontWeight: 500 }}>
                {formatCurrency(option.priceCOP)}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    )}
    renderInput={(params) => (
      <TextField
        {...params}
        size="small"
        placeholder={emeralds.length > 0 ? "Escribe o selecciona de la galeria..." : "Ej: Anillo Esmeralda Colombiana 2.5ct"}
        sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: studioColors.surface,
            fontSize: '0.875rem',
            '& fieldset': { borderColor: studioColors.border },
            '&:hover fieldset': { borderColor: alpha(studioColors.emerald, 0.5) },
            '&.Mui-focused fieldset': { borderColor: studioColors.emerald, borderWidth: 2 },
          },
        }}
      />
    )}
    PaperComponent={(props) => (
      <Paper
        {...props}
        sx={{
          mt: 0.5,
          boxShadow: studioShadows.lg,
          border: `1px solid ${studioColors.border}`,
          borderRadius: 2,
        }}
      />
    )}
    noOptionsText={
      <Box sx={{ py: 2, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: studioColors.textSecondary }}>
          No hay esmeraldas en la galeria
        </Typography>
        <Typography variant="caption" sx={{ color: studioColors.textMuted }}>
          Agrega esmeraldas en la seccion "Subir"
        </Typography>
      </Box>
    }
  />
);

// Inventory autocomplete with filters
interface InventoryAutocompleteProps {
  filteredInventory: InventoryItem[];
  selectedInventoryItem: InventoryItem | null;
  productName: string;
  setProductName: (name: string) => void;
  handleInventorySelect: (item: InventoryItem | null) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  productTypeFilter: string;
  setProductTypeFilter: (filter: string) => void;
  shapeFilter: string;
  setShapeFilter: (filter: string) => void;
  uniqueShapes: string[];
}

const InventoryAutocomplete: React.FC<InventoryAutocompleteProps> = ({
  filteredInventory,
  selectedInventoryItem,
  productName,
  setProductName,
  handleInventorySelect,
  statusFilter,
  setStatusFilter,
  productTypeFilter,
  setProductTypeFilter,
  shapeFilter,
  setShapeFilter,
  uniqueShapes,
}) => (
  <>
    {/* Status Filter */}
    <FilterSection label="Estado">
      {STATUS_FILTERS.map((status: string) => (
        <FilterChip
          key={status}
          label={status.charAt(0).toUpperCase() + status.slice(1)}
          active={statusFilter === status}
          onClick={() => setStatusFilter(status)}
        />
      ))}
    </FilterSection>

    {/* Product Type Filter */}
    <FilterSection label="Tipo">
      {PRODUCT_TYPE_FILTERS.map((type: { value: string; label: string }) => (
        <FilterChip
          key={type.value}
          label={type.label}
          active={productTypeFilter === type.value}
          onClick={() => setProductTypeFilter(type.value)}
          variant="secondary"
        />
      ))}
    </FilterSection>

    {/* Shape Filter */}
    <FilterSection label="Talla">
      {uniqueShapes.map(shape => (
        <FilterChip
          key={shape}
          label={shape === 'all' ? 'Todas' : shape}
          active={shapeFilter === shape}
          onClick={() => setShapeFilter(shape)}
          variant="secondary"
          small
        />
      ))}
    </FilterSection>

    <Autocomplete
      freeSolo
      options={filteredInventory}
      value={selectedInventoryItem}
      inputValue={productName}
      onInputChange={(_, newValue) => setProductName(newValue)}
      onChange={(_, newValue) => {
        if (typeof newValue === 'string') {
          setProductName(newValue);
        } else {
          handleInventorySelect(newValue);
        }
      }}
      getOptionLabel={(option) => typeof option === 'string' ? option : `${option.nombre} - ${option.item}`}
      renderOption={(props, option) => (
        <Box
          component="li"
          {...props}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            py: 1,
            '&:hover': { bgcolor: alpha(studioColors.emerald, 0.06) },
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              bgcolor: alpha(studioColors.emerald, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: studioColors.emerald,
            }}
          >
            <Gem size={20} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: studioColors.textPrimary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {option.nombre}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="caption" sx={{ color: studioColors.textSecondary }}>
                #{option.item}
              </Typography>
              {option.isJewelry && option.metalType && (
                <Chip
                  label={option.metalType}
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: '0.6rem',
                    bgcolor: alpha(goldAccent.primary, 0.1),
                    color: goldAccent.primary,
                  }}
                />
              )}
              {!option.isJewelry && option.cantidad > 1 && (
                <Chip
                  label={`Lote x${option.cantidad}`}
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: '0.6rem',
                    bgcolor: alpha(PURPLE_ACCENT, 0.1),
                    color: PURPLE_ACCENT,
                    fontWeight: 600,
                  }}
                />
              )}
              {!option.isJewelry && typeof option.peso === 'number' && (
                <Typography variant="caption" sx={{ color: studioColors.emerald, fontWeight: 500 }}>
                  {option.peso} ct
                </Typography>
              )}
              {option.precioCOP && option.precioCOP > 0 && (
                <Typography variant="caption" sx={{ color: semanticColors.info.main, fontWeight: 500 }}>
                  {formatCurrency(option.precioCOP)}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          placeholder="Busca en inventario por nombre o numero..."
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: studioColors.surface,
              fontSize: '0.875rem',
              '& fieldset': { borderColor: studioColors.border },
              '&:hover fieldset': { borderColor: alpha(studioColors.emerald, 0.5) },
              '&.Mui-focused fieldset': { borderColor: studioColors.emerald, borderWidth: 2 },
            },
          }}
        />
      )}
      PaperComponent={(props) => (
        <Paper
          {...props}
          sx={{
            mt: 0.5,
            boxShadow: studioShadows.lg,
            border: `1px solid ${studioColors.border}`,
            borderRadius: 2,
          }}
        />
      )}
      noOptionsText={
        <Box sx={{ py: 2, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: studioColors.textSecondary }}>
            No hay productos disponibles en inventario
          </Typography>
        </Box>
      }
    />
  </>
);

// Filter section wrapper
const FilterSection: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <Box sx={{ mb: 1.5 }}>
    <Typography variant="caption" sx={{ color: studioColors.textSecondary, fontWeight: 600, mb: 0.75, display: 'block' }}>
      {label}
    </Typography>
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      {children}
    </Box>
  </Box>
);

// Filter chip
interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  small?: boolean;
}

const FilterChip: React.FC<FilterChipProps> = ({ label, active, onClick, variant = 'primary', small }) => (
  <Chip
    label={label}
    size="small"
    onClick={onClick}
    sx={{
      height: small ? 24 : 26,
      fontSize: small ? '0.6875rem' : '0.75rem',
      fontWeight: variant === 'primary' ? 600 : 500,
      bgcolor: active
        ? (variant === 'primary' ? studioColors.emerald : alpha(studioColors.emerald, 0.15))
        : alpha(studioColors.emerald, variant === 'primary' ? 0.08 : 0.05),
      color: active
        ? (variant === 'primary' ? surfacesLight.background.primary : studioColors.emerald)
        : studioColors.textSecondary,
      border: '1px solid',
      borderColor: active ? studioColors.emerald : 'transparent',
      cursor: 'pointer',
      '&:hover': {
        bgcolor: active
          ? studioColors.emerald
          : alpha(studioColors.emerald, 0.15),
        borderColor: studioColors.emerald,
      },
    }}
  />
);

// Selected badge
interface SelectedBadgeProps {
  type: 'gallery' | 'inventory';
  label: string;
  imageUrl?: string;
  onClear: () => void;
}

const SelectedBadge: React.FC<SelectedBadgeProps> = ({ type, label, imageUrl, onClear }) => {
  const color = type === 'gallery' ? studioColors.emerald : semanticColors.info.main;
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        mt: 1,
        p: 1,
        bgcolor: alpha(color, 0.06),
        borderRadius: 1.5,
        border: `1px solid ${alpha(color, 0.2)}`,
      }}
    >
      {imageUrl ? (
        <Avatar src={imageUrl} variant="rounded" sx={{ width: 32, height: 32, borderRadius: 1 }} />
      ) : (
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1,
            bgcolor: alpha(color, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
          }}
        >
          <ShoppingBag size={16} />
        </Box>
      )}
      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" sx={{ color, fontWeight: 600 }}>
          {label}
        </Typography>
      </Box>
      <IconButton
        size="small"
        onClick={onClear}
        sx={{ color: studioColors.textMuted, '&:hover': { color: semanticColors.error.main } }}
      >
        <RotateCcw size={14} />
      </IconButton>
    </Box>
  );
};

// Collection display
interface CollectionDisplayProps {
  selectedProducts: (Emerald | InventoryItem)[];
  totalProductsValue: number;
  removeProduct: (product: Emerald | InventoryItem) => void;
}

const CollectionDisplay: React.FC<CollectionDisplayProps> = ({
  selectedProducts,
  totalProductsValue,
  removeProduct,
}) => (
  <Box
    sx={{
      mt: 2,
      p: 2,
      bgcolor: alpha(PURPLE_ACCENT, 0.04),
      borderRadius: 2,
      border: `1px solid ${alpha(PURPLE_ACCENT, 0.2)}`,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Layers size={16} color={PURPLE_ACCENT} />
        <Typography variant="body2" sx={{ fontWeight: 600, color: PURPLE_ACCENT }}>
          Coleccion ({selectedProducts.length} productos)
        </Typography>
      </Box>
      <Typography variant="caption" sx={{ color: PURPLE_ACCENT, fontWeight: 600 }}>
        {formatCurrency(totalProductsValue)}
      </Typography>
    </Box>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {selectedProducts.map((product) => {
        const isInventory = 'item' in product;
        const productId = isInventory ? product.item : product.id;
        const productName = isInventory ? product.nombre : product.name;
        const productPrice = ('priceCOP' in product ? product.priceCOP : 0) || 0;

        return (
          <Box
            key={productId}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1,
              bgcolor: alpha(surfacesLight.background.primary, 0.8),
              borderRadius: 1,
              border: `1px solid ${alpha(PURPLE_ACCENT, 0.1)}`,
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: studioColors.textPrimary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block',
                }}
              >
                {productName}
              </Typography>
              <Typography variant="caption" sx={{ color: PURPLE_ACCENT, fontWeight: 500 }}>
                {formatCurrency(productPrice)}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => removeProduct(product)}
              sx={{
                color: studioColors.textMuted,
                '&:hover': { color: semanticColors.error.main, bgcolor: alpha(semanticColors.error.main, 0.1) },
              }}
            >
              <X size={14} />
            </IconButton>
          </Box>
        );
      })}
    </Box>
  </Box>
);

export default ProductSelector;
