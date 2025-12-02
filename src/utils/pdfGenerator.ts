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
      await addGridLayout(pdf, emeralds, options, margin, contentWidth, pageWidth, logoBase64, theme, pageHeight);
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

// Grid Layout - iOS HIG Style (3 columns)
async function addGridLayout(
  pdf: jsPDF,
  emeralds: Emerald[],
  options: CatalogOptions,
  _margin: number,
  _contentWidth: number,
  pageWidth: number,
  logoBase64?: string,
  themeParam?: 'dark' | 'light',
  pageHeight?: number
) {
  const theme = themeParam || options.theme || 'dark';
  const iosColors = getIOSThemeColors(theme as ThemeMode);
  const actualPageHeight = pageHeight || pdf.internal.pageSize.getHeight();

  // iOS HIG Grid measurements
  const iosMargin = SPACING_MM.xl;
  const contentWidth = pageWidth - iosMargin * 2;
  const itemsPerRow = 3;
  const gap = SPACING_MM.md; // 4mm gap between cards
  const cardWidth = (contentWidth - gap * (itemsPerRow - 1)) / itemsPerRow;
  const imageHeight = 50; // Square-ish image area
  const textPadding = SPACING_MM.sm;
  const cardHeight = imageHeight + 28; // Image + text area
  const itemsPerPage = 6; // 2 rows of 3

  let currentY = iosMargin;
  let currentX = iosMargin;
  let itemsOnPage = 0;
  let pageNumber = 1;

  // iOS-styled page header for grid
  const addIOSGridHeader = () => {
    // Logo at top-right
    if (logoBase64) {
      const logoHeight = 12;
      const logoDims = getLogoDimensions(logoHeight);
      pdf.addImage(
        logoBase64,
        'PNG',
        pageWidth - iosMargin - logoDims.width,
        iosMargin,
        logoDims.width,
        logoDims.height,
        undefined,
        'MEDIUM'
      );
    }

    // Title at top-left - iOS headline
    applyIOSTextStyle(pdf, 'headline', iosColors.textPrimary, theme as ThemeMode);
    pdf.text(options.title || 'COLECCIÓN', iosMargin, iosMargin + 5);

    // Subtitle - iOS caption
    applyIOSTextStyle(pdf, 'caption1', iosColors.textTertiary, theme as ThemeMode);
    const subtitle = `${emeralds.length} piezas • Vista cuadrícula`;
    pdf.text(subtitle, iosMargin, iosMargin + 11);

    // Header accent line
    const headerLineY = iosMargin + 15;
    setStrokeColor(pdf, iosColors.emeraldPrimary);
    pdf.setLineWidth(0.4);
    pdf.line(iosMargin, headerLineY, pageWidth - iosMargin, headerLineY);

    currentY = headerLineY + SPACING_MM.lg;
  };

  // iOS-styled page footer
  const addIOSGridFooter = () => {
    const footerY = actualPageHeight - iosMargin + 2;

    // Footer line
    setStrokeColor(pdf, iosColors.border);
    pdf.setLineWidth(0.2);
    pdf.line(iosMargin, footerY - 6, pageWidth - iosMargin, footerY - 6);

    // Page number
    applyIOSTextStyle(pdf, 'caption1', iosColors.textTertiary, theme as ThemeMode);
    pdf.text(`${pageNumber}`, pageWidth / 2, footerY, { align: 'center' });
  };

  // Add initial header
  addIOSGridHeader();

  for (let i = 0; i < emeralds.length; i++) {
    const emerald = emeralds[i];

    // Calculate column position
    const colIndex = itemsOnPage % itemsPerRow;
    currentX = iosMargin + colIndex * (cardWidth + gap);

    // iOS Card shadow
    drawCardShadow(pdf, currentX, currentY, cardWidth, cardHeight);

    // Card background
    setFillColor(pdf, iosColors.card);
    pdf.roundedRect(currentX, currentY, cardWidth, cardHeight, BORDER_RADIUS_MM.md, BORDER_RADIUS_MM.md, 'F');

    // Card border
    setStrokeColor(pdf, iosColors.border);
    pdf.setLineWidth(0.2);
    pdf.roundedRect(currentX, currentY, cardWidth, cardHeight, BORDER_RADIUS_MM.md, BORDER_RADIUS_MM.md, 'S');

    // Image area with rounded top corners
    const imageAreaHeight = imageHeight;
    if (emerald.imageUrl) {
      try {
        // Load image and fit within card
        const imgDimensions = await getImageDimensions(emerald.imageUrl);
        const fitDimensions = calculateAspectRatioFit(
          imgDimensions.width,
          imgDimensions.height,
          cardWidth - 2,
          imageAreaHeight - 2
        );

        // Center the image
        const centeredX = currentX + (cardWidth - fitDimensions.width) / 2;
        const centeredY = currentY + (imageAreaHeight - fitDimensions.height) / 2;

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
        // Placeholder for failed images
        setFillColor(pdf, iosColors.backgroundSecondary);
        pdf.rect(currentX + 1, currentY + 1, cardWidth - 2, imageAreaHeight - 2, 'F');

        // Placeholder icon (emerald diamond shape)
        const cx = currentX + cardWidth / 2;
        const cy = currentY + imageAreaHeight / 2;
        setFillColor(pdf, iosColors.emeraldPrimary);
        pdf.setGState(new GState({ opacity: 0.3 }));
        pdf.circle(cx, cy, 8, 'F');
        pdf.setGState(new GState({ opacity: 1 }));
      }
    }

    // Separator line below image
    setStrokeColor(pdf, iosColors.border);
    pdf.setLineWidth(0.1);
    pdf.line(currentX + 2, currentY + imageAreaHeight, currentX + cardWidth - 2, currentY + imageAreaHeight);

    // Text content area
    const textY = currentY + imageAreaHeight + textPadding + 3;
    const textX = currentX + textPadding;
    const textWidth = cardWidth - textPadding * 2;

    // Name - iOS footnote bold, truncated
    applyIOSTextStyle(pdf, 'footnote', iosColors.textPrimary, theme as ThemeMode);
    pdf.setFont('helvetica', 'bold');
    const displayName = emerald.name.length > 18 ? emerald.name.substring(0, 16) + '...' : emerald.name;
    pdf.text(displayName, textX, textY, { maxWidth: textWidth });

    // Details row - iOS caption
    let detailY = textY + 5;
    applyCustomTextStyle(pdf, 'caption2', iosColors.textSecondary, theme as ThemeMode);

    // Weight (if enabled)
    if (options.showWeights && emerald.weightCarats) {
      const weightText = `${emerald.weightCarats} ct`;
      pdf.text(weightText, textX, detailY);
      detailY += 3.5;
    }

    // Category pill (compact)
    if (emerald.category) {
      const pillX = textX;
      const pillY = detailY - 2.5;
      const categoryShort = emerald.category.substring(0, 8);
      const pillWidth = pdf.getTextWidth(categoryShort) + 3;
      const pillHeight = 4;

      // Emerald-tinted pill
      setFillColor(pdf, iosColors.emeraldPrimary);
      pdf.setGState(new GState({ opacity: 0.15 }));
      pdf.roundedRect(pillX, pillY, pillWidth, pillHeight, 1.5, 1.5, 'F');
      pdf.setGState(new GState({ opacity: 1 }));

      // Pill text
      applyCustomTextStyle(pdf, 'caption2', iosColors.emeraldPrimary, theme as ThemeMode);
      pdf.text(categoryShort, pillX + 1.5, detailY);
    }

    // Price (if enabled) - right side
    if (options.showPrices && emerald.priceCOP) {
      const price = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(emerald.priceCOP);

      applyCustomTextStyle(pdf, 'caption2', iosColors.emeraldPrimary, theme as ThemeMode);
      pdf.setFont('helvetica', 'bold');
      const priceWidth = pdf.getTextWidth(price);
      pdf.text(price, currentX + cardWidth - textPadding - priceWidth, textY);
    }

    itemsOnPage++;

    // Move to next row after 3 items
    if (itemsOnPage % itemsPerRow === 0) {
      currentY += cardHeight + gap;
    }

    // Check for page break
    if (itemsOnPage >= itemsPerPage && i < emeralds.length - 1) {
      addIOSGridFooter();
      pdf.addPage();
      pageNumber++;
      currentY = iosMargin;
      itemsOnPage = 0;
      addIOSGridHeader();
    }
  }

  // Add footer to last page
  addIOSGridFooter();
}

