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
import { Box, Typography, Chip, Skeleton } from '@mui/material';
import { Images, Eye } from 'lucide-react';
import { useThemeMode } from '../../contexts/ThemeContext';
import { usePriceShare } from '../../contexts/PriceShareContext';
import { useRedesignVariant } from '../../hooks/useRedesignVariant';
import { prefetchRoute } from '../../utils/routePrefetch';
import { TreasureItem } from '../../types';
import { abbreviateQuality, formatCarats } from '../../utils/formatting';
import { EmeraldCutIcon } from './EmeraldCutIcon';
import PrecioEspecialBadge from './PrecioEspecialBadge';
import { PriceDisplay } from '../price-simulator/PriceDisplay';
import ProgressiveImage from '../shared/ProgressiveImage';
import { getQuietEmerald, PieceCard } from '../../design-system';

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

/** Builds the DM Mono spec line: abbreviated quality + weight/metal + mine
 *  ("C. Fina · 4.20 ct · MUZO"). Quality leads so the tier reads first now that
 *  the image badge shows the cut, not the quality. */
function buildSpecLine(item: TreasureItem): string {
  const parts: string[] = [];
  const quality = abbreviateQuality(item.calidad);
  if (quality) parts.push(quality);
  const isLoose = !item.isJewelry;
  // Only show the carat weight for a loose stone with a real weight — never
  // "0.00 ct" (joyas / insumos / unweighed items have peso 0 or blank).
  if (isLoose && typeof item.peso === 'number' && item.peso > 0) {
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
  variantOverride,
  priceOverride,
}: GridCardProps) {
  const { mode } = useThemeMode();
  const { shouldShowPrices } = usePriceShare();
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
  // Full "grade · carat · mine" line — used only by the frameless `literal`
  // (Vitrina) variant, which has no separate value row.
  const specLine = buildSpecLine(item);

  // Faithful footer, two quiet meta rows under the serif name:
  //   1. Stone-identity line — gem glyph + "cut · weight · origin" (the physical
  //      description). It owns the full width and never competes with the price.
  //   2. Value row — the grade stamp (below) on the left, price on the right.
  const cutLabel = item.talla?.trim() || 'Gema';
  const caratOrMetal =
    !item.isJewelry && typeof item.peso === 'number'
      ? `${formatCarats(item.peso)} ct`
      : item.isJewelry && item.metalType
        ? item.metalType
        : '';
  const mineLabel = (item.procedencia || item.mina || '').trim();
  const stoneLine = [cutLabel, caratOrMetal, mineLabel]
    .filter(Boolean)
    .join(' · ');
  const cutNode = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        minWidth: 0,
        // The cut mark is silver-grey line art, never green: the only saturated
        // thing beside the card must stay the actual stone in the photograph.
        // Its depth comes from tone (opacity steps inside the glyph), not hue.
        color: 'var(--tm-subtle)',
      }}
    >
      <EmeraldCutIcon cut={item.talla} size={14} />
      <Typography
        sx={{
          fontFamily: 'var(--tm-font-mono)',
          fontSize: '0.62rem',
          letterSpacing: '0.03em',
          color: 'var(--tm-muted)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {stoneLine}
      </Typography>
    </Box>
  );

  // Grade stamp: the quality tier as a quiet uppercase mono label, left of the
  // price. Grades are short (already uppercase in the source, e.g. "C. SUPERIOR",
  // "F2"), so the price keeps its own baseline and never truncates.
  const gradeLabel = abbreviateQuality(item.calidad);
  const gradeNode = gradeLabel ? (
    <Typography
      sx={{
        fontFamily: 'var(--tm-font-mono)',
        // Tight enough that the longest real grades ("Fina Esencial",
        // "C. Superior") still sit beside an 8-digit price without ellipsising.
        fontSize: '0.575rem',
        fontWeight: 500,
        letterSpacing: '0.045em',
        textTransform: 'uppercase',
        color: 'var(--tm-muted)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        minWidth: 0,
      }}
    >
      {gradeLabel}
    </Typography>
  ) : undefined;

  const handleItemClick = useCallback(() => {
    onItemClick(item);
  }, [onItemClick, item]);

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

  // ---- Precio especial (BOTH variants) ----------------------------------
  // El indicador de promoción temporal no es cromo funcional del catálogo: es
  // información del precio. Por eso viaja también en la variante `literal`,
  // que descarta el resto de overlays — un visitante no puede quedarse sin
  // saber que el precio que está viendo vence. Arriba a la derecha: abajo
  // viven galería/lote y arriba a la izquierda el contador de vistas (admin).
  const precioEspecialOverlay = item.precioEspecial ? (
    <Box
      sx={{
        position: 'absolute',
        top: 6,
        right: 6,
        maxWidth: 'calc(100% - 12px)',
      }}
    >
      <PrecioEspecialBadge
        precioEspecial={item.precioEspecial}
        compact
        // La tarjeta lleva cromo de 18px y tipografía de 9-10px; el Badge se
        // ajusta a esa escala sin forzar una variante nueva en el DS.
        style={{ height: 20, fontSize: '0.6875rem' }}
      />
    </Box>
  ) : null;

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

      {precioEspecialOverlay}
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
      overlays={isLiteral ? precioEspecialOverlay : overlays}
      name={displayName}
      specLine={isLiteral ? specLine : ''}
      grade={isLiteral ? undefined : gradeNode}
      price={priceEl}
      cut={isLiteral ? undefined : cutNode}
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
    // La promoción entra y sale sola (vence por fecha en el backend): si no se
    // compara, la tarjeta seguiría mostrando un precio "especial" ya vencido.
    prevProps.item.precioEspecial?.etiqueta ===
      nextProps.item.precioEspecial?.etiqueta &&
    prevProps.item.precioEspecial?.hasta ===
      nextProps.item.precioEspecial?.hasta &&
    prevProps.isFavorite === nextProps.isFavorite &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.isLoadingThumbnails === nextProps.isLoadingThumbnails &&
    prevProps.priority === nextProps.priority &&
    prevProps.viewCount === nextProps.viewCount &&
    prevProps.isAdmin === nextProps.isAdmin &&
    prevProps.variantOverride === nextProps.variantOverride &&
    prevProps.priceOverride === nextProps.priceOverride
  );
});
