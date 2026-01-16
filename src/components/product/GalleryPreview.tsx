/**
 * GalleryPreview Component
 * Shows mini-thumbnails preview for items with multiple images.
 * Displays up to 3 thumbnails with "+N más" badge for additional images.
 */
import { Box, Typography, alpha } from '@mui/material';
import { Images, Play } from 'lucide-react';
import { useThemeMode } from '../../contexts/ThemeContext';
import { emeraldCore, surfacesLight, surfacesDark } from '../../design-system/tokens/colors';

interface GalleryPreviewProps {
  /** Array of image URLs */
  images: string[];
  /** Main image URL (used if images array is empty) */
  mainImage?: string;
  /** Whether the main media is a video */
  isVideo?: boolean;
  /** Total count of gallery items (if different from images.length) */
  totalCount?: number;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Click handler for the preview */
  onClick?: () => void;
}

const SIZE_CONFIG = {
  small: { thumbnailSize: 24, gap: 2, badgeSize: 20, fontSize: '0.6rem' },
  medium: { thumbnailSize: 32, gap: 3, badgeSize: 24, fontSize: '0.65rem' },
  large: { thumbnailSize: 40, gap: 4, badgeSize: 28, fontSize: '0.7rem' },
};

export default function GalleryPreview({
  images,
  mainImage,
  isVideo = false,
  totalCount,
  size = 'medium',
  onClick,
}: GalleryPreviewProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const config = SIZE_CONFIG[size];

  // Build the preview images array
  const allImages = images.length > 0 ? images : mainImage ? [mainImage] : [];
  const previewImages = allImages.slice(0, 3);
  const total = totalCount ?? allImages.length;
  const remaining = total - 3;
  const hasMore = remaining > 0;

  // Don't render if no images
  if (previewImages.length === 0) {
    return null;
  }

  // If only 1 image and no video, don't show preview (it's redundant)
  if (previewImages.length === 1 && !isVideo && total === 1) {
    return null;
  }

  return (
    <Box
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: `${config.gap}px`,
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? {
          '& .preview-thumb': {
            transform: 'scale(1.05)',
            borderColor: emeraldCore.primary,
          },
        } : undefined,
      }}
    >
      {/* Video indicator */}
      {isVideo && (
        <Box
          sx={{
            width: config.thumbnailSize,
            height: config.thumbnailSize,
            borderRadius: 1,
            bgcolor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid',
            borderColor: alpha(emeraldCore.primary, 0.5),
          }}
        >
          <Play size={config.thumbnailSize * 0.5} color="white" fill="white" />
        </Box>
      )}

      {/* Thumbnail previews */}
      {previewImages.map((img, index) => (
        <Box
          key={index}
          className="preview-thumb"
          sx={{
            width: config.thumbnailSize,
            height: config.thumbnailSize,
            borderRadius: 1,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
            transition: 'all 0.2s ease',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          <Box
            component="img"
            src={img}
            alt={`Preview ${index + 1}`}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            loading="lazy"
          />

          {/* Overlay for stacking effect on middle thumbnails */}
          {index > 0 && index < previewImages.length - 1 && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                bgcolor: 'rgba(0, 0, 0, 0.1)',
              }}
            />
          )}
        </Box>
      ))}

      {/* "+N más" badge */}
      {hasMore && (
        <Box
          sx={{
            minWidth: config.badgeSize,
            height: config.badgeSize,
            borderRadius: 1,
            bgcolor: alpha(emeraldCore.primary, 0.15),
            border: '1px solid',
            borderColor: alpha(emeraldCore.primary, 0.3),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: 0.5,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontSize: config.fontSize,
              fontWeight: 600,
              color: emeraldCore.dark,
              whiteSpace: 'nowrap',
            }}
          >
            +{remaining}
          </Typography>
        </Box>
      )}

      {/* Gallery icon for single image with video */}
      {previewImages.length === 1 && isVideo && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: isLight ? surfacesLight.text.secondary : surfacesDark.text.secondary,
          }}
        >
          <Images size={config.thumbnailSize * 0.5} />
          <Typography variant="caption" sx={{ fontSize: config.fontSize }}>
            {total}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

// Compact version for cards - shows just count badge
export function GalleryCount({
  count,
  hasVideo = false,
}: {
  count: number;
  hasVideo?: boolean;
}) {
  if (count <= 1 && !hasVideo) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        py: 0.25,
        borderRadius: 1,
        bgcolor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {hasVideo ? (
        <Play size={12} color="white" fill="white" />
      ) : (
        <Images size={12} color="white" />
      )}
      <Typography
        variant="caption"
        sx={{
          fontSize: '0.65rem',
          fontWeight: 600,
          color: 'white',
        }}
      >
        {count}
      </Typography>
    </Box>
  );
}
