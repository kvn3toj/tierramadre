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

export interface ScrollToTopProps {
  /**
   * Element that actually scrolls. Defaults to the <main> shell, but in grid
   * view the cards scroll inside react-window's own container, so the
   * TreasureBrowser passes that element here. When null, falls back to <main>.
   */
  scrollContainer?: HTMLElement | null;
}

export default function ScrollToTop({ scrollContainer }: ScrollToTopProps = {}) {
  const [visible, setVisible] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const getY = () =>
      scrollContainer ? scrollContainer.scrollTop : getMainScrollY();
    const handleScroll = () => {
      setVisible(getY() > SCROLL_THRESHOLD);
    };
    handleScroll(); // sync initial visibility when the container changes
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
    return addMainScrollListener(handleScroll, { passive: true });
  }, [scrollContainer]);

  const handleClick = useCallback(() => {
    const opts: ScrollToOptions = {
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    };
    if (scrollContainer) {
      scrollContainer.scrollTo(opts);
    } else {
      scrollMainTo(opts);
    }
  }, [prefersReducedMotion, scrollContainer]);

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
