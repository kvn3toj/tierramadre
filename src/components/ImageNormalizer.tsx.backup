import { useState, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Slider,
  Switch,
  FormControlLabel,
  Grid,
  Card,
  CardMedia,
  IconButton,
  LinearProgress,
  Chip,
  Divider,
  Stack,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Wand2,
  Upload,
  Download,
  Trash2,
  SplitSquareHorizontal,
  Settings2,
  RefreshCcw,
  Camera,
  Images,
  Sun,
  Contrast as ContrastIcon,
  Sparkles,
  CircleDot,
} from 'lucide-react';
import {
  batchProcess,
  NormalizationSettings,
  STUDIO_PRESET,
  EDITORIAL_PRESET,
  ImageAnalysis,
  canvasToBlob,
} from '../utils/imageNormalizer';
import {
  brand,
  gradients,
  radius,
  animation,
  getTokens,
  getShadows,
  getHeaderStyles,
} from '../design-system';

interface ProcessedImage {
  id: string;
  file: File;
  original: string;
  normalized: string;
  analysis: ImageAnalysis;
  canvas: HTMLCanvasElement;
}

type PresetType = 'studio' | 'editorial' | 'custom';

export default function ImageNormalizer() {
  const theme = useTheme();
  const mode = theme.palette.mode;
  const tokens = getTokens(mode);
  const shadows = getShadows(mode);
  const headerStyle = getHeaderStyles(mode);

  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<ProcessedImage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [showComparison, setShowComparison] = useState(true);
  const [comparisonPosition, setComparisonPosition] = useState(50);
  const [preset, setPreset] = useState<PresetType>('studio');
  const [settings, setSettings] = useState<NormalizationSettings>(STUDIO_PRESET);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const comparisonRef = useRef<HTMLDivElement>(null);

  const handlePresetChange = (_: React.MouseEvent<HTMLElement>, newPreset: PresetType | null) => {
    if (newPreset) {
      setPreset(newPreset);
      if (newPreset === 'studio') setSettings(STUDIO_PRESET);
      else if (newPreset === 'editorial') setSettings(EDITORIAL_PRESET);
    }
  };

  const handleSettingChange = (key: keyof NormalizationSettings, value: number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setPreset('custom');
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      await processFiles(files);
    }
  }, [settings]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await processFiles(files);
    }
  };

  const processFiles = async (files: File[]) => {
    setIsProcessing(true);
    setProgress({ current: 0, total: files.length });

    try {
      const results = await batchProcess(files, settings, (current, total) => {
        setProgress({ current, total });
      });

      const newImages: ProcessedImage[] = results.map((r, i) => ({
        id: `${Date.now()}-${i}`,
        ...r,
      }));

      setImages(prev => [...prev, ...newImages]);
      if (newImages.length > 0 && !selectedImage) {
        setSelectedImage(newImages[0]);
      }
    } catch (error) {
      console.error('Error processing images:', error);
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const reprocessAll = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    setProgress({ current: 0, total: images.length });

    const files = images.map(img => img.file);
    try {
      const results = await batchProcess(files, settings, (current, total) => {
        setProgress({ current, total });
      });

      const newImages: ProcessedImage[] = results.map((r, i) => ({
        id: images[i].id,
        ...r,
      }));

      setImages(newImages);
      if (selectedImage) {
        const updated = newImages.find(img => img.id === selectedImage.id);
        if (updated) setSelectedImage(updated);
      }
    } catch (error) {
      console.error('Error reprocessing images:', error);
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
    if (selectedImage?.id === id) {
      setSelectedImage(images.find(img => img.id !== id) || null);
    }
  };

  const downloadImage = async (image: ProcessedImage) => {
    const blob = await canvasToBlob(image.canvas);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `normalized_${image.file.name}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAll = async () => {
    for (const image of images) {
      await downloadImage(image);
    }
  };

  const handleComparisonDrag = (e: React.MouseEvent) => {
    if (!comparisonRef.current) return;
    const rect = comparisonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setComparisonPosition(Math.max(0, Math.min(100, percentage)));
  };

  const brandColor = tokens.interactive.primary;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* Premium Header */}
      <Paper
        elevation={0}
        sx={{
          mb: 4,
          borderRadius: radius.xl,
          overflow: 'hidden',
          boxShadow: shadows.lg,
        }}
      >
        <Box
          sx={{
            p: 3,
            background: headerStyle.background,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Emerald accent line */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: headerStyle.accentLine,
            }}
          />

          {/* Subtle overlay */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 300,
              height: '100%',
              background: headerStyle.overlay,
              pointerEvents: 'none',
            }}
          />

          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: radius.lg,
                    background: alpha(headerStyle.brandColor, 0.15),
                    border: `1px solid ${alpha(headerStyle.brandColor, 0.3)}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Wand2 size={26} color={headerStyle.brandColor} />
                </Box>
                <Box>
                  <Typography
                    variant="overline"
                    sx={{
                      color: headerStyle.brandColor,
                      fontWeight: 600,
                      letterSpacing: '0.12em',
                      fontSize: '0.625rem',
                      display: 'block',
                      mb: 0.25,
                    }}
                  >
                    TM STUDIO
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 600,
                      color: headerStyle.titleColor,
                      fontFamily: '"Libre Baskerville", Georgia, serif',
                      letterSpacing: '-0.02em',
                      fontSize: '1.5rem',
                    }}
                  >
                    Normalizador de Imágenes
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: headerStyle.subtitleColor,
                      fontWeight: 400,
                      fontSize: '0.875rem',
                    }}
                  >
                    Ajusta luz y colores automáticamente
                  </Typography>
                </Box>
              </Box>

              {/* Stats */}
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Box
                  sx={{
                    px: 2,
                    py: 1.25,
                    borderRadius: radius.md,
                    background: alpha('#FFFFFF', 0.1),
                    border: `1px solid ${alpha('#FFFFFF', 0.15)}`,
                    textAlign: 'center',
                    minWidth: 72,
                  }}
                >
                  <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', lineHeight: 1 }}>
                    {images.length}
                  </Typography>
                  <Typography sx={{ fontSize: '0.625rem', color: alpha('#FFFFFF', 0.7), fontWeight: 500, mt: 0.25 }}>
                    Procesadas
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Settings Panel */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: radius.xl,
              border: `1px solid ${tokens.border.card}`,
              bgcolor: tokens.background.surface,
              boxShadow: shadows.card,
              transition: animation.transition.default,
              '&:hover': {
                boxShadow: shadows.cardHover,
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.md,
                  bgcolor: alpha(brandColor, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Settings2 size={18} color={brandColor} />
              </Box>
              <Typography sx={{ fontWeight: 700, color: tokens.text.primary }}>
                Configuración
              </Typography>
            </Box>

            {/* Presets */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ color: tokens.text.secondary, mb: 1.5, fontWeight: 600 }}>
                Preset
              </Typography>
              <ToggleButtonGroup
                value={preset}
                exclusive
                onChange={handlePresetChange}
                size="small"
                fullWidth
                sx={{
                  '& .MuiToggleButton-root': {
                    textTransform: 'none',
                    fontWeight: 600,
                    py: 1,
                    borderRadius: radius.md,
                    color: tokens.text.secondary,
                    borderColor: tokens.border.default,
                    '&.Mui-selected': {
                      bgcolor: alpha(brandColor, 0.1),
                      color: brandColor,
                      borderColor: brandColor,
                    },
                  },
                }}
              >
                <ToggleButton value="studio">
                  <Camera size={16} style={{ marginRight: 6 }} />
                  Studio
                </ToggleButton>
                <ToggleButton value="editorial">
                  <Sparkles size={16} style={{ marginRight: 6 }} />
                  Editorial
                </ToggleButton>
                <ToggleButton value="custom">
                  <Settings2 size={16} style={{ marginRight: 6 }} />
                  Custom
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Divider sx={{ my: 2, borderColor: tokens.border.light }} />

            {/* Brightness */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: tokens.text.primary, fontWeight: 600 }}>
                <Sun size={16} />
                Brillo: {settings.targetBrightness}
              </Typography>
              <Slider
                value={settings.targetBrightness}
                onChange={(_, v) => handleSettingChange('targetBrightness', v as number)}
                min={80}
                max={200}
                size="small"
                sx={{
                  color: brandColor,
                  '& .MuiSlider-thumb': { bgcolor: brandColor },
                  '& .MuiSlider-track': { bgcolor: brandColor },
                }}
              />
            </Box>

            {/* Contrast */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: tokens.text.primary, fontWeight: 600 }}>
                <ContrastIcon size={16} />
                Contraste: {settings.targetContrast}
              </Typography>
              <Slider
                value={settings.targetContrast}
                onChange={(_, v) => handleSettingChange('targetContrast', v as number)}
                min={20}
                max={80}
                size="small"
                sx={{
                  color: brandColor,
                  '& .MuiSlider-thumb': { bgcolor: brandColor },
                  '& .MuiSlider-track': { bgcolor: brandColor },
                }}
              />
            </Box>

            {/* Vignette */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: tokens.text.primary, fontWeight: 600 }}>
                <CircleDot size={16} />
                Viñeta: {settings.vignetteStrength}%
              </Typography>
              <Slider
                value={settings.vignetteStrength}
                onChange={(_, v) => handleSettingChange('vignetteStrength', v as number)}
                min={0}
                max={50}
                size="small"
                sx={{
                  color: brandColor,
                  '& .MuiSlider-thumb': { bgcolor: brandColor },
                  '& .MuiSlider-track': { bgcolor: brandColor },
                }}
              />
            </Box>

            <Divider sx={{ my: 2, borderColor: tokens.border.light }} />

            {/* Toggles */}
            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoWhiteBalance}
                  onChange={(e) => handleSettingChange('autoWhiteBalance', e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: brandColor },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: brandColor },
                  }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Sun size={16} />
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: tokens.text.primary }}>Balance de blancos</Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.enhanceEmeralds}
                  onChange={(e) => handleSettingChange('enhanceEmeralds', e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: brandColor },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: brandColor },
                  }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Sparkles size={16} color={brandColor} />
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: tokens.text.primary }}>Realzar esmeraldas</Typography>
                </Box>
              }
            />

            <Divider sx={{ my: 2, borderColor: tokens.border.light }} />

            {/* Actions */}
            <Stack spacing={1.5}>
              <Button
                variant="outlined"
                startIcon={<RefreshCcw size={18} />}
                onClick={reprocessAll}
                disabled={images.length === 0 || isProcessing}
                fullWidth
                sx={{
                  borderColor: brandColor,
                  color: brandColor,
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.25,
                  borderRadius: radius.md,
                  '&:hover': {
                    borderColor: tokens.interactive.primaryHover,
                    bgcolor: alpha(brandColor, 0.05),
                  },
                }}
              >
                Reprocesar Todas
              </Button>
              <Button
                variant="contained"
                startIcon={<Download size={18} />}
                onClick={downloadAll}
                disabled={images.length === 0 || isProcessing}
                fullWidth
                sx={{
                  background: gradients.emerald,
                  textTransform: 'none',
                  fontWeight: 700,
                  py: 1.25,
                  borderRadius: radius.md,
                  boxShadow: shadows.emerald,
                  '&:hover': {
                    background: gradients.emeraldSoft,
                    boxShadow: shadows.emeraldLg,
                  },
                }}
              >
                Descargar Todas ({images.length})
              </Button>
            </Stack>
          </Paper>
        </Grid>

        {/* Main Content */}
        <Grid item xs={12} md={8}>
          {/* Upload Area */}
          <Paper
            elevation={0}
            sx={{
              p: 4,
              mb: 3,
              borderRadius: radius.xl,
              border: `2px dashed ${tokens.border.default}`,
              bgcolor: tokens.background.muted,
              textAlign: 'center',
              cursor: 'pointer',
              transition: animation.transition.default,
              '&:hover': {
                borderColor: brandColor,
                bgcolor: alpha(brandColor, 0.04),
              },
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: radius.xl,
                bgcolor: alpha(brandColor, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <Upload size={36} color={brandColor} />
            </Box>
            <Typography variant="h6" sx={{ color: tokens.text.primary, fontWeight: 600, mb: 0.5 }}>
              Arrastra imágenes aquí
            </Typography>
            <Typography variant="body2" sx={{ color: tokens.text.muted }}>
              JPG, PNG, WebP - Múltiples archivos permitidos
            </Typography>
          </Paper>

          {/* Progress */}
          {isProcessing && (
            <Paper
              elevation={0}
              sx={{
                mb: 3,
                p: 2,
                borderRadius: radius.lg,
                bgcolor: alpha(brandColor, 0.06),
                border: `1px solid ${alpha(brandColor, 0.2)}`,
              }}
            >
              <Typography variant="body2" sx={{ color: brandColor, fontWeight: 500, mb: 1 }}>
                Procesando {progress.current} de {progress.total} imágenes...
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(progress.current / progress.total) * 100}
                sx={{
                  height: 8,
                  borderRadius: radius.full,
                  bgcolor: alpha(brandColor, 0.2),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: radius.full,
                    bgcolor: brandColor,
                  },
                }}
              />
            </Paper>
          )}

          {/* Comparison View */}
          {selectedImage && (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                mb: 3,
                borderRadius: radius.xl,
                border: `1px solid ${tokens.border.card}`,
                bgcolor: tokens.background.surface,
                boxShadow: shadows.card,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: radius.md,
                      bgcolor: alpha(brandColor, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <SplitSquareHorizontal size={18} color={brandColor} />
                  </Box>
                  <Typography sx={{ fontWeight: 700, color: tokens.text.primary }}>
                    Antes / Después
                  </Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showComparison}
                      onChange={(e) => setShowComparison(e.target.checked)}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: brandColor },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: brandColor },
                      }}
                    />
                  }
                  label={<Typography sx={{ fontSize: '0.875rem', color: tokens.text.secondary }}>Modo comparación</Typography>}
                />
              </Box>

              {/* Analysis Info */}
              <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  size="small"
                  label={`Brillo: ${selectedImage.analysis.brightness.toFixed(0)}`}
                  icon={<Sun size={14} />}
                  sx={{ bgcolor: alpha(brandColor, 0.1), color: brandColor, fontWeight: 500 }}
                />
                <Chip
                  size="small"
                  label={`Contraste: ${selectedImage.analysis.contrast.toFixed(0)}`}
                  icon={<ContrastIcon size={14} />}
                  sx={{ bgcolor: alpha(brandColor, 0.1), color: brandColor, fontWeight: 500 }}
                />
                <Chip
                  size="small"
                  label={`Temp: ${selectedImage.analysis.colorTemp > 0 ? 'Cálido' : 'Frío'}`}
                  sx={{
                    bgcolor: selectedImage.analysis.colorTemp > 10
                      ? alpha(brand.gold[500], 0.1)
                      : selectedImage.analysis.colorTemp < -10
                        ? alpha('#3B82F6', 0.1)
                        : alpha(tokens.text.muted, 0.1),
                    color: selectedImage.analysis.colorTemp > 10
                      ? brand.gold[600]
                      : selectedImage.analysis.colorTemp < -10
                        ? '#3B82F6'
                        : tokens.text.muted,
                    fontWeight: 500,
                  }}
                />
              </Box>

              {showComparison ? (
                <Box
                  ref={comparisonRef}
                  sx={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '16/10',
                    overflow: 'hidden',
                    borderRadius: radius.lg,
                    cursor: 'ew-resize',
                  }}
                  onMouseMove={handleComparisonDrag}
                  onClick={handleComparisonDrag}
                >
                  {/* Original (left) */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                    }}
                  >
                    <img
                      src={selectedImage.original}
                      alt="Original"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  </Box>

                  {/* Normalized (right, clipped) */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      clipPath: `inset(0 0 0 ${comparisonPosition}%)`,
                    }}
                  >
                    <img
                      src={selectedImage.normalized}
                      alt="Normalized"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  </Box>

                  {/* Slider line */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: `${comparisonPosition}%`,
                      width: 3,
                      height: '100%',
                      backgroundColor: brandColor,
                      transform: 'translateX(-50%)',
                      '&::before': {
                        content: '"ANTES"',
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        fontSize: 10,
                        fontWeight: 'bold',
                        color: 'white',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        padding: '2px 6px',
                        borderRadius: 4,
                      },
                      '&::after': {
                        content: '"DESPUÉS"',
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        fontSize: 10,
                        fontWeight: 'bold',
                        color: 'white',
                        backgroundColor: brandColor,
                        padding: '2px 6px',
                        borderRadius: 4,
                      },
                    }}
                  />
                </Box>
              ) : (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ color: tokens.text.secondary }}>Original</Typography>
                    <img
                      src={selectedImage.original}
                      alt="Original"
                      style={{ width: '100%', borderRadius: 8 }}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ color: tokens.text.secondary }}>Normalizada</Typography>
                    <img
                      src={selectedImage.normalized}
                      alt="Normalized"
                      style={{ width: '100%', borderRadius: 8 }}
                    />
                  </Box>
                </Box>
              )}

              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<Download size={18} />}
                  onClick={() => downloadImage(selectedImage)}
                  sx={{
                    background: gradients.emerald,
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 3,
                    borderRadius: radius.md,
                    boxShadow: shadows.emerald,
                    '&:hover': {
                      background: gradients.emeraldSoft,
                      boxShadow: shadows.emeraldLg,
                    },
                  }}
                >
                  Descargar
                </Button>
              </Box>
            </Paper>
          )}

          {/* Image Gallery */}
          {images.length > 0 && (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: radius.xl,
                border: `1px solid ${tokens.border.card}`,
                bgcolor: tokens.background.surface,
                boxShadow: shadows.card,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: radius.md,
                    bgcolor: alpha(brandColor, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Images size={18} color={brandColor} />
                </Box>
                <Typography sx={{ fontWeight: 700, color: tokens.text.primary }}>
                  Imágenes Procesadas ({images.length})
                </Typography>
              </Box>
              <Grid container spacing={2}>
                {images.map((image) => (
                  <Grid item xs={6} sm={4} md={3} key={image.id}>
                    <Card
                      elevation={0}
                      sx={{
                        cursor: 'pointer',
                        border: selectedImage?.id === image.id ? `2px solid ${brandColor}` : `1px solid ${tokens.border.card}`,
                        borderRadius: radius.lg,
                        transition: animation.transition.default,
                        bgcolor: selectedImage?.id === image.id ? alpha(brandColor, 0.04) : tokens.background.muted,
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: shadows.cardHover,
                          borderColor: brandColor,
                        },
                      }}
                      onClick={() => setSelectedImage(image)}
                    >
                      <CardMedia
                        component="img"
                        height="120"
                        image={image.normalized}
                        alt={image.file.name}
                        sx={{ objectFit: 'cover', borderRadius: `${radius.lg} ${radius.lg} 0 0` }}
                      />
                      <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography
                          variant="caption"
                          noWrap
                          sx={{
                            maxWidth: '70%',
                            fontWeight: selectedImage?.id === image.id ? 600 : 500,
                            color: selectedImage?.id === image.id ? brandColor : tokens.text.primary,
                          }}
                        >
                          {image.file.name}
                        </Typography>
                        <Tooltip title="Eliminar">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(image.id);
                            }}
                            sx={{
                              color: tokens.text.muted,
                              '&:hover': { color: tokens.status.error, bgcolor: tokens.status.errorBg },
                            }}
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}

          {/* Empty State */}
          {images.length === 0 && !isProcessing && (
            <Paper
              elevation={0}
              sx={{
                p: 4,
                textAlign: 'center',
                borderRadius: radius.xl,
                bgcolor: alpha(brandColor, 0.04),
                border: `1px solid ${alpha(brandColor, 0.1)}`,
              }}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: radius.xl,
                  bgcolor: alpha(brandColor, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <Camera size={28} color={brandColor} />
              </Box>
              <Typography sx={{ color: brandColor, fontWeight: 600, mb: 0.5 }}>
                Sube imágenes para comenzar
              </Typography>
              <Typography sx={{ color: tokens.text.secondary, fontSize: '0.875rem' }}>
                Tus fotos serán ajustadas automáticamente para iluminación y colores consistentes
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
