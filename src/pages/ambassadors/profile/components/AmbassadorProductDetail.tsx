/**
 * AmbassadorProductDetail Component
 * Full product detail view within the ambassador profile context.
 * Fetches full image gallery from Drive API for carousel display.
 * Hero carousel, name + price, specs grid, description.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Button,
} from '@mui/material';
import {
  ArrowLeft,
  Scale,
  MapPin,
  Award,
  Ruler,
  Palette,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Badge,
  ErrorState,
  qeGray,
  qeType,
  zIndex,
} from '../../../../design-system';
import {
  formatFullCurrency,
  formatWeightLabel,
} from '../../../../utils/formatting';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { useReducedMotion } from '../../../../hooks/useReducedMotion';
import type { Asesor } from '../../../../hooks/useAsesores';
import type { TreasureItem } from '../../../../types';

interface MediaSlide {
  id: string;
  url: string;
  type: 'image' | 'video';
  alt: string;
}

interface AmbassadorProductDetailProps {
  item: TreasureItem;
  onBack: () => void;
  /**
   * Ambassador whose profile we are inside. Optional so the component still
   * renders standalone — the contact CTA is disabled when it (or the
   * WhatsApp number) is missing, rather than rendering an inert button.
   */
  asesor?: Pick<Asesor, 'name' | 'whatsapp'>;
}

