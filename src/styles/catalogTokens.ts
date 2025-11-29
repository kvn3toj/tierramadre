/**
 * 🎨 EUNOIA - Catalog Visual System
 * Sacred Geometry Tokens for Tierra Madre Catalogs
 *
 * Philosophy: Each catalog is a mandala of information,
 * organized in sacred proportions and emerald consciousness.
 */

import { alpha } from '@mui/material/styles';

// 🌟 GOLDEN RATIO - φ (phi) = 1.618
const PHI = 1.618;
const PHI_INVERSE = 0.618;

// 🎨 EMERALD SPECTRUM - Sacred color frequencies
export const EMERALD_PALETTE = {
  // Primary emerald gradations
  deep: '#0A3D2C',      // Deep forest - grounding
  rich: '#0F5239',      // Rich emerald - abundance
  core: '#14694A',      // Core emerald - vitality
  bright: '#1A9966',    // Bright emerald - growth
  light: '#3DB37F',     // Light emerald - expansion

  // Accent frequencies
  gold: '#D4AF37',      // Colombian gold
  copper: '#B87333',    // Earth copper
  crystal: '#E8F5E9',   // Crystal clarity
  shadow: '#1C1C1C',    // Sacred shadow
};

// ✨ CATALOG CATEGORIES - Each with unique vibration
export const CATALOG_CATEGORIES = {
  raw: {
    name: 'Acceso Total',
    icon: '💎',
    color: EMERALD_PALETTE.deep,
    gradient: `linear-gradient(135deg, ${EMERALD_PALETTE.deep} 0%, ${EMERALD_PALETTE.rich} 100%)`,
    description: 'Esmeraldas en Bruto',
  },
  process: {
    name: 'Proceso Real',
    icon: '⚡',
    color: EMERALD_PALETTE.rich,
    gradient: `linear-gradient(135deg, ${EMERALD_PALETTE.rich} 0%, ${EMERALD_PALETTE.core} 100%)`,
    description: 'Cómo lo Hacemos',
  },
  gifts: {
    name: 'Gifts',
    icon: '🎁',
    color: EMERALD_PALETTE.bright,
    gradient: `linear-gradient(135deg, ${EMERALD_PALETTE.bright} 0%, ${EMERALD_PALETTE.light} 100%)`,
    description: 'Regalos de Esmeralda',
  },
  power: {
    name: 'Poder',
    icon: '🌍',
    color: EMERALD_PALETTE.core,
    gradient: `linear-gradient(135deg, ${EMERALD_PALETTE.core} 0%, ${EMERALD_PALETTE.bright} 100%)`,
    description: 'Poder de la Tierra Madre',
  },
  integration: {
    name: 'Integración',
    icon: '🔗',
    color: EMERALD_PALETTE.gold,
    gradient: `linear-gradient(135deg, ${EMERALD_PALETTE.gold} 0%, ${EMERALD_PALETTE.copper} 100%)`,
    description: 'ARE Integration',
  },
  trust: {
    name: 'Trust',
    icon: '🛡️',
    color: EMERALD_PALETTE.copper,
    gradient: `linear-gradient(135deg, ${EMERALD_PALETTE.copper} 0%, ${EMERALD_PALETTE.gold} 100%)`,
    description: 'ARE Trust Origin',
  },
};

// 📐 SACRED GEOMETRY - Proportions and spacing
export const SACRED_SPACING = {
  // Base unit: 8px (harmonic foundation)
  base: 8,

  // Fibonacci sequence for spacing harmony
  fibonacci: {
    xs: 8,    // 1 unit
    sm: 13,   // ~1.618 units
    md: 21,   // ~2.618 units
    lg: 34,   // ~4.236 units
    xl: 55,   // ~6.854 units
  },

  // Golden ratio multipliers
  phi: {
    minor: PHI_INVERSE * 8,  // ~5px
    major: PHI * 8,          // ~13px
    double: PHI * PHI * 8,   // ~21px
  },
};

