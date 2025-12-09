import React, { CSSProperties, useRef, useState, DragEvent, ChangeEvent } from 'react';
import { IOSButton } from '../core/IOSButton';
import { IOSProgress } from '../feedback/IOSProgress';

/**
 * IOSFilePicker Mode
 */
export type IOSFilePickerMode = 'single' | 'batch';

/**
 * File with Preview
 */
export interface FileWithPreview {
  file: File;
  preview: string;
  id: string;
}

/**
 * IOSFilePicker Props
 */
export interface IOSFilePickerProps {
  /** Upload mode */
  mode?: IOSFilePickerMode;

  /** Accept file types */
  accept?: string;

  /** Maximum file size in MB */
  maxSizeMB?: number;

  /** Maximum number of files (batch mode) */
  maxFiles?: number;

  /** Enable camera capture (mobile) */
  enableCamera?: boolean;

  /** Camera mode (front/back) */
  cameraMode?: 'user' | 'environment';

  /** Show preview grid */
  showPreview?: boolean;

  /** Upload progress (0-100) */
  uploadProgress?: number;

  /** Loading state */
  loading?: boolean;

  /** Disabled state */
  disabled?: boolean;

  /** On files selected */
  onFilesSelected?: (files: FileWithPreview[]) => void;

  /** On file removed */
  onFileRemoved?: (id: string) => void;

  /** On error */
  onError?: (error: string) => void;

  /** Custom className */
  className?: string;

  /** Custom inline styles */
  style?: CSSProperties;

  /** Test ID */
  'data-testid'?: string;
}

/**
 * Validate file size
 */
function validateFileSize(file: File, maxSizeMB: number): boolean {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxBytes;
}

/**
 * Check if file is an image (including HEIC which some browsers don't recognize)
 */
function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  // Check by extension for HEIC/HEIF (some browsers don't set correct MIME type)
  const ext = file.name.toLowerCase().split('.').pop();
  return ['heic', 'heif', 'jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '');
}

/**
 * Check if file is a video
 */
function isVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true;
  const ext = file.name.toLowerCase().split('.').pop();
  return ['mp4', 'mov', 'webm', 'avi'].includes(ext || '');
}

/**
 * Create file preview URL
 */
function createPreviewURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (isImageFile(file)) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } else if (isVideoFile(file)) {
      const url = URL.createObjectURL(file);
      resolve(url);
    } else {
      reject(new Error('Unsupported file type'));
    }
  });
}

/**
 * IOSFilePicker Component
 *
 * iOS-style file picker with camera integration and drag-and-drop.
 * Supports both single and batch upload modes.
 *
 * @example Single file upload
 * <IOSFilePicker
 *   mode="single"
 *   accept="image/*"
 *   enableCamera
 *   onFilesSelected={handleFiles}
 * />
 *
 * @example Batch upload with preview
 * <IOSFilePicker
 *   mode="batch"
 *   maxFiles={10}
 *   showPreview
 *   onFilesSelected={handleFiles}
 * />
 */
