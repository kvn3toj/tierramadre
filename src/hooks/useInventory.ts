import { useState, useEffect, useCallback } from 'react';
import { InventoryItem, MediaType } from '../types';
import { inventoryData as defaultInventoryData } from '../data/inventory';
import { MediaItem } from '../components/media/types';

// Upload to Google Drive - uses direct upload for large files (>4MB)
const uploadToGoogleDrive = async (file: File, itemNumber: number): Promise<string> => {
  const MAX_VERCEL_SIZE = 4 * 1024 * 1024;

  // For small files, use the simple API
  if (file.size <= MAX_VERCEL_SIZE) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('itemNumber', itemNumber.toString());

    const response = await fetch('/api/upload-to-drive', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Error al subir' }));
      throw new Error(error.message);
    }

    const data = await response.json();
    return data.url;
  }

  // For large files, use resumable upload
  const initResponse = await fetch('/api/init-drive-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
      itemNumber,
      fileSize: file.size,
    }),
  });

  if (!initResponse.ok) {
    const error = await initResponse.json().catch(() => ({ message: 'Error al inicializar' }));
    throw new Error(error.message);
  }

  const { uploadUrl, accessToken } = await initResponse.json();

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': file.type,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error('Error al subir a Google Drive');
  }

  const { id: fileId } = await uploadResponse.json();

  const finalizeResponse = await fetch('/api/finalize-drive-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId }),
  });

  if (!finalizeResponse.ok) {
    throw new Error('Error al finalizar la subida');
  }

  const { url } = await finalizeResponse.json();
  return url;
};

const STORAGE_KEY = 'tierramadre-inventory-media';
const GALLERY_STORAGE_KEY = 'tierramadre-inventory-gallery';

// Legacy single media storage (for backwards compatibility)
interface LegacyInventoryMedia {
  [itemNumber: number]: {
    url: string;
    mediaType: MediaType;
    thumbnailUrl?: string;
  };
}

// New gallery storage (multiple media per product)
interface ProductGallery {
  [itemNumber: number]: MediaItem[];
}

