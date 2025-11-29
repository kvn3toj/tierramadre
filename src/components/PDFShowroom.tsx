/**
 * PDFShowroom - Immersive PDF catalog viewer
 * Displays PDF catalogs with page navigation
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
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
  GridView,
  ViewCarousel,
  Download,
  ZoomIn,
  ZoomOut,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { CATALOG_CATEGORIES, type CategoryKey } from '../styles/catalogTokens';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

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

const PDFContainer = styled(Box)(() => ({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  overflow: 'auto',
  padding: '80px 24px 120px',
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
  zIndex: 5,
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

const ThumbnailBox = styled(Box)<{ active?: boolean }>(({ active, theme }) => ({
  width: 60,
  height: 80,
  borderRadius: 4,
  cursor: 'pointer',
  opacity: active ? 1 : 0.5,
  border: active ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
  transition: 'all 0.2s ease',
  overflow: 'hidden',
  backgroundColor: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
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
  backgroundColor: '#fff',
  transition: 'transform 0.3s ease',
  '&:hover': {
    transform: 'scale(1.03)',
  },
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
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [viewMode, setViewMode] = useState<'carousel' | 'grid'>('carousel');
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);

  const category = CATALOG_CATEGORIES[catalogId];

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setCurrentPage(1);
      setScale(1.0);
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
        case '+':
        case '=':
          setScale(s => Math.min(s + 0.2, 3));
          break;
        case '-':
          setScale(s => Math.max(s - 0.2, 0.5));
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
  };

  const handleNext = () => {
    if (currentPage < numPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${catalogName}.pdf`;
    link.click();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
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
                Página {currentPage} de {numPages}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              onClick={() => setScale(s => Math.max(s - 0.2, 0.5))}
              sx={{ color: '#fff' }}
              title="Zoom out (-)"
            >
              <ZoomOut />
            </IconButton>
            <Typography sx={{ color: '#fff', alignSelf: 'center', minWidth: 50, textAlign: 'center' }}>
              {Math.round(scale * 100)}%
            </Typography>
            <IconButton
              onClick={() => setScale(s => Math.min(s + 0.2, 3))}
              sx={{ color: '#fff' }}
              title="Zoom in (+)"
            >
              <ZoomIn />
            </IconButton>
            <IconButton
              onClick={() => setViewMode(v => v === 'carousel' ? 'grid' : 'carousel')}
              sx={{ color: '#fff' }}
              title={viewMode === 'carousel' ? 'Ver cuadrícula (G)' : 'Ver páginas (G)'}
            >
              {viewMode === 'carousel' ? <GridView /> : <ViewCarousel />}
            </IconButton>
            <IconButton
              onClick={handleDownload}
              sx={{ color: '#fff' }}
              title="Descargar PDF"
            >
              <Download />
            </IconButton>
            <IconButton
              onClick={toggleFullscreen}
              sx={{ color: '#fff' }}
              title="Pantalla completa"
            >
              <Fullscreen />
            </IconButton>
          </Box>
        </Header>
      </Fade>

      <Document
        file={pdfUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress color="primary" />
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
                sx={{ left: 24 }}
              >
                <ChevronLeft fontSize="large" />
              </NavButton>
            </Fade>

            {/* Current Page */}
            <Box
              sx={{
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Box>

            {/* Next Button */}
            <Fade in={showControls && currentPage < numPages}>
              <NavButton
                onClick={handleNext}
                disabled={currentPage === numPages}
                sx={{ right: 24 }}
              >
                <ChevronRight fontSize="large" />
              </NavButton>
            </Fade>

            {/* Thumbnail Strip */}
            <Fade in={showControls}>
              <ThumbnailStrip>
                {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                  <ThumbnailBox
                    key={pageNum}
                    active={pageNum === currentPage}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    <Page
                      pageNumber={pageNum}
                      width={56}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </ThumbnailBox>
                ))}
              </ThumbnailStrip>
            </Fade>

            {/* Progress bar */}
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
                  width: `${(currentPage / numPages) * 100}%`,
                  transition: 'width 0.3s ease',
                }}
              />
            </Box>
          </PDFContainer>
        ) : (
          /* Grid View */
          <GridContainer>
            {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
              <GridItem
                key={pageNum}
                onClick={() => {
                  setCurrentPage(pageNum);
                  setViewMode('carousel');
                }}
              >
                <Page
                  pageNumber={pageNum}
                  width={200}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
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
                    {pageNum}
                  </Typography>
                </Box>
              </GridItem>
            ))}
          </GridContainer>
        )}
      </Document>
    </ShowroomContainer>
  );
};

export default PDFShowroom;
