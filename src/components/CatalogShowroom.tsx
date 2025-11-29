/**
 * CatalogShowroom - Immersive catalog viewer
 * Displays catalog media in a beautiful full-screen showroom experience
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Fade,
  alpha,
  useTheme,
  CircularProgress,
} from '@mui/material';
import {
  Close,
  ChevronLeft,
  ChevronRight,
  Fullscreen,
  FullscreenExit,
  GridView,
  ViewCarousel,
  Download,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { CATALOG_CATEGORIES, type CategoryKey } from '../styles/catalogTokens';

// Styled Components
const ShowroomContainer = styled(Box)(() => ({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: '#000',
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
}));

const Header = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  padding: theme.spacing(2),
  background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  zIndex: 10,
  transition: 'opacity 0.3s ease',
}));

const ImageContainer = styled(Box)(() => ({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  overflow: 'hidden',
}));

const MainImage = styled('img')(() => ({
  maxWidth: '90%',
  maxHeight: '85vh',
  objectFit: 'contain',
  borderRadius: 8,
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  transition: 'transform 0.3s ease, opacity 0.3s ease',
}));

const NavButton = styled(IconButton)(() => ({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  backgroundColor: alpha('#fff', 0.1),
  backdropFilter: 'blur(10px)',
  color: '#fff',
  width: 56,
  height: 56,
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: alpha('#fff', 0.2),
    transform: 'translateY(-50%) scale(1.1)',
  },
  '&.Mui-disabled': {
    opacity: 0.3,
    color: '#666',
  },
}));

const ThumbnailStrip = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  padding: theme.spacing(2),
  background: 'linear-gradient(0deg, rgba(0,0,0,0.9) 0%, transparent 100%)',
  display: 'flex',
  justifyContent: 'center',
  gap: theme.spacing(1),
  overflowX: 'auto',
  '&::-webkit-scrollbar': {
    height: 4,
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: alpha('#fff', 0.3),
    borderRadius: 2,
  },
}));

const Thumbnail = styled('img')<{ active?: boolean }>(({ active, theme }) => ({
  width: 80,
  height: 50,
  objectFit: 'cover',
  borderRadius: 4,
  cursor: 'pointer',
  opacity: active ? 1 : 0.5,
  border: active ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
  transition: 'all 0.2s ease',
  '&:hover': {
    opacity: 1,
    transform: 'scale(1.05)',
  },
}));

const GridContainer = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: theme.spacing(2),
  padding: theme.spacing(10, 4, 4, 4),
  overflowY: 'auto',
  maxHeight: '100vh',
}));

const GridItem = styled(Box)(() => ({
  cursor: 'pointer',
  borderRadius: 8,
  overflow: 'hidden',
  position: 'relative',
  aspectRatio: '16/10',
  transition: 'transform 0.3s ease',
  '&:hover': {
    transform: 'scale(1.05)',
    '& img': {
      filter: 'brightness(1.1)',
    },
  },
}));

interface CatalogShowroomProps {
  open: boolean;
  onClose: () => void;
  catalogId: CategoryKey;
  images: string[];
  catalogName: string;
}

export const CatalogShowroom: React.FC<CatalogShowroomProps> = ({
  open,
  onClose,
  catalogId,
  images,
  catalogName,
}) => {
  const theme = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'carousel' | 'grid'>('carousel');
  const [showControls, setShowControls] = useState(true);
  const [imageLoading, setImageLoading] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);

  const category = CATALOG_CATEGORIES[catalogId];

  // Reset state when opening a new catalog
  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      setImageLoading(true);
      setViewMode('carousel');
      setShowControls(true);
    }
  }, [open, catalogId]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      switch (e.key) {
        case 'ArrowLeft':
          handlePrev();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case 'Escape':
          onClose();
          break;
        case 'g':
          setViewMode(v => v === 'carousel' ? 'grid' : 'carousel');
          break;
        case 'f':
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, currentIndex, images.length]);

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeout) clearTimeout(controlsTimeout);
    const timeout = setTimeout(() => setShowControls(false), 3000);
    setControlsTimeout(timeout);
  }, [controlsTimeout]);

  useEffect(() => {
    return () => {
      if (controlsTimeout) clearTimeout(controlsTimeout);
    };
  }, [controlsTimeout]);

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setImageLoading(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setImageLoading(true);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = images[currentIndex];
    link.download = `${catalogName}-${currentIndex + 1}.jpg`;
    link.click();
  };

  if (!open) return null;

  return (
    <ShowroomContainer
      onMouseMove={resetControlsTimer}
      onClick={resetControlsTimer}
    >
      {/* Header */}
      <Fade in={showControls}>
        <Header>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={onClose} sx={{ color: '#fff' }}>
              <Close />
            </IconButton>
            <Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                {category?.icon} {catalogName}
              </Typography>
              <Typography variant="caption" sx={{ color: alpha('#fff', 0.7) }}>
                {currentIndex + 1} de {images.length} imágenes
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              onClick={() => setViewMode(v => v === 'carousel' ? 'grid' : 'carousel')}
              sx={{ color: '#fff' }}
              title={viewMode === 'carousel' ? 'Ver cuadrícula (G)' : 'Ver carrusel (G)'}
            >
              {viewMode === 'carousel' ? <GridView /> : <ViewCarousel />}
            </IconButton>
            <IconButton
              onClick={handleDownload}
              sx={{ color: '#fff' }}
              title="Descargar imagen"
            >
              <Download />
            </IconButton>
            <IconButton
              onClick={toggleFullscreen}
              sx={{ color: '#fff' }}
              title="Pantalla completa (F)"
            >
              {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
          </Box>
        </Header>
      </Fade>

      {viewMode === 'carousel' ? (
        <>
          {/* Main Image */}
          <ImageContainer>
            {/* Previous Button */}
            <Fade in={showControls && currentIndex > 0}>
              <NavButton
                onClick={handlePrev}
                disabled={currentIndex === 0}
                sx={{ left: 24 }}
              >
                <ChevronLeft fontSize="large" />
              </NavButton>
            </Fade>

            {/* Image */}
            <Box sx={{ position: 'relative' }}>
              {imageLoading && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <CircularProgress color="primary" />
                </Box>
              )}
              <MainImage
                src={images[currentIndex]}
                alt={`${catalogName} - Slide ${currentIndex + 1}`}
                onLoad={() => setImageLoading(false)}
                style={{
                  opacity: imageLoading ? 0 : 1,
                }}
              />
            </Box>

            {/* Next Button */}
            <Fade in={showControls && currentIndex < images.length - 1}>
              <NavButton
                onClick={handleNext}
                disabled={currentIndex === images.length - 1}
                sx={{ right: 24 }}
              >
                <ChevronRight fontSize="large" />
              </NavButton>
            </Fade>
          </ImageContainer>

          {/* Thumbnail Strip */}
          <Fade in={showControls}>
            <ThumbnailStrip>
              {images.map((img, idx) => (
                <Thumbnail
                  key={idx}
                  src={img}
                  active={idx === currentIndex}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setImageLoading(true);
                  }}
                  alt={`Thumbnail ${idx + 1}`}
                />
              ))}
            </ThumbnailStrip>
          </Fade>

          {/* Progress indicator */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 100,
              left: 0,
              right: 0,
              height: 3,
              backgroundColor: alpha('#fff', 0.1),
            }}
          >
            <Box
              sx={{
                height: '100%',
                backgroundColor: theme.palette.primary.main,
                width: `${((currentIndex + 1) / images.length) * 100}%`,
                transition: 'width 0.3s ease',
              }}
            />
          </Box>
        </>
      ) : (
        /* Grid View */
        <GridContainer>
          {images.map((img, idx) => (
            <GridItem
              key={idx}
              onClick={() => {
                setCurrentIndex(idx);
                setViewMode('carousel');
              }}
            >
              <img
                src={img}
                alt={`${catalogName} - ${idx + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: 1,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                }}
              >
                <Typography variant="caption" sx={{ color: '#fff' }}>
                  {idx + 1}
                </Typography>
              </Box>
            </GridItem>
          ))}
        </GridContainer>
      )}
    </ShowroomContainer>
  );
};

export default CatalogShowroom;