export const IOSFilePicker: React.FC<IOSFilePickerProps> = ({
  mode = 'single',
  accept = 'image/*,video/*,.heic,.heif',
  maxSizeMB = 50,
  maxFiles = 10,
  enableCamera = true,
  cameraMode = 'environment',
  showPreview = true,
  uploadProgress,
  loading = false,
  disabled = false,
  onFilesSelected,
  onFileRemoved,
  onError,
  className = '',
  style = {},
  'data-testid': testId,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Process files
  const processFiles = async (files: File[]) => {
    try {
      // Validate file count
      if (mode === 'single' && files.length > 1) {
        onError?.('Please select only one file');
        return;
      }

      if (mode === 'batch' && files.length > maxFiles) {
        onError?.(`Maximum ${maxFiles} files allowed`);
        return;
      }

      // Validate file sizes
      const invalidFiles = files.filter((file) => !validateFileSize(file, maxSizeMB));
      if (invalidFiles.length > 0) {
        onError?.(`Files must be smaller than ${maxSizeMB}MB`);
        return;
      }

      // Create previews
      const filesWithPreviews: FileWithPreview[] = await Promise.all(
        files.map(async (file) => ({
          file,
          preview: await createPreviewURL(file),
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        }))
      );

      setSelectedFiles(filesWithPreviews);
      onFilesSelected?.(filesWithPreviews);
    } catch (error) {
      onError?.('Failed to process files');
      console.error('File processing error:', error);
    }
  };

  // Handle file input change
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processFiles(files);
    }
  };

  // Handle drag events
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFiles(files);
    }
  };

  // Trigger file browser (no camera)
  const triggerFileInput = () => {
    if (!disabled && !loading) {
      fileInputRef.current?.click();
    }
  };

  // Trigger camera input
  const triggerCameraInput = () => {
    if (!disabled && !loading) {
      cameraInputRef.current?.click();
    }
  };

  // Remove file
  const removeFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
    onFileRemoved?.(id);
  };

  // Drop zone styles
  const dropZoneStyles: CSSProperties = {
    position: 'relative',
    minHeight: '200px',
    border: `2px dashed ${isDragging ? 'var(--brand-primary)' : 'var(--border-default)'}`,
    borderRadius: 'var(--border-radius-md)',
    backgroundColor: isDragging ? 'var(--button-secondary-bg)' : 'var(--surface-secondary)',
    padding: 'var(--spacing-xl)',
    textAlign: 'center',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all var(--duration-fast) var(--easing-standard)',
    opacity: disabled ? 0.6 : 1,
    ...style,
  };

  // Preview grid styles
  const previewGridStyles: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: 'var(--spacing-sm)',
    marginTop: 'var(--spacing-md)',
  };

  return (
    <div className={`ios-file-picker ${className}`} data-testid={testId}>
      {/* Hidden file input for browsing (no capture) */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={mode === 'batch'}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        disabled={disabled || loading}
      />

      {/* Hidden camera input (with capture) */}
      {enableCamera && (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture={cameraMode}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          disabled={disabled || loading}
        />
      )}

      {/* Drop zone */}
      <div
        style={dropZoneStyles}
        onClick={triggerFileInput}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--spacing-md)',
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--brand-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '32px',
            }}
          >
            📸
          </div>

          {/* Text */}
          <div>
            <p
              style={{
                fontFamily: 'var(--font-text)',
                fontSize: '17px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 'var(--spacing-xxs)',
              }}
            >
              {isDragging
                ? 'Drop files here'
                : enableCamera
                  ? 'Take Photo or Select Files'
                  : 'Select Files'}
            </p>
            <p
              style={{
                fontFamily: 'var(--font-text)',
                fontSize: '15px',
                color: 'var(--text-secondary)',
              }}
            >
              {mode === 'batch'
                ? `Up to ${maxFiles} files, max ${maxSizeMB}MB each`
                : `Max ${maxSizeMB}MB`}
            </p>
          </div>

          {/* Buttons */}
          <div
            style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-xs)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {enableCamera && (
              <IOSButton
                variant="filled"
                size="medium"
                onClick={triggerCameraInput}
                disabled={disabled || loading}
              >
                📷 Camera
              </IOSButton>
            )}
            <IOSButton
              variant="tinted"
              size="medium"
              onClick={triggerFileInput}
              disabled={disabled || loading}
            >
              📁 Browse
            </IOSButton>
          </div>

          {/* Upload progress */}
          {loading && uploadProgress !== undefined && (
            <div style={{ width: '100%', maxWidth: '300px', marginTop: 'var(--spacing-md)' }}>
              <IOSProgress variant="linear" value={uploadProgress} showLabel color="emerald" />
            </div>
          )}
        </div>
      </div>

      {/* Preview grid */}
      {showPreview && selectedFiles.length > 0 && (
        <div style={previewGridStyles}>
          {selectedFiles.map((fileWithPreview) => (
            <div
              key={fileWithPreview.id}
              style={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: 'var(--border-radius-sm)',
                overflow: 'hidden',
                backgroundColor: 'var(--surface-tertiary)',
                border: '1px solid var(--border-default)',
              }}
            >
              {/* Preview image/video */}
              {isImageFile(fileWithPreview.file) ? (
                <img
                  src={fileWithPreview.preview}
                  alt={fileWithPreview.file.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <video
                  src={fileWithPreview.preview}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              )}

              {/* Remove button */}
              <button
                onClick={() => removeFile(fileWithPreview.id)}
                style={{
                  position: 'absolute',
                  top: 'var(--spacing-xxs)',
                  right: 'var(--spacing-xxs)',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: 'var(--status-error)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                ×
              </button>

              {/* File name */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: 'var(--spacing-xxs)',
                  backgroundColor: 'var(--glass-bg)',
                  backdropFilter: 'var(--backdrop-blur-ios)',
                  fontSize: '11px',
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {fileWithPreview.file.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

IOSFilePicker.displayName = 'IOSFilePicker';

export default IOSFilePicker;
