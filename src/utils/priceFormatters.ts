/**
 * Price Formatting Utilities for Colombian Peso (COP)
 * Consolidated from ProductRequestsHub, ProviderQuotationForm, and AsesorProfile.
 */

/**
 * Format a number with Colombian thousands separator (dots).
 * Used for input display in forms.
 * @param value - The numeric value
 * @returns Formatted string like "1.500.000"
 */
export const formatPriceCOP = (value: number | undefined): string => {
  if (!value) return '';
  return value.toLocaleString('es-CO');
};

/**
 * Parse a formatted COP price string back to a number.
 * Removes dots and non-numeric characters.
 * @param value - The formatted string like "1.500.000"
 * @returns Numeric value
 */
export const parsePriceCOP = (value: string): number => {
  const numericString = value.replace(/\./g, '').replace(/[^\d]/g, '');
  return parseInt(numericString, 10) || 0;
};

/**
 * Format a budget value in compact notation (K/M).
 * @param min - Minimum budget
 * @param max - Maximum budget
 * @returns Formatted range like "$1M - $5M"
 */
export const formatBudgetRange = (min?: number, max?: number): string => {
  const format = (value: number): string => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${Math.round(value / 1000)}K`;
    return `$${value.toLocaleString('es-CO')}`;
  };

  if (min && max) {
    return `${format(min)} - ${format(max)}`;
  }
  if (max) {
    return `Hasta ${format(max)}`;
  }
  if (min) {
    return `Desde ${format(min)}`;
  }
  return 'No especificado';
};

/**
 * Format a single budget value in compact notation.
 * @param value - The budget value
 * @returns Formatted string like "$1.5M" or "$300K"
 */
export const formatBudgetCompact = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${value.toLocaleString('es-CO')}`;
};
