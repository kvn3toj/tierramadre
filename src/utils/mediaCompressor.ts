/**
 * Client-side media compression utilities
 *
 * Compresses videos and images in the browser BEFORE uploading,
 * dramatically reducing upload time for large files.
 */

import { createLogger } from './logger';

const log = createLogger('MediaCompressor');

interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  duration?: number; // ms
}

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1 for images
  videoBitrate?: number; // kbps for videos
  maxFileSizeMB?: number;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.85,
  videoBitrate: 2000, // 2 Mbps - good quality for web
  maxFileSizeMB: 5,
};

/**
 * Check if browser supports video compression via MediaRecorder
 */
export function supportsVideoCompression(): boolean {
  return typeof MediaRecorder !== 'undefined' &&
         typeof HTMLVideoElement !== 'undefined' &&
         MediaRecorder.isTypeSupported('video/webm;codecs=vp8');
}

/**
 * Compress an image file using Canvas API
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      const maxW = opts.maxWidth!;
      const maxH = opts.maxHeight!;

      if (width > maxW || height > maxH) {
        const ratio = Math.min(maxW / width, maxH / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }

          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          const duration = Date.now() - startTime;
          log.info(`Image compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(blob.size / 1024 / 1024).toFixed(2)}MB (${duration}ms)`);

          resolve({
            file: compressedFile,
            originalSize: file.size,
            compressedSize: blob.size,
            compressionRatio: file.size / blob.size,
            duration,
          });
        },
        'image/jpeg',
        opts.quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Compress a video file using Canvas + MediaRecorder
 * This re-encodes the video at a lower bitrate
 */
export async function compressVideo(
  file: File,
  options: CompressionOptions = {},
  onProgress?: (progress: number) => void
): Promise<CompressionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();

  if (!supportsVideoCompression()) {
    log.warn('Video compression not supported, returning original file');
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      compressionRatio: 1,
      duration: 0,
    };
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);

    video.onloadedmetadata = async () => {
      // Calculate target dimensions
      let width = video.videoWidth;
      let height = video.videoHeight;
      const maxW = opts.maxWidth!;
      const maxH = opts.maxHeight!;

      if (width > maxW || height > maxH) {
        const ratio = Math.min(maxW / width, maxH / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Ensure dimensions are even (required by some codecs)
      width = Math.floor(width / 2) * 2;
      height = Math.floor(height / 2) * 2;

      log.info(`Compressing video: ${video.videoWidth}x${video.videoHeight} -> ${width}x${height}`);

      // Create canvas for frame capture
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Setup MediaRecorder
      const stream = canvas.captureStream(30); // 30 fps

      // Try to get video's audio track and add to stream
      try {
        // Create audio context to capture audio
        const audioContext = new AudioContext();
        const source = audioContext.createMediaElementSource(video);
        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination);
        source.connect(audioContext.destination);

        // Add audio track to stream
        destination.stream.getAudioTracks().forEach(track => {
          stream.addTrack(track);
        });
      } catch (e) {
        log.warn('Could not capture audio:', e);
      }

      // Determine best codec
      let mimeType = 'video/webm;codecs=vp8';
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        mimeType = 'video/webm;codecs=vp9';
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: opts.videoBitrate! * 1000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        URL.revokeObjectURL(url);

        const blob = new Blob(chunks, { type: 'video/webm' });
        const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webm'), {
          type: 'video/webm',
          lastModified: Date.now(),
        });

        const duration = Date.now() - startTime;
        log.info(`Video compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(blob.size / 1024 / 1024).toFixed(2)}MB (${duration}ms)`);

        resolve({
          file: compressedFile,
          originalSize: file.size,
          compressedSize: blob.size,
          compressionRatio: file.size / blob.size,
          duration,
        });
      };

      recorder.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(new Error(`MediaRecorder error: ${e}`));
      };

      // Start recording
      recorder.start();

      // Play video and capture frames
      video.currentTime = 0;
      const videoDuration = video.duration;

      const renderFrame = () => {
        if (video.ended || video.paused) {
          recorder.stop();
          return;
        }

        ctx.drawImage(video, 0, 0, width, height);

        // Report progress
        if (onProgress && videoDuration) {
          onProgress(Math.min(100, (video.currentTime / videoDuration) * 100));
        }

        requestAnimationFrame(renderFrame);
      };

      video.onended = () => {
        recorder.stop();
      };

      video.onplay = () => {
        renderFrame();
      };

      video.play().catch((e) => {
        log.error('Failed to play video for compression:', e);
        // Fall back to original file
        URL.revokeObjectURL(url);
        resolve({
          file,
          originalSize: file.size,
          compressedSize: file.size,
          compressionRatio: 1,
          duration: Date.now() - startTime,
        });
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video'));
    };

    video.src = url;
  });
}

/**
 * Quick compression using FFmpeg.wasm (if available) or fallback to MediaRecorder
 * For now, we use a simpler approach: just resize/re-encode if needed
 */
export async function compressMedia(
  file: File,
  options: CompressionOptions = {},
  _onProgress?: (progress: number) => void
): Promise<CompressionResult> {
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');
  const fileSizeMB = file.size / (1024 * 1024);
  const maxSizeMB = options.maxFileSizeMB ?? DEFAULT_OPTIONS.maxFileSizeMB!;

  // Skip compression if file is already small enough
  if (fileSizeMB <= maxSizeMB) {
    log.info(`File already under ${maxSizeMB}MB, skipping compression`);
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      compressionRatio: 1,
      duration: 0,
    };
  }

  if (isVideo) {
    // For videos, use the fast approach: just upload as-is and let server handle it
    // Client-side video compression is slow and CPU-intensive
    // Instead, we'll optimize the server flow
    log.info(`Video ${fileSizeMB.toFixed(2)}MB - will use server-side optimization`);
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      compressionRatio: 1,
      duration: 0,
    };
  } else if (isImage) {
    return compressImage(file, options);
  } else {
    // GIF or other - return as-is
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      compressionRatio: 1,
      duration: 0,
    };
  }
}

/**
 * Estimate upload time based on file size and connection speed
 */
export function estimateUploadTime(fileSizeBytes: number, speedMbps = 10): number {
  const fileSizeMb = (fileSizeBytes * 8) / (1024 * 1024);
  return Math.ceil(fileSizeMb / speedMbps);
}
