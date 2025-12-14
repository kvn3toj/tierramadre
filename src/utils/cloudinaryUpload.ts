/**
 * Cloudinary Upload Utility
 * Handles direct browser uploads to Cloudinary with no size limits.
 */

// Cloudinary configuration
export const CLOUDINARY_CLOUD_NAME = 'dyam6g2os';
export const CLOUDINARY_UPLOAD_PRESET = 'tierramadre';

export interface CloudinaryUploadOptions {
  folder?: string;
  resourceType?: 'image' | 'video' | 'auto';
}

/**
 * Upload a file directly to Cloudinary from the browser.
 * Supports both images and videos with no size limits.
 */
export async function uploadToCloudinary(
  file: File,
  options: CloudinaryUploadOptions = {}
): Promise<string> {
  const isVideo = file.type.startsWith('video/');
  const resourceType = options.resourceType ?? (isVideo ? 'video' : 'image');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  if (options.folder) {
    formData.append('folder', options.folder);
  }

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
 * Upload a product file to Cloudinary with proper folder structure.
 */
export async function uploadProductMedia(
  file: File,
  itemNumber: number
): Promise<string> {
  return uploadToCloudinary(file, {
    folder: `tierramadre/product-${itemNumber}`,
  });
}
