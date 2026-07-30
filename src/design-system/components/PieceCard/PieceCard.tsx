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
 * INTENDED to absorb (NOT done yet — GridCard still owns both variants
 * and imports this component): GridCard's two variants, TreasureCard.
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
  /** Caller-rendered grade/quality node shown on the value row, LEFT of the
   * price. When provided it replaces `specLine` on that row — grades are short
   * (e.g. "C. Superior", "F2") so the price never truncates the way a full
   * grade·carat·mine spec line does. `specLine` remains the fallback for
   * callers that don't split identity from grade. */
  grade?: React.ReactNode;
  /** Caller-rendered price node (e.g. PriceDisplay) — positioned, not restyled;
   * price formatting/typography stays the caller's own opinionated concern. */
  price?: React.ReactNode;
  /** Caller-rendered cut indicator (gem glyph + cut name) shown in the footer,
   * under the name — keeps the image well clean (no on-photo badge). */
  cut?: React.ReactNode;
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
  grade,
  price,
  cut,
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
          title={name}
          sx={{
            fontFamily: 'var(--tm-font-serif)',
            fontWeight: 500,
            fontSize: compact ? '1.0625rem' : '1.25rem',
            lineHeight: 1.2,
            color: 'var(--tm-text)',
            minWidth: 0,
            flex: 1,
            // ONE line, ellipsised. The old two-line reserve kept every image
            // well the same height, but it left a blank second line under every
            // short name — dead space on most cards. A single line keeps the
            // wells just as uniform (every name is exactly one line now), drops
            // the gap, and buys the piece name a larger, more editorial size.
            // The full name stays reachable via `title` and the card's aria-label.
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
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
      {/* Cut row: the gem glyph + cut name, in the footer (not on the photo). */}
      {cut && <Box sx={{ mt: compact ? '3px' : '5px' }}>{cut}</Box>}
      {/* Value row: grade (or spec) on the left, price nowrap on the right.
          When the caller supplies a `grade` node it takes the left slot — a
          short grade stamp ("C. Superior", "F2") that never truncates the
          price. Callers that don't split identity from grade fall back to the
          `specLine`, which keeps the full left column so a short spec
          ("Plata", "Oro 18k") is never truncated by the price. */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 1,
          mt: compact ? '4px' : '6px',
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1, display: 'flex', overflow: 'hidden' }}>
          {grade ?? (
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
          )}
        </Box>
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
