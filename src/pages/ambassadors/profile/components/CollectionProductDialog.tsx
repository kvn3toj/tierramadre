/**
 * CollectionProductDialog Component
 * Fullscreen dialog showing detail for an exclusive collection product.
 * Fetches full image gallery from Drive API for carousel display.
 * Supports: multiple images, videos, certificate slide.
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
import { qeFont, qeGray, qeType, zIndex } from '../../../../design-system';
import { PriceDisplay } from '../../../../components/price-simulator/PriceDisplay';
import { accentuate } from '../../../../pages/collection/CollectionPage';
import { formatCarats } from '../../../../utils/formatting';

/** A single media slide in the carousel */
interface MediaSlide {
  id: string;
  url: string;
  type: 'image' | 'video';
  alt: string;
}

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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoading, setVideoLoading] = useState(true);
  const [certLoading, setCertLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);

  // Gallery state — fetched from Drive API
  const [gallerySlides, setGallerySlides] = useState<MediaSlide[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

  const hasCertificate = !!product?.certificateUrl;
  const isPdf = product?.certificateUrl?.endsWith('.pdf');

  // Total slides = gallery images + certificate (if any)
  const slideCount = gallerySlides.length + (hasCertificate ? 1 : 0);

  // Fetch full gallery from Drive API when product changes
  useEffect(() => {
    if (!product) return;

    const controller = new AbortController();
    setActiveSlide(0);
    setVideoLoading(true);
    if (product.certificateUrl && !product.certificateUrl.endsWith('.pdf')) setCertLoading(true);

    // Start with the product's existing image as fallback
    const fallbackSlide: MediaSlide = {
      id: `fallback-${product.item}`,
      url: product.mediaType === 'video'
        ? (product.videoUrl || getVideoUrl(product.imagen || ''))
        : (product.imagen || ''),
      type: product.mediaType === 'video' ? 'video' : 'image',
      alt: product.nombre,
    };

    if (product.imagen) {
      setGallerySlides([fallbackSlide]);
    } else {
      setGallerySlides([]);
    }

    // Fetch full gallery from API
    if (product.item) {
      setGalleryLoading(true);
      fetch(`/api/get-drive-images?itemNumber=${product.item}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.images?.length > 0) {
            const driveSlides: MediaSlide[] = data.images
              .sort((a: any, b: any) => {
                // Images first, then videos
                if (a.type === 'image' && b.type === 'video') return -1;
                if (a.type === 'video' && b.type === 'image') return 1;
                return (a.order ?? 0) - (b.order ?? 0);
              })
              .map((img: any) => ({
                id: img.id,
                url: img.type === 'video'
                  ? `/api/serve-drive-image?fileId=${img.id}`
                  : (img.proxyUrl || img.fullUrl || img.previewUrl || img.thumbnailUrl),
                type: img.type as 'image' | 'video',
                alt: img.name || `${product.nombre} - ${(img.order ?? 0) + 1}`,
              }));
            setGallerySlides(driveSlides);
          }
        })
        .catch((err) => {
          if (err.name !== 'AbortError') console.warn('Failed to fetch gallery:', err);
          // Keep fallback slide
        })
        .finally(() => setGalleryLoading(false));
    }

    return () => controller.abort();
  }, [product]);

  // Carousel swipe handling
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX < 0 && activeSlide < slideCount - 1) {
        setActiveSlide((s) => s + 1);
      } else if (deltaX > 0 && activeSlide > 0) {
        setActiveSlide((s) => s - 1);
      }
    }
  }, [activeSlide, slideCount]);

  // Keyboard navigation
  useEffect(() => {
    if (!product) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && activeSlide > 0) setActiveSlide((s) => s - 1);
      if (e.key === 'ArrowRight' && activeSlide < slideCount - 1) setActiveSlide((s) => s + 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [product, activeSlide, slideCount]);

  // Auto-play video when its slide is active
  useEffect(() => {
    if (!product || activeSlide >= gallerySlides.length) return;
    const slide = gallerySlides[activeSlide];
    if (slide?.type === 'video' && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [product, activeSlide, gallerySlides]);

  // Certificate slide index
  const certSlideIndex = hasCertificate ? gallerySlides.length : -1;

  return (
    <Dialog
      open={!!product}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 'var(--tm-radius-sheet)',
          bgcolor: 'var(--tm-surface)',
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
            zIndex: zIndex.base,
            bgcolor: 'var(--tm-scrim)',
            color: qeGray[0],
            '&:hover': { bgcolor: 'var(--tm-scrim)' },
          }}
        >
          <X size={20} />
        </IconButton>

        {product && (
          <>
            {/* Media Carousel */}
            <Box sx={{ position: 'relative', overflow: 'hidden' }}>
              <Box
                sx={{
                  display: 'flex',
                  transition: 'transform var(--tm-base) var(--tm-ease)',
                  transform: `translateX(-${activeSlide * 100}%)`,
                }}
              >
                {/* Gallery slides */}
                {gallerySlides.map((slide) => (
                  <Box key={slide.id} sx={{ minWidth: '100%', aspectRatio: '1/1', position: 'relative' }}>
                    {slide.type === 'video' ? (
                      <Box sx={{ width: '100%', height: '100%', bgcolor: qeGray[900], position: 'relative' }}>
                        {videoLoading && activeSlide === gallerySlides.indexOf(slide) && (
                          <Box
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: zIndex.base,
                              gap: 1.5,
                            }}
                          >
                            <CircularProgress size={40} aria-label="Cargando" sx={{ color: 'var(--tm-accent)' }} />
                            <Typography variant="caption" sx={{ color: qeGray[300] }}>
                              Loading video...
                            </Typography>
                          </Box>
                        )}
                        <video
                          ref={activeSlide === gallerySlides.indexOf(slide) ? videoRef : undefined}
                          key={slide.id}
                          src={`${slide.url}#t=0.001`}
                          poster={product.posterUrl}
                          autoPlay={activeSlide === gallerySlides.indexOf(slide)}
                          muted
                          loop
                          playsInline
                          preload={activeSlide === gallerySlides.indexOf(slide) ? 'auto' : 'none'}
                          onLoadedData={(e) => {
                            setVideoLoading(false);
                            (e.target as HTMLVideoElement).play().catch(() => {});
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
                        src={slide.url}
                        alt={slide.alt}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    )}
                  </Box>
                ))}

                {/* Certificate slide (last) */}
                {hasCertificate && (
                  <Box
                    sx={{
                      minWidth: '100%',
                      aspectRatio: '1/1',
                      bgcolor: 'var(--tm-well)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    {isPdf ? (
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
                        <ShieldCheck size={56} style={{ color: 'var(--tm-accent)' }} />
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
                            borderRadius: 'var(--tm-radius-control)',
                            bgcolor: 'var(--tm-accent-strong)',
                            color: 'var(--tm-on-accent)',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                          }}
                        >
                          View PDF
                        </Box>
                      </Box>
                    ) : (
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
                              zIndex: zIndex.base,
                              gap: 1.5,
                            }}
                          >
                            <CircularProgress size={40} aria-label="Cargando" sx={{ color: 'var(--tm-accent)' }} />
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
                            transition: 'opacity var(--tm-fast) var(--tm-ease)',
                          }}
                        />
                      </>
                    )}
                  </Box>
                )}
              </Box>

              {/* Slide counter */}
              {slideCount > 1 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    bgcolor: 'var(--tm-scrim)',
                    borderRadius: 'var(--tm-radius-well)',
                    px: 1,
                    py: 0.3,
                    zIndex: zIndex.base,
                  }}
                >
                  <Typography sx={{ color: qeGray[0], fontSize: '0.7rem', fontWeight: 600 }}>
                    {activeSlide + 1} / {slideCount}
                  </Typography>
                </Box>
              )}

              {/* Gallery loading indicator */}
              {galleryLoading && gallerySlides.length <= 1 && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 40,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    bgcolor: 'var(--tm-scrim)',
                    borderRadius: 'var(--tm-radius-control)',
                    px: 1.5,
                    py: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    zIndex: zIndex.base,
                  }}
                >
                  <CircularProgress size={14} sx={{ color: qeGray[0] }} />
                  <Typography sx={{ color: qeGray[0], fontSize: '0.7rem' }}>
                    Loading gallery...
                  </Typography>
                </Box>
              )}

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
                        bgcolor: 'var(--tm-scrim)',
                        color: qeGray[0],
                        '&:hover': { bgcolor: 'var(--tm-scrim)' },
                        zIndex: zIndex.base,
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
                        bgcolor: 'var(--tm-scrim)',
                        color: qeGray[0],
                        '&:hover': { bgcolor: 'var(--tm-scrim)' },
                        zIndex: zIndex.base,
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
                    zIndex: zIndex.base,
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
                        // On-photo chrome. The certificate slide no longer gets
                        // its own gold dot — one saturated colour (§4).
                        bgcolor:
                          activeSlide === i ? 'var(--tm-accent-pure)' : qeGray[300],
                        cursor: 'pointer',
                        transition: 'width var(--tm-fast) var(--tm-ease)',
                      }}
                    />
                  ))}
                </Box>
              )}

              {/* Certificate badge */}
              {hasCertificate && activeSlide !== certSlideIndex && (
                <Box
                  onClick={() => setActiveSlide(certSlideIndex)}
                  sx={{
                    position: 'absolute',
                    bottom: slideCount > 1 ? 32 : 12,
                    right: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    bgcolor: 'var(--tm-scrim)',
                    borderRadius: 'var(--tm-radius-well)',
                    px: 1,
                    py: 0.5,
                    cursor: 'pointer',
                    zIndex: zIndex.base + 1,
                  }}
                >
                  <ShieldCheck size={14} style={{ color: 'var(--tm-accent-pure)' }} />
                  <Typography sx={{ color: qeGray[0], fontSize: '0.7rem', fontWeight: 600 }}>
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
                      ...qeType.title,
                      fontSize: { xs: '1.6rem', sm: '1.8rem' },
                    }}
                  >
                    {accentuate(product.nombre)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mt: 0.5 }}>
                    {product.certificateUrl ? (
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3 }}>
                        <ShieldCheck size={11} style={{ color: 'var(--tm-accent)' }} />
                        <Typography sx={{ fontSize: '12px', fontWeight: 600, color: 'var(--tm-accent)' }}>
                          Certified
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3 }}>
                        <Clock size={11} style={{ color: 'var(--tm-muted)' }} />
                        <Typography sx={{ fontSize: '12px', fontWeight: 500, color: 'var(--tm-muted)' }}>
                          Being issued
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
                {onShare && (
                  <IconButton
                    onClick={() => onShare(product)}
                    size="small"
                    sx={{
                      mt: 0.25,
                      color: 'var(--tm-subtle)',
                      '&:hover': { color: 'var(--tm-accent)' },
                    }}
                  >
                    <Share2 size={18} />
                  </IconButton>
                )}
              </Box>

              {/* Specs + Price */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 1.5,
                }}
              >
                {(showUSD && (product.precioInternacional || product.precioCOP)) && (
                  <Box>
                    <Typography sx={{ fontSize: '11px', color: 'text.secondary', fontWeight: 500, mb: 0.25 }}>
                      Price
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: '1.25rem', sm: '1.35rem' },
                        fontWeight: 700,
                        color: 'var(--tm-accent)',
                        fontFamily: qeFont.mono,
                        fontFeatureSettings: '"tnum"',
                        lineHeight: 1.2,
                      }}
                    >
                      {formatUSD(product.precioInternacional || product.precioCOP)}
                    </Typography>
                  </Box>
                )}
                {(showUSD && (product.precioInternacional || product.precioCOP) && typeof product.peso === 'number' && product.peso > 0) && (
                  <Box>
                    <Typography sx={{ fontSize: '11px', color: 'text.secondary', fontWeight: 500, mb: 0.25 }}>
                      Price per Carat
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: '1.25rem', sm: '1.35rem' },
                        fontWeight: 700,
                        fontFamily: qeFont.mono,
                        fontFeatureSettings: '"tnum"',
                        lineHeight: 1.2,
                      }}
                    >
                      {formatUSD(Math.round((product.precioInternacional || product.precioCOP) / product.peso))}
                    </Typography>
                  </Box>
                )}
                {typeof product.peso === 'number' && (
                  <Box>
                    <Typography sx={{ fontSize: '11px', color: 'text.secondary', fontWeight: 500, mb: 0.25 }}>
                      Carats
                    </Typography>
                    <Typography sx={{ fontSize: { xs: '1.25rem', sm: '1.35rem' }, fontWeight: 700, lineHeight: 1.2 }}>
                      {formatCarats(product.peso)} ct
                    </Typography>
                  </Box>
                )}
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
