/**
 * CollectionPage - Public shareable collection page
 *
 * Route: /c/:folder (e.g., /c/ceo-tierra-madre)
 * No authentication required. Displays an exclusive product collection
 * with branded header, product grid, and WhatsApp contact CTA.
 * Prices always shown in USD.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Skeleton,
  IconButton,
  Button,
  Stack,
  alpha,
  useTheme,
} from '@mui/material';
import { Gem, MessageCircle, Play, ShieldCheck, Clock, ExternalLink, Copy, CheckCircle } from 'lucide-react';
import { useAsesorCollection } from '../../hooks/useAsesorCollection';
import { CollectionProductDialog } from '../ambassadors/profile/components/CollectionProductDialog';
import CollectionSplashScreen from '../../components/shared/CollectionSplashScreen';
import { TreasureItem } from '../../types';
import { brand, lightTokens, darkTokens, legacyTypography as typography, legacyGradients as gradients, cssTransition } from '../../design-system';
import { getCachedBrowserInfo } from '../../utils/deviceTier';

// Map URL slug to actual Drive folder name (when they differ)
const FOLDER_ALIASES: Record<string, string> = {
  'ceo-tierra-madre': 'ceo-coomunity',
};

// Slugs that should not be publicly accessible (use the canonical alias instead)
const BLOCKED_SLUGS = new Set(['ceo-coomunity']);

// Static CEO exclusive products (local video files, no API needed)
const CEO_STATIC_PRODUCTS: TreasureItem[] = [
  // --- Certified products first ---
  {
    item: 916, nombre: 'Emerald Whisper', peso: 1.26, color: 'Intense Green' as TreasureItem['color'],
    calidad: 'AAA' as TreasureItem['calidad'], cantidad: 1, talla: 'Emerald', medidas: '',
    precioCOP: 0, precioInternacional: 23000, ubicacion: '', asesor: '', estado: 'Disponible' as TreasureItem['estado'],
    fechaIngreso: '', isJewelry: false, mediaType: 'video' as TreasureItem['mediaType'],
    videoUrl: '/images/CEO/916/6) 1.26 Cts.mov', imagen: '/images/CEO/916/6) 1.26 Cts.mov',
    certificateUrl: '/images/CEO/916/6)Certificate1.26 Cts.png',
  },
  {
    item: 917, nombre: 'Verdant Crown', peso: 2.20, color: 'Intense Green' as TreasureItem['color'],
    calidad: 'AAA' as TreasureItem['calidad'], cantidad: 1, talla: 'Cushion', medidas: '',
    precioCOP: 0, precioInternacional: 28257, ubicacion: '', asesor: '', estado: 'Disponible' as TreasureItem['estado'],
    fechaIngreso: '', isJewelry: false, mediaType: 'video' as TreasureItem['mediaType'],
    videoUrl: '/images/CEO/917/7) 2.20 Cts.mp4', imagen: '/images/CEO/917/7) 2.20 Cts.mp4',
    certificateUrl: '/images/CEO/917/7) Certificate 2.20Cts.png',
  },
  {
    item: 913, nombre: 'Forest Hug', peso: 1.04, color: 'Intense Green' as TreasureItem['color'],
    calidad: 'AAA' as TreasureItem['calidad'], cantidad: 1, talla: 'Heart', medidas: '',
    precioCOP: 0, precioInternacional: 30857, ubicacion: '', asesor: '', estado: 'Disponible' as TreasureItem['estado'],
    fechaIngreso: '', isJewelry: false, mediaType: 'video' as TreasureItem['mediaType'],
    videoUrl: '/images/CEO/913/3-1.04Cts.mp4', imagen: '/images/CEO/913/3-1.04Cts.mp4',
    certificateUrl: '/images/CEO/913/3)Certificate-1.04.png',
  },
  {
    item: 914, nombre: 'Light Echo', peso: 0.67, color: 'Intense Green' as TreasureItem['color'],
    calidad: 'AAA' as TreasureItem['calidad'], cantidad: 1, talla: 'Emerald', medidas: '',
    precioCOP: 0, precioInternacional: 15429, ubicacion: '', asesor: '', estado: 'Disponible' as TreasureItem['estado'],
    fechaIngreso: '', isJewelry: false, mediaType: 'video' as TreasureItem['mediaType'],
    videoUrl: '/images/CEO/914/4-0.67-Cts.mp4', imagen: '/images/CEO/914/4-0.67-Cts.mp4',
    certificateUrl: '/images/CEO/914/4) Certificate 0.67 Cts.jpg',
  },
  // --- Being issued ---
  {
    item: 911, nombre: 'Song of the River', peso: 1.825, color: 'Intense Green' as TreasureItem['color'],
    calidad: 'AAA' as TreasureItem['calidad'], cantidad: 1, talla: 'Emerald', medidas: '',
    precioCOP: 0, precioInternacional: 22857, ubicacion: '', asesor: '', estado: 'Disponible' as TreasureItem['estado'],
    fechaIngreso: '', isJewelry: false, mediaType: 'video' as TreasureItem['mediaType'],
    videoUrl: '/images/CEO/911/1-1.825Cts.mp4', imagen: '/images/CEO/911/1-1.825Cts.mp4',
  },
  {
    item: 912, nombre: 'Soul of the Mountain', peso: 1.93, color: 'Intense Green' as TreasureItem['color'],
    calidad: 'AAA' as TreasureItem['calidad'], cantidad: 1, talla: 'Emerald', medidas: '',
    precioCOP: 0, precioInternacional: 36914, ubicacion: '', asesor: '', estado: 'Disponible' as TreasureItem['estado'],
    fechaIngreso: '', isJewelry: false, mediaType: 'video' as TreasureItem['mediaType'],
    videoUrl: '/images/CEO/912/2-1.93Cts.mp4', imagen: '/images/CEO/912/2-1.93Cts.mp4',
  },
  {
    item: 915, nombre: 'Kingdom of Peace', peso: 3.56, color: 'Intense Green' as TreasureItem['color'],
    calidad: 'AAA' as TreasureItem['calidad'], cantidad: 1, talla: 'Cushion', medidas: '',
    precioCOP: 0, precioInternacional: 12000, ubicacion: '', asesor: '', estado: 'Disponible' as TreasureItem['estado'],
    fechaIngreso: '', isJewelry: false, mediaType: 'video' as TreasureItem['mediaType'],
    videoUrl: '/images/CEO/915/5-3.54Cts.mp4', imagen: '/images/CEO/915/5-3.54Cts.mp4',
  },
];

// Map collection folders to WhatsApp contact info
const COLLECTION_CONTACTS: Record<string, { name: string; phone: string; title?: string; subtitle?: string }> = {
  'ceo-tierra-madre': {
    name: 'Andres',
    phone: '573183578265',
    title: 'Exclusive Collection',
    subtitle: "CEO's personal selection of Colombian emeralds",
  },
};

/** Format USD price */
function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Add missing Spanish accent marks to common words in product names */
const ACCENT_MAP: Record<string, string> = {
  'Corazon': 'Coraz\u00f3n', 'corazon': 'coraz\u00f3n',
  'Coleccion': 'Colecci\u00f3n', 'coleccion': 'colecci\u00f3n',
  'Edicion': 'Edici\u00f3n', 'edicion': 'edici\u00f3n',
  'Pasion': 'Pasi\u00f3n', 'pasion': 'pasi\u00f3n',
  'Ilusion': 'Ilusi\u00f3n', 'ilusion': 'ilusi\u00f3n',
  'Fenix': 'F\u00e9nix', 'fenix': 'f\u00e9nix',
  'Angel': '\u00c1ngel', 'angel': '\u00e1ngel',
  'Jardin': 'Jard\u00edn', 'jardin': 'jard\u00edn',
  'Arbol': '\u00c1rbol', 'arbol': '\u00e1rbol',
  'Oceano': 'Oc\u00e9ano', 'oceano': 'oc\u00e9ano',
  'Diamante': 'Diamante',
  'Aguila': '\u00c1guila', 'aguila': '\u00e1guila',
  'Unico': '\u00danico', 'unico': '\u00fanico',
  'Unica': '\u00danica', 'unica': '\u00fanica',
  'Magico': 'M\u00e1gico', 'magico': 'm\u00e1gico',
  'Magica': 'M\u00e1gica', 'magica': 'm\u00e1gica',
  'Raiz': 'Ra\u00edz', 'raiz': 'ra\u00edz',
  'Genesis': 'G\u00e9nesis', 'genesis': 'g\u00e9nesis',
  'Espiritu': 'Esp\u00edritu', 'espiritu': 'esp\u00edritu',
  'Exotico': 'Ex\u00f3tico', 'exotico': 'ex\u00f3tico',
  'Exotica': 'Ex\u00f3tica', 'exotica': 'ex\u00f3tica',
  'Avalon': 'Aval\u00f3n', 'avalon': 'aval\u00f3n',
};
export function accentuate(name: string): string {
  return name.replace(/\b\w+\b/g, (word) => ACCENT_MAP[word] || word);
}

