import jsPDF from 'jspdf';
import { Emerald } from '../types';

interface CatalogOptions {
  title?: string;
  showPrices: boolean;
  showWeights: boolean;
  showLotCodes: boolean;
  layout: 'grid' | 'list' | 'carousel';
}

// Tierra Madre Brand Colors - Premium Palette
const BRAND = {
  emeraldGreen: '#00AE7A',
  emeraldDark: '#006B4D',
  emeraldLight: '#00C98C',
  gold: '#C9A962',
  goldLight: '#E5D4A1',
  darkBg: '#0A0A0A',
  charcoal: '#141414',
  surface: '#1C1C1C',
  white: '#FFFFFF',
  offWhite: '#F5F5F5',
  lightGray: '#9A9A9A',
  mediumGray: '#5A5A5A',
  darkGray: '#2A2A2A',
};

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

// Set fill color from hex
function setFillFromHex(pdf: jsPDF, hex: string) {
  const rgb = hexToRgb(hex);
  pdf.setFillColor(rgb.r, rgb.g, rgb.b);
}

// Set draw color from hex
function setDrawFromHex(pdf: jsPDF, hex: string) {
  const rgb = hexToRgb(hex);
  pdf.setDrawColor(rgb.r, rgb.g, rgb.b);
}

// Set text color from hex
function setTextFromHex(pdf: jsPDF, hex: string) {
  const rgb = hexToRgb(hex);
  pdf.setTextColor(rgb.r, rgb.g, rgb.b);
}

export async function generateCatalog(
  emeralds: Emerald[],
  options: CatalogOptions
): Promise<jsPDF> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  // Cover Page
  if (options.layout === 'carousel') {
    addPremiumCoverPage(pdf, pageWidth, pageHeight, options.title, emeralds.length);
  } else {
    addCoverPage(pdf, pageWidth, pageHeight, options.title);
  }

  // Content Pages
  if (options.layout === 'carousel') {
    await addPremiumCarouselLayout(pdf, emeralds, options, margin, contentWidth, pageWidth, pageHeight);
  } else {
    pdf.addPage();
    if (options.layout === 'grid') {
      await addGridLayout(pdf, emeralds, options, margin, contentWidth);
    } else {
      await addListLayout(pdf, emeralds, options, margin, contentWidth, pageHeight);
    }
  }

  return pdf;
}

