import jsPDF from 'jspdf';
import { Emerald } from '../types';

interface CatalogOptions {
  title?: string;
  showPrices: boolean;
  showWeights: boolean;
  showLotCodes: boolean;
  layout: 'grid' | 'list';
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
  addCoverPage(pdf, pageWidth, pageHeight, options.title);

  // Content Pages
  pdf.addPage();

  if (options.layout === 'grid') {
    await addGridLayout(pdf, emeralds, options, margin, contentWidth);
  } else {
    await addListLayout(pdf, emeralds, options, margin, contentWidth, pageHeight);
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
          'MEDIUM'
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
          'MEDIUM'
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

export function downloadPDF(pdf: jsPDF, filename: string) {
  pdf.save(`${filename}.pdf`);
}
