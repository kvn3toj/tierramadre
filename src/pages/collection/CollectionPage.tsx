/**
 * CollectionPage - Public shareable collection page
 *
 * Route: /c/:folder (e.g., /c/ceo-tierra-madre)
 * No authentication required. Displays an exclusive product collection
 * with branded header, product grid, and WhatsApp contact CTA.
 * Prices always shown in USD.
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Skeleton,
  IconButton,
  alpha,
  useTheme,
} from '@mui/material';
import { Gem, MessageCircle, Play } from 'lucide-react';
import { useAsesorCollection } from '../../hooks/useAsesorCollection';
import { CollectionProductDialog } from '../ambassadors/profile/components/CollectionProductDialog';
import CollectionSplashScreen from '../../components/shared/CollectionSplashScreen';
import { TreasureItem } from '../../types';
import { brand, lightTokens, darkTokens, legacyTypography as typography, legacyGradients as gradients, cssTransition } from '../../design-system';

// Map URL slug to actual Drive folder name (when they differ)
const FOLDER_ALIASES: Record<string, string> = {
  'ceo-tierra-madre': 'ceo-coomunity',
};

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
      {/* Media — poster image only, video plays in dialog on click */}
      <Box sx={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden', bgcolor: '#f0f0f0' }}>
        {posterSrc ? (
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
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            mb: 0.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: { xs: '0.8rem', sm: '0.875rem' },
          }}
        >
          {accentuate(item.nombre)}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
          {typeof item.peso === 'number' && (
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
              {item.peso} ct
            </Typography>
          )}
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
            -
          </Typography>
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

  const driveFolder = folder ? (FOLDER_ALIASES[folder] || folder) : null;
  const { products, collectionInfo, isLoading, error } = useAsesorCollection(driveFolder);
  const [selectedProduct, setSelectedProduct] = useState<TreasureItem | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  const contact = folder ? COLLECTION_CONTACTS[folder] : null;

  // Custom display order: 907, 906, then the rest (901, 902, ...)
  const PRIORITY_ORDER = [907, 906];
  const sortedProducts = [...products].sort((a, b) => {
    const aIdx = PRIORITY_ORDER.indexOf(a.item);
    const bIdx = PRIORITY_ORDER.indexOf(b.item);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.item - b.item;
  });

  const handleWhatsApp = () => {
    if (!contact) return;
    const text = `Hi ${contact.name}, I saw your exclusive collection on Tierra Madre and I'd like to know more.`;
    window.open(`https://wa.me/${contact.phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Show splash screen
  if (showSplash) {
    return (
      <CollectionSplashScreen
        onComplete={() => setShowSplash(false)}
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
        onClose={() => setSelectedProduct(null)}
        showUSD
      />
    </Box>
  );
}
