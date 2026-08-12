/**
 * PDF Export Utility
 * Consolidated from ReceiptGenerator, QuotationPreviewPage, and CotizacionGenerator.
 *
 * Uses html2canvas to capture DOM elements and jsPDF to generate PDFs.
 */

// html2canvas and jsPDF are loaded on-demand inside each export function
// to avoid pulling ~500KB into chunks that may never trigger a PDF export.

// =============================================================================
// TYPES
// =============================================================================

export interface PdfExportOptions {
  /** The DOM element to capture */
  element: HTMLElement;
  /** Output filename (without .pdf extension) */
  filename: string;
  /** Page format (default: 'a4') */
  format?: 'a4' | 'letter';
  /** Page orientation (default: 'portrait') */
  orientation?: 'portrait' | 'landscape';
  /** Canvas scale for quality (default: 2.5) */
  scale?: number;
  /** Background color for canvas capture */
  backgroundColor?: string;
  /** Margin in mm (default: 8) */
  margin?: number;
  /** Whether to center content vertically (default: true for short content) */
  centerVertically?: boolean;
  /** Progress callback */
  onProgress?: (stage: 'capture' | 'generate' | 'download') => void;
}

export interface PdfExportResult {
  success: boolean;
  filename?: string;
  error?: string;
  /** PDF blob for sharing via Web Share API */
  blob?: Blob;
}

// =============================================================================
// MAIN EXPORT FUNCTION
// =============================================================================

/**
 * Export a DOM element to PDF.
 * Handles canvas capture, sizing, and PDF generation.
 *
 * @param options - Export configuration
 * @returns Promise resolving to success/failure result
 */
export const exportToPdf = async (
  options: PdfExportOptions,
): Promise<PdfExportResult> => {
  const {
    element,
    filename,
    format = 'a4',
    orientation = 'portrait',
    scale = 2.5,
    backgroundColor = '#FFFFFF',
    margin = 8,
    centerVertically = true,
    onProgress,
  } = options;

  try {
    onProgress?.('capture');

    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    // Wait for any pending renders
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Capture element dimensions
    const rect = element.getBoundingClientRect();

    const canvas = await html2canvas(element, {
      scale,
      backgroundColor,
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: rect.width,
      height: rect.height,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    onProgress?.('generate');

    const imgData = canvas.toDataURL('image/png', 0.95);

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format,
      compress: true,
    });

    // Get page dimensions
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Calculate image dimensions to fit within margins
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;

    const aspectRatio = canvas.width / canvas.height;
    let imgWidth = maxWidth;
    let imgHeight = imgWidth / aspectRatio;

    // If too tall, scale down to fit height
    if (imgHeight > maxHeight) {
      imgHeight = maxHeight;
      imgWidth = imgHeight * aspectRatio;
    }

    // Calculate offsets
    const xOffset = (pageWidth - imgWidth) / 2; // Always center horizontally

    // Vertical positioning: center if content is short, align to top if tall
    let yOffset: number;
    if (centerVertically && imgHeight < maxHeight * 0.8) {
      yOffset = (pageHeight - imgHeight) / 2;
    } else {
      yOffset = margin;
    }

    pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);

    onProgress?.('download');

    const fullFilename = filename.endsWith('.pdf')
      ? filename
      : `${filename}.pdf`;
    const blob = pdf.output('blob');
    pdf.save(fullFilename);

    return { success: true, filename: fullFilename, blob };
  } catch (error) {
    console.error('PDF export failed:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error during PDF export',
    };
  }
};

// =============================================================================
// SPECIALIZED EXPORT FUNCTIONS
// =============================================================================

/**
 * Export a quotation/cotización to PDF with standard settings.
 */
export const exportQuotationToPdf = async (
  element: HTMLElement,
  _quotationNumber: string,
  onProgress?: (stage: 'capture' | 'generate' | 'download') => void,
): Promise<PdfExportResult> => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');

  return exportToPdf({
    element,
    filename: `Tierra Mädre - Cotización-(${day}-${month})`,
    scale: 3,
    margin: 8,
    centerVertically: true,
    onProgress,
  });
};

