/**
 * AsesorCard Component — Directory "Calling Card"
 * A refined card per ambassador: layered avatar, name + serif tagline,
 * a hairline-divided stats row, and a curated gallery preview of their
 * finest pieces (with a "+N" depth cue). Elite/Destacado get a subtle
 * top accent line — gold for Elite, emerald for the top-ranked card.
 */

import { useMemo } from "react";
import { Box, Typography, Avatar } from "@mui/material";
import { Star, Gem, ArrowUpRight } from "lucide-react";
import type { TreasureItem } from "../../types";
import { Asesor } from "../../hooks/useAsesores";
import { qeFont, qeGray, zIndex } from "../../design-system/index";
import { deriveRating } from "../../utils/formatting";
import { useReducedMotion } from "../../hooks/useReducedMotion";

/** Resolve top items for card preview: curated favorites first, fallback to highest-priced */
function resolvePreviewItems(
  slug: string,
  products: TreasureItem[] | undefined,
  max = 3,
): TreasureItem[] {
  if (!products || products.length === 0) return [];

  // Check localStorage for curated favorites
  try {
    const stored = localStorage.getItem(`tm-ambassador-favorites-${slug}`);
    const ids: string[] = stored ? JSON.parse(stored) : [];
    if (ids.length > 0) {
      const matched = ids
        .map((id) => products.find((p) => String(p.item) === id))
        .filter(
          (p): p is TreasureItem => !!p && !!(p.thumbnailUrl || p.imagen),
        );
      if (matched.length > 0) return matched.slice(0, max);
    }
  } catch {
    /* noop */
  }

  // Fallback: top items by price that have images
  return [...products]
    .filter((p) => !!(p.thumbnailUrl || p.imagen))
    .sort((a, b) => (b.precioCOP || 0) - (a.precioCOP || 0))
    .slice(0, max);
}

interface AsesorCardProps {
  asesor: Asesor;
  onViewProducts?: (asesor: Asesor) => void;
  isTopRanked?: boolean;
}

/**
 * Elite reads neutral and Embajador reads emerald. DS3 has a single
 * saturated colour, so the two roles cannot be told apart by hue alone —
 * the label carries the distinction (WCAG 1.4.1).
 */
function getRoleBadge(role: string | undefined) {
  const isAdmin = (role || "").toLowerCase().includes("admin");

  if (isAdmin) {
    return {
      label: "Elite",
      bgcolor: "var(--tm-well)",
      color: "var(--tm-muted)",
    };
  }
  return {
    label: "Embajador",
    bgcolor: "var(--tm-accent-wash)",
    color: "var(--tm-accent)",
  };
}

