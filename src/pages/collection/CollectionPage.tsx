/**
 * CollectionPage - Public shareable collection page
 *
 * Route: /c/:folder (e.g., /c/ceo-coomunity)
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
import { TreasureItem } from '../../types';
import { brand, lightTokens, darkTokens, typography, gradients } from '../../design-system';

// Map collection folders to WhatsApp contact info
const COLLECTION_CONTACTS: Record<string, { name: string; phone: string }> = {
  'ceo-coomunity': { name: 'Andres', phone: '573183578265' },
};

/** Extract fileId from proxy URL: /api/serve-drive-image?fileId=XXX&... */
function extractFileId(url: string): string | null {
  try {
    const match = url.match(/fileId=([^&]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/** Build video streaming URL from fileId */
function getVideoUrl(thumbnailUrl: string): string {
  const fileId = extractFileId(thumbnailUrl);
  if (!fileId) return thumbnailUrl;
  return `/api/serve-drive-image?fileId=${fileId}`;
}

/** Format USD price */
function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
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
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: isLight
            ? `0 8px 24px ${alpha(brand.emerald[500], 0.15)}`
            : `0 8px 24px rgba(0,0,0,0.4)`,
        },
      }}
    >
      {/* Media */}
      <Box sx={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden', bgcolor: isVideo ? '#000' : '#f0f0f0' }}>
        {isVideo && item.imagen ? (
          <>
            <video
              src={`${getVideoUrl(item.imagen)}#t=0.001`}
              poster={item.imagen}
              preload="metadata"
              muted
              playsInline
              loop
              onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
              onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
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
          </>
        ) : item.imagen ? (
          <Box
            component="img"
            src={item.imagen}
            alt={item.nombre}
            loading="lazy"
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Gem size={40} style={{ color: brand.emerald[300] }} />
          </Box>
        )}
      </Box>

      {/* Info */}
      <Box sx={{ p: 2 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            mb: 0.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.nombre}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
          {typeof item.peso === 'number' && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {item.peso} ct
            </Typography>
          )}
          {item.color && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              &middot; {item.color}
            </Typography>
          )}
        </Box>
        {(item.precioInternacional || item.precioCOP) && (
          <Typography
            sx={{
              fontWeight: 700,
              color: brand.emerald[600],
              fontFamily: typography.fontFamily.mono,
              fontSize: '0.95rem',
              fontFeatureSettings: '"tnum"',
            }}
          >
            {formatUSD(item.precioInternacional || item.precioCOP)}
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

  const { products, collectionInfo, isLoading, error } = useAsesorCollection(folder ?? null);
  const [selectedProduct, setSelectedProduct] = useState<TreasureItem | null>(null);

  const contact = folder ? COLLECTION_CONTACTS[folder] : null;

  const handleWhatsApp = () => {
    if (!contact) return;
    const text = `Hola ${contact.name}, vi tu coleccion exclusiva en Tierra Madre y me interesa saber mas.`;
    window.open(`https://wa.me/${contact.phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <Box
      sx={{
        minHeight: 'var(--vh, 100dvh)',
        bgcolor: isLight ? lightTokens.background.page : darkTokens.background.app,
      }}
    >
      {/* Branded Header */}
      <Box
        sx={{
          background: gradients.header,
          px: 3,
          pt: 'max(env(safe-area-inset-top, 16px), 16px)',
          pb: 3,
          textAlign: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
          <Box
            component="img"
            src="/images/logo-horizontal-white.png"
            alt="Tierra M\u00e4dre"
            sx={{ height: 40, objectFit: 'contain' }}
          />
        </Box>
        <Typography
          sx={{
            fontSize: typography.size.sm,
            color: alpha('#fff', 0.7),
            letterSpacing: typography.letterSpacing.wider,
            textTransform: 'uppercase',
          }}
        >
          {collectionInfo?.name || 'Coleccion Exclusiva'}
        </Typography>
      </Box>

      {/* Content */}
      <Box sx={{ maxWidth: 960, mx: 'auto', px: 2, py: 3 }}>
        {collectionInfo?.description && (
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', textAlign: 'center', mb: 3 }}
          >
            {collectionInfo.description}
          </Typography>
        )}

        {/* Loading */}
        {isLoading && (
          <Grid container spacing={2}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Grid item xs={6} sm={4} key={i}>
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
              Coleccion no disponible
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No pudimos cargar esta coleccion. Intenta de nuevo mas tarde.
            </Typography>
          </Box>
        )}

        {/* Products Grid */}
        {!isLoading && !error && products.length > 0 && (
          <Grid container spacing={2}>
            {products.map((item) => (
              <Grid item xs={6} sm={4} key={item.item}>
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
              No hay productos en esta coleccion
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