export interface PngExportResult {
  success: boolean;
  filename: string;
  blob?: Blob;
  error?: string;
}

/**
 * Rasterize a fixed-size DOM node to a PNG blob (no download side effect).
 * Used for the 1080×1920 cotización product cards. The element must be laid
 * out at its real pixel size (not CSS-transform-scaled) so html2canvas
 * captures it at full resolution.
 */
export const exportCardToPng = async (
  element: HTMLElement,
  filename: string,
  width = 1080,
  height = 1920,
): Promise<PngExportResult> => {
  const fullFilename = filename.endsWith('.png') ? filename : `${filename}.png`;
  try {
    const { default: html2canvas } = await import('html2canvas');

    // Let fonts/images settle before capture.
    await new Promise((resolve) => setTimeout(resolve, 120));

    const canvas = await html2canvas(element, {
      scale: 1,
      backgroundColor: '#FFFFFF',
      useCORS: true,
      allowTaint: true,
      logging: false,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
    });

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png', 0.95),
    );
    if (!blob) throw new Error('Canvas toBlob returned null');

    return { success: true, filename: fullFilename, blob };
  } catch (error) {
    console.error('Card PNG export failed:', error);
    return {
      success: false,
      filename: fullFilename,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error during PNG export',
    };
  }
};

/**
 * Export a receipt to PDF with elegant styling.
 * Includes shadow effect and border for premium look.
 */
export const exportReceiptToPdf = async (
  element: HTMLElement,
  receiptNumber: string,
  documentLabel: string,
  theme: 'dark' | 'light' = 'dark',
  onProgress?: (stage: 'capture' | 'generate' | 'download') => void,
): Promise<PdfExportResult> => {
  const themeColors = {
    dark: {
      background: '#1a1a1a',
      shadow: '#0a0a0a',
      border: '#444444',
      canvasBg: '#1C1C1E',
    },
    light: {
      background: '#f0f0f0',
      shadow: '#c8c8c8',
      border: '#b0b0b0',
      canvasBg: '#F2F2F7',
    },
  };

  const colors = themeColors[theme];

  try {
    onProgress?.('capture');

    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    // Wait for renders
    await new Promise((resolve) => setTimeout(resolve, 200));

    const rect = element.getBoundingClientRect();

    const canvas = await html2canvas(element, {
      scale: 4, // Higher quality for receipts
      backgroundColor: colors.canvasBg,
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: rect.width,
      height: rect.height,
    });

    onProgress?.('generate');

    const imgData = canvas.toDataURL('image/png', 1.0);

    // A4 dimensions
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20; // Larger margin for elegant spacing

    // Calculate dimensions
    const aspectRatio = canvas.height / canvas.width;
    let imgWidth = pageWidth - margin * 2;
    let imgHeight = imgWidth * aspectRatio;

    // Scale down if too tall
    const maxHeight = pageHeight - margin * 2;
    if (imgHeight > maxHeight) {
      imgHeight = maxHeight;
      imgWidth = imgHeight / aspectRatio;
    }

    // Center on page
    const xOffset = (pageWidth - imgWidth) / 2;
    const yOffset = (pageHeight - imgHeight) / 2;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Add elegant background
    pdf.setFillColor(colors.background);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // Add subtle shadow effect
    pdf.setFillColor(colors.shadow);
    pdf.rect(xOffset + 1.5, yOffset + 1.5, imgWidth, imgHeight, 'F');

    // Add receipt image
    pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);

    // Add elegant border
    pdf.setDrawColor(colors.border);
    pdf.setLineWidth(0.3);
    pdf.rect(xOffset, yOffset, imgWidth, imgHeight, 'S');

    onProgress?.('download');

    // Sanitize filename
    const sanitizedLabel = documentLabel
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-]/g, '')
      .replace(/\s+/g, '-');
    const fullFilename = `${sanitizedLabel}-${receiptNumber}.pdf`;

    pdf.save(fullFilename);

    return { success: true, filename: fullFilename };
  } catch (error) {
    console.error('Receipt PDF export failed:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error during PDF export',
    };
  }
};
