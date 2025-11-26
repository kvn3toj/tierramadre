import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  ButtonGroup,
  CircularProgress,
  Alert,
  Chip,
  Tooltip,
  Tabs,
  Tab,
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
} from '@mui/icons-material';
import Slide2Purpose, { SLIDE_WIDTH, SLIDE_HEIGHT } from './Slide2Purpose';
import SlideEditor from './SlideEditor';
import { generateSlidePDF } from '../../utils/slidePdfGenerator';
import { brandColors } from '../../theme';

type ExportFormat = 'pdf' | 'png' | 'jpg';
type TabMode = 'preview' | 'create';

export default function SlidePreview() {
  const [tabMode, setTabMode] = useState<TabMode>('preview');
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.35); // Default zoom to fit typical screens
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    setError(null);

    try {
      await generateSlidePDF('slide-2-purpose', {
        filename: 'tierra-madre-proposito-slide2',
        format: exportFormat,
        quality: 1.0,
        scale: 2,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al exportar la diapositiva');
    }

    setExporting(false);
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
            '&.Mui-selected': { color: brandColors.emeraldLight },
          },
          '& .MuiTabs-indicator': { bgcolor: brandColors.emeraldGreen },
        }}
      >
        <Tab
          value="preview"
          label="Ver Slides"
          icon={<ViewIcon />}
          iconPosition="start"
        />
        <Tab
          value="create"
          label="Crear con IA"
          icon={<CreateIcon />}
          iconPosition="start"
        />
      </Tabs>

      {tabMode === 'preview' ? (
        <>
          {/* Controls Bar */}
          <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label="Slide 2: Propósito"
                color="primary"
                sx={{ bgcolor: brandColors.emeraldGreen }}
              />
              <Typography variant="caption" color="grey.500">
                {SLIDE_WIDTH}x{SLIDE_HEIGHT}px (16:9)
              </Typography>
            </Box>

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

            {/* Export Button */}
            <Button
              variant="contained"
              startIcon={exporting ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />}
              onClick={handleExport}
              disabled={exporting}
              sx={{
                bgcolor: brandColors.emeraldGreen,
                '&:hover': { bgcolor: brandColors.emeraldDark },
              }}
            >
              {exporting ? 'Exportando...' : `Descargar ${exportFormat.toUpperCase()}`}
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
              overflow: 'auto',
              maxHeight: isFullscreen ? '80vh' : 'calc(100vh - 350px)',
              position: 'relative',
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
              }}
            >
              <Slide2Purpose id="slide-2-purpose" />
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
      ) : (
        <SlideEditor />
      )}
    </Box>
  );
}
