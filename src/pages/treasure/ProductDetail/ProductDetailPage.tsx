/**
 * ProductDetail Component
 * Detailed product view with gallery, specifications, and actions.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  alpha,
  useTheme,
  Snackbar,
  Skeleton,
} from '@mui/material';
import { ChevronLeft, Package, Crown } from 'lucide-react';
import logoPlaceholder from '../../../assets/logo-symbol.png';
import { useShare } from '../../../hooks/useShare';
import { useHaptics } from '../../../hooks/useHaptics';
import { useProductView } from '../../../hooks/useProductView';
import { useCart } from '../../../hooks/useCart';
import { useWhatsAppContact } from '../../../hooks/useWhatsAppContact';
import { treasureToCartItem } from '../../../types/cart';
import AdminSelectDialog from '../../../components/cart/AdminSelectDialog';
import { useThemeMode } from '../../../contexts/ThemeContext';
import { usePriceShare } from '../../../contexts/PriceShareContext';
import { useIsAdmin, useIsProvider } from '../../../hooks/usePermissions';
import { useIsGuest } from '../../../hooks/useAuth';
import { useTreasure } from '../../../hooks/useTreasure';
import { MemberBenefitsTeaser } from '../../../components/guest';
import { MediaGallery } from '../../../components/media';
import type { MediaItem } from '../../../components/media/types';
import { PriceDisplay } from '../../../components/price-simulator/PriceDisplay';
import { getColorDot } from '../../../utils/formatting';
import { createLogger } from '../../../utils/logger';
import { surfacesLight, surfacesDark, goldAccent, emeraldCore } from '../../../design-system/tokens/colors';
import { buttonGradients } from '../../../design-system/tokens/gradients';
import { accentColors, lightTokens } from '../../../design-system';
import { SpecificationsList, AdditionalInfo, ProductActions } from './components';
import Breadcrumbs from '../../../components/shared/Breadcrumbs';

const log = createLogger('ProductDetail');

export default function ProductDetail() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const isAdmin = useIsAdmin();
  const isGuest = useIsGuest();
  const isProvider = useIsProvider();
  const { shouldShowPrices } = usePriceShare();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);

  const { treasure, updateMediaItems, getMediaItems, isLoadingSheets } = useTreasure();
  const { shareProduct, isNativeShareSupported } = useShare();
  const { trigger: triggerHaptic } = useHaptics();
  const { addToCart, isInCart, cartCount } = useCart();
  const {
    openWhatsAppToInviter,
    openWhatsAppToAdmin,
    admins,
    hasInviter,
  } = useWhatsAppContact();

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

  // Stable refs for treasure functions whose identity changes on every
  // galleries update — avoids infinite fetch loop in the effect below.
  const getMediaItemsRef = useRef(getMediaItems);
  const updateMediaItemsRef = useRef(updateMediaItems);
  useEffect(() => {
    getMediaItemsRef.current = getMediaItems;
    updateMediaItemsRef.current = updateMediaItems;
  }, [getMediaItems, updateMediaItems]);

  // Load media items for the product from Google Drive folder
  useEffect(() => {
    if (product) {
      let isCancelled = false;

      const loadMedia = async () => {
        // Only show cached Drive items immediately — these have the same
        // IDs/URLs the API will return, so no gallery reset on arrival.
        // Legacy item is reserved as a fallback if the API fails.
        const localItems = getMediaItemsRef.current ? getMediaItemsRef.current(product.item) : [];
        if (localItems.length > 0) {
          setMediaItems(localItems);
          setMediaLoaded(true);
        }

        try {
          const response = await fetch(`/api/get-drive-images?itemNumber=${product.item}`);
          if (isCancelled) return;

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
              url: img.proxyUrl,
              type: img.type,
              thumbnailUrl: img.thumbnailUrl,
              category: 'hero' as const,
              alt: img.name || `${displayName} - ${img.order + 1}`,
              order: img.order,
            }));

            const sortedItems = [...driveItems].sort((a, b) => {
              if (a.type === 'image' && b.type === 'video') return -1;
              if (a.type === 'video' && b.type === 'image') return 1;
              return a.order - b.order;
            });

            if (!isCancelled) {
              setMediaItems(prev => {
                if (prev.length === sortedItems.length &&
                    prev.every((p, i) => p.url === sortedItems[i].url)) {
                  return prev;
                }
                return sortedItems;
              });
              if (updateMediaItemsRef.current) {
                updateMediaItemsRef.current(product.item, driveItems);
              }
            }
          } else if (!isCancelled && localItems.length === 0) {
            // API returned nothing and no cache — fall back to legacy image
            if (product.imagen) {
              setMediaItems([{
                id: `legacy-${product.item}`,
                url: product.imagen,
                type: product.mediaType === 'video' ? 'video' : 'image',
                thumbnailUrl: product.thumbnailUrl,
                category: 'hero',
                alt: displayName || `Producto ${product.item}`,
                order: 0,
              }]);
            }
          }
          if (!isCancelled) setMediaLoaded(true);
        } catch (error) {
          if (!isCancelled) {
            log.error('Error fetching Drive images:', error);
            setMediaLoaded(true);
            // On error with no cache, fall back to legacy image
            if (localItems.length === 0 && product.imagen) {
              setMediaItems([{
                id: `legacy-${product.item}`,
                url: product.imagen,
                type: product.mediaType === 'video' ? 'video' : 'image',
                thumbnailUrl: product.thumbnailUrl,
                category: 'hero',
                alt: displayName || `Producto ${product.item}`,
                order: 0,
              }]);
            }
          }
        }
      };

      loadMedia();

      return () => {
        isCancelled = true;
      };
    }
  }, [product, displayName]);

  // Handle share product
  const handleShareProduct = useCallback(async () => {
    if (!product) return;

    triggerHaptic('light');
    const result = await shareProduct(product);

    if (result.success) {
      triggerHaptic('success');
      if (result.method === 'clipboard') {
        log.debug('Product link copied to clipboard');
      }
    }
  }, [product, shareProduct, triggerHaptic]);

  // Handle add to cart
  const handleAddToCart = useCallback(() => {
    if (!product) return;

    if (isInCart(product.item)) {
      navigate('/cart');
      return;
    }

    addToCart(product);
    triggerHaptic('success');
    setSnackbarMessage('Producto agregado a tu seleccion');
    setSnackbarOpen(true);
  }, [product, isInCart, addToCart, triggerHaptic, navigate]);

  // Handle contact action
  const handleContact = useCallback(async () => {
    if (!product) return;

    triggerHaptic('light');

    if (isGuest) {
      if (!hasInviter) {
        setSnackbarMessage('No se encontro el contacto de tu invitador');
        setSnackbarOpen(true);
        return;
      }
      const cartItem = treasureToCartItem(product);
      await openWhatsAppToInviter([cartItem]);
    } else {
      setAdminDialogOpen(true);
    }
  }, [product, isGuest, hasInviter, openWhatsAppToInviter, triggerHaptic]);

  // Handle admin selected (for staff contact flow)
  const handleAdminSelected = useCallback(async (adminName: string) => {
    if (!product) return;
    const cartItem = treasureToCartItem(product);
    await openWhatsAppToAdmin([cartItem], adminName);
  }, [product, openWhatsAppToAdmin]);

  // Show skeleton loading state matching actual layout
  if (isLoadingSheets && !product) {
    return (
      <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 0, sm: 3, md: 4 }, pb: 3 }}>
        <Box sx={{ px: { xs: 2, sm: 0 }, mb: 1 }}>
          <Skeleton width={160} height={20} sx={{ borderRadius: 1 }} />
        </Box>
        <Grid container spacing={{ xs: 1.5, md: 3 }}>
          {/* Image skeleton */}
          <Grid item xs={12} md={6}>
            <Skeleton
              variant="rounded"
              sx={{ width: '100%', aspectRatio: '1/1', borderRadius: { xs: 0, sm: 3 } }}
            />
            {/* Thumbnail strip skeleton */}
            <Box sx={{ display: 'flex', gap: 1, mt: 1, px: { xs: 2, sm: 0 } }}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rounded" width={64} height={64} sx={{ borderRadius: 1.5, flexShrink: 0 }} />
              ))}
            </Box>
          </Grid>
          {/* Specs skeleton */}
          <Grid item xs={12} md={6}>
            <Box sx={{ px: { xs: 2, sm: 0 }, pt: { xs: 1, md: 0 } }}>
              <Skeleton width="70%" height={32} sx={{ mb: 1 }} />
              <Skeleton width="40%" height={24} sx={{ mb: 2 }} />
              <Skeleton width="50%" height={36} sx={{ mb: 3 }} />
              {[0, 1, 2, 3, 4].map((i) => (
                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Skeleton width="30%" height={20} />
                  <Skeleton width="40%" height={20} />
                </Box>
              ))}
              <Box sx={{ display: 'flex', gap: 1.5, mt: 3 }}>
                <Skeleton variant="rounded" width="50%" height={48} sx={{ borderRadius: 3 }} />
                <Skeleton variant="rounded" width="50%" height={48} sx={{ borderRadius: 3 }} />
              </Box>
            </Box>
          </Grid>
        </Grid>
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

  const colorDot = getColorDot(product.color);
  const isAvailable = product.estado === 'DISPONIBLE';
  const separatorColor = isLight ? 'rgba(60, 60, 67, 0.12)' : 'rgba(235, 235, 245, 0.12)';
  const secondaryTextColor = isLight ? 'rgba(60, 60, 67, 0.6)' : 'rgba(235, 235, 245, 0.6)';

  return (
    <Box sx={{
      maxWidth: 1400,
      mx: 'auto',
      px: { xs: 0, sm: 3, md: 4 },
      pb: { xs: 'calc(12px + env(safe-area-inset-bottom))', sm: 3 }
    }}>
      {/* Breadcrumb navigation */}
      <Breadcrumbs
        items={[
          { label: 'Tesoros', path: '/treasure' },
          { label: displayName || `Producto ${itemId}` },
        ]}
      />

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
            {mediaItems.length > 0 ? (
              <MediaGallery
                media={mediaItems}
                productName={displayName}
              />
            ) : !mediaLoaded ? (
              // Skeleton matches gallery aspect ratio to prevent layout jump
              <Skeleton
                variant="rounded"
                sx={{ width: '100%', aspectRatio: '4/3' }}
              />
            ) : (
              <Box
                sx={{
                  width: '100%',
                  aspectRatio: '4/3',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha(colorDot, 0.1),
                  position: 'relative',
                }}
              >
                <Box
                  component="img"
                  src={logoPlaceholder}
                  alt=""
                  sx={{
                    width: 120,
                    height: 'auto',
                    opacity: 0.28,
                    filter: isLight ? 'brightness(0.7)' : 'brightness(0.5)',
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{ mt: 2, color: theme.palette.text.secondary }}
                >
                  Sin imagenes
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Right Column - Product Details */}
        <Grid item xs={12} md={6}>
          <Box sx={{ px: { xs: 2, sm: 0 } }}>
            {/* Header - iOS Large Title Style */}
            <Box sx={{ mb: 2 }}>
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

              {/* Inline metadata */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mb: 1.5 }}>
                <Typography component="span" sx={{ fontSize: '13px', color: secondaryTextColor, fontWeight: 500 }}>
                  #{product.item}
                </Typography>
                <Typography component="span" sx={{ color: secondaryTextColor, fontSize: '13px', opacity: 0.5 }}>·</Typography>
                {product.isJewelry && <Crown size={14} color={goldAccent.primary} />}
                <Typography component="span" sx={{ fontSize: '13px', color: secondaryTextColor, fontWeight: 400 }}>
                  {product.isJewelry ? 'Joyeria' : 'Gema'}
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
                    <Typography component="span" sx={{ fontSize: '13px', color: accentColors.purple.light, fontWeight: 500 }}>
                      Lote x{product.cantidad}
                    </Typography>
                  </>
                )}
              </Box>

              {/* Price display */}
              {shouldShowPrices && (
                <PriceDisplay price={product.precioCOP} precioInternacional={product.precioInternacional} />
              )}
            </Box>

            {/* Separator */}
            <Box sx={{ height: '0.5px', bgcolor: separatorColor, my: 2 }} />

            {/* Specifications */}
            <SpecificationsList product={product} />

            {/* Separator */}
            <Box sx={{ height: '0.5px', bgcolor: separatorColor, my: 2 }} />

            {/* Additional Info */}
            <AdditionalInfo product={product} isAdmin={isAdmin} />

            {/* CTA Buttons (hidden for providers) */}
            {!isProvider && (
              <ProductActions
                isAvailable={isAvailable}
                isInCart={product ? isInCart(product.item) : false}
                cartCount={cartCount}
                isNativeShareSupported={isNativeShareSupported}
                onAddToCart={handleAddToCart}
                onShare={handleShareProduct}
                onContact={handleContact}
              />
            )}

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

      {/* Admin Selection Dialog (for staff) */}
      <AdminSelectDialog
        open={adminDialogOpen}
        onClose={() => setAdminDialogOpen(false)}
        onSelect={handleAdminSelected}
        admins={admins}
      />

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{
          '& .MuiSnackbarContent-root': {
            bgcolor: emeraldCore.dark,
            color: '#FFFFFF',
          },
        }}
      />
    </Box>
  );
}