export function useInventory() {
  const [legacyMedia, setLegacyMedia] = useState<LegacyInventoryMedia>({});
  const [galleries, setGalleries] = useState<ProductGallery>({});

  // Load saved media from LocalStorage on mount
  useEffect(() => {
    try {
      // Load legacy media
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setLegacyMedia(JSON.parse(stored));
      }

      // Load galleries
      const galleriesStored = localStorage.getItem(GALLERY_STORAGE_KEY);
      if (galleriesStored) {
        setGalleries(JSON.parse(galleriesStored));
      }
    } catch (error) {
      console.error('Error loading inventory media:', error);
    }
  }, []);

  // Save legacy media
  const saveLegacyMedia = (newMedia: LegacyInventoryMedia) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newMedia));
      setLegacyMedia(newMedia);
    } catch (error) {
      console.error('Error saving inventory media:', error);
    }
  };

  // Save galleries
  const saveGalleries = useCallback((newGalleries: ProductGallery) => {
    try {
      localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(newGalleries));
      setGalleries(newGalleries);
    } catch (error) {
      console.error('Error saving inventory galleries:', error);
    }
  }, []);

  // Get inventory data with media merged in
  const getInventoryWithMedia = (): InventoryItem[] => {
    return defaultInventoryData.map(item => {
      const itemMedia = legacyMedia[item.item];
      const gallery = galleries[item.item];

      // If we have a gallery, use the first item as the main image
      const mainMedia = gallery?.[0];

      return {
        ...item,
        imagen: mainMedia?.url || itemMedia?.url || item.imagen,
        mediaType: mainMedia?.type || itemMedia?.mediaType || item.mediaType || 'image',
        thumbnailUrl: mainMedia?.thumbnailUrl || itemMedia?.thumbnailUrl || item.thumbnailUrl,
      };
    });
  };

  // Legacy: Update single image for a specific item
  const updateImage = (itemNumber: number, imageUrl: string) => {
    const newMedia = {
      ...legacyMedia,
      [itemNumber]: { url: imageUrl, mediaType: 'image' as MediaType },
    };
    saveLegacyMedia(newMedia);
  };

  // Legacy: Update single video for a specific item
  const updateVideo = async (itemNumber: number, videoUrl: string, thumbnailUrl: string) => {
    try {
      const newMedia = {
        ...legacyMedia,
        [itemNumber]: {
          url: videoUrl,
          mediaType: 'video' as MediaType,
          thumbnailUrl,
        },
      };
      saveLegacyMedia(newMedia);
    } catch (error) {
      console.error('Error saving video:', error);
      throw error;
    }
  };

  // Legacy: Remove single media for a specific item
  const removeImage = async (itemNumber: number) => {
    const newMedia = { ...legacyMedia };
    delete newMedia[itemNumber];
    saveLegacyMedia(newMedia);
  };

  // === NEW GALLERY FUNCTIONS ===

  // Get gallery for a specific product
  const getGallery = useCallback((itemNumber: number): MediaItem[] => {
    return galleries[itemNumber] || [];
  }, [galleries]);

  // Add media to gallery
  const addToGallery = useCallback(async (
    itemNumber: number,
    url: string,
    type: 'image' | 'video',
    category: MediaItem['category'],
    thumbnailUrl?: string
  ) => {
    const currentGallery = galleries[itemNumber] || [];

    const newMediaItem: MediaItem = {
      id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url,
      thumbnailUrl,
      type,
      category,
      alt: `Producto ${itemNumber} - ${category}`,
      order: currentGallery.length,
    };

    const newGallery = [...currentGallery, newMediaItem];
    const newGalleries = {
      ...galleries,
      [itemNumber]: newGallery,
    };

    saveGalleries(newGalleries);
    return newMediaItem;
  }, [galleries, saveGalleries]);

  // Remove media from gallery
  const removeFromGallery = useCallback(async (itemNumber: number, mediaId: string) => {
    const currentGallery = galleries[itemNumber] || [];
    const newGallery = currentGallery
      .filter(item => item.id !== mediaId)
      .map((item, index) => ({ ...item, order: index }));

    const newGalleries = {
      ...galleries,
      [itemNumber]: newGallery,
    };

    if (newGallery.length === 0) {
      delete newGalleries[itemNumber];
    }

    saveGalleries(newGalleries);
  }, [galleries, saveGalleries]);

  // Reorder gallery
  const reorderGallery = useCallback((itemNumber: number, newOrder: MediaItem[]) => {
    const reorderedGallery = newOrder.map((item, index) => ({
      ...item,
      order: index,
    }));

    const newGalleries = {
      ...galleries,
      [itemNumber]: reorderedGallery,
    };

    saveGalleries(newGalleries);
  }, [galleries, saveGalleries]);

  // Upload multiple files to gallery via API
  const uploadToGallery = useCallback(async (
    itemNumber: number,
    files: File[],
    category: MediaItem['category']
  ) => {
    const uploadedItems: MediaItem[] = [];

    for (const file of files) {
      const isVideo = file.type.startsWith('video/');

      try {
        // Upload directly to Google Drive (supports 50MB+)
        const mediaUrl = await uploadToGoogleDrive(file, itemNumber);

        // Extract thumbnail for videos
        let thumbnailUrl: string | undefined;
        if (isVideo) {
          thumbnailUrl = await extractVideoThumbnail(file);
        }

        // Add to gallery
        const mediaItem = await addToGallery(
          itemNumber,
          mediaUrl,
          isVideo ? 'video' : 'image',
          category,
          thumbnailUrl
        );

        uploadedItems.push(mediaItem);
      } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
      }
    }

    return uploadedItems;
  }, [addToGallery]);

  // Update full gallery at once
  const updateMediaItems = useCallback((itemNumber: number, items: MediaItem[]) => {
    const reorderedItems = items.map((item, index) => ({
      ...item,
      order: index,
    }));

    const newGalleries = {
      ...galleries,
      [itemNumber]: reorderedItems,
    };

    if (reorderedItems.length === 0) {
      delete newGalleries[itemNumber];
    }

    saveGalleries(newGalleries);
  }, [galleries, saveGalleries]);

  // Get media items for a product (alias for getGallery)
  const getMediaItems = useCallback((itemNumber: number): MediaItem[] => {
    return galleries[itemNumber] || [];
  }, [galleries]);

  return {
    // Legacy single media
    inventory: getInventoryWithMedia(),
    updateImage,
    updateVideo,
    removeImage,
    getMedia: (itemNumber: number) => legacyMedia[itemNumber],

    // New gallery functions
    getGallery,
    addToGallery,
    removeFromGallery,
    reorderGallery,
    uploadToGallery,
    updateMediaItems,
    getMediaItems,
  };
}

// Helper function to extract video thumbnail
async function extractVideoThumbnail(videoFile: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, video.duration / 2);
    };

    video.onseeked = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx?.drawImage(video, 0, 0);

      const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
      URL.revokeObjectURL(video.src);
      resolve(thumbnail);
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Error extracting video thumbnail'));
    };

    video.src = URL.createObjectURL(videoFile);
  });
}
