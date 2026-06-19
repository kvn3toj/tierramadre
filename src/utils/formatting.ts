/**
 * Shared formatting utilities for currency, colors, quality badges, and weight.
 * Extracted from TreasureBrowser, ProductDetail, and PriceSimulator.
 */

/**
 * Format carat weight with 2 decimal places (e.g. 0.50, 1.20, 3.00).
 */
export const formatCarats = (peso: string | number): string => {
  const n = typeof peso === 'number' ? peso : parseFloat(peso);
  return isNaN(n) ? String(peso) : n.toFixed(2);
};

/**
 * Format currency with abbreviated notation for large values.
 * Supports COP and USD modes.
 * @param value - The numeric value to format
 * @param currency - Currency mode (default: COP)
 * @returns Formatted string like "$1.5M", "$300K", "US$9.5K"
 */
export const formatCurrency = (value: number, currency: 'COP' | 'USD' = 'COP'): string => {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Format currency in full without abbreviation.
 * @param value - The numeric value to format
 * @param currency - Currency mode (default: COP)
 * @returns Formatted string like "$1,500,000" or "$9,524"
 */
export const formatFullCurrency = (value: number, currency: 'COP' | 'USD' = 'COP'): string => {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Format a percentage value.
 * @param value - The numeric percentage value
 * @returns Formatted string like "50.0%"
 */
export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

/**
 * Emerald color name to hex color mapping.
 */
const COLOR_MAP: Record<string, string> = {
  'Verde Vivido': '#059669',
  'Verde Muzo': '#065F46',
  'Verde Limón': '#84CC16',
  'Verde Menta': '#34D399',
  'Verde Natural': '#22C55E',
};

/**
 * Get the hex color for an emerald color name.
 * @param color - The emerald color name
 * @returns Hex color string
 */
export const getColorDot = (color: string): string => {
  return COLOR_MAP[color] || '#6B7280';
};

/**
 * Quality badge style configuration.
 */
export interface QualityBadgeStyle {
  label: string;
  bg: string;
  color: string;
  border: string;
}

/**
 * Get quality badge styling based on quality level.
 * Uses warm tones (amber, blue, purple) instead of green to avoid confusion with emerald colors.
 * Label uses the exact calidad value from Google Sheets.
 * @param calidad - The quality string
 * @returns Badge style object
 */
/**
 * Format collection name for display in dropdown.
 * Removes redundant "COLECCION" prefix since the dropdown is already labeled "Colección".
 * @param name - The raw collection name from data source
 * @returns Cleaned collection name without prefix
 */
export const formatCollectionName = (name: string): string => {
  return name
    .replace(/^COLECCION\s*/i, '')  // Remove "COLECCION " prefix
    .replace(/^Colección\s*/i, '')   // Remove "Colección " prefix
    .trim();
};

/**
 * Canonical key for a collection name, used to collapse duplicate/variant
 * spellings (prefix, casing, accents, extra whitespace) into one option and to
 * match filter selections across those variants. Genuine spelling differences
 * (e.g. "Montaña" vs "Motaña") intentionally remain distinct.
 * @param name - The raw collection name from the data source
 * @returns Lowercased, accent- and prefix-stripped, whitespace-collapsed key
 */
export const normalizeCollection = (name: string | null | undefined): string => {
  return formatCollectionName(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // strip diacritics
    .replace(/\s+/g, ' ')
    .trim();
};

// =============================================================================
// AMBASSADOR RATING
// =============================================================================

/**
 * Derive a pseudo-rating from product count for ambassador display.
 * @param productCount - Number of products the ambassador has
 * @returns Rating number (4.5-4.9) or null if no products
 */
export function deriveRating(productCount: number): number | null {
  if (productCount <= 0) return null;
  if (productCount >= 20) return 4.9;
  if (productCount >= 15) return 4.8;
  if (productCount >= 10) return 4.7;
  if (productCount >= 5) return 4.6;
  return 4.5;
}

// =============================================================================
// TIME FORMATTING
// =============================================================================

/**
 * Format a timestamp as relative time ago (e.g., "5m", "2h", "3d").
 * Used across analytics pages.
 * @param timestamp - ISO string or Unix timestamp
 * @returns Localized relative time string
 */
export const formatTimeAgo = (timestamp: string | number): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
  const diff = Date.now() - date.getTime();

  if (diff < 60000) return 'Ahora';
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return `hace ${mins} min`;
  }
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `hace ${hours} h`;
  }
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `hace ${days} d`;
  }

  return date.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
};

