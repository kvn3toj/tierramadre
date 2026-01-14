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
import { Emerald, TreasureItem } from '../types';
import { treasureData } from '../data/treasure';
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

  // Selected product from gallery or treasure (UI state)
  const [selectedEmerald, setSelectedEmerald] = useState<Emerald | null>(null);
  const [selectedTreasureItem, setSelectedTreasureItem] = useState<TreasureItem | null>(null);
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

  // Filter treasure by status
  const statusFilteredTreasure = useMemo(() => {
    if (statusFilter === 'todas') return treasureData;
    if (statusFilter === 'disponibles') return treasureData.filter(item => item.estado === 'DISPONIBLE');
    if (statusFilter === 'vendidas') return treasureData.filter(item => item.estado === 'VENDIDA');
    return treasureData;
  }, [statusFilter]);

  // Filter by product type
  const typeFilteredTreasure = useMemo(() => {
    if (productTypeFilter === 'todas') return statusFilteredTreasure;
    if (productTypeFilter === 'gemas') return statusFilteredTreasure.filter(item => !item.isJewelry && item.cantidad === 1);
    if (productTypeFilter === 'joyas') return statusFilteredTreasure.filter(item => item.isJewelry);
    if (productTypeFilter === 'lotes') return statusFilteredTreasure.filter(item => !item.isJewelry && item.cantidad > 1);
    return statusFilteredTreasure;
  }, [statusFilteredTreasure, productTypeFilter]);

  // Get unique shapes from type-filtered treasure
  const uniqueShapes = useMemo(() => {
    const shapes = new Set(typeFilteredTreasure.map(item => item.talla).filter(Boolean));
    return ['all', ...Array.from(shapes).sort()];
  }, [typeFilteredTreasure]);

  // Filter treasure by shape
  const filteredTreasure = useMemo(() => {
    if (shapeFilter === 'all') return typeFilteredTreasure;
    return typeFilteredTreasure.filter(item => item.talla === shapeFilter);
  }, [typeFilteredTreasure, shapeFilter]);

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
      setSelectedTreasureItem(null);
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

  // Handle treasure selection
  const handleTreasureSelect = (item: TreasureItem | null) => {
    if (multiSelectMode && item) {
      addProduct(item);
      setProductName('');
      setSelectedTreasureItem(null);
    } else {
      setSelectedTreasureItem(item);
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
              filteredTreasure={filteredTreasure}
              productName={productName}
              setProductName={setProductName}
              selectedEmerald={selectedEmerald}
              selectedTreasureItem={selectedTreasureItem}
              handleEmeraldSelect={handleEmeraldSelect}
              handleTreasureSelect={handleTreasureSelect}
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
