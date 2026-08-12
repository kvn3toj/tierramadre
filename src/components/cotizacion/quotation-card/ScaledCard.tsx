/**
 * ScaledCard — responsively scales a fixed CARD_WIDTH×CARD_HEIGHT ProductCard
 * down to fit its container width. Used for on-screen previews (the generator
 * and the public online view); the PNG export renders the card at real size
 * off-screen instead (html2canvas on a transform-scaled node is unreliable).
 */

import React, { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { CARD_WIDTH, CARD_HEIGHT } from './ProductCard';

export interface ScaledCardProps {
  children: React.ReactNode;
  /** Extra styles for the outer (scaled) frame. */
  sx?: SxProps<Theme>;
}

export const ScaledCard: React.FC<ScaledCardProps> = ({ children, sx }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / CARD_WIDTH);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <Box
      ref={ref}
      sx={{
        width: '100%',
        maxWidth: CARD_WIDTH,
        mx: 'auto',
        position: 'relative',
        height: scale ? CARD_HEIGHT * scale : undefined,
        aspectRatio: scale ? undefined : `${CARD_WIDTH} / ${CARD_HEIGHT}`,
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
        ...sx,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          transformOrigin: 'top left',
          transform: scale ? `scale(${scale})` : 'scale(0)',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default ScaledCard;
