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
  DollarSign,
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
} from 'lucide-react';
import { useThemeMode } from '../contexts/ThemeContext';
import { useInventory } from '../hooks/useInventory';
import { calculateTrustScore, getTrustBadge } from '../utils/trustScore';
import { TrustBadgeCompact } from './TrustBadge';
import { extractVideoThumbnail } from '../utils/videoStorage';
import { MediaGallery, MediaUploadZone } from './media';
import type { MediaItem } from './media/types';

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'dyam6g2os';
const CLOUDINARY_UPLOAD_PRESET = 'tierramadre';

// Upload to Cloudinary - direct browser upload, no size limits
const uploadToCloudinary = async (file: File, itemNumber: number): Promise<string> => {
  const isVideo = file.type.startsWith('video/');
  const resourceType = isVideo ? 'video' : 'image';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', `tierramadre/product-${itemNumber}`);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Error al subir' } }));
    throw new Error(error.error?.message || 'Error al subir a Cloudinary');
  }

  const data = await response.json();
  return data.secure_url;
};

// Format currency in COP
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Get color dot style
const getColorDot = (color: string): string => {
  const colorMap: Record<string, string> = {
    'Verde Vivido': '#059669',
    'Verde Muzo': '#065F46',
    'Verde Limón': '#84CC16',
    'Verde Menta': '#34D399',
    'Verde Natural': '#22C55E',
  };
  return colorMap[color] || '#6B7280';
};

// Get quality badge style
const getQualityBadge = (calidad: string): { label: string; bg: string; color: string; border: string } => {
  if (calidad.includes('SuperFina') || calidad === 'Fina') {
    return {
      label: 'Premium',
      bg: '#FEF3C7',
      color: '#92400E',
      border: '#F59E0B',
    };
  }
  if (calidad.includes('Superior')) {
    return {
      label: 'Superior',
      bg: '#DBEAFE',
      color: '#1E3A8A',
      border: '#3B82F6',
    };
  }
  if (calidad.includes('Fina')) {
    return {
      label: 'Fina',
      bg: '#F3E8FF',
      color: '#6B21A8',
      border: '#A855F7',
    };
  }
  return {
    label: 'Comercial',
    bg: '#F3F4F6',
    color: '#374151',
    border: '#9CA3AF',
  };
};

