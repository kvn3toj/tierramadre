/**
 * AmbassadorProductDetail Component
 * Full product detail view within the ambassador profile context.
 * Fetches full image gallery from Drive API for carousel display.
 * Hero carousel, name + price, specs grid, description.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  Chip,
  IconButton,
  alpha,
  useTheme,
  CircularProgress,
  Button,
} from "@mui/material";
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
} from "lucide-react";
import { motion } from "framer-motion";
import {
  emeraldCore,
  goldAccent,
  semanticColors,
  blurValues,
  surfacesLight,
  surfacesDark,
  fontFamilies,
  brand,
  cssTransition,
  zIndex,
} from "../../../../design-system";
import { formatFullCurrency, formatCarats } from "../../../../utils/formatting";
import { useLanguage } from "../../../../contexts/LanguageContext";
import { useReducedMotion } from "../../../../hooks/useReducedMotion";
import type { TreasureItem } from "../../../../types";

interface MediaSlide {
  id: string;
  url: string;
  type: "image" | "video";
  alt: string;
}

interface AmbassadorProductDetailProps {
  item: TreasureItem;
  onBack: () => void;
}

export function AmbassadorProductDetail({
  item,
  onBack,
}: AmbassadorProductDetailProps) {
  const theme = useTheme();
  const { t } = useLanguage();
  const isLight = theme.palette.mode === "light";
  const prefersReducedMotion = useReducedMotion();

  const [gallerySlides, setGallerySlides] = useState<MediaSlide[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [galleryLoading, setGalleryLoading] = useState(false);

  const weightDisplay =
    typeof item.peso === "number"
      ? `${formatCarats(item.peso)} ct`
      : item.peso || "-";

  // Fetch gallery from Drive API
  useEffect(() => {
    const controller = new AbortController();
    setActiveSlide(0);

    // Fallback: use existing thumbnail/image
    const fallback: MediaSlide = {
      id: `fallback-${item.item}`,
      url: item.thumbnailUrl || item.imagen || "",
      type: item.mediaType === "video" ? "video" : "image",
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
                if (a.type === "image" && b.type === "video") return -1;
                if (a.type === "video" && b.type === "image") return 1;
                return (a.order ?? 0) - (b.order ?? 0);
              })
              .map((img: any) => ({
                id: img.id,
                url:
                  img.type === "video"
                    ? `/api/serve-drive-image?fileId=${img.id}`
                    : img.proxyUrl ||
                      img.fullUrl ||
                      img.previewUrl ||
                      img.thumbnailUrl,
                type: img.type as "image" | "video",
                alt: img.name || `${item.nombre} - ${(img.order ?? 0) + 1}`,
              }));
            setGallerySlides(driveSlides);
          }
        })
        .catch((err) => {
          if (err.name !== "AbortError")
            console.warn("Failed to fetch gallery:", err);
        })
        .finally(() => setGalleryLoading(false));
    }

    return () => controller.abort();
  }, [item.item]);

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
      if (e.key === "ArrowLeft" && activeSlide > 0)
        setActiveSlide((s) => s - 1);
      if (e.key === "ArrowRight" && activeSlide < gallerySlides.length - 1)
        setActiveSlide((s) => s + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
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
            bgcolor: isLight ? alpha("#000", 0.04) : alpha("#fff", 0.06),
            backdropFilter: `blur(${blurValues.md})`,
            width: 38,
            height: 38,
            "&:hover": {
              bgcolor: isLight ? alpha("#000", 0.08) : alpha("#fff", 0.1),
            },
          }}
        >
          <ArrowLeft size={18} />
        </IconButton>
      </Box>

      {/* Hero Gallery Carousel */}
      <Box
        sx={{
          borderRadius: "18px",
          overflow: "hidden",
          mb: 2.5,
          position: "relative",
          boxShadow: isLight
            ? "0 4px 20px rgba(0,0,0,0.1)"
            : "0 4px 20px rgba(0,0,0,0.3)",
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {slideCount > 0 ? (
          <>
            <Box
              sx={{
                display: "flex",
                transition: "transform 0.3s ease",
                transform: `translateX(-${activeSlide * 100}%)`,
              }}
            >
              {gallerySlides.map((slide, idx) => (
                <Box
                  key={slide.id}
                  sx={{
                    minWidth: "100%",
                    aspectRatio: "4/3",
                    position: "relative",
                    bgcolor: isLight ? "#f5f5f5" : "#1a1a1a",
                  }}
                >
                  {slide.type === "video" ? (
                    <video
                      key={slide.id}
                      src={`${slide.url}#t=0.001`}
                      autoPlay={idx === activeSlide}
                      muted
                      loop
                      playsInline
                      preload={idx === activeSlide ? "auto" : "none"}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <Box
                      component="img"
                      src={slide.url}
                      alt={slide.alt}
                      loading={idx <= 1 ? "eager" : "lazy"}
                      sx={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
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
                  position: "absolute",
                  top: 12,
                  right: 12,
                  bgcolor: "rgba(0,0,0,0.5)",
                  backdropFilter: "blur(4px)",
                  borderRadius: 1.5,
                  px: 1,
                  py: 0.3,
                  zIndex: zIndex.base,
                }}
              >
                <Typography
                  sx={{ color: "#fff", fontSize: "0.7rem", fontWeight: 600 }}
                >
                  {activeSlide + 1} / {slideCount}
                </Typography>
              </Box>
            )}

            {/* Gallery loading indicator */}
            {galleryLoading && slideCount <= 1 && (
              <Box
                sx={{
                  position: "absolute",
                  bottom: 12,
                  left: "50%",
                  transform: "translateX(-50%)",
                  bgcolor: "rgba(0,0,0,0.5)",
                  backdropFilter: "blur(4px)",
                  borderRadius: 2,
                  px: 1.5,
                  py: 0.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  zIndex: zIndex.base,
                }}
              >
                <CircularProgress size={14} sx={{ color: "#fff" }} />
                <Typography sx={{ color: "#fff", fontSize: "0.7rem" }}>
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
                      position: "absolute",
                      left: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      bgcolor: "rgba(0,0,0,0.5)",
                      color: "#fff",
                      "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
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
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      bgcolor: "rgba(0,0,0,0.5)",
                      color: "#fff",
                      "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
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
                  position: "absolute",
                  bottom: 12,
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
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
                      bgcolor:
                        activeSlide === i
                          ? brand.emerald[400]
                          : "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      transition: cssTransition.fast,
                    }}
                  />
                ))}
              </Box>
            )}
          </>
        ) : (
          <Box
            sx={{
              aspectRatio: "4/3",
              bgcolor: isLight ? "#f5f5f5" : "#1a1a1a",
            }}
          />
        )}
      </Box>

      {/* Name & Price */}
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          mb: 0.5,
          letterSpacing: "-0.02em",
          fontSize: "1.3rem",
        }}
      >
        {item.nombre}
      </Typography>
      <Typography
        sx={{
          fontFamily: fontFamilies.display,
          fontWeight: 600,
          fontSize: "1.5rem",
          letterSpacing: "0.01em",
          color: emeraldCore.primary,
          fontVariantNumeric: "lining-nums tabular-nums",
          mb: 2,
        }}
      >
        {formatFullCurrency(item.precioCOP)}
      </Typography>

      {/* Tags */}
      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mb: 2 }}>
        {item.isJewelry && (
          <Chip
            label="JOYA"
            size="small"
            sx={{
              bgcolor: alpha(goldAccent.primary, 0.1),
              color: isLight ? goldAccent.dark : goldAccent.light,
              fontWeight: 700,
              fontSize: "0.58rem",
              letterSpacing: "0.04em",
              borderRadius: "6px",
            }}
          />
        )}
        {item.categoria && (
          <Chip
            label={item.categoria}
            size="small"
            sx={{
              bgcolor: alpha(emeraldCore.primary, 0.08),
              color: emeraldCore.primary,
              fontWeight: 700,
              fontSize: "0.58rem",
              letterSpacing: "0.04em",
              borderRadius: "6px",
            }}
          />
        )}
        {item.estado === "VENDIDA" && (
          <Chip
            label="VENDIDA"
            size="small"
            sx={{
              bgcolor: alpha(semanticColors.error.main, 0.1),
              color: semanticColors.error.main,
              fontWeight: 700,
              fontSize: "0.58rem",
              letterSpacing: "0.04em",
              borderRadius: "6px",
            }}
          />
        )}
      </Box>

      {/* Specs Grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 1.5,
          mb: 2.5,
          p: 2,
          borderRadius: "14px",
          bgcolor: isLight
            ? surfacesLight.surface.default
            : surfacesDark.background.secondary,
          border: "1px solid",
          borderColor: isLight
            ? surfacesLight.border.light
            : surfacesDark.border.light,
        }}
      >
        <SpecCell
          icon={<Scale size={16} />}
          label="Peso"
          value={weightDisplay}
        />
        <SpecCell
          icon={<MapPin size={16} />}
          label="Origen"
          value={item.ubicacion || "-"}
        />
        <SpecCell
          icon={<Award size={16} />}
          label="Calidad"
          value={item.calidad || "-"}
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
        sx={{
          bgcolor: emeraldCore.primary,
          color: "#fff",
          borderRadius: "14px",
          py: 1.5,
          fontWeight: 600,
          textTransform: "none",
          fontSize: "0.95rem",
          "&:hover": { bgcolor: emeraldCore.dark },
        }}
      >
        Contactar Embajador
      </Button>

      {/* Description */}
      {item.description && (
        <Typography
          sx={{
            color: "text.secondary",
            fontSize: "0.85rem",
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
    <Box sx={{ textAlign: "center" }}>
      <Box
        sx={{
          color: "text.secondary",
          mb: 0.5,
          display: "flex",
          justifyContent: "center",
        }}
      >
        {icon}
      </Box>
      <Typography
        sx={{
          fontSize: "0.58rem",
          color: "text.secondary",
          mb: 0.25,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 650, fontSize: "0.75rem" }}>
        {value}
      </Typography>
    </Box>
  );
}

export default AmbassadorProductDetail;
