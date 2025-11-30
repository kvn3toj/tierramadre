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
  Card,
  CardActionArea,
  CardContent,
  Slider,
  Collapse,
  IconButton,
  useTheme,
  alpha,
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
  Settings as SettingsIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { SLIDE_WIDTH, SLIDE_HEIGHT } from './Slide2Purpose';
import SlideEditor from './SlideEditor';
import PresentationGenerator from './PresentationGenerator';
import { generateSlidePDF, generateMultiSlidePDF } from '../../utils/slidePdfGenerator';
import { brand, getTokens, animation } from '../../design-system';

// Legacy imports (kept for reference)
// import { MissionTemplate, OpportunityTemplate, ... } from '../templates/MasterclassTemplates';

// Import MClass Templates (based on MClass11.pdf design system)
import {
  MClassCoverTemplate,
  MClassQuoteTemplate,
  MClassMissionTemplate,
  MClassFiveReasonsTemplate,
  MClassExpertTemplate,
  MClassOriginsTemplate,
  MClassQualityTemplate,
  MClassOpportunityTemplate,
  MClassCollectionTemplate,
  MClassClosingTemplate,
  // Logo types and constants
  LOGO_POSITIONS,
  LOGO_SIZES,
  LogoPosition,
} from '../templates/MClassTemplates';

// Masterclass slide definitions - MClass style (based on MClass11.pdf)
const MASTERCLASS_SLIDES = [
  { id: 'cover', name: '1. Portada', icon: '💎', component: MClassCoverTemplate },
  { id: 'quote', name: '2. Cita', icon: '💬', component: MClassQuoteTemplate },
  { id: 'mission', name: '3. Misión', icon: '✨', component: MClassMissionTemplate },
  { id: 'fiveReasons', name: '4. 5 Razones', icon: '🔢', component: MClassFiveReasonsTemplate },
  { id: 'expert', name: '5. Experto', icon: '👤', component: MClassExpertTemplate },
  { id: 'origins', name: '6. Orígenes', icon: '🌍', component: MClassOriginsTemplate },
  { id: 'quality', name: '7. Calidad GIA', icon: '🔬', component: MClassQualityTemplate },
  { id: 'opportunity', name: '8. Oportunidad', icon: '📈', component: MClassOpportunityTemplate },
  { id: 'collection', name: '9. Colección Fénix', icon: '🔥', component: MClassCollectionTemplate },
  { id: 'closing', name: '10. Cierre', icon: '🌿', component: MClassClosingTemplate },
] as const;

type ExportFormat = 'pdf' | 'png' | 'jpg';
type TabMode = 'preview' | 'generate' | 'create';

