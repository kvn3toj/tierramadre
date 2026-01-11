import { useParams, useNavigate } from 'react-router-dom';
import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  alpha,
  useTheme,
  Collapse,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ChevronLeft,
  Package,
  Gem,
  Ruler,
  Palette,
  Award,
  MapPin,
  User,
  Calendar,
  Crown,
  ShoppingCart,
  ChevronUp,
  FolderOpen,
  Edit2,
  Check,
  QrCode,
  Share2,
} from 'lucide-react';
import { useShare } from '../hooks/useShare';
import { useHaptics } from '../hooks/useHaptics';
import { useProductView } from '../hooks/useProductView';
import { QRCodeSVG } from 'qrcode.react';
import { useThemeMode } from '../contexts/ThemeContext';
import { useCanEdit, useIsAdmin } from '../hooks/usePermissions';
import { useIsGuest } from '../hooks/useAuth';
import { useTreasure } from '../hooks/useTreasure';
import { MemberBenefitsTeaser } from './guest';
import { MediaGallery } from './media';
import DriveFolderInfo from './media/DriveFolderInfo';
import type { MediaItem } from './media/types';
import { PriceDisplay } from './PriceDisplay';
import { getColorDot, getQualityBadge } from '../utils/formatting';
import { createLogger } from '../utils/logger';

const log = createLogger('ProductDetail');
// Design System Tokens
import { emeraldCore, goldAccent, surfacesLight, surfacesDark } from '../design-system/tokens/colors';
import { emeraldGradients, buttonGradients } from '../design-system/tokens/gradients';
import { emeraldShadows } from '../design-system/tokens/shadows';
import { accentColors, lightTokens } from '../design-system';

// Base URL for the Tierra Madre Studio app
const STUDIO_BASE_URL = 'https://tierra-madre-studio.vercel.app';

