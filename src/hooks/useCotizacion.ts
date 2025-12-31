/**
 * useCotizacion Hook
 * Manages quotation state, products, investments, and calculations.
 * Extracted from CotizacionGenerator.tsx for better modularity.
 */
import { useState, useCallback, useMemo } from 'react';
import { TreasureItem } from '../types';

// Cotizacion product interface
export interface CotizacionProduct {
  id: string;
  itemNumber: number;
  name: string;
  peso: string | number;
  color: string;
  calidad: string;
  talla: string;
  precioCOP: number;
  imagen?: string;
  isJewelry: boolean;
  metalType?: string;
}

// Business settings interface
export interface BusinessSettings {
  contactPhone: string;
  contactEmail: string;
  nit: string;
  footerMessage: string;
  footerNote: string;
}

// Investment item interface
export interface CotizacionInvestment {
  id: string;
  label: string;
  value: number;
  icon: string;
}

// Custom cost interface
export interface CustomCost {
  id: string;
  label: string;
  value: number;
}

// Manual product entry state
export interface ManualProductState {
  name: string;
  peso: string;
  color: string;
  calidad: string;
  talla: string;
  precioCOP: number;
  isJewelry: boolean;
  metalType: string;
}

// Default investments
export const DEFAULT_COTIZACION_INVESTMENTS: CotizacionInvestment[] = [
  { id: 'emerald', label: 'Valor de la Esmeralda', value: 0, icon: 'emerald' },
  { id: 'gold', label: 'Oro (Estructura)', value: 0, icon: 'gold' },
  { id: 'silver', label: 'Plata (Estructura)', value: 0, icon: 'silver' },
  { id: 'setting', label: 'Engaste', value: 0, icon: 'setting' },
  { id: 'certification', label: 'Certificacion', value: 0, icon: 'certification' },
  { id: 'packaging', label: 'Empaque', value: 0, icon: 'packaging' },
];

// Default business settings
export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  contactPhone: '+57 310 XXX XXXX',
  contactEmail: 'info@tierramadre.co',
  nit: 'NIT: 900.XXX.XXX-X',
  footerMessage: 'Gracias por su preferencia',
  footerNote: 'Esta cotizacion es valida por el tiempo indicado. Los precios estan sujetos a disponibilidad. Las esmeraldas Tierra Madre cuentan con certificado de origen y autenticidad.',
};

// Generate quotation number
export const generateQuotationNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = String(Date.now()).slice(-5);
  return `COT-${year}${month}${day}-${random}`;
};

// Generate product URL slug
export const generateProductSlug = (name: string): string => {
  return name
    .replace(/^[A-Z]:[A-Z]\s*/i, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

// Format currency
export const formatCotizacionCurrency = (amount: number, currency: 'COP' | 'USD' = 'COP'): string => {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Get peso display string
export const getPesoDisplay = (item: CotizacionProduct | TreasureItem): string => {
  if (item.isJewelry) {
    return item.metalType || 'Joya';
  }
  return typeof item.peso === 'number' ? `${item.peso} ct` : String(item.peso);
};

export interface UseCotizacionReturn {
  // Quotation info
  quotationNumber: string;
  setQuotationNumber: (num: string) => void;
  regenerateQuotationNumber: () => void;

  // Client info
  clientName: string;
  setClientName: (name: string) => void;
  clientPhone: string;
  setClientPhone: (phone: string) => void;
  clientEmail: string;
  setClientEmail: (email: string) => void;
  clientDocument: string;
  setClientDocument: (doc: string) => void;
  asesorName: string;
  setAsesorName: (name: string) => void;

  // Date and validity
  date: string;
  setDate: (date: string) => void;
  validDays: number;
  setValidDays: (days: number) => void;
  expiryDate: Date;
  expiryStr: string;

  // Notes and discount
  notes: string;
  setNotes: (notes: string) => void;
  discountPercent: number;
  setDiscountPercent: (percent: number) => void;

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

  // Business settings
  businessSettings: BusinessSettings;
  setBusinessSettings: React.Dispatch<React.SetStateAction<BusinessSettings>>;

  // Calculated totals
  investmentTotal: number;
  customCostsTotal: number;
  totalInvestment: number;
  productSubtotal: number;
  subtotal: number;
  discount: number;
  total: number;

  // Actions
  resetAll: () => void;
}

const initialManualProduct: ManualProductState = {
  name: '',
  peso: '',
  color: '',
  calidad: '',
  talla: '',
  precioCOP: 0,
  isJewelry: false,
  metalType: '',
};

export function useCotizacion(): UseCotizacionReturn {
  // Quotation info
  const [quotationNumber, setQuotationNumber] = useState(generateQuotationNumber);

  // Client info
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientDocument, setClientDocument] = useState('');
  const [asesorName, setAsesorName] = useState('');

  // Date and validity
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [validDays, setValidDays] = useState(15);

  // Notes and discount
  const [notes, setNotes] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);

  // Products
  const [products, setProducts] = useState<CotizacionProduct[]>([]);

  // Manual product entry
  const [manualProduct, setManualProduct] = useState<ManualProductState>(initialManualProduct);

  // Investments
  const [investments, setInvestments] = useState<CotizacionInvestment[]>(DEFAULT_COTIZACION_INVESTMENTS);
  const [customCosts, setCustomCosts] = useState<CustomCost[]>([]);

  // Business settings
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>(DEFAULT_BUSINESS_SETTINGS);

  // Calculate expiry date
  const expiryDate = useMemo(() => {
    const expiry = new Date(date);
    expiry.setDate(expiry.getDate() + validDays);
    return expiry;
  }, [date, validDays]);

  const expiryStr = useMemo(() => {
    return expiryDate.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [expiryDate]);

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

  const subtotal = productSubtotal + totalInvestment;
  const discount = subtotal * (discountPercent / 100);
  const total = subtotal - discount;

  // Regenerate quotation number
  const regenerateQuotationNumber = useCallback(() => {
    setQuotationNumber(generateQuotationNumber());
  }, []);

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

  // Reset all
  const resetAll = useCallback(() => {
    setQuotationNumber(generateQuotationNumber());
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setClientDocument('');
    setAsesorName('');
    setDate(new Date().toISOString().split('T')[0]);
    setValidDays(15);
    setNotes('');
    setDiscountPercent(0);
    setProducts([]);
    setManualProduct(initialManualProduct);
    setInvestments(DEFAULT_COTIZACION_INVESTMENTS);
    setCustomCosts([]);
  }, []);

  return {
    quotationNumber,
    setQuotationNumber,
    regenerateQuotationNumber,
    clientName,
    setClientName,
    clientPhone,
    setClientPhone,
    clientEmail,
    setClientEmail,
    clientDocument,
    setClientDocument,
    asesorName,
    setAsesorName,
    date,
    setDate,
    validDays,
    setValidDays,
    expiryDate,
    expiryStr,
    notes,
    setNotes,
    discountPercent,
    setDiscountPercent,
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
    businessSettings,
    setBusinessSettings,
    investmentTotal,
    customCostsTotal,
    totalInvestment,
    productSubtotal,
    subtotal,
    discount,
    total,
    resetAll,
  };
}

export default useCotizacion;
