/**
 * AsesorCard Component — Big Directory Card
 * Two-part layout: top row (avatar | info | chevron) + favorites gallery row.
 * Large rounded thumbnails let users preview ambassador's best pieces at a glance.
 */

import { useMemo } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import { Star, Gem, ChevronRight } from 'lucide-react';
import type { TreasureItem } from '../../types';
import { Asesor } from '../../hooks/useAsesores';
import {
  emeraldCore,
  goldAccent,
  surfacesDark,
  surfacesLight,
  cssTransition,
} from '../../design-system/index';
import { deriveRating } from '../../utils/formatting';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/** Resolve top items for card preview: curated favorites first, fallback to highest-priced */
function resolvePreviewItems(slug: string, products: TreasureItem[] | undefined, max = 3): TreasureItem[] {
  if (!products || products.length === 0) return [];

  // Check localStorage for curated favorites
  try {
    const stored = localStorage.getItem(`tm-ambassador-favorites-${slug}`);
    const ids: string[] = stored ? JSON.parse(stored) : [];
    if (ids.length > 0) {
      const matched = ids
        .map(id => products.find(p => String(p.item) === id))
        .filter((p): p is TreasureItem => !!p && !!(p.thumbnailUrl || p.imagen));
      if (matched.length > 0) return matched.slice(0, max);
    }
  } catch { /* noop */ }

  // Fallback: top items by price that have images
  return [...products]
    .filter(p => !!(p.thumbnailUrl || p.imagen))
    .sort((a, b) => (b.precioCOP || 0) - (a.precioCOP || 0))
    .slice(0, max);
}

interface AsesorCardProps {
  asesor: Asesor;
  onViewProducts?: (asesor: Asesor) => void;
  isTopRanked?: boolean;
}

function getRoleBadge(role: string | undefined, isLight: boolean) {
  const r = (role || '').toLowerCase();
  const isAdmin = r.includes('admin');

  if (isAdmin) {
    return {
      label: 'Elite',
      bgcolor: alpha(goldAccent.primary, 0.14),
      color: isLight ? goldAccent.dark : goldAccent.light,
    };
  }
  return {
    label: 'Embajador',
    bgcolor: alpha(emeraldCore.primary, 0.1),
    color: emeraldCore.primary,
  };
}

