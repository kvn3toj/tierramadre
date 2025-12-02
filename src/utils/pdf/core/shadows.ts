/**
 * PDF Shadow Utilities
 * "Emerald iOS" Design System → jsPDF Integration
 *
 * Simulates iOS-style shadows using layered semi-transparent rectangles.
 * jsPDF doesn't support native shadows, so we fake them with graphics state opacity.
 */

import jsPDF, { GState } from 'jspdf';
import { BORDER_RADIUS_MM } from './spacing';

/**
 * Shadow Style Levels
 * Matches iOS elevation hierarchy
 */
export type ShadowStyle = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'emerald';

/**
 * Shadow Layer Configuration
 * Each shadow is composed of multiple layers with different offsets and opacities
 */
interface ShadowLayer {
  offsetX: number;    // Horizontal offset in mm
  offsetY: number;    // Vertical offset in mm
  blur: number;       // Simulated blur (number of layers)
  opacity: number;    // Opacity 0-1
}

/**
 * iOS Shadow Configurations
 * Mapped to design tokens from shadows.ts
 */
const SHADOW_CONFIGS: Record<ShadowStyle, ShadowLayer[]> = {
  /**
   * No Shadow
   */
  none: [],

  /**
   * Extra Small Shadow
   * Subtle depth, minimal elevation
   */
  xs: [
    { offsetX: 0, offsetY: 0.3, blur: 1, opacity: 0.04 },
  ],

  /**
   * Small Shadow
   * Light elevation, cards at rest
   */
  sm: [
    { offsetX: 0, offsetY: 0.5, blur: 2, opacity: 0.06 },
    { offsetX: 0, offsetY: 0.3, blur: 1, opacity: 0.04 },
  ],

  /**
   * Medium Shadow
   * Standard card elevation, modals
   */
  md: [
    { offsetX: 0, offsetY: 1, blur: 3, opacity: 0.08 },
    { offsetX: 0, offsetY: 0.7, blur: 2, opacity: 0.06 },
    { offsetX: 0, offsetY: 0.3, blur: 1, opacity: 0.04 },
  ],

  /**
   * Large Shadow
   * High elevation, floating elements
   */
  lg: [
    { offsetX: 0, offsetY: 2.5, blur: 4, opacity: 0.1 },
    { offsetX: 0, offsetY: 1.5, blur: 3, opacity: 0.08 },
    { offsetX: 0, offsetY: 1, blur: 2, opacity: 0.06 },
    { offsetX: 0, offsetY: 0.3, blur: 1, opacity: 0.04 },
  ],

  /**
   * Extra Large Shadow
   * Maximum elevation, modals over content
   */
  xl: [
    { offsetX: 0, offsetY: 5, blur: 6, opacity: 0.12 },
    { offsetX: 0, offsetY: 3, blur: 4, opacity: 0.1 },
    { offsetX: 0, offsetY: 2, blur: 3, opacity: 0.08 },
    { offsetX: 0, offsetY: 1, blur: 2, opacity: 0.04 },
  ],

  /**
   * Emerald Glow Shadow
   * Brand-colored shadow for emphasis
   */
  emerald: [
    { offsetX: 0, offsetY: 1, blur: 4, opacity: 0.25 },
    { offsetX: 0, offsetY: 0.5, blur: 2, opacity: 0.15 },
  ],
};

/**
 * Draw iOS-style shadow beneath a rectangle
 *
 * @param pdf - jsPDF instance
 * @param x - X position of element (mm)
 * @param y - Y position of element (mm)
 * @param width - Width of element (mm)
 * @param height - Height of element (mm)
 * @param style - Shadow style level
 * @param borderRadius - Border radius in mm (default: 0 for sharp corners)
 * @param emeraldGlow - Use emerald color for shadow (default: false for black)
 *
 * @example
 * drawIOSShadow(pdf, 20, 40, 80, 100, 'md', 4);
 * // Card shadow under element at (20, 40) with 4mm corner radius
 */