export function AmbassadorProductDetail({
  item,
  onBack,
  asesor,
}: AmbassadorProductDetailProps) {
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();

  // Same WhatsApp deep link the (removed) FavoriteDetailView used.
  const whatsapp = asesor?.whatsapp?.trim() || '';
  const canContact = whatsapp.length > 0;

  const handleContact = useCallback(() => {
    if (!canContact) return;
    const digits = whatsapp.replace(/\D/g, '');
    const fullNumber = digits.startsWith('57') ? digits : `57${digits}`;
    const text = `Hola ${asesor?.name ?? ''}, me interesa la esmeralda "${item.nombre}" (Item #${item.item})`;
    window.open(
      `https://wa.me/${fullNumber}?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer',
    );
  }, [canContact, whatsapp, asesor?.name, item.nombre, item.item]);

  const [gallerySlides, setGallerySlides] = useState<MediaSlide[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState(false);
  // Bumped by the retry button to re-run the gallery fetch.
  const [galleryReloadKey, setGalleryReloadKey] = useState(0);

  const weightDisplay = formatWeightLabel(item, { fallback: '-' });

  // Fetch gallery from Drive API
  useEffect(() => {
    const controller = new AbortController();
    setActiveSlide(0);
    setGalleryError(false);

    // Fallback: use existing thumbnail/image
    const fallback: MediaSlide = {
      id: `fallback-${item.item}`,
      url: item.thumbnailUrl || item.imagen || '',
      type: item.mediaType === 'video' ? 'video' : 'image',
      alt: item.nombre,
    };
    if (fallback.url) {
      setGallerySlides([fallback]);
    }

    if (item.item) {
      setGalleryLoading(true);
      fetch(`/api/get-drive-images?itemNumber=${item.item}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.images?.length > 0) {
            const driveSlides: MediaSlide[] = data.images
              .sort((a: any, b: any) => {
                if (a.type === 'image' && b.type === 'video') return -1;
                if (a.type === 'video' && b.type === 'image') return 1;
                return (a.order ?? 0) - (b.order ?? 0);
              })
              .map((img: any) => ({
                id: img.id,
                url:
                  img.type === 'video'
                    ? `/api/serve-drive-image?fileId=${img.id}`
                    : img.proxyUrl ||
                      img.fullUrl ||
                      img.previewUrl ||
                      img.thumbnailUrl,
                type: img.type as 'image' | 'video',
                alt: img.name || `${item.nombre} - ${(img.order ?? 0) + 1}`,
              }));
            setGallerySlides(driveSlides);
          }
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            console.warn('Failed to fetch gallery:', err);
            setGalleryError(true);
          }
        })
        .finally(() => setGalleryLoading(false));
    }

    return () => controller.abort();
  }, [item.item, galleryReloadKey]);

  // Swipe handling
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX < 0 && activeSlide < gallerySlides.length - 1) {
          setActiveSlide((s) => s + 1);
        } else if (deltaX > 0 && activeSlide > 0) {
          setActiveSlide((s) => s - 1);
        }
      }
    },
    [activeSlide, gallerySlides.length],
  );

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && activeSlide > 0)
        setActiveSlide((s) => s - 1);
      if (e.key === 'ArrowRight' && activeSlide < gallerySlides.length - 1)
        setActiveSlide((s) => s + 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeSlide, gallerySlides.length]);

  const slideCount = gallerySlides.length;

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={prefersReducedMotion ? undefined : { opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      {/* Back */}
      <Box sx={{ mb: 2 }}>
        <IconButton
          onClick={onBack}
          aria-label={t.actions.back}
          sx={{
            bgcolor: 'var(--tm-well)',
            border: '1px solid var(--tm-border)',
            color: 'var(--tm-text)',
            width: 44,
            height: 44,
            '&:hover': {
              bgcolor: 'var(--tm-well)',
              borderColor: 'var(--tm-accent)',
            },
          }}
        >
          <ArrowLeft size={18} />
        </IconButton>
      </Box>

      {/* Hero Gallery Carousel */}
      <Box
        sx={{
          borderRadius: 'var(--tm-radius-card)',
          overflow: 'hidden',
          mb: 2.5,
          position: 'relative',
          border: '1px solid var(--tm-border)',
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {slideCount > 0 ? (
          <>
            <Box
              sx={{
                display: 'flex',
                transition: 'transform var(--tm-base) var(--tm-ease)',
                transform: `translateX(-${activeSlide * 100}%)`,
              }}
            >
              {gallerySlides.map((slide, idx) => (
                <Box
                  key={slide.id}
                  sx={{
                    minWidth: '100%',
                    aspectRatio: '4/3',
                    position: 'relative',
                    bgcolor: 'var(--tm-well)',
                  }}
                >
                  {slide.type === 'video' ? (
                    <video
                      key={slide.id}
                      src={`${slide.url}#t=0.001`}
                      autoPlay={idx === activeSlide}
                      muted
                      loop
                      playsInline
                      preload={idx === activeSlide ? 'auto' : 'none'}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <Box
                      component="img"
                      src={slide.url}
                      alt={slide.alt}
                      loading={idx <= 1 ? 'eager' : 'lazy'}
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
            </Box>

            {/* Slide counter */}
            {slideCount > 1 && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  // On-photo chrome: rides over the gallery image.
                  bgcolor: 'var(--tm-scrim)',
                  borderRadius: 'var(--tm-radius-well)',
                  px: 1,
                  py: 0.3,
                  zIndex: zIndex.base,
                }}
              >
                <Typography
                  sx={{ color: qeGray[0], fontSize: '0.7rem', fontWeight: 600 }}
                >
                  {activeSlide + 1} / {slideCount}
                </Typography>
              </Box>
            )}

            {/* Gallery loading indicator */}
            {galleryLoading && slideCount <= 1 && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 12,
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

            {/* Navigation arrows (desktop) */}
            {slideCount > 1 && (
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
                {gallerySlides.map((_, i) => (
                  <Box
                    key={i}
                    onClick={() => setActiveSlide(i)}
                    sx={{
                      width: activeSlide === i ? 18 : 8,
                      height: 8,
                      borderRadius: 4,
                      // On-photo chrome: the dots sit over the gallery image.
                      bgcolor:
                        activeSlide === i
                          ? 'var(--tm-accent-pure)'
                          : qeGray[300],
                      cursor: 'pointer',
                      transition: 'width var(--tm-fast) var(--tm-ease)',
                    }}
                  />
                ))}
              </Box>
            )}
          </>
        ) : galleryError ? (
          <Box
            sx={{
              aspectRatio: '4/3',
              bgcolor: 'var(--tm-well)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ErrorState
              compact
              message="No pudimos cargar las imágenes de esta pieza."
              onRetry={() => setGalleryReloadKey((k) => k + 1)}
              retrying={galleryLoading}
            />
          </Box>
        ) : (
          <Box
            sx={{
              aspectRatio: '4/3',
              bgcolor: 'var(--tm-well)',
            }}
          />
        )}
      </Box>

      {/* Name & Price */}
      <Typography
        variant="h5"
        sx={{
          ...qeType.title,
          mb: 0.5,
          fontSize: '1.75rem',
        }}
      >
        {item.nombre}
      </Typography>
      <Typography
        sx={{
          ...qeType.data,
          fontSize: '1.35rem',
          color: 'var(--tm-accent)',
          mb: 2,
        }}
      >
        {formatFullCurrency(item.precioCOP)}
      </Typography>

      {/* Tags */}
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>
        {item.isJewelry && <Badge tone="neutral" label="Joya" />}
        {item.categoria && <Badge tone="accent" label={item.categoria} />}
        {item.estado === 'VENDIDA' && <Badge tone="danger" label="Vendida" />}
      </Box>

      {/* Specs Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1.5,
          mb: 2.5,
          p: 2,
          borderRadius: 'var(--tm-radius-card)',
          bgcolor: 'var(--tm-surface)',
          border: '1px solid',
          borderColor: 'var(--tm-border)',
        }}
      >
        <SpecCell
          icon={<Scale size={16} />}
          label="Peso"
          value={weightDisplay}
        />
        {/* Origen is the MINE (`procedencia`: Muzo, Chivor, Coscuez, Boyacá…),
            never `ubicacion`. `ubicacion` is internal custody — Anima's
            2026-05-22 decision records it as "operational, derived, view-only
            in ADMIN tables", with a 9-value domain (BOVEDA, OFI.BOGOTA,
            OFI.CALI, ASESOR, EMBAJADOR, CLIENTE, EN PRODUCCION,
            EN CERTIFICACION, RETORNADO). This cell was telling clients
            "Origen: OFI.CALI".

            Hidden rather than rendered as "-" when absent, and absent is the
            common case today: the legacy book production reads has no
            `procedencia` column at all, and even in SOT v3 only 89 of 513 rows
            carry one. Same rule as P0.3's SpecRow guard — an omitted row reads
            better than an empty one. */}
        {item.procedencia && (
          <SpecCell
            icon={<MapPin size={16} />}
            label="Origen"
            value={item.procedencia}
          />
        )}
        <SpecCell
          icon={<Award size={16} />}
          label="Calidad"
          value={item.calidad || '-'}
        />
        {item.talla && (
          <SpecCell
            icon={<Ruler size={16} />}
            label="Talla"
            value={item.talla}
          />
        )}
        {item.color && (
          <SpecCell
            icon={<Palette size={16} />}
            label="Color"
            value={item.color}
          />
        )}
        {item.cantidad > 1 && (
          <SpecCell
            icon={<Scale size={16} />}
            label="Cantidad"
            value={`${item.cantidad} uds`}
          />
        )}
      </Box>

      {/* Contact CTA */}
      <Button
        fullWidth
        variant="contained"
        startIcon={<MessageCircle size={18} />}
        onClick={handleContact}
        disabled={!canContact}
        aria-label={
          canContact
            ? `${t.ambassador.museum?.contactAmbassador ?? 'Contactar Embajador'} por WhatsApp sobre ${item.nombre}`
            : undefined
        }
        title={
          canContact
            ? undefined
            : 'Este embajador aún no tiene un WhatsApp registrado'
        }
        sx={{
          bgcolor: 'var(--tm-accent-strong)',
          color: 'var(--tm-on-accent)',
          borderRadius: 'var(--tm-radius-control)',
          py: 1.5,
          minHeight: 44,
          fontWeight: 600,
          textTransform: 'none',
          fontSize: '0.95rem',
          '&:hover': { bgcolor: 'var(--tm-accent)' },
          '&.Mui-disabled': {
            bgcolor: 'var(--tm-well)',
            color: 'var(--tm-subtle)',
            border: '1px solid var(--tm-border)',
          },
        }}
      >
        {t.ambassador.museum?.contactAmbassador ?? 'Contactar Embajador'}
      </Button>

      {/* Description */}
      {item.description && (
        <Typography
          sx={{
            color: 'text.secondary',
            fontSize: '0.85rem',
            lineHeight: 1.6,
            mt: 2,
          }}
        >
          {item.description}
        </Typography>
      )}
    </motion.div>
  );
}

function SpecCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box
        sx={{
          color: 'var(--tm-subtle)',
          mb: 0.5,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        {icon}
      </Box>
      <Typography
        sx={{
          ...qeType.overline,
          color: 'var(--tm-muted)',
          mb: 0.25,
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ ...qeType.data, fontSize: '0.9375rem' }}>
        {value}
      </Typography>
    </Box>
  );
}

export default AmbassadorProductDetail;