export default function ProductDetail() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const { inventory, updateImage, updateVideo, removeImage, updateMediaItems, getMediaItems, fetchCloudGallery } = useInventory();

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

  // Load media items for the product (local first, then cloud sync)
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

        // Then fetch from cloud to sync
        if (fetchCloudGallery) {
          const cloudItems = await fetchCloudGallery(product.item);
          if (cloudItems.length > 0) {
            setMediaItems(cloudItems);
          }
        }
      };

      loadMedia();
    }
  }, [product, getMediaItems, fetchCloudGallery, displayName]);

  // Handle multi-media upload (for MediaUploadZone)
  const handleMediaUpload = useCallback(async (files: File[], category: MediaItem['category']) => {
    if (!product) return;

    const newItems: MediaItem[] = [];

    for (const file of files) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (!isImage && !isVideo) continue;

      try {
        // Upload directly to Cloudinary (no size limits)
        const mediaUrl = await uploadToCloudinary(file, product.item);

        let thumbnailUrl: string | undefined;
        if (isVideo) {
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

  // Handle media reorder
  const handleMediaReorder = useCallback((reorderedItems: MediaItem[]) => {
    setMediaItems(reorderedItems);
    if (product && updateMediaItems) {
      updateMediaItems(product.item, reorderedItems);
      // Update legacy image with first item
      if (reorderedItems.length > 0) {
        const firstItem = reorderedItems[0];
        if (firstItem.type === 'video') {
          updateVideo(product.item, firstItem.url, firstItem.thumbnailUrl || '');
        } else {
          updateImage(product.item, firstItem.url);
        }
      }
    }
  }, [product, updateMediaItems, updateImage, updateVideo]);

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

  if (!product) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3 }, py: 8, textAlign: 'center' }}>
        <Package size={64} color="#9CA3AF" style={{ marginBottom: 16, opacity: 0.5 }} />
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
          Producto no encontrado
        </Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 3 }}>
          El producto que buscas no existe o ha sido eliminado.
        </Typography>
        <Button
          variant="contained"
          startIcon={<ArrowLeft size={18} />}
          onClick={() => navigate('/inventario')}
          sx={{
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
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
            '&:hover': { color: '#059669' },
          }}
        >
          Inicio
        </Link>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/inventario')}
          sx={{
            color: theme.palette.text.secondary,
            textDecoration: 'none',
            '&:hover': { color: '#059669' },
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
        onClick={() => navigate('/inventario')}
        sx={{
          mb: 3,
          color: theme.palette.text.secondary,
          '&:hover': {
            bgcolor: isLight ? alpha('#059669', 0.08) : alpha('#059669', 0.15),
            color: '#059669',
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
              borderColor: isLight ? '#E5E7EB' : '#2C2C2E',
              bgcolor: isLight ? '#FFFFFF' : '#1C1C1E',
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
              {/* Edit Toggle */}
              <Tooltip title={isEditing ? 'Terminar edición' : 'Editar galería'}>
                <IconButton
                  size="small"
                  onClick={() => setIsEditing(!isEditing)}
                  sx={{
                    bgcolor: isEditing ? '#059669' : 'rgba(0,0,0,0.5)',
                    color: '#fff',
                    '&:hover': {
                      bgcolor: isEditing ? '#047857' : 'rgba(0,0,0,0.7)',
                    },
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  {isEditing ? <Check size={18} /> : <Edit2 size={18} />}
                </IconButton>
              </Tooltip>
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
                onAddMedia={() => setShowUploadZone(true)}
                isEditing={isEditing}
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
                <Button
                  startIcon={<Upload size={18} />}
                  variant="contained"
                  onClick={() => setShowUploadZone(true)}
                  sx={{
                    mt: 2,
                    bgcolor: '#059669',
                    '&:hover': { bgcolor: '#047857' },
                  }}
                >
                  Subir Imágenes
                </Button>
              </Box>
            )}
          </Paper>

          {/* Upload Zone Toggle */}
          {mediaItems.length > 0 && (
            <Button
              fullWidth
              variant="outlined"
              startIcon={showUploadZone ? <ChevronUp size={18} /> : <Images size={18} />}
              onClick={() => setShowUploadZone(!showUploadZone)}
              sx={{
                mt: 2,
                borderColor: isLight ? '#E5E7EB' : '#3C3C3E',
                color: theme.palette.text.secondary,
                '&:hover': {
                  borderColor: '#059669',
                  color: '#059669',
                  bgcolor: alpha('#059669', 0.08),
                },
              }}
            >
              {showUploadZone ? 'Ocultar zona de subida' : 'Agregar más imágenes'}
            </Button>
          )}

          {/* Collapsible Upload Zone */}
          <Collapse in={showUploadZone}>
            <Box sx={{ mt: 2 }}>
              <MediaUploadZone
                media={mediaItems}
                onUpload={handleMediaUpload}
                onDelete={handleMediaDelete}
                onReorder={handleMediaReorder}
                maxFiles={10}
              />
            </Box>
          </Collapse>
        </Grid>

        {/* Right Column - Product Details */}
        <Grid item xs={12} md={6}>
          {/* Header */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {product.isJewelry && <Crown size={20} color="#D4AF37" />}
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
                sx={{ bgcolor: isLight ? '#F3F4F6' : '#2C2C2E' }}
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
                    color: '#8B5CF6',
                    fontWeight: 600,
                  }}
                />
              )}
            </Box>

            {/* Price */}
            <Typography
              variant="h2"
              sx={{
                fontWeight: 700,
                color: '#059669',
                mb: 0.5,
                fontFamily: 'system-ui',
                letterSpacing: '-0.02em',
              }}
            >
              {formatCurrency(product.precioCOP)}
            </Typography>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              Precio en pesos colombianos
            </Typography>
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
                  bgcolor: isLight ? '#F9FAFB' : '#2C2C2E',
                  border: '1px solid',
                  borderColor: isLight ? '#E5E7EB' : '#3C3C3E',
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Palette size={16} color={theme.palette.text.secondary} />
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                      Color
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: colorDot }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {product.color}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Weight */}
            <Grid item xs={6}>
              <Card
                elevation={0}
                sx={{
                  bgcolor: isLight ? '#F9FAFB' : '#2C2C2E',
                  border: '1px solid',
                  borderColor: isLight ? '#E5E7EB' : '#3C3C3E',
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
                    borderColor: isLight ? '#E5E7EB' : '#3C3C3E',
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
                    borderColor: isLight ? '#E5E7EB' : '#3C3C3E',
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Ruler size={16} color={theme.palette.text.secondary} />
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                        Medidas
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {product.medidas} mm
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
                  bgcolor: isLight ? '#F9FAFB' : '#2C2C2E',
                  border: '1px solid',
                  borderColor: isLight ? '#E5E7EB' : '#3C3C3E',
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
              <MapPin size={18} color="#9CA3AF" />
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
              <User size={18} color="#9CA3AF" />
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
              <Calendar size={18} color="#9CA3AF" />
              <Box>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block' }}>
                  Fecha de Ingreso
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {product.fechaIngreso}
                </Typography>
              </Box>
            </Box>

            {product.costoTM && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <DollarSign size={18} color="#9CA3AF" />
                <Box>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block' }}>
                    Costo TM
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {formatCurrency(product.costoTM)}
                  </Typography>
                </Box>
              </Box>
            )}
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
                background: isAvailable
                  ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                  : undefined,
                color: '#FFFFFF',
                py: 1.5,
                minHeight: 48,
                fontWeight: 600,
                boxShadow: isAvailable ? '0 4px 12px rgba(16, 185, 129, 0.3)' : undefined,
                '&:hover': {
                  background: isAvailable
                    ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                    : undefined,
                  boxShadow: isAvailable ? '0 6px 16px rgba(16, 185, 129, 0.4)' : undefined,
                },
              }}
            >
              {isAvailable ? 'Añadir al Carrito' : 'Vendido'}
            </Button>
            <Button
              variant="outlined"
              size="large"
              sx={{
                borderColor: '#059669',
                color: '#059669',
                py: 1.5,
                minHeight: 48,
                fontWeight: 600,
                '&:hover': {
                  borderColor: '#047857',
                  bgcolor: alpha('#059669', 0.08),
                },
              }}
            >
              Contactar
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
