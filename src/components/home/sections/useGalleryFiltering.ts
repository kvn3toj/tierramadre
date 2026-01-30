/**
 * useGalleryFiltering Hook
 *
 * Manages category/subcategory filtering logic for the HeroGallery.
 * Extracted from HeroGallery.tsx for modularity.
 */

import { useState, useCallback, useMemo } from 'react';
import { TreasureItem } from '../../../types';
import {
  MainCategory,
  Subcategory,
  GalleryImage,
  ALL_CATEGORIES,
  QUALITY_FILTERS,
  JEWELRY_TYPES,
  matchesQuality,
} from './gallery-constants';

interface UseGalleryFilteringOptions {
  treasure: TreasureItem[];
  setImageSize: (url: string, size: string) => string;
}

interface UseGalleryFilteringReturn {
  activeCategory: MainCategory;
  activeSubcategory: string | null;
  expandedCategory: MainCategory | null;
  images: GalleryImage[];
  currentSubcategories: Subcategory[];
  getAvailableSubcategories: (categoryId: MainCategory) => Subcategory[];
  handleCategoryClick: (categoryId: MainCategory) => void;
  handleSubcategoryClick: (subcategoryId: string) => void;
}

export const useGalleryFiltering = ({
  treasure,
  setImageSize,
}: UseGalleryFilteringOptions): UseGalleryFilteringReturn => {
  const [activeCategory, setActiveCategory] = useState<MainCategory>('estrenos');
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<MainCategory | null>(null);

  // Filter products that are available and have images from Drive
  const availableProducts = useMemo(() => {
    return treasure.filter(
      (item) => item.estado === 'DISPONIBLE' && item.imagen
    );
  }, [treasure]);

  // Convert TreasureItem to GalleryImage
  const itemToGalleryImage = useCallback((item: TreasureItem): GalleryImage => {
    let src = item.imagen || '';
    src = setImageSize(src, 'large');

    return {
      id: `product-${item.item}`,
      src,
      alt: item.nombre,
      item: item.item,
    };
  }, [setImageSize]);

  // Get filtered products based on category/subcategory
  const getFilteredProducts = useCallback((): TreasureItem[] => {
    if (activeCategory === 'estrenos') {
      return [...availableProducts].sort((a, b) => b.item - a.item);
    }

    if (activeCategory === 'joyas') {
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
      let filtered = availableProducts.filter((item) => !item.isJewelry && item.cantidad > 1);

      if (activeSubcategory) {
        const qualities = QUALITY_FILTERS[activeSubcategory] || [];
        filtered = filtered.filter((item) => matchesQuality(item.calidad, qualities));
      }
      return filtered;
    }

    if (activeCategory === 'gemas') {
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
      return [];
    }
    return filtered.slice(0, 12).map(itemToGalleryImage);
  }, [getFilteredProducts, itemToGalleryImage]);

  // Get available subcategories (only those with products)
  const getAvailableSubcategories = useCallback((categoryId: MainCategory): Subcategory[] => {
    const category = ALL_CATEGORIES.find((c) => c.id === categoryId);
    if (!category?.subcategories) return [];

    return category.subcategories.filter((sub) => {
      if (categoryId === 'joyas') {
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

  // Handle category click
  const handleCategoryClick = useCallback((categoryId: MainCategory) => {
    const category = ALL_CATEGORIES.find((c) => c.id === categoryId);
    const hasSubcategories = category?.subcategories && getAvailableSubcategories(categoryId).length > 0;

    if (hasSubcategories) {
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
  }, [expandedCategory, getAvailableSubcategories]);

  // Handle subcategory click
  const handleSubcategoryClick = useCallback((subcategoryId: string) => {
    setActiveSubcategory((prev) => (prev === subcategoryId ? null : subcategoryId));
  }, []);

  // Get available subcategories for the expanded category
  const currentSubcategories = expandedCategory ? getAvailableSubcategories(expandedCategory) : [];

  return {
    activeCategory,
    activeSubcategory,
    expandedCategory,
    images,
    currentSubcategories,
    getAvailableSubcategories,
    handleCategoryClick,
    handleSubcategoryClick,
  };
};

export default useGalleryFiltering;
