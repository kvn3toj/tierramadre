import jsPDF from 'jspdf';
import { Emerald } from '../types';

interface CatalogOptions {
  title?: string;
  showPrices: boolean;
  showWeights: boolean;
  showLotCodes: boolean;
  layout: 'grid' | 'list' | 'carousel';
  logoBase64?: string;
}

// Tierra Madre Brand Colors - Premium Palette
const BRAND = {
  emeraldGreen: '#00AE7A',
  emeraldDark: '#008F63',
  emeraldLight: '#00C98C',
  gold: '#C9A962',
  goldLight: '#E5D4A1',
  darkBg: '#0A0A0A',
  charcoal: '#111111',
  surface: '#1A1A1A',
  white: '#FFFFFF',
  offWhite: '#F5F5F5',
  cream: '#FAF8F5',
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

function setFillFromHex(pdf: jsPDF, hex: string) {
  const rgb = hexToRgb(hex);
  pdf.setFillColor(rgb.r, rgb.g, rgb.b);
}

function setDrawFromHex(pdf: jsPDF, hex: string) {
  const rgb = hexToRgb(hex);
  pdf.setDrawColor(rgb.r, rgb.g, rgb.b);
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

  // Cover Page
  if (isCarousel) {
    addHorizontalCoverPage(pdf, pageWidth, pageHeight, options.title, emeralds.length, logoBase64);
  } else {
    addCoverPage(pdf, pageWidth, pageHeight, options.title);
  }

  // Content Pages
  if (isCarousel) {
    await addHorizontalCarouselLayout(pdf, emeralds, options, margin, contentWidth, pageWidth, pageHeight, logoBase64);
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

// Horizontal Cover Page with Logo
function addHorizontalCoverPage(
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  title?: string,
  totalItems?: number,
  logoBase64?: string
) {
  // Rich dark background
  setFillFromHex(pdf, BRAND.darkBg);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Elegant gold border frame
  const borderMargin = 10;
  setDrawFromHex(pdf, BRAND.gold);
  pdf.setLineWidth(0.4);
  pdf.rect(borderMargin, borderMargin, pageWidth - borderMargin * 2, pageHeight - borderMargin * 2);

  // Inner border
  pdf.setLineWidth(0.15);
  pdf.rect(borderMargin + 4, borderMargin + 4, pageWidth - borderMargin * 2 - 8, pageHeight - borderMargin * 2 - 8);

  // Corner accents
  const cornerLength = 25;
  pdf.setLineWidth(0.6);
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

  // Add Logo Image
  if (logoBase64) {
    try {
      const logoWidth = 80;
      const logoHeight = 45;
      pdf.addImage(
        logoBase64,
        'PNG',
        centerX - logoWidth / 2,
        centerY - 35,
        logoWidth,
        logoHeight
      );
    } catch (e) {
      console.error('Failed to add logo to PDF:', e);
      // Fallback text
      setTextFromHex(pdf, BRAND.emeraldGreen);
      pdf.setFontSize(32);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TIERRA MADRE', centerX, centerY - 10, { align: 'center' });
    }
  } else {
    // Fallback text if no logo
    setTextFromHex(pdf, BRAND.emeraldGreen);
    pdf.setFontSize(32);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TIERRA MADRE', centerX, centerY - 10, { align: 'center' });
  }

  // Decorative line under logo
  setDrawFromHex(pdf, BRAND.gold);
  pdf.setLineWidth(0.5);
  pdf.line(centerX - 50, centerY + 18, centerX + 50, centerY + 18);

  // Tagline
  setTextFromHex(pdf, BRAND.gold);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('E S E N C I A   Y   P O D E R', centerX, centerY + 28, { align: 'center' });

  // Catalog title
  if (title) {
    setTextFromHex(pdf, BRAND.offWhite);
    pdf.setFontSize(14);
    pdf.text(title, centerX, centerY + 42, { align: 'center' });
  }

  // Collection count
  if (totalItems) {
    setTextFromHex(pdf, BRAND.lightGray);
    pdf.setFontSize(9);
    pdf.text(`${totalItems} piezas exclusivas`, centerX, centerY + 52, { align: 'center' });
  }

  // Bottom badge
  setDrawFromHex(pdf, BRAND.emeraldGreen);
  pdf.setLineWidth(0.3);
  const badgeY = pageHeight - borderMargin - 22;
  pdf.line(centerX - 40, badgeY, centerX + 40, badgeY);

  setTextFromHex(pdf, BRAND.emeraldGreen);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('100% ESMERALDAS COLOMBIANAS', centerX, badgeY + 6, { align: 'center' });

  setTextFromHex(pdf, BRAND.lightGray);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Certificadas • Naturales • Exclusivas', centerX, badgeY + 12, { align: 'center' });

  // Date and website
  setTextFromHex(pdf, BRAND.mediumGray);
  pdf.setFontSize(8);
  const date = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long' });
  pdf.text(date.charAt(0).toUpperCase() + date.slice(1), borderMargin + 8, pageHeight - borderMargin - 5);

  setTextFromHex(pdf, BRAND.gold);
  pdf.text('tierramadre.co', pageWidth - borderMargin - 8, pageHeight - borderMargin - 5, { align: 'right' });
}

// Horizontal Carousel Layout - Landscape with image on left, info on right
async function addHorizontalCarouselLayout(
  pdf: jsPDF,
  emeralds: Emerald[],
  options: CatalogOptions,
  margin: number,
  _contentWidth: number,
  pageWidth: number,
  pageHeight: number,
  logoBase64?: string
) {
  for (let i = 0; i < emeralds.length; i++) {
    const emerald = emeralds[i];
    pdf.addPage();

    // Dark elegant background
    setFillFromHex(pdf, BRAND.darkBg);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // Subtle surface area
    setFillFromHex(pdf, BRAND.charcoal);
    pdf.rect(margin - 2, margin - 2, pageWidth - margin * 2 + 4, pageHeight - margin * 2 + 4, 'F');

    // Gold border frame
    setDrawFromHex(pdf, BRAND.gold);
    pdf.setLineWidth(0.4);
    pdf.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

    // === LEFT SIDE: IMAGE (55% of width) ===
    const imageAreaWidth = (pageWidth - margin * 2) * 0.55;
    const imageMargin = margin + 8;
    const imageWidth = imageAreaWidth - 16;
    const imageHeight = pageHeight - margin * 2 - 30;
    const imageY = margin + 15;

    // Image frame
    setDrawFromHex(pdf, BRAND.gold);
    pdf.setLineWidth(0.5);
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
        setFillFromHex(pdf, BRAND.surface);
        pdf.rect(imageMargin, imageY, imageWidth, imageHeight, 'F');
        setTextFromHex(pdf, BRAND.mediumGray);
        pdf.setFontSize(10);
        pdf.text('Imagen no disponible', imageMargin + imageWidth / 2, imageY + imageHeight / 2, { align: 'center' });
      }
    }

    // === RIGHT SIDE: INFO (45% of width) ===
    const infoX = margin + imageAreaWidth + 10;
    const infoWidth = pageWidth - margin - infoX - 10;
    let infoY = margin + 15;

    // Logo at top of info section
    if (logoBase64) {
      try {
        const logoWidth = 60;
        const logoHeight = 34;
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
        // Fallback to text
        setTextFromHex(pdf, BRAND.emeraldGreen);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('TIERRA MADRE', infoX + infoWidth / 2, infoY + 10, { align: 'center' });
        infoY += 20;
      }
    }

    // Decorative line
    setDrawFromHex(pdf, BRAND.gold);
    pdf.setLineWidth(0.3);
    pdf.line(infoX + 20, infoY, infoX + infoWidth - 20, infoY);
    infoY += 10;

    // Product name - Large gold
    setTextFromHex(pdf, BRAND.gold);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');

    // Word wrap for long names
    const nameLines = pdf.splitTextToSize(emerald.name.toUpperCase(), infoWidth - 10);
    pdf.text(nameLines, infoX + infoWidth / 2, infoY, { align: 'center' });
    infoY += nameLines.length * 8 + 5;

    // Category
    setTextFromHex(pdf, BRAND.emeraldGreen);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const categoryLabels: Record<string, string> = {
      loose: 'Esmeralda Suelta',
      ring: 'Anillo con Esmeralda',
      pendant: 'Dije / Colgante',
      earrings: 'Aretes con Esmeraldas',
    };
    pdf.text(categoryLabels[emerald.category] || 'Esmeralda Colombiana', infoX + infoWidth / 2, infoY, { align: 'center' });
    infoY += 12;

    // Decorative separator
    setDrawFromHex(pdf, BRAND.emeraldGreen);
    pdf.setLineWidth(0.3);
    pdf.line(infoX + infoWidth / 2 - 25, infoY, infoX + infoWidth / 2 + 25, infoY);
    infoY += 12;

    // Details section
    const detailLabelX = infoX + 15;
    const detailValueX = infoX + infoWidth - 15;
    const detailRowHeight = 10;

    const addDetail = (label: string, value: string, highlight = false) => {
      setTextFromHex(pdf, BRAND.lightGray);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(label, detailLabelX, infoY);

      if (highlight) {
        setTextFromHex(pdf, BRAND.emeraldGreen);
      } else {
        setTextFromHex(pdf, BRAND.white);
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

    infoY += 5;

    // Price - prominent display in gold box
    if (options.showPrices && emerald.priceCOP) {
      const priceBoxWidth = infoWidth - 30;
      const priceBoxX = infoX + 15;

      setFillFromHex(pdf, BRAND.surface);
      pdf.rect(priceBoxX, infoY, priceBoxWidth, 16, 'F');
      setDrawFromHex(pdf, BRAND.gold);
      pdf.setLineWidth(0.4);
      pdf.rect(priceBoxX, infoY, priceBoxWidth, 16);

      setTextFromHex(pdf, BRAND.gold);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      const price = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(emerald.priceCOP);
      pdf.text(price, priceBoxX + priceBoxWidth / 2, infoY + 11, { align: 'center' });
      infoY += 22;
    }

    // AI Description
    if (emerald.aiDescription) {
      setTextFromHex(pdf, BRAND.lightGray);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      const descLines = pdf.splitTextToSize(`"${emerald.aiDescription}"`, infoWidth - 20);
      const linesToShow = descLines.slice(0, 3);
      pdf.text(linesToShow, infoX + infoWidth / 2, infoY, { align: 'center' });
    }

    // === FOOTER ===
    const footerY = pageHeight - margin - 4;

    // Page indicator (left)
    setTextFromHex(pdf, BRAND.mediumGray);
    pdf.setFontSize(8);
    pdf.text(`${i + 1} de ${emeralds.length}`, margin + 8, footerY);

    // Website (center)
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
  const date = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long' });
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
        pdf.addImage(emerald.imageUrl, 'JPEG', currentX, currentY, itemWidth, imageHeight, undefined, 'FAST');
      } catch {
        setFillFromHex(pdf, BRAND.surface);
        pdf.rect(currentX, currentY, itemWidth, imageHeight, 'F');
      }
    }

    pdf.setFontSize(10);
    setTextFromHex(pdf, BRAND.gold);
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
        pdf.addImage(emerald.imageUrl, 'JPEG', margin, currentY, imageSize, imageSize, undefined, 'FAST');
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
      pdf.text(description, margin + imageSize + 5, currentY + 12, { maxWidth: contentWidth - imageSize - 50 });
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
      const price = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(emerald.priceCOP);
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
