/**
 * GridCard Component — Quiet Emerald catalog card.
 *
 * Renders one product tile in the 2/3/4-column grid. Two A/B variants
 * (useRedesignVariant):
 *   - "faithful" → a quiet hairline card that KEEPS the functional overlays
 *     (quality, gallery, quantity/lote, view-count, compare), de-glassed and
 *     re-toned to the single emerald.
 *   - "literal"  → the frameless minimal mockup (CatalogNew): image well →
 *     serif name → mono spec → price. No overlays, no border.
 *
 * Shared anatomy in both: near-square image well on --surface-2, Cormorant name,
 * DM Mono spec line ("4.20 ct · MUZO"), compact price.
 */
import React, { useCallback } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Skeleton,
  alpha,
  Tooltip,
} from '@mui/material';
import { Images, Eye, Scale } from 'lucide-react';
import { useThemeMode } from '../../contexts/ThemeContext';
import { usePriceShare } from '../../contexts/PriceShareContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useRedesignVariant } from '../../hooks/useRedesignVariant';
import { prefetchRoute } from '../../utils/routePrefetch';
import { TreasureItem } from '../../types';
import {
  getQualityBadge,
  getQualityTooltip,
  formatCarats,
} from '../../utils/formatting';
import { PriceDisplay } from '../price-simulator/PriceDisplay';
import ProgressiveImage from '../shared/ProgressiveImage';
import { getQuietEmerald, Badge, PieceCard } from '../../design-system';

interface GridCardProps {
  item: TreasureItem;
  isFavorite?: boolean;
  onItemClick: (item: TreasureItem) => void;
  onCertClick?: (item: TreasureItem) => void;
  onToggleFavorite?: (itemId: number) => void;
  isSelectedForComparison?: boolean;
  onToggleComparison?: (item: TreasureItem) => void;
  canAddToComparison?: boolean;
  isMobile?: boolean;
  /** Whether batch thumbnails are still loading from the API */
  isLoadingThumbnails?: boolean;
  /** Above-the-fold item — triggers eager loading */
  priority?: boolean;
  /** View count for this product (optional) */
  viewCount?: number;
  /** Whether the current user is an admin (required to see view counts) */
  isAdmin?: boolean;
  /**
   * Force a redesign variant for this instance instead of reading the global
   * store. Used by the public Vitrina to always render the clean `literal`
   * card without mutating the authenticated app's catalog preference.
   */
  variantOverride?: 'literal' | 'faithful';
  /**
   * Explicit price label to render instead of the viewer-derived PriceDisplay.
   * `string` → show it; `null` → show no price; `undefined` → default behavior
   * (PriceDisplay gated by the viewer's `shouldShowPrices`). Used by the Vitrina
   * to show the per-share price (precioCOP × chosen multiplier).
   */
  priceOverride?: string | null;
}

/** Builds the DM Mono spec line, mixed-case ct + uppercase mine ("4.20 ct · MUZO"). */
function buildSpecLine(item: TreasureItem): string {
  const parts: string[] = [];
  const isLoose = !item.isJewelry;
  if (isLoose && typeof item.peso === 'number') {
    parts.push(`${formatCarats(item.peso)} ct`);
  }
  if (item.isJewelry && item.metalType) parts.push(item.metalType);
  const mine = (item.procedencia || item.mina || '').trim();
  if (mine) parts.push(mine.toUpperCase());
  return parts.length > 0 ? parts.join(' · ') : item.color;
}

