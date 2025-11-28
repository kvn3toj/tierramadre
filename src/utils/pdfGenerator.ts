import jsPDF from 'jspdf';
import { Emerald } from '../types';

interface CatalogOptions {
  title?: string;
  showPrices: boolean;
  showWeights: boolean;
  showLotCodes: boolean;
  layout: 'grid' | 'list' | 'carousel';
}

// Tierra Madre Brand Colors
const BRAND = {
  emeraldGreen: '#00AE7A',
  emeraldDark: '#006B4D',
  gold: '#D4AF37',
  darkBg: '#0D0D0D',
  charcoal: '#1A1A1A',
  white: '#FFFFFF',
  lightGray: '#B8B8B8',
  mediumGray: '#666666',
};

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
  addCoverPage(pdf, pageWidth, pageHeight, options.title);

  // Content Pages
  if (options.layout === 'carousel') {
    // Carousel: each emerald gets its own full page
    await addCarouselLayout(pdf, emeralds, options, margin, contentWidth, pageWidth, pageHeight);
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

function addCoverPage(
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  title?: string
) {
  // Dark background simulation (we'll use a rectangle)
  pdf.setFillColor(30, 30, 30);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Brand name
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(36);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TIERRA MADRE', pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });

  // Tagline
  pdf.setFontSize(14);
  pdf.setTextColor(212, 175, 55); // Gold
  pdf.text('ESENCIA Y PODER', pageWidth / 2, pageHeight / 2, { align: 'center' });

  // Catalog title
  if (title) {
    pdf.setFontSize(18);
    pdf.setTextColor(255, 255, 255);
    pdf.text(title, pageWidth / 2, pageHeight / 2 + 30, { align: 'center' });
  }

  // Date
  pdf.setFontSize(10);
  pdf.setTextColor(150, 150, 150);
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

    // Add image
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
          'FAST' // Best quality - no additional compression
        );
      } catch {
        // If image fails, add placeholder
        pdf.setFillColor(40, 40, 40);
        pdf.rect(currentX, currentY, itemWidth, imageHeight, 'F');
      }
    }

    // Add name
    pdf.setFontSize(10);
    pdf.setTextColor(212, 175, 55); // Gold
    pdf.setFont('helvetica', 'bold');
    pdf.text(emerald.name, currentX, currentY + imageHeight + 5, {
      maxWidth: itemWidth,
    });

    // Add details
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
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
      pdf.setTextColor(255, 255, 255);
      const price = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(emerald.priceCOP);
      pdf.text(price, currentX, detailY);
    }

    // Move to next position
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

  // Header
  pdf.setFillColor(46, 125, 50); // Emerald green
  pdf.rect(margin, currentY, contentWidth, 10, 'F');
  pdf.setFontSize(10);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CATÁLOGO DE ESMERALDAS', margin + 5, currentY + 7);
  currentY += 15;

  for (const emerald of emeralds) {
    // Check if we need a new page
    if (currentY + rowHeight > pageHeight - margin) {
      pdf.addPage();
      currentY = margin;
    }

    // Image
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
          'FAST' // Best quality - no additional compression
        );
      } catch {
        pdf.setFillColor(40, 40, 40);
        pdf.rect(margin, currentY, imageSize, imageSize, 'F');
      }
    }

    // Name
    pdf.setFontSize(12);
    pdf.setTextColor(212, 175, 55);
    pdf.setFont('helvetica', 'bold');
    pdf.text(emerald.name, margin + imageSize + 5, currentY + 6);

    // Description
    if (emerald.aiDescription) {
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.setFont('helvetica', 'normal');
      const description = emerald.aiDescription.substring(0, 80) + (emerald.aiDescription.length > 80 ? '...' : '');
      pdf.text(description, margin + imageSize + 5, currentY + 12, {
        maxWidth: contentWidth - imageSize - 50,
      });
    }

    // Details (right side)
    const rightX = contentWidth + margin - 30;

    if (options.showWeights && emerald.weightCarats) {
      pdf.setFontSize(9);
      pdf.setTextColor(255, 255, 255);
      pdf.text(`${emerald.weightCarats} ct`, rightX, currentY + 6);
    }

    if (options.showLotCodes && emerald.lotCode) {
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(emerald.lotCode, rightX, currentY + 12);
    }

    if (options.showPrices && emerald.priceCOP) {
      pdf.setFontSize(9);
      pdf.setTextColor(46, 125, 50);
      const price = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(emerald.priceCOP);
      pdf.text(price, rightX, currentY + 20);
    }

    // Separator line
    pdf.setDrawColor(60, 60, 60);
    pdf.line(margin, currentY + rowHeight - 2, margin + contentWidth, currentY + rowHeight - 2);

    currentY += rowHeight;
  }

  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text('tierramadre.co | Esmeraldas 100% Naturales', margin, pageHeight - 10);
}

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

