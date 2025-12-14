/**
 * Price Simulator Constants
 * Shared types, icons, and configuration.
 */

import React from 'react';
import {
  Gem,
  Award,
  CircleDollarSign,
  Sparkles,
  FileCheck,
  Gift,
  Plus,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface InvestmentItemWithIcon {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: number;
  unit?: string;
  unitLabel?: string;
  placeholder?: string;
}

export type ProductSource = 'gallery' | 'inventory';

// =============================================================================
// ICON MAPPING
// =============================================================================

export const INVESTMENT_ICONS: Record<string, React.ReactNode> = {
  emerald: React.createElement(Gem, { size: 18 }),
  gold: React.createElement(Award, { size: 18 }),
  silver: React.createElement(CircleDollarSign, { size: 18 }),
  setting: React.createElement(Sparkles, { size: 18 }),
  certification: React.createElement(FileCheck, { size: 18 }),
  packaging: React.createElement(Gift, { size: 18 }),
};

export const getInvestmentIcon = (id: string): React.ReactNode => {
  return INVESTMENT_ICONS[id] || React.createElement(Plus, { size: 18 });
};

// =============================================================================
// CATEGORY LABELS
// =============================================================================

export const CATEGORY_LABELS: Record<string, string> = {
  loose: 'Gema',
  ring: 'Anillo',
  pendant: 'Dije',
  earrings: 'Aretes',
};

export const getCategoryLabel = (category: string): string => {
  return CATEGORY_LABELS[category] || category;
};

// =============================================================================
// FILTER OPTIONS
// =============================================================================

export const STATUS_FILTERS = ['todas', 'disponibles', 'vendidas'] as const;

export const PRODUCT_TYPE_FILTERS = [
  { value: 'todas', label: 'Todas' },
  { value: 'gemas', label: 'Gemas' },
  { value: 'joyas', label: 'Joyas' },
  { value: 'lotes', label: 'Lotes' },
] as const;
