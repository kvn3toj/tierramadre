/**
 * useCotizacion Hook
 * Composition hook that combines form state and data management for quotations.
 * Delegates to useCotizacionForm and useCotizacionData for better modularity.
 */
import { useCallback, useMemo } from 'react';
import { TreasureItem } from '../types';
import { useCotizacionForm } from './useCotizacionForm';
import { useCotizacionData } from './useCotizacionData';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { useCurrency } from '../contexts/CurrencyContext';

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
  gifUrl?: string; // Animated GIF for PDF export (from video)
  videoUrl?: string; // Direct video URL for QR code linking
  isJewelry: boolean;
  metalType?: string;
  isManual?: boolean; // Flag to identify manually added products
}

// Business settings interface
export interface BusinessSettings {
  contactPhone: string;
  contactEmail: string;
  appUrl: string;
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
  pesoTotal: string;      // Total weight in carats
  cantidadGemas: string;  // Number of gems
  medida: string;         // Size/measurement (e.g., ring size, necklace length)
  diseno: string;         // Design/style description
  precioPorCt: string;    // Price per carat
  calidadMetal: string;   // Metal quality (e.g., 18k, 14k, 925)
  gramaje: string;        // Metal weight in grams
  imagen?: string;
  videoUrl?: string;
  gifUrl?: string; // Animated GIF for PDF export (generated from video)
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
  contactEmail: 'tierramadre.co@gmail.com',
  appUrl: 'tierra-madre-studio.vercel.app',
  footerMessage: 'Gracias por su preferencia',
  footerNote: 'Esta cotizacion es valida por el tiempo indicado. Los precios estan sujetos a disponibilidad. Las esmeraldas Tierra Madre cuentan con certificado de origen y autenticidad.',
};

// Storage key for quotation counter
const COTIZACION_COUNTER_KEY = STORAGE_KEYS.COTIZACION_COUNTER;

// Generate quotation number with sequential counter to avoid duplicates
export const generateQuotationNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;

  // Get counter from localStorage
  let counterData: { date: string; count: number } = { date: datePrefix, count: 0 };
  try {
    const stored = localStorage.getItem(COTIZACION_COUNTER_KEY);
    if (stored) {
      counterData = JSON.parse(stored);
      // Reset counter if it's a new day
      if (counterData.date !== datePrefix) {
        counterData = { date: datePrefix, count: 0 };
      }
    }
  } catch {
    // Ignore parse errors, use default
  }

  // Increment counter
  counterData.count += 1;

  // Save updated counter
  try {
    localStorage.setItem(COTIZACION_COUNTER_KEY, JSON.stringify(counterData));
  } catch {
    // Ignore storage errors
  }

  // Format: COT-YYYYMMDD-XXX (3-digit sequential number)
  const sequence = String(counterData.count).padStart(3, '0');
  return `COT-${datePrefix}-${sequence}`;
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

/**
 * Hook that returns a currency-aware price formatter for cotizaciones.
 * When the authorized user has USD mode active, prices are converted and formatted in USD.
 * For all other users, prices remain in COP (passthrough).
 */
export function useCotizacionFormat() {
  const { currency, convertPrice } = useCurrency();

  const formatPrice = useMemo(
    () => (amountCOP: number): string => {
      return formatCotizacionCurrency(convertPrice(amountCOP), currency);
    },
    [currency, convertPrice],
  );

  return { formatPrice, currency, convertPrice };
}

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

  // Draft management
  isDirty: boolean;
  hasDraft: boolean;
  restoreDraft: () => void;
  discardDraft: () => void;
}

export function useCotizacion(): UseCotizacionReturn {
  const form = useCotizacionForm();
  const data = useCotizacionData();

  // Derived totals that combine form (discount) and data (products, investments)
  const subtotal = data.productSubtotal + data.totalInvestment;
  const discount = subtotal * (form.discountPercent / 100);
  const total = subtotal - discount;

  // Reset all combines both sub-hook resets
  const resetAll = useCallback(() => {
    form.resetForm();
    data.resetData();
  }, [form, data]);

  return {
    // Form state
    quotationNumber: form.quotationNumber,
    setQuotationNumber: form.setQuotationNumber,
    regenerateQuotationNumber: form.regenerateQuotationNumber,
    clientName: form.clientName,
    setClientName: form.setClientName,
    clientPhone: form.clientPhone,
    setClientPhone: form.setClientPhone,
    clientEmail: form.clientEmail,
    setClientEmail: form.setClientEmail,
    clientDocument: form.clientDocument,
    setClientDocument: form.setClientDocument,
    asesorName: form.asesorName,
    setAsesorName: form.setAsesorName,
    date: form.date,
    setDate: form.setDate,
    validDays: form.validDays,
    setValidDays: form.setValidDays,
    expiryDate: form.expiryDate,
    expiryStr: form.expiryStr,
    notes: form.notes,
    setNotes: form.setNotes,
    discountPercent: form.discountPercent,
    setDiscountPercent: form.setDiscountPercent,
    businessSettings: form.businessSettings,
    setBusinessSettings: form.setBusinessSettings,

    // Data state
    products: data.products,
    addProductFromTreasure: data.addProductFromTreasure,
    addManualProduct: data.addManualProduct,
    removeProduct: data.removeProduct,
    manualProduct: data.manualProduct,
    setManualProduct: data.setManualProduct,
    resetManualProduct: data.resetManualProduct,
    investments: data.investments,
    updateInvestment: data.updateInvestment,
    resetInvestments: data.resetInvestments,
    customCosts: data.customCosts,
    addCustomCost: data.addCustomCost,
    removeCustomCost: data.removeCustomCost,
    investmentTotal: data.investmentTotal,
    customCostsTotal: data.customCostsTotal,
    totalInvestment: data.totalInvestment,
    productSubtotal: data.productSubtotal,

    // Combined totals
    subtotal,
    discount,
    total,

    // Combined actions
    resetAll,

    // Draft management
    isDirty: form.isDirty,
    hasDraft: form.hasDraft,
    restoreDraft: form.restoreDraft,
    discardDraft: form.discardDraft,
  };
}

export default useCotizacion;
