/**
 * PDF Slide / Carousel Layout
 * Horizontal cover page and carousel (one-product-per-page) layout generation.
 *
 * Extracted from pdfGenerator.ts for modularity.
 */

import jsPDF, { GState } from 'jspdf';
import {
  getThemeColors as getIOSThemeColors,
  setFillColor,
  setStrokeColor,
  setTextColor,
  type ThemeMode,
} from './core/colorUtils';
import { SPACING_MM, BORDER_RADIUS_MM } from './core/spacing';
import { applyIOSTextStyle, applyCustomTextStyle } from './core/typography';
import { drawIOSShadow, drawCardShadow } from './core/shadows';
import { getLogoDimensions } from './components/logo';
import { LOGO_ASPECT_RATIO } from './pdfCommon';
import type { Emerald, CatalogOptions } from './pdfCommon';

// =============================================================================
// HORIZONTAL COVER PAGE (iOS HIG Premium Style)
// =============================================================================

export function addHorizontalCoverPage(
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  title?: string,
  totalItems?: number,
  logoBase64?: string,
  theme: 'dark' | 'light' = 'dark'
) {
  const iosColors = getIOSThemeColors(theme as ThemeMode);
  const margin = SPACING_MM.xl;

  // Background - iOS surface
  setFillColor(pdf, iosColors.background);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Subtle card background for content area (iOS elevated surface)
  const cardMargin = margin + 2;
  setFillColor(pdf, iosColors.backgroundSecondary);
  pdf.roundedRect(
    cardMargin,
    cardMargin,
    pageWidth - cardMargin * 2,
    pageHeight - cardMargin * 2,
    BORDER_RADIUS_MM.lg,
    BORDER_RADIUS_MM.lg,
    'F'
  );

  // Emerald accent border (iOS style - thin, subtle)
  setStrokeColor(pdf, iosColors.emeraldPrimary);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(
    cardMargin,
    cardMargin,
    pageWidth - cardMargin * 2,
    pageHeight - cardMargin * 2,
    BORDER_RADIUS_MM.lg,
    BORDER_RADIUS_MM.lg
  );

  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;

  // Add Logo Image - iOS HIG centered, with subtle shadow
  if (logoBase64) {
    try {
      const logoHeight = 32;
      const logoWidth = logoHeight * LOGO_ASPECT_RATIO;
      const logoX = centerX - logoWidth / 2;
      const logoY = centerY - 35;

      // Subtle shadow beneath logo
      drawIOSShadow(pdf, logoX, logoY, logoWidth, logoHeight, 'sm');

      pdf.addImage(
        logoBase64,
        'PNG',
        logoX,
        logoY,
        logoWidth,
        logoHeight,
        undefined,
        'MEDIUM'
      );
    } catch (e) {
      console.error('Failed to add logo to PDF:', e);
      applyIOSTextStyle(pdf, 'largeTitle', iosColors.emeraldPrimary, theme as ThemeMode);
      pdf.text('TIERRA MADRE', centerX, centerY - 10, { align: 'center' });
    }
  } else {
    applyIOSTextStyle(pdf, 'largeTitle', iosColors.emeraldPrimary, theme as ThemeMode);
    pdf.text('TIERRA MADRE', centerX, centerY - 10, { align: 'center' });
  }

  // Decorative emerald accent line under logo (iOS minimalist)
  setStrokeColor(pdf, iosColors.emeraldPrimary);
  pdf.setLineWidth(0.4);
  pdf.line(centerX - 40, centerY + 8, centerX + 40, centerY + 8);

  // Tagline - iOS secondary text style
  applyIOSTextStyle(pdf, 'subheadline', iosColors.textSecondary, theme as ThemeMode);
  pdf.text('E S E N C I A   Y   P O D E R', centerX, centerY + 20, { align: 'center' });

  // Catalog title - iOS title2
  if (title) {
    applyIOSTextStyle(pdf, 'title2', iosColors.textPrimary, theme as ThemeMode);
    pdf.text(title, centerX, centerY + 36, { align: 'center' });
  }

  // Collection count - iOS footnote
  if (totalItems) {
    applyIOSTextStyle(pdf, 'footnote', iosColors.textTertiary, theme as ThemeMode);
    const piezasText = totalItems === 1 ? '1 pieza exclusiva' : `${totalItems} piezas exclusivas`;
    pdf.text(piezasText, centerX, centerY + 48, { align: 'center' });
  }

  // Bottom badge area - iOS pill badge style
  const badgeY = pageHeight - margin - 20;

  // Badge background pill
  const badgeWidth = 100;
  const badgeHeight = 6;
  setFillColor(pdf, iosColors.emeraldPrimary);
  pdf.setGState(new GState({ opacity: 0.1 }));
  pdf.roundedRect(centerX - badgeWidth / 2, badgeY - 2, badgeWidth, badgeHeight, 3, 3, 'F');
  pdf.setGState(new GState({ opacity: 1 }));

  // Badge text
  applyCustomTextStyle(pdf, 'pageNumber', iosColors.emeraldPrimary, theme as ThemeMode);
  pdf.setFont('helvetica', 'bold');
  pdf.text('100% ESMERALDAS COLOMBIANAS', centerX, badgeY + 2, { align: 'center' });

  // Sub-badge text
  applyIOSTextStyle(pdf, 'caption1', iosColors.textTertiary, theme as ThemeMode);
  pdf.text('Certificadas • Naturales • Exclusivas', centerX, badgeY + 10, { align: 'center' });

  // Footer - Date and website (iOS footer style)
  const footerY = pageHeight - margin - 3;

  applyIOSTextStyle(pdf, 'caption1', iosColors.textTertiary, theme as ThemeMode);
  const date = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long' });
  pdf.text(date.charAt(0).toUpperCase() + date.slice(1), margin + 4, footerY);

  setTextColor(pdf, iosColors.emeraldPrimary);
  pdf.text('tierramadre.co', pageWidth - margin - 4, footerY, { align: 'right' });
}

