/**
 * CollectionProductDialog Component
 * Fullscreen dialog showing detail for an exclusive collection product.
 * These items are NOT in the main inventory, so we display them in-place.
 * Supports a media carousel: video/image + certificate when available.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { X, ShieldCheck, ChevronLeft, ChevronRight, Share2, Clock } from 'lucide-react';
import { TreasureItem } from '../../../../types';
import { brand, lightTokens, darkTokens, legacyTypography as typography } from '../../../../design-system';
import { emeraldCore, goldAccent } from '../../../../design-system/tokens/colors';
import { PriceDisplay } from '../../../../components/price-simulator/PriceDisplay';
import { accentuate } from '../../../../pages/collection/CollectionPage';

/** Extract fileId from proxy URL and return a clean video streaming URL */
function getVideoUrl(thumbnailUrl: string): string {
  const match = thumbnailUrl.match(/fileId=([^&]+)/);
  if (!match) return thumbnailUrl;
  return `/api/serve-drive-image?fileId=${match[1]}`;
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

interface CollectionProductDialogProps {
  product: TreasureItem | null;
  onClose: () => void;
  /** When true, shows price in USD directly instead of using CurrencyContext */
  showUSD?: boolean;
  onShare?: (product: TreasureItem) => void;
}

export const CollectionProductDialog: React.FC<CollectionProductDialogProps> = ({
  product,
  onClose,
  showUSD = false,
  onShare,
}) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoading, setVideoLoading] = useState(true);
  const [certLoading, setCertLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);

  const hasCertificate = !!product?.certificateUrl;
  const isPdf = product?.certificateUrl?.endsWith('.pdf');
  const slideCount = hasCertificate ? 2 : 1;

  // Reset state when product changes
  useEffect(() => {
    if (product?.mediaType === 'video') setVideoLoading(true);
    if (product?.certificateUrl && !product.certificateUrl.endsWith('.pdf')) setCertLoading(true);
    setActiveSlide(0);
  }, [product]);

  // Carousel swipe handling — swipe right on slide 0 closes dialog
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    // Only handle horizontal swipes (ignore vertical scroll)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX < 0 && activeSlide < slideCount - 1) {
        setActiveSlide((s) => s + 1);
      } else if (deltaX > 0 && activeSlide > 0) {
        setActiveSlide((s) => s - 1);
      } else if (deltaX > 100 && activeSlide === 0) {
        // Swipe right on first slide closes dialog
        onClose();
      }
    }
  }, [activeSlide, slideCount, onClose]);

  // Force video to play immediately when dialog opens
  useEffect(() => {
    if (product && product.mediaType === 'video' && videoRef.current && activeSlide === 0) {
      const video = videoRef.current;
      video.currentTime = 0;
      video.play().catch((err) => {
        console.warn('Video autoplay failed:', err);
      });
    }
  }, [product, activeSlide]);

  return (
    <Dialog
      open={!!product}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          bgcolor: isLight ? lightTokens.background.surface : darkTokens.background.surface,
        },
      }}
    >
      <DialogContent
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        sx={{ p: 0, position: 'relative', ...(isMobile && { overflowY: 'auto' }) }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: isMobile ? 'max(env(safe-area-inset-top, 8px), 8px)' : 8,
            right: 8,
            zIndex: 2,
            bgcolor: 'rgba(0,0,0,0.5)',
            color: '#fff',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
          }}
        >
          <X size={20} />
        </IconButton>

        {product && (
          <>
            {/* Media Carousel */}
            <Box
              sx={{ position: 'relative', overflow: 'hidden' }}
            >
              <Box
                sx={{
                  display: 'flex',
                  transition: 'transform 0.3s ease',
                  transform: `translateX(-${activeSlide * 100}%)`,
                }}
              >
                {/* Slide 1: Video or Image */}
                <Box sx={{ minWidth: '100%', aspectRatio: '1/1', position: 'relative' }}>
                  {product.imagen && (
                    product.mediaType === 'video' ? (
                      <Box sx={{ width: '100%', height: '100%', bgcolor: '#000', position: 'relative' }}>
                        {videoLoading && (
                          <Box
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: 1,
                              gap: 1.5,
                            }}
                          >
                            <CircularProgress size={40} aria-label="Cargando" sx={{ color: brand.emerald[400] }} />
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                              Loading video...
                            </Typography>
                          </Box>
                        )}
                        <video
                          ref={videoRef}
                          key={product.item}
                          src={product.videoUrl || getVideoUrl(product.imagen)}
                          poster={product.posterUrl}
                          autoPlay
                          muted
                          loop
                          playsInline
                          preload="auto"
                          webkit-playsinline="true"
                          onLoadedData={(e) => {
                            setVideoLoading(false);
                            const video = e.target as HTMLVideoElement;
                            video.play().catch(() => {});
                          }}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            display: 'block',
                          }}
                        />
                      </Box>
                    ) : (
                      <Box
                        component="img"
                        src={product.imagen}
                        alt={product.nombre}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    )
                  )}
                </Box>

                {/* Slide 2: Certificate */}
                {hasCertificate && (
                  <Box
                    sx={{
                      minWidth: '100%',
                      aspectRatio: '1/1',
                      bgcolor: isLight ? '#f5f5f5' : '#1a1a1a',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    {isPdf ? (
                      // PDF: show a branded card that opens the PDF
                      <Box
                        component="a"
                        href={product.certificateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 2,
                          textDecoration: 'none',
                          p: 4,
                        }}
                      >
                        <ShieldCheck size={56} color={brand.emerald[500]} />
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', textAlign: 'center' }}>
                          Authenticity Certificate
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                          Tap to open certificate PDF
                        </Typography>
                        <Box
                          sx={{
                            mt: 1,
                            px: 3,
                            py: 1,
                            borderRadius: 2,
                            bgcolor: brand.emerald[500],
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                          }}
                        >
                          View PDF
                        </Box>
                      </Box>
                    ) : (
                      // Image certificate: display inline with loading state
                      <>
                        {certLoading && (
                          <Box
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: 1,
                              gap: 1.5,
                            }}
                          >
                            <CircularProgress size={40} aria-label="Cargando" sx={{ color: brand.emerald[400] }} />
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              Loading certificate...
                            </Typography>
                          </Box>
                        )}
                        <Box
                          component="img"
                          src={product.certificateUrl}
                          alt="Certificate"
                          onLoad={() => setCertLoading(false)}
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            display: 'block',
                            opacity: certLoading ? 0 : 1,
                            transition: 'opacity 0.2s ease',
                          }}
                        />
                      </>
                    )}
                  </Box>
                )}
              </Box>

              {/* Carousel Navigation Arrows (desktop) */}
              {slideCount > 1 && !isMobile && (
                <>
                  {activeSlide > 0 && (
                    <IconButton
                      onClick={() => setActiveSlide((s) => s - 1)}
                      sx={{
                        position: 'absolute',
                        left: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        bgcolor: 'rgba(0,0,0,0.5)',
                        color: '#fff',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                        zIndex: 1,
                      }}
                    >
                      <ChevronLeft size={20} />
                    </IconButton>
                  )}
                  {activeSlide < slideCount - 1 && (
                    <IconButton
                      onClick={() => setActiveSlide((s) => s + 1)}
                      sx={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        bgcolor: 'rgba(0,0,0,0.5)',
                        color: '#fff',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                        zIndex: 1,
                      }}
                    >
                      <ChevronRight size={20} />
                    </IconButton>
                  )}
                </>
              )}

              {/* Dot indicators */}
              {slideCount > 1 && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: 0.8,
                    zIndex: 1,
                  }}
                >
                  {Array.from({ length: slideCount }).map((_, i) => (
                    <Box
                      key={i}
                      onClick={() => setActiveSlide(i)}
                      sx={{
                        width: activeSlide === i ? 18 : 8,
                        height: 8,
                        borderRadius: 4,
                        bgcolor: activeSlide === i ? brand.emerald[400] : 'rgba(255,255,255,0.5)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    />
                  ))}
                </Box>
              )}

              {/* Certificate badge on video slide */}
              {hasCertificate && activeSlide === 0 && (
                <Box
                  onClick={() => setActiveSlide(1)}
                  sx={{
                    position: 'absolute',
                    bottom: slideCount > 1 ? 32 : 12,
                    right: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    bgcolor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    borderRadius: 1.5,
                    px: 1,
                    py: 0.5,
                    cursor: 'pointer',
                    zIndex: 1,
                  }}
                >
                  <ShieldCheck size={14} color={brand.emerald[400]} />
                  <Typography sx={{ color: '#fff', fontSize: '0.7rem', fontWeight: 600 }}>
                    Certificate
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Product Info */}
            <Box sx={{ px: { xs: 2, sm: 2.5 }, pt: 2, pb: { xs: 2, sm: 2.5 } }}>
              {/* Name + metadata row */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: 1.5 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: { xs: '1.35rem', sm: '1.5rem' },
                      fontWeight: 700,
                      letterSpacing: '-0.02em',
                      lineHeight: 1.2,
                    }}
                  >
                    {accentuate(product.nombre)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mt: 0.5 }}>
                    {product.certificateUrl ? (
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3 }}>
                        <ShieldCheck size={11} color={emeraldCore.primary} />
                        <Typography sx={{ fontSize: '12px', fontWeight: 600, color: emeraldCore.primary }}>
                          Certified
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3 }}>
                        <Clock size={11} color={goldAccent.dark} />
                        <Typography sx={{ fontSize: '12px', fontWeight: 500, color: goldAccent.dark }}>
                          Being issued
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
                {/* Share icon button */}
                {onShare && (
                  <IconButton
                    onClick={() => onShare(product)}
                    size="small"
                    sx={{
                      mt: 0.25,
                      color: isLight ? 'rgba(60,60,67,0.4)' : 'rgba(235,235,245,0.4)',
                      '&:hover': { color: emeraldCore.primary },
                    }}
                  >
                    <Share2 size={18} />
                  </IconButton>
                )}
              </Box>

              {/* Specs + Price — labeled rows */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 1.5,
                }}
              >
                {/* Price */}
                {(showUSD && (product.precioInternacional || product.precioCOP)) && (
                  <Box>
                    <Typography sx={{ fontSize: '11px', color: 'text.secondary', fontWeight: 500, mb: 0.25 }}>
                      Price
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: '1.25rem', sm: '1.35rem' },
                        fontWeight: 700,
                        color: emeraldCore.primary,
                        fontFamily: typography.fontFamily.mono,
                        fontFeatureSettings: '"tnum"',
                        lineHeight: 1.2,
                      }}
                    >
                      {formatUSD(product.precioInternacional || product.precioCOP)}
                    </Typography>
                  </Box>
                )}
                {/* Price per Carat */}
                {(showUSD && (product.precioInternacional || product.precioCOP) && typeof product.peso === 'number' && product.peso > 0) && (
                  <Box>
                    <Typography sx={{ fontSize: '11px', color: 'text.secondary', fontWeight: 500, mb: 0.25 }}>
                      Price per Carat
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: '1.25rem', sm: '1.35rem' },
                        fontWeight: 700,
                        fontFamily: typography.fontFamily.mono,
                        fontFeatureSettings: '"tnum"',
                        lineHeight: 1.2,
                      }}
                    >
                      {formatUSD(Math.round((product.precioInternacional || product.precioCOP) / product.peso))}
                    </Typography>
                  </Box>
                )}
                {/* Carats */}
                {typeof product.peso === 'number' && (
                  <Box>
                    <Typography sx={{ fontSize: '11px', color: 'text.secondary', fontWeight: 500, mb: 0.25 }}>
                      Carats
                    </Typography>
                    <Typography sx={{ fontSize: { xs: '1.25rem', sm: '1.35rem' }, fontWeight: 700, lineHeight: 1.2 }}>
                      {product.peso} ct
                    </Typography>
                  </Box>
                )}
                {/* Cut */}
                {product.talla && (
                  <Box>
                    <Typography sx={{ fontSize: '11px', color: 'text.secondary', fontWeight: 500, mb: 0.25 }}>
                      Cut
                    </Typography>
                    <Typography sx={{ fontSize: { xs: '1.25rem', sm: '1.35rem' }, fontWeight: 700, lineHeight: 1.2 }}>
                      {product.talla}
                    </Typography>
                  </Box>
                )}
              </Box>
              {/* Fallback non-USD price */}
              {!(showUSD && (product.precioInternacional || product.precioCOP)) && (
                <PriceDisplay price={product.precioCOP} precioInternacional={product.precioInternacional} />
              )}
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