// Premium Cover Page for Carousel Catalog
function addPremiumCoverPage(
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  title?: string,
  totalItems?: number
) {
  // Rich dark background
  setFillFromHex(pdf, BRAND.darkBg);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Subtle gradient effect with overlapping rectangles
  setFillFromHex(pdf, BRAND.charcoal);
  pdf.rect(0, pageHeight * 0.3, pageWidth, pageHeight * 0.4, 'F');

  // Elegant border frame
  const borderMargin = 12;
  setDrawFromHex(pdf, BRAND.gold);
  pdf.setLineWidth(0.3);
  pdf.rect(borderMargin, borderMargin, pageWidth - borderMargin * 2, pageHeight - borderMargin * 2);

  // Inner decorative line
  pdf.setLineWidth(0.15);
  pdf.rect(borderMargin + 3, borderMargin + 3, pageWidth - borderMargin * 2 - 6, pageHeight - borderMargin * 2 - 6);

  // Corner ornaments
  const cornerSize = 20;
  const corners = [
    { x: borderMargin, y: borderMargin }, // top-left
    { x: pageWidth - borderMargin - cornerSize, y: borderMargin }, // top-right
    { x: borderMargin, y: pageHeight - borderMargin - cornerSize }, // bottom-left
    { x: pageWidth - borderMargin - cornerSize, y: pageHeight - borderMargin - cornerSize }, // bottom-right
  ];

  pdf.setLineWidth(0.5);
  corners.forEach((corner, idx) => {
    // Draw L-shaped corner ornaments
    if (idx === 0) {
      pdf.line(corner.x, corner.y + cornerSize, corner.x, corner.y);
      pdf.line(corner.x, corner.y, corner.x + cornerSize, corner.y);
    } else if (idx === 1) {
      pdf.line(corner.x, corner.y, corner.x + cornerSize, corner.y);
      pdf.line(corner.x + cornerSize, corner.y, corner.x + cornerSize, corner.y + cornerSize);
    } else if (idx === 2) {
      pdf.line(corner.x, corner.y, corner.x, corner.y + cornerSize);
      pdf.line(corner.x, corner.y + cornerSize, corner.x + cornerSize, corner.y + cornerSize);
    } else {
      pdf.line(corner.x, corner.y + cornerSize, corner.x + cornerSize, corner.y + cornerSize);
      pdf.line(corner.x + cornerSize, corner.y, corner.x + cornerSize, corner.y + cornerSize);
    }
  });

  // Top decorative element - emerald shape
  const centerX = pageWidth / 2;
  const gemY = pageHeight * 0.22;
  drawLuxuryEmeraldGem(pdf, centerX, gemY, 18);

  // Brand name - elegant typography
  const brandY = pageHeight * 0.38;
  setTextFromHex(pdf, BRAND.white);
  pdf.setFontSize(42);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TIERRA MADRE', centerX, brandY, { align: 'center' });

  // Decorative line under brand
  setDrawFromHex(pdf, BRAND.gold);
  pdf.setLineWidth(0.8);
  const lineWidth = 60;
  pdf.line(centerX - lineWidth / 2, brandY + 8, centerX + lineWidth / 2, brandY + 8);

  // Tagline
  setTextFromHex(pdf, BRAND.gold);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('E S E N C I A   Y   P O D E R', centerX, brandY + 20, { align: 'center' });

  // Catalog title
  if (title) {
    setTextFromHex(pdf, BRAND.offWhite);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'normal');
    pdf.text(title, centerX, pageHeight * 0.55, { align: 'center' });
  }

  // Collection info
  if (totalItems) {
    setTextFromHex(pdf, BRAND.lightGray);
    pdf.setFontSize(10);
    pdf.text(`${totalItems} piezas exclusivas`, centerX, pageHeight * 0.60, { align: 'center' });
  }

  // Bottom section - Colombian origin badge
  const badgeY = pageHeight * 0.78;
  setDrawFromHex(pdf, BRAND.emeraldGreen);
  pdf.setLineWidth(0.3);
  pdf.line(centerX - 35, badgeY, centerX + 35, badgeY);

  setTextFromHex(pdf, BRAND.emeraldGreen);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('100% ESMERALDAS COLOMBIANAS', centerX, badgeY + 8, { align: 'center' });

  setTextFromHex(pdf, BRAND.lightGray);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Certificadas • Naturales • Exclusivas', centerX, badgeY + 15, { align: 'center' });

  // Date at bottom
  setTextFromHex(pdf, BRAND.mediumGray);
  pdf.setFontSize(9);
  const date = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
  });
  pdf.text(date.charAt(0).toUpperCase() + date.slice(1), centerX, pageHeight - 20, { align: 'center' });

  // Website
  setTextFromHex(pdf, BRAND.gold);
  pdf.setFontSize(8);
  pdf.text('tierramadre.co', centerX, pageHeight - 14, { align: 'center' });
}

// Draw luxury emerald gem shape
function drawLuxuryEmeraldGem(pdf: jsPDF, x: number, y: number, size: number) {
  setDrawFromHex(pdf, BRAND.emeraldGreen);
  setFillFromHex(pdf, BRAND.emeraldGreen);

  // Outer emerald shape
  const s = size;
  pdf.setLineWidth(1);

  // Draw hexagonal emerald cut shape
  const points = [
    { x: x, y: y - s * 0.6 },        // top
    { x: x + s * 0.5, y: y - s * 0.3 }, // top-right
    { x: x + s * 0.5, y: y + s * 0.3 }, // bottom-right
    { x: x, y: y + s * 0.6 },        // bottom
    { x: x - s * 0.5, y: y + s * 0.3 }, // bottom-left
    { x: x - s * 0.5, y: y - s * 0.3 }, // top-left
  ];

  // Draw outline
  for (let i = 0; i < points.length; i++) {
    const next = (i + 1) % points.length;
    pdf.line(points[i].x, points[i].y, points[next].x, points[next].y);
  }

  // Inner facet lines
  pdf.setLineWidth(0.3);
  // Horizontal center line
  pdf.line(x - s * 0.4, y, x + s * 0.4, y);
  // Diagonal lines from top
  pdf.line(x, y - s * 0.5, x - s * 0.35, y);
  pdf.line(x, y - s * 0.5, x + s * 0.35, y);
  // Diagonal lines from bottom
  pdf.line(x, y + s * 0.5, x - s * 0.35, y);
  pdf.line(x, y + s * 0.5, x + s * 0.35, y);
}