// =============================================================================
// HORIZONTAL CAROUSEL LAYOUT (iOS HIG Premium Style)
// =============================================================================

export async function addHorizontalCarouselLayout(
  pdf: jsPDF,
  emeralds: Emerald[],
  options: CatalogOptions,
  _margin: number,
  _contentWidth: number,
  pageWidth: number,
  pageHeight: number,
  logoBase64?: string,
  theme: 'dark' | 'light' = 'dark'
) {
  const iosColors = getIOSThemeColors(theme as ThemeMode);
  const iosMargin = SPACING_MM.xl;

  for (let i = 0; i < emeralds.length; i++) {
    const emerald = emeralds[i];
    pdf.addPage();

    // Background - iOS primary surface
    setFillColor(pdf, iosColors.background);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // === iOS HEADER with Logo ===
    // Logo positioned at top-right
    if (logoBase64) {
      const logoHeight = 14;
      const logoDims = getLogoDimensions(logoHeight);
      const logoX = pageWidth - iosMargin - logoDims.width;
      const logoY = iosMargin;

      pdf.addImage(
        logoBase64,
        'PNG',
        logoX,
        logoY,
        logoDims.width,
        logoDims.height,
        undefined,
        'MEDIUM'
      );
    }

    // Page number at top-left (iOS style)
    applyIOSTextStyle(pdf, 'footnote', iosColors.textTertiary, theme as ThemeMode);
    pdf.text(`${i + 1} / ${emeralds.length}`, iosMargin, iosMargin + 4);

    // Header accent line
    const headerLineY = iosMargin + 18;
    setStrokeColor(pdf, iosColors.emeraldPrimary);
    pdf.setLineWidth(0.3);
    pdf.line(iosMargin, headerLineY, pageWidth - iosMargin, headerLineY);

    // === LEFT SIDE: IMAGE (55% of width) ===
    const contentStartY = headerLineY + SPACING_MM.md;
    const imageAreaWidth = (pageWidth - iosMargin * 2) * 0.55;
    const imageX = iosMargin;
    const imageWidth = imageAreaWidth - SPACING_MM.lg;
    const imageHeight = pageHeight - contentStartY - iosMargin - 20;
    const imageY = contentStartY;

    // iOS card shadow for image
    drawCardShadow(pdf, imageX, imageY, imageWidth, imageHeight);

    // Image card background
    setFillColor(pdf, iosColors.card);
    pdf.roundedRect(imageX, imageY, imageWidth, imageHeight, BORDER_RADIUS_MM.md, BORDER_RADIUS_MM.md, 'F');

    // Subtle border
    setStrokeColor(pdf, iosColors.border);
    pdf.setLineWidth(0.2);
    pdf.roundedRect(imageX, imageY, imageWidth, imageHeight, BORDER_RADIUS_MM.md, BORDER_RADIUS_MM.md);

    if (emerald.mediaData) {
      try {
        // Clip image inside rounded rect (approximate with inset)
        const imgInset = 2;
        pdf.addImage(
          emerald.mediaData,
          'JPEG',
          imageX + imgInset,
          imageY + imgInset,
          imageWidth - imgInset * 2,
          imageHeight - imgInset * 2,
          undefined,
          'MEDIUM'
        );
      } catch {
        setFillColor(pdf, iosColors.backgroundSecondary);
        pdf.rect(imageX + 2, imageY + 2, imageWidth - 4, imageHeight - 4, 'F');
        applyIOSTextStyle(pdf, 'callout', iosColors.textTertiary, theme as ThemeMode);
        pdf.text('Imagen no disponible', imageX + imageWidth / 2, imageY + imageHeight / 2, { align: 'center' });
      }
    }

    // === RIGHT SIDE: INFO CARD (45% of width) ===
    const infoX = iosMargin + imageAreaWidth;
    const infoWidth = pageWidth - iosMargin - infoX;
    const infoHeight = imageHeight;
    let infoY = contentStartY;

    // Info card shadow
    drawCardShadow(pdf, infoX, infoY, infoWidth, infoHeight);

    // Info card background
    setFillColor(pdf, iosColors.card);
    pdf.roundedRect(infoX, infoY, infoWidth, infoHeight, BORDER_RADIUS_MM.md, BORDER_RADIUS_MM.md, 'F');

    // Subtle border
    setStrokeColor(pdf, iosColors.border);
    pdf.setLineWidth(0.2);
    pdf.roundedRect(infoX, infoY, infoWidth, infoHeight, BORDER_RADIUS_MM.md, BORDER_RADIUS_MM.md);

    // Inner padding
    const padding = SPACING_MM.md;
    const innerX = infoX + padding;
    const innerWidth = infoWidth - padding * 2;
    infoY += padding + 4;

    // Product name - iOS title1
    applyIOSTextStyle(pdf, 'title1', iosColors.textPrimary, theme as ThemeMode);
    const nameLines = pdf.splitTextToSize(emerald.name.toUpperCase(), innerWidth);
    pdf.text(nameLines[0], innerX + innerWidth / 2, infoY, { align: 'center' });
    if (nameLines[1]) {
      infoY += 8;
      pdf.text(nameLines[1], innerX + innerWidth / 2, infoY, { align: 'center' });
    }
    infoY += 10;

    // Category pill badge
    const categoryLabels: Record<string, string> = {
      loose: 'Gema',
      ring: 'Anillo con Esmeralda',
      pendant: 'Dije / Colgante',
      earrings: 'Aretes con Esmeraldas',
    };
    const category = categoryLabels[emerald.category] || 'Esmeralda Colombiana';

    // Pill background
    applyIOSTextStyle(pdf, 'callout', iosColors.emeraldPrimary, theme as ThemeMode);
    const categoryWidth = pdf.getTextWidth(category) + 8;
    setFillColor(pdf, iosColors.emeraldPrimary);
    pdf.setGState(new GState({ opacity: 0.12 }));
    pdf.roundedRect(innerX + (innerWidth - categoryWidth) / 2, infoY - 4, categoryWidth, 7, 3.5, 3.5, 'F');
    pdf.setGState(new GState({ opacity: 1 }));

    setTextColor(pdf, iosColors.emeraldPrimary);
    pdf.text(category, innerX + innerWidth / 2, infoY, { align: 'center' });
    infoY += 12;

    // Decorative separator
    setStrokeColor(pdf, iosColors.emeraldPrimary);
    pdf.setLineWidth(0.3);
    pdf.line(innerX + 20, infoY, innerX + innerWidth - 20, infoY);
    infoY += 10;

    // Details section - iOS list style
    const addDetail = (label: string, value: string, highlight = false) => {
      applyIOSTextStyle(pdf, 'footnote', iosColors.textTertiary, theme as ThemeMode);
      pdf.text(label, innerX, infoY);

      if (highlight) {
        setTextColor(pdf, iosColors.emeraldPrimary);
      } else {
        setTextColor(pdf, iosColors.textSecondary);
      }
      pdf.setFont('helvetica', 'bold');
      pdf.text(value, innerX + innerWidth, infoY, { align: 'right' });
      infoY += 9;
    };

    if (options.showWeights && emerald.weightCarats) {
      addDetail('Peso', `${emerald.weightCarats} quilates`);
    }
    if (options.showLotCodes && emerald.lotCode) {
      addDetail('Referencia', emerald.lotCode);
    }
    addDetail('Origen', 'Colombia');

    const statusLabels: Record<string, string> = {
      available: 'Disponible',
      sold: 'Vendida',
      reserved: 'Reservada',
    };
    addDetail('Estado', statusLabels[emerald.status] || 'Disponible', true);

    infoY += 6;

    // Price box - iOS prominent card style
    if (options.showPrices && emerald.priceCOP) {
      const priceBoxWidth = innerWidth;
      const priceBoxHeight = 20;
      const priceBoxX = innerX;

      // Price box with emerald accent
      drawIOSShadow(pdf, priceBoxX, infoY, priceBoxWidth, priceBoxHeight, 'xs');
      setFillColor(pdf, iosColors.backgroundSecondary);
      pdf.roundedRect(priceBoxX, infoY, priceBoxWidth, priceBoxHeight, BORDER_RADIUS_MM.sm, BORDER_RADIUS_MM.sm, 'F');

      setStrokeColor(pdf, iosColors.emeraldPrimary);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(priceBoxX, infoY, priceBoxWidth, priceBoxHeight, BORDER_RADIUS_MM.sm, BORDER_RADIUS_MM.sm);

      applyIOSTextStyle(pdf, 'headline', iosColors.textPrimary, theme as ThemeMode);
      const displayCurrency = options.currency || 'COP';
      const priceValue = options.convertPrice ? options.convertPrice(emerald.priceCOP) : emerald.priceCOP;
      const price = new Intl.NumberFormat(displayCurrency === 'USD' ? 'en-US' : 'es-CO', {
        style: 'currency',
        currency: displayCurrency,
        maximumFractionDigits: 0,
      }).format(priceValue);
      pdf.text(price, priceBoxX + priceBoxWidth / 2, infoY + 13, { align: 'center' });
      infoY += priceBoxHeight + 8;
    }

    // AI Description - iOS caption style
    if (emerald.aiDescription) {
      applyIOSTextStyle(pdf, 'caption1', iosColors.textTertiary, theme as ThemeMode);
      pdf.setFont('helvetica', 'italic');
      const descLines = pdf.splitTextToSize(`"${emerald.aiDescription}"`, innerWidth);
      const linesToShow = descLines.slice(0, 3);
      pdf.text(linesToShow, innerX + innerWidth / 2, infoY, { align: 'center' });
    }

    // === FOOTER ===
    const footerY = pageHeight - iosMargin;

    // Website in emerald green (centered)
    setTextColor(pdf, iosColors.emeraldPrimary);
    applyIOSTextStyle(pdf, 'caption1', iosColors.emeraldPrimary, theme as ThemeMode);
    pdf.text('tierramadre.co • Esmeraldas Colombianas 100% Naturales', pageWidth / 2, footerY, { align: 'center' });
  }
}
