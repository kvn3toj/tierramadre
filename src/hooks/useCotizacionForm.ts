/**
 * useCotizacionForm Hook
 * Manages quotation form state: client info, quotation number, dates, notes, discount, and business settings.
 * Extracted from useCotizacion for better modularity.
 */
import { useState, useCallback, useMemo } from 'react';
import {
  BusinessSettings,
  DEFAULT_BUSINESS_SETTINGS,
  generateQuotationNumber,
} from './useCotizacion';

export interface UseCotizacionFormReturn {
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

  // Business settings
  businessSettings: BusinessSettings;
  setBusinessSettings: React.Dispatch<React.SetStateAction<BusinessSettings>>;

  // Reset
  resetForm: () => void;
}

export function useCotizacionForm(): UseCotizacionFormReturn {
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

  // Regenerate quotation number
  const regenerateQuotationNumber = useCallback(() => {
    setQuotationNumber(generateQuotationNumber());
  }, []);

  // Reset form fields
  const resetForm = useCallback(() => {
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
    setBusinessSettings(DEFAULT_BUSINESS_SETTINGS);
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
    businessSettings,
    setBusinessSettings,
    resetForm,
  };
}
