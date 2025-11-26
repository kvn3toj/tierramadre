import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface SlideExportOptions {
  filename?: string;
  format?: 'pdf' | 'png' | 'jpg';
  quality?: number; // 0-1 for images
  scale?: number; // Higher = better quality but slower
}

/**
 * Generate a PDF from a slide element
 */
export async function generateSlidePDF(
  elementId: string,
  options: SlideExportOptions = {}
): Promise<void> {
  const {
    filename = 'tierra-madre-slide',
    format = 'pdf',
    quality = 1.0,
    scale = 2,
  } = options;

  const element = document.getElementById(elementId);

  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  try {
    // Capture the element as canvas with high quality
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#1a1a1f',
      // Ensure we capture the full element
      width: element.scrollWidth,
      height: element.scrollHeight,
    });

    if (format === 'pdf') {
      // Create PDF in landscape 16:9 format
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1920, 1080],
        hotfixes: ['px_scaling'],
      });

      // Add canvas as image to PDF
      const imgData = canvas.toDataURL('image/jpeg', quality);
      pdf.addImage(imgData, 'JPEG', 0, 0, 1920, 1080);

      // Save the PDF
      pdf.save(`${filename}.pdf`);
    } else {
      // Export as image (PNG or JPG)
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const imgData = canvas.toDataURL(mimeType, quality);

      // Create download link
      const link = document.createElement('a');
      link.download = `${filename}.${format}`;
      link.href = imgData;
      link.click();
    }
  } catch (error) {
    console.error('Error generating slide export:', error);
    throw error;
  }
}

/**
 * Generate a multi-slide PDF from multiple elements
 */
export async function generateMultiSlidePDF(
  elementIds: string[],
  options: Omit<SlideExportOptions, 'format'> = {}
): Promise<void> {
  const {
    filename = 'tierra-madre-presentation',
    quality = 1.0,
    scale = 2,
  } = options;

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [1920, 1080],
    hotfixes: ['px_scaling'],
  });

  for (let i = 0; i < elementIds.length; i++) {
    const elementId = elementIds[i];
    const element = document.getElementById(elementId);

    if (!element) {
      console.warn(`Element with id "${elementId}" not found, skipping...`);
      continue;
    }

    try {
      const canvas = await html2canvas(element, {
        scale,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#1a1a1f',
        width: element.scrollWidth,
        height: element.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/jpeg', quality);

      // Add new page for slides after the first
      if (i > 0) {
        pdf.addPage();
      }

      pdf.addImage(imgData, 'JPEG', 0, 0, 1920, 1080);
    } catch (error) {
      console.error(`Error capturing slide ${elementId}:`, error);
    }
  }

  pdf.save(`${filename}.pdf`);
}

/**
 * Get a preview data URL of a slide
 */
export async function getSlidePreview(
  elementId: string,
  scale: number = 0.5
): Promise<string> {
  const element = document.getElementById(elementId);

  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#1a1a1f',
  });

  return canvas.toDataURL('image/jpeg', 0.8);
}
