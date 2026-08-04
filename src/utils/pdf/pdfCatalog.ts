/**
 * PDF Catalog Generation
 * Main catalog orchestrator, portrait cover page, grid layout, and list layout.
 *
 * Extracted from pdfGenerator.ts for modularity.
 */

import type jsPDF from 'jspdf';
import { ensureJsPDFLoaded, getGState } from './jspdf-loader';
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
import {
  BRAND,
  setFillFromHex,
  setTextFromHex,
  getImageDimensions,
  calculateAspectRatioFit,
  loadLogoBase64,
  loadLockupBase64,
} from './pdfCommon';
import type { Emerald, CatalogOptions } from './pdfCommon';
import {
  addHorizontalCoverPage,
  addHorizontalCarouselLayout,
} from './pdfSlide';

// =============================================================================
// MAIN CATALOG GENERATOR
// =============================================================================

export async function generateCatalog(
  emeralds: Emerald[],
  options: CatalogOptions,
): Promise<jsPDF> {
  const { default: jsPDF } = await ensureJsPDFLoaded();

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

  // The cover draws at 32mm, so it carries the full lockup (wordmark + slogan).
  // Page headers stay on the square mark — at 12–14mm the slogan is illegible.
  const lockupBase64 = await loadLockupBase64(theme === 'dark');

  // Cover Page
  if (isCarousel) {
    await addHorizontalCoverPage(
      pdf,
      pageWidth,
      pageHeight,
      options.title,
      emeralds.length,
      lockupBase64,
      theme,
    );
  } else {
    addCoverPage(pdf, pageWidth, pageHeight, options.title);
  }

  // Content Pages
  if (isCarousel) {
    await addHorizontalCarouselLayout(
      pdf,
      emeralds,
      options,
      margin,
      contentWidth,
      pageWidth,
      pageHeight,
      logoBase64,
      theme,
    );
  } else {
    pdf.addPage();
    if (options.layout === 'grid') {
      await addGridLayout(
        pdf,
        emeralds,
        options,
        margin,
        contentWidth,
        pageWidth,
        logoBase64,
        theme,
        pageHeight,
      );
    } else {
      await addListLayout(
        pdf,
        emeralds,
        options,
        margin,
        contentWidth,
        pageWidth,
        pageHeight,
        logoBase64,
        theme,
      );
    }
  }

  return pdf;
}

// =============================================================================
// PORTRAIT COVER PAGE
// =============================================================================

function addCoverPage(
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  title?: string,
) {
  setFillFromHex(pdf, BRAND.darkBg);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  setTextFromHex(pdf, BRAND.emeraldGreen);
  pdf.setFontSize(36);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TIERRA MADRE', pageWidth / 2, pageHeight / 2 - 20, {
    align: 'center',
  });

  setTextFromHex(pdf, BRAND.silver);
  pdf.setFontSize(14);
  pdf.text('ESMERALDAS CON ADN DE PAZ', pageWidth / 2, pageHeight / 2, {
    align: 'center',
  });

  if (title) {
    setTextFromHex(pdf, BRAND.white);
    pdf.setFontSize(18);
    pdf.text(title, pageWidth / 2, pageHeight / 2 + 30, { align: 'center' });
  }

  setTextFromHex(pdf, BRAND.mediumGray);
  pdf.setFontSize(10);
  const date = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
  });
  pdf.text(date, pageWidth / 2, pageHeight - 20, { align: 'center' });
}

// =============================================================================
// GRID LAYOUT (iOS HIG Style - 3 columns)
// =============================================================================

