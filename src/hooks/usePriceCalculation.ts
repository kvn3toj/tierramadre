/**
 * usePriceCalculation Hook
 * Handles pricing calculations, investment tracking, and tier logic.
 * Extracted from PriceSimulator.tsx for better modularity.
 */
import { useState, useMemo, useCallback } from 'react';
import { Emerald, InventoryItem } from '../types';

// Investment item interface
export interface InvestmentItem {
  id: string;
  label: string;
  value: number;
  unit?: string;
  unitLabel?: string;
  placeholder?: string;
}

// Pricing tier interface
export interface PricingTier {
  factor: number;
  margin: number;
  roi: number;
  label: string;
  color: string;
}

// Custom cost item
export interface CustomCostItem {
  label: string;
  value: number;
}

// Pricing metrics
export interface PricingMetrics {
  salePrice: number;
  margin: number;
  roi: number;
  profit: number;
  pricePerCarat: number;
}

// Default pricing tiers
export const PRICING_TIERS: PricingTier[] = [
  { factor: 2.0, margin: 50, roi: 100, label: 'Minimo', color: '#64748B' },
  { factor: 2.5, margin: 60, roi: 150, label: 'Base', color: '#3B82F6' },
  { factor: 3.0, margin: 66.7, roi: 200, label: 'Ideal', color: '#059669' },
  { factor: 3.5, margin: 71.4, roi: 250, label: 'Premium', color: '#D4AF37' },
];

// Default investment items
export const DEFAULT_INVESTMENTS: InvestmentItem[] = [
  { id: 'emerald', label: 'Valor de la Esmeralda', value: 0, unit: 'Precio Total', unitLabel: 'precio total', placeholder: '0' },
  { id: 'gold', label: 'Oro (Estructura)', value: 0, unit: 'Precio Total', unitLabel: 'precio total', placeholder: '0' },
  { id: 'silver', label: 'Plata (Estructura)', value: 0, unit: 'Precio Total', unitLabel: 'precio total', placeholder: '0' },
  { id: 'setting', label: 'Engaste', value: 0, placeholder: '0' },
  { id: 'certification', label: 'Certificacion', value: 0, placeholder: '0' },
  { id: 'packaging', label: 'Empaque', value: 0, placeholder: '0' },
];

export interface UsePriceCalculationOptions {
  initialInvestments?: InvestmentItem[];
  initialFactor?: number;
  initialCaratWeight?: number;
}

export interface UsePriceCalculationReturn {
  // Investment state
  investments: InvestmentItem[];
  updateInvestment: (id: string, value: number) => void;

  // Custom items
  customItems: CustomCostItem[];
  updateCustomItem: (index: number, field: 'label' | 'value', value: string | number) => void;
  addCustomItem: () => void;
  removeCustomItem: (index: number) => void;

  // Multi-select products
  selectedProducts: (Emerald | InventoryItem)[];
  addProduct: (product: Emerald | InventoryItem) => void;
  removeProduct: (product: Emerald | InventoryItem) => void;
  clearProducts: () => void;
  totalProductsValue: number;

  // Price factor
  priceFactor: number;
  setPriceFactor: (factor: number) => void;
  currentTier: PricingTier;

  // Carat weight
  caratWeight: number;
  setCaratWeight: (weight: number) => void;

  // Calculated values
  totalInvestment: number;
  pricingMetrics: PricingMetrics;
  marginProgress: number;

  // Actions
  resetAll: () => void;
  loadFromProduct: (product: Emerald | InventoryItem) => void;
}

