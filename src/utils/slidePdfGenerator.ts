import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface SlideExportOptions {
  filename?: string;
  format?: 'pdf' | 'png' | 'jpg';
  quality?: number;
  scale?: number;
}

/**
 * Convert external image URLs to base64 using a CORS proxy
 */
async function convertImagesToBase64(element: HTMLElement): Promise<void> {
  const images = element.querySelectorAll('img');
  const CORS_PROXY = 'https://corsproxy.io/?';

  const promises = Array.from(images).map(async (img) => {
    const src = img.src;

    // Skip if already base64 or local
    if (!src || src.startsWith('data:') || src.startsWith('/') || src.startsWith(window.location.origin)) {
      return;
    }

    try {
      // Use CORS proxy to fetch the image
      const proxyUrl = CORS_PROXY + encodeURIComponent(src);
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      img.src = base64;
    } catch (error) {
      console.warn('Could not convert image to base64:', src, error);
    }
  });

  await Promise.all(promises);
}

/**
 * Wait for all images in element to be fully loaded
 */
async function waitForImages(element: HTMLElement): Promise<void> {
  const images = element.querySelectorAll('img');

  const loadPromises = Array.from(images).map((img) => {
    if (img.complete && img.naturalHeight !== 0) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        console.warn('Image load timeout:', img.src?.substring(0, 80));
        resolve();
      }, 10000);

      img.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      img.onerror = () => {
        clearTimeout(timeout);
        resolve();
      };
    });
  });

  await Promise.all(loadPromises);
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
    quality = 0.95,
    scale = 2,
  } = options;

  const element = document.getElementById(elementId);

  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  try {
    // Wait for images to load first
    await waitForImages(element);

    // Convert external images to base64 to avoid CORS
    await convertImagesToBase64(element);

    // Extra wait for rendering
    await new Promise(resolve => setTimeout(resolve, 500));

    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#1a1a1f',
      width: element.scrollWidth,
      height: element.scrollHeight,
      foreignObjectRendering: false,
      // Clone and ensure all styles are computed for gradients/overlays
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          // Force computed styles to be applied
          const allElements = clonedElement.querySelectorAll('*');
          allElements.forEach((el) => {
            const computed = window.getComputedStyle(el as Element);
            const htmlEl = el as HTMLElement;
            // Ensure gradients are visible
            if (computed.background.includes('gradient') || computed.backgroundImage.includes('gradient')) {
              htmlEl.style.background = computed.background;
              htmlEl.style.backgroundImage = computed.backgroundImage;
            }
          });
        }
      },
    });

    if (format === 'pdf') {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1920, 1080],
        hotfixes: ['px_scaling'],
      });

      const imgData = canvas.toDataURL('image/jpeg', quality);
      pdf.addImage(imgData, 'JPEG', 0, 0, 1920, 1080);
      pdf.save(`${filename}.pdf`);
    } else {
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const imgData = canvas.toDataURL(mimeType, quality);

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
    quality = 0.95,
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
      await waitForImages(element);
      await convertImagesToBase64(element);
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(element, {
        scale,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#1a1a1f',
        width: element.scrollWidth,
        height: element.scrollHeight,
        foreignObjectRendering: false,
        // Clone and ensure all styles are computed for gradients/overlays
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById(elementId);
          if (clonedElement) {
            // Force computed styles to be applied
            const allElements = clonedElement.querySelectorAll('*');
            allElements.forEach((el) => {
              const computed = window.getComputedStyle(el as Element);
              const htmlEl = el as HTMLElement;
              // Ensure gradients are visible
              if (computed.background.includes('gradient') || computed.backgroundImage.includes('gradient')) {
                htmlEl.style.background = computed.background;
                htmlEl.style.backgroundImage = computed.backgroundImage;
              }
            });
          }
        },
      });

      const imgData = canvas.toDataURL('image/jpeg', quality);

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