// Draw decorative corner elements
function drawCornerDecorations(
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  color: string
) {
  const rgb = hexToRgb(color);
  pdf.setDrawColor(rgb.r, rgb.g, rgb.b);
  pdf.setLineWidth(0.5);

  const cornerSize = 15;

  // Top-left corner
  pdf.line(margin, margin + cornerSize, margin, margin);
  pdf.line(margin, margin, margin + cornerSize, margin);

  // Top-right corner
  pdf.line(pageWidth - margin - cornerSize, margin, pageWidth - margin, margin);
  pdf.line(pageWidth - margin, margin, pageWidth - margin, margin + cornerSize);

  // Bottom-left corner
  pdf.line(margin, pageHeight - margin - cornerSize, margin, pageHeight - margin);
  pdf.line(margin, pageHeight - margin, margin + cornerSize, pageHeight - margin);

  // Bottom-right corner
  pdf.line(pageWidth - margin - cornerSize, pageHeight - margin, pageWidth - margin, pageHeight - margin);
  pdf.line(pageWidth - margin, pageHeight - margin - cornerSize, pageWidth - margin, pageHeight - margin);
}

// Draw emerald gem icon (simplified geometric shape)
function drawEmeraldIcon(pdf: jsPDF, x: number, y: number, size: number, color: string) {
  const rgb = hexToRgb(color);
  pdf.setFillColor(rgb.r, rgb.g, rgb.b);
  pdf.setDrawColor(rgb.r, rgb.g, rgb.b);

  // Simple diamond/emerald shape
  const halfSize = size / 2;
  const points = [
    { x: x, y: y - halfSize },           // top
    { x: x + halfSize * 0.7, y: y - halfSize * 0.3 }, // top-right
    { x: x + halfSize * 0.7, y: y + halfSize * 0.3 }, // bottom-right
    { x: x, y: y + halfSize },           // bottom
    { x: x - halfSize * 0.7, y: y + halfSize * 0.3 }, // bottom-left
    { x: x - halfSize * 0.7, y: y - halfSize * 0.3 }, // top-left
  ];

  pdf.setLineWidth(0.3);
  for (let i = 0; i < points.length; i++) {
    const next = (i + 1) % points.length;
    pdf.line(points[i].x, points[i].y, points[next].x, points[next].y);
  }
}