export function usePriceCalculation(options: UsePriceCalculationOptions = {}): UsePriceCalculationReturn {
  const {
    initialInvestments = DEFAULT_INVESTMENTS,
    initialFactor = 2.5,
    initialCaratWeight = 0,
  } = options;

  // Investment state
  const [investments, setInvestments] = useState<InvestmentItem[]>(initialInvestments);
  const [customItems, setCustomItems] = useState<CustomCostItem[]>([{ label: 'Otro', value: 0 }]);
  const [selectedProducts, setSelectedProducts] = useState<(Emerald | InventoryItem)[]>([]);

  // Price factor
  const [priceFactor, setPriceFactor] = useState(initialFactor);

  // Carat weight
  const [caratWeight, setCaratWeight] = useState(initialCaratWeight);

  // Calculate total from selected products
  const totalProductsValue = useMemo(() => {
    return selectedProducts.reduce((sum, product) => {
      if ('priceCOP' in product && product.priceCOP) {
        return sum + product.priceCOP;
      }
      return sum;
    }, 0);
  }, [selectedProducts]);

  // Calculate total investment
  const totalInvestment = useMemo(() => {
    const baseTotal = investments.reduce((sum, item) => sum + item.value, 0);
    const customTotal = customItems.reduce((sum, item) => sum + item.value, 0);
    return baseTotal + customTotal + totalProductsValue;
  }, [investments, customItems, totalProductsValue]);

  // Calculate pricing metrics
  const pricingMetrics = useMemo((): PricingMetrics => {
    const salePrice = totalInvestment * priceFactor;
    const margin = totalInvestment > 0 ? ((salePrice - totalInvestment) / salePrice) * 100 : 0;
    const roi = totalInvestment > 0 ? ((salePrice - totalInvestment) / totalInvestment) * 100 : 0;
    const profit = salePrice - totalInvestment;
    const pricePerCarat = caratWeight > 0 ? salePrice / caratWeight : 0;

    return { salePrice, margin, roi, profit, pricePerCarat };
  }, [totalInvestment, priceFactor, caratWeight]);

  // Get current tier based on factor
  const currentTier = useMemo(() => {
    return PRICING_TIERS.reduce((closest, tier) => {
      return Math.abs(tier.factor - priceFactor) < Math.abs(closest.factor - priceFactor)
        ? tier
        : closest;
    }, PRICING_TIERS[0]);
  }, [priceFactor]);

  // Margin progress (0-100)
  const marginProgress = useMemo(() => {
    return Math.min((pricingMetrics.margin / 75) * 100, 100);
  }, [pricingMetrics.margin]);

  // Update investment value
  const updateInvestment = useCallback((id: string, value: number) => {
    setInvestments(prev =>
      prev.map(item => (item.id === id ? { ...item, value } : item))
    );
  }, []);

  // Update custom item
  const updateCustomItem = useCallback((index: number, field: 'label' | 'value', value: string | number) => {
    setCustomItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }, []);

  // Add custom item
  const addCustomItem = useCallback(() => {
    setCustomItems(prev => [...prev, { label: 'Otro', value: 0 }]);
  }, []);

  // Remove custom item
  const removeCustomItem = useCallback((index: number) => {
    setCustomItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Add product to selection
  const addProduct = useCallback((product: Emerald | InventoryItem) => {
    const productId = 'item' in product ? product.item : product.id;
    const isAlreadyAdded = selectedProducts.some(p =>
      ('item' in p ? p.item : p.id) === productId
    );

    if (!isAlreadyAdded) {
      setSelectedProducts(prev => [...prev, product]);
    }
  }, [selectedProducts]);

  // Remove product from selection
  const removeProduct = useCallback((product: Emerald | InventoryItem) => {
    const productId = 'item' in product ? product.item : product.id;
    setSelectedProducts(prev =>
      prev.filter(p => ('item' in p ? p.item : p.id) !== productId)
    );
  }, []);

  // Clear all selected products
  const clearProducts = useCallback(() => {
    setSelectedProducts([]);
  }, []);

  // Reset all values
  const resetAll = useCallback(() => {
    setInvestments(initialInvestments.map(item => ({ ...item, value: 0 })));
    setCustomItems([{ label: 'Otro', value: 0 }]);
    setSelectedProducts([]);
    setPriceFactor(2.5);
    setCaratWeight(0);
  }, [initialInvestments]);

  // Load values from a product
  const loadFromProduct = useCallback((product: Emerald | InventoryItem) => {
    const isInventoryItem = 'item' in product;

    if (isInventoryItem) {
      const item = product as InventoryItem;
      // Load price
      const price = typeof item.precioCOP === 'number' ? item.precioCOP : 0;
      if (price > 0) {
        updateInvestment('emerald', price);
      }

      // Set carat weight
      if (typeof item.peso === 'number') {
        setCaratWeight(item.peso);
      } else if (typeof item.peso === 'string' && !item.isJewelry) {
        const parsedWeight = parseFloat(item.peso.replace(',', '.'));
        if (!isNaN(parsedWeight)) {
          setCaratWeight(parsedWeight);
        }
      }

      // Pre-fill metal cost if jewelry
      if (item.isJewelry && item.metalType) {
        if (item.metalType === 'Plata') {
          updateInvestment('silver', item.costoTM || 0);
        } else if (item.metalType === 'Oro 18k') {
          updateInvestment('gold', item.costoTM || 0);
        }
      }
    } else {
      const emerald = product as Emerald;
      // Load price
      if (emerald.priceCOP && emerald.priceCOP > 0) {
        updateInvestment('emerald', emerald.priceCOP);
      }

      // Set carat weight
      if (emerald.weightCarats) {
        setCaratWeight(emerald.weightCarats);
      }
    }
  }, [updateInvestment]);

  return {
    investments,
    updateInvestment,
    customItems,
    updateCustomItem,
    addCustomItem,
    removeCustomItem,
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
    totalInvestment,
    pricingMetrics,
    marginProgress,
    resetAll,
    loadFromProduct,
  };
}

export default usePriceCalculation;
