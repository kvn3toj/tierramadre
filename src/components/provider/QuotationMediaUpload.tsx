/**
 * QuotationMediaUpload - Media upload component for quotations
 *
 * Allows uploading images, GIFs, and videos to Google Drive
 * for both provider quotations and admin quotation requests.
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  IconButton,
  LinearProgress,
  alpha,
  CircularProgress,
  Stack,
} from '@mui/material';
import { Upload, X, Image as ImageIcon, Video, Film } from 'lucide-react';
import { brand } from '../../design-system';

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  error?: string;
  preview?: string;
}

interface QuotationMediaUploadProps {
  quotationId: string;
  uploadedUrls: string[];
  onUploadComplete: (urls: string[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

// Helper to check if file is an image
const isImageFile = (file: File): boolean => {
  if (file.type.startsWith('image/')) return true;
  const ext = file.name.toLowerCase().split('.').pop();
  return ['heic', 'heif', 'jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '');
};

export default function QuotationMediaUpload({
  quotationId,
  uploadedUrls,
  onUploadComplete,
  maxFiles = 5,
  disabled = false,
}: QuotationMediaUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const remainingSlots = maxFiles - uploadedUrls.length;
  const canUpload = remainingSlots > 0 && !disabled && !isUploading;

  const uploadFiles = async (files: File[]) => {
    if (!quotationId || files.length === 0) return;

    setIsUploading(true);

    const formData = new FormData();
    formData.append('quotationId', quotationId);

    files.forEach((file) => {
      formData.append('file', file);
    });

    try {
      const response = await fetch('/api/upload-cotizacion-media', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.urls) {
        // Add new URLs to existing ones
        const newUrls = [...uploadedUrls, ...data.urls];
        onUploadComplete(newUrls);
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      // Mark files as errored
      setUploadingFiles((prev) =>
        prev.map((f) => ({ ...f, error: 'Error al subir' }))
      );
    } finally {
      setIsUploading(false);
      setUploadingFiles([]);
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!canUpload) return;

      // Limit files to remaining slots
      const filesToUpload = acceptedFiles.slice(0, remainingSlots);

      // Create preview items
      const newUploading: UploadingFile[] = filesToUpload.map((file) => ({
        id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        file,
        progress: 0,
        preview: isImageFile(file) ? URL.createObjectURL(file) : undefined,
      }));

      setUploadingFiles(newUploading);

      // Simulate progress while uploading
      const progressInterval = setInterval(() => {
        setUploadingFiles((prev) =>
          prev.map((f) => ({
            ...f,
            progress: Math.min(f.progress + 10, 90),
          }))
        );
      }, 200);

      await uploadFiles(filesToUpload);

      clearInterval(progressInterval);
    },
    [canUpload, remainingSlots, quotationId, uploadedUrls]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif', '.heic', '.heif'],
      'video/*': ['.mp4', '.mov', '.webm'],
    },
    maxFiles: remainingSlots,
    disabled: !canUpload,
  });

  const handleRemove = (urlToRemove: string) => {
    const newUrls = uploadedUrls.filter((url) => url !== urlToRemove);
    onUploadComplete(newUrls);
  };

  const getFileIcon = (url: string) => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('.gif')) {
      return <Film size={16} color={brand.emerald[500]} />;
    }
    if (lowerUrl.includes('.mp4') || lowerUrl.includes('.mov') || lowerUrl.includes('.webm')) {
      return <Video size={16} color={brand.emerald[500]} />;
    }
    return <ImageIcon size={16} color={brand.emerald[500]} />;
  };

  return (
    <Box>
      {/* Drop Zone */}
      <Box
        {...getRootProps()}
        sx={{
          p: 3,
          borderRadius: 2,
          border: '2px dashed',
          borderColor: isDragActive
            ? brand.emerald[500]
            : canUpload
            ? alpha(brand.emerald[500], 0.4)
            : 'grey.300',
          bgcolor: isDragActive
            ? alpha(brand.emerald[500], 0.1)
            : canUpload
            ? alpha(brand.emerald[500], 0.02)
            : 'grey.50',
          textAlign: 'center',
          cursor: canUpload ? 'pointer' : 'not-allowed',
          transition: 'all 0.3s ease',
          '&:hover': canUpload
            ? {
                borderColor: brand.emerald[500],
                bgcolor: alpha(brand.emerald[500], 0.05),
              }
            : {},
        }}
      >
        <input {...getInputProps()} />

        <Upload
          size={36}
          color={canUpload ? brand.emerald[500] : '#9CA3AF'}
          style={{ opacity: 0.6, marginBottom: 8 }}
        />

        {isDragActive ? (
          <Typography variant="body2" color="primary">
            Suelta los archivos aqui...
          </Typography>
        ) : canUpload ? (
          <>
            <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
              Arrastra fotos, GIFs o videos
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
              o haz clic para seleccionar
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 1 }}>
              {remainingSlots} de {maxFiles} espacios disponibles
            </Typography>
          </>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {isUploading ? 'Subiendo archivos...' : `Maximo de ${maxFiles} archivos alcanzado`}
          </Typography>
        )}
      </Box>

      {/* Uploading Progress */}
      {uploadingFiles.length > 0 && (
        <Stack spacing={1} sx={{ mt: 2 }}>
          {uploadingFiles.map((item) => (
            <Box
              key={item.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: item.error ? alpha('#EF4444', 0.1) : 'grey.50',
              }}
            >
              {item.preview ? (
                <Box
                  component="img"
                  src={item.preview}
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    bgcolor: 'grey.200',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Video size={18} color="#6B7280" />
                </Box>
              )}

              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" noWrap sx={{ maxWidth: 150, display: 'block' }}>
                  {item.file.name}
                </Typography>
                {item.error ? (
                  <Typography variant="caption" color="error">
                    {item.error}
                  </Typography>
                ) : (
                  <LinearProgress
                    variant="determinate"
                    value={item.progress}
                    sx={{
                      mt: 0.5,
                      height: 3,
                      borderRadius: 2,
                      bgcolor: alpha(brand.emerald[500], 0.1),
                      '& .MuiLinearProgress-bar': { bgcolor: brand.emerald[500] },
                    }}
                  />
                )}
              </Box>

              {isUploading && !item.error && (
                <CircularProgress size={16} sx={{ color: brand.emerald[500] }} />
              )}
            </Box>
          ))}
        </Stack>
      )}

      {/* Uploaded Files Grid */}
      {uploadedUrls.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
            Archivos subidos ({uploadedUrls.length}/{maxFiles})
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {uploadedUrls.map((url, index) => (
              <Box
                key={url}
                sx={{
                  position: 'relative',
                  width: 72,
                  height: 72,
                  borderRadius: 1.5,
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'grey.200',
                }}
              >
                {url.toLowerCase().includes('.mp4') ||
                url.toLowerCase().includes('.mov') ||
                url.toLowerCase().includes('.webm') ? (
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      bgcolor: 'grey.200',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Video size={24} color="#6B7280" />
                  </Box>
                ) : (
                  <Box
                    component="img"
                    src={url}
                    alt={`Media ${index + 1}`}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                )}

                {/* Type indicator */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 2,
                    left: 2,
                    bgcolor: 'rgba(255,255,255,0.9)',
                    borderRadius: 0.5,
                    p: 0.25,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {getFileIcon(url)}
                </Box>

                {/* Delete button */}
                {!disabled && (
                  <IconButton
                    size="small"
                    onClick={() => handleRemove(url)}
                    sx={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      bgcolor: 'rgba(0,0,0,0.5)',
                      color: 'white',
                      p: 0.25,
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                    }}
                  >
                    <X size={14} />
                  </IconButton>
                )}
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}
