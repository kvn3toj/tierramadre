/**
 * File type detection utilities.
 * Extracted from EmeraldUploader and ProductDetail.
 */

/**
 * Supported image extensions including HEIC/HEIF.
 */
const IMAGE_EXTENSIONS = ['heic', 'heif', 'jpg', 'jpeg', 'png', 'webp', 'gif'];

/**
 * Supported video extensions.
 */
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'avi'];

/**
 * Get the file extension in lowercase.
 * @param file - The file object
 * @returns Extension string or empty string
 */
const getExtension = (file: File): string => {
  return file.name.toLowerCase().split('.').pop() || '';
};

/**
 * Check if a file is an image (including HEIC which some browsers don't recognize).
 * @param file - The file to check
 * @returns True if the file is an image
 */
export const isImageFile = (file: File): boolean => {
  if (file.type.startsWith('image/')) return true;
  // Check by extension for HEIC/HEIF (some browsers don't set correct MIME type)
  return IMAGE_EXTENSIONS.includes(getExtension(file));
};

/**
 * Check if a file is a video.
 * @param file - The file to check
 * @returns True if the file is a video
 */
export const isVideoFile = (file: File): boolean => {
  if (file.type.startsWith('video/')) return true;
  return VIDEO_EXTENSIONS.includes(getExtension(file));
};

/**
 * Check if a file is media (image or video).
 * @param file - The file to check
 * @returns True if the file is an image or video
 */
export const isMediaFile = (file: File): boolean => {
  return isImageFile(file) || isVideoFile(file);
};

/**
 * Get the media type from a file.
 * @param file - The file to check
 * @returns 'image', 'video', or null if not a media file
 */
export const getMediaType = (file: File): 'image' | 'video' | null => {
  if (isImageFile(file)) return 'image';
  if (isVideoFile(file)) return 'video';
  return null;
};
