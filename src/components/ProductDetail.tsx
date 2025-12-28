import { useParams, useNavigate } from 'react-router-dom';
import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  Divider,
  Grid,
  Card,
  CardContent,
  alpha,
  useTheme,
  Breadcrumbs,
  Link,
  Collapse,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowLeft,
  Package,
  Gem,
  Ruler,
  Palette,
  Award,
  MapPin,
  User,
  Calendar,
  FileCheck,
  Crown,
  ShoppingCart,
  Upload,
  ChevronUp,
  Images,
  Edit2,
  Check,
  QrCode,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useThemeMode } from '../contexts/ThemeContext';
import { useCanEdit, useCanUpload } from '../hooks/usePermissions';
import { useInventory } from '../hooks/useInventory';
import { calculateTrustScore, getTrustBadge } from '../utils/trustScore';
import { TrustBadgeCompact } from './TrustBadge';
import { extractVideoThumbnail } from '../utils/videoStorage';
import { MediaGallery, ImageCropper } from './media';
import DriveFolderInfo from './media/DriveFolderInfo';
import type { MediaItem } from './media/types';
import { PriceDisplay } from './PriceDisplay';
import { getColorDot, getQualityBadge } from '../utils/formatting';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';
// Design System Tokens
import { emeraldCore, goldAccent, surfacesLight, surfacesDark } from '../design-system/tokens/colors';
import { emeraldGradients, buttonGradients } from '../design-system/tokens/gradients';
import { emeraldShadows } from '../design-system/tokens/shadows';

// Convert File to data URL (base64) - more reliable than blob URLs in production
const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

// Base URL for the Tierra Madre Studio app
const STUDIO_BASE_URL = 'https://tierra-madre-studio.vercel.app';

