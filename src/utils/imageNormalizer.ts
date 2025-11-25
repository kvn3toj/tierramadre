/**
 * Image Normalizer - Automatic lighting and color consistency
 * For Tierra Madre Studio
 */

/**
 * Compress image to reduce file size for storage
 * @param base64 - Original base64 image
 * @param maxWidth - Maximum width (default 800px)
 * @param quality - JPEG quality 0-1 (default 0.7)
 * @returns Compressed base64 image
 */
export async function compressImage(
  base64: string,
  maxWidth: number = 800,
  quality: number = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // Calculate new dimensions
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to compressed JPEG
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    img.onerror = reject;
    img.src = base64;
  });
}

/**
 * Get estimated size of base64 string in KB
 */
export function getBase64Size(base64: string): number {
  // Remove data URL prefix if present
  const data = base64.split(',')[1] || base64;
  // Base64 is ~4/3 of original, so 3/4 to get approximate original
  return Math.round((data.length * 3) / 4 / 1024);
}

export interface ImageAnalysis {
  brightness: number;      // 0-255 average luminance
  contrast: number;        // standard deviation of luminance
  colorTemp: number;       // warm (-100) to cool (+100)
  saturation: number;      // 0-100
  histogram: {
    r: number[];
    g: number[];
    b: number[];
    luminance: number[];
  };
}

export interface NormalizationSettings {
  targetBrightness: number;    // 0-255, default 128 (middle gray)
  targetContrast: number;      // 0-100, default 50
  autoWhiteBalance: boolean;
  enhanceEmeralds: boolean;    // boost emerald green tones
  vignetteStrength: number;    // 0-100, 0 = none
}

export const DEFAULT_SETTINGS: NormalizationSettings = {
  targetBrightness: 135,       // Slightly bright for product photography
  targetContrast: 55,          // Good contrast
  autoWhiteBalance: true,
  enhanceEmeralds: true,
  vignetteStrength: 0,
};

// Studio Professional preset (clean, neutral)
export const STUDIO_PRESET: NormalizationSettings = {
  targetBrightness: 140,
  targetContrast: 50,
  autoWhiteBalance: true,
  enhanceEmeralds: true,
  vignetteStrength: 0,
};

// Editorial/Moody preset
export const EDITORIAL_PRESET: NormalizationSettings = {
  targetBrightness: 100,
  targetContrast: 65,
  autoWhiteBalance: true,
  enhanceEmeralds: true,
  vignetteStrength: 25,
};

/**
 * Load image from URL or File into an ImageData object
 */
export async function loadImage(source: string | File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;

    if (typeof source === 'string') {
      img.src = source;
    } else {
      img.src = URL.createObjectURL(source);
    }
  });
}

/**
 * Get ImageData from an image
 */
export function getImageData(img: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Analyze image characteristics
 */
export function analyzeImage(imageData: ImageData): ImageAnalysis {
  const { data, width, height } = imageData;
  const pixelCount = width * height;

  // Initialize histograms
  const histogram = {
    r: new Array(256).fill(0),
    g: new Array(256).fill(0),
    b: new Array(256).fill(0),
    luminance: new Array(256).fill(0),
  };

  let totalLuminance = 0;
  let totalR = 0, totalG = 0, totalB = 0;
  const luminanceValues: number[] = [];

  // First pass: calculate histograms and totals
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Calculate luminance (perceived brightness)
    const luminance = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

    histogram.r[r]++;
    histogram.g[g]++;
    histogram.b[b]++;
    histogram.luminance[luminance]++;

    totalLuminance += luminance;
    totalR += r;
    totalG += g;
    totalB += b;
    luminanceValues.push(luminance);
  }

  // Calculate average brightness
  const brightness = totalLuminance / pixelCount;

  // Calculate contrast (standard deviation of luminance)
  const variance = luminanceValues.reduce((sum, l) => sum + Math.pow(l - brightness, 2), 0) / pixelCount;
  const contrast = Math.sqrt(variance);

  // Calculate color temperature (simplified)
  const avgR = totalR / pixelCount;
  const avgB = totalB / pixelCount;
  const colorTemp = ((avgR - avgB) / 255) * 100; // -100 to +100

  // Calculate saturation (simplified HSL-like)
  let totalSaturation = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      totalSaturation += s;
    }
  }
  const saturation = (totalSaturation / pixelCount) * 100;

  return {
    brightness,
    contrast,
    colorTemp,
    saturation,
    histogram,
  };
}

/**
 * Apply normalization to image
 */