export default function AsesorCard({
  asesor,
  onViewProducts,
  isTopRanked,
}: AsesorCardProps) {
  const prefersReducedMotion = useReducedMotion();

  const rating = deriveRating(asesor.productCount || 0);
  const badge = getRoleBadge(asesor.role);
  const productCount = asesor.productCount || 0;
  const hasProducts = productCount > 0;

  const previewItems = useMemo(
    () => resolvePreviewItems(asesor.slug, asesor.products, 3),
    [asesor.slug, asesor.products],
  );
  // How many additional pieces beyond the preview — communicates collection depth
  const extraCount = Math.max(0, productCount - previewItems.length);

  return (
    <Box
      role="article"
      tabIndex={0}
      aria-label={`${asesor.name} - ${asesor.role || "Embajador"}`}
      onClick={() => onViewProducts?.(asesor)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onViewProducts?.(asesor);
        }
      }}
      sx={{
        display: "flex",
        flexDirection: "column",
        borderRadius: "var(--tm-radius-card)",
        bgcolor: "var(--tm-surface)",
        border: "1px solid",
        // The top-ranked card earns a heavier border; every other card —
        // Elite included — takes the plain hairline. Depth is borders-first.
        borderColor: isTopRanked ? "var(--tm-accent)" : "var(--tm-border)",
        cursor: "pointer",
        transition: prefersReducedMotion
          ? "none"
          : "border-color var(--tm-base) var(--tm-ease)",
        position: "relative",
        overflow: "hidden",
        "&:hover": {
          zIndex: zIndex.base + 1,
          borderColor: "var(--tm-accent)",
          "& .asesor-card-arrow": {
            bgcolor: "var(--tm-accent-wash)",
            color: "var(--tm-accent)",
          },
        },
        "&:focus-visible": {
          outline: "none",
          boxShadow: "var(--tm-focus-ring)",
        },
      }}
    >
      {/* Top row: avatar | info | view-profile arrow */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 1.5,
          p: previewItems.length > 0 ? "14px 15px 12px 15px" : "15px",
        }}
      >
        {/* Avatar — layered ring + ambient glow */}
        <Box
          sx={{
            position: "relative",
            width: 56,
            height: 56,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Thin outer ring */}
          <Box
            sx={{
              position: "absolute",
              inset: -2,
              borderRadius: "50%",
              border: "1px solid",
              borderColor: "var(--tm-border)",
            }}
          />
          <Avatar
            src={asesor.photoUrl}
            alt={asesor.name}
            sx={{
              width: 50,
              height: 50,
              fontSize: "1.2rem",
              fontWeight: 700,
              bgcolor: "var(--tm-accent-wash)",
              color: "var(--tm-accent)",
              border: "2px solid",
              borderColor: "var(--tm-surface)",
            }}
          >
            {asesor.name.charAt(0).toUpperCase()}
          </Avatar>
        </Box>

        {/* Info column */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 0.35,
          }}
        >
          <Typography
            sx={{
              fontFamily: qeFont.serif,
              fontWeight: 600,
              fontSize: "1.08rem",
              lineHeight: 1.15,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              letterSpacing: "0.005em",
            }}
          >
            {asesor.name}
          </Typography>

          {asesor.especialidad && (
            <Typography
              sx={{
                fontFamily: qeFont.serif,
                fontStyle: "italic",
                fontSize: "0.82rem",
                color: "var(--tm-muted)",
                opacity: 0.9,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                lineHeight: 1.3,
              }}
            >
              {asesor.especialidad}
            </Typography>
          )}

          {/* Stats row — role badge · rating · pieces, with a hairline divider */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              flexWrap: "wrap",
              mt: 0.4,
            }}
          >
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.45,
                height: 20,
                px: 0.85,
                fontSize: "0.56rem",
                fontWeight: 600,
                bgcolor: badge.bgcolor,
                color: badge.color,
                border: "1px solid",
                borderColor: "var(--tm-border)",
                borderRadius: "999px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              <Box
                sx={{
                  width: 3.5,
                  height: 3.5,
                  borderRadius: "50%",
                  bgcolor: badge.color,
                }}
              />
              {badge.label}
            </Box>
            {hasProducts && (
              <>
                <Box
                  sx={{
                    width: "1px",
                    height: 11,
                    bgcolor: "var(--tm-hairline)",
                  }}
                />
                {rating && (
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 0.35 }}
                  >
                    <Star size={11} style={{ color: "var(--tm-muted)" }} />
                    <Typography
                      sx={{
                        fontFamily: qeFont.serif,
                        fontSize: "0.86rem",
                        fontWeight: 600,
                        lineHeight: 1,
                        color: "var(--tm-muted)",
                        fontVariantNumeric: "lining-nums",
                      }}
                    >
                      {rating}
                    </Typography>
                  </Box>
                )}
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
                  <Gem size={10} style={{ opacity: 0.45 }} />
                  <Typography
                    sx={{
                      fontFamily: qeFont.serif,
                      fontSize: "0.86rem",
                      lineHeight: 1,
                      color: "var(--tm-muted)",
                      fontWeight: 600,
                      fontVariantNumeric: "lining-nums",
                    }}
                  >
                    {productCount}
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </Box>

        {/* View-profile arrow — sits in a subtle pill that lights up on hover */}
        <Box
          className="asesor-card-arrow"
          sx={{
            flexShrink: 0,
            width: 30,
            height: 30,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "var(--tm-well)",
            color: "var(--tm-muted)",
            transition: prefersReducedMotion
              ? "none"
              : "background-color var(--tm-base) var(--tm-ease), color var(--tm-base) var(--tm-ease)",
          }}
        >
          <ArrowUpRight size={16} strokeWidth={2} />
        </Box>
      </Box>

      {/* Curated gallery — finest pieces, with a "+N" depth cue on the last tile */}
      {previewItems.length > 0 && (
        <Box
          sx={{
            display: "flex",
            gap: "6px",
            px: "11px",
            pb: "11px",
          }}
        >
          {previewItems.map((item, idx) => {
            const isLast = idx === previewItems.length - 1;
            const showOverlay = isLast && extraCount > 0;
            return (
              <Box
                key={item.item}
                sx={{
                  position: "relative",
                  flex: 1,
                  aspectRatio: "4/3",
                  borderRadius: "var(--tm-radius-well)",
                  overflow: "hidden",
                  bgcolor: "var(--tm-well)",
                  boxShadow: "inset 0 0 0 1px var(--tm-border)",
                }}
              >
                <img
                  src={item.thumbnailUrl || item.imagen}
                  alt={item.nombre || ""}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
                {showOverlay && (
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      // On-photo chrome: the "+N" tile scrim.
                      bgcolor: "var(--tm-scrim)",
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: qeFont.serif,
                        color: qeGray[0],
                        fontWeight: 600,
                        fontSize: "1rem",
                        lineHeight: 1,
                        letterSpacing: "0.01em",
                        fontVariantNumeric: "lining-nums",
                      }}
                    >
                      +{extraCount}
                    </Typography>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
