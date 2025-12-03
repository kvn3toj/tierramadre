/**
 * Showroom Preloader Service
 *
 * Preloads all presentation slides into browser cache after PIN unlock.
 * Uses Cloudinary's image transformation URLs which get cached by the browser.
 */

// Cloudinary config (must match CloudinaryShowroom)
const CLOUDINARY_CLOUD = 'dyam6g2os';
const CLOUDINARY_FOLDER = 'tierramadre/catalogs';

// Catalog configurations
export const PRELOAD_CATALOGS: Record<string, { publicId: string; pages: number; name: string }> = {
  'acceso-total': { publicId: 'acceso-total', pages: 8, name: 'Acceso Total' },
  'vision-compartida': { publicId: 'vision-compartida', pages: 9, name: 'Visión Compartida' },
  'tierra-madre': { publicId: 'tierra-madre', pages: 12, name: 'Tierra Madre' },
  'exportadores': { publicId: 'exportadores', pages: 23, name: 'Exportadores' },
  'gifts': { publicId: 'gifts', pages: 13, name: 'Gifts' },
};

// Generate URLs (same as CloudinaryShowroom)
const getPageUrl = (publicId: string, page: number, width = 1200) => {
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/pg_${page},w_${width},q_auto,f_auto/${CLOUDINARY_FOLDER}/${publicId}.pdf`;
};

const getThumbnailUrl = (publicId: string, page: number) => {
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/pg_${page},w_120,h_68,c_fill,q_auto,f_auto/${CLOUDINARY_FOLDER}/${publicId}.pdf`;
};

// Preloader state
interface PreloadState {
  isPreloading: boolean;
  isComplete: boolean;
  progress: number; // 0-100
  totalImages: number;
  loadedImages: number;
  currentCatalog: string;
  errors: string[];
}

type PreloadListener = (state: PreloadState) => void;

class ShowroomPreloader {
  private state: PreloadState = {
    isPreloading: false,
    isComplete: false,
    progress: 0,
    totalImages: 0,
    loadedImages: 0,
    currentCatalog: '',
    errors: [],
  };

  private listeners: Set<PreloadListener> = new Set();
  private preloadedUrls: Set<string> = new Set();
  private abortController: AbortController | null = null;

  /**
   * Subscribe to preload state changes
   */
  subscribe(listener: PreloadListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private notify() {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  /**
   * Update state and notify
   */
  private updateState(partial: Partial<PreloadState>) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  /**
   * Check if a URL is already preloaded
   */
  isPreloaded(url: string): boolean {
    return this.preloadedUrls.has(url);
  }

  /**
   * Get current state
   */
  getState(): PreloadState {
    return { ...this.state };
  }

  /**
   * Preload a single image with promise
   */
  private preloadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.preloadedUrls.has(url)) {
        resolve();
        return;
      }

      const img = new Image();
      img.onload = () => {
        this.preloadedUrls.add(url);
        resolve();
      };
      img.onerror = () => {
        reject(new Error(`Failed to load: ${url}`));
      };
      img.src = url;
    });
  }

  /**
   * Start preloading all catalogs
   */
  async preloadAll(): Promise<void> {
    if (this.state.isPreloading) {
      console.log('[Preloader] Already preloading...');
      return;
    }

    if (this.state.isComplete) {
      console.log('[Preloader] Already complete');
      return;
    }

    this.abortController = new AbortController();

    // Calculate total images to preload
    let totalImages = 0;
    const catalogs = Object.entries(PRELOAD_CATALOGS);

    catalogs.forEach(([, config]) => {
      // Full size images + thumbnails for each page
      totalImages += config.pages * 2;
    });

    this.updateState({
      isPreloading: true,
      isComplete: false,
      progress: 0,
      totalImages,
      loadedImages: 0,
      currentCatalog: '',
      errors: [],
    });

    console.log(`[Preloader] Starting preload of ${totalImages} images from ${catalogs.length} catalogs`);

    let loadedCount = 0;
    const errors: string[] = [];

    // Preload catalogs sequentially, images in parallel batches
    for (const [, config] of catalogs) {
      this.updateState({ currentCatalog: config.name });

      // Generate all URLs for this catalog
      const urls: string[] = [];
      for (let page = 1; page <= config.pages; page++) {
        urls.push(getPageUrl(config.publicId, page));
        urls.push(getThumbnailUrl(config.publicId, page));
      }

      // Load in batches of 4 to not overwhelm the network
      const batchSize = 4;
      for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);

        const results = await Promise.allSettled(
          batch.map(url => this.preloadImage(url))
        );

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            loadedCount++;
          } else {
            errors.push(batch[index]);
            loadedCount++; // Still count as processed
          }
        });

        this.updateState({
          loadedImages: loadedCount,
          progress: Math.round((loadedCount / totalImages) * 100),
          errors,
        });
      }
    }

    this.updateState({
      isPreloading: false,
      isComplete: true,
      currentCatalog: '',
    });

    console.log(`[Preloader] Complete! Loaded ${loadedCount} images, ${errors.length} errors`);
  }

  /**
   * Preload a specific catalog (for on-demand preloading)
   */
  async preloadCatalog(catalogId: string): Promise<void> {
    const config = PRELOAD_CATALOGS[catalogId];
    if (!config) {
      console.warn(`[Preloader] Unknown catalog: ${catalogId}`);
      return;
    }

    console.log(`[Preloader] Preloading ${config.name}...`);

    const urls: string[] = [];
    for (let page = 1; page <= config.pages; page++) {
      urls.push(getPageUrl(config.publicId, page));
      urls.push(getThumbnailUrl(config.publicId, page));
    }

    // Preload in parallel
    await Promise.allSettled(
      urls.map(url => this.preloadImage(url))
    );

    console.log(`[Preloader] ${config.name} preloaded`);
  }

  /**
   * Reset preloader state (for testing)
   */
  reset() {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.preloadedUrls.clear();
    this.updateState({
      isPreloading: false,
      isComplete: false,
      progress: 0,
      totalImages: 0,
      loadedImages: 0,
      currentCatalog: '',
      errors: [],
    });
  }
}

// Singleton instance
export const showroomPreloader = new ShowroomPreloader();

// Hook for React components
import { useState, useEffect } from 'react';

export function useShowroomPreloader() {
  const [state, setState] = useState<PreloadState>(showroomPreloader.getState());

  useEffect(() => {
    return showroomPreloader.subscribe(setState);
  }, []);

  return {
    ...state,
    preloadAll: () => showroomPreloader.preloadAll(),
    preloadCatalog: (id: string) => showroomPreloader.preloadCatalog(id),
    isPreloaded: (url: string) => showroomPreloader.isPreloaded(url),
    reset: () => showroomPreloader.reset(),
  };
}
