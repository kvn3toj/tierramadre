/**
 * Cotizacion Constants
 * Shared colors and configuration for quotation components.
 */

import { documentColors } from '../../design-system/tokens';

export const brandColors = {
  emerald: documentColors.emerald.primary,
  emeraldDark: documentColors.emerald.deep,
  emeraldLight: documentColors.emerald.light,
  gold: documentColors.gold.primary,
  goldLight: documentColors.gold.light,
  background: documentColors.background.container,
  cream: documentColors.background.paper,
  gray: documentColors.text.secondary,
  lightGray: '#F1F5F9',
  textPrimary: documentColors.text.primary,
  border: documentColors.border.default,
};

export type BrandColors = typeof brandColors;