export function normalizeImage(
  imageData: ImageData,
  analysis: ImageAnalysis,
  settings: NormalizationSettings
): ImageData {
  const { data, width, height } = imageData;
  const result = new ImageData(new Uint8ClampedArray(data), width, height);
  const resultData = result.data;

  // Calculate adjustment factors
  const brightnessFactor = settings.targetBrightness / Math.max(analysis.brightness, 1);
  const contrastFactor = settings.targetContrast / Math.max(analysis.contrast, 1);

  // Calculate white balance multipliers if enabled
  let rMult = 1, gMult = 1, bMult = 1;
  if (settings.autoWhiteBalance) {
    // Find the brightest neutral point (simplified gray world assumption)
    const { histogram } = analysis;

    // Find 95th percentile for each channel
    const findPercentile = (hist: number[], percentile: number) => {
      const total = hist.reduce((a, b) => a + b, 0);
      const target = total * percentile;
      let sum = 0;
      for (let i = 255; i >= 0; i--) {
        sum += hist[i];
        if (sum >= target) return i;
      }
      return 128;
    };

    const rRef = findPercentile(histogram.r, 0.05);
    const gRef = findPercentile(histogram.g, 0.05);
    const bRef = findPercentile(histogram.b, 0.05);

    const maxRef = Math.max(rRef, gRef, bRef);
    rMult = maxRef / Math.max(rRef, 1);
    gMult = maxRef / Math.max(gRef, 1);
    bMult = maxRef / Math.max(bRef, 1);

    // Limit multipliers to prevent extreme shifts
    rMult = Math.max(0.8, Math.min(1.2, rMult));
    gMult = Math.max(0.8, Math.min(1.2, gMult));
    bMult = Math.max(0.8, Math.min(1.2, bMult));
  }

  // Emerald enhancement factors
  const emeraldBoost = settings.enhanceEmeralds ? 1.15 : 1;

  // Process each pixel
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    const a = data[i + 3];

    // Apply white balance
    r *= rMult;
    g *= gMult;
    b *= bMult;

    // Calculate current luminance
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    // Apply brightness adjustment (preserving color ratios)
    const targetLuminance = luminance * brightnessFactor;
    const lumScale = luminance > 0 ? targetLuminance / luminance : 1;
    r *= lumScale;
    g *= lumScale;
    b *= lumScale;

    // Apply contrast adjustment (around mid-gray)
    const midGray = 128;
    r = midGray + (r - midGray) * (contrastFactor * 0.02 + 0.5);
    g = midGray + (g - midGray) * (contrastFactor * 0.02 + 0.5);
    b = midGray + (b - midGray) * (contrastFactor * 0.02 + 0.5);

    // Enhance emerald greens (green channel boost in specific hue range)
    if (settings.enhanceEmeralds) {
      // Detect emerald green hue (green dominant, not too yellow or cyan)
      const isEmeraldish = g > r * 0.8 && g > b * 0.9 && g > 50;
      if (isEmeraldish) {
        // Boost saturation for emerald tones
        const avg = (r + g + b) / 3;
        g = avg + (g - avg) * emeraldBoost;
        // Slightly shift towards pure emerald
        r = avg + (r - avg) * 0.95;
      }
    }

    // Apply vignette if enabled
    if (settings.vignetteStrength > 0) {
      const pixelIndex = i / 4;
      const x = (pixelIndex % width) / width - 0.5;
      const y = Math.floor(pixelIndex / width) / height - 0.5;
      const distance = Math.sqrt(x * x + y * y) * 1.414; // Normalize to 0-1
      const vignette = 1 - (distance * distance * settings.vignetteStrength / 100);
      r *= vignette;
      g *= vignette;
      b *= vignette;
    }

    // Clamp values
    resultData[i] = Math.max(0, Math.min(255, Math.round(r)));
    resultData[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
    resultData[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
    resultData[i + 3] = a;
  }

  return result;
}

/**
 * Convert ImageData to canvas and then to blob/data URL
 */
export function imageDataToCanvas(imageData: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function canvasToDataURL(canvas: HTMLCanvasElement, quality = 0.92): string {
  return canvas.toDataURL('image/jpeg', quality);
}

export async function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Full normalization pipeline
 */
export async function processImage(
  source: string | File,
  settings: NormalizationSettings = DEFAULT_SETTINGS
): Promise<{
  original: string;
  normalized: string;
  analysis: ImageAnalysis;
  canvas: HTMLCanvasElement;
}> {
  const img = await loadImage(source);
  const imageData = getImageData(img);
  const analysis = analyzeImage(imageData);
  const normalizedData = normalizeImage(imageData, analysis, settings);
  const canvas = imageDataToCanvas(normalizedData);

  return {
    original: img.src,
    normalized: canvasToDataURL(canvas),
    analysis,
    canvas,
  };
}

/**
 * Batch process multiple images
 */
export async function batchProcess(
  files: File[],
  settings: NormalizationSettings = DEFAULT_SETTINGS,
  onProgress?: (current: number, total: number) => void
): Promise<Array<{
  file: File;
  original: string;
  normalized: string;
  analysis: ImageAnalysis;
  canvas: HTMLCanvasElement;
}>> {
  const results = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const result = await processImage(file, settings);
    results.push({ file, ...result });
    onProgress?.(i + 1, files.length);
  }

  return results;
}