export default function AsesorCard({ asesor, onViewProducts, isTopRanked }: AsesorCardProps) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const prefersReducedMotion = useReducedMotion();

  const rating = deriveRating(asesor.productCount || 0);
  const badge = getRoleBadge(asesor.role, isLight);
  const hasProducts = (asesor.productCount || 0) > 0;
  const isAdmin = (asesor.role || '').toLowerCase().includes('admin');

  const previewItems = useMemo(
    () => resolvePreviewItems(asesor.slug, asesor.products, 3),
    [asesor.slug, asesor.products]
  );

  return (
    <Box
      role="article"
      tabIndex={0}
      aria-label={`${asesor.name} - ${asesor.role || 'Embajador'}`}
      onClick={() => onViewProducts?.(asesor)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onViewProducts?.(asesor);
        }
      }}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '18px',
        bgcolor: isLight ? surfacesLight.surface.default : surfacesDark.background.secondary,
        border: isTopRanked ? '1.5px solid' : '1px solid',
        borderColor: isTopRanked
          ? alpha(emeraldCore.primary, 0.4)
          : isLight
            ? (isAdmin ? alpha(goldAccent.primary, 0.15) : surfacesLight.border.light)
            : (isAdmin ? alpha(goldAccent.primary, 0.12) : surfacesDark.border.light),
        boxShadow: 'none',
        cursor: 'pointer',
        transition: prefersReducedMotion ? 'none' : `all ${cssTransition.default}`,
        position: 'relative',
        overflow: 'hidden',
        // Subtle left accent bar for admin or top-ranked cards
        ...((isAdmin || isTopRanked) && {
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: isTopRanked ? '10%' : '20%',
            bottom: isTopRanked ? '10%' : '20%',
            width: '2px',
            background: isTopRanked
              ? `linear-gradient(180deg, transparent, ${emeraldCore.primary}, transparent)`
              : `linear-gradient(180deg, transparent, ${goldAccent.primary}, transparent)`,
            borderRadius: '0 2px 2px 0',
          },
        }),
        '&:hover': {
          transform: prefersReducedMotion ? 'none' : 'translateY(-1px)',
          zIndex: 2,
          boxShadow: isLight
            ? `0 2px 8px ${alpha('#000', 0.08)}`
            : `0 2px 8px ${alpha('#000', 0.25)}`,
          borderColor: alpha(emeraldCore.primary, 0.35),
        },
        '&:active': {
          transform: prefersReducedMotion ? 'none' : 'translateY(0)',
        },
        '&:focus-visible': {
          outline: `2px solid ${emeraldCore.primary}`,
          outlineOffset: 2,
        },
      }}
    >
      {/* Top row: avatar | info | chevron */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 1.5,
          p: previewItems.length > 0 ? '12px 14px 10px 14px' : '14px',
        }}
      >
        {/* Avatar with ambient glow */}
        <Box
          sx={{
            position: 'relative',
            width: 52,
            height: 52,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: -6,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${alpha(
                isAdmin ? goldAccent.primary : emeraldCore.primary,
                0.06
              )} 0%, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '1.5px solid',
              borderColor: isAdmin
                ? alpha(goldAccent.primary, 0.25)
                : alpha(emeraldCore.primary, 0.12),
            }}
          />
          <Avatar
            src={asesor.photoUrl}
            alt={asesor.name}
            sx={{
              width: 44,
              height: 44,
              fontSize: '1.1rem',
              fontWeight: 700,
              bgcolor: isAdmin ? alpha(goldAccent.primary, 0.1) : alpha(emeraldCore.primary, 0.1),
              color: isAdmin ? goldAccent.primary : emeraldCore.primary,
              border: '2px solid',
              borderColor: isAdmin ? goldAccent.primary : emeraldCore.primary,
            }}
          >
            {asesor.name.charAt(0).toUpperCase()}
          </Avatar>
        </Box>

        {/* Info column */}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          <Typography
            sx={{
              fontWeight: 650,
              fontSize: '0.875rem',
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              letterSpacing: '-0.01em',
            }}
          >
            {asesor.name}
          </Typography>

          {asesor.especialidad && (
            <Typography
              sx={{
                fontSize: '0.69rem',
                color: 'text.secondary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1.4,
              }}
            >
              {asesor.especialidad}
            </Typography>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mt: 0.25 }}>
            <Chip
              label={badge.label}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.58rem',
                fontWeight: 700,
                bgcolor: badge.bgcolor,
                color: badge.color,
                borderRadius: '5px',
                letterSpacing: '0.03em',
              }}
            />
            {hasProducts && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {rating && (
                  <>
                    <Star size={11} fill={goldAccent.primary} color={goldAccent.primary} />
                    <Typography
                      sx={{ fontSize: '0.69rem', fontWeight: 700, color: goldAccent.primary }}
                    >
                      {rating}
                    </Typography>
                    <Typography
                      sx={{ fontSize: '0.69rem', color: alpha(isLight ? '#000' : '#fff', 0.2) }}
                    >
                      ·
                    </Typography>
                  </>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                  <Gem size={10} style={{ opacity: 0.4 }} />
                  <Typography sx={{ fontSize: '0.69rem', color: 'text.secondary' }}>
                    {asesor.productCount}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </Box>

        {/* Chevron */}
        <ChevronRight
          size={18}
          strokeWidth={1.5}
          style={{ flexShrink: 0, opacity: 0.3 }}
        />
      </Box>

      {/* Favorites gallery — large rounded thumbnails */}
      {previewItems.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            gap: '6px',
            px: '10px',
            pb: '10px',
          }}
        >
          {previewItems.map((item) => (
            <Box
              key={item.item}
              sx={{
                flex: 1,
                aspectRatio: '4/3',
                borderRadius: '10px',
                overflow: 'hidden',
                bgcolor: isLight
                  ? alpha('#000', 0.04)
                  : alpha('#fff', 0.04),
              }}
            >
              <img
                src={item.thumbnailUrl || item.imagen}
                alt={item.nombre || ''}
                loading="lazy"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
