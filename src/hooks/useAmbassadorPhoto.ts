/**
 * useAmbassadorPhoto Hook
 *
 * Manages ambassador profile photo upload flow:
 * file selection -> cropper dialog -> upload to Drive -> local state update.
 */

import { useState, useRef, useCallback } from 'react';
import { STORAGE_KEYS } from '../constants/storage-keys';

interface UseAmbassadorPhotoReturn {
  /** Override photo URL (from upload or localStorage cache) */
  localPhotoUrl: string | null;
  /** Whether upload is in progress */
  isUploading: boolean;
  /** Upload error message (null = no error) */
  uploadError: string | null;
  /** Whether cropper dialog is open */
  isCropperOpen: boolean;
  /** Image source for the cropper */
  cropperImageSrc: string;
  /** Called when user selects a file */
  handleFileSelect: (file: File) => void;
  /** Called when cropper produces a blob */
  handleCropComplete: (blob: Blob) => Promise<void>;
  /** Close the cropper dialog */
  closeCropper: () => void;
}

/** Safely revoke a blob URL tracked by a ref */
function revokeUrl(ref: React.MutableRefObject<string>) {
  if (ref.current && ref.current.startsWith('blob:')) {
    URL.revokeObjectURL(ref.current);
    ref.current = '';
  }
}

export function useAmbassadorPhoto(slug: string | undefined): UseAmbassadorPhotoReturn {
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(() => {
    if (!slug) return null;
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.AMBASSADOR_PHOTOS);
      if (cached) {
        const map = JSON.parse(cached);
        return map[slug] || null;
      }
    } catch { /* ignore */ }
    return null;
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState('');

  // Track object URL in a ref to avoid stale closures and double-revokes
  const objectUrlRef = useRef('');

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    // Revoke any previous object URL
    revokeUrl(objectUrlRef);
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setCropperImageSrc(objectUrl);
    setIsCropperOpen(true);
    setUploadError(null);
  }, []);

  const handleCropComplete = useCallback(async (blob: Blob) => {
    if (!slug) return;

    setIsCropperOpen(false);
    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', blob, `${slug}.jpg`);
      formData.append('slug', slug);

      const response = await fetch('/api/ambassador-photo', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al subir la foto');
      }

      const result = await response.json();
      if (result.success && result.proxyUrl) {
        // Add cache-bust param so the browser fetches the new image
        const freshUrl = `${result.proxyUrl}&t=${Date.now()}`;
        setLocalPhotoUrl(freshUrl);

        // Cache in localStorage for instant display on next visit
        try {
          const cached = localStorage.getItem(STORAGE_KEYS.AMBASSADOR_PHOTOS);
          const map = cached ? JSON.parse(cached) : {};
          map[slug] = freshUrl;
          localStorage.setItem(STORAGE_KEYS.AMBASSADOR_PHOTOS, JSON.stringify(map));
        } catch { /* ignore */ }
      }
    } catch (err) {
      console.error('[useAmbassadorPhoto] Upload error:', err);
      setUploadError(err instanceof Error ? err.message : 'Error al subir la foto');
    } finally {
      setIsUploading(false);
      revokeUrl(objectUrlRef);
      setCropperImageSrc('');
    }
  }, [slug]);

  const closeCropper = useCallback(() => {
    setIsCropperOpen(false);
    revokeUrl(objectUrlRef);
    setCropperImageSrc('');
  }, []);

  return {
    localPhotoUrl,
    isUploading,
    uploadError,
    isCropperOpen,
    cropperImageSrc,
    handleFileSelect,
    handleCropComplete,
    closeCropper,
  };
}
