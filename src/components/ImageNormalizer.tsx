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
  Alert,
} from '@mui/material';
import {
  CloudUpload,
  AutoFixHigh,
  Download,
  Delete,
  Compare,
  Tune,
  RestartAlt,
  PhotoCamera,
  BurstMode,
  Brightness6,
  Contrast,
  WbSunny,
  FilterVintage,
  Vignette,
} from '@mui/icons-material';
import {
  batchProcess,
  NormalizationSettings,
  STUDIO_PRESET,
  EDITORIAL_PRESET,
  ImageAnalysis,
  canvasToBlob,
} from '../utils/imageNormalizer';

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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AutoFixHigh color="primary" />
        Image Normalizer
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Automatically adjust lighting and colors for consistent, professional images
      </Typography>

      <Grid container spacing={3}>
        {/* Settings Panel */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tune fontSize="small" />
              Settings
            </Typography>

            {/* Presets */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Preset
              </Typography>
              <ToggleButtonGroup
                value={preset}
                exclusive
                onChange={handlePresetChange}
                size="small"
                fullWidth
              >
                <ToggleButton value="studio">
                  <PhotoCamera sx={{ mr: 1 }} fontSize="small" />
                  Studio
                </ToggleButton>
                <ToggleButton value="editorial">
                  <FilterVintage sx={{ mr: 1 }} fontSize="small" />
                  Editorial
                </ToggleButton>
                <ToggleButton value="custom">
                  <Tune sx={{ mr: 1 }} fontSize="small" />
                  Custom
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Brightness */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Brightness6 fontSize="small" />
                Target Brightness: {settings.targetBrightness}
              </Typography>
              <Slider
                value={settings.targetBrightness}
                onChange={(_, v) => handleSettingChange('targetBrightness', v as number)}
                min={80}
                max={200}
                size="small"
              />
            </Box>

            {/* Contrast */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Contrast fontSize="small" />
                Target Contrast: {settings.targetContrast}
              </Typography>
              <Slider
                value={settings.targetContrast}
                onChange={(_, v) => handleSettingChange('targetContrast', v as number)}
                min={20}
                max={80}
                size="small"
              />
            </Box>

            {/* Vignette */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Vignette fontSize="small" />
                Vignette: {settings.vignetteStrength}%
              </Typography>
              <Slider
                value={settings.vignetteStrength}
                onChange={(_, v) => handleSettingChange('vignetteStrength', v as number)}
                min={0}
                max={50}
                size="small"
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Toggles */}
            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoWhiteBalance}
                  onChange={(e) => handleSettingChange('autoWhiteBalance', e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WbSunny fontSize="small" />
                  Auto White Balance
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.enhanceEmeralds}
                  onChange={(e) => handleSettingChange('enhanceEmeralds', e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FilterVintage fontSize="small" color="success" />
                  Enhance Emeralds
                </Box>
              }
            />

            <Divider sx={{ my: 2 }} />

            {/* Actions */}
            <Stack spacing={1}>
              <Button
                variant="outlined"
                startIcon={<RestartAlt />}
                onClick={reprocessAll}
                disabled={images.length === 0 || isProcessing}
                fullWidth
              >
                Reprocess All
              </Button>
              <Button
                variant="contained"
                startIcon={<Download />}
                onClick={downloadAll}
                disabled={images.length === 0 || isProcessing}
                fullWidth
              >
                Download All ({images.length})
              </Button>
            </Stack>
          </Paper>
        </Grid>

        {/* Main Content */}
        <Grid item xs={12} md={8}>
          {/* Upload Area */}
          <Paper
            sx={{
              p: 4,
              mb: 3,
              border: '2px dashed',
              borderColor: 'primary.main',
              backgroundColor: 'rgba(46, 125, 50, 0.05)',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: 'primary.light',
                backgroundColor: 'rgba(46, 125, 50, 0.1)',
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
            <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h6">
              Drop images here or click to upload
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Supports JPG, PNG, WebP - Multiple files allowed
            </Typography>
          </Paper>

          {/* Progress */}
          {isProcessing && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Processing {progress.current} of {progress.total} images...
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(progress.current / progress.total) * 100}
              />
            </Box>
          )}

          {/* Comparison View */}
          {selectedImage && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Compare />
                  Before / After
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showComparison}
                      onChange={(e) => setShowComparison(e.target.checked)}
                    />
                  }
                  label="Comparison Mode"
                />
              </Box>

              {/* Analysis Info */}
              <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  size="small"
                  label={`Brightness: ${selectedImage.analysis.brightness.toFixed(0)}`}
                  icon={<Brightness6 />}
                />
                <Chip
                  size="small"
                  label={`Contrast: ${selectedImage.analysis.contrast.toFixed(0)}`}
                  icon={<Contrast />}
                />
                <Chip
                  size="small"
                  label={`Color Temp: ${selectedImage.analysis.colorTemp > 0 ? 'Warm' : 'Cool'}`}
                  icon={<WbSunny />}
                  color={selectedImage.analysis.colorTemp > 10 ? 'warning' : selectedImage.analysis.colorTemp < -10 ? 'info' : 'default'}
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
                    borderRadius: 2,
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
                      backgroundColor: 'primary.main',
                      transform: 'translateX(-50%)',
                      '&::before': {
                        content: '"BEFORE"',
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        fontSize: 10,
                        fontWeight: 'bold',
                        color: 'white',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        padding: '2px 6px',
                        borderRadius: 1,
                      },
                      '&::after': {
                        content: '"AFTER"',
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        fontSize: 10,
                        fontWeight: 'bold',
                        color: 'white',
                        backgroundColor: 'primary.main',
                        padding: '2px 6px',
                        borderRadius: 1,
                      },
                    }}
                  />
                </Box>
              ) : (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">Original</Typography>
                    <img
                      src={selectedImage.original}
                      alt="Original"
                      style={{ width: '100%', borderRadius: 8 }}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">Normalized</Typography>
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
                  startIcon={<Download />}
                  onClick={() => downloadImage(selectedImage)}
                >
                  Download
                </Button>
              </Box>
            </Paper>
          )}

          {/* Image Gallery */}
          {images.length > 0 && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BurstMode />
                Processed Images ({images.length})
              </Typography>
              <Grid container spacing={2}>
                {images.map((image) => (
                  <Grid item xs={6} sm={4} md={3} key={image.id}>
                    <Card
                      sx={{
                        cursor: 'pointer',
                        border: selectedImage?.id === image.id ? 2 : 0,
                        borderColor: 'primary.main',
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'scale(1.02)',
                        },
                      }}
                      onClick={() => setSelectedImage(image)}
                    >
                      <CardMedia
                        component="img"
                        height="120"
                        image={image.normalized}
                        alt={image.file.name}
                        sx={{ objectFit: 'cover' }}
                      />
                      <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" noWrap sx={{ maxWidth: '70%' }}>
                          {image.file.name}
                        </Typography>
                        <Tooltip title="Remove">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(image.id);
                            }}
                          >
                            <Delete fontSize="small" />
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
            <Alert severity="info" icon={<PhotoCamera />}>
              Upload images to start normalizing. Your photos will be automatically adjusted for consistent lighting and colors.
            </Alert>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
