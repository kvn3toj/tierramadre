/**
 * ImageCropper Component
 *
 * Allows users to crop and adjust images before upload.
 * Supports multiple aspect ratios and zoom/pan controls.
 */

import { useState, useCallback } from 'react';
import Cropper, { Area, Point } from 'react-easy-crop';
import { createLogger } from '../../utils/logger';
import { primitiveColors } from '../../design-system/tokens/primitives/colors';

const log = createLogger('ImageCropper');

// Brand emerald color (primary) for consistent styling
const brandEmerald = primitiveColors.emerald[500]; // #00AE7A - brand color
const emeraldShades = primitiveColors.emerald;

import {
  Box,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  alpha,
} from '@mui/material';
import {
  X,
  ZoomIn,
  ZoomOut,
  Square,
  RectangleHorizontal,
  RectangleVertical,
  Check,
  RotateCw,
} from 'lucide-react';

interface ImageCropperProps {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedImage: Blob) => void;
  aspectRatioOptions?: AspectRatioOption[];
}

interface AspectRatioOption {
  label: string;
  value: number;
  icon: React.ReactNode;
}

const DEFAULT_ASPECT_RATIOS: AspectRatioOption[] = [
  { label: '1:1', value: 1, icon: <Square size={18} /> },
  { label: '4:3', value: 4 / 3, icon: <RectangleHorizontal size={18} /> },
  { label: '3:4', value: 3 / 4, icon: <RectangleVertical size={18} /> },
  { label: '16:9', value: 16 / 9, icon: <RectangleHorizontal size={18} /> },
];

// Create cropped image from canvas
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('Failed to load image')));
    // Only set crossOrigin for external URLs (not blob: or data: URLs)
    if (!url.startsWith('blob:') && !url.startsWith('data:')) {
      image.setAttribute('crossOrigin', 'anonymous');
    }
    image.src = url;
  });

const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<Blob> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  const rotRad = (rotation * Math.PI) / 180;

  // Calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = {
    width:
      Math.abs(Math.cos(rotRad) * image.width) +
      Math.abs(Math.sin(rotRad) * image.height),
    height:
      Math.abs(Math.sin(rotRad) * image.width) +
      Math.abs(Math.cos(rotRad) * image.height),
  };

  // Set canvas size to match the bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // Translate canvas context to center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);

  // Draw rotated image
  ctx.drawImage(image, 0, 0);

  // Create output canvas for cropped area
  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d');

  if (!croppedCtx) {
    throw new Error('No 2d context');
  }

  // Set output canvas size
  croppedCanvas.width = pixelCrop.width;
  croppedCanvas.height = pixelCrop.height;

  // Draw cropped image
  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // Return as blob
  return new Promise((resolve, reject) => {
    croppedCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas is empty'));
        }
      },
      'image/jpeg',
      0.9
    );
  });
};

export default function ImageCropper({
  open,
  imageSrc,
  onClose,
  onCropComplete,
  aspectRatioOptions = DEFAULT_ASPECT_RATIOS,
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = useCallback((location: Point) => {
    setCrop(location);
  }, []);

  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const onCropCompleteCallback = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleAspectChange = (
    _event: React.MouseEvent<HTMLElement>,
    newAspect: number | null
  ) => {
    if (newAspect !== null) {
      setAspect(newAspect);
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const croppedImage = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation
      );
      onCropComplete(croppedImage);
      onClose();
    } catch (error) {
      log.error('Error cropping image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setAspect(1);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#0a0a0a',
          borderRadius: 3,
          overflow: 'hidden',
          maxHeight: '95vh',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 600 }}>
          Ajustar Imagen
        </Typography>
        <IconButton onClick={handleClose} size="small" sx={{ color: '#fff' }}>
          <X size={20} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0, position: 'relative' }}>
        {/* Cropper Area */}
        <Box
          sx={{
            position: 'relative',
            height: { xs: '50vh', sm: '60vh' },
            bgcolor: '#1a1a1a',
          }}
        >
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            rotation={rotation}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteCallback}
            style={{
              containerStyle: {
                backgroundColor: '#1a1a1a',
              },
              cropAreaStyle: {
                border: `2px solid ${brandEmerald}`,
              },
            }}
          />
        </Box>

        {/* Controls */}
        <Box sx={{ px: 2, py: 2, bgcolor: '#0a0a0a' }}>
          {/* Aspect Ratio */}
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="caption"
              sx={{ color: 'rgba(255,255,255,0.6)', mb: 1, display: 'block' }}
            >
              Proporción
            </Typography>
            <ToggleButtonGroup
              value={aspect}
              exclusive
              onChange={handleAspectChange}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  color: 'rgba(255,255,255,0.7)',
                  borderColor: 'rgba(255,255,255,0.2)',
                  px: 2,
                  '&.Mui-selected': {
                    bgcolor: alpha(brandEmerald, 0.2),
                    color: brandEmerald,
                    borderColor: brandEmerald,
                    '&:hover': {
                      bgcolor: alpha(brandEmerald, 0.3),
                    },
                  },
                },
              }}
            >
              {aspectRatioOptions.map((option) => (
                <ToggleButton key={option.label} value={option.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {option.icon}
                    <Typography variant="caption">{option.label}</Typography>
                  </Box>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          {/* Zoom Slider */}
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="caption"
              sx={{ color: 'rgba(255,255,255,0.6)', mb: 1, display: 'block' }}
            >
              Zoom
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ZoomOut size={18} color="rgba(255,255,255,0.6)" />
              <Slider
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(_, value) => setZoom(value as number)}
                sx={{
                  color: brandEmerald,
                  '& .MuiSlider-thumb': {
                    width: 16,
                    height: 16,
                  },
                }}
              />
              <ZoomIn size={18} color="rgba(255,255,255,0.6)" />
            </Box>
          </Box>

          {/* Rotate Button */}
          <Button
            variant="outlined"
            startIcon={<RotateCw size={16} />}
            onClick={handleRotate}
            size="small"
            sx={{
              color: 'rgba(255,255,255,0.7)',
              borderColor: 'rgba(255,255,255,0.2)',
              '&:hover': {
                borderColor: brandEmerald,
                color: brandEmerald,
              },
            }}
          >
            Rotar 90°
          </Button>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <Button
          onClick={handleClose}
          sx={{ color: 'rgba(255,255,255,0.7)' }}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={isProcessing}
          startIcon={<Check size={18} />}
          sx={{
            background: `linear-gradient(135deg, ${brandEmerald} 0%, ${emeraldShades[600]} 100%)`,
            '&:hover': {
              background: `linear-gradient(135deg, ${emeraldShades[600]} 0%, ${emeraldShades[700]} 100%)`,
            },
          }}
        >
          {isProcessing ? 'Procesando...' : 'Aplicar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