function ProductCard({
  item,
  onClick,
  isLight,
}: {
  item: TreasureItem;
  onClick: () => void;
  isLight: boolean;
}) {
  const isVideo = item.mediaType === 'video';
  const posterSrc = item.posterUrl || item.imagen;
  return (
    <Box
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: isLight ? lightTokens.background.surface : darkTokens.background.surface,
        border: '1px solid',
        borderColor: isLight ? lightTokens.border.default : darkTokens.border.default,
        transition: cssTransition.default,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: isLight
            ? `0 8px 24px ${alpha(brand.emerald[500], 0.15)}`
            : `0 8px 24px rgba(0,0,0,0.4)`,
        },
      }}
    >
      {/* Media — lightweight thumbnail; video plays only in dialog */}
      <Box sx={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden', bgcolor: '#000' }}>
        {isVideo ? (
          // Use a video element with preload="metadata" to show first frame without buffering full file
          <video
            src={`${item.videoUrl || posterSrc}#t=0.001`}
            preload="metadata"
            muted
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
          />
        ) : posterSrc ? (
          <Box
            component="img"
            src={posterSrc}
            alt={item.nombre}
            loading="lazy"
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Gem size={40} style={{ color: brand.emerald[300] }} />
          </Box>
        )}
        {isVideo && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              bgcolor: 'rgba(0,0,0,0.6)',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Play size={16} color="#fff" fill="#fff" />
          </Box>
        )}
      </Box>

      {/* Info */}
      <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
              flex: 1,
              minWidth: 0,
            }}
          >
            {accentuate(item.nombre)}
          </Typography>
          {item.certificateUrl ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, flexShrink: 0 }}>
              <ShieldCheck size={12} color={brand.emerald[500]} />
              <Typography sx={{ fontSize: '0.55rem', color: brand.emerald[600], fontWeight: 600, lineHeight: 1 }}>
                Certified
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, flexShrink: 0 }}>
              <Clock size={11} color="#D4A017" />
              <Typography sx={{ fontSize: '0.55rem', color: '#B8941F', fontWeight: 500, lineHeight: 1 }}>
                Being issued
              </Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
          {typeof item.peso === 'number' && (
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
              {item.peso} ct
            </Typography>
          )}
          {item.talla && (
            <>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                ·
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                {item.talla}
              </Typography>
            </>
          )}
        </Box>
        {(item.precioInternacional || item.precioCOP) && (
          <Typography
            sx={{
              fontWeight: 700,
              color: brand.emerald[600],
              fontFamily: typography.fontFamily.mono,
              fontSize: { xs: '0.85rem', sm: '0.95rem' },
              fontFeatureSettings: '"tnum"',
            }}
          >
            {formatUSD(item.precioInternacional || item.precioCOP)} USD
          </Typography>
        )}
        {(item.precioInternacional || item.precioCOP) && typeof item.peso === 'number' && item.peso > 0 && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontFamily: typography.fontFamily.mono,
              fontSize: { xs: '0.65rem', sm: '0.75rem' },
              fontFeatureSettings: '"tnum"',
            }}
          >
            {formatUSD(Math.round((item.precioInternacional || item.precioCOP) / item.peso))}/ct
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default function CollectionPage() {
  const { folder } = useParams<{ folder: string }>();
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  const isBlocked = folder ? BLOCKED_SLUGS.has(folder) : false;
  const isCeoCollection = folder === 'ceo-tierra-madre';
  const driveFolder = folder ? (FOLDER_ALIASES[folder] || folder) : null;

  // Detect in-app browsers (Telegram, Instagram, etc.) that break video/media
  const browserInfo = useMemo(() => getCachedBrowserInfo(), []);
  const [urlCopied, setUrlCopied] = useState(false);
  const { products: apiProducts, collectionInfo, isLoading: apiLoading, error: apiError } = useAsesorCollection(isCeoCollection ? null : driveFolder);
  const [selectedProduct, setSelectedProduct] = useState<TreasureItem | null>(null);
  const dialogOpenRef = useRef(false);

  // Only show splash once per browser session per collection
  const splashSessionKey = `tm_collection_splash_${folder}`;
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem(splashSessionKey));

  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem(splashSessionKey, '1');
    setShowSplash(false);
  }, [splashSessionKey]);

  // Push a history entry when dialog opens (closed → open only) so browser
  // Back closes the dialog instead of navigating away from the page
  useEffect(() => {
    const wasOpen = dialogOpenRef.current;
    dialogOpenRef.current = !!selectedProduct;
    if (!wasOpen && selectedProduct) {
      window.history.pushState({ collectionDialog: true }, '');
    }
  }, [selectedProduct]);

  // Intercept popstate (back button) to close the dialog
  useEffect(() => {
    const handlePopState = () => {
      if (dialogOpenRef.current) {
        setSelectedProduct(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Close dialog by popping the history entry we pushed
  const handleCloseDialog = useCallback(() => {
    if (dialogOpenRef.current) {
      window.history.back();
    }
  }, []);

  const contact = folder ? COLLECTION_CONTACTS[folder] : null;

  // CEO collection uses static data; others use API
  const products = isCeoCollection ? CEO_STATIC_PRODUCTS : apiProducts;
  const isLoading = isCeoCollection ? false : apiLoading;
  const error = isCeoCollection ? null : apiError;
  const sortedProducts = products;

  const handleWhatsApp = () => {
    if (!contact) return;
    const text = `Hi ${contact.name}, I saw your exclusive collection on Tierra Madre and I'd like to know more.`;
    window.open(`https://wa.me/${contact.phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Block restricted slugs
  if (isBlocked) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: isLight ? lightTokens.background.page : darkTokens.background.app }}>
        <Box sx={{ textAlign: 'center' }}>
          <Gem size={48} style={{ color: brand.emerald[300], marginBottom: 16 }} />
          <Typography variant="h6">Collection not found</Typography>
        </Box>
      </Box>
    );
  }

  // Gate: in-app browsers (Telegram, Instagram, etc.) can't render videos properly
  if (browserInfo.isInAppBrowser) {
    const handleCopyUrl = async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = window.location.href;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    };

    const handleOpenExternal = () => {
      const url = window.location.href;
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isAndroid = /Android/i.test(navigator.userAgent);

      if (isAndroid) {
        try {
          window.location.href = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
          return;
        } catch { /* fall through */ }
      }

      if (isIOS) {
        try {
          window.location.href = url.replace(/^https:\/\//, 'x-safari-https://');
          setTimeout(() => {
            if (navigator.share) {
              navigator.share({ title: 'Tierra Madre', url }).catch(() => handleCopyUrl());
            } else {
              handleCopyUrl();
            }
          }, 500);
          return;
        } catch { /* fall through */ }
      }

      if (navigator.share) {
        navigator.share({ title: 'Tierra Madre Collection', text: 'View this emerald collection in your browser', url }).catch(() => handleCopyUrl());
      } else {
        handleCopyUrl();
      }
    };

    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: darkTokens.background.app,
          background: `radial-gradient(ellipse at 50% 30%, #0d1a14 0%, ${darkTokens.background.app} 50%, #050505 100%)`,
          px: 3,
        }}
      >
        <Box
          component="img"
          src="/images/logo-horizontal-white.png"
          alt="Tierra Madre"
          sx={{ height: 48, objectFit: 'contain', mb: 4 }}
        />
        <Box
          sx={{
            maxWidth: 360,
            width: '100%',
            p: 3,
            borderRadius: 3,
            bgcolor: alpha(brand.emerald[500], 0.08),
            border: `1px solid ${alpha(brand.emerald[500], 0.2)}`,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ color: brand.emerald[300], mb: 1, textAlign: 'center', fontWeight: 500 }}
          >
            This collection deserves a better window
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: alpha('#fff', 0.6), mb: 3, textAlign: 'center', lineHeight: 1.5 }}
          >
            {browserInfo.browserName || 'This browser'} can't display our emeralds the way they were meant to be seen. Open in Safari or Chrome to experience the full collection.
          </Typography>
          <Stack spacing={1.5}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<ExternalLink size={18} />}
              onClick={handleOpenExternal}
              sx={{
                bgcolor: brand.emerald[500],
                color: '#000',
                textTransform: 'none',
                py: 1.2,
                fontWeight: 500,
                '&:hover': { bgcolor: brand.emerald[400] },
              }}
            >
              View Collection
            </Button>
            <Button
              variant="text"
              size="small"
              startIcon={urlCopied ? <CheckCircle size={16} /> : <Copy size={16} />}
              onClick={handleCopyUrl}
              sx={{
                color: urlCopied ? brand.emerald[400] : alpha('#fff', 0.4),
                textTransform: 'none',
                '&:hover': { color: alpha('#fff', 0.6) },
              }}
            >
              {urlCopied ? 'Copied' : 'Copy link'}
            </Button>
          </Stack>
        </Box>
      </Box>
    );
  }

  // Show splash screen
  if (showSplash) {
    return (
      <CollectionSplashScreen
        onComplete={handleSplashComplete}
        showProgress={false}
      />
    );
  }

  return (
    <Box
      sx={{
        height: '100vh',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        bgcolor: isLight ? lightTokens.background.page : darkTokens.background.app,
      }}
    >
      {/* Branded Header */}
      <Box
        sx={{
          background: gradients.header,
          px: { xs: 2, sm: 3 },
          pt: 'max(env(safe-area-inset-top, 16px), 16px)',
          pb: { xs: 2.5, sm: 3 },
          textAlign: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
          <Box
            component="img"
            src="/images/logo-horizontal-white.png"
            alt="Tierra M\u00e4dre"
            sx={{ height: { xs: 48, sm: 64 }, objectFit: 'contain' }}
          />
        </Box>
        <Typography
          sx={{
            fontSize: { xs: typography.size.xs, sm: typography.size.sm },
            color: alpha('#fff', 0.7),
            letterSpacing: typography.letterSpacing.wider,
            textTransform: 'uppercase',
          }}
        >
          {contact?.title || collectionInfo?.name || 'Exclusive Collection'}
        </Typography>
      </Box>

      {/* Content */}
      <Box sx={{ maxWidth: { xs: '100%', md: 960, lg: 1200 }, mx: 'auto', px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 2, sm: 3 } }}>
        {(contact?.subtitle || collectionInfo?.description) && (
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', textAlign: 'center', mb: { xs: 2, sm: 3 } }}
          >
            {contact?.subtitle || collectionInfo?.description}
          </Typography>
        )}

        {/* Loading */}
        {isLoading && (
          <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Grid item xs={6} sm={4} md={3} key={i}>
                <Skeleton variant="rounded" sx={{ width: '100%', aspectRatio: '1/1', borderRadius: 3 }} />
                <Box sx={{ mt: 1 }}>
                  <Skeleton width="70%" height={18} />
                  <Skeleton width="40%" height={14} sx={{ mt: 0.5 }} />
                </Box>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Error */}
        {error && !isLoading && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Gem size={48} style={{ color: brand.emerald[300], marginBottom: 16 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>
              Collection unavailable
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              We couldn't load this collection. Please try again later.
            </Typography>
          </Box>
        )}

        {/* Products Grid */}
        {!isLoading && !error && products.length > 0 && (
          <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
            {sortedProducts.map((item) => (
              <Grid item xs={6} sm={4} md={3} key={item.item}>
                <ProductCard
                  item={item}
                  onClick={() => setSelectedProduct(item)}
                  isLight={isLight}
                />
              </Grid>
            ))}
          </Grid>
        )}

        {/* Empty State */}
        {!isLoading && !error && products.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Gem size={48} style={{ color: brand.emerald[300], marginBottom: 16 }} />
            <Typography variant="h6">
              No products in this collection
            </Typography>
          </Box>
        )}
      </Box>

      {/* WhatsApp CTA - Fixed bottom */}
      {contact && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 'max(env(safe-area-inset-bottom, 16px), 16px)',
            right: 16,
            zIndex: 10,
          }}
        >
          <IconButton
            onClick={handleWhatsApp}
            sx={{
              bgcolor: '#25D366',
              color: '#fff',
              width: 56,
              height: 56,
              boxShadow: '0 4px 14px rgba(37, 211, 102, 0.4)',
              '&:hover': { bgcolor: '#20BD5A' },
            }}
          >
            <MessageCircle size={28} />
          </IconButton>
        </Box>
      )}

      {/* Product Detail Dialog */}
      <CollectionProductDialog
        product={selectedProduct}
        onClose={handleCloseDialog}
        showUSD
      />
    </Box>
  );
}