// Premium Carousel Layout - One emerald per page with luxury design
async function addPremiumCarouselLayout(
  pdf: jsPDF,
  emeralds: Emerald[],
  options: CatalogOptions,
  margin: number,
  _contentWidth: number,
  pageWidth: number,
  pageHeight: number
) {
  for (let i = 0; i < emeralds.length; i++) {
    const emerald = emeralds[i];
    pdf.addPage();

    // Rich dark background
    setFillFromHex(pdf, BRAND.darkBg);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // Subtle surface rectangle for content area
    setFillFromHex(pdf, BRAND.charcoal);
    pdf.rect(margin - 2, margin - 2, pageWidth - margin * 2 + 4, pageHeight - margin * 2 + 4, 'F');

    // Elegant gold border frame
    setDrawFromHex(pdf, BRAND.gold);
    pdf.setLineWidth(0.4);
    pdf.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

    // === HEADER SECTION ===
    const headerY = margin + 10;

    // Brand name - smaller, elegant
    setTextFromHex(pdf, BRAND.emeraldGreen);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TIERRA MADRE', pageWidth / 2, headerY, { align: 'center' });

    // Small decorative line
    setDrawFromHex(pdf, BRAND.gold);
    pdf.setLineWidth(0.3);
    pdf.line(pageWidth / 2 - 20, headerY + 4, pageWidth / 2 + 20, headerY + 4);

    // === IMAGE SECTION - Large and prominent ===
    const imageY = headerY + 12;
    const imageMargin = margin + 8;
    const maxImageWidth = pageWidth - imageMargin * 2;
    const maxImageHeight = pageHeight * 0.48;

    // Image frame with gold accent
    setDrawFromHex(pdf, BRAND.gold);
    pdf.setLineWidth(0.5);
    pdf.rect(imageMargin - 1, imageY - 1, maxImageWidth + 2, maxImageHeight + 2);

    // Inner dark border
    setDrawFromHex(pdf, BRAND.darkGray);
    pdf.setLineWidth(2);
    pdf.rect(imageMargin, imageY, maxImageWidth, maxImageHeight);

    if (emerald.imageUrl) {
      try {
        pdf.addImage(
          emerald.imageUrl,
          'JPEG',
          imageMargin + 1,
          imageY + 1,
          maxImageWidth - 2,
          maxImageHeight - 2,
          undefined,
          'FAST'
        );
      } catch {
        setFillFromHex(pdf, BRAND.surface);
        pdf.rect(imageMargin + 1, imageY + 1, maxImageWidth - 2, maxImageHeight - 2, 'F');
        setTextFromHex(pdf, BRAND.mediumGray);
        pdf.setFontSize(12);
        pdf.text('Imagen no disponible', pageWidth / 2, imageY + maxImageHeight / 2, { align: 'center' });
      }
    }

    // === PRODUCT INFO SECTION ===
    const infoY = imageY + maxImageHeight + 12;

    // Product name - Large, gold, elegant
    setTextFromHex(pdf, BRAND.gold);
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    pdf.text(emerald.name.toUpperCase(), pageWidth / 2, infoY, { align: 'center' });

    // Decorative separator
    const sepY = infoY + 6;
    setDrawFromHex(pdf, BRAND.emeraldGreen);
    pdf.setLineWidth(0.5);
    pdf.line(pageWidth / 2 - 25, sepY, pageWidth / 2 + 25, sepY);

    // Category label
    setTextFromHex(pdf, BRAND.emeraldGreen);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const categoryLabels: Record<string, string> = {
      loose: 'Esmeralda Suelta',
      ring: 'Anillo con Esmeralda',
      pendant: 'Dije / Colgante',
      earrings: 'Aretes con Esmeraldas',
    };
    pdf.text(categoryLabels[emerald.category] || 'Esmeralda Colombiana', pageWidth / 2, sepY + 8, { align: 'center' });

    // === DETAILS GRID ===
    const detailsY = sepY + 18;
    const colWidth = 55;
    const col1X = pageWidth / 2 - colWidth - 5;
    const col2X = pageWidth / 2 + 5;
    let detailRow = 0;
    const rowHeight = 12;

    // Helper to add detail row
    const addDetailRow = (label: string, value: string, highlight: boolean = false) => {
      const y = detailsY + detailRow * rowHeight;

      // Label
      setTextFromHex(pdf, BRAND.lightGray);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(label, col1X + colWidth, y, { align: 'right' });

      // Value
      if (highlight) {
        setTextFromHex(pdf, BRAND.emeraldGreen);
      } else {
        setTextFromHex(pdf, BRAND.white);
      }
      pdf.setFont('helvetica', 'bold');
      pdf.text(value, col2X, y);

      detailRow++;
    };

    // Weight
    if (options.showWeights && emerald.weightCarats) {
      addDetailRow('Peso', `${emerald.weightCarats} quilates`);
    }

    // Lot code / Reference
    if (options.showLotCodes && emerald.lotCode) {
      addDetailRow('Referencia', emerald.lotCode);
    }

    // Origin - always show
    addDetailRow('Origen', 'Colombia');

    // Status
    const statusLabels: Record<string, string> = {
      available: 'Disponible',
      sold: 'Vendida',
      reserved: 'Reservada',
    };
    addDetailRow('Estado', statusLabels[emerald.status] || 'Disponible', true);

    // === PRICE SECTION ===
    if (options.showPrices && emerald.priceCOP) {
      const priceY = detailsY + detailRow * rowHeight + 8;

      // Price background accent
      setFillFromHex(pdf, BRAND.surface);
      pdf.rect(pageWidth / 2 - 40, priceY - 5, 80, 14, 'F');

      setDrawFromHex(pdf, BRAND.gold);
      pdf.setLineWidth(0.3);
      pdf.rect(pageWidth / 2 - 40, priceY - 5, 80, 14);

      setTextFromHex(pdf, BRAND.gold);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      const price = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(emerald.priceCOP);
      pdf.text(price, pageWidth / 2, priceY + 4, { align: 'center' });
    }

    // === AI DESCRIPTION ===
    if (emerald.aiDescription) {
      const descY = options.showPrices && emerald.priceCOP
        ? detailsY + detailRow * rowHeight + 28
        : detailsY + detailRow * rowHeight + 12;

      setTextFromHex(pdf, BRAND.lightGray);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');

      const maxDescWidth = pageWidth - margin * 2 - 20;
      const lines = pdf.splitTextToSize(`"${emerald.aiDescription}"`, maxDescWidth);
      const linesToShow = lines.slice(0, 2);
      pdf.text(linesToShow, pageWidth / 2, descY, { align: 'center' });
    }

    // === FOOTER ===
    const footerY = pageHeight - margin - 4;

    // Page indicator
    setTextFromHex(pdf, BRAND.mediumGray);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${i + 1} de ${emeralds.length}`, pageWidth / 2, footerY - 6, { align: 'center' });

    // Website / Contact
    setTextFromHex(pdf, BRAND.emeraldGreen);
    pdf.setFontSize(7);
    pdf.text('tierramadre.co  •  Esmeraldas Colombianas 100% Naturales', pageWidth / 2, footerY, { align: 'center' });
  }
}

// Original cover page for grid/list layouts
function addCoverPage(
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  title?: string
) {
  setFillFromHex(pdf, BRAND.darkBg);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  setTextFromHex(pdf, BRAND.white);
  pdf.setFontSize(36);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TIERRA MADRE', pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });

  setTextFromHex(pdf, BRAND.gold);
  pdf.setFontSize(14);
  pdf.text('ESENCIA Y PODER', pageWidth / 2, pageHeight / 2, { align: 'center' });

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

async function addGridLayout(
  pdf: jsPDF,
  emeralds: Emerald[],
  options: CatalogOptions,
  margin: number,
  contentWidth: number
) {
  const itemsPerRow = 3;
  const itemsPerPage = 6;
  const itemWidth = (contentWidth - 10 * (itemsPerRow - 1)) / itemsPerRow;
  const itemHeight = 70;
  const imageHeight = 45;

  let currentY = margin;
  let currentX = margin;
  let itemsOnPage = 0;

  for (let i = 0; i < emeralds.length; i++) {
    const emerald = emeralds[i];

    if (emerald.imageUrl) {
      try {
        pdf.addImage(
          emerald.imageUrl,
          'JPEG',
          currentX,
          currentY,
          itemWidth,
          imageHeight,
          undefined,
          'FAST'
        );
      } catch {
        setFillFromHex(pdf, BRAND.surface);
        pdf.rect(currentX, currentY, itemWidth, imageHeight, 'F');
      }
    }

    pdf.setFontSize(10);
    setTextFromHex(pdf, BRAND.gold);
    pdf.setFont('helvetica', 'bold');
    pdf.text(emerald.name, currentX, currentY + imageHeight + 5, {
      maxWidth: itemWidth,
    });

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
      const price = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(emerald.priceCOP);
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
  pageHeight: number
) {
  const rowHeight = 35;
  const imageSize = 30;
  let currentY = margin;

  setFillFromHex(pdf, BRAND.emeraldDark);
  pdf.rect(margin, currentY, contentWidth, 10, 'F');
  pdf.setFontSize(10);
  setTextFromHex(pdf, BRAND.white);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CATÁLOGO DE ESMERALDAS', margin + 5, currentY + 7);
  currentY += 15;

  for (const emerald of emeralds) {
    if (currentY + rowHeight > pageHeight - margin) {
      pdf.addPage();
      currentY = margin;
    }

    if (emerald.imageUrl) {
      try {
        pdf.addImage(
          emerald.imageUrl,
          'JPEG',
          margin,
          currentY,
          imageSize,
          imageSize,
          undefined,
          'FAST'
        );
      } catch {
        setFillFromHex(pdf, BRAND.surface);
        pdf.rect(margin, currentY, imageSize, imageSize, 'F');
      }
    }

    pdf.setFontSize(12);
    setTextFromHex(pdf, BRAND.gold);
    pdf.setFont('helvetica', 'bold');
    pdf.text(emerald.name, margin + imageSize + 5, currentY + 6);

    if (emerald.aiDescription) {
      pdf.setFontSize(8);
      setTextFromHex(pdf, BRAND.lightGray);
      pdf.setFont('helvetica', 'normal');
      const description = emerald.aiDescription.substring(0, 80) + (emerald.aiDescription.length > 80 ? '...' : '');
      pdf.text(description, margin + imageSize + 5, currentY + 12, {
        maxWidth: contentWidth - imageSize - 50,
      });
    }

    const rightX = contentWidth + margin - 30;

    if (options.showWeights && emerald.weightCarats) {
      pdf.setFontSize(9);
      setTextFromHex(pdf, BRAND.white);
      pdf.text(`${emerald.weightCarats} ct`, rightX, currentY + 6);
    }

    if (options.showLotCodes && emerald.lotCode) {
      pdf.setFontSize(8);
      setTextFromHex(pdf, BRAND.lightGray);
      pdf.text(emerald.lotCode, rightX, currentY + 12);
    }

    if (options.showPrices && emerald.priceCOP) {
      pdf.setFontSize(9);
      setTextFromHex(pdf, BRAND.emeraldGreen);
      const price = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(emerald.priceCOP);
      pdf.text(price, rightX, currentY + 20);
    }

    setDrawFromHex(pdf, BRAND.darkGray);
    pdf.line(margin, currentY + rowHeight - 2, margin + contentWidth, currentY + rowHeight - 2);

    currentY += rowHeight;
  }

  pdf.setFontSize(8);
  setTextFromHex(pdf, BRAND.mediumGray);
  pdf.text('tierramadre.co | Esmeraldas 100% Naturales', margin, pageHeight - 10);
}

export function downloadPDF(pdf: jsPDF, filename: string) {
  pdf.save(`${filename}.pdf`);
}
