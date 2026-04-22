/**
 * Receipt Theme Definitions
 * Design system tokens for receipt dark/light themes.
 */

import {
  emeraldCore,
  surfacesLight,
  surfacesDark,
} from '../../../../design-system/tokens/colors';
import { primitiveColors } from '../../../../design-system';

// Logo brand green
export const logoGreen = emeraldCore.primary;

// Receipt themes
export const receiptThemes = {
  dark: {
    bg: surfacesDark.background.secondary,
    headerBg: surfacesDark.background.primary,
    cardBg: surfacesDark.background.tertiary,
    text: surfacesDark.text.primary,
    textSecondary: surfacesDark.text.secondary,
    textMuted: surfacesDark.text.tertiary,
    border: surfacesDark.border.light,
    accent: logoGreen,
    metallic: primitiveColors.metallic.silver[400],
  },
  light: {
    bg: surfacesLight.background.secondary,
    headerBg: primitiveColors.metallic.silver[100],
    cardBg: surfacesLight.background.tertiary,
    text: surfacesLight.text.primary,
    textSecondary: surfacesLight.text.secondary,
    textMuted: surfacesLight.text.tertiary,
    border: surfacesLight.border.default,
    accent: logoGreen,
    metallic: primitiveColors.metallic.silver[300],
  },
};

export type ReceiptTheme = keyof typeof receiptThemes;
export type ReceiptThemeColors = typeof receiptThemes.dark;

// Document types
export type DocumentType = 'receipt' | 'invoice';

// Document type labels interface
export interface DocumentTypeLabels {
  receipt: string;
  invoice: string;
}

// Business settings interface
export interface BusinessSettings {
  contactPhone: string;
  contactEmail: string;
  nit: string;
  footerMessage: string;
  footerNote: string;
  documentTypeLabels: DocumentTypeLabels;
}

// Default business settings
export const defaultBusinessSettings: BusinessSettings = {
  contactPhone: '+57 311 305 2755',
  contactEmail: 'direccion.tierramadre@gmail.com',
  nit: 'NIT: 902.028.863-3',
  footerMessage: 'Gracias por su preferencia',
  footerNote: 'Este documento es un comprobante de pago válido. Las esmeraldas Tierra Madre cuentan con certificado de origen y autenticidad.',
  documentTypeLabels: {
    receipt: 'Recibo de Compra',
    invoice: 'Factura',
  },
};

// Payment method labels
export const paymentMethodLabels: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta de Crédito/Débito',
  transfer: 'Transferencia Bancaria',
  crypto: 'Criptomoneda',
};

// Generate unique receipt number
export const generateReceiptNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `TM-${year}${month}-${random}`;
};

// Format currency
export const formatCurrency = (amount: number, currency: 'USD' | 'COP' = 'USD'): string => {
  if (currency === 'COP') {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

// Format date
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};
