import { useState, useEffect } from 'react';
import { InventoryItem, MediaType } from '../types';
import { inventoryData as defaultInventoryData } from '../data/inventory';
import { saveVideo, deleteVideo } from '../utils/videoStorage';

const STORAGE_KEY = 'tierramadre-inventory-media';

interface InventoryMedia {
  [itemNumber: number]: {
    url: string;           // Base64 for images, indexeddb:// reference for videos
    mediaType: MediaType;
    thumbnailUrl?: string; // Thumbnail for videos
  };
}

export function useInventory() {
  const [media, setMedia] = useState<InventoryMedia>({});

  // Load saved media from LocalStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setMedia(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading inventory media:', error);
    }
  }, []);

  // Save media to LocalStorage whenever they change
  const saveMedia = (newMedia: InventoryMedia) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newMedia));
      setMedia(newMedia);
    } catch (error) {
      console.error('Error saving inventory media:', error);
    }
  };

  // Get inventory data with media merged in
  const getInventoryWithMedia = (): InventoryItem[] => {
    return defaultInventoryData.map(item => {
      const itemMedia = media[item.item];
      return {
        ...item,
        imagen: itemMedia?.url || item.imagen,
        mediaType: itemMedia?.mediaType || item.mediaType || 'image',
        thumbnailUrl: itemMedia?.thumbnailUrl || item.thumbnailUrl,
      };
    });
  };

  // Update image for a specific item
  const updateImage = (itemNumber: number, imageUrl: string) => {
    const newMedia = {
      ...media,
      [itemNumber]: { url: imageUrl, mediaType: 'image' as MediaType },
    };
    saveMedia(newMedia);
  };

  // Update video for a specific item (now receives Drive URL instead of File)
  const updateVideo = async (itemNumber: number, videoUrl: string, thumbnailUrl: string) => {
    try {
      const newMedia = {
        ...media,
        [itemNumber]: {
          url: videoUrl, // Google Drive URL
          mediaType: 'video' as MediaType,
          thumbnailUrl,
        },
      };
      saveMedia(newMedia);
    } catch (error) {
      console.error('Error saving video:', error);
      throw error;
    }
  };

  // Remove media for a specific item
  const removeMedia = async (itemNumber: number) => {
    // Note: Videos are now stored on Google Drive
    // We only remove the reference from LocalStorage
    // Actual Drive files remain (can be managed manually in Drive)
    const newMedia = { ...media };
    delete newMedia[itemNumber];
    saveMedia(newMedia);
  };

  return {
    inventory: getInventoryWithMedia(),
    updateImage,
    updateVideo,
    removeImage: removeMedia,
    getMedia: (itemNumber: number) => media[itemNumber],
  };
}