async function addGridLayout(
  pdf: jsPDF,
  emeralds: Emerald[],
  options: CatalogOptions,
  _margin: number,
  _contentWidth: number,
  pageWidth: number,
  logoBase64?: string,
  themeParam?: 'dark' | 'light',
  pageHeight?: number,
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
        'MEDIUM',
      );
    }

    // Title at top-left - iOS headline
    applyIOSTextStyle(
      pdf,
      'headline',
      iosColors.textPrimary,
      theme as ThemeMode,
    );
    pdf.text(options.title || 'COLECCIÓN', iosMargin, iosMargin + 5);

    // Subtitle - iOS caption
    applyIOSTextStyle(
      pdf,
      'caption1',
      iosColors.textTertiary,
      theme as ThemeMode,
    );
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
    applyIOSTextStyle(
      pdf,
      'caption1',
      iosColors.textTertiary,
      theme as ThemeMode,
    );
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
    pdf.roundedRect(
      currentX,
      currentY,
      cardWidth,
      cardHeight,
      BORDER_RADIUS_MM.md,
      BORDER_RADIUS_MM.md,
      'F',
    );

    // Card border
    setStrokeColor(pdf, iosColors.border);
    pdf.setLineWidth(0.2);
    pdf.roundedRect(
      currentX,
      currentY,
      cardWidth,
      cardHeight,
      BORDER_RADIUS_MM.md,
      BORDER_RADIUS_MM.md,
      'S',
    );

    // Image area with rounded top corners
    const imageAreaHeight = imageHeight;
    if (emerald.mediaData) {
      try {
        // Load image and fit within card
        const imgDimensions = await getImageDimensions(emerald.mediaData);
        const fitDimensions = calculateAspectRatioFit(
          imgDimensions.width,
          imgDimensions.height,
          cardWidth - 2,
          imageAreaHeight - 2,
        );

        // Center the image
        const centeredX = currentX + (cardWidth - fitDimensions.width) / 2;
        const centeredY =
          currentY + (imageAreaHeight - fitDimensions.height) / 2;

        pdf.addImage(
          emerald.mediaData,
          'JPEG',
          centeredX,
          centeredY,
          fitDimensions.width,
          fitDimensions.height,
          undefined,
          'MEDIUM',
        );
      } catch {
        // Placeholder for failed images
        setFillColor(pdf, iosColors.backgroundSecondary);
        pdf.rect(
          currentX + 1,
          currentY + 1,
          cardWidth - 2,
          imageAreaHeight - 2,
          'F',
        );

        // Placeholder icon (emerald diamond shape)
        const cx = currentX + cardWidth / 2;
        const cy = currentY + imageAreaHeight / 2;
        setFillColor(pdf, iosColors.emeraldPrimary);
        pdf.setGState(new (getGState())({ opacity: 0.3 }));
        pdf.circle(cx, cy, 8, 'F');
        pdf.setGState(new (getGState())({ opacity: 1 }));
      }
    }

    // Separator line below image
    setStrokeColor(pdf, iosColors.border);
    pdf.setLineWidth(0.1);
    pdf.line(
      currentX + 2,
      currentY + imageAreaHeight,
      currentX + cardWidth - 2,
      currentY + imageAreaHeight,
    );

    // Text content area
    const textY = currentY + imageAreaHeight + textPadding + 3;
    const textX = currentX + textPadding;
    const textWidth = cardWidth - textPadding * 2;

    // Name - iOS footnote bold, truncated
    applyIOSTextStyle(
      pdf,
      'footnote',
      iosColors.textPrimary,
      theme as ThemeMode,
    );
    pdf.setFont('helvetica', 'bold');
    const displayName =
      emerald.name.length > 18
        ? emerald.name.substring(0, 16) + '...'
        : emerald.name;
    pdf.text(displayName, textX, textY, { maxWidth: textWidth });

    // Details row - iOS caption
    let detailY = textY + 5;
    applyCustomTextStyle(
      pdf,
      'caption2',
      iosColors.textSecondary,
      theme as ThemeMode,
    );

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
      pdf.setGState(new (getGState())({ opacity: 0.15 }));
      pdf.roundedRect(pillX, pillY, pillWidth, pillHeight, 1.5, 1.5, 'F');
      pdf.setGState(new (getGState())({ opacity: 1 }));

      // Pill text
      applyCustomTextStyle(
        pdf,
        'caption2',
        iosColors.emeraldPrimary,
        theme as ThemeMode,
      );
      pdf.text(categoryShort, pillX + 1.5, detailY);
    }

    // Price (if enabled) - right side
    if (options.showPrices && emerald.priceCOP) {
      const displayCurrency = options.currency || 'COP';
      const priceValue = options.convertPrice
        ? options.convertPrice(emerald.priceCOP)
        : emerald.priceCOP;
      const price = new Intl.NumberFormat(
        displayCurrency === 'USD' ? 'en-US' : 'es-CO',
        {
          style: 'currency',
          currency: displayCurrency,
          maximumFractionDigits: 0,
        },
      ).format(priceValue);

      applyCustomTextStyle(
        pdf,
        'caption2',
        iosColors.emeraldPrimary,
        theme as ThemeMode,
      );
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

// =============================================================================
// LIST LAYOUT (iOS HIG Style)
// =============================================================================

async function addListLayout(
  pdf: jsPDF,
  emeralds: Emerald[],
  options: CatalogOptions,
  _margin: number,
  _contentWidth: number,
  pageWidth: number,
  pageHeight: number,
  logoBase64?: string,
  themeParam?: 'dark' | 'light',
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
        'MEDIUM',
      );
    }

    // Title at top-left - iOS title2
    applyIOSTextStyle(pdf, 'title2', iosColors.textPrimary, theme as ThemeMode);
    pdf.text(options.title || 'CATÁLOGO', iosMargin, iosMargin + 5);

    // Item count - iOS caption
    applyIOSTextStyle(
      pdf,
      'caption1',
      iosColors.textTertiary,
      theme as ThemeMode,
    );
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
    applyIOSTextStyle(
      pdf,
      'caption1',
      iosColors.textTertiary,
      theme as ThemeMode,
    );
    pdf.text(`Página ${pageNumber}`, iosMargin, footerY);

    // Website (center)
    setTextColor(pdf, iosColors.emeraldPrimary);
    pdf.text('tierramadre.co', pageWidth / 2, footerY, { align: 'center' });

    // Tagline (right)
    setTextColor(pdf, iosColors.textTertiary);
    pdf.text('Esmeraldas 100% Naturales', pageWidth - iosMargin, footerY, {
      align: 'right',
    });
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
    setFillColor(
      pdf,
      itemsOnPage % 2 === 0 ? iosColors.card : iosColors.backgroundSecondary,
    );
    pdf.roundedRect(
      cardX,
      cardY,
      cardWidth,
      cardHeight,
      BORDER_RADIUS_MM.sm,
      BORDER_RADIUS_MM.sm,
      'F',
    );

    // Subtle border
    setStrokeColor(pdf, iosColors.border);
    pdf.setLineWidth(0.15);
    pdf.roundedRect(
      cardX,
      cardY,
      cardWidth,
      cardHeight,
      BORDER_RADIUS_MM.sm,
      BORDER_RADIUS_MM.sm,
    );

    // Left emerald accent bar
    setFillColor(pdf, iosColors.emeraldPrimary);
    pdf.roundedRect(cardX, cardY, 1.5, cardHeight, 0.75, 0.75, 'F');

    // === IMAGE SECTION ===
    const imageX = cardX + SPACING_MM.sm;
    const imageY = cardY + (cardHeight - imageSize) / 2;

    // Image container with rounded corners
    setFillColor(pdf, iosColors.backgroundSecondary);
    pdf.roundedRect(
      imageX,
      imageY,
      imageSize,
      imageSize,
      BORDER_RADIUS_MM.sm,
      BORDER_RADIUS_MM.sm,
      'F',
    );

    if (emerald.mediaData) {
      try {
        const imgDimensions = await getImageDimensions(emerald.mediaData);
        const fitDimensions = calculateAspectRatioFit(
          imgDimensions.width,
          imgDimensions.height,
          imageSize - 2,
          imageSize - 2,
        );

        const centeredX = imageX + (imageSize - fitDimensions.width) / 2;
        const centeredY = imageY + (imageSize - fitDimensions.height) / 2;

        pdf.addImage(
          emerald.mediaData,
          'JPEG',
          centeredX,
          centeredY,
          fitDimensions.width,
          fitDimensions.height,
          undefined,
          'MEDIUM',
        );
      } catch {
        applyIOSTextStyle(
          pdf,
          'caption2',
          iosColors.textTertiary,
          theme as ThemeMode,
        );
        pdf.text('Sin imagen', imageX + imageSize / 2, imageY + imageSize / 2, {
          align: 'center',
        });
      }
    }

    // Item number badge (iOS style pill)
    const badgeX = imageX + imageSize - 8;
    const badgeY = imageY + 2;
    setFillColor(pdf, iosColors.emeraldPrimary);
    pdf.roundedRect(badgeX, badgeY, 10, 6, 3, 3, 'F');
    applyIOSTextStyle(
      pdf,
      'caption2',
      iosColors.textOnEmerald,
      theme as ThemeMode,
    );
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${i + 1}`, badgeX + 5, badgeY + 4.5, { align: 'center' });

    // === CONTENT SECTION ===
    const contentX = imageX + imageSize + SPACING_MM.sm;
    const contentColWidth = cardWidth - imageSize - 80 - SPACING_MM.md * 2;
    let contentY = cardY + SPACING_MM.sm + 2;

    // Product name - iOS headline
    applyIOSTextStyle(
      pdf,
      'headline',
      iosColors.textPrimary,
      theme as ThemeMode,
    );
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

    applyIOSTextStyle(
      pdf,
      'caption2',
      iosColors.emeraldPrimary,
      theme as ThemeMode,
    );
    const categoryWidth = pdf.getTextWidth(category) + 4;
    setFillColor(pdf, iosColors.emeraldPrimary);
    pdf.setGState(new (getGState())({ opacity: 0.12 }));
    pdf.roundedRect(contentX, contentY - 3, categoryWidth, 5, 2.5, 2.5, 'F');
    pdf.setGState(new (getGState())({ opacity: 1 }));

    setTextColor(pdf, iosColors.emeraldPrimary);
    pdf.text(category, contentX + 2, contentY);
    contentY += 5;

    // Description - iOS footnote
    if (emerald.aiDescription) {
      applyIOSTextStyle(
        pdf,
        'caption1',
        iosColors.textTertiary,
        theme as ThemeMode,
      );
      const description =
        emerald.aiDescription.substring(0, 80) +
        (emerald.aiDescription.length > 80 ? '...' : '');
      const descLines = pdf.splitTextToSize(description, contentColWidth);
      pdf.text(descLines.slice(0, 2), contentX, contentY);
    }

    // === RIGHT COLUMN - Details & Price ===
    const rightColX = cardX + cardWidth - 72;
    let rightY = cardY + SPACING_MM.sm;

    // Details with iOS styling
    const addDetail = (label: string, value: string, highlight = false) => {
      applyIOSTextStyle(
        pdf,
        'caption2',
        iosColors.textTertiary,
        theme as ThemeMode,
      );
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
    addDetail(
      'Estado',
      statusLabels[emerald.status] || 'Disponible',
      emerald.status === 'available',
    );

    // Price box - iOS prominent style
    if (options.showPrices && emerald.priceCOP) {
      rightY += 2;
      const priceBoxWidth = 65;
      const priceBoxHeight = 12;

      setFillColor(pdf, iosColors.backgroundSecondary);
      pdf.roundedRect(
        rightColX,
        rightY - 2,
        priceBoxWidth,
        priceBoxHeight,
        BORDER_RADIUS_MM.sm,
        BORDER_RADIUS_MM.sm,
        'F',
      );

      setStrokeColor(pdf, iosColors.emeraldPrimary);
      pdf.setLineWidth(0.4);
      pdf.roundedRect(
        rightColX,
        rightY - 2,
        priceBoxWidth,
        priceBoxHeight,
        BORDER_RADIUS_MM.sm,
        BORDER_RADIUS_MM.sm,
      );

      applyIOSTextStyle(
        pdf,
        'callout',
        iosColors.textPrimary,
        theme as ThemeMode,
      );
      pdf.setFont('helvetica', 'bold');
      const displayCurrency = options.currency || 'COP';
      const priceValue = options.convertPrice
        ? options.convertPrice(emerald.priceCOP)
        : emerald.priceCOP;
      const price = new Intl.NumberFormat(
        displayCurrency === 'USD' ? 'en-US' : 'es-CO',
        {
          style: 'currency',
          currency: displayCurrency,
          maximumFractionDigits: 0,
        },
      ).format(priceValue);
      pdf.text(price, rightColX + priceBoxWidth / 2, rightY + 6, {
        align: 'center',
      });
    }

    currentY += rowHeight;
    itemsOnPage++;
  }

  // Add footer to last page
  addIOSPageFooter();
}
