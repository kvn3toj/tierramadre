import jsPDF from 'jspdf';
import { Emerald } from '../types';

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

// Horizontal Cover Page with Logo - Premium Jewelry Style
function addHorizontalCoverPage(
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  title?: string,
  totalItems?: number,
  logoBase64?: string,
  theme: 'dark' | 'light' = 'dark'
) {
  const colors = getThemeColors(theme);
  const isLight = theme === 'light';

  // Background
  setFillFromHex(pdf, colors.background);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Elegant EMERALD GREEN border frame (brand color)
  const borderMargin = 10;
  setDrawFromHex(pdf, BRAND.emeraldGreen);
  pdf.setLineWidth(0.8);
  pdf.rect(borderMargin, borderMargin, pageWidth - borderMargin * 2, pageHeight - borderMargin * 2);

  // Inner subtle silver border
  setDrawFromHex(pdf, isLight ? BRAND.silverDark : BRAND.silver);
  pdf.setLineWidth(0.2);
  pdf.rect(borderMargin + 5, borderMargin + 5, pageWidth - borderMargin * 2 - 10, pageHeight - borderMargin * 2 - 10);

  // Corner accents in EMERALD GREEN
  const cornerLength = 30;
  setDrawFromHex(pdf, BRAND.emeraldGreen);
  pdf.setLineWidth(1.2);
  // Top-left
  pdf.line(borderMargin, borderMargin + cornerLength, borderMargin, borderMargin);
  pdf.line(borderMargin, borderMargin, borderMargin + cornerLength, borderMargin);
  // Top-right
  pdf.line(pageWidth - borderMargin - cornerLength, borderMargin, pageWidth - borderMargin, borderMargin);
  pdf.line(pageWidth - borderMargin, borderMargin, pageWidth - borderMargin, borderMargin + cornerLength);
  // Bottom-left
  pdf.line(borderMargin, pageHeight - borderMargin - cornerLength, borderMargin, pageHeight - borderMargin);
  pdf.line(borderMargin, pageHeight - borderMargin, borderMargin + cornerLength, pageHeight - borderMargin);
  // Bottom-right
  pdf.line(pageWidth - borderMargin - cornerLength, pageHeight - borderMargin, pageWidth - borderMargin, pageHeight - borderMargin);
  pdf.line(pageWidth - borderMargin, pageHeight - borderMargin - cornerLength, pageWidth - borderMargin, pageHeight - borderMargin);

  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;

  // Add Logo Image - maintain proper aspect ratio
  if (logoBase64) {
    try {
      const logoHeight = 38;
      const logoWidth = logoHeight * LOGO_ASPECT_RATIO;
      pdf.addImage(
        logoBase64,
        'PNG',
        centerX - logoWidth / 2,
        centerY - 32,
        logoWidth,
        logoHeight
      );
    } catch (e) {
      console.error('Failed to add logo to PDF:', e);
      setTextFromHex(pdf, BRAND.emeraldGreen);
      pdf.setFontSize(32);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TIERRA MADRE', centerX, centerY - 10, { align: 'center' });
    }
  } else {
    setTextFromHex(pdf, BRAND.emeraldGreen);
    pdf.setFontSize(32);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TIERRA MADRE', centerX, centerY - 10, { align: 'center' });
  }

  // Decorative emerald green line under logo
  setDrawFromHex(pdf, BRAND.emeraldGreen);
  pdf.setLineWidth(0.6);
  pdf.line(centerX - 55, centerY + 14, centerX + 55, centerY + 14);

  // Small diamond accents on line
  const diamondY = centerY + 14;
  setFillFromHex(pdf, BRAND.emeraldGreen);
  // Left diamond
  pdf.triangle(centerX - 55, diamondY, centerX - 58, diamondY - 2, centerX - 58, diamondY + 2, 'F');
  // Right diamond
  pdf.triangle(centerX + 55, diamondY, centerX + 58, diamondY - 2, centerX + 58, diamondY + 2, 'F');

  // Tagline in silver
  setTextFromHex(pdf, isLight ? BRAND.mediumGray : BRAND.silver);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('E S E N C I A   Y   P O D E R', centerX, centerY + 26, { align: 'center' });

  // Catalog title
  if (title) {
    setTextFromHex(pdf, colors.textSecondary);
    pdf.setFontSize(15);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, centerX, centerY + 42, { align: 'center' });
  }

  // Collection count
  if (totalItems) {
    setTextFromHex(pdf, colors.textMuted);
    pdf.setFontSize(9);
    const piezasText = totalItems === 1 ? '1 pieza exclusiva' : `${totalItems} piezas exclusivas`;
    pdf.text(piezasText, centerX, centerY + 52, { align: 'center' });
  }

  // Bottom badge with emerald green accent
  const badgeY = pageHeight - borderMargin - 24;

  // Decorative lines
  setDrawFromHex(pdf, BRAND.emeraldGreen);
  pdf.setLineWidth(0.4);
  pdf.line(centerX - 50, badgeY, centerX - 10, badgeY);
  pdf.line(centerX + 10, badgeY, centerX + 50, badgeY);

  // Small emerald gem icon in center
  setFillFromHex(pdf, BRAND.emeraldGreen);
  pdf.circle(centerX, badgeY, 1.5, 'F');

  setTextFromHex(pdf, BRAND.emeraldGreen);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('100% ESMERALDAS COLOMBIANAS', centerX, badgeY + 8, { align: 'center' });

  setTextFromHex(pdf, colors.textMuted);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Certificadas • Naturales • Exclusivas', centerX, badgeY + 14, { align: 'center' });

  // Date and website
  setTextFromHex(pdf, colors.textMuted);
  pdf.setFontSize(8);
  const date = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long' });
  pdf.text(date.charAt(0).toUpperCase() + date.slice(1), borderMargin + 8, pageHeight - borderMargin - 5);

  setTextFromHex(pdf, BRAND.emeraldGreen);
  pdf.text('tierramadre.co', pageWidth - borderMargin - 8, pageHeight - borderMargin - 5, { align: 'right' });
}