// 🎭 ELEVATION LAYERS - Shadow consciousness
export const CATALOG_ELEVATIONS = {
  card: {
    rest: '0 4px 12px rgba(10, 61, 44, 0.15)',
    hover: '0 8px 24px rgba(10, 61, 44, 0.25)',
    active: '0 12px 32px rgba(10, 61, 44, 0.35)',
  },
  overlay: {
    light: '0 2px 8px rgba(0, 0, 0, 0.1)',
    medium: '0 4px 16px rgba(0, 0, 0, 0.15)',
    heavy: '0 8px 32px rgba(0, 0, 0, 0.25)',
  },
};

// 🌊 ANIMATION FREQUENCIES - Motion as meditation
export const CATALOG_TRANSITIONS = {
  // Timing functions based on natural easing
  easing: {
    entrance: 'cubic-bezier(0.4, 0, 0.2, 1)',      // Deceleration
    exit: 'cubic-bezier(0.4, 0, 1, 1)',            // Acceleration
    emphasis: 'cubic-bezier(0.4, 0, 0.6, 1)',      // Standard
    organic: 'cubic-bezier(0.34, 1.56, 0.64, 1)',  // Overshoot (playful)
  },

  // Duration in ms - Fibonacci-based
  duration: {
    fast: 144,      // ~0.144s (Fibonacci 144)
    normal: 233,    // ~0.233s (Fibonacci 233)
    slow: 377,      // ~0.377s (Fibonacci 377)
    slower: 610,    // ~0.610s (phi-based)
  },
};

// 🔮 GLASS MORPHISM - Crystal consciousness
export const GLASS_EFFECTS = {
  light: {
    background: (color: string) => alpha(color, 0.08),
    blur: 'blur(8px)',
    border: (color: string) => `1px solid ${alpha(color, 0.12)}`,
  },
  medium: {
    background: (color: string) => alpha(color, 0.12),
    blur: 'blur(12px)',
    border: (color: string) => `1px solid ${alpha(color, 0.18)}`,
  },
  heavy: {
    background: (color: string) => alpha(color, 0.18),
    blur: 'blur(16px)',
    border: (color: string) => `1px solid ${alpha(color, 0.24)}`,
  },
};

// 📏 CATALOG CARD DIMENSIONS - Golden ratio proportions
export const CARD_DIMENSIONS = {
  // Width × Height should approximate φ ratio
  standard: {
    width: 340,
    height: 340 * PHI_INVERSE,  // ~210px (maintains golden ratio)
  },
  compact: {
    width: 280,
    height: 280 * PHI_INVERSE,  // ~173px
  },
  expanded: {
    width: 420,
    height: 420 * PHI_INVERSE,  // ~260px
  },
};

// 🎨 THEME-AWARE HELPERS
export const getCatalogThemeColors = (mode: 'light' | 'dark') => ({
  background: mode === 'dark' ? EMERALD_PALETTE.shadow : '#FFFFFF',
  surface: mode === 'dark' ? '#2C2C2C' : '#F5F5F5',
  text: {
    primary: mode === 'dark' ? '#FFFFFF' : '#1C1C1C',
    secondary: mode === 'dark' ? alpha('#FFFFFF', 0.7) : alpha('#1C1C1C', 0.7),
  },
  border: mode === 'dark'
    ? alpha(EMERALD_PALETTE.bright, 0.2)
    : alpha(EMERALD_PALETTE.deep, 0.1),
});

// 🌟 CATALOG FILE TO CATEGORY MAPPING
export const CATALOG_FILES: Record<string, CategoryKey> = {
  'ACCESO TOTAL ESMERLADAS EN BRUTO.pptx': 'raw',
  'CÓMO LO HACEMOS REAL.pptx': 'process',
  'Copia de EMERALD GIFTs_.pptx': 'gifts',
  'EL PODER DE LA TIERRA MADRE_.pptx': 'power',
  'Integración ARE.pptx': 'integration',
  'LOTE ORIGEN ARE TRÜST.pptx': 'trust',
};

export type CategoryKey = keyof typeof CATALOG_CATEGORIES;