// =============================================================================
// ROLE FORMATTING
// =============================================================================

/**
 * Get display label for user role.
 * Handles both accessLevel codes and role text.
 * @param role - The role string (admin, embajador, full, provider, etc.)
 * @returns Spanish label for the role
 */
export const getRoleLabel = (role: string): string => {
  const r = role.toLowerCase();
  if (r === 'admin' || r.includes('admin')) return 'Admin';
  if (r === 'embajador' || r === 'ambassador') return 'Embajador';
  if (r === 'full' || r === 'asesor') return 'Asesor';
  if (r === 'provider' || r === 'proveedor') return 'Proveedor';
  return 'Usuario';
};

/**
 * Get color for user role display.
 * @param role - The role string
 * @returns Hex color for the role
 */
export const getRoleColor = (role: string): string => {
  const r = role.toLowerCase();
  if (r === 'admin' || r.includes('admin')) return '#C69C6D'; // goldAccent.primary
  if (r === 'embajador' || r === 'ambassador') return '#8B5CF6'; // Purple
  if (r === 'full' || r === 'asesor') return '#00AE7A'; // emeraldCore.primary
  if (r === 'provider' || r === 'proveedor') return '#3B82F6'; // Blue
  return '#6B7280'; // Gray
};

// =============================================================================
// QUALITY BADGES
// =============================================================================

export const getQualityBadge = (calidad: string): QualityBadgeStyle => {
  if (calidad.includes('SuperFina') || calidad === 'Fina') {
    return {
      label: calidad,
      bg: '#FEF3C7',      // Amber 100
      color: '#92400E',   // Amber 900
      border: '#F59E0B',  // Amber 500
    };
  }
  if (calidad.includes('Superior')) {
    return {
      label: calidad,
      bg: '#DBEAFE',      // Blue 100
      color: '#1E3A8A',   // Blue 900
      border: '#3B82F6',  // Blue 500
    };
  }
  if (calidad.includes('Fina')) {
    return {
      label: calidad,
      bg: '#F3E8FF',      // Purple 100
      color: '#6B21A8',   // Purple 800
      border: '#A855F7',  // Purple 500
    };
  }
  return {
    label: calidad || 'Comercial',
    bg: '#F3F4F6',        // Gray 100
    color: '#374151',     // Gray 700
    border: '#9CA3AF',    // Gray 400
  };
};

/**
 * Quality abbreviation definitions for tooltips.
 * Maps quality names to their full descriptions.
 */
const QUALITY_DEFINITIONS: Record<string, string> = {
  'SuperFina': 'Gema de color intenso, alta transparencia y minimas inclusiones',
  'Fina': 'Gema de buen color y transparencia con pocas inclusiones',
  'Superior Fina': 'Calidad intermedia-alta con buen brillo y color',
  'Superior': 'Gema con color medio y transparencia aceptable',
  'Comercial': 'Gema de calidad estandar para joyeria comercial',
  'Muzo': 'Origen Muzo — reconocido por verde intenso y alto valor',
  'Chivor': 'Origen Chivor — tono azul-verdoso caracteristico',
  'Coscuez': 'Origen Coscuez — verde profundo con excelente saturacion',
};

/**
 * Get a tooltip description for a quality abbreviation.
 */
export function getQualityTooltip(calidad: string): string {
  if (!calidad) return '';
  // Try exact match first
  if (QUALITY_DEFINITIONS[calidad]) return QUALITY_DEFINITIONS[calidad];
  // Try partial match
  for (const [key, value] of Object.entries(QUALITY_DEFINITIONS)) {
    if (calidad.includes(key)) return value;
  }
  return '';
}
