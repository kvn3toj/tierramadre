/**
 * AsesorProfile Component
 * Shows asesor details and their treasure products with filtering.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  Skeleton,
  useTheme,
} from '@mui/material';
import { ArrowLeft, Package, Square } from 'lucide-react';
import { useAsesores } from '../../../hooks/useAsesores';
import { useTreasure } from '../../../hooks/useTreasure';
import { useCotizacionHistory, SavedCotizacion } from '../../../hooks/useCotizacionHistory';
import { useGoogleAuth } from '../../../contexts/GoogleAuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { TreasureItem } from '../../../types';
import { TreasureCard } from '../../../components/treasure/TreasureCard';
import ScrollToTop from '../../../components/shared/ScrollToTop';
import ImageCropper from '../../../components/media/ImageCropper';
import { brand, lightTokens, darkTokens } from '../../../design-system';
import { useAsesorCollection } from '../../../hooks/useAsesorCollection';
import { useAmbassadorPhoto } from '../../../hooks/useAmbassadorPhoto';
import {
  ProfileHeader,
  ProductFilters,
  CotizacionesSection,
  CotizacionPreviewDialog,
  ExclusiveCollectionSection,
  CollectionProductDialog,
} from './components';
import type {
  ProfileStats,
  ViewMode,
  SortOption,
  StatusFilter,
  TypeFilter,
} from './components';

// Normalize name for comparison
const normalizeName = (name: string): string => {
  let result = '';
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    if ((char >= 65 && char <= 90) || (char >= 97 && char <= 122)) {
      result += name[i].toUpperCase();
    }
  }
  return result;
};

export default function AsesorProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  // State for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

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

  // Notify on photo upload result
  const prevUploadingRef = useRef(false);
  useEffect(() => {
    // Detect when upload finishes (was uploading, now not)
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

  // Check if current user owns this profile (email must match Asesores sheet)
  const isProfileOwner = useMemo(() => {
    if (!googleUser?.email || !asesor?.email) return false;
    const userEmail = googleUser.email.toLowerCase().trim();
    const asesorEmail = asesor.email.toLowerCase().trim();
    return userEmail === asesorEmail;
  }, [googleUser, asesor]);

  // Exclusive collection - map asesor email to Drive folder name
  const COLLECTION_FOLDERS: Record<string, string> = {
    'cvocmnty@gmail.com': 'ceo-tierra-madre',
  };
  // Fallback: match by slug when email lookup fails
  const COLLECTION_SLUGS: Record<string, string> = {
    'andres-mauricio-escobar-ramirez': 'ceo-tierra-madre',
  };
  const collectionFolder = isProfileOwner && asesor
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
    const normalizedAsesorName = normalizeName(asesor.name);
    return treasure.filter(item => {
      if (!item.asesor) return false;
      return normalizeName(item.asesor) === normalizedAsesorName;
    });
  }, [asesor, treasure]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.nombre.toLowerCase().includes(query) ||
        item.color?.toLowerCase().includes(query) ||
        item.calidad?.toLowerCase().includes(query) ||
        String(item.item).includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(item =>
        statusFilter === 'disponible'
          ? item.estado === 'DISPONIBLE'
          : item.estado === 'VENDIDA'
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(item =>
        typeFilter === 'loose' ? !item.isJewelry : item.isJewelry
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'price-high':
          return (b.precioCOP || 0) - (a.precioCOP || 0);
        case 'price-low':
          return (a.precioCOP || 0) - (b.precioCOP || 0);
        case 'name':
          return a.nombre.localeCompare(b.nombre, 'es');
        case 'newest':
        default:
          return b.item - a.item;
      }
    });

    return result;
  }, [allProducts, searchQuery, statusFilter, typeFilter, sortBy]);

  // Calculate stats
  const stats: ProfileStats = useMemo(() => {
    if (!allProducts.length) return {
      totalValue: 0,
      avgPrice: 0,
      looseCount: 0,
      jewelryCount: 0,
      disponibleCount: 0,
      vendidaCount: 0,
    };

    const disponible = allProducts.filter(p => p.estado === 'DISPONIBLE');
    const totalValue = disponible.reduce((sum, p) => sum + (p.precioCOP || 0), 0);
    const looseCount = allProducts.filter(p => !p.isJewelry).length;
    const jewelryCount = allProducts.filter(p => p.isJewelry).length;

    return {
      totalValue,
      avgPrice: disponible.length ? totalValue / disponible.length : 0,
      looseCount,
      jewelryCount,
      disponibleCount: disponible.length,
      vendidaCount: allProducts.length - disponible.length,
    };
  }, [allProducts]);

  const handleBack = () => {
    navigate('/ambassadors');
  };

  const handleProductClick = (item: TreasureItem) => {
    navigate(`/product/${item.item}`);
  };

  const handleContact = () => {
    if (asesor) {
      notify(`Contacto con ${asesor.name} estará disponible próximamente`, 'info');
    }
  };

  const handleShare = async () => {
    if (asesor) {
      const url = window.location.href;
      const text = `Mira el catalogo de ${asesor.name} en Tierra Madre - ${stats.disponibleCount} esmeraldas disponibles`;

      if (navigator.share) {
        try {
          await navigator.share({ title: `${asesor.name} - Tierra Madre`, text, url });
        } catch {
          // User cancelled or error
        }
      } else {
        await navigator.clipboard.writeText(url);
        notify('Enlace copiado al portapapeles', 'success');
      }
    }
  };

  const handleShareWhatsApp = () => {
    if (asesor) {
      const url = window.location.href;
      const text = `Mira el catalogo de ${asesor.name} en Tierra Madre - ${stats.disponibleCount} esmeraldas disponibles: ${url}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      // Could use a snackbar here in the future
    } catch {
      // Clipboard not available
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setSortBy('newest');
  };

  const hasActiveFilters = Boolean(searchQuery || statusFilter !== 'all' || typeFilter !== 'all');

  const handleDeleteCotizacion = async (cot: SavedCotizacion) => {
    if (!googleUser?.email) return;
    const confirmed = await confirmAction('¿Eliminar esta cotización?');
    if (confirmed) {
      cotizacionHistory.deleteCotizacion(cot.id, googleUser.email);
    }
  };

  const handlePhotoEditClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset so the same file can be re-selected
    e.target.value = '';
  };

  if (isLoading) {
    return (
      <Box sx={{ pb: 4 }}>
        {/* Back button skeleton */}
        <Skeleton width={140} height={36} sx={{ mb: 2, borderRadius: 1 }} />
        {/* Profile header skeleton */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
            <Skeleton variant="circular" width={64} height={64} />
            <Box sx={{ flex: 1 }}>
              <Skeleton width="60%" height={28} />
              <Skeleton width="40%" height={20} sx={{ mt: 0.5 }} />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" width={80} height={56} sx={{ borderRadius: 2, flex: 1 }} />
            ))}
          </Box>
        </Paper>
        {/* Search bar skeleton */}
        <Skeleton variant="rounded" height={44} sx={{ borderRadius: 3, mb: 2 }} />
        {/* Product grid skeleton */}
        <Grid container spacing={2}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rounded" sx={{ width: '100%', aspectRatio: '1/1', borderRadius: 3 }} />
              <Box sx={{ px: 1, mt: 1 }}>
                <Skeleton width="70%" height={20} />
                <Skeleton width="40%" height={16} sx={{ mt: 0.5 }} />
              </Box>
            </Grid>
          ))}
        </Grid>
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
    <Box sx={{ pb: 4 }}>
      {/* Back Button */}
      <Button
        startIcon={<ArrowLeft size={18} />}
        onClick={handleBack}
        sx={{
          textTransform: 'none',
          color: 'text.secondary',
          mb: 2,
          '&:hover': { color: brand.emerald[500] },
        }}
      >
        Volver a Asesores
      </Button>

      {/* Hidden file input for photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      {/* Image Cropper Dialog (locked to 1:1) */}
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

      {/* Profile Header */}
      <ProfileHeader
        asesor={asesor}
        stats={stats}
        totalProducts={allProducts.length}
        onContact={handleContact}
        onShare={handleShare}
        onShareWhatsApp={handleShareWhatsApp}
        onCopyLink={handleCopyLink}
        isOwner={isProfileOwner}
        onPhotoEdit={handlePhotoEditClick}
        photoUrl={localPhotoUrl || undefined}
        isUploadingPhoto={isUploadingPhoto}
      />

      {/* My Cotizaciones Section - Only visible to profile owner */}
      {isProfileOwner && (
        <CotizacionesSection
          cotizaciones={cotizacionHistory.cotizaciones}
          isLoading={cotizacionHistory.isLoading}
          onViewCotizacion={setSelectedCotizacion}
          onDeleteCotizacion={handleDeleteCotizacion}
        />
      )}

      {/* Cotizacion Preview Dialog */}
      <CotizacionPreviewDialog
        cotizacion={selectedCotizacion}
        onClose={() => setSelectedCotizacion(null)}
      />

      {/* Exclusive Collection - Only visible to profile owner */}
      {collectionFolder && (
        <ExclusiveCollectionSection
          products={collectionProducts}
          collectionName={collectionInfo?.name || 'Coleccion Exclusiva'}
          collectionDescription={collectionInfo?.description}
          isLoading={collectionLoading}
          onProductClick={setSelectedCollectionProduct}
          onShare={isProfileOwner ? async () => {
            const url = `${window.location.origin}/c/${collectionFolder}`;
            const text = `Mira mi coleccion exclusiva de esmeraldas colombianas en Tierra Madre`;
            if (navigator.share) {
              try {
                await navigator.share({ title: 'Coleccion Exclusiva - Tierra Madre', text, url });
              } catch { /* user cancelled */ }
            } else {
              await navigator.clipboard.writeText(url);
              notify('Enlace de coleccion copiado', 'success');
            }
          } : undefined}
        />
      )}

      {/* Collection Product Detail Dialog */}
      <CollectionProductDialog
        product={selectedCollectionProduct}
        onClose={() => setSelectedCollectionProduct(null)}
      />

      {/* Search and Filters */}
      <ProductFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortBy={sortBy}
        onSortChange={setSortBy}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Results Count */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {filteredProducts.length} de {allProducts.length} productos
        </Typography>
      </Box>

      {/* Products Grid/List */}
      {filteredProducts.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
            bgcolor: isLight ? lightTokens.background.muted : darkTokens.background.surface,
          }}
        >
          <Package size={48} style={{ color: lightTokens.text.muted, marginBottom: 16 }} />
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2 }}>
            {hasActiveFilters
              ? 'No se encontraron productos con los filtros seleccionados'
              : 'Este embajador no tiene productos asignados actualmente'}
          </Typography>
          {hasActiveFilters && (
            <Button
              variant="outlined"
              onClick={clearFilters}
              sx={{ textTransform: 'none' }}
            >
              Limpiar filtros
            </Button>
          )}
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filteredProducts.map((item) => (
            <Grid
              item
              xs={12}
              sm={viewMode === 'list' ? 12 : 6}
              md={viewMode === 'list' ? 12 : 4}
              key={item.item}
            >
              <TreasureCard
                item={item}
                isCompact={viewMode === 'list'}
                onCertClick={() => {}}
                onClick={() => handleProductClick(item)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <ScrollToTop />
    </Box>
  );
}