export function drawIOSShadow(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  style: ShadowStyle = 'sm',
  borderRadius: number = 0,
  emeraldGlow: boolean = false
): void {
  const layers = SHADOW_CONFIGS[style];

  if (layers.length === 0) return;

  layers.forEach(layer => {
    // Set shadow color
    if (emeraldGlow || style === 'emerald') {
      // Emerald glow: #00AE7A
      pdf.setFillColor(0, 174, 122);
    } else {
      // Standard shadow: black
      pdf.setFillColor(0, 0, 0);
    }

    // Apply opacity
    pdf.setGState(new GState({ opacity: layer.opacity }));

    // Draw shadow layers with blur simulation
    for (let i = 0; i < layer.blur; i++) {
      const blurOffset = i * 0.2; // Each blur layer slightly offset
      const shadowX = x + layer.offsetX;
      const shadowY = y + layer.offsetY + blurOffset;

      if (borderRadius > 0) {
        // Rounded rectangle shadow
        pdf.roundedRect(shadowX, shadowY, width, height, borderRadius, borderRadius, 'F');
      } else {
        // Sharp rectangle shadow
        pdf.rect(shadowX, shadowY, width, height, 'F');
      }
    }
  });

  // Reset graphics state to full opacity
  pdf.setGState(new GState({ opacity: 1 }));
}

/**
 * Draw shadow for a card element
 * Convenience function with standard card shadow
 *
 * @param pdf - jsPDF instance
 * @param x - X position
 * @param y - Y position
 * @param width - Width
 * @param height - Height
 *
 * @example
 * drawCardShadow(pdf, 20, 40, 80, 100);
 */
export function drawCardShadow(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  drawIOSShadow(pdf, x, y, width, height, 'sm', BORDER_RADIUS_MM.md);
}

/**
 * Draw shadow for a modal/dialog
 * Stronger shadow for floating elements
 *
 * @param pdf - jsPDF instance
 * @param x - X position
 * @param y - Y position
 * @param width - Width
 * @param height - Height
 */
export function drawModalShadow(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  drawIOSShadow(pdf, x, y, width, height, 'lg', BORDER_RADIUS_MM.lg);
}

/**
 * Draw emerald glow shadow
 * Brand-colored shadow for emphasis
 *
 * @param pdf - jsPDF instance
 * @param x - X position
 * @param y - Y position
 * @param width - Width
 * @param height - Height
 */
export function drawEmeraldGlow(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  drawIOSShadow(pdf, x, y, width, height, 'emerald', BORDER_RADIUS_MM.md, true);
}

/**
 * Draw text shadow for headlines
 * Subtle shadow behind text (rare in iOS, but useful for hero text on images)
 *
 * @param pdf - jsPDF instance
 * @param text - Text content
 * @param x - X position
 * @param y - Y position
 * @param fontSize - Font size in points
 *
 * @example
 * drawTextShadow(pdf, 'Tierra Madre', 50, 60, 32);
 * pdf.text('Tierra Madre', 50, 60);
 */
export function drawTextShadow(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number
): void {
  // Draw shadow (black, subtle offset)
  pdf.setTextColor(0, 0, 0);
  pdf.setGState(new GState({ opacity: 0.3 }));
  pdf.text(text, x + 0.3, y + 0.3);

  // Reset opacity
  pdf.setGState(new GState({ opacity: 1 }));
}

/**
 * Apply shadow to image
 * Places shadow behind image area
 *
 * @param pdf - jsPDF instance
 * @param x - X position of image
 * @param y - Y position of image
 * @param width - Width of image
 * @param height - Height of image
 * @param style - Shadow style (default: 'sm')
 */
export function drawImageShadow(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  style: ShadowStyle = 'sm'
): void {
  // Draw shadow first (so image appears on top)
  drawIOSShadow(pdf, x, y, width, height, style, 0);
}