// Horizontal Carousel Layout - Premium Jewelry Style
async function addHorizontalCarouselLayout(
  pdf: jsPDF,
  emeralds: Emerald[],
  options: CatalogOptions,
  margin: number,
  _contentWidth: number,
  pageWidth: number,
  pageHeight: number,
  logoBase64?: string,
  theme: 'dark' | 'light' = 'dark'
) {
  const colors = getThemeColors(theme);
  const isLight = theme === 'light';

  for (let i = 0; i < emeralds.length; i++) {
    const emerald = emeralds[i];
    pdf.addPage();

    // Background
    setFillFromHex(pdf, colors.background);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // Subtle surface area
    setFillFromHex(pdf, colors.surface);
    pdf.rect(margin - 2, margin - 2, pageWidth - margin * 2 + 4, pageHeight - margin * 2 + 4, 'F');

    // Main EMERALD GREEN border frame
    setDrawFromHex(pdf, BRAND.emeraldGreen);
    pdf.setLineWidth(0.8);
    pdf.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

    // Inner silver border
    setDrawFromHex(pdf, isLight ? BRAND.silverDark : BRAND.silver);
    pdf.setLineWidth(0.15);
    pdf.rect(margin + 4, margin + 4, pageWidth - margin * 2 - 8, pageHeight - margin * 2 - 8);

    // === LEFT SIDE: IMAGE (55% of width) ===
    const imageAreaWidth = (pageWidth - margin * 2) * 0.55;
    const imageMargin = margin + 10;
    const imageWidth = imageAreaWidth - 20;
    const imageHeight = pageHeight - margin * 2 - 32;
    const imageY = margin + 16;

    // Image frame with emerald green accent
    setDrawFromHex(pdf, BRAND.emeraldGreen);
    pdf.setLineWidth(0.6);
    pdf.rect(imageMargin - 2, imageY - 2, imageWidth + 4, imageHeight + 4);

    // Inner silver frame
    setDrawFromHex(pdf, isLight ? BRAND.silverDark : BRAND.silver);
    pdf.setLineWidth(0.2);
    pdf.rect(imageMargin - 1, imageY - 1, imageWidth + 2, imageHeight + 2);

    if (emerald.imageUrl) {
      try {
        pdf.addImage(
          emerald.imageUrl,
          'JPEG',
          imageMargin,
          imageY,
          imageWidth,
          imageHeight,
          undefined,
          'FAST'
        );
      } catch {
        setFillFromHex(pdf, colors.priceBox);
        pdf.rect(imageMargin, imageY, imageWidth, imageHeight, 'F');
        setTextFromHex(pdf, colors.textMuted);
        pdf.setFontSize(10);
        pdf.text('Imagen no disponible', imageMargin + imageWidth / 2, imageY + imageHeight / 2, { align: 'center' });
      }
    }

    // === RIGHT SIDE: INFO (45% of width) ===
    const infoX = margin + imageAreaWidth + 12;
    const infoWidth = pageWidth - margin - infoX - 12;
    let infoY = margin + 16;

    // Logo at top of info section
    if (logoBase64) {
      try {
        const logoHeight = 26;
        const logoWidth = logoHeight * LOGO_ASPECT_RATIO;
        pdf.addImage(
          logoBase64,
          'PNG',
          infoX + (infoWidth - logoWidth) / 2,
          infoY,
          logoWidth,
          logoHeight
        );
        infoY += logoHeight + 8;
      } catch {
        setTextFromHex(pdf, BRAND.emeraldGreen);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('TIERRA MADRE', infoX + infoWidth / 2, infoY + 10, { align: 'center' });
        infoY += 20;
      }
    }

    // Decorative emerald line with accents
    setDrawFromHex(pdf, BRAND.emeraldGreen);
    pdf.setLineWidth(0.4);
    pdf.line(infoX + 15, infoY, infoX + infoWidth - 15, infoY);

    // Small accent dots
    setFillFromHex(pdf, BRAND.emeraldGreen);
    pdf.circle(infoX + 15, infoY, 0.8, 'F');
    pdf.circle(infoX + infoWidth - 15, infoY, 0.8, 'F');
    infoY += 10;

    // Product name - Large elegant text
    setTextFromHex(pdf, colors.text);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');

    const nameLines = pdf.splitTextToSize(emerald.name.toUpperCase(), infoWidth - 10);
    pdf.text(nameLines, infoX + infoWidth / 2, infoY, { align: 'center' });
    infoY += nameLines.length * 7 + 6;

    // Category in emerald green
    setTextFromHex(pdf, BRAND.emeraldGreen);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const categoryLabels: Record<string, string> = {
      loose: 'Esmeralda Suelta',
      ring: 'Anillo con Esmeralda',
      pendant: 'Dije / Colgante',
      earrings: 'Aretes con Esmeraldas',
    };
    pdf.text(categoryLabels[emerald.category] || 'Esmeralda Colombiana', infoX + infoWidth / 2, infoY, { align: 'center' });
    infoY += 14;

    // Decorative separator - emerald green
    setDrawFromHex(pdf, BRAND.emeraldGreen);
    pdf.setLineWidth(0.3);
    pdf.line(infoX + infoWidth / 2 - 30, infoY, infoX + infoWidth / 2 + 30, infoY);
    infoY += 14;

    // Details section with elegant styling
    const detailLabelX = infoX + 12;
    const detailValueX = infoX + infoWidth - 12;
    const detailRowHeight = 11;

    const addDetail = (label: string, value: string, highlight = false) => {
      setTextFromHex(pdf, colors.textMuted);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(label, detailLabelX, infoY);

      if (highlight) {
        setTextFromHex(pdf, BRAND.emeraldGreen);
      } else {
        setTextFromHex(pdf, colors.textSecondary);
      }
      pdf.setFont('helvetica', 'bold');
      pdf.text(value, detailValueX, infoY, { align: 'right' });
      infoY += detailRowHeight;
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

    infoY += 8;

    // Price - prominent display with EMERALD GREEN border
    if (options.showPrices && emerald.priceCOP) {
      const priceBoxWidth = infoWidth - 24;
      const priceBoxX = infoX + 12;

      setFillFromHex(pdf, colors.priceBox);
      pdf.rect(priceBoxX, infoY, priceBoxWidth, 18, 'F');
      setDrawFromHex(pdf, BRAND.emeraldGreen);
      pdf.setLineWidth(0.6);
      pdf.rect(priceBoxX, infoY, priceBoxWidth, 18);

      setTextFromHex(pdf, colors.text);
      pdf.setFontSize(17);
      pdf.setFont('helvetica', 'bold');
      const price = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(emerald.priceCOP);
      pdf.text(price, priceBoxX + priceBoxWidth / 2, infoY + 12, { align: 'center' });
      infoY += 24;
    }

    // AI Description
    if (emerald.aiDescription) {
      setTextFromHex(pdf, colors.textMuted);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      const descLines = pdf.splitTextToSize(`"${emerald.aiDescription}"`, infoWidth - 16);
      const linesToShow = descLines.slice(0, 4);
      pdf.text(linesToShow, infoX + infoWidth / 2, infoY, { align: 'center' });
    }

    // === FOOTER ===
    const footerY = pageHeight - margin - 5;

    // Page indicator (left) in silver
    setTextFromHex(pdf, isLight ? BRAND.mediumGray : BRAND.silver);
    pdf.setFontSize(8);
    pdf.text(`${i + 1} de ${emeralds.length}`, margin + 10, footerY);

    // Website (center) in emerald green
    setTextFromHex(pdf, BRAND.emeraldGreen);
    pdf.setFontSize(7);
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
      loose: 'Suelta',
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
