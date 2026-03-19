/**
 * AsesorProfile Component — Museum Experience
 * Centered profile, category grid, favorites, and internal view switching.
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useMatch } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Skeleton,
} from '@mui/material';
import { ArrowLeft, ChevronLeft, Square } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAsesores } from '../../../hooks/useAsesores';
import { getAsesorProducts } from '../../../utils/asesorProductOwnership';
import { useTreasure } from '../../../hooks/useTreasure';
import { useCotizacionHistory, SavedCotizacion } from '../../../hooks/useCotizacionHistory';
import { useGoogleAuth } from '../../../contexts/GoogleAuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { useAmbassadorFavorites } from '../../../hooks/useAmbassadorFavorites';
import { categorizeProducts, type ProductCategory } from '../../../utils/productCategories';
import { TreasureItem } from '../../../types';
import ScrollToTop from '../../../components/shared/ScrollToTop';
import ImageCropper from '../../../components/media/ImageCropper';
import { emeraldCore, cssTransition } from '../../../design-system';
import { useAsesorCollection } from '../../../hooks/useAsesorCollection';
import { useAmbassadorPhoto } from '../../../hooks/useAmbassadorPhoto';
import {
  ProfileHeader,
  CategoryGrid,
  FavoritesRow,
  CategoryDetailView,
  FavoriteDetailView,
  ManageFavoritesView,
  EditProfileView,
  AmbassadorProductDetail,
  CotizacionesSection,
  CotizacionPreviewDialog,
  ExclusiveCollectionSection,
  CollectionProductDialog,
} from './components';
import type { ProfileStats } from './components';

type ProfileView =
  | 'museum'
  | 'category'
  | 'favoriteDetail'
  | 'productDetail'
  | 'edit'
  | 'manageFavorites';

/** Module-scope constants (avoid recreating per render) */
const COLLECTION_FOLDERS: Record<string, string> = {
  'cvocmnty@gmail.com': 'ceo-tierra-madre',
};
const COLLECTION_SLUGS: Record<string, string> = {
  'andres-mauricio-escobar-ramirez': 'ceo-tierra-madre',
};
const EMPTY_STATS: ProfileStats = {
  totalValue: 0, avgPrice: 0, looseCount: 0,
  jewelryCount: 0, disponibleCount: 0, vendidaCount: 0,
};