function GridCard({
  item,
  onItemClick,
  isMobile = false,
  isLoadingThumbnails = false,
  priority = false,
  viewCount,
  isAdmin,
  isSelectedForComparison = false,
  onToggleComparison,
  canAddToComparison = true,
  variantOverride,
  priceOverride,
}: GridCardProps) {
  const { mode } = useThemeMode();
  const { shouldShowPrices } = usePriceShare();
  const prefersReducedMotion = useReducedMotion();
  const { isLiteral: variantIsLiteral } = useRedesignVariant();
  const isLiteral = variantOverride
    ? variantOverride === 'literal'
    : variantIsLiteral;

  const qe = getQuietEmerald(mode);

  const displayName = item.nombre
    .replace(/^L:.*?\s/, '')
    .replace(/^L:/, '')
    .trim();
  // Jewelry often has no `color`, which used to leave a dangling "Name - " in
  // alt/aria text; compose from the parts that exist (metal describes jewelry).
  const altText = [displayName, item.isJewelry ? item.metalType : item.color]
    .map((s) => (s || '').trim())
    .filter(Boolean)
    .join(', ');
  const quality = getQualityBadge(item.calidad);
  const qualityTooltip = getQualityTooltip(item.calidad);
  const specLine = buildSpecLine(item);

  const handleItemClick = useCallback(() => {
    onItemClick(item);
  }, [onItemClick, item]);

  const handleCompareClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleComparison?.(item);
    },
    [onToggleComparison, item],
  );

  const handlePrefetch = useCallback(() => {
    prefetchRoute('product');
  }, []);

  // ---- Image well (shared) ----------------------------------------------
  const imageWell = item.imagen ? (
    <ProgressiveImage
      src={item.imagen}
      alt={altText}
      height="100%"
      layout="grid"
      quality="eco"
      priority={priority}
      tinyThumb={item.tinyThumb}
      // Tall jewelry compositions (necklace + pendant) get amputated by
      // cover-cropping in the near-square well; letterbox them instead.
      // Loose-stone photos are centered square shots that crop safely.
      objectFit={item.isJewelry ? 'contain' : 'cover'}
    />
  ) : isLoadingThumbnails ? (
    <Box sx={{ aspectRatio: '1 / 1.06', width: '100%' }}>
      <Skeleton
        variant="rectangular"
        animation="wave"
        width="100%"
        height="100%"
      />
    </Box>
  ) : (
    <ProgressiveImage src={undefined} alt={altText} aspectRatio="1 / 1.06" />
  );

  // ---- Functional overlays (faithful variant only) ----------------------
  const overlays = item.imagen ? (
    <>
      {/* Gallery count badge — bottom right */}
      {(item.galleryCount ?? 0) > 1 && !item.isLote && (
        <Chip
          icon={<Images size={10} />}
          label={item.galleryCount}
          size="small"
          sx={{
            position: 'absolute',
            bottom: item.cantidad > 1 ? 28 : 6,
            right: 6,
            bgcolor: 'rgba(0,0,0,0.62)',
            color: 'white',
            fontSize: 9,
            fontWeight: 600,
            height: 18,
            '& .MuiChip-icon': { color: 'rgba(255,255,255,0.8)', ml: 0.5 },
            '& .MuiChip-label': { px: 0.5 },
          }}
        />
      )}

      {/* Quality badge — bottom left */}
      <Tooltip title={qualityTooltip} arrow enterDelay={300} placement="top">
        <Box
          sx={{
            position: 'absolute',
            bottom: 6,
            left: 6,
            maxWidth: item.isLote
              ? 'calc(100% - 110px)'
              : item.cantidad > 1
                ? 'calc(100% - 52px)'
                : 'calc(100% - 12px)',
            overflow: 'hidden',
          }}
        >
          <Badge tone={quality.tone} label={quality.label} />
        </Box>
      </Tooltip>

      {/* Quantity / lote badge — bottom right */}
      {(item.isLote || item.cantidad > 1) && (
        <Chip
          label={
            item.isLote
              ? `Lote · ${item.cantidad} ${item.cantidad === 1 ? 'pieza' : 'piezas'}`
              : `×${item.cantidad}`
          }
          size="small"
          sx={{
            position: 'absolute',
            bottom: 6,
            right: 6,
            height: 18,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.02em',
            bgcolor: item.isLote ? qe.accentStrong : 'rgba(0,0,0,0.62)',
            color: item.isLote ? qe.onAccent : 'white',
            '& .MuiChip-label': { px: 0.5 },
          }}
        />
      )}

      {/* View count badge — top left (Admin only) */}
      {isAdmin && viewCount !== undefined && viewCount > 0 && (
        <Chip
          icon={<Eye size={10} />}
          label={
            viewCount > 999 ? `${(viewCount / 1000).toFixed(1)}k` : viewCount
          }
          size="small"
          sx={{
            position: 'absolute',
            top: 6,
            left: 6,
            height: 18,
            fontSize: 9,
            fontWeight: 500,
            bgcolor: 'rgba(0,0,0,0.52)',
            color: 'rgba(255,255,255,0.9)',
            '& .MuiChip-icon': { color: 'rgba(255,255,255,0.7)', ml: 0.5 },
            '& .MuiChip-label': { px: 0.5 },
          }}
        />
      )}

      {/* Compare button — top right (hidden when prices not shown) */}
      {onToggleComparison && shouldShowPrices && (
        <IconButton
          onClick={handleCompareClick}
          aria-label={
            isSelectedForComparison
              ? 'Quitar de comparación'
              : 'Agregar a comparación'
          }
          disabled={!isSelectedForComparison && !canAddToComparison}
          size="small"
          sx={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 34,
            height: 34,
            bgcolor: isSelectedForComparison
              ? qe.accentStrong
              : alpha('#000000', 0.5),
            color: isSelectedForComparison ? qe.onAccent : 'white',
            transition: prefersReducedMotion
              ? 'none'
              : 'background-color 0.2s ease, transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
            '&:hover': {
              bgcolor: isSelectedForComparison
                ? qe.accent
                : alpha('#000000', 0.68),
              transform: prefersReducedMotion ? 'none' : 'scale(1.08)',
            },
            '&:active': {
              transform: prefersReducedMotion ? 'none' : 'scale(0.92)',
            },
            '&:disabled': {
              bgcolor: alpha('#000000', 0.28),
              color: 'rgba(255,255,255,0.5)',
            },
          }}
        >
          <Scale size={15} />
        </IconButton>
      )}
    </>
  ) : null;

  // ---- Price (shared) -----------------------------------------------------
  const priceEl =
    priceOverride !== undefined ? (
      priceOverride ? (
        <Typography
          sx={{
            fontFamily: 'var(--tm-font-mono)',
            fontWeight: 600,
            color: 'var(--tm-accent)',
            fontSize: isMobile ? 12.5 : 13,
            fontFeatureSettings: '"tnum"',
            whiteSpace: 'nowrap',
          }}
        >
          {priceOverride}
        </Typography>
      ) : null
    ) : shouldShowPrices ? (
      <PriceDisplay
        price={item.precioCOP}
        precioInternacional={item.precioInternacional}
        compact
        compactSize={isMobile ? 12.5 : 13}
      />
    ) : null;

  return (
    <PieceCard
      variant={isLiteral ? 'frameless' : 'well'}
      media={imageWell}
      overlays={isLiteral ? undefined : overlays}
      name={displayName}
      specLine={specLine}
      price={priceEl}
      itemNumber={item.item}
      onClick={handleItemClick}
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
      ariaLabel={altText}
      compact={isMobile}
    />
  );
}

