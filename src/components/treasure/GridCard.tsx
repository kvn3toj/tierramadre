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
import { abbreviateQuality, formatWeightLabel } from '../../utils/formatting';
import { EmeraldCutIcon } from './EmeraldCutIcon';
import PrecioEspecialBadge from './PrecioEspecialBadge';
import ResaleBadge from './ResaleBadge';
import { useResaleOffers } from '../../hooks/useResaleOffers';
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
  // Weight for a loose stone, metal for a joya — never "0.00 ct" (joyas /
  // insumos / unweighed items have peso 0 or blank). `metal-only` keeps a
  // metal-less joya showing nothing, as it always has.
  const weight = formatWeightLabel(item, { jewelryPrefers: 'metal-only' });
  if (weight) parts.push(weight);
  const mine = (item.procedencia || item.mina || '').trim();
  if (mine) parts.push(mine.toUpperCase());
  return parts.length > 0 ? parts.join(' · ') : item.color;
}

/** Shared geometry for the image-well overlay chips.
 *
 *  All three previously sat at `fontSize: 9`, under the 11px legibility floor
 *  — and one of them ("Lote · 12") carries a real word, not just a glyph.
 *  11px is `iosTypographyScale.caption2` / `qeType.spec.fontSize`; the height
 *  goes 18 -> 20 to keep the label vertically centred at the larger size,
 *  matching the precioEspecial badge already rendered in the same well.
 *
 *  Los tres son VELO OSCURO sobre la foto (2026-08-03). El de lote era el
 *  único con relleno esmeralda sólido y gritaba por encima de la pieza, que es
 *  lo que el cliente vino a ver. Ahora se distingue por el COLOR DEL TEXTO
 *  (`accentPure`) y por la palabra "Lote" — nunca sólo por color, que es lo que
 *  pide §DS3 del Badge. El sustantivo "piezas" salió de la etiqueta visible y
 *  vive en `title` + `aria-label`, el mismo recurso que ya usa
 *  `PrecioEspecialBadge` en su densidad `compact`: el chip encoge ~40% sin que
 *  el lector de pantalla pierda la frase completa.
 */
const OVERLAY_CHIP_SX = {
  position: 'absolute' as const,
  height: 20,
  fontSize: '0.6875rem',
  '& .MuiChip-label': { px: 0.5 },
};

/** Bottom offset for the gallery chip when the quantity chip sits below it.
 *  Tracks OVERLAY_CHIP_SX.height + the 6px gutter + 4px breathing room. */
const STACKED_CHIP_BOTTOM = 30;

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
  // Una petición compartida por toda la página (caché a nivel de módulo), y
  // la grilla está virtualizada, así que sólo las tarjetas visibles la piden.
  const { resaleIndex } = useResaleOffers();
  const resale = resaleIndex.get(item.item);
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
  // Shares `buildSpecLine`'s rule. This branch previously checked only
  // `typeof peso === 'number'`, with no `> 0`, so every joya and unweighed
  // piece in the default catalog rendered "Gema · 0.00 ct".
  const caratOrMetal = formatWeightLabel(item, {
    jewelryPrefers: 'metal-only',
  });
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
          // 11px floor (qeType.spec / iosTypographyScale.caption2). Was
          // 0.62rem = 9.92px.
          fontSize: '0.6875rem',
          // Pinned: neither line set a lineHeight, so raising the font grew
          // the line box while VirtualGrid's `contentHeight` stays fixed.
          // The footer is flex-shrink:0 against a flex:1 image well, so that
          // growth is paid for by the photograph (VirtualGrid.tsx:390-394).
          lineHeight: 1.4,
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
        // 11px floor, up from 0.575rem = 9.2px — the smallest real text on
        // the card. `textTransform: uppercase` is deliberately dropped rather
        // than kept: caps cost ~12% width, which is roughly what the larger
        // size needs back, so the longest grade ("C. SuperFina") still sits
        // beside an 8-digit price without ellipsising. Sentence case is the
        // trade that pays for legibility here.
        fontSize: '0.6875rem',
        lineHeight: 1.4,
        fontWeight: 500,
        letterSpacing: '0.05em',
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
  // La misma esquina lleva los dos sellos: promoción y procedencia. Se
  // renderiza si hay CUALQUIERA de los dos, no sólo promoción.
  const precioEspecialOverlay = item.precioEspecial || resale ? (
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
      <ResaleBadge
        resale={resale}
        compact
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
          icon={<Images size={12} />}
          label={item.galleryCount}
          size="small"
          sx={{
            ...OVERLAY_CHIP_SX,
            bottom: item.cantidad > 1 ? STACKED_CHIP_BOTTOM : 6,
            right: 6,
            bgcolor: 'rgba(0,0,0,0.62)',
            color: 'white',
            fontWeight: 600,
            '& .MuiChip-icon': { color: 'rgba(255,255,255,0.8)', ml: 0.5 },
          }}
        />
      )}

      {/* Quantity / lote badge — bottom right */}
      {(item.isLote || item.cantidad > 1) && (
        <Chip
          label={item.isLote ? `Lote · ${item.cantidad}` : `×${item.cantidad}`}
          title={
            item.isLote
              ? `Lote · ${item.cantidad} ${item.cantidad === 1 ? 'pieza' : 'piezas'}`
              : `${item.cantidad} piezas`
          }
          aria-label={
            item.isLote
              ? `Lote de ${item.cantidad} ${item.cantidad === 1 ? 'pieza' : 'piezas'}`
              : `${item.cantidad} piezas`
          }
          size="small"
          sx={{
            ...OVERLAY_CHIP_SX,
            bottom: 6,
            right: 6,
            fontWeight: 600,
            bgcolor: 'rgba(0,0,0,0.55)',
            color: item.isLote ? qe.accentPure : 'white',
          }}
        />
      )}

      {/* View count badge — top left (Admin only) */}
      {isAdmin && viewCount !== undefined && viewCount > 0 && (
        <Chip
          icon={<Eye size={12} />}
          label={
            viewCount > 999 ? `${(viewCount / 1000).toFixed(1)}k` : viewCount
          }
          size="small"
          sx={{
            ...OVERLAY_CHIP_SX,
            top: 6,
            left: 6,
            fontWeight: 500,
            bgcolor: 'rgba(0,0,0,0.52)',
            color: 'rgba(255,255,255,0.9)',
            '& .MuiChip-icon': { color: 'rgba(255,255,255,0.7)', ml: 0.5 },
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
