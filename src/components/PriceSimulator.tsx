/**
 * PriceSimulator Component
 * Main price calculation tool for emerald products.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Paper,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Collapse,
  Autocomplete,
  Avatar,
  alpha,
} from '@mui/material';
import {
  Gem,
  Plus,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Info,
  FileText,
  Image,
  ShoppingBag,
  Layers,
  X,
} from 'lucide-react';

import { useEmeralds } from '../hooks/useEmeralds';
import { usePriceCalculation } from '../hooks/usePriceCalculation';
import { Emerald, InventoryItem } from '../types';
import { inventoryData } from '../data/inventory';
import { studioColors, studioShadows, studioCardStyles } from '../design-system';
import { formatFullCurrency as formatCurrency } from '../utils/formatting';

// Extracted components
import {
  PriceSimulatorHeader,
  FactorSlider,
  PricingResults,
  FormulaInfo,
  getInvestmentIcon,
  getCategoryLabel,
  ProductSource,
  STATUS_FILTERS,
  PRODUCT_TYPE_FILTERS,
} from './price-simulator';

export default function PriceSimulator() {
  const navigate = useNavigate();

  // Get emeralds from gallery
  const { emeralds } = useEmeralds();

  // Pricing calculation hook
  const {
    investments,
    updateInvestment,
    customItems,
    updateCustomItem,
    addCustomItem,
    selectedProducts,
    addProduct,
    removeProduct,
    clearProducts,
    totalProductsValue,
    priceFactor,
    setPriceFactor,
    currentTier,
    caratWeight,
    setCaratWeight,
    totalInvestment: hookTotalInvestment,
    pricingMetrics,
    marginProgress,
    resetAll,
  } = usePriceCalculation({ initialFactor: 1.9 });

  // Selected product from gallery or inventory (UI state)
  const [selectedEmerald, setSelectedEmerald] = useState<Emerald | null>(null);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [productSource, setProductSource] = useState<ProductSource>('gallery');

  // Multi-select mode for collections (enabled by default)
  const [multiSelectMode, setMultiSelectMode] = useState(true);

  // Inventory filters
  const [statusFilter, setStatusFilter] = useState<string>('todas');
  const [productTypeFilter, setProductTypeFilter] = useState<string>('todas');
  const [shapeFilter, setShapeFilter] = useState<string>('all');

  // UI-only state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [productName, setProductName] = useState('');

  // Filter inventory by status
  const statusFilteredInventory = useMemo(() => {
    if (statusFilter === 'todas') return inventoryData;
    if (statusFilter === 'disponibles') return inventoryData.filter(item => item.estado === 'DISPONIBLE');
    if (statusFilter === 'vendidas') return inventoryData.filter(item => item.estado === 'VENDIDA');
    return inventoryData;
  }, [statusFilter]);

  // Filter by product type
  const typeFilteredInventory = useMemo(() => {
    if (productTypeFilter === 'todas') return statusFilteredInventory;
    if (productTypeFilter === 'gemas') return statusFilteredInventory.filter(item => !item.isJewelry && item.cantidad === 1);
    if (productTypeFilter === 'joyas') return statusFilteredInventory.filter(item => item.isJewelry);
    if (productTypeFilter === 'lotes') return statusFilteredInventory.filter(item => !item.isJewelry && item.cantidad > 1);
    return statusFilteredInventory;
  }, [statusFilteredInventory, productTypeFilter]);

  // Get unique shapes from type-filtered inventory
  const uniqueShapes = useMemo(() => {
    const shapes = new Set(typeFilteredInventory.map(item => item.talla).filter(Boolean));
    return ['all', ...Array.from(shapes).sort()];
  }, [typeFilteredInventory]);

  // Filter inventory by shape
  const filteredInventory = useMemo(() => {
    if (shapeFilter === 'all') return typeFilteredInventory;
    return typeFilteredInventory.filter(item => item.talla === shapeFilter);
  }, [typeFilteredInventory, shapeFilter]);

  // Total investment adjusted for multiSelectMode
  const totalInvestment = multiSelectMode ? hookTotalInvestment : (hookTotalInvestment - totalProductsValue);

  // Reset handler that also clears local UI state
  const resetValues = () => {
    resetAll();
    setProductName('');
    setSelectedEmerald(null);
  };

  // Handle emerald selection from gallery
  const handleEmeraldSelect = (emerald: Emerald | null) => {
    if (multiSelectMode && emerald) {
      addProduct(emerald);
      setProductName('');
      setSelectedEmerald(null);
    } else {
      setSelectedEmerald(emerald);
      setSelectedInventoryItem(null);
      setProductSource('gallery');
      if (emerald) {
        setProductName(emerald.name);
        if (emerald.priceCOP && emerald.priceCOP > 0) {
          updateInvestment('emerald', emerald.priceCOP);
        }
        if (emerald.weightCarats) {
          setCaratWeight(emerald.weightCarats);
        }
      }
    }
  };

  // Handle inventory selection
  const handleInventorySelect = (item: InventoryItem | null) => {
    if (multiSelectMode && item) {
      addProduct(item);
      setProductName('');
      setSelectedInventoryItem(null);
    } else {
      setSelectedInventoryItem(item);
      setSelectedEmerald(null);
      setProductSource('inventory');
      if (item) {
        setProductName(item.nombre);
        const price = typeof item.precioCOP === 'number' ? item.precioCOP :
                     (item.precioCOP ? Number(item.precioCOP) : 0);
        if (price > 0) {
          updateInvestment('emerald', price);
        }
        if (typeof item.peso === 'number') {
          setCaratWeight(item.peso);
        } else if (typeof item.peso === 'string' && !item.isJewelry) {
          const parsedWeight = parseFloat(item.peso.replace(',', '.'));
          if (!isNaN(parsedWeight)) {
            setCaratWeight(parsedWeight);
          }
        }
        if (item.isJewelry && item.metalType) {
          if (item.metalType === 'Plata') {
            updateInvestment('silver', item.costoTM || 0);
          } else if (item.metalType === 'Oro 18k') {
            updateInvestment('gold', item.costoTM || 0);
          }
        }
      }
    }
  };

  // Toggle multi-select mode
  const toggleMultiSelectMode = () => {
    setMultiSelectMode(!multiSelectMode);
    if (!multiSelectMode) {
      clearProducts();
      setProductName('Colección de Productos');
    } else {
      clearProducts();
    }
  };

  // Navigate to preview page with quotation data
  const handlePreview = () => {
    if (totalInvestment === 0) {
      alert('Por favor ingresa al menos un valor de inversión antes de generar la cotización.');
      return;
    }

    const selectedProductsData = selectedProducts.map(p => {
      const isInventory = 'item' in p;
      return {
        id: isInventory ? p.item : p.id,
        name: isInventory ? p.nombre : p.name,
        price: ('priceCOP' in p ? p.priceCOP : 0) || 0,
        source: isInventory ? 'inventory' : 'gallery',
      };
    });

    const quotationData = {
      productName: productName || 'Esmeralda Natural Colombiana',
      caratWeight,
      investments: investments.map(inv => ({
        id: inv.id,
        label: inv.label,
        value: inv.value,
        icon: inv.id,
      })),
      customItems,
      selectedProducts: selectedProductsData,
      multiSelectMode,
      totalProductsValue,
      totalInvestment,
      priceFactor,
      salePrice: pricingMetrics.salePrice,
      margin: pricingMetrics.margin,
      roi: pricingMetrics.roi,
      profit: pricingMetrics.profit,
      pricePerCarat: pricingMetrics.pricePerCarat,
      createdAt: new Date().toISOString(),
    };

    navigate('/simulator/preview', { state: { quotationData } });
  };

  return (
    <Box sx={{
      maxWidth: 960,
      mx: 'auto',
      px: { xs: 2, sm: 3, md: 0 },
    }}>
      {/* Header */}
      <PriceSimulatorHeader
        totalInvestment={totalInvestment}
        onPreview={handlePreview}
      />

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        gap: { xs: 2, sm: 2.5, md: 3 }
      }}>
        {/* Left Column - Investments */}
        <Box>
          <Paper elevation={0} sx={{ ...studioCardStyles.card }}>
            {/* Product Name Field */}
            <ProductNameSection
              productSource={productSource}
              setProductSource={setProductSource}
              multiSelectMode={multiSelectMode}
              toggleMultiSelectMode={toggleMultiSelectMode}
              emeralds={emeralds}
              filteredInventory={filteredInventory}
              productName={productName}
              setProductName={setProductName}
              selectedEmerald={selectedEmerald}
              selectedInventoryItem={selectedInventoryItem}
              handleEmeraldSelect={handleEmeraldSelect}
              handleInventorySelect={handleInventorySelect}
              selectedProducts={selectedProducts}
              totalProductsValue={totalProductsValue}
              removeProduct={removeProduct}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              productTypeFilter={productTypeFilter}
              setProductTypeFilter={setProductTypeFilter}
              shapeFilter={shapeFilter}
              setShapeFilter={setShapeFilter}
              uniqueShapes={uniqueShapes}
            />

            <Divider sx={{ borderColor: studioColors.border, mb: 2.5 }} />

            {/* Carat Weight Input */}
            <CaratWeightInput
              caratWeight={caratWeight}
              setCaratWeight={setCaratWeight}
            />

            <Divider sx={{ borderColor: studioColors.border, mb: 2.5 }} />

            {/* Investment Section */}
            <InvestmentSection
              investments={investments}
              updateInvestment={updateInvestment}
              customItems={customItems}
              updateCustomItem={updateCustomItem}
              addCustomItem={addCustomItem}
              showAdvanced={showAdvanced}
              setShowAdvanced={setShowAdvanced}
              resetValues={resetValues}
              totalInvestment={totalInvestment}
            />
          </Paper>
        </Box>

        {/* Right Column - Pricing */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <FactorSlider
            priceFactor={priceFactor}
            onFactorChange={setPriceFactor}
            currentTier={currentTier}
          />

          <PricingResults
            pricingMetrics={pricingMetrics}
            priceFactor={priceFactor}
            caratWeight={caratWeight}
            marginProgress={marginProgress}
          />

          <FormulaInfo />
        </Box>
      </Box>
    </Box>
  );
}

