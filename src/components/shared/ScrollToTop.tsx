/**
 * ScrollToTop Component
 * Floating action button that appears after scrolling down.
 * Baymard e-commerce UX: "back to top" on long product grids.
 */

import { useState, useEffect, useCallback } from 'react';
import { Fab, Zoom } from '@mui/material';
import { ArrowUp } from 'lucide-react';
import { emeraldCore, zIndex, defaultShadows } from '../../design-system';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { getMainScrollY, scrollMainTo, addMainScrollListener } from '../../utils/mainScroll';

const SCROLL_THRESHOLD = 400;

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => {
      setVisible(getMainScrollY() > SCROLL_THRESHOLD);
    };
    return addMainScrollListener(handleScroll, { passive: true });
  }, []);

  const handleClick = useCallback(() => {
    scrollMainTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }, [prefersReducedMotion]);

  return (
    <Zoom in={visible} unmountOnExit>
      <Fab
        size="small"
        onClick={handleClick}
        aria-label="Volver arriba"
        sx={{
          position: 'fixed',
          bottom: 'calc(80px + env(safe-area-inset-bottom))',
          right: 16,
          zIndex: zIndex.float,
          bgcolor: emeraldCore.primary,
          color: 'white',
          '&:hover': { bgcolor: emeraldCore.dark },
          boxShadow: defaultShadows.lg,
        }}
      >
        <ArrowUp size={20} />
      </Fab>
    </Zoom>
  );
}