// Memo comparison skips callback props — they are stable parent refs or excluded
// intentionally so that unstable wrappers don't defeat memoization.
// Context-derived values (shouldShowPrices, redesign variant) trigger re-render
// via their own subscriptions anyway.
export default React.memo(GridCard, (prevProps, nextProps) => {
  return (
    prevProps.item.item === nextProps.item.item &&
    prevProps.item.imagen === nextProps.item.imagen &&
    prevProps.item.precioCOP === nextProps.item.precioCOP &&
    prevProps.item.estado === nextProps.item.estado &&
    prevProps.item.isLote === nextProps.item.isLote &&
    prevProps.item.cantidad === nextProps.item.cantidad &&
    prevProps.item.procedencia === nextProps.item.procedencia &&
    prevProps.item.mina === nextProps.item.mina &&
    prevProps.isFavorite === nextProps.isFavorite &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.isLoadingThumbnails === nextProps.isLoadingThumbnails &&
    prevProps.priority === nextProps.priority &&
    prevProps.viewCount === nextProps.viewCount &&
    prevProps.isAdmin === nextProps.isAdmin &&
    prevProps.isSelectedForComparison === nextProps.isSelectedForComparison &&
    prevProps.canAddToComparison === nextProps.canAddToComparison &&
    prevProps.variantOverride === nextProps.variantOverride &&
    prevProps.priceOverride === nextProps.priceOverride
  );
});
