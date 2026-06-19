/**
 * CategoryGrid Component
 * 2x2 grid with product image backgrounds, cinematic gradient overlay,
 * category name + count. Museum-style navigation for ambassador profile.
 */

import React, { useMemo } from "react";
import { Box, Typography, alpha, useTheme } from "@mui/material";
import { Gem } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "../../../../contexts/LanguageContext";
import {
  emeraldCore,
  cssTransition,
  fontFamilies,
} from "../../../../design-system";
import { useReducedMotion } from "../../../../hooks/useReducedMotion";
import type { ProductCategory } from "../../../../utils/productCategories";

interface CategoryGridProps {
  categories: ProductCategory[];
  onCategorySelect: (category: ProductCategory) => void;
}

/** Count suffix per category */
const CATEGORY_COUNT_SUFFIX: Record<string, string> = {
  piedras: "piezas",
  gemas: "piezas",
  lotes: "lotes",
  joyas: "piezas",
};

export const CategoryGrid = React.memo(function CategoryGrid({
  categories,
  onCategorySelect,
}: CategoryGridProps) {
  const theme = useTheme();
  const { t } = useLanguage();
  const isLight = theme.palette.mode === "light";
  const prefersReducedMotion = useReducedMotion();

  const categoryLabels = useMemo<Record<string, string>>(
    () => ({
      joyas: t.ambassador.museum?.joyas ?? "Joyas",
      gemas: t.ambassador.museum?.gemas ?? "Gemas",
      piedras: t.ambassador.museum?.piedras ?? "Piedras",
      lotes: t.ambassador.museum?.lotes ?? "Lotes",
    }),
    [t],
  );

  if (categories.length === 0) return null;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(2, 1fr)",
          md: categories.length >= 3 ? "repeat(3, 1fr)" : "repeat(2, 1fr)",
        },
        gap: { xs: "10px", sm: "14px" },
      }}
    >
      {categories.map((category, index) => (
        <motion.div
          key={category.key}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.08, duration: 0.3 }}
        >
          <Box
            role="button"
            tabIndex={0}
            aria-label={`${categoryLabels[category.key] || category.label} - ${category.count} ${t.ambassador.museum?.items ?? "productos"}`}
            onClick={() => onCategorySelect(category)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onCategorySelect(category);
              }
            }}
            sx={{
              position: "relative",
              borderRadius: "18px",
              overflow: "hidden",
              height: { xs: 130, sm: 160, md: 180 },
              cursor: "pointer",
              transition: `all ${cssTransition.default}`,
              boxShadow: isLight
                ? "0 4px 16px rgba(0,0,0,0.12)"
                : "0 4px 16px rgba(0,0,0,0.35)",
              "&:hover": {
                transform: prefersReducedMotion ? "none" : "scale(1.02)",
                boxShadow: isLight
                  ? "0 8px 24px rgba(0,0,0,0.16)"
                  : "0 8px 24px rgba(0,0,0,0.45)",
              },
              "&:active": {
                transform: prefersReducedMotion ? "none" : "scale(0.97)",
              },
              "&:focus-visible": {
                outline: `2px solid ${emeraldCore.primary}`,
                outlineOffset: 2,
              },
            }}
          >
            {/* Background Image */}
            {category.coverImageUrl ? (
              <Box
                component="img"
                src={category.coverImageUrl}
                alt=""
                loading="lazy"
                decoding="async"
                sx={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  bgcolor: isLight
                    ? alpha(emeraldCore.primary, 0.08)
                    : alpha(emeraldCore.primary, 0.15),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: emeraldCore.primary,
                }}
              >
                <Gem size={36} strokeWidth={1} />
              </Box>
            )}

            {/* Scrim — guarantees label contrast even over washed-out/overexposed
                product photos, while a faint vignette tames blown-out highlights */}
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.55) 34%, rgba(0,0,0,0.12) 64%, rgba(0,0,0,0.04) 100%)",
                boxShadow: "inset 0 0 70px rgba(0,0,0,0.25)",
              }}
            />

            {/* Label — bottom-left, clean typography without emojis */}
            <Box
              sx={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                p: { xs: "14px 16px", sm: "16px 20px" },
                display: "flex",
                flexDirection: "column",
                gap: "3px",
              }}
            >
              <Typography
                sx={{
                  fontFamily: fontFamilies.display,
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: { xs: "1.35rem", sm: "1.5rem" },
                  lineHeight: 1.12,
                  letterSpacing: "0.01em",
                  textShadow: "0 1px 6px rgba(0,0,0,0.6)",
                }}
              >
                {categoryLabels[category.key] || category.label}
              </Typography>
              <Typography
                sx={{
                  color: "rgba(255,255,255,0.92)",
                  fontSize: { xs: "0.72rem", sm: "0.78rem" },
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                  textShadow: "0 1px 4px rgba(0,0,0,0.55)",
                }}
              >
                {category.count}{" "}
                {category.count === 1
                  ? category.key === "lotes"
                    ? "lote"
                    : "pieza"
                  : CATEGORY_COUNT_SUFFIX[category.key] ||
                    t.ambassador.museum?.items ||
                    "piezas"}
              </Typography>
            </Box>
          </Box>
        </motion.div>
      ))}
    </Box>
  );
});

export default CategoryGrid;
