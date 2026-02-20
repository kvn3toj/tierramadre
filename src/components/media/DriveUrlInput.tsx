/**
 * DriveUrlInput Component - Upload from Google Drive URL
 *
 * Features:
 * - Text input for Google Drive URL
 * - URL validation and preview
 * - Fetch from Drive → Upload to Cloudinary
 * - Loading state with progress
 * - Error handling
 */

import { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  LinearProgress,
  alpha,
  Alert,
  CircularProgress,
} from '@mui/material';
import { cssTransition, primitiveColors } from '../../design-system';

const emerald = primitiveColors.emerald;
import {
  Link as LinkIcon,
  Upload,
  X,
  CheckCircle,
  Video,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MediaItem } from './types';

interface DriveUrlInputProps {
  itemNumber: number;
  media: MediaItem[];
  onUploadComplete: (cloudinaryUrl: string, metadata: UploadMetadata) => void;
  onDelete?: (mediaId: string) => Promise<void>;
  disabled?: boolean;
}

interface UploadMetadata {
  publicId: string;
  format: string;
  width: number;
  height: number;
  resourceType: 'image' | 'video';
  bytes: number;
  originalName?: string;
}

type UploadStatus = 'idle' | 'validating' | 'downloading' | 'uploading' | 'success' | 'error';

// Extract file ID from Google Drive URL
function extractDriveFileId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/([a-zA-Z0-9_-]{25,})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }

  return null;
}

// Get preview URL for Google Drive file
function getDrivePreviewUrl(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
}

export default function DriveUrlInput({
  itemNumber,
  media,
  onUploadComplete,
  onDelete,
  disabled = false,
}: DriveUrlInputProps) {
  const [driveUrl, setDriveUrl] = useState('');
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Validate URL and show preview
  const handleUrlChange = useCallback((url: string) => {
    setDriveUrl(url);
    setError(null);
    setStatus('idle');

    const fileId = extractDriveFileId(url);
    if (fileId) {
      setPreviewUrl(getDrivePreviewUrl(fileId));
    } else {
      setPreviewUrl(null);
    }
  }, []);

  // Handle paste event for quick URL input
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText && extractDriveFileId(pastedText)) {
      handleUrlChange(pastedText);
    }
  }, [handleUrlChange]);

  // Upload from Drive URL
  const handleUpload = useCallback(async () => {
    if (!driveUrl || disabled) return;

    const fileId = extractDriveFileId(driveUrl);
    if (!fileId) {
      setError('Invalid Google Drive URL. Please paste a valid Drive link.');
      return;
    }

    setStatus('downloading');
    setError(null);

    try {
      // API endpoint temporarily disabled to stay within Vercel Hobby limit
      throw new Error('Subida desde Drive temporalmente deshabilitada. Usa las carpetas de Drive directamente.');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to upload');
    }
  }, [driveUrl, itemNumber, disabled, onUploadComplete]);

  // Clear input
  const handleClear = useCallback(() => {
    setDriveUrl('');
    setPreviewUrl(null);
    setError(null);
    setStatus('idle');
  }, []);

  const isLoading = status === 'downloading' || status === 'uploading' || status === 'validating';
  const hasValidUrl = extractDriveFileId(driveUrl) !== null;

  return (
    <Box sx={{ width: '100%' }}>
      {/* URL Input Section */}
      <Box
        sx={{
          p: 3,
          borderRadius: 2,
          border: '2px dashed',
          borderColor: error ? 'error.main' : status === 'success' ? 'success.main' : 'divider',
          bgcolor: alpha(emerald[500], 0.05),
          transition: cssTransition.default,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <LinkIcon size={20} color={emerald[500]} />
          <Typography variant="subtitle2" sx={{ color: 'text.primary' }}>
            Upload from Google Drive
          </Typography>
        </Box>

        <TextField
          fullWidth
          placeholder="Paste Google Drive URL here..."
          value={driveUrl}
          onChange={(e) => handleUrlChange(e.target.value)}
          onPaste={handlePaste}
          disabled={disabled || isLoading}
          error={!!error}
          size="small"
          InputProps={{
            endAdornment: driveUrl && (
              <IconButton size="small" onClick={handleClear} disabled={isLoading}>
                <X size={16} />
              </IconButton>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'background.paper',
            },
          }}
        />

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Preview Section */}
        <AnimatePresence>
          {previewUrl && !error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                {/* Thumbnail Preview */}
                <Box
                  component="img"
                  src={previewUrl}
                  alt="Preview"
                  sx={{
                    width: 120,
                    height: 120,
                    objectFit: 'cover',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />

                {/* Upload Button */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Preview from Google Drive
                  </Typography>

                  {status === 'success' ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main' }}>
                      <CheckCircle size={20} />
                      <Typography variant="body2">Uploaded successfully!</Typography>
                    </Box>
                  ) : (
                    <Button
                      variant="contained"
                      startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <Upload size={16} />}
                      onClick={handleUpload}
                      disabled={disabled || isLoading || !hasValidUrl}
                      sx={{
                        bgcolor: emerald[500],
                        '&:hover': { bgcolor: emerald[600] },
                      }}
                    >
                      {isLoading ? 'Uploading...' : 'Upload to Gallery'}
                    </Button>
                  )}

                  {isLoading && (
                    <LinearProgress
                      sx={{
                        mt: 1,
                        borderRadius: 1,
                        bgcolor: alpha(emerald[500], 0.2),
                        '& .MuiLinearProgress-bar': { bgcolor: emerald[500] },
                      }}
                    />
                  )}
                </Box>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Help Text */}
        {!previewUrl && !error && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Supported formats: JPG, PNG, WebP, GIF, MP4, MOV, WebM
          </Typography>
        )}
      </Box>

      {/* Existing Media */}
      {media.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Uploaded media ({media.length})
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {media.map((item) => (
              <Box
                key={item.id}
                sx={{
                  position: 'relative',
                  width: 80,
                  height: 80,
                  borderRadius: 1,
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                {item.type === 'video' ? (
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      bgcolor: 'grey.900',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Video size={24} color="#fff" />
                  </Box>
                ) : (
                  <Box
                    component="img"
                    src={item.url}
                    alt={item.alt}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                )}
                {onDelete && (
                  <IconButton
                    size="small"
                    onClick={() => onDelete(item.id)}
                    sx={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      bgcolor: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                      p: 0.5,
                    }}
                  >
                    <X size={12} />
                  </IconButton>
                )}
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
