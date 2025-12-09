/**
 * Shared Cloudinary upload hook.
 * Extracted from ProductDetail and useInventory.
 */
import { useState, useCallback } from 'react';
import { isVideoFile } from '../utils/fileTypeDetection';

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'dyam6g2os';
const CLOUDINARY_UPLOAD_PRESET = 'tierramadre';

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface UploadResult {
  url: string;
  publicId: string;
  resourceType: 'image' | 'video';
}

export interface UseCloudinaryUploadOptions {
  folder?: string;
  onProgress?: (progress: UploadProgress) => void;
}

/**
 * Upload a file to Cloudinary.
 * @param file - The file to upload
 * @param itemNumber - Product item number for folder organization
 * @param options - Upload options
 * @returns Promise with the uploaded file URL
 */
export async function uploadToCloudinary(
  file: File,
  itemNumber: number,
  options?: UseCloudinaryUploadOptions
): Promise<string> {
  const isVideo = isVideoFile(file);
  const resourceType = isVideo ? 'video' : 'image';
  const folder = options?.folder || `tierramadre/product-${itemNumber}`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Error al subir' } }));
    throw new Error(error.error?.message || 'Error al subir a Cloudinary');
  }

  const data = await response.json();
  return data.secure_url;
}

/**
 * Hook for uploading files to Cloudinary with state management.
 */
export function useCloudinaryUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  const upload = useCallback(async (
    file: File,
    itemNumber: number,
    options?: UseCloudinaryUploadOptions
  ): Promise<string | null> => {
    setIsUploading(true);
    setError(null);
    setProgress({ loaded: 0, total: file.size, percent: 0 });

    try {
      const url = await uploadToCloudinary(file, itemNumber, {
        ...options,
        onProgress: (p) => {
          setProgress(p);
          options?.onProgress?.(p);
        },
      });
      setProgress({ loaded: file.size, total: file.size, percent: 100 });
      return url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al subir archivo';
      setError(message);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const uploadMultiple = useCallback(async (
    files: File[],
    itemNumber: number,
    options?: UseCloudinaryUploadOptions
  ): Promise<(string | null)[]> => {
    const results: (string | null)[] = [];

    for (const file of files) {
      const url = await upload(file, itemNumber, options);
      results.push(url);
    }

    return results;
  }, [upload]);

  const reset = useCallback(() => {
    setIsUploading(false);
    setError(null);
    setProgress(null);
  }, []);

  return {
    upload,
    uploadMultiple,
    reset,
    isUploading,
    error,
    progress,
  };
}
