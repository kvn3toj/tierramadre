import { useState, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { MediaType } from '../../types';
import { getVideoUrl, isVideoReference } from '../../utils/videoStorage';
import { createLogger } from '../../utils/logger';

const log = createLogger('MediaPreview');

interface MediaPreviewProps {
  mediaUrl: string;
  mediaType?: MediaType;
  thumbnailUrl?: string;
  alt?: string;
  maxWidth?: string | number;
  maxHeight?: string | number;
  style?: React.CSSProperties;
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
}

export default function MediaPreview({
  mediaUrl,
  mediaType = 'image',
  thumbnailUrl,
  alt = 'Preview',
  maxWidth = '100%',
  maxHeight = 280,
  style,
  controls = true,
  autoPlay = false,
  muted = true,
}: MediaPreviewProps) {
  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If it's a video reference (indexeddb://), load the video from IndexedDB
    if (mediaType === 'video' && isVideoReference(mediaUrl)) {
      setLoading(true);
      getVideoUrl(mediaUrl)
        .then((url) => {
          if (url) {
            setVideoObjectUrl(url);
          }
          setLoading(false);
        })
        .catch((error) => {
          log.error('Error loading video:', error);
          setLoading(false);
        });

      // Cleanup
      return () => {
        if (videoObjectUrl) {
          URL.revokeObjectURL(videoObjectUrl);
        }
      };
    }
  }, [mediaUrl, mediaType]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 200,
        }}
      >
        <CircularProgress size={40} aria-label="Cargando" />
      </Box>
    );
  }

  // Show video
  if (mediaType === 'video') {
    const videoSrc = videoObjectUrl || mediaUrl;

    return (
      <video
        src={`${videoSrc}#t=0.001`}
        controls={controls}
        autoPlay={autoPlay}
        muted={muted}
        playsInline
        poster={thumbnailUrl}
        style={{
          maxWidth,
          maxHeight,
          objectFit: 'contain',
          display: 'block',
          borderRadius: '8px',
          ...style,
        }}
      >
        Tu navegador no soporta el elemento de video.
      </video>
    );
  }

  // Show image
  return (
    <img
      src={mediaUrl}
      alt={alt}
      style={{
        maxWidth,
        maxHeight,
        objectFit: 'contain',
        display: 'block',
        ...style,
      }}
    />
  );
}
