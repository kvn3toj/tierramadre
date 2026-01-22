/**
 * HeroGallery Component
 *
 * Liquid Glass Design - Hero + Gallery merged
 * Clicking thumbnails navigates to product page
 * Auto-transition carousel with category filtering
 * Inspired by Apple iOS 26 design language
 *
 * Categories: Nuevo, Joyería, Lotes, Gemas
 * With expandable sub-categories for Joyería, Lotes, and Gemas
 *
 * IMAGE SOURCE: Google Drive product folders via useTreasure hook
 * The `imagen` field is already merged from batch thumbnails
 *
 * Designed by: Aria + Eunoia + Moksart
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Typography, useTheme, Button } from '@mui/material';
import { ExpandMore, ArrowForward } from '@mui/icons-material';
import {
  overlays,
  thumbnailStates,
  whiteAlpha,
  blackAlpha,
  opacity,
  lightTokens,
  darkTokens,
} from '../../../design-system';
import { TreasureItem } from '../../../types';

// Auto-transition interval (ms)
const AUTO_TRANSITION_INTERVAL = 6000;

// =============================================================================
// TYPES & CONSTANTS
// =============================================================================

interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  item?: number;
}

type MainCategory = 'nuevo' | 'joyeria' | 'lotes' | 'gemas';

interface Subcategory {
  id: string;
  label: string;
}

interface Category {
  id: MainCategory;
  label: string;
  subcategories?: Subcategory[];
}

// Quality mapping for filtering Lotes and Gemas
// These are exact match patterns (case-insensitive)
const QUALITY_FILTERS: Record<string, string[]> = {
  'comercial': ['Comercial', 'Comercial Estándar', 'Comercial Estandar', 'Estandar', 'Estándar', 'Plata - comercial'],
  'finas': ['Comercial Fina', 'Comercial Superior', 'Fina'],
  'extra-finas': ['Comercial SuperFina', 'SuperFina', 'Extra Fina'],
};

// Helper to check if quality matches filter
const matchesQuality = (itemQuality: string | undefined, filterQualities: string[]): boolean => {
  if (!itemQuality) return false;
  const normalizedQuality = itemQuality.trim().toLowerCase();
  return filterQualities.some((q) => normalizedQuality === q.toLowerCase());
};

// Jewelry type mapping (based on medidas field)
const JEWELRY_TYPES: Record<string, string[]> = {
  'topitos': ['Topito', 'Topitos'],
  'aretes': ['Arete', 'Aretes'],
  'anillos': ['Anillo', 'Anillos'],
  'pulseras': ['Pulsera', 'Pulseras'],
  'dijes': ['Dije', 'Dijes'],
};

const ALL_CATEGORIES: Category[] = [
  { id: 'nuevo', label: 'Estrenos' },
  {
    id: 'gemas',
    label: 'Gemas',
    subcategories: [
      { id: 'comercial', label: 'Comercial' },
      { id: 'finas', label: 'Finas' },
      { id: 'extra-finas', label: 'Extra finas' },
    ],
  },
  {
    id: 'lotes',
    label: 'Lotes',
    subcategories: [
      { id: 'comercial', label: 'Comercial' },
      { id: 'finas', label: 'Finas' },
      { id: 'extra-finas', label: 'Extra finas' },
    ],
  },
  {
    id: 'joyeria',
    label: 'Joyas',
    subcategories: [
      { id: 'topitos', label: 'Topitos' },
      { id: 'aretes', label: 'Aretes' },
      { id: 'anillos', label: 'Anillos' },
      { id: 'pulseras', label: 'Pulseras' },
      { id: 'dijes', label: 'Dijes' },
    ],
  },
];

// Fallback images when no products available
const FALLBACK_IMAGES: GalleryImage[] = [
  { id: 'gem-1', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621976/tierramadre/gallery/gems/koso3gazzgfiakzg867r.jpg', alt: 'Esmeraldas colombianas' },
  { id: 'gem-2', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621979/tierramadre/gallery/gems/nf72nnwamaeaydlvekjn.jpg', alt: 'Esmeralda colombiana natural' },
  { id: 'gem-3', src: 'https://res.cloudinary.com/dyam6g2os/image/upload/v1765621983/tierramadre/gallery/gems/vlcterrk9pswpq7wjvul.jpg', alt: 'Gema esmeralda de Muzo' },
];

// =============================================================================
// PROPS
// =============================================================================

interface HeroGalleryProps {
  treasure?: TreasureItem[];
}

// =============================================================================
// COMPONENT - Hero + Gallery merged
// =============================================================================

export const HeroGallery: React.FC<HeroGalleryProps> = ({ treasure = [] }) => {
  const [activeCategory, setActiveCategory] = useState<MainCategory>('nuevo');
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<MainCategory | null>(null);
  const [heroImage, setHeroImage] = useState<GalleryImage>(FALLBACK_IMAGES[0]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // Filter products that are available and have images from Drive
  // The `imagen` field is populated by useTreasure from Google Drive batch thumbnails
  const availableProducts = useMemo(() => {
    return treasure.filter(
      (item) => item.estado === 'DISPONIBLE' && item.imagen
    );
  }, [treasure]);

  // Convert TreasureItem to GalleryImage
  // Uses high-quality images (size=large) for hero display
  const itemToGalleryImage = useCallback((item: TreasureItem): GalleryImage => {
    let src = item.imagen || '';

    // Add size=large parameter for high-quality display
    if (src && src.includes('serve-drive-image')) {
      src = `${src}${src.includes('?') ? '&' : '?'}size=large`;
    }

    return {
      id: `product-${item.item}`,
      src,
      alt: item.nombre,
      item: item.item,
    };
  }, []);

  // Get filtered products based on category/subcategory
  const getFilteredProducts = useCallback((): TreasureItem[] => {
    if (activeCategory === 'nuevo') {
      // Return newest products sorted by item number (highest = newest)
      // Item numbers are sequential, so higher numbers are more recent additions
      return [...availableProducts].sort((a, b) => b.item - a.item);
    }

    if (activeCategory === 'joyeria') {
      // Filter jewelry items
      let filtered = availableProducts.filter((item) => item.isJewelry);

      if (activeSubcategory) {
        const types = JEWELRY_TYPES[activeSubcategory] || [];
        filtered = filtered.filter((item) =>
          types.some((type) => item.medidas?.toLowerCase().includes(type.toLowerCase()))
        );
      }
      return filtered;
    }

    if (activeCategory === 'lotes') {
      // Filter lotes (multiple stones)
      let filtered = availableProducts.filter((item) => !item.isJewelry && item.cantidad > 1);

      if (activeSubcategory) {
        const qualities = QUALITY_FILTERS[activeSubcategory] || [];
        filtered = filtered.filter((item) => matchesQuality(item.calidad, qualities));
      }
      return filtered;
    }

    if (activeCategory === 'gemas') {
      // Filter single gems
      let filtered = availableProducts.filter((item) => !item.isJewelry && item.cantidad === 1);

      if (activeSubcategory) {
        const qualities = QUALITY_FILTERS[activeSubcategory] || [];
        filtered = filtered.filter((item) => matchesQuality(item.calidad, qualities));
      }
      return filtered;
    }

    return availableProducts;
  }, [activeCategory, activeSubcategory, availableProducts]);

  // Get images for current selection
  const images = useMemo((): GalleryImage[] => {
    const filtered = getFilteredProducts();
    if (filtered.length === 0) {
      return FALLBACK_IMAGES;
    }
    return filtered.slice(0, 12).map(itemToGalleryImage);
  }, [getFilteredProducts, itemToGalleryImage]);

  // Get available subcategories (only those with products)
  const getAvailableSubcategories = useCallback((categoryId: MainCategory): Subcategory[] => {
    const category = ALL_CATEGORIES.find((c) => c.id === categoryId);
    if (!category?.subcategories) return [];

    return category.subcategories.filter((sub) => {
      if (categoryId === 'joyeria') {
        const types = JEWELRY_TYPES[sub.id] || [];
        return availableProducts.some((item) =>
          item.isJewelry && types.some((type) => item.medidas?.toLowerCase().includes(type.toLowerCase()))
        );
      }

      if (categoryId === 'lotes') {
        const qualities = QUALITY_FILTERS[sub.id] || [];
        return availableProducts.some((item) =>
          !item.isJewelry && item.cantidad > 1 && matchesQuality(item.calidad, qualities)
        );
      }

      if (categoryId === 'gemas') {
        const qualities = QUALITY_FILTERS[sub.id] || [];
        return availableProducts.some((item) =>
          !item.isJewelry && item.cantidad === 1 && matchesQuality(item.calidad, qualities)
        );
      }

      return false;
    });
  }, [availableProducts]);

  // Auto-transition effect for hero image carousel
  useEffect(() => {
    if (images.length === 0) return;

    const interval = setInterval(() => {
      const currentIndex = images.findIndex((img) => img.id === heroImage.id);
      const nextIndex = (currentIndex + 1) % images.length;
      setHeroImage(images[nextIndex]);
    }, AUTO_TRANSITION_INTERVAL);

    return () => clearInterval(interval);
  }, [heroImage.id, images]);

  // Show clicked thumbnail in hero image (instead of navigating)
  const handleThumbnailClick = (image: GalleryImage) => {
    setHeroImage(image);
  };

  // Handle hero image click - also navigate to product
  const handleHeroClick = () => {
    if (heroImage.item) {
      navigate(`/product/${heroImage.item}`);
    }
  };

  // Handle category click
  const handleCategoryClick = (categoryId: MainCategory) => {
    const category = ALL_CATEGORIES.find((c) => c.id === categoryId);
    const hasSubcategories = category?.subcategories && getAvailableSubcategories(categoryId).length > 0;

    if (hasSubcategories) {
      // Toggle expansion
      if (expandedCategory === categoryId) {
        setExpandedCategory(null);
        setActiveSubcategory(null);
      } else {
        setExpandedCategory(categoryId);
        setActiveSubcategory(null);
      }
    } else {
      setExpandedCategory(null);
      setActiveSubcategory(null);
    }
    setActiveCategory(categoryId);
  };

  // Handle subcategory click
  const handleSubcategoryClick = (subcategoryId: string) => {
    setActiveSubcategory(activeSubcategory === subcategoryId ? null : subcategoryId);
  };

  // Reset hero image when images change
  useEffect(() => {
    if (images.length > 0 && !images.find((img) => img.id === heroImage.id)) {
      setHeroImage(images[0]);
    }
  }, [images, heroImage.id]);

  // Preload first 3 hero images for instant display (uses extended splash screen time)
  useEffect(() => {
    if (images.length === 0) return;

    const imagesToPreload = images.slice(0, 3);
    imagesToPreload.forEach((image) => {
      if (image.src) {
        const img = new Image();
        img.src = image.src;
        // Silently handle preload errors
        img.onerror = () => console.warn('Hero preload failed:', image.src);
      }
    });
  }, [images]);

  // Get available subcategories for the expanded category
  const currentSubcategories = expandedCategory ? getAvailableSubcategories(expandedCategory) : [];

  return (
    <Box component="section" aria-label="Galeria">
      {/* Hero Image - Compact */}
      <Box
        sx={{
          position: 'relative',
          height: { xs: '38vh', sm: '42vh' },
          minHeight: 280,
          maxHeight: 380,
          overflow: 'hidden',
        }}
      >
        {/* Background image with smooth crossfade */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={heroImage.id}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: 0,
            }}
          >
            <Box
              component="img"
              src={heroImage.src}
              alt={heroImage.alt}
              onClick={handleHeroClick}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
                cursor: heroImage.item ? 'pointer' : 'default',
              }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Gradient overlay - using design system tokens */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: overlays.hero.gradient,
            pointerEvents: 'none',
          }}
        />

        {/* Action Button - Show when a product is selected */}
        <AnimatePresence>
          {heroImage.item && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                zIndex: 10,
              }}
            >
              <Button
                variant="contained"
                size="small"
                endIcon={<ArrowForward sx={{ fontSize: 14 }} />}
                onClick={handleHeroClick}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.75)',
                  color: '#1a1a1a',
                  fontWeight: 500,
                  fontSize: '0.7rem',
                  px: 1.5,
                  py: 0.5,
                  minHeight: 'auto',
                  borderRadius: 1.5,
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  textTransform: 'none',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.85)',
                    boxShadow: '0 3px 12px rgba(0,0,0,0.2)',
                  },
                }}
              >
                Ver producto
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom section: Tabs + Subcategories + Thumbnails */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            pb: 2,
          }}
        >
          {/* Main Category Pill Tabs */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mb: 1.5,
              px: 2,
            }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                gap: 0.5,
                p: 0.5,
                bgcolor: blackAlpha(opacity.overlay),
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRadius: 3,
                border: `1px solid ${whiteAlpha(opacity.soft)}`,
              }}
            >
              {ALL_CATEGORIES.map((cat) => {
                const hasAvailableSubcategories = getAvailableSubcategories(cat.id).length > 0;
                const isExpanded = expandedCategory === cat.id;
                const isActive = activeCategory === cat.id;

                return (
                  <Box
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleCategoryClick(cat.id)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 2,
                      py: 0.75,
                      borderRadius: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      ...(isActive && {
                        bgcolor: overlays.pill.active.bg,
                      }),
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: isActive ? 'white' : whiteAlpha(opacity.muted),
                        fontWeight: isActive ? 600 : 400,
                        fontSize: '0.8rem',
                      }}
                    >
                      {cat.label}
                    </Typography>
                    {hasAvailableSubcategories && (
                      <ExpandMore
                        sx={{
                          fontSize: '1rem',
                          color: isActive ? 'white' : whiteAlpha(opacity.muted),
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                        }}
                      />
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Thumbnail Carousel - Centered */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeCategory}-${activeSubcategory || 'all'}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Box
                ref={scrollRef}
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 1,
                  overflowX: 'auto',
                  px: 2,
                  scrollSnapType: 'x mandatory',
                  '&::-webkit-scrollbar': { display: 'none' },
                  scrollbarWidth: 'none',
                }}
              >
                {images.map((image, index) => {
                  const isActive = heroImage.id === image.id;
                  return (
                    <motion.div
                      key={image.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.03 }}
                      style={{ scrollSnapAlign: 'start', flexShrink: 0 }}
                    >
                      <Box
                        onClick={() => handleThumbnailClick(image)}
                        sx={{
                          width: 72,
                          height: 72,
                          borderRadius: 2.5,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          position: 'relative',
                          border: isActive
                            ? thumbnailStates.active.border
                            : '2px solid transparent',
                          opacity: isActive ? 1 : 0.7,
                          transition: 'all 0.2s ease',
                          boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
                          '&:hover': {
                            opacity: 1,
                            border: thumbnailStates.hover.border,
                            transform: 'scale(1.05)',
                          },
                        }}
                      >
                        <Box
                          component="img"
                          src={
                            // Use small size for thumbnails (optimized for 72x72 display)
                            image.src.includes('serve-drive-image')
                              ? image.src.replace('size=large', 'size=small')
                              : image.src
                          }
                          alt={image.alt}
                          loading="lazy"
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      </Box>
                    </motion.div>
                  );
                })}
              </Box>
            </motion.div>
          </AnimatePresence>
        </Box>
      </Box>

      {/* Subcategory Pills - Below Hero for cleaner visual */}
      <AnimatePresence>
        {expandedCategory && currentSubcategories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                gap: 1,
                flexWrap: 'wrap',
                px: 2,
                py: 1.5,
                // iOS HIG: Theme-aware background
                bgcolor: isDarkMode
                  ? darkTokens.background.surface
                  : lightTokens.background.muted,
                // iOS HIG: Subtle border for elevation hint
                borderBottom: `1px solid ${isDarkMode
                  ? darkTokens.border.light
                  : lightTokens.border.light}`,
              }}
            >
              {currentSubcategories.map((sub, index) => {
                const isSelected = activeSubcategory === sub.id;
                return (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    <Box
                      onClick={() => handleSubcategoryClick(sub.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubcategoryClick(sub.id)}
                      sx={{
                        px: 2,
                        py: 0.75,
                        borderRadius: 2,
                        cursor: 'pointer',
                        // iOS HIG: Theme-aware pill backgrounds
                        bgcolor: isSelected
                          ? isDarkMode
                            ? 'rgba(255,255,255,0.15)'
                            : 'rgba(0,0,0,0.08)'
                          : isDarkMode
                            ? 'rgba(255,255,255,0.06)'
                            : 'rgba(0,0,0,0.04)',
                        border: `1px solid ${isSelected
                          ? isDarkMode
                            ? 'rgba(255,255,255,0.2)'
                            : 'rgba(0,0,0,0.12)'
                          : isDarkMode
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(0,0,0,0.06)'}`,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: isDarkMode
                            ? 'rgba(255,255,255,0.12)'
                            : 'rgba(0,0,0,0.06)',
                          borderColor: isDarkMode
                            ? 'rgba(255,255,255,0.15)'
                            : 'rgba(0,0,0,0.1)',
                        },
                        '&:active': {
                          transform: 'scale(0.97)',
                        },
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          // iOS HIG: Theme-aware text colors
                          color: isSelected
                            ? isDarkMode
                              ? 'rgba(255,255,255,0.95)'
                              : lightTokens.text.primary
                            : isDarkMode
                              ? 'rgba(255,255,255,0.7)'
                              : lightTokens.text.secondary,
                          fontWeight: isSelected ? 600 : 400,
                          fontSize: '0.8rem',
                        }}
                      >
                        {sub.label}
                      </Typography>
                    </Box>
                  </motion.div>
                );
              })}
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default HeroGallery;
