/**
 * useCotizacionData Hook
 * Manages quotation products, investments, custom costs, and calculated totals.
 * Extracted from useCotizacion for better modularity.
 */
import { useState, useCallback, useMemo } from 'react';
import { TreasureItem } from '../types';
import {
  CotizacionProduct,
  CotizacionInvestment,
  CustomCost,
  ManualProductState,
  DEFAULT_COTIZACION_INVESTMENTS,
} from './useCotizacion';

const initialManualProduct: ManualProductState = {
  name: '',
  peso: '',
  color: '',
  calidad: '',
  talla: '',
  precioCOP: 0,
  isJewelry: false,
  metalType: '',
  pesoTotal: '',
  cantidadGemas: '',
  medida: '',
  diseno: '',
  precioPorCt: '',
  calidadMetal: '',
  gramaje: '',
};

export interface UseCotizacionDataReturn {
  // Products
  products: CotizacionProduct[];
  addProductFromTreasure: (item: TreasureItem) => void;
  addManualProduct: (product: ManualProductState) => void;
  removeProduct: (productId: string) => void;

  // Manual product entry
  manualProduct: ManualProductState;
  setManualProduct: React.Dispatch<React.SetStateAction<ManualProductState>>;
  resetManualProduct: () => void;

  // Investments
  investments: CotizacionInvestment[];
  updateInvestment: (id: string, value: number) => void;
  resetInvestments: () => void;

  // Custom costs
  customCosts: CustomCost[];
  addCustomCost: (label: string, value: number) => void;
  removeCustomCost: (id: string) => void;

  // Calculated totals
  investmentTotal: number;
  customCostsTotal: number;
  totalInvestment: number;
  productSubtotal: number;

  // Reset
  resetData: () => void;
}

export function useCotizacionData(): UseCotizacionDataReturn {
  // Products
  const [products, setProducts] = useState<CotizacionProduct[]>([]);

  // Manual product entry
  const [manualProduct, setManualProduct] = useState<ManualProductState>(initialManualProduct);

  // Investments
  const [investments, setInvestments] = useState<CotizacionInvestment[]>(DEFAULT_COTIZACION_INVESTMENTS);
  const [customCosts, setCustomCosts] = useState<CustomCost[]>([]);

  // Calculate totals
  const investmentTotal = useMemo(() => {
    return investments.reduce((sum, inv) => sum + inv.value, 0);
  }, [investments]);

  const customCostsTotal = useMemo(() => {
    return customCosts.reduce((sum, cost) => sum + cost.value, 0);
  }, [customCosts]);

  const totalInvestment = investmentTotal + customCostsTotal;

  const productSubtotal = useMemo(() => {
    return products.reduce((sum, p) => sum + p.precioCOP, 0);
  }, [products]);

  // Add product from treasure
  const addProductFromTreasure = useCallback((item: TreasureItem) => {
    const product: CotizacionProduct = {
      id: crypto.randomUUID(),
      itemNumber: item.item,
      name: item.nombre,
      peso: item.peso,
      color: item.color,
      calidad: item.calidad,
      talla: item.talla,
      precioCOP: item.precioCOP,
      imagen: item.imagen,
      isJewelry: item.isJewelry,
      metalType: item.metalType,
    };
    setProducts(prev => [...prev, product]);
  }, []);

  // Add manual product
  const addManualProduct = useCallback((product: ManualProductState) => {
    if (!product.name || product.precioCOP <= 0) return;

    const newProduct: CotizacionProduct = {
      id: crypto.randomUUID(),
      itemNumber: Date.now() % 10000,
      name: product.name,
      peso: product.peso || '-',
      color: product.color || '-',
      calidad: product.calidad || '-',
      talla: product.talla || '-',
      precioCOP: product.precioCOP,
      isJewelry: product.isJewelry,
      metalType: product.metalType,
      imagen: product.imagen,
      gifUrl: product.gifUrl,
      videoUrl: product.videoUrl,
      isManual: true,
    };

    setProducts(prev => [...prev, newProduct]);
    setManualProduct(initialManualProduct);
  }, []);

  // Remove product
  const removeProduct = useCallback((productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
  }, []);

  // Reset manual product
  const resetManualProduct = useCallback(() => {
    setManualProduct(initialManualProduct);
  }, []);

  // Update investment
  const updateInvestment = useCallback((id: string, value: number) => {
    setInvestments(prev => prev.map(inv =>
      inv.id === id ? { ...inv, value } : inv
    ));
  }, []);

  // Reset investments
  const resetInvestments = useCallback(() => {
    setInvestments(DEFAULT_COTIZACION_INVESTMENTS);
    setCustomCosts([]);
  }, []);

  // Add custom cost
  const addCustomCost = useCallback((label: string, value: number) => {
    if (!label || value <= 0) return;
    setCustomCosts(prev => [
      ...prev,
      { id: crypto.randomUUID(), label, value }
    ]);
  }, []);

  // Remove custom cost
  const removeCustomCost = useCallback((id: string) => {
    setCustomCosts(prev => prev.filter(c => c.id !== id));
  }, []);

  // Reset all data
  const resetData = useCallback(() => {
    setProducts([]);
    setManualProduct(initialManualProduct);
    setInvestments(DEFAULT_COTIZACION_INVESTMENTS);
    setCustomCosts([]);
  }, []);

  return {
    products,
    addProductFromTreasure,
    addManualProduct,
    removeProduct,
    manualProduct,
    setManualProduct,
    resetManualProduct,
    investments,
    updateInvestment,
    resetInvestments,
    customCosts,
    addCustomCost,
    removeCustomCost,
    investmentTotal,
    customCostsTotal,
    totalInvestment,
    productSubtotal,
    resetData,
  };
}
