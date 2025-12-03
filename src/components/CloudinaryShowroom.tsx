/**
 * CloudinaryShowroom - Fast Image-based PDF Viewer
 *
 * Uses Cloudinary's PDF-to-image transformation for blazing fast loading.
 * No PDF.js parsing required - pages served as optimized images.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Fade,
  alpha,
  CircularProgress,
  keyframes,
  Tooltip,
  Slider,
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
  Slideshow,
  PauseCircle,
  PlayCircle,
  ViewColumn,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Cloudinary config
const CLOUDINARY_CLOUD = 'dyam6g2os';
const CLOUDINARY_FOLDER = 'tierramadre/catalogs';

// Catalog configurations with page counts (from Cloudinary upload)
export const CLOUDINARY_CATALOGS: Record<string, { publicId: string; pages: number; name: string }> = {
  'acceso-total': { publicId: 'acceso-total', pages: 8, name: 'Acceso Total' },
  'vision-compartida': { publicId: 'vision-compartida', pages: 9, name: 'Visión Compartida' },
  'tierra-madre': { publicId: 'tierra-madre', pages: 12, name: 'Tierra Madre' },
  'exportadores': { publicId: 'exportadores', pages: 23, name: 'Exportadores' },
  'gifts': { publicId: 'gifts', pages: 13, name: 'Gifts' },
  'embajadores': { publicId: 'tierra-madre', pages: 12, name: 'Embajadores' }, // Uses same PDF as Tierra Madre
};

// Generate Cloudinary URL for a specific page
const getPageUrl = (publicId: string, page: number, width = 1200) => {
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/pg_${page},w_${width},q_auto,f_auto/${CLOUDINARY_FOLDER}/${publicId}.pdf`;
};

// Get thumbnail URL
const getThumbnailUrl = (publicId: string, page: number) => {
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/pg_${page},w_120,h_68,c_fill,q_auto,f_auto/${CLOUDINARY_FOLDER}/${publicId}.pdf`;
};

// Animations
const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
`;

// Styled Components
const Container = styled(Box)({
  position: 'fixed',
  inset: 0,
  backgroundColor: '#0a0a0a',
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
});

const Header = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  padding: theme.spacing(1.5, 2),
  paddingTop: 'max(12px, env(safe-area-inset-top))',
  background: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, transparent 100%)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  zIndex: 10,
  gap: theme.spacing(1),
}));

const ImageContainer = styled(Box)({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '70px 16px 120px',
  position: 'relative',
});

const PageImage = styled('img')({
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain',
  borderRadius: 8,
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  animation: `${fadeIn} 0.3s ease`,
});

const NavButton = styled(IconButton)({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  backgroundColor: alpha('#fff', 0.1),
  backdropFilter: 'blur(10px)',
  color: '#fff',
  width: 56,
  height: 56,
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: alpha('#fff', 0.2),
  },
  '&:disabled': {
    opacity: 0.3,
  },
});

const ControlButton = styled(IconButton)({
  color: '#fff',
  minWidth: 44,
  minHeight: 44,
  '&:hover': {
    backgroundColor: alpha('#fff', 0.1),
  },
});

const ThumbnailStrip = styled(Box)({
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  padding: '16px',
  paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
  background: 'linear-gradient(0deg, rgba(0,0,0,0.95) 0%, transparent 100%)',
  display: 'flex',
  justifyContent: 'center',
  gap: 8,
  overflowX: 'auto',
  scrollBehavior: 'smooth',
  '&::-webkit-scrollbar': { display: 'none' },
});

const Thumbnail = styled(Box)<{ active?: boolean }>(({ active, theme }) => ({
  width: 80,
  height: 45,
  borderRadius: 6,
  overflow: 'hidden',
  cursor: 'pointer',
  opacity: active ? 1 : 0.5,
  border: `2px solid ${active ? theme.palette.primary.main : 'transparent'}`,
  transition: 'all 0.2s ease',
  flexShrink: 0,
  '&:hover': {
    opacity: 1,
  },
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
}));

const ProgressBar = styled(Box)({
  position: 'absolute',
  bottom: 100,
  left: '50%',
  transform: 'translateX(-50%)',
  width: 'min(80%, 400px)',
  height: 3,
  backgroundColor: alpha('#fff', 0.1),
  borderRadius: 2,
});

const ProgressFill = styled(Box)(({ theme }) => ({
  height: '100%',
  backgroundColor: theme.palette.primary.main,
  borderRadius: 2,
  transition: 'width 0.3s ease',
}));

const GridContainer = styled(Box)({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: 16,
  padding: '80px 16px 16px',
  overflowY: 'auto',
  maxHeight: '100vh',
});

const GridItem = styled(Box)({
  cursor: 'pointer',
  borderRadius: 8,
  overflow: 'hidden',
  transition: 'transform 0.2s ease',
  '&:hover': {
    transform: 'scale(1.03)',
  },
  '& img': {
    width: '100%',
    height: 'auto',
    display: 'block',
  },
});

interface CloudinaryShowroomProps {
  open: boolean;
  onClose: () => void;
  catalogId: string;
  catalogName: string;
}

export const CloudinaryShowroom: React.FC<CloudinaryShowroomProps> = ({
  open,
  onClose,
  catalogId,
  catalogName,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'carousel' | 'grid' | 'spread'>('carousel');
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [autoPlaySpeed, setAutoPlaySpeed] = useState(5); // seconds per slide
  const [isLandscape, setIsLandscape] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbnailRef = useRef<HTMLDivElement>(null);
  const controlsTimer = useRef<NodeJS.Timeout>();
  const autoPlayTimer = useRef<NodeJS.Timeout>();

  // Get catalog config
  const catalog = CLOUDINARY_CATALOGS[catalogId];
  const numPages = catalog?.pages || 10;
  const publicId = catalog?.publicId || catalogId;

  // Touch handling for swipe
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Detect landscape orientation
  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Auto-play functionality
  useEffect(() => {
    if (isAutoPlaying && !isLoading) {
      autoPlayTimer.current = setTimeout(() => {
        if (currentPage < numPages) {
          setCurrentPage(p => p + 1);
          setIsLoading(true);
        } else {
          // Loop back to start
          setCurrentPage(1);
          setIsLoading(true);
        }
      }, autoPlaySpeed * 1000);
    }
    return () => {
      if (autoPlayTimer.current) clearTimeout(autoPlayTimer.current);
    };
  }, [isAutoPlaying, currentPage, numPages, autoPlaySpeed, isLoading]);

  useEffect(() => {
    if (open) {
      setCurrentPage(1);
      setViewMode('carousel');
      setShowControls(true);
      setIsLoading(true);
    }
  }, [open, catalogId]);

  // Scroll thumbnail into view
  useEffect(() => {
    if (thumbnailRef.current) {
      const thumb = thumbnailRef.current.children[currentPage - 1] as HTMLElement;
      thumb?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [currentPage]);

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && currentPage < numPages) setCurrentPage(p => p + 1);
      if (e.key === 'ArrowLeft' && currentPage > 1) setCurrentPage(p => p - 1);
      if (e.key === 'Escape') onClose();
      if (e.key === 'g') setViewMode(v => v === 'carousel' ? 'grid' : 'carousel');
      resetControlsTimer();
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, currentPage, numPages, onClose, resetControlsTimer]);

  // Swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50 && currentPage < numPages) {
      setCurrentPage(p => p + 1);
      setIsLoading(true);
    }
    if (distance < -50 && currentPage > 1) {
      setCurrentPage(p => p - 1);
      setIsLoading(true);
    }
    resetControlsTimer();
  };

  // Fullscreen
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (e) {
      console.error('Fullscreen error:', e);
    }
  };

  // Presentation mode (fullscreen + landscape + auto-hide controls)
  const enterPresentationMode = async () => {
    try {
      // Request fullscreen
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
      }
      // Try to lock to landscape on mobile
      if (screen.orientation && 'lock' in screen.orientation) {
        try {
          await (screen.orientation as any).lock('landscape');
        } catch (e) {
          // Orientation lock may not be supported
          console.log('Orientation lock not available');
        }
      }
      setIsPresentationMode(true);
      setShowControls(false);
      // Auto-hide controls after 2s in presentation mode
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
    } catch (e) {
      console.error('Presentation mode error:', e);
    }
  };

  const exitPresentationMode = async () => {
    setIsPresentationMode(false);
    setIsAutoPlaying(false);
    setShowControls(true);
    // Unlock orientation
    if (screen.orientation && 'unlock' in screen.orientation) {
      try {
        (screen.orientation as any).unlock();
      } catch (e) {
        // Ignore
      }
    }
    // Exit fullscreen if still in it
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Toggle auto-play
  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying);
  };

  // Download original PDF
  const handleDownload = () => {
    // For now, link to local PDF - can be updated to Cloudinary raw URL
    window.open(`/catalogs/${catalogName}.pdf`, '_blank');
  };

  // Cycle through view modes
  const cycleViewMode = () => {
    if (viewMode === 'carousel') {
      setViewMode(isLandscape ? 'spread' : 'grid');
    } else if (viewMode === 'spread') {
      setViewMode('grid');
    } else {
      setViewMode('carousel');
    }
  };

  if (!open) return null;

  return (
    <Container
      ref={containerRef}
      onMouseMove={resetControlsTimer}
      onClick={resetControlsTimer}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <Fade in={showControls}>
        <Header>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ControlButton onClick={onClose}>
              <Close />
            </ControlButton>
            <Box
              sx={{
                backgroundColor: alpha('#10b981', 0.25),
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
                {currentPage}
              </Typography>
              <Typography sx={{ color: alpha('#fff', 0.5), fontSize: '0.8rem' }}>/</Typography>
              <Typography sx={{ color: alpha('#fff', 0.7), fontSize: '0.85rem' }}>
                {numPages}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            {/* View mode toggle */}
            <Tooltip title={viewMode === 'carousel' ? 'Vista cuadrícula' : viewMode === 'spread' ? 'Vista cuadrícula' : 'Vista carrusel'}>
              <ControlButton onClick={cycleViewMode}>
                {viewMode === 'carousel' ? <GridView /> : viewMode === 'spread' ? <GridView /> : <ViewCarousel />}
              </ControlButton>
            </Tooltip>

            {/* Spread view (landscape only) */}
            {isLandscape && viewMode === 'carousel' && (
              <Tooltip title="Vista doble página">
                <ControlButton onClick={() => setViewMode('spread')}>
                  <ViewColumn />
                </ControlButton>
              </Tooltip>
            )}

            {/* Auto-play controls (only in presentation mode) */}
            {isPresentationMode && (
              <>
                <Tooltip title={isAutoPlaying ? 'Pausar' : 'Reproducir automático'}>
                  <ControlButton onClick={toggleAutoPlay}>
                    {isAutoPlaying ? <PauseCircle /> : <PlayCircle />}
                  </ControlButton>
                </Tooltip>
                {isAutoPlaying && (
                  <Box sx={{ width: 80, mx: 1 }}>
                    <Slider
                      value={autoPlaySpeed}
                      onChange={(_, v) => setAutoPlaySpeed(v as number)}
                      min={2}
                      max={15}
                      step={1}
                      size="small"
                      sx={{ color: '#fff' }}
                    />
                  </Box>
                )}
              </>
            )}

            <Tooltip title="Descargar PDF">
              <ControlButton onClick={handleDownload}>
                <Download />
              </ControlButton>
            </Tooltip>

            {/* Presentation mode toggle */}
            {!isPresentationMode ? (
              <Tooltip title="Modo presentación (pantalla completa horizontal)">
                <ControlButton onClick={enterPresentationMode}>
                  <Slideshow />
                </ControlButton>
              </Tooltip>
            ) : (
              <Tooltip title="Salir de presentación">
                <ControlButton onClick={exitPresentationMode}>
                  <Close />
                </ControlButton>
              </Tooltip>
            )}

            {/* Fullscreen toggle (only when not in presentation mode) */}
            {!isPresentationMode && (
              <Tooltip title={isFullscreen ? 'Salir pantalla completa' : 'Pantalla completa'}>
                <ControlButton onClick={toggleFullscreen}>
                  {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
                </ControlButton>
              </Tooltip>
            )}
          </Box>
        </Header>
      </Fade>

      {viewMode === 'spread' ? (
        /* Spread View - Two pages side by side for landscape */
        <ImageContainer sx={{ flexDirection: 'row', gap: 2, px: 4 }}>
          {isLoading && (
            <Box sx={{ position: 'absolute', zIndex: 5 }}>
              <CircularProgress color="primary" size={40} />
            </Box>
          )}

          {/* Left page */}
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <PageImage
              key={`${publicId}-${currentPage}-left`}
              src={getPageUrl(publicId, currentPage, 1000)}
              alt={`${catalogName} - Página ${currentPage}`}
              onLoad={() => setIsLoading(false)}
              style={{
                opacity: isLoading ? 0.3 : 1,
                maxHeight: '85vh',
                maxWidth: '48vw',
              }}
            />
          </Box>

          {/* Right page (if exists) */}
          {currentPage < numPages && (
            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
              <PageImage
                key={`${publicId}-${currentPage + 1}-right`}
                src={getPageUrl(publicId, currentPage + 1, 1000)}
                alt={`${catalogName} - Página ${currentPage + 1}`}
                style={{
                  maxHeight: '85vh',
                  maxWidth: '48vw',
                }}
              />
            </Box>
          )}

          {/* Navigation for spread view - skip 2 pages at a time */}
          <Fade in={showControls && currentPage > 1}>
            <NavButton
              onClick={() => {
                setCurrentPage(p => Math.max(1, p - 2));
                setIsLoading(true);
              }}
              disabled={currentPage === 1}
              sx={{ left: 16 }}
            >
              <ChevronLeft sx={{ fontSize: 32 }} />
            </NavButton>
          </Fade>

          <Fade in={showControls && currentPage < numPages - 1}>
            <NavButton
              onClick={() => {
                setCurrentPage(p => Math.min(numPages, p + 2));
                setIsLoading(true);
              }}
              disabled={currentPage >= numPages - 1}
              sx={{ right: 16 }}
            >
              <ChevronRight sx={{ fontSize: 32 }} />
            </NavButton>
          </Fade>

          {/* Progress bar */}
          <Fade in={showControls}>
            <ProgressBar>
              <ProgressFill sx={{ width: `${(currentPage / numPages) * 100}%` }} />
            </ProgressBar>
          </Fade>
        </ImageContainer>
      ) : viewMode === 'carousel' ? (
        <ImageContainer>
          {/* Loading indicator */}
          {isLoading && (
            <Box sx={{ position: 'absolute', zIndex: 5 }}>
              <CircularProgress color="primary" size={40} />
            </Box>
          )}

          {/* Main page image */}
          <PageImage
            key={`${publicId}-${currentPage}`}
            src={getPageUrl(publicId, currentPage)}
            alt={`${catalogName} - Página ${currentPage}`}
            onLoad={() => setIsLoading(false)}
            style={{ opacity: isLoading ? 0.3 : 1 }}
          />

          {/* Navigation buttons */}
          <Fade in={showControls && currentPage > 1}>
            <NavButton
              onClick={() => { setCurrentPage(p => p - 1); setIsLoading(true); }}
              disabled={currentPage === 1}
              sx={{ left: 16 }}
            >
              <ChevronLeft sx={{ fontSize: 32 }} />
            </NavButton>
          </Fade>

          <Fade in={showControls && currentPage < numPages}>
            <NavButton
              onClick={() => { setCurrentPage(p => p + 1); setIsLoading(true); }}
              disabled={currentPage === numPages}
              sx={{ right: 16 }}
            >
              <ChevronRight sx={{ fontSize: 32 }} />
            </NavButton>
          </Fade>

          {/* Thumbnail strip */}
          <Fade in={showControls}>
            <ThumbnailStrip ref={thumbnailRef}>
              {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
                <Thumbnail
                  key={page}
                  active={page === currentPage}
                  onClick={() => { setCurrentPage(page); setIsLoading(true); }}
                >
                  <img
                    src={getThumbnailUrl(publicId, page)}
                    alt={`Página ${page}`}
                    loading="lazy"
                  />
                </Thumbnail>
              ))}
            </ThumbnailStrip>
          </Fade>

          {/* Progress bar */}
          <Fade in={showControls}>
            <ProgressBar>
              <ProgressFill sx={{ width: `${(currentPage / numPages) * 100}%` }} />
            </ProgressBar>
          </Fade>
        </ImageContainer>
      ) : (
        /* Grid View */
        <GridContainer>
          {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
            <GridItem
              key={page}
              onClick={() => {
                setCurrentPage(page);
                setViewMode('carousel');
                setIsLoading(true);
              }}
            >
              <img
                src={getPageUrl(publicId, page, 400)}
                alt={`Página ${page}`}
                loading="lazy"
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  p: 1,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                }}
              >
                <Typography sx={{ color: '#fff', fontSize: '0.75rem', fontWeight: 500 }}>
                  Página {page}
                </Typography>
              </Box>
            </GridItem>
          ))}
        </GridContainer>
      )}
    </Container>
  );
};

export default CloudinaryShowroom;
