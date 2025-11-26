import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  ButtonGroup,
  CircularProgress,
  Alert,
  Tooltip,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import {
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Fullscreen as FullscreenIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Visibility as ViewIcon,
  Add as CreateIcon,
  AutoAwesome as GenerateIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
} from '@mui/icons-material';
import { SLIDE_WIDTH, SLIDE_HEIGHT } from './Slide2Purpose';
import SlideEditor from './SlideEditor';
import PresentationGenerator from './PresentationGenerator';
import { generateSlidePDF, generateMultiSlidePDF } from '../../utils/slidePdfGenerator';
import { colors } from '../brand';

// Legacy imports (kept for reference)
// import { MissionTemplate, OpportunityTemplate, ... } from '../templates/MasterclassTemplates';

// Import Luxury Masterclass Templates v2 (optimized for PDF export)
import {
  LuxuryCoverTemplate,
  LuxuryMissionTemplate,
  LuxuryWorldTourTemplate,
  LuxuryFiveReasonsTemplate,
  LuxuryOpportunityTemplate,
  LuxuryExpertTemplate,
  LuxuryDifferentiatorsTemplate,
  LuxuryCollectionTemplate,
  LuxuryThankYouTemplate,
} from '../templates/LuxuryMasterclassTemplates';

// Masterclass slide definitions - Luxury v2 (PDF optimized)
const MASTERCLASS_SLIDES = [
  { id: 'cover', name: '1. Portada', icon: '💎', component: LuxuryCoverTemplate },
  { id: 'mission', name: '2. Nuestra Esencia', icon: '✨', component: LuxuryMissionTemplate },
  { id: 'worldTour', name: '3. Recorriendo el Mundo', icon: '🌍', component: LuxuryWorldTourTemplate },
  { id: 'fiveReasons', name: '4. 5 Razones', icon: '📋', component: LuxuryFiveReasonsTemplate },
  { id: 'opportunity', name: '5. Oportunidad Diciembre', icon: '🎄', component: LuxuryOpportunityTemplate },
  { id: 'expert', name: '6. Presentación Experto', icon: '👤', component: LuxuryExpertTemplate },
  { id: 'differentiators', name: '7. Diferenciadores', icon: '⚡', component: LuxuryDifferentiatorsTemplate },
  { id: 'collection', name: '8. Colección Fénix', icon: '🔥', component: LuxuryCollectionTemplate },
  { id: 'thankYou', name: '9. Gracias', icon: '🌿', component: LuxuryThankYouTemplate },
] as const;

type ExportFormat = 'pdf' | 'png' | 'jpg';
type TabMode = 'preview' | 'generate' | 'create';

