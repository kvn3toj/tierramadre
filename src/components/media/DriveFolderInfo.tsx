/**
 * DriveFolderInfo Component - Show Google Drive folder info for uploading
 *
 * Displays information about where to upload images in Google Drive
 * and shows existing images from the folder.
 */

import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  alpha,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import { primitiveColors } from '../../design-system';

const emerald = primitiveColors.emerald;
import {
  FolderOpen,
  RefreshCw,
  Image as ImageIcon,
  Video,
  X,
} from 'lucide-react';
import type { MediaItem } from './types';

interface DriveFolderInfoProps {
  itemNumber: number;
  media: MediaItem[];
  onRefresh?: () => void;
  onDelete?: (mediaId: string) => Promise<void>;
}

export default function DriveFolderInfo({
  itemNumber,
  media,
  onRefresh,
  onDelete,
}: DriveFolderInfoProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Construct the expected folder path
  const folderPath = `products/${itemNumber}`;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    // Small delay to show the refresh animation
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Folder Info Section */}
      <Box
        sx={{
          p: 3,
          borderRadius: 2,
          border: '2px dashed',
          borderColor: 'divider',
          bgcolor: alpha(emerald[500], 0.05),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <FolderOpen size={20} color={emerald[500]} />
          <Typography variant="subtitle2" sx={{ color: 'text.primary' }}>
            Carpeta de Google Drive
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Para agregar imágenes a este producto, sube archivos a la carpeta:
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, fontFamily: 'monospace', mt: 1 }}
          >
            📁 {folderPath}
          </Typography>
        </Alert>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={isRefreshing ? <CircularProgress size={16} /> : <RefreshCw size={16} />}
            onClick={handleRefresh}
            disabled={isRefreshing}
            sx={{
              borderColor: emerald[500],
              color: emerald[500],
              '&:hover': {
                borderColor: emerald[600],
                bgcolor: alpha(emerald[500], 0.08),
              },
            }}
          >
            {isRefreshing ? 'Actualizando...' : 'Actualizar imágenes'}
          </Button>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          Formatos soportados: JPG, PNG, WebP, GIF, MP4, MOV, WebM
        </Typography>
      </Box>

      {/* Existing Media */}
      {media.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Imágenes en la carpeta ({media.length})
            </Typography>
            <Chip
              label="Desde Google Drive"
              size="small"
              sx={{ bgcolor: alpha(emerald[500], 0.1), color: emerald[500], fontSize: '0.7rem' }}
            />
          </Box>
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
                    onError={(e) => {
                      // Show placeholder on error
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.parentElement!.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f5f5f5"><span style="font-size:10px;color:#999">Error</span></div>';
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

      {media.length === 0 && (
        <Box sx={{ mt: 2, textAlign: 'center', py: 2 }}>
          <ImageIcon size={32} color="#ccc" style={{ marginBottom: 8 }} />
          <Typography variant="body2" color="text.secondary">
            No hay imágenes en la carpeta
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Sube imágenes a Google Drive y presiona "Actualizar"
          </Typography>
        </Box>
      )}
    </Box>
  );
}