// List Layout - iOS HIG Style
async function addListLayout(
  pdf: jsPDF,
  emeralds: Emerald[],
  options: CatalogOptions,
  _margin: number,
  _contentWidth: number,
  pageWidth: number,
  pageHeight: number,
  logoBase64?: string,
  themeParam?: 'dark' | 'light'
) {
  const theme = themeParam || options.theme || 'dark';
  const iosColors = getIOSThemeColors(theme as ThemeMode);

  // iOS HIG measurements
  const iosMargin = SPACING_MM.xl;
  const contentWidth = pageWidth - iosMargin * 2;
  const rowHeight = 50; // iOS list item height
  const imageSize = 42; // Square image
  let currentY = iosMargin;
  let pageNumber = 1;
  let itemsOnPage = 0;

  // iOS-styled page header
  const addIOSPageHeader = () => {
    // Logo at top-right
    if (logoBase64) {
      const logoHeight = 12;
      const logoDims = getLogoDimensions(logoHeight);
      pdf.addImage(
        logoBase64,
        'PNG',
        pageWidth - iosMargin - logoDims.width,
        iosMargin,
        logoDims.width,
        logoDims.height,
        undefined,
        'MEDIUM'
      );
    }

    // Title at top-left - iOS title2
    applyIOSTextStyle(pdf, 'title2', iosColors.textPrimary, theme as ThemeMode);
    pdf.text(options.title || 'CATÁLOGO', iosMargin, iosMargin + 5);

    // Item count - iOS caption
    applyIOSTextStyle(pdf, 'caption1', iosColors.textTertiary, theme as ThemeMode);
    const countText = `${emeralds.length} ${emeralds.length === 1 ? 'pieza' : 'piezas'}`;
    pdf.text(countText, iosMargin, iosMargin + 12);

    // Header accent line
    const headerLineY = iosMargin + 16;
    setStrokeColor(pdf, iosColors.emeraldPrimary);
    pdf.setLineWidth(0.3);
    pdf.line(iosMargin, headerLineY, pageWidth - iosMargin, headerLineY);

    currentY = headerLineY + SPACING_MM.md;
  };

  // iOS-styled page footer
  const addIOSPageFooter = () => {
    const footerY = pageHeight - iosMargin;

    // Footer accent line
    setStrokeColor(pdf, iosColors.border);
    pdf.setLineWidth(0.2);
    pdf.line(iosMargin, footerY - 6, pageWidth - iosMargin, footerY - 6);

    // Page number (left)
    applyIOSTextStyle(pdf, 'caption1', iosColors.textTertiary, theme as ThemeMode);
    pdf.text(`Página ${pageNumber}`, iosMargin, footerY);

    // Website (center)
    setTextColor(pdf, iosColors.emeraldPrimary);
    pdf.text('tierramadre.co', pageWidth / 2, footerY, { align: 'center' });

    // Tagline (right)
    setTextColor(pdf, iosColors.textTertiary);
    pdf.text('Esmeraldas 100% Naturales', pageWidth - iosMargin, footerY, { align: 'right' });
  };

  // Add initial header
  addIOSPageHeader();

  for (let i = 0; i < emeralds.length; i++) {
    const emerald = emeralds[i];

    // Check if we need a new page
    if (currentY + rowHeight > pageHeight - iosMargin - 15) {
      addIOSPageFooter();
      pdf.addPage();
      pageNumber++;
      itemsOnPage = 0;
      currentY = iosMargin;

      // Background for new page
      setFillColor(pdf, iosColors.background);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      addIOSPageHeader();
    }

    // === iOS LIST ITEM CARD ===
    const cardY = currentY;
    const cardHeight = rowHeight - SPACING_MM.xs;
    const cardX = iosMargin;
    const cardWidth = contentWidth;

    // Card shadow (subtle)
    if (itemsOnPage % 2 === 0) {
      drawIOSShadow(pdf, cardX, cardY, cardWidth, cardHeight, 'xs');
    }

    // Card background
    setFillColor(pdf, itemsOnPage % 2 === 0 ? iosColors.card : iosColors.backgroundSecondary);
    pdf.roundedRect(cardX, cardY, cardWidth, cardHeight, BORDER_RADIUS_MM.sm, BORDER_RADIUS_MM.sm, 'F');

    // Subtle border
    setStrokeColor(pdf, iosColors.border);
    pdf.setLineWidth(0.15);
    pdf.roundedRect(cardX, cardY, cardWidth, cardHeight, BORDER_RADIUS_MM.sm, BORDER_RADIUS_MM.sm);

    // Left emerald accent bar
    setFillColor(pdf, iosColors.emeraldPrimary);
    pdf.roundedRect(cardX, cardY, 1.5, cardHeight, 0.75, 0.75, 'F');

    // === IMAGE SECTION ===
    const imageX = cardX + SPACING_MM.sm;
    const imageY = cardY + (cardHeight - imageSize) / 2;

    // Image container with rounded corners
    setFillColor(pdf, iosColors.backgroundSecondary);
    pdf.roundedRect(imageX, imageY, imageSize, imageSize, BORDER_RADIUS_MM.sm, BORDER_RADIUS_MM.sm, 'F');

    if (emerald.imageUrl) {
      try {
        const imgDimensions = await getImageDimensions(emerald.imageUrl);
        const fitDimensions = calculateAspectRatioFit(
          imgDimensions.width,
          imgDimensions.height,
          imageSize - 2,
          imageSize - 2
        );

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
        applyIOSTextStyle(pdf, 'caption2', iosColors.textTertiary, theme as ThemeMode);
        pdf.text('Sin imagen', imageX + imageSize / 2, imageY + imageSize / 2, { align: 'center' });
      }
    }

    // Item number badge (iOS style pill)
    const badgeX = imageX + imageSize - 8;
    const badgeY = imageY + 2;
    setFillColor(pdf, iosColors.emeraldPrimary);
    pdf.roundedRect(badgeX, badgeY, 10, 6, 3, 3, 'F');
    applyIOSTextStyle(pdf, 'caption2', iosColors.textOnEmerald, theme as ThemeMode);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${i + 1}`, badgeX + 5, badgeY + 4.5, { align: 'center' });

    // === CONTENT SECTION ===
    const contentX = imageX + imageSize + SPACING_MM.sm;
    const contentColWidth = cardWidth - imageSize - 80 - SPACING_MM.md * 2;
    let contentY = cardY + SPACING_MM.sm + 2;

    // Product name - iOS headline
    applyIOSTextStyle(pdf, 'headline', iosColors.textPrimary, theme as ThemeMode);
    const nameLines = pdf.splitTextToSize(emerald.name, contentColWidth);
    pdf.text(nameLines[0], contentX, contentY);
    contentY += 6;

    // Category pill badge
    const categoryLabels: Record<string, string> = {
      loose: 'Gema',
      ring: 'Anillo',
      pendant: 'Dije',
      earrings: 'Aretes',
    };
    const category = categoryLabels[emerald.category] || 'Esmeralda';

    applyIOSTextStyle(pdf, 'caption2', iosColors.emeraldPrimary, theme as ThemeMode);
    const categoryWidth = pdf.getTextWidth(category) + 4;
    setFillColor(pdf, iosColors.emeraldPrimary);
    pdf.setGState(new GState({ opacity: 0.12 }));
    pdf.roundedRect(contentX, contentY - 3, categoryWidth, 5, 2.5, 2.5, 'F');
    pdf.setGState(new GState({ opacity: 1 }));

    setTextColor(pdf, iosColors.emeraldPrimary);
    pdf.text(category, contentX + 2, contentY);
    contentY += 5;

    // Description - iOS footnote
    if (emerald.aiDescription) {
      applyIOSTextStyle(pdf, 'caption1', iosColors.textTertiary, theme as ThemeMode);
      const description = emerald.aiDescription.substring(0, 80) + (emerald.aiDescription.length > 80 ? '...' : '');
      const descLines = pdf.splitTextToSize(description, contentColWidth);
      pdf.text(descLines.slice(0, 2), contentX, contentY);
    }

    // === RIGHT COLUMN - Details & Price ===
    const rightColX = cardX + cardWidth - 72;
    let rightY = cardY + SPACING_MM.sm;

    // Details with iOS styling
    const addDetail = (label: string, value: string, highlight = false) => {
      applyIOSTextStyle(pdf, 'caption2', iosColors.textTertiary, theme as ThemeMode);
      pdf.text(label, rightColX, rightY);

      if (highlight) {
        setTextColor(pdf, iosColors.emeraldPrimary);
      } else {
        setTextColor(pdf, iosColors.textSecondary);
      }
      pdf.setFont('helvetica', 'bold');
      pdf.text(value, rightColX + 65, rightY, { align: 'right' });
      rightY += 5;
    };

    if (options.showWeights && emerald.weightCarats) {
      addDetail('Peso', `${emerald.weightCarats} ct`);
    }

    if (options.showLotCodes && emerald.lotCode) {
      addDetail('Ref.', emerald.lotCode);
    }

    const statusLabels: Record<string, string> = {
      available: 'Disponible',
      sold: 'Vendida',
      reserved: 'Reservada',
    };
    addDetail('Estado', statusLabels[emerald.status] || 'Disponible', emerald.status === 'available');

    // Price box - iOS prominent style
    if (options.showPrices && emerald.priceCOP) {
      rightY += 2;
      const priceBoxWidth = 65;
      const priceBoxHeight = 12;

      setFillColor(pdf, iosColors.backgroundSecondary);
      pdf.roundedRect(rightColX, rightY - 2, priceBoxWidth, priceBoxHeight, BORDER_RADIUS_MM.sm, BORDER_RADIUS_MM.sm, 'F');

      setStrokeColor(pdf, iosColors.emeraldPrimary);
      pdf.setLineWidth(0.4);
      pdf.roundedRect(rightColX, rightY - 2, priceBoxWidth, priceBoxHeight, BORDER_RADIUS_MM.sm, BORDER_RADIUS_MM.sm);

      applyIOSTextStyle(pdf, 'callout', iosColors.textPrimary, theme as ThemeMode);
      pdf.setFont('helvetica', 'bold');
      const price = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(emerald.priceCOP);
      pdf.text(price, rightColX + priceBoxWidth / 2, rightY + 6, { align: 'center' });
    }

    currentY += rowHeight;
    itemsOnPage++;
  }

  // Add footer to last page
  addIOSPageFooter();
}

export function downloadPDF(pdf: jsPDF, filename: string) {
  pdf.save(`${filename}.pdf`);
}
