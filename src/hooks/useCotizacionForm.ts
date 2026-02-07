/**
 * useCotizacionForm Hook
 * Manages quotation form state: client info, quotation number, dates, notes, discount, and business settings.
 * Extracted from useCotizacion for better modularity.
 *
 * Features:
 * - Auto-saves draft to sessionStorage (debounced 500ms)
 * - Hydrates from sessionStorage on mount if draft exists
 * - Exposes isDirty flag for unsaved changes warning
 */
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  BusinessSettings,
  DEFAULT_BUSINESS_SETTINGS,
  generateQuotationNumber,
} from './useCotizacion';

const DRAFT_KEY = 'cotizacion_draft';
const DRAFT_DEBOUNCE_MS = 500;

interface DraftState {
  quotationNumber: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientDocument: string;
  asesorName: string;
  date: string;
  validDays: number;
  notes: string;
  discountPercent: number;
  businessSettings: BusinessSettings;
  savedAt: number;
}

function loadDraft(): DraftState | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveDraft(state: DraftState): void {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage full or unavailable
  }
}

function clearDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

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

  // Draft management
  isDirty: boolean;
  hasDraft: boolean;
  restoreDraft: () => void;
  discardDraft: () => void;
}

export function useCotizacionForm(): UseCotizacionFormReturn {
  // Check for existing draft on mount
  const existingDraft = useRef(loadDraft());
  const [hasDraft, setHasDraft] = useState(!!existingDraft.current);

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

  // Track dirty state (any field has been modified)
  const isDirty = clientName !== '' || clientPhone !== '' || clientEmail !== '' ||
    clientDocument !== '' || notes !== '' || discountPercent !== 0;

  // Debounced auto-save to sessionStorage
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!isDirty) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveDraft({
        quotationNumber,
        clientName,
        clientPhone,
        clientEmail,
        clientDocument,
        asesorName,
        date,
        validDays,
        notes,
        discountPercent,
        businessSettings,
        savedAt: Date.now(),
      });
    }, DRAFT_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [quotationNumber, clientName, clientPhone, clientEmail, clientDocument,
      asesorName, date, validDays, notes, discountPercent, businessSettings, isDirty]);

  // Restore draft from sessionStorage
  const restoreDraft = useCallback(() => {
    const draft = existingDraft.current;
    if (!draft) return;

    setQuotationNumber(draft.quotationNumber);
    setClientName(draft.clientName);
    setClientPhone(draft.clientPhone);
    setClientEmail(draft.clientEmail);
    setClientDocument(draft.clientDocument);
    setAsesorName(draft.asesorName);
    setDate(draft.date);
    setValidDays(draft.validDays);
    setNotes(draft.notes);
    setDiscountPercent(draft.discountPercent);
    setBusinessSettings(draft.businessSettings);
    setHasDraft(false);
  }, []);

  // Discard draft
  const discardDraft = useCallback(() => {
    clearDraft();
    existingDraft.current = null;
    setHasDraft(false);
  }, []);

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

  // Reset form fields and clear draft
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
    clearDraft();
    setHasDraft(false);
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
    isDirty,
    hasDraft,
    restoreDraft,
    discardDraft,
  };
}
