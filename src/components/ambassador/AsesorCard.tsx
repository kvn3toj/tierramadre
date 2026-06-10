/**
 * AsesorCard Component — Directory "Calling Card"
 * A refined card per ambassador: layered avatar, name + serif tagline,
 * a hairline-divided stats row, and a curated gallery preview of their
 * finest pieces (with a "+N" depth cue). Elite/Destacado get a subtle
 * top accent line — gold for Elite, emerald for the top-ranked card.
 */

import { useMemo } from "react";
import { Box, Typography, Avatar, alpha, useTheme } from "@mui/material";
import { Star, Gem, ArrowUpRight } from "lucide-react";
import type { TreasureItem } from "../../types";
import { Asesor } from "../../hooks/useAsesores";
import {
  emeraldCore,
  goldAccent,
  surfacesDark,
  surfacesLight,
  cssTransition,
  fontFamilies,
} from "../../design-system/index";
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

function getRoleBadge(role: string | undefined, isLight: boolean) {
  const r = (role || "").toLowerCase();
  const isAdmin = r.includes("admin");

  if (isAdmin) {
    return {
      label: "Elite",
      bgcolor: alpha(goldAccent.primary, 0.14),
      color: isLight ? goldAccent.dark : goldAccent.light,
    };
  }
  return {
    label: "Embajador",
    bgcolor: alpha(emeraldCore.primary, 0.1),
    color: emeraldCore.primary,
  };
}

export default function AsesorCard({
  asesor,
  onViewProducts,
  isTopRanked,
}: AsesorCardProps) {
  const theme = useTheme();
  const isLight = theme.palette.mode === "light";
  const prefersReducedMotion = useReducedMotion();

  const rating = deriveRating(asesor.productCount || 0);
  const badge = getRoleBadge(asesor.role, isLight);
  const productCount = asesor.productCount || 0;
  const hasProducts = productCount > 0;
  const isAdmin = (asesor.role || "").toLowerCase().includes("admin");

  // Accent: emerald for the destacado (#1) card, gold for Elite (admin)
  const accent = isTopRanked ? emeraldCore.primary : goldAccent.primary;
  const showAccentLine = isAdmin || isTopRanked;
  // Avatar wears gold when Elite, emerald otherwise
  const avatarAccent = isAdmin ? goldAccent.primary : emeraldCore.primary;

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
        borderRadius: "20px",
        bgcolor: isLight
          ? surfacesLight.surface.default
          : surfacesDark.background.secondary,
        border: "1px solid",
        borderColor: isTopRanked
          ? alpha(emeraldCore.primary, 0.35)
          : isLight
            ? isAdmin
              ? alpha(goldAccent.primary, 0.18)
              : surfacesLight.border.light
            : isAdmin
              ? alpha(goldAccent.primary, 0.14)
              : surfacesDark.border.light,
        // Always-on soft elevation gives the card a premium, lifted feel
        boxShadow: isLight
          ? "0 1px 2px rgba(0,0,0,0.04), 0 6px 18px rgba(0,0,0,0.045)"
          : "0 1px 2px rgba(0,0,0,0.3), 0 6px 18px rgba(0,0,0,0.22)",
        cursor: "pointer",
        transition: prefersReducedMotion
          ? "none"
          : `all ${cssTransition.default}`,
        position: "relative",
        overflow: "hidden",
        // Top accent hairline for Elite / Destacado cards
        ...(showAccentLine && {
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: "12%",
            right: "12%",
            height: "2px",
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            opacity: 0.7,
            borderRadius: "0 0 2px 2px",
          },
        }),
        "&:hover": {
          transform: prefersReducedMotion ? "none" : "translateY(-3px)",
          zIndex: 2,
          boxShadow: isLight
            ? `0 6px 14px ${alpha("#000", 0.06)}, 0 16px 36px ${alpha("#000", 0.08)}`
            : `0 8px 22px ${alpha("#000", 0.4)}, 0 16px 40px ${alpha("#000", 0.32)}`,
          borderColor: alpha(
            isTopRanked ? emeraldCore.primary : avatarAccent,
            0.4,
          ),
          "& .asesor-card-arrow": {
            bgcolor: alpha(emeraldCore.primary, isLight ? 0.1 : 0.18),
            color: emeraldCore.primary,
            transform: prefersReducedMotion ? "none" : "translate(1px, -1px)",
          },
        },
        "&:active": {
          transform: prefersReducedMotion ? "none" : "translateY(-1px)",
        },
        "&:focus-visible": {
          outline: `2px solid ${emeraldCore.primary}`,
          outlineOffset: 2,
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
          {/* Ambient glow */}
          <Box
            sx={{
              position: "absolute",
              inset: -8,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${alpha(avatarAccent, 0.1)} 0%, transparent 68%)`,
              pointerEvents: "none",
            }}
          />
          {/* Thin outer ring */}
          <Box
            sx={{
              position: "absolute",
              inset: -2,
              borderRadius: "50%",
              border: "1px solid",
              borderColor: alpha(avatarAccent, isAdmin ? 0.32 : 0.16),
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
              bgcolor: isAdmin
                ? alpha(goldAccent.primary, 0.12)
                : alpha(emeraldCore.primary, 0.12),
              color: avatarAccent,
              border: "2px solid",
              borderColor: isLight ? "#fff" : surfacesDark.background.secondary,
              boxShadow: `0 0 0 1.5px ${alpha(avatarAccent, 0.6)}`,
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
              fontWeight: 650,
              fontSize: "0.9rem",
              lineHeight: 1.25,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              letterSpacing: "-0.01em",
            }}
          >
            {asesor.name}
          </Typography>

          {asesor.especialidad && (
            <Typography
              sx={{
                fontFamily: fontFamilies.serif,
                fontStyle: "italic",
                fontSize: "0.72rem",
                color: "text.secondary",
                opacity: 0.85,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                lineHeight: 1.35,
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
                height: 20,
                px: 0.85,
                fontSize: "0.58rem",
                fontWeight: 700,
                bgcolor: badge.bgcolor,
                color: badge.color,
                borderRadius: "6px",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {badge.label}
            </Box>
            {hasProducts && (
              <>
                <Box
                  sx={{
                    width: "1px",
                    height: 11,
                    bgcolor: alpha(isLight ? "#000" : "#fff", 0.12),
                  }}
                />
                {rating && (
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 0.35 }}
                  >
                    <Star
                      size={11}
                      fill={goldAccent.primary}
                      color={goldAccent.primary}
                    />
                    <Typography
                      sx={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        color: goldAccent.primary,
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
                      fontSize: "0.7rem",
                      color: "text.secondary",
                      fontWeight: 500,
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
            bgcolor: isLight ? alpha("#000", 0.03) : alpha("#fff", 0.05),
            color: "text.secondary",
            transition: prefersReducedMotion
              ? "none"
              : `all ${cssTransition.default}`,
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
                  borderRadius: "11px",
                  overflow: "hidden",
                  bgcolor: isLight ? alpha("#000", 0.04) : alpha("#fff", 0.04),
                  // Subtle inset ring lifts the thumbnails off the card
                  boxShadow: `inset 0 0 0 1px ${alpha(isLight ? "#000" : "#fff", 0.06)}`,
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
                      background: `linear-gradient(to top, ${alpha("#000", 0.55)}, ${alpha("#000", 0.3)})`,
                      backdropFilter: "blur(1px)",
                    }}
                  >
                    <Typography
                      sx={{
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        letterSpacing: "-0.01em",
                        textShadow: "0 1px 2px rgba(0,0,0,0.4)",
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