export default function SlidePreview() {
  const [tabMode, setTabMode] = useState<TabMode>('preview');
  const [exporting, setExporting] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.35); // Default zoom to fit typical screens
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [renderAllSlides, setRenderAllSlides] = useState(false);

  const currentSlide = MASTERCLASS_SLIDES[currentSlideIndex];
  const SlideComponent = currentSlide.component;

  const handlePrevSlide = () => {
    setCurrentSlideIndex(prev => prev > 0 ? prev - 1 : MASTERCLASS_SLIDES.length - 1);
  };

  const handleNextSlide = () => {
    setCurrentSlideIndex(prev => prev < MASTERCLASS_SLIDES.length - 1 ? prev + 1 : 0);
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);

    try {
      const slideId = `slide-${currentSlide.id}`;
      await generateSlidePDF(slideId, {
        filename: `tierra-madre-${currentSlide.id}`,
        format: exportFormat,
        quality: 1.0,
        scale: 2,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al exportar la diapositiva');
    }

    setExporting(false);
  };

  const handleExportAll = async () => {
    setExportingAll(true);
    setRenderAllSlides(true);
    setError(null);

    // Wait for all slides to render
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const slideIds = MASTERCLASS_SLIDES.map(slide => `slide-export-${slide.id}`);
      await generateMultiSlidePDF(slideIds, {
        filename: 'tierra-madre-masterclass-completa',
        quality: 1.0,
        scale: 2,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al exportar la presentación');
    }

    setRenderAllSlides(false);
    setExportingAll(false);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 1));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.15));
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      setZoom(0.5);
    } else {
      setZoom(0.35);
    }
  };

  return (
    <Box>
      <Typography
        variant="h5"
        sx={{ mb: 2, fontFamily: '"Libre Baskerville", serif' }}
      >
        Presentaciones Tierra Madre
      </Typography>

      {/* Mode Tabs */}
      <Tabs
        value={tabMode}
        onChange={(_, v) => setTabMode(v)}
        sx={{
          mb: 3,
          '& .MuiTab-root': {
            color: 'grey.500',
            '&.Mui-selected': { color: colors.emeraldRich },
          },
          '& .MuiTabs-indicator': { bgcolor: colors.emeraldDeep },
        }}
      >
        <Tab
          value="preview"
          label="Ver Slides"
          icon={<ViewIcon />}
          iconPosition="start"
        />
        <Tab
          value="generate"
          label="Generar Presentación"
          icon={<GenerateIcon />}
          iconPosition="start"
        />
        <Tab
          value="create"
          label="Crear Slide"
          icon={<CreateIcon />}
          iconPosition="start"
        />
      </Tabs>

      {tabMode === 'preview' ? (
        <>
          {/* Controls Bar */}
          <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            {/* Slide Selector */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Slide anterior">
                <Button size="small" onClick={handlePrevSlide} sx={{ minWidth: 36 }}>
                  <PrevIcon />
                </Button>
              </Tooltip>

              <FormControl size="small" sx={{ minWidth: 220 }}>
                <Select
                  value={currentSlideIndex}
                  onChange={(e) => setCurrentSlideIndex(e.target.value as number)}
                  sx={{
                    '& .MuiSelect-select': { display: 'flex', alignItems: 'center', gap: 1 },
                  }}
                >
                  {MASTERCLASS_SLIDES.map((slide, idx) => (
                    <MenuItem key={slide.id} value={idx}>
                      <Typography component="span" sx={{ mr: 1 }}>{slide.icon}</Typography>
                      {slide.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Tooltip title="Slide siguiente">
                <Button size="small" onClick={handleNextSlide} sx={{ minWidth: 36 }}>
                  <NextIcon />
                </Button>
              </Tooltip>
            </Box>

            <Typography variant="caption" color="grey.500">
              {SLIDE_WIDTH}x{SLIDE_HEIGHT}px (16:9)
            </Typography>

            <Box sx={{ flex: 1 }} />

            {/* Zoom Controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Alejar">
                <Button size="small" onClick={handleZoomOut} disabled={zoom <= 0.15}>
                  <ZoomOutIcon />
                </Button>
              </Tooltip>
              <Typography variant="caption" sx={{ minWidth: 50, textAlign: 'center' }}>
                {Math.round(zoom * 100)}%
              </Typography>
              <Tooltip title="Acercar">
                <Button size="small" onClick={handleZoomIn} disabled={zoom >= 1}>
                  <ZoomInIcon />
                </Button>
              </Tooltip>
              <Tooltip title="Pantalla completa">
                <Button size="small" onClick={toggleFullscreen}>
                  <FullscreenIcon />
                </Button>
              </Tooltip>
            </Box>

            {/* Export Format Selection */}
            <ButtonGroup variant="outlined" size="small">
              <Tooltip title="Exportar como PDF">
                <Button
                  onClick={() => setExportFormat('pdf')}
                  variant={exportFormat === 'pdf' ? 'contained' : 'outlined'}
                >
                  <PdfIcon fontSize="small" />
                </Button>
              </Tooltip>
              <Tooltip title="Exportar como PNG">
                <Button
                  onClick={() => setExportFormat('png')}
                  variant={exportFormat === 'png' ? 'contained' : 'outlined'}
                >
                  PNG
                </Button>
              </Tooltip>
              <Tooltip title="Exportar como JPG">
                <Button
                  onClick={() => setExportFormat('jpg')}
                  variant={exportFormat === 'jpg' ? 'contained' : 'outlined'}
                >
                  JPG
                </Button>
              </Tooltip>
            </ButtonGroup>

            {/* Export Buttons */}
            <Button
              variant="contained"
              startIcon={exporting ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />}
              onClick={handleExport}
              disabled={exporting || exportingAll}
              sx={{
                bgcolor: colors.emeraldDeep,
                '&:hover': { bgcolor: colors.mysticalDark },
              }}
            >
              {exporting ? 'Exportando...' : `Descargar ${exportFormat.toUpperCase()}`}
            </Button>

            <Button
              variant="contained"
              startIcon={exportingAll ? <CircularProgress size={18} color="inherit" /> : <PdfIcon />}
              onClick={handleExportAll}
              disabled={exporting || exportingAll}
              sx={{
                bgcolor: '#C9A962',
                '&:hover': { bgcolor: '#9A7B3C' },
              }}
            >
              {exportingAll ? 'Generando PDF...' : 'Descargar Todo (PDF)'}
            </Button>
          </Paper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Slide Preview Container */}
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              bgcolor: 'grey.900',
              overflow: 'hidden',
              minHeight: isFullscreen ? '80vh' : 'calc(100vh - 350px)',
              position: 'relative',
            }}
          >
            {/* Wrapper to contain scaled slide */}
            <Box
              sx={{
                width: `${SLIDE_WIDTH * zoom}px`,
                height: `${SLIDE_HEIGHT * zoom}px`,
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {/* Slide with zoom applied */}
              <Box
                sx={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.2s ease-out',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  position: 'absolute',
                }}
              >
                <SlideComponent id={`slide-${currentSlide.id}`} />
              </Box>
            </Box>
          </Paper>

          {/* Slide Thumbnails */}
          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Masterclass: El Poder de la Esmeralda Colombiana ({MASTERCLASS_SLIDES.length} slides)
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
              {MASTERCLASS_SLIDES.map((slide, idx) => (
                <Box
                  key={slide.id}
                  onClick={() => setCurrentSlideIndex(idx)}
                  sx={{
                    minWidth: 80,
                    height: 50,
                    bgcolor: idx === currentSlideIndex ? colors.emeraldDeep : 'grey.800',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    border: idx === currentSlideIndex ? `2px solid ${colors.emeraldRich}` : '2px solid transparent',
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: idx === currentSlideIndex ? colors.emeraldDeep : 'grey.700' },
                  }}
                >
                  <Typography sx={{ fontSize: '20px' }}>{slide.icon}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>

          {/* Info Footer */}
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="grey.600">
              <ImageIcon fontSize="inherit" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
              Preview en tiempo real
            </Typography>
            <Typography variant="caption" color="grey.600">
              <PdfIcon fontSize="inherit" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
              PDF generado en alta calidad (300 DPI)
            </Typography>
          </Box>
        </>
      ) : tabMode === 'generate' ? (
        <PresentationGenerator />
      ) : (
        <SlideEditor />
      )}

      {/* Offscreen container for exporting all slides */}
      {renderAllSlides && (
        <Box
          sx={{
            position: 'fixed',
            left: '-9999px',
            top: 0,
            zIndex: -1,
            opacity: 1,
          }}
        >
          {MASTERCLASS_SLIDES.map((slide) => {
            const SlideComp = slide.component;
            return (
              <Box key={slide.id} sx={{ mb: 2 }}>
                <SlideComp id={`slide-export-${slide.id}`} />
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
