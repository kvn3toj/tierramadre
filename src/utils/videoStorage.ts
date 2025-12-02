// IndexedDB utility for storing large video files
// Videos are too large for LocalStorage, so we use IndexedDB instead

const DB_NAME = 'TierraMadreDB';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

interface VideoData {
  id: string;
  blob: Blob;
  mimeType: string;
  createdAt: string;
}

// Initialize IndexedDB
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

// Save video to IndexedDB
export const saveVideo = async (id: string, blob: Blob): Promise<string> => {
  const db = await initDB();

  const videoData: VideoData = {
    id,
    blob,
    mimeType: blob.type,
    createdAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(videoData);

    request.onsuccess = () => {
      db.close();
      // Return a reference ID that can be stored in localStorage
      resolve(`indexeddb://${id}`);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
};

// Get video from IndexedDB
export const getVideo = async (id: string): Promise<Blob | null> => {
  // Remove indexeddb:// prefix if present
  const cleanId = id.replace('indexeddb://', '');

  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(cleanId);

    request.onsuccess = () => {
      db.close();
      const result = request.result as VideoData | undefined;
      resolve(result?.blob || null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
};

// Get video as object URL for playback
export const getVideoUrl = async (id: string): Promise<string | null> => {
  const blob = await getVideo(id);
  if (!blob) return null;
  return URL.createObjectURL(blob);
};

// Delete video from IndexedDB
export const deleteVideo = async (id: string): Promise<void> => {
  const cleanId = id.replace('indexeddb://', '');
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(cleanId);

    request.onsuccess = () => {
      db.close();
      resolve();
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
};

// Get all video IDs
export const getAllVideoIds = async (): Promise<string[]> => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAllKeys();

    request.onsuccess = () => {
      db.close();
      resolve(request.result as string[]);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
};

// Extract thumbnail from video file
export const extractVideoThumbnail = (videoFile: File, timeInSeconds = 1): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      // Seek to the specified time
      video.currentTime = Math.min(timeInSeconds, video.duration);
    };

    video.onseeked = () => {
      try {
        // Set canvas size to video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw the frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to base64 image
        const thumbnail = canvas.toDataURL('image/jpeg', 0.85);

        // Clean up
        URL.revokeObjectURL(video.src);
        resolve(thumbnail);
      } catch (error) {
        reject(error);
      }
    };

    video.onerror = () => {
      reject(new Error('Failed to load video'));
    };

    // Create object URL from file
    video.src = URL.createObjectURL(videoFile);
  });
};

// Check if a URL is a video reference
export const isVideoReference = (url: string): boolean => {
  return url.startsWith('indexeddb://');
};

// Get file size information
export const getStorageStats = async (): Promise<{ used: number; total: number }> => {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage || 0,
      total: estimate.quota || 0,
    };
  }
  return { used: 0, total: 0 };
};