export default function ProductDetail() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const canEdit = useCanEdit();
  const canUpload = useCanUpload();
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Image cropper state (kept for potential future use)
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<{ file: File; isVideo: boolean }[]>([]);
  const [currentCropIndex, setCurrentCropIndex] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [uploadCategory, _setUploadCategory] = useState<MediaItem['category']>('hero');

  const { inventory, updateImage, updateVideo, removeImage, updateMediaItems, getMediaItems, isLoadingSheets } = useInventory();

  // Scroll to top when navigating to this page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [itemId]);

  // Find the product
  const product = useMemo(() => {
    return inventory.find(item => item.item.toString() === itemId);
  }, [inventory, itemId]);

  // Calculate trust score
  const trustScore = useMemo(() => {
    return product ? calculateTrustScore(product) : null;
  }, [product]);

  const trustBadge = trustScore ? getTrustBadge(trustScore.overall) : null;

  // Get display name early for use in effects
  const displayName = useMemo(() => {
    if (!product) return '';
    return product.nombre.replace(/^L:.*?\s/, '').replace(/^L:/, '').trim();
  }, [product]);

  // Load media items for the product from Google Drive folder
  useEffect(() => {
    if (product) {
      const loadMedia = async () => {
        // First, check local cache
        const localItems = getMediaItems ? getMediaItems(product.item) : [];

        if (localItems.length > 0) {
          setMediaItems(localItems);
        } else if (product.imagen) {
          // If no local items but has legacy image, use it temporarily
          const legacyItem: MediaItem = {
            id: `legacy-${product.item}`,
            url: product.imagen,
            type: product.mediaType === 'video' ? 'video' : 'image',
            thumbnailUrl: product.thumbnailUrl,
            category: 'hero',
            alt: displayName || `Producto ${product.item}`,
            order: 0,
          };
          setMediaItems([legacyItem]);
        }

        // Fetch images from Google Drive folder
        try {
          const response = await fetch(`/api/get-drive-images?itemNumber=${product.item}`);
          const data = await response.json();

          if (data.success && data.images && data.images.length > 0) {
            const driveItems: MediaItem[] = data.images.map((img: {
              id: string;
              name: string;
              proxyUrl: string;
              thumbnailUrl: string;
              type: 'image' | 'video';
              order: number;
            }) => ({
              id: img.id,
              url: img.proxyUrl, // Use proxy URL for reliable access
              type: img.type,
              thumbnailUrl: img.thumbnailUrl,
              category: 'hero' as const,
              alt: img.name || `${displayName} - ${img.order + 1}`,
              order: img.order,
            }));
            setMediaItems(driveItems);

            // Update local cache
            if (updateMediaItems) {
              updateMediaItems(product.item, driveItems);
            }
          }
        } catch (error) {
          console.error('Error fetching Drive images:', error);
          // Keep showing local/legacy items if Drive fetch fails
        }
      };

      loadMedia();
    }
  }, [product, getMediaItems, updateMediaItems, displayName]);

  // Upload files to Cloudinary (kept for potential cropper use)
  const uploadFiles = useCallback(async (
    files: { file: File | Blob; isVideo: boolean }[],
    category: MediaItem['category']
  ) => {
    if (!product) return;

    const newItems: MediaItem[] = [];

    for (const { file, isVideo } of files) {
      try {
        // Convert Blob to File if needed
        const fileToUpload = file instanceof File
          ? file
          : new File([file], `cropped-${Date.now()}.jpg`, { type: 'image/jpeg' });

        // Upload directly to Cloudinary (no size limits)
        const mediaUrl = await uploadToCloudinary(fileToUpload, {
          folder: `tierramadre/product-${product.item}`,
        });

        let thumbnailUrl: string | undefined;
        if (isVideo && file instanceof File) {
          thumbnailUrl = await extractVideoThumbnail(file, 1);
        }

        const newItem: MediaItem = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          url: mediaUrl,
          type: isVideo ? 'video' : 'image',
          thumbnailUrl,
          category,
          alt: `${displayName} - ${category}`,
          order: mediaItems.length + newItems.length,
        };

        newItems.push(newItem);
      } catch (error) {
        console.error('Error uploading media:', error);
        alert(error instanceof Error ? error.message : 'Error al subir el archivo');
      }
    }

    if (newItems.length > 0) {
      const updatedItems = [...mediaItems, ...newItems];
      setMediaItems(updatedItems);
      if (updateMediaItems) {
        updateMediaItems(product.item, updatedItems);
      }
      // Also update legacy image field with first item
      if (updatedItems.length > 0) {
        const firstItem = updatedItems[0];
        if (firstItem.type === 'video') {
          updateVideo(product.item, firstItem.url, firstItem.thumbnailUrl || '');
        } else {
          updateImage(product.item, firstItem.url);
        }
      }
    }

    setShowUploadZone(false);
  }, [product, mediaItems, updateMediaItems, updateImage, updateVideo, displayName]);

  // Handle crop completion
  const handleCropComplete = useCallback(async (croppedBlob: Blob) => {
    // Replace the current image with cropped version
    const updatedFiles = [...pendingFiles];
    updatedFiles[currentCropIndex] = {
      file: croppedBlob as unknown as File,
      isVideo: false,
    };
    setPendingFiles(updatedFiles);

    // Find next image to crop
    let nextImageIndex = -1;
    for (let i = currentCropIndex + 1; i < updatedFiles.length; i++) {
      if (!updatedFiles[i].isVideo && updatedFiles[i].file instanceof File) {
        nextImageIndex = i;
        break;
      }
    }

    if (nextImageIndex >= 0) {
      // More images to crop - use data URL for reliability
      try {
        const dataUrl = await fileToDataURL(updatedFiles[nextImageIndex].file as File);
        setImageToCrop(dataUrl);
        setCurrentCropIndex(nextImageIndex);
      } catch (error) {
        console.error('Error reading next file:', error);
        // Continue with upload even if one image fails
        setCropperOpen(false);
        setImageToCrop(null);
        await uploadFiles(updatedFiles, uploadCategory);
        setPendingFiles([]);
      }
    } else {
      // All images cropped, upload all files
      setCropperOpen(false);
      setImageToCrop(null);
      await uploadFiles(updatedFiles, uploadCategory);
      setPendingFiles([]);
    }
  }, [pendingFiles, currentCropIndex, uploadCategory, uploadFiles]);

  // Handle cropper close without completing
  const handleCropperClose = useCallback(() => {
    setCropperOpen(false);
    setImageToCrop(null);
    setPendingFiles([]);
  }, []);

  // Handle media delete
  const handleMediaDelete = useCallback(async (itemId: string) => {
    const updatedItems = mediaItems.filter(item => item.id !== itemId);
    setMediaItems(updatedItems);
    if (product && updateMediaItems) {
      updateMediaItems(product.item, updatedItems);
      // Update legacy image
      if (updatedItems.length > 0) {
        const firstItem = updatedItems[0];
        if (firstItem.type === 'video') {
          updateVideo(product.item, firstItem.url, firstItem.thumbnailUrl || '');
        } else {
          updateImage(product.item, firstItem.url);
        }
      } else {
        removeImage(product.item);
      }
    }
  }, [product, mediaItems, updateMediaItems, updateImage, updateVideo, removeImage]);

  // Refresh images from Google Drive folder
  const handleRefreshDriveImages = useCallback(async () => {
    if (!product) return;

    try {
      const response = await fetch(`/api/get-drive-images?itemNumber=${product.item}`);
      const data = await response.json();

      if (data.success && data.images) {
        const driveItems: MediaItem[] = data.images.map((img: {
          id: string;
          name: string;
          proxyUrl: string;
          thumbnailUrl: string;
          type: 'image' | 'video';
          order: number;
        }) => ({
          id: img.id,
          url: img.proxyUrl,
          type: img.type,
          thumbnailUrl: img.thumbnailUrl,
          category: 'hero' as const,
          alt: img.name || `${displayName} - ${img.order + 1}`,
          order: img.order,
        }));
        setMediaItems(driveItems);

        if (updateMediaItems) {
          updateMediaItems(product.item, driveItems);
        }

        // Update legacy image field with first item
        if (driveItems.length > 0) {
          const firstItem = driveItems[0];
          if (firstItem.type === 'video') {
            updateVideo(product.item, firstItem.url, firstItem.thumbnailUrl || '');
          } else {
            updateImage(product.item, firstItem.url);
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing Drive images:', error);
    }
  }, [product, displayName, updateMediaItems, updateImage, updateVideo]);

  // Show loading state while inventory is loading
  if (isLoadingSheets && !product) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3 }, py: 8, textAlign: 'center' }}>
        <Gem size={64} color={emeraldCore.primary} style={{ marginBottom: 16, opacity: 0.7 }} />
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: theme.palette.text.secondary }}>
          Cargando producto...
        </Typography>
      </Box>
    );
  }

  if (!product) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3 }, py: 8, textAlign: 'center' }}>
        <Package size={64} color={surfacesLight.text.secondary} style={{ marginBottom: 16, opacity: 0.5 }} />
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
          Producto no encontrado
        </Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 3 }}>
          El producto que buscas no existe o ha sido eliminado.
        </Typography>
        <Button
          variant="contained"
          startIcon={<ArrowLeft size={18} />}
          onClick={() => navigate('/inventory')}
          sx={{
            background: buttonGradients.primary,
            color: '#FFFFFF',
          }}
        >
          Volver al Inventario
        </Button>
      </Box>
    );
  }

  const quality = getQualityBadge(product.calidad);
  const colorDot = getColorDot(product.color);
  const weight = typeof product.peso === 'number' ? `${product.peso} ct` : product.metalType;
  const isAvailable = product.estado === 'DISPONIBLE';

  return (
    <Box sx={{
      maxWidth: 1400,
      mx: 'auto',
      px: { xs: 2, sm: 3, md: 4 },
      py: { xs: 2, sm: 3 },
      pb: { xs: 'calc(16px + env(safe-area-inset-bottom))', sm: 3 }
    }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/')}
          sx={{
            color: theme.palette.text.secondary,
            textDecoration: 'none',
            '&:hover': { color: emeraldCore.dark },
          }}
        >
          Inicio
        </Link>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/inventory')}
          sx={{
            color: theme.palette.text.secondary,
            textDecoration: 'none',
            '&:hover': { color: emeraldCore.dark },
          }}
        >
          Inventario
        </Link>
        <Typography variant="body2" color="text.primary">
          {displayName}
        </Typography>
      </Breadcrumbs>

      {/* Back Button */}
      <Button
        startIcon={<ArrowLeft size={18} />}
        onClick={() => navigate('/inventory')}
        sx={{
          mb: 3,
          color: theme.palette.text.secondary,
          '&:hover': {
            bgcolor: isLight ? alpha(emeraldCore.dark, 0.08) : alpha(emeraldCore.dark, 0.15),
            color: emeraldCore.dark,
          },
        }}
      >
        Volver al Inventario
      </Button>

      <Grid container spacing={{ xs: 3, md: 4 }}>
        {/* Left Column - Image & Gallery */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
              bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.primary,
              position: 'relative',
            }}
          >
            {/* Status Badge and Edit Toggle */}
            <Box
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              {/* Edit Toggle - Only show for users with edit permission */}
              {canEdit && (
                <Tooltip title={isEditing ? 'Terminar edición' : 'Editar galería'}>
                  <IconButton
                    size="small"
                    onClick={() => setIsEditing(!isEditing)}
                    sx={{
                      bgcolor: isEditing ? emeraldCore.dark : 'rgba(0,0,0,0.5)',
                      color: '#fff',
                      '&:hover': {
                        bgcolor: isEditing ? emeraldCore.darker : 'rgba(0,0,0,0.7)',
                      },
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    {isEditing ? <Check size={18} /> : <Edit2 size={18} />}
                  </IconButton>
                </Tooltip>
              )}
              <Chip
                label={isAvailable ? 'Disponible' : 'Vendido'}
                color={isAvailable ? 'success' : 'default'}
                sx={{
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
              />
            </Box>

            {/* Media Gallery Carousel */}
            {mediaItems.length > 0 ? (
              <MediaGallery
                media={mediaItems}
                productName={displayName}
                onAddMedia={canUpload ? () => setShowUploadZone(true) : undefined}
                isEditing={isEditing && canEdit}
              />
            ) : (
              <Box
                sx={{
                  width: '100%',
                  height: { xs: 300, sm: 400, md: 500 },
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha(colorDot, 0.1),
                  position: 'relative',
                }}
              >
                <Gem size={120} color={colorDot} style={{ opacity: 0.3 }} />
                <Typography
                  variant="body2"
                  sx={{
                    mt: 2,
                    color: theme.palette.text.secondary,
                  }}
                >
                  Sin imágenes
                </Typography>
                {canUpload && (
                  <Button
                    startIcon={<Upload size={18} />}
                    variant="contained"
                    onClick={() => setShowUploadZone(true)}
                    sx={{
                      mt: 2,
                      bgcolor: emeraldCore.dark,
                      '&:hover': { bgcolor: emeraldCore.darker },
                    }}
                  >
                    Subir Imágenes
                  </Button>
                )}
              </Box>
            )}
          </Paper>

          {/* Upload Zone Toggle - Only show for users with upload permission */}
          {mediaItems.length > 0 && canUpload && (
            <Button
              fullWidth
              variant="outlined"
              startIcon={showUploadZone ? <ChevronUp size={18} /> : <Images size={18} />}
              onClick={() => setShowUploadZone(!showUploadZone)}
              sx={{
                mt: 2,
                borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
                color: theme.palette.text.secondary,
                '&:hover': {
                  borderColor: emeraldCore.dark,
                  color: emeraldCore.dark,
                  bgcolor: alpha(emeraldCore.dark, 0.08),
                },
              }}
            >
              {showUploadZone ? 'Ocultar zona de subida' : 'Agregar más imágenes'}
            </Button>
          )}

          {/* Collapsible Drive Folder Info - Only for users with upload permission */}
          {canUpload && (
            <Collapse in={showUploadZone}>
              <Box sx={{ mt: 2 }}>
                <DriveFolderInfo
                  itemNumber={product.item}
                  media={mediaItems}
                  onRefresh={handleRefreshDriveImages}
                  onDelete={handleMediaDelete}
                />
              </Box>
            </Collapse>
          )}
        </Grid>

        {/* Right Column - Product Details */}
        <Grid item xs={12} md={6}>
          {/* Header */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {product.isJewelry && <Crown size={20} color={goldAccent.primary} />}
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}>
                #{product.item}
              </Typography>
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.2 }}>
              {displayName}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              <Chip
                label={product.isJewelry ? 'Joyería' : 'Gema'}
                size="small"
                sx={{ bgcolor: isLight ? surfacesLight.background.secondary : surfacesDark.background.secondary }}
              />
              <Chip
                label={quality.label}
                size="small"
                sx={{
                  bgcolor: quality.bg,
                  color: quality.color,
                  border: `1px solid ${quality.border}`,
                  fontWeight: 600,
                }}
              />
              {product.cantidad > 1 && (
                <Chip
                  label={`Lote x${product.cantidad}`}
                  size="small"
                  sx={{
                    bgcolor: alpha('#8B5CF6', 0.1),
                    color: '#8B5CF6',  // Purple for lot indicator - unique accent
                    fontWeight: 600,
                  }}
                />
              )}
            </Box>

            {/* Price - Dual display (International + National) */}
            <PriceDisplay price={product.precioCOP} precioInternacional={product.precioInternacional} />
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Specifications */}
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Especificaciones
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            {/* Color */}
            <Grid item xs={6}>
              <Card
                elevation={0}
                sx={{
                  bgcolor: isLight ? surfacesLight.background.tertiary : surfacesDark.background.secondary,
                  border: '1px solid',
                  borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Palette size={16} color={theme.palette.text.secondary} />
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                      Color
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {product.color}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Weight */}
            <Grid item xs={6}>
              <Card
                elevation={0}
                sx={{
                  bgcolor: isLight ? surfacesLight.background.tertiary : surfacesDark.background.secondary,
                  border: '1px solid',
                  borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Gem size={16} color={theme.palette.text.secondary} />
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                      {product.isJewelry ? 'Metal' : 'Peso'}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {weight}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Shape/Talla */}
            {product.talla && product.talla !== '-' && (
              <Grid item xs={6}>
                <Card
                  elevation={0}
                  sx={{
                    bgcolor: isLight ? '#F9FAFB' : '#2C2C2E',
                    border: '1px solid',
                    borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Ruler size={16} color={theme.palette.text.secondary} />
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                        {product.isJewelry ? 'Talla' : 'Corte'}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {product.talla}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Measurements */}
            {product.medidas && product.medidas !== '-' && product.medidas !== 'Anillo' && (
              <Grid item xs={6}>
                <Card
                  elevation={0}
                  sx={{
                    bgcolor: isLight ? '#F9FAFB' : '#2C2C2E',
                    border: '1px solid',
                    borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Ruler size={16} color={theme.palette.text.secondary} />
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                        Medidas ({product.medidas})
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {product.medidasValores
                        ? product.medidasValores.replace(/\n/g, ' x ') + ' mm'
                        : product.medidas + ' mm'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Quality */}
            <Grid item xs={12}>
              <Card
                elevation={0}
                sx={{
                  bgcolor: isLight ? surfacesLight.background.tertiary : surfacesDark.background.secondary,
                  border: '1px solid',
                  borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Award size={16} color={theme.palette.text.secondary} />
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                      Calidad
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {product.calidad}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Trust Score */}
          {trustScore && trustBadge && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Certificación del Producto
              </Typography>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha(trustBadge.color, 0.08),
                  border: '1px solid',
                  borderColor: alpha(trustBadge.color, 0.2),
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Autenticidad de la Esmeralda
                  </Typography>
                  <TrustBadgeCompact score={trustScore} />
                </Box>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', mb: 1 }}>
                  Evaluación basada en origen, calidad y certificaciones
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<FileCheck size={14} />}
                  sx={{
                    borderColor: trustBadge.color,
                    color: trustBadge.color,
                    '&:hover': {
                      bgcolor: alpha(trustBadge.color, 0.08),
                      borderColor: trustBadge.color,
                    },
                  }}
                >
                  Ver Certificaciones
                </Button>
              </Paper>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Additional Info */}
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Información Adicional
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <MapPin size={18} color={surfacesLight.text.secondary} />
              <Box>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block' }}>
                  Ubicación
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {product.ubicacion}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <User size={18} color={surfacesLight.text.secondary} />
              <Box>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block' }}>
                  Asesor
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {product.asesor}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Calendar size={18} color={surfacesLight.text.secondary} />
              <Box>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block' }}>
                  Fecha de Ingreso
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {product.fechaIngreso}
                </Typography>
              </Box>
            </Box>

            {/* QR Code Section */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mt: 1 }}>
              <QrCode size={18} color={surfacesLight.text.secondary} style={{ marginTop: 4 }} />
              <Box>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', mb: 1 }}>
                  Código QR del Producto
                </Typography>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: '#FFFFFF',
                    border: '1px solid',
                    borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
                    display: 'inline-block',
                  }}
                >
                  <QRCodeSVG
                    value={`${STUDIO_BASE_URL}/product/${itemId}`}
                    size={80}
                    level="H"
                    fgColor={emeraldCore.darkest}
                    bgColor="#FFFFFF"
                    style={{ display: 'block' }}
                  />
                </Paper>
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.text.secondary,
                    display: 'block',
                    mt: 0.5,
                    fontSize: '0.65rem',
                    maxWidth: 120,
                    wordBreak: 'break-all',
                  }}
                >
                  /product/{itemId}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* CTA Buttons */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mt: 4 }}>
            <Button
              variant="contained"
              size="large"
              fullWidth
              disabled={!isAvailable}
              startIcon={<ShoppingCart size={20} />}
              sx={{
                background: isAvailable ? buttonGradients.primary : undefined,
                color: '#FFFFFF',
                py: 1.5,
                minHeight: 48,
                fontWeight: 600,
                boxShadow: isAvailable ? emeraldShadows.primary : undefined,
                '&:hover': {
                  background: isAvailable ? emeraldGradients.deep : undefined,
                  boxShadow: isAvailable ? emeraldShadows.lg : undefined,
                },
              }}
            >
              {isAvailable ? 'Añadir al Carrito' : 'Vendido'}
            </Button>
            <Button
              variant="outlined"
              size="large"
              sx={{
                borderColor: emeraldCore.dark,
                color: emeraldCore.dark,
                py: 1.5,
                minHeight: 48,
                fontWeight: 600,
                '&:hover': {
                  borderColor: emeraldCore.darker,
                  bgcolor: alpha(emeraldCore.dark, 0.08),
                },
              }}
            >
              Contactar
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* Image Cropper Dialog */}
      {imageToCrop && (
        <ImageCropper
          open={cropperOpen}
          imageSrc={imageToCrop}
          onClose={handleCropperClose}
          onCropComplete={handleCropComplete}
        />
      )}
    </Box>
  );
}
