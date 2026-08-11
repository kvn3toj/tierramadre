/**
 * AsesorProfile Component — Museum Experience
 * Centered profile, category grid, favorites, and internal view switching.
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  useParams,
  useNavigate,
  useMatch,
  useLocation,
} from 'react-router-dom';
import { Box, Typography, Button, Skeleton } from '@mui/material';
import { ArrowLeft, ChevronLeft, Square, Gem } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAsesores } from '../../../hooks/useAsesores';
import {
  getAsesorProducts,
  resolveAsesorProducts,
} from '../../../utils/asesorProductOwnership';
import { useAmbassadorProducts } from '../../../hooks/useAmbassadorProducts';
import { useTreasure } from '../../../hooks/useTreasure';
import {
  useCotizacionHistory,
  SavedCotizacion,
} from '../../../hooks/useCotizacionHistory';
import { useGoogleAuth } from '../../../contexts/GoogleAuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { useAmbassadorFavorites } from '../../../hooks/useAmbassadorFavorites';
import {
  categorizeProducts,
  type ProductCategory,
} from '../../../utils/productCategories';
import { TreasureItem } from '../../../types';
import ScrollToTop from '../../../components/shared/ScrollToTop';
import ImageCropper from '../../../components/media/ImageCropper';
import { qeFont, zIndex } from '../../../design-system';
import { useAsesorCollection } from '../../../hooks/useAsesorCollection';
import { useAmbassadorPhoto } from '../../../hooks/useAmbassadorPhoto';
import { useAmbassadorOverrides } from '../../../hooks/useAmbassadorOverrides';
import { requireAuthTokenOrLogout } from '../../../utils/sessionToken';
import { applyAmbassadorOverrides } from '../../../utils/applyAmbassadorOverride';
import {
  ProfileHeader,
  CategoryGrid,
  FavoritesRow,
  CategoryDetailView,
  ManageFavoritesView,
  EditProfileView,
  AmbassadorProductDetail,
  CotizacionesSection,
  CotizacionPreviewDialog,
  ExclusiveCollectionSection,
  CollectionProductDialog,
  ViewAllTreasuresFAB,
} from './components';
import type { ProfileStats } from './components';

type ProfileView =
  | 'museum'
  | 'category'
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
/**
 * `null` value, not 0. A non-staff visitor never receives `precioCOP`, and
 * rendering "$0" told them this ambassador's collection was worthless. An
 * absent number is absent — the header hides the metric instead.
 */
const EMPTY_STATS: ProfileStats = {
  totalValue: null,
  avgPrice: null,
  looseCount: 0,
  jewelryCount: 0,
  disponibleCount: 0,
  vendidaCount: 0,
};