export default function ProductDetail() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const canEdit = useCanEdit();
  const isAdmin = useIsAdmin();
  const isGuest = useIsGuest();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showDriveInfo, setShowDriveInfo] = useState(false);

  const { treasure, updateImage, updateVideo, removeImage, updateMediaItems, getMediaItems, isLoadingSheets } = useTreasure();
  const { shareProduct, isNativeShareSupported } = useShare();
  const { trigger: triggerHaptic } = useHaptics();

  // Scroll to top when navigating to this page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [itemId]);

  // Find the product
  const product = useMemo(() => {
    return treasure.find(item => item.item.toString() === itemId);
  }, [treasure, itemId]);

  // Get display name early for use in effects
  const displayName = useMemo(() => {
    if (!product) return '';
    return product.nombre.replace(/^L:.*?\s/, '').replace(/^L:/, '').trim();
  }, [product]);

  // Track product view (once per session, fire-and-forget)
  useProductView({
    itemId: product?.item || 0,
    productName: displayName,
    enabled: !!product && !isLoadingSheets,
  });

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
          log.error('Error fetching Drive images:', error);
          // Keep showing local/legacy items if Drive fetch fails
        }
      };

      loadMedia();
    }
  }, [product, getMediaItems, updateMediaItems, displayName]);

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
      log.error('Error refreshing Drive images:', error);
    }
  }, [product, displayName, updateMediaItems, updateImage, updateVideo]);

  // Handle share product
  const handleShareProduct = useCallback(async () => {
    if (!product) return;

    triggerHaptic('light');
    const result = await shareProduct(product);

    if (result.success) {
      triggerHaptic('success');
      if (result.method === 'clipboard') {
        // Could show a toast here: "Enlace copiado al portapapeles"
        log.debug('Product link copied to clipboard');
      }
    }
  }, [product, shareProduct, triggerHaptic]);

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
          startIcon={<ChevronLeft size={18} />}
          onClick={() => navigate('/treasure')}
          sx={{
            background: buttonGradients.primary,
            color: lightTokens.text.inverse,
          }}
        >
          Volver a Tesoros
        </Button>
      </Box>
    );
  }

  const quality = getQualityBadge(product.calidad);
  const colorDot = getColorDot(product.color);
  const weight = typeof product.peso === 'number' ? `${product.peso} ct` : product.metalType;
  const isAvailable = product.estado === 'DISPONIBLE';

  // iOS HIG colors
  const separatorColor = isLight ? 'rgba(60, 60, 67, 0.12)' : 'rgba(235, 235, 245, 0.12)';
  const secondaryTextColor = isLight ? 'rgba(60, 60, 67, 0.6)' : 'rgba(235, 235, 245, 0.6)';

  return (
    <Box sx={{
      maxWidth: 1400,
      mx: 'auto',
      px: { xs: 0, sm: 3, md: 4 },
      pb: { xs: 'calc(12px + env(safe-area-inset-bottom))', sm: 3 }
    }}>
      <Grid container spacing={{ xs: 1.5, md: 3 }}>
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
            {/* Edit Toggle - Only show for users with edit permission, top-left minimal */}
            {canEdit && (
              <Tooltip title={isEditing ? 'Terminar edición' : 'Editar galería'}>
                <IconButton
                  size="small"
                  onClick={() => setIsEditing(!isEditing)}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    zIndex: 10,
                    width: 28,
                    height: 28,
                    bgcolor: isEditing
                      ? 'rgba(52, 199, 89, 0.9)'
                      : 'rgba(0, 0, 0, 0.3)',
                    color: '#FFFFFF',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    '&:hover': {
                      bgcolor: isEditing
                        ? 'rgba(52, 199, 89, 1)'
                        : 'rgba(0, 0, 0, 0.5)',
                    },
                  }}
                >
                  {isEditing ? <Check size={14} /> : <Edit2 size={14} />}
                </IconButton>
              </Tooltip>
            )}

            {/* Media Gallery Carousel */}
            {mediaItems.length > 0 ? (
              <MediaGallery
                media={mediaItems}
                productName={displayName}
                onAddMedia={isAdmin ? () => setShowDriveInfo(true) : undefined}
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
                {isAdmin && (
                  <Button
                    startIcon={<FolderOpen size={18} />}
                    variant="contained"
                    onClick={() => setShowDriveInfo(true)}
                    sx={{
                      mt: 2,
                      bgcolor: emeraldCore.dark,
                      '&:hover': { bgcolor: emeraldCore.darker },
                    }}
                  >
                    Ver Carpeta en Drive
                  </Button>
                )}
              </Box>
            )}
          </Paper>

          {/* Drive Folder Toggle - Admin only for verification and gallery management */}
          {mediaItems.length > 0 && isAdmin && (
            <Button
              fullWidth
              variant="outlined"
              startIcon={showDriveInfo ? <ChevronUp size={18} /> : <FolderOpen size={18} />}
              onClick={() => setShowDriveInfo(!showDriveInfo)}
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
              {showDriveInfo ? 'Ocultar carpeta de Drive' : 'Ver carpeta en Google Drive'}
            </Button>
          )}

          {/* Collapsible Drive Folder Info - Admin only */}
          {isAdmin && (
            <Collapse in={showDriveInfo}>
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
          <Box sx={{ px: { xs: 2, sm: 0 } }}>
            {/* Header - iOS Large Title Style */}
            <Box sx={{ mb: 2 }}>
              {/* Product Name - Large Title (28pt for better density) */}
              <Typography
                sx={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: theme.palette.text.primary,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.15,
                  mb: 0.5,
                }}
              >
                {displayName}
              </Typography>

              {/* Inline metadata - iOS secondary style with status */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mb: 1.5 }}>
                {product.isJewelry && <Crown size={14} color={goldAccent.primary} />}
                <Typography
                  component="span"
                  sx={{
                    fontSize: '13px',
                    color: secondaryTextColor,
                    fontWeight: 400,
                  }}
                >
                  {product.isJewelry ? 'Joyería' : 'Gema'}
                </Typography>
                <Typography component="span" sx={{ color: secondaryTextColor, fontSize: '13px', opacity: 0.5 }}>·</Typography>
                <Typography
                  component="span"
                  sx={{
                    fontSize: '13px',
                    color: quality.color,
                    fontWeight: 500,
                  }}
                >
                  {quality.label}
                </Typography>
                <Typography component="span" sx={{ color: secondaryTextColor, fontSize: '13px', opacity: 0.5 }}>·</Typography>
                <Typography
                  component="span"
                  sx={{
                    fontSize: '13px',
                    color: isAvailable ? 'rgb(52, 199, 89)' : secondaryTextColor,
                    fontWeight: 500,
                  }}
                >
                  {isAvailable ? 'Disponible' : 'Vendido'}
                </Typography>
                {product.cantidad > 1 && (
                  <>
                    <Typography component="span" sx={{ color: secondaryTextColor, fontSize: '13px', opacity: 0.5 }}>·</Typography>
                    <Typography
                      component="span"
                      sx={{
                        fontSize: '13px',
                        color: accentColors.purple.light,
                        fontWeight: 500,
                      }}
                    >
                      Lote x{product.cantidad}
                    </Typography>
                  </>
                )}
              </Box>

              {/* Price - Dual display (International + National) */}
              <PriceDisplay price={product.precioCOP} precioInternacional={product.precioInternacional} />
            </Box>

            {/* iOS Hairline Separator */}
            <Box sx={{ height: '0.5px', bgcolor: separatorColor, my: 2 }} />

            {/* Specifications - iOS List Style */}
            <Typography
              sx={{
                fontSize: '13px',
                fontWeight: 600,
                color: secondaryTextColor,
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
                mb: 0.5,
              }}
            >
              Especificaciones
            </Typography>

            {/* iOS List Rows - Compact */}
            <Box sx={{ mb: 2 }}>
              {/* Color Row */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: 36,
                  py: 0.75,
                  borderBottom: `0.5px solid ${separatorColor}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Palette size={18} color={secondaryTextColor} />
                  <Typography sx={{ fontSize: '15px', color: theme.palette.text.primary }}>
                    Color
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '15px', fontWeight: 500, color: theme.palette.text.primary }}>
                  {product.color}
                </Typography>
              </Box>

              {/* Weight Row */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: 36,
                  py: 0.75,
                  borderBottom: `0.5px solid ${separatorColor}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Gem size={18} color={secondaryTextColor} />
                  <Typography sx={{ fontSize: '15px', color: theme.palette.text.primary }}>
                    {product.isJewelry ? 'Metal' : 'Peso'}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '15px', fontWeight: 500, color: theme.palette.text.primary }}>
                  {weight}
                </Typography>
              </Box>

              {/* Shape/Talla Row */}
              {product.talla && product.talla !== '-' && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: 36,
                    py: 0.75,
                    borderBottom: `0.5px solid ${separatorColor}`,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Ruler size={18} color={secondaryTextColor} />
                    <Typography sx={{ fontSize: '15px', color: theme.palette.text.primary }}>
                      {product.isJewelry ? 'Talla' : 'Corte'}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '15px', fontWeight: 500, color: theme.palette.text.primary }}>
                    {product.talla}
                  </Typography>
                </Box>
              )}

              {/* Measurements Row */}
              {product.medidas && product.medidas !== '-' && product.medidas !== 'Anillo' && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: 36,
                    py: 0.75,
                    borderBottom: `0.5px solid ${separatorColor}`,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Ruler size={18} color={secondaryTextColor} />
                    <Typography sx={{ fontSize: '15px', color: theme.palette.text.primary }}>
                      Medidas
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '15px', fontWeight: 500, color: theme.palette.text.primary, textAlign: 'right' }}>
                    {product.medidasValores
                      ? product.medidasValores.replace(/\n/g, ' × ') + ' mm'
                      : product.medidas + ' mm'}
                  </Typography>
                </Box>
              )}

              {/* Quality Row */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: 36,
                  py: 0.75,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Award size={18} color={secondaryTextColor} />
                  <Typography sx={{ fontSize: '15px', color: theme.palette.text.primary }}>
                    Calidad
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '15px', fontWeight: 500, color: theme.palette.text.primary }}>
                  {product.calidad}
                </Typography>
              </Box>
            </Box>

            {/* iOS Hairline Separator */}
            <Box sx={{ height: '0.5px', bgcolor: separatorColor, my: 2 }} />

            {/* Additional Info - iOS List Style */}
            <Typography
              sx={{
                fontSize: '13px',
                fontWeight: 600,
                color: secondaryTextColor,
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
                mb: 0.5,
              }}
            >
              Información Adicional
            </Typography>

            <Box sx={{ mb: 2 }}>
              {/* Location Row */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: 36,
                  py: 0.75,
                  borderBottom: `0.5px solid ${separatorColor}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MapPin size={18} color={secondaryTextColor} />
                  <Typography sx={{ fontSize: '15px', color: theme.palette.text.primary }}>
                    Ubicación
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '15px', fontWeight: 500, color: theme.palette.text.primary }}>
                  {product.ubicacion}
                </Typography>
              </Box>

              {/* Advisor Row */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: 36,
                  py: 0.75,
                  borderBottom: `0.5px solid ${separatorColor}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <User size={18} color={secondaryTextColor} />
                  <Typography sx={{ fontSize: '15px', color: theme.palette.text.primary }}>
                    Asesor
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '15px', fontWeight: 500, color: theme.palette.text.primary }}>
                  {product.asesor}
                </Typography>
              </Box>

              {/* Date Row */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: 36,
                  py: 0.75,
                  borderBottom: `0.5px solid ${separatorColor}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Calendar size={18} color={secondaryTextColor} />
                  <Typography sx={{ fontSize: '15px', color: theme.palette.text.primary }}>
                    Fecha de Ingreso
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '15px', fontWeight: 500, color: theme.palette.text.primary }}>
                  {product.fechaIngreso}
                </Typography>
              </Box>

              {/* QR Code Row - Compact */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: 36,
                  py: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <QrCode size={18} color={secondaryTextColor} />
                  <Typography sx={{ fontSize: '15px', color: theme.palette.text.primary }}>
                    Código QR
                  </Typography>
                </Box>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    bgcolor: '#FFFFFF',
                    display: 'inline-block',
                  }}
                >
                  <QRCodeSVG
                    value={`${STUDIO_BASE_URL}/product/${itemId}`}
                    size={56}
                    level="H"
                    fgColor={emeraldCore.darkest}
                    bgColor="#FFFFFF"
                    style={{ display: 'block' }}
                  />
                </Paper>
              </Box>
            </Box>

            {/* CTA Buttons - iOS Style Compact */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
              {/* Primary CTA - Full width filled */}
              <Button
                variant="contained"
                fullWidth
                disabled={!isAvailable}
                startIcon={<ShoppingCart size={18} />}
                sx={{
                  background: isAvailable ? buttonGradients.primary : undefined,
                  color: '#FFFFFF',
                  py: 1.5,
                  minHeight: 44,
                  fontWeight: 600,
                  fontSize: '15px',
                  borderRadius: 2,
                  textTransform: 'none',
                  boxShadow: isAvailable ? emeraldShadows.primary : undefined,
                  '&:hover': {
                    background: isAvailable ? emeraldGradients.deep : undefined,
                    boxShadow: isAvailable ? emeraldShadows.lg : undefined,
                  },
                  '&:active': {
                    transform: 'scale(0.98)',
                  },
                }}
              >
                {isAvailable ? 'Añadir al Carrito' : 'Vendido'}
              </Button>

              {/* Secondary CTAs - Horizontal layout */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                {/* Share Button - iOS style */}
                <Button
                  variant="outlined"
                  onClick={handleShareProduct}
                  startIcon={<Share2 size={18} />}
                  sx={{
                    flex: 1,
                    color: emeraldCore.dark,
                    borderColor: isLight ? surfacesLight.border.default : surfacesDark.border.default,
                    py: 1,
                    minHeight: 44,
                    fontWeight: 600,
                    fontSize: '15px',
                    borderRadius: 2,
                    textTransform: 'none',
                    '&:hover': {
                      borderColor: emeraldCore.dark,
                      bgcolor: alpha(emeraldCore.dark, 0.04),
                    },
                    '&:active': {
                      transform: 'scale(0.98)',
                    },
                  }}
                >
                  {isNativeShareSupported ? 'Compartir' : 'Copiar Link'}
                </Button>

                {/* Contact Advisor Button */}
                <Button
                  variant="text"
                  sx={{
                    flex: 1,
                    color: emeraldCore.dark,
                    py: 1,
                    minHeight: 44,
                    fontWeight: 600,
                    fontSize: '15px',
                    textTransform: 'none',
                    '&:hover': {
                      bgcolor: 'transparent',
                      opacity: 0.7,
                    },
                    '&:active': {
                      opacity: 0.5,
                    },
                  }}
                >
                  Contactar
                </Button>
              </Box>
            </Box>

            {/* Member Benefits Teaser - Only for Guest Users */}
            {isGuest && (
              <Box sx={{ mt: 3 }}>
                <MemberBenefitsTeaser
                  variant="compact"
                  onUnlockClick={() => navigate('/')}
                />
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>

    </Box>
  );
}