export default function AsesorProfilePage() {
  const { t } = useLanguage();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  // URL-based product detail: /ambassadors/:slug/product/:itemId
  const productMatch = useMatch('/ambassadors/:slug/product/:itemId');
  const urlItemId = productMatch?.params?.itemId;
  // View state
  const [activeView, setActiveView] = useState<ProfileView>(() => urlItemId ? 'productDetail' : 'museum');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<TreasureItem | null>(null);

  // Cotizaciones state
  const [selectedCotizacion, setSelectedCotizacion] = useState<SavedCotizacion | null>(null);

  // Exclusive collection state
  const [selectedCollectionProduct, setSelectedCollectionProduct] = useState<TreasureItem | null>(null);

  // File input ref for photo upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { treasure } = useTreasure();
  const { asesores, isLoading } = useAsesores(treasure);
  const { user: googleUser } = useGoogleAuth();
  const cotizacionHistory = useCotizacionHistory();
  const { notify, confirmAction } = useNotification();

  // Ambassador photo upload
  const {
    localPhotoUrl,
    isUploading: isUploadingPhoto,
    uploadError: photoUploadError,
    isCropperOpen,
    cropperImageSrc,
    handleFileSelect,
    handleCropComplete,
    closeCropper,
  } = useAmbassadorPhoto(slug);

  // Ambassador favorites
  const {
    favorites: favoriteIds,
    addFavorite,
    removeFavorite,
    reorderFavorites,
  } = useAmbassadorFavorites(slug);

  // Notify on photo upload result
  const prevUploadingRef = useRef(false);
  useEffect(() => {
    if (prevUploadingRef.current && !isUploadingPhoto) {
      if (photoUploadError) {
        notify(photoUploadError, 'error');
      } else if (localPhotoUrl) {
        notify('Foto de perfil actualizada', 'success');
      }
    }
    prevUploadingRef.current = isUploadingPhoto;
  }, [isUploadingPhoto, photoUploadError, localPhotoUrl]);

  // Find the asesor by slug
  const asesor = useMemo(() => {
    if (!slug || !asesores.length) return null;
    return asesores.find(a => a.slug === slug) || null;
  }, [slug, asesores]);

  // Check if current user owns this profile
  const isProfileOwner = useMemo(() => {
    if (!googleUser?.email || !asesor?.email) return false;
    const userEmail = googleUser.email.toLowerCase().trim();
    const asesorEmail = asesor.email.toLowerCase().trim();
    return userEmail === asesorEmail;
  }, [googleUser, asesor]);

  // Exclusive collection — visible to all visitors, not just owner
  const collectionFolder = asesor
    ? COLLECTION_FOLDERS[asesor.email?.toLowerCase().trim() ?? '']
      ?? COLLECTION_SLUGS[asesor.slug]
      ?? null
    : null;
  const { products: collectionProducts, collectionInfo, isLoading: collectionLoading } =
    useAsesorCollection(collectionFolder);

  // Fetch cotizaciones when viewing own profile
  useEffect(() => {
    if (isProfileOwner && googleUser?.email) {
      cotizacionHistory.fetchCotizaciones(googleUser.email);
    }
  }, [isProfileOwner, googleUser?.email]);

  // Get products for this asesor
  const allProducts = useMemo(() => {
    if (!asesor || !treasure) return [];
    return getAsesorProducts(treasure, asesor.name);
  }, [asesor, treasure]);

  // Categorize products for museum grid
  const categories = useMemo(() => categorizeProducts(allProducts), [allProducts]);

  // Favorite items resolved
  const favoriteItems = useMemo(() => {
    if (favoriteIds.length === 0) {
      // Default: top 6 by price
      return [...allProducts]
        .sort((a, b) => (b.precioCOP || 0) - (a.precioCOP || 0))
        .slice(0, 6);
    }
    return favoriteIds
      .map(id => allProducts.find(p => String(p.item) === id))
      .filter(Boolean) as TreasureItem[];
  }, [favoriteIds, allProducts]);

  // Calculate stats
  const stats: ProfileStats = useMemo(() => {
    if (!allProducts.length) return EMPTY_STATS;
    const disponible = allProducts.filter(p => p.effectiveEstado === 'DISPONIBLE');
    const totalValue = disponible.reduce((sum, p) => sum + (p.precioCOP || 0), 0);
    return {
      totalValue,
      avgPrice: disponible.length ? totalValue / disponible.length : 0,
      looseCount: allProducts.filter(p => !p.isJewelry).length,
      jewelryCount: allProducts.filter(p => p.isJewelry).length,
      disponibleCount: disponible.length,
      vendidaCount: allProducts.length - disponible.length,
    };
  }, [allProducts]);

  // Sync URL → state: when urlItemId changes, resolve product and set view
  useEffect(() => {
    if (urlItemId) {
      const id = parseInt(urlItemId, 10);
      const found = allProducts.find(p => p.item === id)
        || collectionProducts.find(p => p.item === id);
      if (found) {
        setSelectedProduct(found);
        setActiveView('productDetail');
      }
    } else if (activeView === 'productDetail' || activeView === 'favoriteDetail') {
      // URL no longer has itemId (back navigation) — return to museum
      setActiveView('museum');
      setSelectedProduct(null);
      setSelectedCategory(null);
    }
  }, [urlItemId, allProducts, collectionProducts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handlers — wrapped in useCallback to stabilize references for React.memo children
  const handleBack = useCallback(() => navigate('/ambassadors'), [navigate]);

  const handleCategorySelect = useCallback((category: ProductCategory) => {
    setSelectedCategory(category);
    setActiveView('category');
  }, []);

  const handleProductClick = useCallback((item: TreasureItem) => {
    navigate(`/ambassadors/${slug}/product/${item.item}`);
  }, [navigate, slug]);

  const handleFavoriteItemClick = useCallback((item: TreasureItem) => {
    navigate(`/ambassadors/${slug}/product/${item.item}`);
  }, [navigate, slug]);

  const handleShare = useCallback(async () => {
    if (!asesor) return;
    const url = window.location.href;
    const text = `Mira el catalogo de ${asesor.name} en Tierra Madre - ${stats.disponibleCount} esmeraldas disponibles`;
    if (navigator.share) {
      try { await navigator.share({ title: `${asesor.name} - Tierra Madre`, text, url }); }
      catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      notify('Enlace copiado al portapapeles', 'success');
    }
  }, [asesor, stats.disponibleCount, notify]);

  const handleDeleteCotizacion = useCallback(async (cot: SavedCotizacion) => {
    if (!googleUser?.email) return;
    const confirmed = await confirmAction('¿Eliminar esta cotización?');
    if (confirmed) {
      cotizacionHistory.deleteCotizacion(cot.id, googleUser.email);
    }
  }, [googleUser?.email, confirmAction, cotizacionHistory]);

  const handlePhotoEditClick = useCallback(() => fileInputRef.current?.click(), []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = '';
  }, [handleFileSelect]);

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'instant' : 'smooth' });
  }, [activeView, prefersReducedMotion]);

  const handleBackToMuseum = useCallback(() => {
    setActiveView('museum');
    setSelectedCategory(null);
    setSelectedProduct(null);
  }, []);

  const handleEditProfile = useCallback(() => setActiveView('edit'), []);

  const handleManageFavorites = useCallback(() => setActiveView('manageFavorites'), []);

  const handleDuplicateCotizacion = useCallback((cot: SavedCotizacion) => {
    navigate('/cuentas/cotizaciones', { state: { duplicate: cot } });
  }, [navigate]);

  const handleCloseCotizacionPreview = useCallback(() => setSelectedCotizacion(null), []);

  const handleCollectionProductClick = useCallback((item: TreasureItem) => {
    navigate(`/ambassadors/${slug}/product/${item.item}`);
  }, [navigate, slug]);

  const handleCloseCollectionDialog = useCallback(() => setSelectedCollectionProduct(null), []);

  // Keep selectedCategory ref for back navigation from product detail
  const selectedCategoryRef = useRef(selectedCategory);
  selectedCategoryRef.current = selectedCategory;

  const handleProductDetailBack = useCallback(() => {
    // Navigate back to ambassador profile (URL change triggers state reset via useEffect)
    navigate(`/ambassadors/${slug}`);
  }, [navigate, slug]);

  const handleEditSave = useCallback(async (data: { especialidad?: string; whatsapp?: string }) => {
    const res = await fetch('/api/user-prefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: asesor?.email,
        ...data,
      }),
    });
    if (!res.ok) throw new Error('Save failed');
  }, [asesor?.email]);

  const handleShareCollection = useCallback(async () => {
    if (!collectionFolder) return;
    const url = `${window.location.origin}/c/${collectionFolder}`;
    const text = `Mira mi coleccion exclusiva de esmeraldas colombianas en Tierra Madre`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Coleccion Exclusiva - Tierra Madre', text, url }); }
      catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      notify('Enlace de coleccion copiado', 'success');
    }
  }, [collectionFolder, notify]);

  // Loading skeleton — museum layout (responsive)
  if (isLoading) {
    return (
      <Box sx={{ pb: 4, maxWidth: { sm: 720, md: 840 }, mx: 'auto' }}>
        <Skeleton width={140} height={36} sx={{ mb: 2, borderRadius: 1 }} />
        {/* Centered avatar skeleton */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
          <Skeleton variant="circular" sx={{ width: { xs: 96, sm: 112, md: 120 }, height: { xs: 96, sm: 112, md: 120 } }} />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Skeleton width="50%" height={28} />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
          <Skeleton width={80} height={22} sx={{ borderRadius: 2 }} />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 1.5, mb: 3, px: { xs: 1, sm: 2, md: 3 } }}>
          {[0, 1, 2].map(i => (
            <Skeleton key={i} sx={{ flex: 1, height: { xs: 60, sm: 70 }, borderRadius: '12px' }} />
          ))}
        </Box>
        {/* Category grid skeleton — responsive columns */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: { xs: 1.5, sm: 2 },
          px: { xs: 2, sm: 3 },
          mb: 3,
        }}>
          {[0, 1, 2, 3].map(i => (
            <Skeleton key={i} variant="rounded" sx={{ height: { xs: 130, sm: 160, md: 180 }, borderRadius: 3 }} />
          ))}
        </Box>
        {/* Favorites row skeleton */}
        <Skeleton variant="rounded" height={90} sx={{ borderRadius: '16px 16px 0 0' }} />
      </Box>
    );
  }

  if (!asesor) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Embajador no encontrado
        </Typography>
        <Button
          startIcon={<ArrowLeft size={18} />}
          onClick={handleBack}
          sx={{ textTransform: 'none' }}
        >
          Volver a Embajadores
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4, position: 'relative', maxWidth: { sm: 720, md: 840 }, mx: 'auto' }}>
      {/* Back Button — circular bg-secondary pill (ds-tm.pen NavHeader) */}
      {activeView === 'museum' && (
        <Box
          role="button"
          tabIndex={0}
          onClick={handleBack}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleBack(); } }}
          aria-label={t.actions.back}
          sx={{
            position: 'absolute',
            top: 10,
            left: 16,
            width: 40,
            height: 40,
            borderRadius: '50%',
            bgcolor: 'background.paper',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            zIndex: 2,
            transition: cssTransition.default,
            '&:hover': { bgcolor: emeraldCore.primary, color: '#fff' },
          }}
        >
          <ChevronLeft size={20} />
        </Box>
      )}

      {/* Hidden file input for photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      {/* Image Cropper Dialog */}
      {isCropperOpen && (
        <ImageCropper
          open={isCropperOpen}
          imageSrc={cropperImageSrc}
          onClose={closeCropper}
          onCropComplete={handleCropComplete}
          aspectRatioOptions={[
            { label: '1:1', value: 1, icon: <Square size={18} /> },
          ]}
        />
      )}

      {/* Cotizacion Preview Dialog */}
      <CotizacionPreviewDialog
        cotizacion={selectedCotizacion}
        onClose={handleCloseCotizacionPreview}
      />

      {/* Collection Product Detail Dialog */}
      <CollectionProductDialog
        product={selectedCollectionProduct}
        onClose={handleCloseCollectionDialog}
      />

      <AnimatePresence mode="wait">
        {/* Museum View (Default) */}
        {activeView === 'museum' && (
          <motion.div
            key="museum"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Profile Header — centered museum layout */}
            <ProfileHeader
              asesor={asesor}
              stats={stats}
              totalProducts={allProducts.length}
              onShare={handleShare}
              isOwner={isProfileOwner}
              onPhotoEdit={handlePhotoEditClick}
              onEditProfile={handleEditProfile}
              photoUrl={localPhotoUrl || undefined}
              isUploadingPhoto={isUploadingPhoto}
            />

            {/* My Cotizaciones — Only visible to profile owner */}
            {isProfileOwner && (
              <CotizacionesSection
                cotizaciones={cotizacionHistory.cotizaciones}
                isLoading={cotizacionHistory.isLoading}
                onViewCotizacion={setSelectedCotizacion}
                onDeleteCotizacion={handleDeleteCotizacion}
                onDuplicateCotizacion={handleDuplicateCotizacion}
              />
            )}

            {/* Exclusive Collection — visible to all visitors (share is owner-only) */}
            {collectionFolder && (
              <ExclusiveCollectionSection
                products={collectionProducts}
                collectionName={collectionInfo?.name || t.ambassador.exclusiveCollection}
                collectionDescription={collectionInfo?.description}
                collectionFolder={collectionFolder}
                isLoading={collectionLoading}
                onProductClick={handleCollectionProductClick}
                onShare={isProfileOwner ? handleShareCollection : undefined}
              />
            )}

            {/* Divider — ds-tm.pen 1px border-light, full width with 24px side padding */}
            <Box sx={{ height: '1px', bgcolor: 'divider', mx: 3, my: 0.5 }} />

            {/* Category Section — ds-tm.pen padding [4,16], gap 10 */}
            <Box sx={{ px: { xs: 2, sm: 3 }, pt: 0.5, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {categories.length > 0 && (
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: '1.125rem',
                  }}
                >
                  {t.ambassador.museum?.exploreCollection ?? 'Explorar Colección'}
                </Typography>
              )}
              <CategoryGrid
                categories={categories}
                onCategorySelect={handleCategorySelect}
              />
            </Box>

            {/* Favorites Row */}
            <FavoritesRow
              items={favoriteItems}
              onItemClick={handleFavoriteItemClick}
              onViewAll={isProfileOwner ? handleManageFavorites : undefined}
            />
          </motion.div>
        )}

        {/* Category Detail View */}
        {activeView === 'category' && selectedCategory && (
          <CategoryDetailView
            key="category"
            category={selectedCategory}
            onBack={handleBackToMuseum}
            onProductClick={handleProductClick}
          />
        )}

        {/* Favorite Detail View */}
        {activeView === 'favoriteDetail' && selectedProduct && (
          <FavoriteDetailView
            key="favoriteDetail"
            item={selectedProduct}
            asesor={asesor}
            onBack={handleBackToMuseum}
          />
        )}

        {/* Product Detail View */}
        {activeView === 'productDetail' && selectedProduct && (
          <AmbassadorProductDetail
            key="productDetail"
            item={selectedProduct}
            onBack={handleProductDetailBack}
          />
        )}

        {/* Edit Profile View */}
        {activeView === 'edit' && (
          <EditProfileView
            key="edit"
            asesor={asesor}
            photoUrl={localPhotoUrl || undefined}
            isUploadingPhoto={isUploadingPhoto}
            onPhotoEdit={handlePhotoEditClick}
            onBack={handleBackToMuseum}
            onSave={handleEditSave}
          />
        )}

        {/* Manage Favorites View */}
        {activeView === 'manageFavorites' && (
          <ManageFavoritesView
            key="manageFavorites"
            allProducts={allProducts}
            favoriteIds={favoriteIds}
            onBack={handleBackToMuseum}
            onAddFavorite={addFavorite}
            onRemoveFavorite={removeFavorite}
            onReorderFavorites={reorderFavorites}
          />
        )}
      </AnimatePresence>

      <ScrollToTop />
    </Box>
  );
}
