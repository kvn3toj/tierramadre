import jsPDF, { GState } from 'jspdf';
import { Emerald } from '../types';

// iOS HIG PDF Utilities
import {
  getThemeColors as getIOSThemeColors,
  setFillColor,
  setStrokeColor,
  setTextColor,
  ThemeMode,
  SPACING_MM,
  BORDER_RADIUS_MM,
  applyIOSTextStyle,
  applyCustomTextStyle,
  drawIOSShadow,
  drawCardShadow,
  getLogoDimensions,
} from './pdf';

interface CatalogOptions {
  title?: string;
  showPrices: boolean;
  showWeights: boolean;
  showLotCodes: boolean;
  layout: 'grid' | 'list' | 'carousel';
  logoBase64?: string;
  theme?: 'dark' | 'light';
}

// Tierra Madre Brand Colors - Premium Jewelry Palette
const BRAND = {
  // Primary emerald green (brand color)
  emeraldGreen: '#00AE7A',
  emeraldDark: '#008F63',
  emeraldLight: '#00C98C',
  emeraldGlow: '#00D4A0',
  // Cool silver metallic (blue-tinted to avoid gold appearance)
  silver: '#B8C4CE',
  silverLight: '#D0D8E0',
  silverDark: '#8A9AAA',
  platinum: '#E8ECF0',
  // Dark backgrounds
  darkBg: '#080A0C',
  charcoal: '#0C0E10',
  surface: '#151719',
  // Light tones
  white: '#FFFFFF',
  offWhite: '#F5F7F9',
  cream: '#FAFBFC',
  // Grays
  lightGray: '#A0ACB8',
  mediumGray: '#687080',
  darkGray: '#252830',
};

// Theme-aware color palettes
interface ThemeColors {
  background: string;
  surface: string;
  border: string;
  borderLight: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  priceBox: string;
}

function getThemeColors(theme: 'dark' | 'light' = 'dark'): ThemeColors {
  if (theme === 'light') {
    return {
      background: BRAND.cream,
      surface: BRAND.white,
      border: BRAND.silverDark,
      borderLight: BRAND.silver,
      text: BRAND.darkBg,
      textSecondary: BRAND.darkGray,
      textMuted: BRAND.mediumGray,
      accent: BRAND.silver,
      priceBox: BRAND.offWhite,
    };
  }
  // Dark theme (default)
  return {
    background: BRAND.darkBg,
    surface: BRAND.charcoal,
    border: BRAND.silver,
    borderLight: BRAND.silverLight,
    text: BRAND.platinum,
    textSecondary: BRAND.white,
    textMuted: BRAND.lightGray,
    accent: BRAND.silver,
    priceBox: BRAND.surface,
  };
}

// Logo aspect ratio: width is approximately 2x height
const LOGO_ASPECT_RATIO = 2.0;

// Helper to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function setFillFromHex(pdf: jsPDF, hex: string) {
  const rgb = hexToRgb(hex);
  pdf.setFillColor(rgb.r, rgb.g, rgb.b);
}

// Helper to load image and get dimensions
async function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = src;
  });
}

// Calculate dimensions that fit within maxWidth x maxHeight while preserving aspect ratio
function calculateAspectRatioFit(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
  return {
    width: srcWidth * ratio,
    height: srcHeight * ratio,
  };
}

function setDrawFromHex(pdf: jsPDF, hex: string) {
  const rgb = hexToRgb(hex);
  pdf.setDrawColor(rgb.r, rgb.g, rgb.b);
}

// Add logo to top right corner of page
function addLogoToPage(
  pdf: jsPDF,
  logoBase64: string | null | undefined,
  pageWidth: number,
  margin: number,
  _theme?: 'dark' | 'light' // Reserved for future dark/light logo variants
) {
  if (!logoBase64) return;

  try {
    const logoWidth = 35; // 35mm wide
    const logoHeight = logoWidth / LOGO_ASPECT_RATIO;
    const logoX = pageWidth - margin - logoWidth;
    const logoY = margin;

    pdf.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight, undefined, 'MEDIUM');
  } catch (error) {
    console.error('Failed to add logo to page:', error);
  }
}

function setTextFromHex(pdf: jsPDF, hex: string) {
  const rgb = hexToRgb(hex);
  pdf.setTextColor(rgb.r, rgb.g, rgb.b);
}

