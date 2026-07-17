/**
 * HeroGrid — adaptive image collage for the ProductCard hero band.
 *
 * Distributes N images across the same fixed hero space using CSS grid:
 *   1 → full · 2 → 1×2 · 3 → 3-up · 4 → 2×2 · 5 → 3+2 · 6 → 2×3.
 * Beyond 6, the first 6 fill a 2×3 grid and the last tile shows a "+N" overlay.
 * The last tile of an underfilled row stretches to fill the remaining columns,
 * so the band never shows gaps.
 */

import React from 'react';
import { Box } from '@mui/material';
import { Gem, ShoppingBag } from 'lucide-react';
import { qeTokens } from '../../../design-system';
import { quotationStyles } from '../constants';

export interface HeroGridProps {
  images: string[];
  /** Fallback icon style when there are no images. */
  isJewelry?: boolean;
}

/** Columns chosen per image count (rows = ceil(count / cols)). */
const colsFor = (n: number): number => {
  if (n <= 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  if (n === 4) return 2;
  return 3; // 5, 6, and 6+ (capped)
};

const MAX_TILES = 6;

export const HeroGrid: React.FC<HeroGridProps> = ({ images, isJewelry }) => {
  const valid = images.filter(Boolean);

  if (valid.length === 0) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: isJewelry ? '#F2F2F2' : quotationStyles.accentTint,
        }}
      >
        {isJewelry ? (
          <ShoppingBag size={160} color={qeTokens.light.subtle} />
        ) : (
          <Gem size={160} color={qeTokens.light.accent} />
        )}
      </Box>
    );
  }

  if (valid.length === 1) {
    return (
      <Box
        component="img"
        src={valid[0]}
        alt="Producto"
        crossOrigin="anonymous"
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
    );
  }

  const tiles = valid.slice(0, MAX_TILES);
  const overflow = valid.length - tiles.length;
  const cols = colsFor(tiles.length);
  const rows = Math.ceil(tiles.length / cols);
  const remainder = tiles.length % cols; // items in the last (partial) row

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap: '4px',
        bgcolor: quotationStyles.surface,
      }}
    >
      {tiles.map((src, i) => {
        const isLast = i === tiles.length - 1;
        // Stretch the final tile to fill leftover columns in an underfilled row.
        const span = isLast && remainder !== 0 ? cols - remainder + 1 : 1;
        return (
          <Box
            key={`${src}-${i}`}
            sx={{
              position: 'relative',
              overflow: 'hidden',
              gridColumn: span > 1 ? `span ${span}` : undefined,
            }}
          >
            <Box
              component="img"
              src={src}
              alt={`Producto ${i + 1}`}
              crossOrigin="anonymous"
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
            {isLast && overflow > 0 && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(0,0,0,0.5)',
                  color: '#fff',
                  fontSize: '64px',
                  fontWeight: 600,
                }}
              >
                +{overflow}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default HeroGrid;