async function addCarouselLayout(
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

    // Dark elegant background
    const bgRgb = hexToRgb(BRAND.charcoal);
    pdf.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // Decorative corner elements
    drawCornerDecorations(pdf, pageWidth, pageHeight, margin, BRAND.emeraldGreen);

    // Header section with brand
    const headerY = margin + 5;

    // "TIERRA MADRE" text at top
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    const emeraldRgb = hexToRgb(BRAND.emeraldGreen);
    pdf.setTextColor(emeraldRgb.r, emeraldRgb.g, emeraldRgb.b);
    pdf.text('TIERRA MADRE', pageWidth / 2, headerY, { align: 'center' });

    // Small emerald icon below brand name
    drawEmeraldIcon(pdf, pageWidth / 2, headerY + 8, 8, BRAND.emeraldGreen);

    // Thin decorative line
    pdf.setDrawColor(emeraldRgb.r, emeraldRgb.g, emeraldRgb.b);
    pdf.setLineWidth(0.3);
    const lineY = headerY + 15;
    pdf.line(pageWidth / 2 - 30, lineY, pageWidth / 2 + 30, lineY);

    // Main image section - large centered image
    const imageY = lineY + 10;
    const maxImageWidth = pageWidth - margin * 2 - 20;
    const maxImageHeight = pageHeight * 0.45;

    if (emerald.imageUrl) {
      try {
        // Calculate image dimensions maintaining aspect ratio
        const imgWidth = maxImageWidth;
        const imgHeight = maxImageHeight;
        const imgX = (pageWidth - imgWidth) / 2;

        // Add subtle border/frame around image
        pdf.setDrawColor(emeraldRgb.r, emeraldRgb.g, emeraldRgb.b);
        pdf.setLineWidth(0.5);
        pdf.rect(imgX - 2, imageY - 2, imgWidth + 4, imgHeight + 4);

        // Add the image
        pdf.addImage(
          emerald.imageUrl,
          'JPEG',
          imgX,
          imageY,
          imgWidth,
          imgHeight,
          undefined,
          'FAST'
        );
      } catch {
        // Placeholder if image fails
        const placeholderRgb = hexToRgb(BRAND.darkBg);
        pdf.setFillColor(placeholderRgb.r, placeholderRgb.g, placeholderRgb.b);
        const imgX = (pageWidth - maxImageWidth) / 2;
        pdf.rect(imgX, imageY, maxImageWidth, maxImageHeight, 'F');

        pdf.setTextColor(100, 100, 100);
        pdf.setFontSize(12);
        pdf.text('Imagen no disponible', pageWidth / 2, imageY + maxImageHeight / 2, { align: 'center' });
      }
    }

    // Info section below image
    const infoY = imageY + maxImageHeight + 15;

    // Emerald name - prominent gold text
    const goldRgb = hexToRgb(BRAND.gold);
    pdf.setTextColor(goldRgb.r, goldRgb.g, goldRgb.b);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text(emerald.name.toUpperCase(), pageWidth / 2, infoY, { align: 'center' });

    // Category badge
    const categoryY = infoY + 8;
    pdf.setFontSize(9);
    pdf.setTextColor(emeraldRgb.r, emeraldRgb.g, emeraldRgb.b);
    const categoryLabels: Record<string, string> = {
      loose: 'ESMERALDA SUELTA',
      ring: 'ANILLO',
      pendant: 'DIJE / COLGANTE',
      earrings: 'ARETES',
    };
    pdf.text(categoryLabels[emerald.category] || 'ESMERALDA', pageWidth / 2, categoryY, { align: 'center' });

    // Decorative separator
    const sepY = categoryY + 6;
    pdf.setLineWidth(0.2);
    pdf.line(pageWidth / 2 - 40, sepY, pageWidth / 2 + 40, sepY);

    // Details section - two columns
    const detailsY = sepY + 10;
    const leftCol = pageWidth / 2 - 35;
    const rightCol = pageWidth / 2 + 5;
    let currentDetailY = detailsY;

    pdf.setFontSize(9);
    const grayRgb = hexToRgb(BRAND.lightGray);

    // Weight
    if (options.showWeights && emerald.weightCarats) {
      pdf.setTextColor(grayRgb.r, grayRgb.g, grayRgb.b);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Peso:', leftCol, currentDetailY);

      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${emerald.weightCarats} quilates`, rightCol, currentDetailY);
      currentDetailY += 7;
    }

    // Lot code
    if (options.showLotCodes && emerald.lotCode) {
      pdf.setTextColor(grayRgb.r, grayRgb.g, grayRgb.b);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Referencia:', leftCol, currentDetailY);

      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text(emerald.lotCode, rightCol, currentDetailY);
      currentDetailY += 7;
    }

    // Status
    pdf.setTextColor(grayRgb.r, grayRgb.g, grayRgb.b);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Estado:', leftCol, currentDetailY);

    const statusLabels: Record<string, string> = {
      available: 'Disponible',
      sold: 'Vendida',
      reserved: 'Reservada',
    };
    pdf.setTextColor(emeraldRgb.r, emeraldRgb.g, emeraldRgb.b);
    pdf.setFont('helvetica', 'bold');
    pdf.text(statusLabels[emerald.status] || 'Disponible', rightCol, currentDetailY);
    currentDetailY += 7;

    // Origin
    pdf.setTextColor(grayRgb.r, grayRgb.g, grayRgb.b);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Origen:', leftCol, currentDetailY);

    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Colombia', rightCol, currentDetailY);
    currentDetailY += 12;

    // Price - prominent display
    if (options.showPrices && emerald.priceCOP) {
      pdf.setTextColor(goldRgb.r, goldRgb.g, goldRgb.b);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      const price = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(emerald.priceCOP);
      pdf.text(price, pageWidth / 2, currentDetailY, { align: 'center' });
      currentDetailY += 10;
    }

    // AI Description - elegant italic text
    if (emerald.aiDescription) {
      const descY = currentDetailY + 5;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(grayRgb.r, grayRgb.g, grayRgb.b);

      // Word wrap the description
      const maxDescWidth = pageWidth - margin * 2 - 30;
      const lines = pdf.splitTextToSize(`"${emerald.aiDescription}"`, maxDescWidth);
      const linesToShow = lines.slice(0, 3); // Max 3 lines
      pdf.text(linesToShow, pageWidth / 2, descY, { align: 'center' });
    }

    // Footer section
    const footerY = pageHeight - margin - 5;

    // Page number
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`${i + 1} / ${emeralds.length}`, pageWidth / 2, footerY, { align: 'center' });

    // Contact info at bottom
    pdf.setFontSize(7);
    pdf.setTextColor(emeraldRgb.r, emeraldRgb.g, emeraldRgb.b);
    pdf.text('tierramadre.co  |  Esmeraldas Colombianas 100% Naturales', pageWidth / 2, footerY + 5, { align: 'center' });
  }
}

export function downloadPDF(pdf: jsPDF, filename: string) {
  pdf.save(`${filename}.pdf`);
}