// Load logo as base64 from public folder
export async function loadLogoBase64(): Promise<string> {
  try {
    const response = await fetch('/logo-tierra-madre.png');
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to load logo:', error);
    return '';
  }
}

export async function generateCatalog(
  emeralds: Emerald[],
  options: CatalogOptions
): Promise<jsPDF> {
  // Load logo if not provided
  let logoBase64 = options.logoBase64;
  if (!logoBase64) {
    logoBase64 = await loadLogoBase64();
  }

  // Use LANDSCAPE orientation for carousel, portrait for others
  const isCarousel = options.layout === 'carousel';
  const pdf = new jsPDF({
    orientation: isCarousel ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - 2 * margin;

  const theme = options.theme || 'dark';

  // Cover Page
  if (isCarousel) {
    addHorizontalCoverPage(pdf, pageWidth, pageHeight, options.title, emeralds.length, logoBase64, theme);
  } else {
    addCoverPage(pdf, pageWidth, pageHeight, options.title);
  }

  // Content Pages
  if (isCarousel) {
    await addHorizontalCarouselLayout(pdf, emeralds, options, margin, contentWidth, pageWidth, pageHeight, logoBase64, theme);
  } else {
    pdf.addPage();
    if (options.layout === 'grid') {
      await addGridLayout(pdf, emeralds, options, margin, contentWidth, pageWidth, logoBase64, theme);
    } else {
      await addListLayout(pdf, emeralds, options, margin, contentWidth, pageWidth, pageHeight, logoBase64, theme);
    }
  }

  return pdf;
}

// Horizontal Cover Page with Logo - iOS HIG Premium Style
function addHorizontalCoverPage(
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

// Horizontal Carousel Layout - iOS HIG Premium Style
async function addHorizontalCarouselLayout(
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

    if (emerald.imageUrl) {
      try {
        // Clip image inside rounded rect (approximate with inset)
        const imgInset = 2;
        pdf.addImage(
          emerald.imageUrl,
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
      const price = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(emerald.priceCOP);
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

// Original cover page for grid/list layouts (Portrait)
function addCoverPage(
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  title?: string
) {
  setFillFromHex(pdf, BRAND.darkBg);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  setTextFromHex(pdf, BRAND.emeraldGreen);
  pdf.setFontSize(36);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TIERRA MADRE', pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });

  setTextFromHex(pdf, BRAND.silver);
  pdf.setFontSize(14);
  pdf.text('ESENCIA Y PODER', pageWidth / 2, pageHeight / 2, { align: 'center' });

  if (title) {
    setTextFromHex(pdf, BRAND.white);
    pdf.setFontSize(18);
    pdf.text(title, pageWidth / 2, pageHeight / 2 + 30, { align: 'center' });
  }

  setTextFromHex(pdf, BRAND.mediumGray);
  pdf.setFontSize(10);
  const date = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long' });
  pdf.text(date, pageWidth / 2, pageHeight - 20, { align: 'center' });
}

async function addGridLayout(
  pdf: jsPDF,
  emeralds: Emerald[],
  options: CatalogOptions,
  margin: number,
  contentWidth: number,
  pageWidth: number,
  logoBase64?: string,
  themeParam?: 'dark' | 'light'
) {
  const theme = themeParam || options.theme || 'dark';
  const itemsPerRow = 3;
  const itemsPerPage = 6;
  const itemWidth = (contentWidth - 10 * (itemsPerRow - 1)) / itemsPerRow;
  const itemHeight = 70;
  const imageHeight = 45;

  let currentY = margin;
  let currentX = margin;
  let itemsOnPage = 0;

  // Add logo to first page
  if (emeralds.length > 0) {
    addLogoToPage(pdf, logoBase64, pageWidth, margin, theme);
  }

  for (let i = 0; i < emeralds.length; i++) {
    const emerald = emeralds[i];

    if (emerald.imageUrl) {
      try {
        // Load image to get natural dimensions and preserve aspect ratio
        const imgDimensions = await getImageDimensions(emerald.imageUrl);
        const fitDimensions = calculateAspectRatioFit(
          imgDimensions.width,
          imgDimensions.height,
          itemWidth,
          imageHeight
        );

        // Center the image within the available space
        const centeredX = currentX + (itemWidth - fitDimensions.width) / 2;
        const centeredY = currentY + (imageHeight - fitDimensions.height) / 2;

        pdf.addImage(
          emerald.imageUrl,
          'JPEG',
          centeredX,
          centeredY,
          fitDimensions.width,
          fitDimensions.height,
          undefined,
          'MEDIUM'
        );
      } catch {
        // Fallback if image fails to load
        setFillFromHex(pdf, BRAND.surface);
        pdf.rect(currentX, currentY, itemWidth, imageHeight, 'F');
      }
    }

    pdf.setFontSize(10);
    setTextFromHex(pdf, BRAND.silver);
    pdf.setFont('helvetica', 'bold');
    pdf.text(emerald.name, currentX, currentY + imageHeight + 5, { maxWidth: itemWidth });

    pdf.setFontSize(8);
    setTextFromHex(pdf, BRAND.lightGray);
    pdf.setFont('helvetica', 'normal');

    let detailY = currentY + imageHeight + 10;

    if (options.showWeights && emerald.weightCarats) {
      pdf.text(`${emerald.weightCarats} ct`, currentX, detailY);
      detailY += 4;
    }

    if (options.showLotCodes && emerald.lotCode) {
      pdf.text(emerald.lotCode, currentX, detailY);
      detailY += 4;
    }

    if (options.showPrices && emerald.priceCOP) {
      setTextFromHex(pdf, BRAND.white);
      const price = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(emerald.priceCOP);
      pdf.text(price, currentX, detailY);
    }

    currentX += itemWidth + 10;
    itemsOnPage++;

    if (itemsOnPage % itemsPerRow === 0) {
      currentX = margin;
      currentY += itemHeight + 10;
    }

    if (itemsOnPage >= itemsPerPage && i < emeralds.length - 1) {
      pdf.addPage();
      addLogoToPage(pdf, logoBase64, pageWidth, margin, theme);
      currentY = margin;
      currentX = margin;
      itemsOnPage = 0;
    }
  }
}

async function addListLayout(
  pdf: jsPDF,
  emeralds: Emerald[],
  options: CatalogOptions,
  margin: number,
  contentWidth: number,
  pageWidth: number,
  pageHeight: number,
  logoBase64?: string,
  themeParam?: 'dark' | 'light'
) {
  const theme = themeParam || options.theme || 'dark';
  const colors = getThemeColors(theme);
  const isLight = theme === 'light';

  const rowHeight = 55; // Increased for more premium spacing
  const imageSize = 48; // Larger images for better presentation
  let currentY = margin;
  let pageNumber = 1;
  let itemsOnPage = 0;

  const addPageHeader = () => {
    // Add logo to top right
    addLogoToPage(pdf, logoBase64, pageWidth, margin, theme);

    // Subtle background for header
    setFillFromHex(pdf, colors.surface);
    pdf.rect(margin - 6, margin - 6, contentWidth + 12, 20, 'F');

    // Emerald green top accent line
    setFillFromHex(pdf, BRAND.emeraldGreen);
    pdf.rect(margin - 6, margin - 6, contentWidth + 12, 2, 'F');

    // Header border
    setDrawFromHex(pdf, isLight ? BRAND.silverDark : BRAND.silver);
    pdf.setLineWidth(0.2);
    pdf.rect(margin - 6, margin - 6, contentWidth + 12, 20);

    // Title
    pdf.setFontSize(12);
    setTextFromHex(pdf, colors.text);
    pdf.setFont('helvetica', 'bold');
    pdf.text(options.title || 'CATÁLOGO DE ESMERALDAS', margin, margin + 8);

    // Item count
    pdf.setFontSize(8);
    setTextFromHex(pdf, colors.textMuted);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${emeralds.length} ${emeralds.length === 1 ? 'pieza' : 'piezas'}`, contentWidth + margin, margin + 8, { align: 'right' });

    currentY = margin + 22;
  };

  const addPageFooter = () => {
    const footerY = pageHeight - margin - 8;

    // Footer divider line
    setDrawFromHex(pdf, BRAND.emeraldGreen);
    pdf.setLineWidth(0.4);
    pdf.line(margin, footerY - 4, margin + contentWidth, footerY - 4);

    // Page number (left)
    pdf.setFontSize(8);
    setTextFromHex(pdf, colors.textMuted);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Página ${pageNumber}`, margin, footerY);

    // Website (center)
    setTextFromHex(pdf, BRAND.emeraldGreen);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text('tierramadre.co', (contentWidth / 2) + margin, footerY, { align: 'center' });

    // Tagline (right)
    setTextFromHex(pdf, colors.textMuted);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Esmeraldas 100% Naturales', contentWidth + margin, footerY, { align: 'right' });
  };

  // Add initial header
  addPageHeader();

  for (let i = 0; i < emeralds.length; i++) {
    const emerald = emeralds[i];

    // Check if we need a new page
    if (currentY + rowHeight > pageHeight - margin - 20) {
      addPageFooter();
      pdf.addPage();
      pageNumber++;
      itemsOnPage = 0;
      currentY = margin;
      addPageHeader();
    }

    // === ITEM CARD DESIGN ===
    const cardY = currentY;
    const cardHeight = rowHeight - 3;

    // Alternating background for readability
    if (itemsOnPage % 2 === 0) {
      setFillFromHex(pdf, colors.surface);
      pdf.rect(margin - 2, cardY - 2, contentWidth + 4, cardHeight, 'F');
    }

    // Left emerald green accent bar
    setFillFromHex(pdf, BRAND.emeraldGreen);
    pdf.rect(margin - 2, cardY - 2, 1.5, cardHeight, 'F');

    // Card border
    setDrawFromHex(pdf, isLight ? BRAND.silverDark : BRAND.silver);
    pdf.setLineWidth(0.15);
    pdf.rect(margin - 2, cardY - 2, contentWidth + 4, cardHeight);

    // === IMAGE SECTION ===
    const imageX = margin + 4;
    const imageY = cardY + 2;

    // Image frame with emerald green accent
    setDrawFromHex(pdf, BRAND.emeraldGreen);
    pdf.setLineWidth(0.5);
    pdf.rect(imageX - 1, imageY - 1, imageSize + 2, imageSize + 2);

    // Inner shadow effect
    setDrawFromHex(pdf, isLight ? BRAND.mediumGray : BRAND.darkGray);
    pdf.setLineWidth(0.1);
    pdf.rect(imageX, imageY, imageSize, imageSize);

    if (emerald.imageUrl) {
      try {
        // Load image to get natural dimensions and preserve aspect ratio
        const imgDimensions = await getImageDimensions(emerald.imageUrl);
        const fitDimensions = calculateAspectRatioFit(
          imgDimensions.width,
          imgDimensions.height,
          imageSize,
          imageSize
        );

        // Center the image within the imageSize x imageSize space
        const centeredX = imageX + (imageSize - fitDimensions.width) / 2;
        const centeredY = imageY + (imageSize - fitDimensions.height) / 2;

        pdf.addImage(
          emerald.imageUrl,
          'JPEG',
          centeredX,
          centeredY,
          fitDimensions.width,
          fitDimensions.height,
          undefined,
          'MEDIUM'
        );
      } catch {
        // Fallback if image fails to load
        setFillFromHex(pdf, colors.priceBox);
        pdf.rect(imageX, imageY, imageSize, imageSize, 'F');
        setTextFromHex(pdf, colors.textMuted);
        pdf.setFontSize(7);
        pdf.text('Sin imagen', imageX + imageSize / 2, imageY + imageSize / 2, { align: 'center' });
      }
    }

    // Item number badge
    const badgeSize = 10;
    setFillFromHex(pdf, BRAND.emeraldGreen);
    pdf.circle(imageX + imageSize - badgeSize / 2, imageY + badgeSize / 2, badgeSize / 2, 'F');
    setTextFromHex(pdf, BRAND.white);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${i + 1}`, imageX + imageSize - badgeSize / 2, imageY + badgeSize / 2 + 2, { align: 'center' });

    // === CONTENT SECTION ===
    const contentX = imageX + imageSize + 8;
    const contentColWidth = contentWidth - imageSize - 85; // Leave space for right column
    let contentY = cardY + 8;

    // Product name - bold and prominent
    pdf.setFontSize(13);
    setTextFromHex(pdf, colors.text);
    pdf.setFont('helvetica', 'bold');
    const nameLines = pdf.splitTextToSize(emerald.name, contentColWidth);
    pdf.text(nameLines[0], contentX, contentY); // Just show first line for cleaner look
    contentY += 8;

    // Category badge
    const categoryLabels: Record<string, string> = {
      loose: 'Gema',
      ring: 'Anillo',
      pendant: 'Dije',
      earrings: 'Aretes',
    };
    const category = categoryLabels[emerald.category] || 'Esmeralda';

    setFillFromHex(pdf, alpha(BRAND.emeraldGreen, 0.15));
    const categoryWidth = pdf.getTextWidth(category) + 6;
    pdf.roundedRect(contentX, contentY - 4, categoryWidth, 6, 1, 1, 'F');

    setTextFromHex(pdf, BRAND.emeraldGreen);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text(category, contentX + 3, contentY);
    contentY += 6;

    // Description - elegant and concise
    if (emerald.aiDescription) {
      pdf.setFontSize(8);
      setTextFromHex(pdf, colors.textMuted);
      pdf.setFont('helvetica', 'normal');
      const description = emerald.aiDescription.substring(0, 110) + (emerald.aiDescription.length > 110 ? '...' : '');
      const descLines = pdf.splitTextToSize(description, contentColWidth);
      pdf.text(descLines.slice(0, 2), contentX, contentY); // Max 2 lines
      contentY += descLines.slice(0, 2).length * 4;
    }

    // === RIGHT COLUMN - Details & Price ===
    const rightColX = margin + contentWidth - 70;
    let rightY = cardY + 8;

    // Details section with elegant formatting
    const addDetail = (icon: string, label: string, value: string, isHighlight = false) => {
      // Icon
      setTextFromHex(pdf, BRAND.emeraldGreen);
      pdf.setFontSize(8);
      pdf.text(icon, rightColX, rightY);

      // Label
      setTextFromHex(pdf, colors.textMuted);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.text(label, rightColX + 6, rightY);

      // Value
      if (isHighlight) {
        setTextFromHex(pdf, BRAND.emeraldGreen);
      } else {
        setTextFromHex(pdf, colors.textSecondary);
      }
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text(value, rightColX + 70, rightY, { align: 'right' });

      rightY += 7;
    };

    if (options.showWeights && emerald.weightCarats) {
      addDetail('◆', 'Peso', `${emerald.weightCarats} ct`);
    }

    if (options.showLotCodes && emerald.lotCode) {
      addDetail('#', 'Ref.', emerald.lotCode);
    }

    const statusLabels: Record<string, string> = {
      available: 'Disponible',
      sold: 'Vendida',
      reserved: 'Reservada',
    };
    const status = statusLabels[emerald.status] || 'Disponible';
    const isAvailable = emerald.status === 'available';
    addDetail('●', 'Estado', status, isAvailable);

    // Price box - prominent and elegant
    if (options.showPrices && emerald.priceCOP) {
      rightY += 2;
      const priceBoxWidth = 70;
      const priceBoxHeight = 14;

      // Price background with emerald gradient effect
      setFillFromHex(pdf, colors.priceBox);
      pdf.roundedRect(rightColX, rightY - 3, priceBoxWidth, priceBoxHeight, 2, 2, 'F');

      // Emerald green border
      setDrawFromHex(pdf, BRAND.emeraldGreen);
      pdf.setLineWidth(0.6);
      pdf.roundedRect(rightColX, rightY - 3, priceBoxWidth, priceBoxHeight, 2, 2);

      // Price text
      setTextFromHex(pdf, isLight ? BRAND.emeraldDark : BRAND.emeraldGreen);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      const price = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(emerald.priceCOP);
      pdf.text(price, rightColX + priceBoxWidth / 2, rightY + 5, { align: 'center' });
    }

    // Bottom divider (subtle)
    setDrawFromHex(pdf, isLight ? BRAND.silverLight : BRAND.darkGray);
    pdf.setLineWidth(0.1);
    pdf.line(margin + imageSize + 8, currentY + rowHeight - 5, margin + contentWidth, currentY + rowHeight - 5);

    currentY += rowHeight;
    itemsOnPage++;
  }

  // Add footer to last page
  addPageFooter();
}

// Helper function to create alpha transparency effect (manual implementation)
function alpha(hex: string, opacity: number): string {
  const rgb = hexToRgb(hex);
  // Mix with white for light effect (simplified alpha blending)
  const mix = (c: number) => Math.round(c + (255 - c) * (1 - opacity));
  const r = mix(rgb.r).toString(16).padStart(2, '0');
  const g = mix(rgb.g).toString(16).padStart(2, '0');
  const b = mix(rgb.b).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

export function downloadPDF(pdf: jsPDF, filename: string) {
  pdf.save(`${filename}.pdf`);
}
