/**
 * PriceSimulator Component
 * Main price calculation tool for emerald products.
 *
 * REFACTORED: Sub-components extracted to ./price-simulator/ for modularity.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Paper, Divider } from '@mui/material';

import { useEmeralds } from '../hooks/useEmeralds';
import { usePriceCalculation } from '../hooks/usePriceCalculation';
import { Emerald, InventoryItem } from '../types';
import { inventoryData } from '../data/inventory';
import { studioCardStyles } from '../design-system';

// Extracted components
import {
  PriceSimulatorHeader,
  FactorSlider,
  PricingResults,
  FormulaInfo,
  ProductSelector,
  CaratWeightInput,
  InvestmentSection,
  ProductSource,
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
      setProductName('Coleccion de Productos');
    } else {
      clearProducts();
    }
  };

  // Navigate to preview page with quotation data
  const handlePreview = () => {
    if (totalInvestment === 0) {
      alert('Por favor ingresa al menos un valor de inversion antes de generar la cotizacion.');
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
            {/* Product Selection */}
            <ProductSelector
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

            <Divider sx={{ borderColor: 'divider', mb: 2.5 }} />

            {/* Carat Weight Input */}
            <CaratWeightInput
              caratWeight={caratWeight}
              setCaratWeight={setCaratWeight}
            />

            <Divider sx={{ borderColor: 'divider', mb: 2.5 }} />

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