// =============================================================================
// SUB-COMPONENTS (inline for now, can be extracted later)
// =============================================================================

interface ProductNameSectionProps {
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

const ProductNameSection: React.FC<ProductNameSectionProps> = ({
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
          label={`Galería (${emeralds.length})`}
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
          label="Multi-selección"
          size="small"
          onClick={toggleMultiSelectMode}
          sx={{
            height: 22,
            fontSize: '0.625rem',
            fontWeight: 500,
            bgcolor: multiSelectMode ? '#8B5CF6' : alpha('#8B5CF6', 0.1),
            color: multiSelectMode ? '#FFFFFF' : '#8B5CF6',
            cursor: 'pointer',
            border: '1px solid',
            borderColor: multiSelectMode ? '#8B5CF6' : alpha('#8B5CF6', 0.3),
            '& .MuiChip-icon': { color: multiSelectMode ? '#FFFFFF' : '#8B5CF6' },
            '&:hover': {
              bgcolor: multiSelectMode ? '#8B5CF6' : alpha('#8B5CF6', 0.2),
              borderColor: '#8B5CF6',
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
        label="Seleccionado de galería"
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

// Source chip component
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
      color: active ? '#FFFFFF' : studioColors.emerald,
      cursor: 'pointer',
      '& .MuiChip-icon': { color: active ? '#FFFFFF' : studioColors.emerald },
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
              <Typography variant="caption" sx={{ color: '#3B82F6', fontWeight: 500 }}>
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
        placeholder={emeralds.length > 0 ? "Escribe o selecciona de la galería..." : "Ej: Anillo Esmeralda Colombiana 2.5ct"}
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
          No hay esmeraldas en la galería
        </Typography>
        <Typography variant="caption" sx={{ color: studioColors.textMuted }}>
          Agrega esmeraldas en la sección "Subir"
        </Typography>
      </Box>
    }
  />
);

// Inventory autocomplete (simplified - filters + autocomplete)
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
                    bgcolor: alpha(studioColors.gold, 0.1),
                    color: studioColors.gold,
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
                    bgcolor: alpha('#8B5CF6', 0.1),
                    color: '#8B5CF6',
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
                <Typography variant="caption" sx={{ color: '#3B82F6', fontWeight: 500 }}>
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
          placeholder="Busca en inventario por nombre o número..."
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
        ? (variant === 'primary' ? '#FFFFFF' : studioColors.emerald)
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
  const color = type === 'gallery' ? studioColors.emerald : '#3B82F6';
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
        sx={{ color: studioColors.textMuted, '&:hover': { color: '#EF4444' } }}
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
      bgcolor: alpha('#8B5CF6', 0.04),
      borderRadius: 2,
      border: `1px solid ${alpha('#8B5CF6', 0.2)}`,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Layers size={16} color="#8B5CF6" />
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#8B5CF6' }}>
          Colección ({selectedProducts.length} productos)
        </Typography>
      </Box>
      <Typography variant="caption" sx={{ color: '#8B5CF6', fontWeight: 600 }}>
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
              bgcolor: alpha('#FFFFFF', 0.8),
              borderRadius: 1,
              border: `1px solid ${alpha('#8B5CF6', 0.1)}`,
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
              <Typography variant="caption" sx={{ color: '#8B5CF6', fontWeight: 500 }}>
                {formatCurrency(productPrice)}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => removeProduct(product)}
              sx={{
                color: studioColors.textMuted,
                '&:hover': { color: '#EF4444', bgcolor: alpha('#EF4444', 0.1) },
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

// Carat weight input
interface CaratWeightInputProps {
  caratWeight: number;
  setCaratWeight: (weight: number) => void;
}

const CaratWeightInput: React.FC<CaratWeightInputProps> = ({ caratWeight, setCaratWeight }) => (
  <Box sx={{ mb: 2.5 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
      <Gem size={16} color={studioColors.emerald} />
      <Typography variant="body2" sx={{ fontWeight: 600, color: studioColors.textPrimary }}>
        Peso en Quilates (opcional)
      </Typography>
      <Tooltip title="Ingresa el peso total en quilates para calcular el precio por quilate">
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Info size={14} color={studioColors.textMuted} />
        </Box>
      </Tooltip>
    </Box>
    <TextField
      fullWidth
      size="small"
      type="number"
      value={caratWeight || ''}
      onChange={(e) => setCaratWeight(Number(e.target.value) || 0)}
      placeholder="Ej: 2.5"
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <Typography sx={{ fontSize: '0.75rem', color: studioColors.emerald, fontWeight: 600 }}>
                ct
              </Typography>
            </InputAdornment>
          ),
        },
      }}
      sx={{
        '& .MuiOutlinedInput-root': {
          bgcolor: studioColors.surface,
          fontSize: '0.875rem',
          '& fieldset': { borderColor: studioColors.border },
          '&:hover fieldset': { borderColor: alpha(studioColors.emerald, 0.4) },
          '&.Mui-focused fieldset': { borderColor: studioColors.emerald },
        },
      }}
    />
  </Box>
);

// Investment section
interface InvestmentSectionProps {
  investments: { id: string; label: string; value: number; unit?: string; placeholder?: string }[];
  updateInvestment: (id: string, value: number) => void;
  customItems: { label: string; value: number }[];
  updateCustomItem: (index: number, field: 'label' | 'value', value: string | number) => void;
  addCustomItem: () => void;
  showAdvanced: boolean;
  setShowAdvanced: (show: boolean) => void;
  resetValues: () => void;
  totalInvestment: number;
}

const InvestmentSection: React.FC<InvestmentSectionProps> = ({
  investments,
  updateInvestment,
  customItems,
  updateCustomItem,
  addCustomItem,
  showAdvanced,
  setShowAdvanced,
  resetValues,
  totalInvestment,
}) => (
  <>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
      <Typography variant="subtitle1" sx={{ ...studioCardStyles.sectionTitle }}>
        Inversión
      </Typography>
      <Tooltip title="Reiniciar valores">
        <IconButton size="small" onClick={resetValues} sx={{ color: studioColors.textMuted }}>
          <RotateCcw size={16} />
        </IconButton>
      </Tooltip>
    </Box>

    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {investments.map((item) => (
        <Box key={item.id}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
            <Box sx={{ color: studioColors.textSecondary }}>{getInvestmentIcon(item.id)}</Box>
            <Typography variant="body2" sx={{ fontWeight: 500, color: studioColors.textPrimary, flex: 1 }}>
              {item.label}
            </Typography>
            {item.unit && (
              <Chip
                label={item.unit}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  bgcolor: alpha(studioColors.emerald, 0.1),
                  color: studioColors.emerald,
                }}
              />
            )}
          </Box>
          <TextField
            fullWidth
            size="small"
            type="number"
            value={item.value || ''}
            onChange={(e) => updateInvestment(item.id, Number(e.target.value) || 0)}
            placeholder={item.placeholder}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Typography sx={{ fontSize: '0.875rem', color: studioColors.textMuted }}>$</Typography>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: studioColors.surface,
                fontSize: '0.875rem',
                '& fieldset': { borderColor: studioColors.border },
                '&:hover fieldset': { borderColor: alpha(studioColors.emerald, 0.4) },
                '&.Mui-focused fieldset': { borderColor: studioColors.emerald },
              },
            }}
          />
        </Box>
      ))}
    </Box>

    {/* Custom Items */}
    <Box sx={{ mt: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          py: 1,
        }}
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        <Typography variant="body2" sx={{ fontWeight: 600, color: studioColors.textSecondary }}>
          Costos adicionales
        </Typography>
        {showAdvanced ? <ChevronUp size={18} color={studioColors.textSecondary} /> : <ChevronDown size={18} color={studioColors.textSecondary} />}
      </Box>

      <Collapse in={showAdvanced}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {customItems.map((item, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1.5 }}>
              <TextField
                size="small"
                value={item.label}
                onChange={(e) => updateCustomItem(index, 'label', e.target.value)}
                placeholder="Concepto"
                sx={{
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    bgcolor: studioColors.surface,
                    fontSize: '0.875rem',
                    '& fieldset': { borderColor: studioColors.border },
                  },
                }}
              />
              <TextField
                size="small"
                type="number"
                value={item.value || ''}
                onChange={(e) => updateCustomItem(index, 'value', Number(e.target.value) || 0)}
                placeholder="0"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography sx={{ fontSize: '0.875rem', color: studioColors.textMuted }}>$</Typography>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: 150,
                  '& .MuiOutlinedInput-root': {
                    bgcolor: studioColors.surface,
                    fontSize: '0.875rem',
                    '& fieldset': { borderColor: studioColors.border },
                  },
                }}
              />
            </Box>
          ))}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              color: studioColors.emerald,
              '&:hover': { color: studioColors.emeraldLight },
            }}
            onClick={addCustomItem}
          >
            <Plus size={16} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Agregar costo
            </Typography>
          </Box>
        </Box>
      </Collapse>
    </Box>

    <Divider sx={{ borderColor: studioColors.border, my: 2.5 }} />

    {/* Total Investment */}
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: studioColors.textPrimary }}>
        Total Inversión
      </Typography>
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          color: studioColors.textPrimary,
          fontFamily: 'monospace',
        }}
      >
        {formatCurrency(totalInvestment)}
      </Typography>
    </Box>
  </>
);