export default function SlidePreview() {
  const theme = useTheme();
  const mode = theme.palette.mode;
  const tokens = getTokens(mode);

  const [tabMode, setTabMode] = useState<TabMode>('preview');
  const [exporting, setExporting] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.35); // Default zoom to fit typical screens
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [renderAllSlides, setRenderAllSlides] = useState(false);

  // Logo settings
  const [logoPosition, setLogoPosition] = useState<LogoPosition>('top-right');
  const [logoSize, setLogoSize] = useState(120);
  const [showLogoSettings, setShowLogoSettings] = useState(false);
  const [renderSingleSlide, setRenderSingleSlide] = useState(false);

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
    setRenderSingleSlide(true);
    setError(null);

    // Wait for offscreen slide to render
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const slideId = `slide-single-export-${currentSlide.id}`;
      await generateSlidePDF(slideId, {
        filename: `tierra-madre-${currentSlide.id}`,
        format: exportFormat,
        quality: 0.95,
        scale: 2,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al exportar la diapositiva');
    }

    setRenderSingleSlide(false);
    setExporting(false);
  };

  const handleExportAll = async () => {
    setExportingAll(true);
    setRenderAllSlides(true);
    setError(null);

    // Wait for all slides to render and images to load (increased for reliability)
    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
      const slideIds = MASTERCLASS_SLIDES.map(slide => `slide-export-${slide.id}`);
      await generateMultiSlidePDF(slideIds, {
        filename: 'tierra-madre-masterclass-completa',
        quality: 0.92,
        scale: 2,
      });
    } catch (err) {
      console.error('PDF Export Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al exportar la presentación';
      setError(errorMessage);
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
    <Box sx={{ transition: animation.transition.default }}>
      <Typography
        variant="h5"
        sx={{
          mb: 2,
          fontFamily: '"Libre Baskerville", serif',
          color: tokens.text.primary,
        }}
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
            color: tokens.text.secondary,
            transition: animation.transition.default,
            '&.Mui-selected': { color: tokens.interactive.primary },
          },
          '& .MuiTabs-indicator': { bgcolor: tokens.interactive.primary },
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
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              flexWrap: 'wrap',
              bgcolor: tokens.background.surface,
              border: `1px solid ${tokens.border.default}`,
              borderRadius: 2,
              transition: animation.transition.default,
            }}
          >
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
                bgcolor: tokens.interactive.primary,
                '&:hover': { bgcolor: tokens.interactive.primaryHover },
                transition: animation.transition.default,
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
                bgcolor: tokens.interactive.secondary,
                color: mode === 'light' ? brand.slate[900] : '#1a1a1a',
                '&:hover': { bgcolor: tokens.interactive.secondaryHover },
                transition: animation.transition.default,
              }}
            >
              {exportingAll ? 'Generando PDF...' : 'Descargar Todo (PDF)'}
            </Button>

            {/* Logo Settings Toggle */}
            <Tooltip title="Configurar Logo">
              <IconButton
                onClick={() => setShowLogoSettings(!showLogoSettings)}
                sx={{
                  bgcolor: showLogoSettings ? tokens.interactive.primary : 'transparent',
                  color: showLogoSettings ? 'white' : tokens.text.secondary,
                  transition: animation.transition.default,
                  '&:hover': { bgcolor: showLogoSettings ? tokens.interactive.primaryHover : alpha(tokens.interactive.primary, 0.1) },
                }}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Paper>

          {/* Logo Settings Panel */}
          <Collapse in={showLogoSettings}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                bgcolor: tokens.background.surface,
                border: `1px solid ${tokens.border.default}`,
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: tokens.text.primary }}>
                  <ImageIcon fontSize="small" />
                  Configuración del Logo
                </Typography>
                <IconButton size="small" onClick={() => setShowLogoSettings(false)} sx={{ color: tokens.text.secondary }}>
                  <ExpandLessIcon />
                </IconButton>
              </Box>

              {/* Logo Position */}
              <Typography variant="caption" sx={{ mb: 1, display: 'block', color: tokens.text.secondary }}>
                Posición del Logo
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                {LOGO_POSITIONS.map((pos) => (
                  <Card
                    key={pos.id}
                    elevation={0}
                    sx={{
                      minWidth: 70,
                      border: logoPosition === pos.id
                        ? `2px solid ${tokens.interactive.primary}`
                        : `1px solid ${tokens.border.default}`,
                      transition: animation.transition.default,
                      bgcolor: logoPosition === pos.id ? alpha(tokens.interactive.primary, 0.1) : tokens.background.muted,
                    }}
                  >
                    <CardActionArea onClick={() => setLogoPosition(pos.id)}>
                      <CardContent sx={{ textAlign: 'center', py: 1, px: 1.5 }}>
                        <Typography variant="h6" sx={{ lineHeight: 1 }}>{pos.icon}</Typography>
                        <Typography variant="caption" sx={{ fontSize: '10px', color: tokens.text.secondary }}>
                          {pos.label}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))}
              </Box>

              {/* Logo Size */}
              <Typography variant="caption" sx={{ mb: 1, display: 'block', color: tokens.text.secondary }}>
                Tamaño del Logo: {logoSize}px
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {LOGO_SIZES.map((size) => (
                    <Button
                      key={size.id}
                      size="small"
                      variant={logoSize === size.value ? 'contained' : 'outlined'}
                      onClick={() => setLogoSize(size.value)}
                      sx={{
                        minWidth: 'auto',
                        px: 1.5,
                        transition: animation.transition.default,
                        ...(logoSize === size.value && {
                          bgcolor: tokens.interactive.primary,
                          '&:hover': { bgcolor: tokens.interactive.primaryHover },
                        }),
                      }}
                    >
                      {size.label}
                    </Button>
                  ))}
                </Box>
                <Box sx={{ flex: 1, maxWidth: 200 }}>
                  <Slider
                    value={logoSize}
                    onChange={(_, value) => setLogoSize(value as number)}
                    min={50}
                    max={350}
                    valueLabelDisplay="auto"
                    sx={{
                      color: tokens.interactive.primary,
                      '& .MuiSlider-thumb': {
                        '&:hover, &.Mui-focusVisible': {
                          boxShadow: `0px 0px 0px 8px ${alpha(tokens.interactive.primary, 0.16)}`,
                        },
                      },
                    }}
                  />
                </Box>
              </Box>

              {/* Logo Preview */}
              {logoPosition !== 'none' && (
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    component="img"
                    src="/logo.png"
                    alt="Logo Preview"
                    sx={{ height: 32, width: 'auto', borderRadius: 1 }}
                  />
                  <Typography variant="caption" sx={{ color: tokens.text.secondary }}>
                    Vista previa del logo en posición: {LOGO_POSITIONS.find(p => p.id === logoPosition)?.label}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Collapse>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Slide Preview Container */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              bgcolor: mode === 'dark' ? '#0A0A0A' : brand.slate[900],
              overflow: 'hidden',
              minHeight: isFullscreen ? '80vh' : 'calc(100vh - 350px)',
              position: 'relative',
              borderRadius: 2,
              border: `1px solid ${tokens.border.default}`,
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
                  transition: animation.transition.default,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  position: 'absolute',
                }}
              >
                <SlideComponent
                  id={`slide-${currentSlide.id}`}
                  logoPosition={logoPosition}
                  logoSize={logoSize}
                />
              </Box>
            </Box>
          </Paper>

          {/* Slide Thumbnails */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mt: 2,
              bgcolor: tokens.background.surface,
              border: `1px solid ${tokens.border.default}`,
              borderRadius: 2,
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 2, color: tokens.text.primary }}>
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
                    bgcolor: idx === currentSlideIndex ? tokens.interactive.primary : tokens.background.muted,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    border: idx === currentSlideIndex ? `2px solid ${brand.emerald[400]}` : `2px solid ${tokens.border.default}`,
                    transition: animation.transition.default,
                    '&:hover': {
                      bgcolor: idx === currentSlideIndex ? tokens.interactive.primary : alpha(tokens.interactive.primary, 0.15),
                      borderColor: tokens.interactive.primary,
                    },
                  }}
                >
                  <Typography sx={{ fontSize: '20px' }}>{slide.icon}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>

          {/* Info Footer */}
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="caption" sx={{ color: tokens.text.secondary }}>
              <ImageIcon fontSize="inherit" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
              Preview en tiempo real
            </Typography>
            <Typography variant="caption" sx={{ color: tokens.text.secondary }}>
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

      {/* Offscreen container for exporting single slide */}
      {renderSingleSlide && (
        <Box
          sx={{
            position: 'fixed',
            left: '-9999px',
            top: 0,
            zIndex: -1,
            opacity: 1,
          }}
        >
          <SlideComponent
            id={`slide-single-export-${currentSlide.id}`}
            logoPosition={logoPosition}
            logoSize={logoSize}
          />
        </Box>
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
                <SlideComp
                  id={`slide-export-${slide.id}`}
                  logoPosition={logoPosition}
                  logoSize={logoSize}
                />
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