export default function AsesorProfilePage() {
  const { t } = useLanguage();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  // Each view has a real route, so the view is derived from the URL rather
  // than held in state. Browser-back therefore pops one view at a time, and
  // every sub-view is deep-linkable.
  const productMatch = useMatch('/ambassadors/:slug/product/:itemId');
  const categoryMatch = useMatch('/ambassadors/:slug/c/:categoryKey');
  const editMatch = useMatch('/ambassadors/:slug/editar');
  const manageFavoritesMatch = useMatch('/ambassadors/:slug/favoritas');
  const urlItemId = productMatch?.params?.itemId;
  const urlCategoryKey = categoryMatch?.params?.categoryKey;

  const activeView: ProfileView = urlItemId
    ? 'productDetail'
    : urlCategoryKey
      ? 'category'
      : editMatch
        ? 'edit'
        : manageFavoritesMatch
          ? 'manageFavorites'
          : 'museum';

  // Cotizaciones state
  const [selectedCotizacion, setSelectedCotizacion] =
    useState<SavedCotizacion | null>(null);

  // Exclusive collection state
  const [selectedCollectionProduct, setSelectedCollectionProduct] =
    useState<TreasureItem | null>(null);

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

  // Ambassador per-product overrides (custom name / price) — T4 MVP
  const { overrides: ambassadorOverrides } = useAmbassadorOverrides(slug);

  // Vanity handle powering <handle>.tierramadre.app. Loaded lazily and only
  // for the profile owner, since it is only ever shown in the edit form.
  const [vanityHandle, setVanityHandle] = useState<string | undefined>();

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
    return asesores.find((a) => a.slug === slug) || null;
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
    ? (COLLECTION_FOLDERS[asesor.email?.toLowerCase().trim() ?? ''] ??
      COLLECTION_SLUGS[asesor.slug] ??
      null)
    : null;
  const {
    products: collectionProducts,
    collectionInfo,
    isLoading: collectionLoading,
  } = useAsesorCollection(collectionFolder);

  // Fetch cotizaciones when viewing own profile
  useEffect(() => {
    if (isProfileOwner && googleUser?.email) {
      cotizacionHistory.fetchCotizaciones(googleUser.email);
    }
  }, [isProfileOwner, googleUser?.email]);

  // Load the saved vanity handle for the edit form. Owner-only: nobody else
  // can edit it, and this avoids a request on every profile view.
  useEffect(() => {
    if (!isProfileOwner || !asesor?.email) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/ambassador-handle?email=${encodeURIComponent(asesor.email!)}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.handle) setVanityHandle(data.handle);
      } catch {
        // Non-fatal: the form falls back to recommending one from the name.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isProfileOwner, asesor?.email]);

  // Ownership resolved locally. Works only for staff: `asesor` and
  // `asesorActual` are WITHHELD_KEYS, so for everyone else this is [].
  const localProducts = useMemo(() => {
    if (!asesor || !treasure) return [];
    return getAsesorProducts(treasure, asesor.name);
  }, [asesor, treasure]);

  // …so everyone else asks the server which item numbers are this
  // ambassador's. Skipped entirely when the local pass already worked, both
  // to save the round trip and because the local objects are richer (prices,
  // transfer state) than anything this endpoint is allowed to return.
  const { data: serverProducts } = useAmbassadorProducts(
    slug,
    localProducts.length > 0,
  );

  // Get products for this asesor
  const allProducts = useMemo(
    () => resolveAsesorProducts(localProducts, treasure, serverProducts),
    [localProducts, serverProducts, treasure],
  );

  // Categorize products for museum grid
  const categories = useMemo(
    () => categorizeProducts(allProducts),
    [allProducts],
  );

  // Favorite items resolved (with ambassador per-product overrides applied)
  const favoriteItems = useMemo(() => {
    const baseList: TreasureItem[] =
      favoriteIds.length === 0
        ? [...allProducts]
            .sort((a, b) => (b.precioCOP || 0) - (a.precioCOP || 0))
            .slice(0, 6)
        : (favoriteIds
            .map((id) => allProducts.find((p) => String(p.item) === id))
            .filter(Boolean) as TreasureItem[]);
    return applyAmbassadorOverrides(baseList, ambassadorOverrides);
  }, [favoriteIds, allProducts, ambassadorOverrides]);

  // Calculate stats
  const stats: ProfileStats = useMemo(() => {
    if (!allProducts.length) return EMPTY_STATS;
    const disponible = allProducts.filter(
      (p) => p.effectiveEstado === 'DISPONIBLE',
    );
    // Only staff receive `precioCOP`. For everyone else there is no total to
    // report — which is different from a total of zero, and the header treats
    // the two differently.
    const priced = disponible.filter(
      (p) => typeof p.precioCOP === 'number' && p.precioCOP > 0,
    );
    const totalValue = priced.length
      ? priced.reduce((sum, p) => sum + (p.precioCOP || 0), 0)
      : null;
    return {
      totalValue,
      avgPrice: totalValue !== null ? totalValue / priced.length : null,
      looseCount: allProducts.filter((p) => !p.isJewelry).length,
      jewelryCount: allProducts.filter((p) => p.isJewelry).length,
      disponibleCount: disponible.length,
      vendidaCount: allProducts.length - disponible.length,
    };
  }, [allProducts]);

  // Resolve the URL's item / category against loaded data. Both are derived,
  // so there is no URL-to-state sync effect to fall out of step.
  const selectedProduct = useMemo<TreasureItem | null>(() => {
    if (!urlItemId) return null;
    const id = parseInt(urlItemId, 10);
    return (
      allProducts.find((p) => p.item === id) ??
      collectionProducts.find((p) => p.item === id) ??
      null
    );
  }, [urlItemId, allProducts, collectionProducts]);

  const selectedCategory = useMemo<ProductCategory | null>(
    () => categories.find((c) => c.key === urlCategoryKey) ?? null,
    [categories, urlCategoryKey],
  );

  // The owner-only views are not reachable by URL for anyone else.
  useEffect(() => {
    if (!isProfileOwner && (editMatch || manageFavoritesMatch)) {
      navigate(`/ambassadors/${slug}`, { replace: true });
    }
  }, [isProfileOwner, editMatch, manageFavoritesMatch, navigate, slug]);

  // Handlers — wrapped in useCallback to stabilize references for React.memo children
  const handleBack = useCallback(() => navigate('/ambassadors'), [navigate]);

  const handleCategorySelect = useCallback(
    (category: ProductCategory) => {
      navigate(`/ambassadors/${slug}/c/${category.key}`);
    },
    [navigate, slug],
  );

  const handleProductClick = useCallback(
    (item: TreasureItem) => {
      navigate(`/ambassadors/${slug}/product/${item.item}`);
    },
    [navigate, slug],
  );

  const handleShare = useCallback(async () => {
    if (!asesor) return;
    const url = window.location.href;
    // Never quote a count we do not have. This line used to read "0
    // esmeraldas disponibles" for every non-staff sharer, because `stats`
    // was short-circuited to EMPTY_STATS — a lie that left the app and went
    // out over WhatsApp.
    const text =
      stats.disponibleCount > 0
        ? `Mira el catalogo de ${asesor.name} en Tierra Madre - ${stats.disponibleCount} esmeraldas disponibles`
        : `Mira el catalogo de ${asesor.name} en Tierra Madre`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${asesor.name} - Tierra Madre`,
          text,
          url,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
      notify('Enlace copiado al portapapeles', 'success');
    }
  }, [asesor, stats.disponibleCount, notify]);

  const handleDeleteCotizacion = useCallback(
    async (cot: SavedCotizacion) => {
      if (!googleUser?.email) return;
      const confirmed = await confirmAction('¿Eliminar esta cotización?');
      if (confirmed) {
        cotizacionHistory.deleteCotizacion(cot.id, googleUser.email);
      }
    },
    [googleUser?.email, confirmAction, cotizacionHistory],
  );

  const handlePhotoEditClick = useCallback(
    () => fileInputRef.current?.click(),
    [],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
      e.target.value = '';
    },
    [handleFileSelect],
  );

  // Scroll to top on view change. The app is a fixed-viewport shell, so the
  // real scroller is <main id="main-content"> (IOSLayout) — window.scrollTo
  // is inert here. Absent element = shell not mounted; nothing to scroll.
  useEffect(() => {
    const scroller = document.getElementById('main-content');
    if (!scroller) return;
    scroller.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'instant' : 'smooth',
    });
  }, [activeView, prefersReducedMotion]);

  // In-app back: pop history when we got here by navigating, so
  // category -> product -> back lands on the category again. On a cold deep
  // link there is nothing to pop, so fall back to the profile root.
  const goBackOrProfile = useCallback(() => {
    if (location.key === 'default') {
      navigate(`/ambassadors/${slug}`);
    } else {
      navigate(-1);
    }
  }, [location.key, navigate, slug]);

  const handleBackToMuseum = goBackOrProfile;

  const handleEditProfile = useCallback(
    () => navigate(`/ambassadors/${slug}/editar`),
    [navigate, slug],
  );

  const handleManageFavorites = useCallback(
    () => navigate(`/ambassadors/${slug}/favoritas`),
    [navigate, slug],
  );

  const handleDuplicateCotizacion = useCallback(
    (cot: SavedCotizacion) => {
      navigate('/cuentas/cotizaciones', { state: { duplicate: cot } });
    },
    [navigate],
  );

  const handleCloseCotizacionPreview = useCallback(
    () => setSelectedCotizacion(null),
    [],
  );

  const handleCollectionProductClick = useCallback(
    (item: TreasureItem) => {
      navigate(`/ambassadors/${slug}/product/${item.item}`);
    },
    [navigate, slug],
  );

  const handleCloseCollectionDialog = useCallback(
    () => setSelectedCollectionProduct(null),
    [],
  );

  const handleProductDetailBack = goBackOrProfile;

  const handleEditSave = useCallback(
    async (data: {
      especialidad?: string;
      whatsapp?: string;
      handle?: string;
    }) => {
      const email = asesor?.email;
      if (!email) throw new Error('Save failed');

      const { handle, ...prefs } = data;

      // /api/user-prefs takes { userId, preferences } — it was previously
      // called with a flat { email, ...fields } body, which meant every save
      // from this form 400'd on "userId and preferences required".
      const prefsRes = await fetch('/api/user-prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: email, preferences: prefs }),
      });
      if (!prefsRes.ok) throw new Error('Save failed');

      if (!handle) return;

      // The handle mutation is identity-bound server-side (it writes to the
      // verified token's row), so it needs the same bearer proof as the other
      // privileged mutations. Null → fully expired session; the helper
      // already fired the sign-out redirect, so just stop here.
      const token = requireAuthTokenOrLogout();
      if (!token) return;

      // Separate store, separate failure mode: a taken handle answers 409
      // with copy meant for the ambassador, so surface it verbatim.
      const handleRes = await fetch('/api/ambassador-handle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, handle }),
      });
      if (!handleRes.ok) {
        const body = await handleRes.json().catch(() => null);
        throw new Error(body?.error || 'Save failed');
      }
      setVanityHandle(handle);
    },
    [asesor?.email],
  );

  const handleShareCollection = useCallback(async () => {
    if (!collectionFolder) return;
    const url = `${window.location.origin}/c/${collectionFolder}`;
    const text = `Mira mi coleccion exclusiva de esmeraldas colombianas en Tierra Madre`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Coleccion Exclusiva - Tierra Madre',
          text,
          url,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
      notify('Enlace de coleccion copiado', 'success');
    }
  }, [collectionFolder, notify]);

  // Loading skeleton — museum layout (responsive). Width comes from the
  // shell's --maxw content container (IOSLayout); no page-level cap here, so
  // the skeleton matches the loaded layout.
  if (isLoading) {
    return (
      <Box sx={{ pb: 4 }}>
        <Skeleton width={140} height={36} sx={{ mb: 2, borderRadius: 1 }} />
        {/* Centered avatar skeleton */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
          <Skeleton
            variant="circular"
            sx={{
              width: { xs: 96, sm: 112, md: 120 },
              height: { xs: 96, sm: 112, md: 120 },
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Skeleton width="50%" height={28} />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
          <Skeleton width={80} height={22} sx={{ borderRadius: 2 }} />
        </Box>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: 2,
            mt: 1.5,
            mb: 3,
            px: { xs: 1, sm: 2, md: 3 },
          }}
        >
          {[0, 1, 2].map((i) => (
            <Skeleton
              key={i}
              sx={{ flex: 1, height: { xs: 60, sm: 70 }, borderRadius: '12px' }}
            />
          ))}
        </Box>
        {/* Category grid skeleton — responsive columns */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: { xs: 1.5, sm: 2 },
            px: { xs: 2, sm: 3 },
            mb: 3,
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              variant="rounded"
              sx={{ height: { xs: 130, sm: 160, md: 180 }, borderRadius: 3 }}
            />
          ))}
        </Box>
        {/* Favorites row skeleton */}
        <Skeleton
          variant="rounded"
          height={90}
          sx={{ borderRadius: '16px 16px 0 0' }}
        />
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
    <Box
      sx={{
        pb: 4,
        position: 'relative',
      }}
    >
      {/* Back Button — circular bg-secondary pill (ds-tm.pen NavHeader) */}
      {activeView === 'museum' && (
        <Box
          role="button"
          tabIndex={0}
          onClick={handleBack}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleBack();
            }
          }}
          aria-label={t.actions.back}
          sx={{
            position: 'absolute',
            top: 10,
            left: 16,
            width: 40,
            height: 40,
            borderRadius: '50%',
            bgcolor: 'var(--tm-surface)',
            border: '1px solid var(--tm-border)',
            color: 'var(--tm-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: zIndex.base + 1,
            transition:
              'background-color var(--tm-base) var(--tm-ease), color var(--tm-base) var(--tm-ease)',
            '&:hover': {
              bgcolor: 'var(--tm-accent-strong)',
              color: 'var(--tm-on-accent)',
            },
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

            {/* Exclusive Collection — shown FIRST so visitors see the
                ambassador's own curation before the broader catalog (T3). */}
            {collectionFolder && (
              <ExclusiveCollectionSection
                products={collectionProducts}
                collectionName={
                  collectionInfo?.name || t.ambassador.exclusiveCollection
                }
                collectionDescription={collectionInfo?.description}
                collectionFolder={collectionFolder}
                isLoading={collectionLoading}
                onProductClick={handleCollectionProductClick}
                onShare={isProfileOwner ? handleShareCollection : undefined}
              />
            )}

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

            {/* Delicate gem divider — echoes the directory intro for cohesion */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                mx: 3,
                my: 1.25,
              }}
            >
              <Box
                sx={{
                  height: '1px',
                  flex: 1,
                  maxWidth: 90,
                  background:
                    'linear-gradient(90deg, transparent, var(--tm-border))',
                }}
              />
              <Gem size={11} style={{ color: 'var(--tm-subtle)' }} />
              <Box
                sx={{
                  height: '1px',
                  flex: 1,
                  maxWidth: 90,
                  background:
                    'linear-gradient(90deg, var(--tm-border), transparent)',
                }}
              />
            </Box>

            {/* Category Section — ds-tm.pen padding [4,16], gap 10 */}
            <Box
              sx={{
                px: { xs: 2, sm: 3 },
                pt: 0.5,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {categories.length > 0 && (
                <Typography
                  sx={{
                    fontFamily: qeFont.serif,
                    fontWeight: 600,
                    fontSize: '1.4rem',
                    letterSpacing: '0.005em',
                  }}
                >
                  {t.ambassador.museum?.exploreCollection ??
                    'Explorar Colección'}
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
              onItemClick={handleProductClick}
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

        {/* Product Detail View */}
        {activeView === 'productDetail' && selectedProduct && (
          <AmbassadorProductDetail
            key="productDetail"
            item={selectedProduct}
            onBack={handleProductDetailBack}
            asesor={asesor}
          />
        )}

        {/* Edit Profile View */}
        {activeView === 'edit' && (
          <EditProfileView
            key="edit"
            asesor={asesor}
            photoUrl={localPhotoUrl || undefined}
            isUploadingPhoto={isUploadingPhoto}
            handle={vanityHandle}
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
            asesorSlug={asesor.slug}
          />
        )}
      </AnimatePresence>

      {/* Floating CTA: jump to the full TM treasure catalog from the
          ambassador profile (T3). Only shown in the default museum view. */}
      {activeView === 'museum' && asesor && (
        <ViewAllTreasuresFAB asesorSlug={asesor.slug} />
      )}

      <ScrollToTop />
    </Box>
  );
}
