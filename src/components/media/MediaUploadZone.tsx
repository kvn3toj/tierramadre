/**
 * MediaUploadZone Component - Multi-file Upload with Drag & Drop
 *
 * Features:
 * - Drag & drop zone for multiple files
 * - Click to browse fallback
 * - File type validation (images + videos)
 * - Progress indicators
 * - Reorder capability
 * - Delete uploaded items
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Upload,
  X,
  Image as ImageIcon,
  Video,
  GripVertical,
} from 'lucide-react';
import { motion, Reorder } from 'framer-motion';
import { MediaItem, CATEGORY_LABELS, CATEGORY_ORDER } from './types';

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  error?: string;
  preview?: string;
}

interface MediaUploadZoneProps {
  media: MediaItem[];
  onUpload: (files: File[], category: MediaItem['category']) => Promise<void>;
  onDelete: (mediaId: string) => Promise<void>;
  onReorder: (newOrder: MediaItem[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

export default function MediaUploadZone({
  media,
  onUpload,
  onDelete,
  onReorder,
  maxFiles = 8,
  disabled = false,
}: MediaUploadZoneProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<MediaItem['category']>('hero');
  const [deleting, setDeleting] = useState<string | null>(null);

  const remainingSlots = maxFiles - media.length;
  const canUpload = remainingSlots > 0 && !disabled;

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!canUpload) return;

      // Limit files to remaining slots
      const filesToUpload = acceptedFiles.slice(0, remainingSlots);

      // Create preview items
      const newUploading: UploadingFile[] = filesToUpload.map((file) => ({
        id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        progress: 0,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      }));

      setUploadingFiles((prev) => [...prev, ...newUploading]);

      try {
        // Simulate progress
        for (const item of newUploading) {
          for (let i = 0; i <= 100; i += 20) {
            await new Promise((r) => setTimeout(r, 100));
            setUploadingFiles((prev) =>
              prev.map((f) => (f.id === item.id ? { ...f, progress: i } : f))
            );
          }
        }

        // Actually upload
        await onUpload(filesToUpload, selectedCategory);

        // Clear uploading state
        setUploadingFiles((prev) =>
          prev.filter((f) => !newUploading.find((n) => n.id === f.id))
        );
      } catch (error) {
        console.error('Upload error:', error);
        setUploadingFiles((prev) =>
          prev.map((f) =>
            newUploading.find((n) => n.id === f.id)
              ? { ...f, error: 'Error al subir' }
              : f
          )
        );
      }
    },
    [canUpload, remainingSlots, onUpload, selectedCategory]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
      'video/*': ['.mp4', '.mov', '.webm'],
    },
    maxFiles: remainingSlots,
    disabled: !canUpload,
  });

  const handleDelete = async (mediaId: string) => {
    setDeleting(mediaId);
    try {
      await onDelete(mediaId);
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Box>
      {/* Category Selector */}
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Categoría para nuevas fotos</InputLabel>
        <Select
          value={selectedCategory}
          label="Categoría para nuevas fotos"
          onChange={(e) => setSelectedCategory(e.target.value as MediaItem['category'])}
        >
          {CATEGORY_ORDER.map((cat) => (
            <MenuItem key={cat} value={cat}>
              {CATEGORY_LABELS[cat]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Drop Zone */}
      <Box
        {...getRootProps()}
        sx={{
          p: 4,
          borderRadius: 3,
          border: '2px dashed',
          borderColor: isDragActive
            ? '#059669'
            : canUpload
            ? alpha('#059669', 0.4)
            : 'grey.300',
          bgcolor: isDragActive
            ? alpha('#059669', 0.1)
            : canUpload
            ? alpha('#059669', 0.02)
            : 'grey.50',
          textAlign: 'center',
          cursor: canUpload ? 'pointer' : 'not-allowed',
          transition: 'all 0.3s ease',
          '&:hover': canUpload
            ? {
                borderColor: '#059669',
                bgcolor: alpha('#059669', 0.05),
              }
            : {},
        }}
      >
        <input {...getInputProps()} />

        <Upload
          size={48}
          color={canUpload ? '#059669' : '#9CA3AF'}
          style={{ opacity: 0.5, marginBottom: 16 }}
        />

        {isDragActive ? (
          <Typography variant="body1" color="primary">
            Suelta los archivos aquí...
          </Typography>
        ) : canUpload ? (
          <>
            <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 500 }}>
              Arrastra fotos o videos aquí
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              o haz clic para seleccionar
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled', mt: 1, display: 'block' }}>
              {remainingSlots} espacios disponibles • JPG, PNG, MP4 (máx. 50MB)
            </Typography>
          </>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Máximo de {maxFiles} archivos alcanzado
          </Typography>
        )}
      </Box>

      {/* Uploading Progress */}
      {uploadingFiles.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Subiendo...
          </Typography>
          {uploadingFiles.map((item) => (
            <Box
              key={item.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 1.5,
                borderRadius: 2,
                bgcolor: item.error ? alpha('#EF4444', 0.1) : 'grey.50',
                mb: 1,
              }}
            >
              {item.preview ? (
                <Box
                  component="img"
                  src={item.preview}
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1,
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1,
                    bgcolor: 'grey.200',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Video size={20} color="#6B7280" />
                </Box>
              )}

              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
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
                      height: 4,
                      borderRadius: 2,
                      bgcolor: alpha('#059669', 0.1),
                      '& .MuiLinearProgress-bar': { bgcolor: '#059669' },
                    }}
                  />
                )}
              </Box>

              {item.error && (
                <IconButton
                  size="small"
                  onClick={() =>
                    setUploadingFiles((prev) => prev.filter((f) => f.id !== item.id))
                  }
                >
                  <X size={16} />
                </IconButton>
              )}
            </Box>
          ))}
        </Box>
      )}

      {/* Uploaded Media Grid (Reorderable) */}
      {media.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
            Archivos subidos ({media.length}/{maxFiles})
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
            Arrastra para reordenar • El primero será la imagen principal
          </Typography>

          <Reorder.Group
            axis="y"
            values={media}
            onReorder={onReorder}
            style={{ listStyle: 'none', padding: 0, margin: 0 }}
          >
            {media.map((item, index) => (
              <Reorder.Item
                key={item.id}
                value={item}
                style={{ marginBottom: 8 }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: index === 0 ? alpha('#059669', 0.05) : 'grey.50',
                      border: '1px solid',
                      borderColor: index === 0 ? alpha('#059669', 0.3) : 'grey.200',
                      cursor: 'grab',
                      '&:active': { cursor: 'grabbing' },
                    }}
                  >
                    {/* Drag Handle */}
                    <GripVertical size={20} color="#9CA3AF" />

                    {/* Thumbnail */}
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 1.5,
                        overflow: 'hidden',
                        position: 'relative',
                        flexShrink: 0,
                      }}
                    >
                      {item.type === 'video' ? (
                        <>
                          {item.thumbnailUrl ? (
                            <img
                              src={item.thumbnailUrl}
                              alt=""
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: '100%',
                                height: '100%',
                                bgcolor: 'grey.300',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Video size={24} color="#6B7280" />
                            </Box>
                          )}
                        </>
                      ) : (
                        <img
                          src={item.url}
                          alt=""
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      )}
                    </Box>

                    {/* Info */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {item.type === 'video' ? (
                          <Video size={14} color="#059669" />
                        ) : (
                          <ImageIcon size={14} color="#059669" />
                        )}
                        <Typography variant="body2" fontWeight={500}>
                          {CATEGORY_LABELS[item.category]}
                        </Typography>
                        {index === 0 && (
                          <Typography
                            variant="caption"
                            sx={{
                              bgcolor: '#059669',
                              color: 'white',
                              px: 1,
                              py: 0.25,
                              borderRadius: 1,
                              fontSize: '0.65rem',
                            }}
                          >
                            Principal
                          </Typography>
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Posición {index + 1} de {media.length}
                      </Typography>
                    </Box>

                    {/* Delete */}
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      disabled={deleting === item.id}
                      sx={{
                        color: 'grey.500',
                        '&:hover': { color: '#EF4444', bgcolor: alpha('#EF4444', 0.1) },
                      }}
                    >
                      {deleting === item.id ? (
                        <CircularProgress size={16} />
                      ) : (
                        <X size={18} />
                      )}
                    </IconButton>
                  </Box>
                </motion.div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </Box>
      )}
    </Box>
  );
}
