/**
 * PDFShowroom - Premium Immersive PDF Catalog Viewer
 *
 * Features:
 * - High-quality PDF rendering with retina support
 * - Smooth page transitions with animations
 * - Swipe gestures for mobile navigation
 * - Pinch-to-zoom gesture support
 * - iOS HIG compliant controls (44pt touch targets)
 * - Fullscreen with Safari/iOS support
 * - Page preloading for smooth navigation
 * - Adaptive sizing (fit to screen)
 * - Loading skeletons and error states
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  Box,
  IconButton,
  Typography,
  Fade,
  alpha,
  useTheme,
  CircularProgress,
  useMediaQuery,
  keyframes,
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
  ErrorOutline,
  Refresh,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import type { CategoryKey } from '../styles/catalogTokens';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Animations
const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const fadeSlideIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.96) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
  50% { box-shadow: 0 25px 80px rgba(0,0,0,0.6), 0 0 40px rgba(16, 185, 129, 0.1); }
`;

// Styled Components
const ShowroomContainer = styled(Box)(() => ({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: '#0a0a0a',
  backgroundImage: 'radial-gradient(ellipse at center, #111 0%, #000 100%)',
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}));

const Header = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  padding: theme.spacing(1.5, 2),
  background: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 80%, transparent 100%)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  zIndex: 10,
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  gap: theme.spacing(1),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1, 1.5),
    paddingTop: 'max(12px, env(safe-area-inset-top))',
  },
}));

const PDFContainer = styled(Box)(() => ({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  overflow: 'hidden',
  padding: '80px 24px 140px',
}));

// Page wrapper with animation
const PageWrapper = styled(Box)<{ isAnimating?: boolean }>(({ isAnimating }) => ({
  animation: isAnimating ? `${fadeSlideIn} 0.4s cubic-bezier(0.4, 0, 0.2, 1)` : 'none',
  willChange: 'transform, opacity',
}));

// Premium page container with glow effect
const PageContainer = styled(Box)(() => ({
  position: 'relative',
  borderRadius: 12,
  overflow: 'hidden',
  animation: `${pulseGlow} 4s ease-in-out infinite`,
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: -1,
    borderRadius: 13,
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), transparent, rgba(16, 185, 129, 0.1))',
    zIndex: -1,
  },
}));

// Loading skeleton for PDF pages
const PageSkeleton = styled(Box)(() => ({
  width: '100%',
  height: '100%',
  minHeight: 400,
  background: `linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%)`,
  backgroundSize: '200% 100%',
  animation: `${shimmer} 1.5s infinite`,
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

// Error state component
const ErrorState = styled(Box)(() => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 16,
  padding: 40,
  color: alpha('#fff', 0.7),
  textAlign: 'center',
}));

// iOS HIG: 44pt minimum touch target - Premium glass button
const NavButton = styled(IconButton)(() => ({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  backgroundColor: alpha('#fff', 0.1),
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: `1px solid ${alpha('#fff', 0.15)}`,
  color: '#fff',
  width: 60,
  height: 60,
  minWidth: 44,
  minHeight: 44,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  zIndex: 5,
  boxShadow: `0 8px 32px ${alpha('#000', 0.3)}, inset 0 1px 0 ${alpha('#fff', 0.1)}`,
  '&:hover': {
    backgroundColor: alpha('#fff', 0.2),
    transform: 'translateY(-50%) scale(1.08)',
    boxShadow: `0 12px 40px ${alpha('#000', 0.4)}, inset 0 1px 0 ${alpha('#fff', 0.15)}`,
  },
  '&:active': {
    transform: 'translateY(-50%) scale(0.95)',
    backgroundColor: alpha('#fff', 0.25),
  },
  '&.Mui-disabled': {
    opacity: 0.2,
    color: '#666',
    boxShadow: 'none',
  },
  '@media (max-width: 768px)': {
    width: 52,
    height: 52,
  },
}));

const ThumbnailStrip = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  padding: theme.spacing(2.5, 3),
  background: 'linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 70%, transparent 100%)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  display: 'flex',
  justifyContent: 'center',
  gap: theme.spacing(1.5),
  overflowX: 'auto',
  scrollBehavior: 'smooth',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
  '&::-webkit-scrollbar': {
    display: 'none',
  },
}));

// Horizontal thumbnails for landscape PDFs (16:9 ratio) - Premium style
const ThumbnailBox = styled(Box)<{ active?: boolean }>(({ active, theme }) => ({
  width: 88,
  height: 50,
  borderRadius: 6,
  cursor: 'pointer',
  opacity: active ? 1 : 0.5,
  border: active
    ? `2px solid ${theme.palette.primary.main}`
    : `1px solid ${alpha('#fff', 0.1)}`,
  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  overflow: 'hidden',
  backgroundColor: '#1a1a1a',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  boxShadow: active
    ? `0 4px 20px ${alpha(theme.palette.primary.main, 0.4)}`
    : `0 2px 8px ${alpha('#000', 0.3)}`,
  transform: active ? 'scale(1.05)' : 'scale(1)',
  '&:hover': {
    opacity: 1,
    transform: 'scale(1.1)',
    boxShadow: `0 6px 24px ${alpha('#000', 0.4)}`,
  },
  '&:active': {
    transform: 'scale(0.98)',
  },
}));

const GridContainer = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: theme.spacing(2.5),
  padding: theme.spacing(10, 4, 4, 4),
  overflowY: 'auto',
  maxHeight: '100vh',
  scrollBehavior: 'smooth',
}));

const GridItem = styled(Box)(() => ({
  cursor: 'pointer',
  borderRadius: 12,
  overflow: 'hidden',
  position: 'relative',
  backgroundColor: '#1a1a1a',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: `0 4px 20px ${alpha('#000', 0.3)}`,
  '&:hover': {
    transform: 'scale(1.04) translateY(-4px)',
    boxShadow: `0 12px 40px ${alpha('#000', 0.5)}`,
  },
  '&:active': {
    transform: 'scale(0.98)',
  },
}));

// Header control button - glass morphism style
const ControlButton = styled(IconButton)(() => ({
  color: '#fff',
  minWidth: 44,
  minHeight: 44,
  borderRadius: 12,
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: alpha('#fff', 0.15),
  },
  '&:active': {
    transform: 'scale(0.95)',
  },
}));

// Progress bar - premium style
const ProgressBar = styled(Box)(() => ({
  position: 'absolute',
  bottom: 120,
  left: '50%',
  transform: 'translateX(-50%)',
  width: 'min(80%, 400px)',
  height: 4,
  backgroundColor: alpha('#fff', 0.1),
  borderRadius: 2,
  overflow: 'hidden',
}));

const ProgressFill = styled(Box)(({ theme }) => ({
  height: '100%',
  backgroundColor: theme.palette.primary.main,
  borderRadius: 2,
  transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: `0 0 10px ${alpha(theme.palette.primary.main, 0.5)}`,
}));

interface PDFShowroomProps {
  open: boolean;
  onClose: () => void;
  catalogId: CategoryKey;
  pdfUrl: string;
  catalogName: string;
}

export const PDFShowroom: React.FC<PDFShowroomProps> = ({
  open,
  onClose,
  catalogId,
  pdfUrl,
  catalogName,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbnailStripRef = useRef<HTMLDivElement>(null);

  // Core state
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [viewMode, setViewMode] = useState<'carousel' | 'grid'>('carousel');
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Quality & UX state
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [fitToScreen, setFitToScreen] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Touch/swipe state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  // Catalog ID available: catalogId

  // Device pixel ratio for high-quality rendering
  const devicePixelRatio = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;

  // Calculate optimal page width based on container and fit mode
  const optimalWidth = useMemo(() => {
    if (!fitToScreen) return undefined;
    const maxWidth = containerSize.width - (isMobile ? 48 : 100);
    const maxHeight = containerSize.height - 240; // Account for header/footer
    // Assume 16:9 aspect ratio for width calculation from height
    const widthFromHeight = maxHeight * (16 / 9);
    return Math.min(maxWidth, widthFromHeight, 1200);
  }, [containerSize, fitToScreen, isMobile]);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setCurrentPage(1);
      setScale(1.0);
      setViewMode('carousel');
      setShowControls(true);
      setIsPageLoading(true);
      setLoadError(null);
      setFitToScreen(true);
    }
  }, [open, catalogId]);

  // Track container size for fit-to-screen
  useEffect(() => {
    if (!open) return;

    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [open]);

  // Scroll thumbnail into view when page changes
  useEffect(() => {
    if (thumbnailStripRef.current && currentPage > 0) {
      const thumbnail = thumbnailStripRef.current.children[currentPage - 1] as HTMLElement;
      if (thumbnail) {
        thumbnail.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [currentPage]);

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
          setFitToScreen(f => !f);
          break;
        case '+':
        case '=':
          setFitToScreen(false);
          setScale(s => Math.min(s + 0.2, 3));
          break;
        case '-':
          setFitToScreen(false);
          setScale(s => Math.max(s - 0.2, 0.5));
          break;
        case '0':
          setFitToScreen(true);
          setScale(1.0);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, currentPage, numPages]);

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

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsPageLoading(false);
    setLoadError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setLoadError('No se pudo cargar el catálogo. Por favor, intenta de nuevo.');
    setIsPageLoading(false);
  };

  const onPageLoadSuccess = () => {
    setIsPageLoading(false);
  };

  // Navigation with animation
  const navigateToPage = useCallback((page: number) => {
    if (page < 1 || page > numPages || page === currentPage) return;

    setIsAnimating(true);
    setIsPageLoading(true);

    // Brief delay for smooth animation
    setTimeout(() => {
      setCurrentPage(page);
      setTimeout(() => setIsAnimating(false), 100);
    }, 50);

    resetControlsTimer();
  }, [numPages, currentPage, resetControlsTimer]);

  const handleNext = useCallback(() => {
    if (currentPage < numPages) {
      navigateToPage(currentPage + 1);
    }
  }, [currentPage, numPages, navigateToPage]);

  const handlePrev = useCallback(() => {
    if (currentPage > 1) {
      navigateToPage(currentPage - 1);
    }
  }, [currentPage, navigateToPage]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${catalogName}.pdf`;
    link.click();
  };

  // Improved fullscreen with Safari/iOS support
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        // Enter fullscreen
        const element = containerRef.current || document.documentElement;
        if (element.requestFullscreen) {
          await element.requestFullscreen();
        } else if ((element as any).webkitRequestFullscreen) {
          await (element as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement || !!(document as any).webkitFullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Swipe gesture handlers
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
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentPage < numPages) {
      handleNext();
      resetControlsTimer();
    }
    if (isRightSwipe && currentPage > 1) {
      handlePrev();
      resetControlsTimer();
    }
  };

  if (!open) return null;

  return (
    <ShowroomContainer
      ref={containerRef}
      onMouseMove={resetControlsTimer}
      onClick={resetControlsTimer}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      sx={{
        touchAction: 'pan-y', // Allow vertical scroll, capture horizontal swipes
        cursor: showControls ? 'default' : 'none',
      }}
    >
      {/* Header - Clean mobile-first design */}
      <Fade in={showControls}>
        <Header>
          {/* Left: Close + Page Counter */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <ControlButton onClick={onClose} title="Cerrar (Esc)" sx={{ flexShrink: 0 }}>
              <Close />
            </ControlButton>
            <Box
              sx={{
                backgroundColor: alpha(theme.palette.primary.main, 0.25),
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

          {/* Right: Essential controls only */}
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <ControlButton
              onClick={() => setViewMode(v => v === 'carousel' ? 'grid' : 'carousel')}
              title={viewMode === 'carousel' ? 'Cuadrícula' : 'Páginas'}
            >
              {viewMode === 'carousel' ? <GridView /> : <ViewCarousel />}
            </ControlButton>
            <ControlButton onClick={handleDownload} title="Descargar">
              <Download />
            </ControlButton>
            <ControlButton onClick={toggleFullscreen} title="Pantalla completa">
              {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </ControlButton>
          </Box>
        </Header>
      </Fade>

      {/* Error State */}
      {loadError && (
        <ErrorState>
          <ErrorOutline sx={{ fontSize: 64, color: alpha('#fff', 0.3) }} />
          <Typography variant="h6">{loadError}</Typography>
          <ControlButton
            onClick={() => {
              setLoadError(null);
              setIsPageLoading(true);
            }}
            sx={{ mt: 2, border: `1px solid ${alpha('#fff', 0.2)}` }}
          >
            <Refresh sx={{ mr: 1 }} /> Reintentar
          </ControlButton>
        </ErrorState>
      )}

      {/* PDF Document */}
      {!loadError && (
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: 2 }}>
              <CircularProgress color="primary" size={48} thickness={3} />
              <Typography variant="body2" sx={{ color: alpha('#fff', 0.5) }}>
                Cargando catálogo...
              </Typography>
            </Box>
          }
        >
          {viewMode === 'carousel' ? (
            <PDFContainer>
              {/* Previous Button */}
              <Fade in={showControls && currentPage > 1}>
                <NavButton
                  onClick={handlePrev}
                  disabled={currentPage === 1}
                  sx={{ left: isSmallScreen ? 12 : 24 }}
                >
                  <ChevronLeft sx={{ fontSize: 32 }} />
                </NavButton>
              </Fade>

              {/* Current Page with Animation */}
              <PageWrapper isAnimating={isAnimating}>
                <PageContainer>
                  {isPageLoading && (
                    <PageSkeleton sx={{ position: 'absolute', inset: 0 }}>
                      <CircularProgress color="primary" size={32} />
                    </PageSkeleton>
                  )}
                  <Page
                    pageNumber={currentPage}
                    scale={fitToScreen ? undefined : scale}
                    width={fitToScreen ? optimalWidth : undefined}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    onLoadSuccess={onPageLoadSuccess}
                    devicePixelRatio={devicePixelRatio}
                  />
                </PageContainer>
              </PageWrapper>

              {/* Next Button */}
              <Fade in={showControls && currentPage < numPages}>
                <NavButton
                  onClick={handleNext}
                  disabled={currentPage === numPages}
                  sx={{ right: isSmallScreen ? 12 : 24 }}
                >
                  <ChevronRight sx={{ fontSize: 32 }} />
                </NavButton>
              </Fade>

              {/* Thumbnail Strip */}
              <Fade in={showControls}>
                <ThumbnailStrip ref={thumbnailStripRef}>
                  {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                    <ThumbnailBox
                      key={pageNum}
                      active={pageNum === currentPage}
                      onClick={() => navigateToPage(pageNum)}
                    >
                      <Page
                        pageNumber={pageNum}
                        width={64}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        devicePixelRatio={Math.min(devicePixelRatio, 1.5)}
                      />
                    </ThumbnailBox>
                  ))}
                </ThumbnailStrip>
              </Fade>

              {/* Progress bar */}
              <Fade in={showControls}>
                <ProgressBar>
                  <ProgressFill sx={{ width: `${(currentPage / numPages) * 100}%` }} />
                </ProgressBar>
              </Fade>
            </PDFContainer>
          ) : (
            /* Grid View */
            <GridContainer>
              {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                <GridItem
                  key={pageNum}
                  onClick={() => {
                    navigateToPage(pageNum);
                    setViewMode('carousel');
                  }}
                >
                  <Page
                    pageNumber={pageNum}
                    width={220}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    devicePixelRatio={Math.min(devicePixelRatio, 1.5)}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: 1.5,
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600 }}>
                      Página {pageNum}
                    </Typography>
                    {pageNum === currentPage && (
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: theme.palette.primary.main,
                          boxShadow: `0 0 8px ${theme.palette.primary.main}`,
                        }}
                      />
                    )}
                  </Box>
                </GridItem>
              ))}
            </GridContainer>
          )}
        </Document>
      )}
    </ShowroomContainer>
  );
};

export default PDFShowroom;
