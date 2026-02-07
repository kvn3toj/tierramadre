/**
 * ScrollToTop Component
 * Floating action button that appears after scrolling down.
 * Baymard e-commerce UX: "back to top" on long product grids.
 */

import { useState, useEffect, useCallback } from 'react';
import { Fab, Zoom } from '@mui/material';
import { ArrowUp } from 'lucide-react';
import { emeraldCore } from '../../design-system/tokens/colors';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const SCROLL_THRESHOLD = 400;

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > SCROLL_THRESHOLD);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = useCallback(() => {
    window.scrollTo({
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
          zIndex: 1000,
          bgcolor: emeraldCore.primary,
          color: 'white',
          '&:hover': { bgcolor: emeraldCore.dark },
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        <ArrowUp size={20} />
      </Fab>
    </Zoom>
  );
}
