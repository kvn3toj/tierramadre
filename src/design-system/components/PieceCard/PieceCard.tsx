/**
 * PieceCard — the ONE catalog piece card (DS v3, Fase 3 P0).
 *
 * A well (media + overlays) topped by a serif name, mono spec/price line,
 * and item number. Composition-friendly by design: `media` and `overlays`
 * are caller-supplied (e.g. the feature layer's ProgressiveImage with its
 * anti-blinking/tiny-thumb logic, and per-catalog overlay chips like gallery
 * count or a compare button) — PieceCard owns the well/text-block chrome and
 * interaction contract, not image loading. Two variants share that anatomy:
 * `well` (bordered card) and `frameless` (well only, no outer chrome), so
 * A/B-style redesign toggles stay one canonical component parameterized by
 * a prop, never a fork.
 *
 * Absorbs: GridCard's two variants, TreasureCard.
 */
import React from 'react';
import { Box, Typography } from '@mui/material';

export type PieceCardVariant = 'frameless' | 'well';

export interface PieceCardProps {
  /** 'well' = bordered card (default); 'frameless' = well only, no outer chrome. */
  variant?: PieceCardVariant;
  /** Caller-rendered image/skeleton (e.g. ProgressiveImage). */
  media: React.ReactNode;
  /** Absolutely-positioned chrome inside the well (badges, compare button, etc.) — stacks above `media`. */
  overlays?: React.ReactNode;
  name: string;
  specLine: string;
  /** Caller-rendered price node (e.g. PriceDisplay) — positioned, not restyled;
   * price formatting/typography stays the caller's own opinionated concern. */
  price?: React.ReactNode;
  itemNumber?: string | number;
  onClick?: () => void;
  ariaLabel?: string;
  /** Mobile sizing (smaller name/spacing), matches the caller's own breakpoint. */
  compact?: boolean;
  className?: string;
  /** Passthrough for prefetch-on-hover/focus patterns — PieceCard is the sole
   * DOM root a grid measures, so hover/focus intents attach here rather than
   * on a wrapping element. */
  onMouseEnter?: () => void;
  onFocus?: () => void;
}

export const PieceCard: React.FC<PieceCardProps> = ({
  variant = 'well',
  media,
  overlays,
  name,
  specLine,
  price,
  itemNumber,
  onClick,
  ariaLabel,
  compact = false,
  className,
  onMouseEnter,
  onFocus,
}) => {
  const isWell = variant === 'well';
  const isInteractive = !!onClick;

  const textBlock = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}
    >
      {/* Identity row: name + item number. The Nº is short (~40px) so it never
          forces the name to wrap the way a full price would — the text block
          stays a constant 2 lines whether or not a price is shown, so the image
          well above never changes height. */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 1,
        }}
      >
        <Typography
          sx={{
            fontFamily: 'var(--tm-font-serif)',
            fontWeight: 500,
            fontSize: compact ? '1rem' : '1.1875rem',
            lineHeight: 1.15,
            color: 'var(--tm-text)',
            minWidth: 0,
            flex: 1,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            // Always reserve two lines of name height (line-height 1.15 × 2)
            // so a 1-line and a 2-line name leave the text block the SAME
            // height — the image well above is then identical on every card
            // and the grid rows line up. Short names just leave line 2 blank.
            minHeight: '2.3em',
          }}
        >
          {name}
        </Typography>
        {itemNumber !== undefined && (
          <Typography
            sx={{
              fontFamily: 'var(--tm-font-mono)',
              fontSize: '0.6875rem',
              color: 'var(--tm-subtle)',
              flexShrink: 0,
            }}
          >
            Nº {itemNumber}
          </Typography>
        )}
      </Box>
      {/* Detail row: spec + price. Price is nowrap on the right; the spec keeps
          the full left column, so a short spec ("Plata", "Oro 18k") is never
          truncated by the price. */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 1,
          mt: compact ? '4px' : '6px',
        }}
      >
        <Typography
          sx={{
            fontFamily: 'var(--tm-font-mono)',
            fontSize: '0.59rem',
            letterSpacing: '0.05em',
            color: 'var(--tm-subtle)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
            flex: 1,
          }}
        >
          {specLine}
        </Typography>
        {price && (
          <Box sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}>{price}</Box>
        )}
      </Box>
    </Box>
  );

  const well = (
    <Box
      sx={{
        position: 'relative',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        backgroundColor: 'var(--tm-well)',
        borderRadius: isWell ? 0 : 'var(--tm-radius-well)',
      }}
    >
      {media}
      {overlays}
    </Box>
  );

  return (
    <Box
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      onKeyDown={
        isInteractive
          ? (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      role={isInteractive ? 'article' : undefined}
      aria-label={ariaLabel}
      tabIndex={isInteractive ? 0 : undefined}
      className={className}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: isInteractive ? 'pointer' : 'default',
        outline: 'none',
        transition: 'border-color var(--tm-fast) var(--tm-ease)',
        ...(isWell
          ? {
              border: '1px solid var(--tm-border)',
              borderRadius: 'var(--tm-radius-card)',
              backgroundColor: 'var(--tm-surface)',
              overflow: 'hidden',
              ...(isInteractive && {
                '&:hover': { borderColor: 'var(--tm-accent)' },
              }),
            }
          : {}),
        '&:focus-visible': {
          outline: 'none',
          boxShadow: 'var(--tm-focus-ring)',
          borderRadius: isWell
            ? 'var(--tm-radius-card)'
            : 'var(--tm-radius-well)',
        },
      }}
    >
      {well}
      <Box
        sx={{
          flexShrink: 0,
          padding: isWell ? (compact ? '10px' : '12px') : 0,
          paddingTop: isWell
            ? compact
              ? '10px'
              : '12px'
            : compact
              ? '9px'
              : '11px',
          borderTop: isWell ? '1px solid var(--tm-hairline)' : 'none',
        }}
      >
        {textBlock}
      </Box>
    </Box>
  );
};

export default PieceCard;
