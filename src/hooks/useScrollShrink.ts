/**
 * useScrollShrink Hook
 *
 * Implements iOS 26 dynamic tab bar behavior.
 * Tab bar shrinks when scrolling down, expands when scrolling up.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { tabBarConfig } from '../design-system/tokens/liquid-glass';

// =============================================================================
// TYPES
// =============================================================================

export interface UseScrollShrinkOptions {
  /** Scroll distance before triggering shrink (default: 50) */
  threshold?: number;
  /** Height when expanded (default: 65) */
  expandedHeight?: number;
  /** Height when collapsed (default: 50) */
  collapsedHeight?: number;
  /** Minimum height (ultra compact) (default: 40) */
  miniHeight?: number;
  /** Enable mini mode for long scrolls */
  enableMiniMode?: boolean;
  /** Threshold for mini mode (default: 200) */
  miniThreshold?: number;
  /** Disable the effect */
  disabled?: boolean;
  /** Custom scroll container (default: window) */
  scrollContainer?: HTMLElement | null;
}

export interface UseScrollShrinkReturn {
  /** Whether tab bar is collapsed */
  isCollapsed: boolean;
  /** Whether in mini mode */
  isMini: boolean;
  /** Current height value */
  height: number;
  /** Current icon size */
  iconSize: number;
  /** Current label opacity */
  labelOpacity: number;
  /** Scroll direction */
  scrollDirection: 'up' | 'down' | 'none';
  /** Current scroll position */
  scrollY: number;
  /** Manual expand */
  expand: () => void;
  /** Manual collapse */
  collapse: () => void;
  /** Reset to default */
  reset: () => void;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export const useScrollShrink = (options: UseScrollShrinkOptions = {}): UseScrollShrinkReturn => {
  const {
    threshold = tabBarConfig.scrollThreshold,
    expandedHeight = tabBarConfig.height.expanded,
    collapsedHeight = tabBarConfig.height.collapsed,
    miniHeight = tabBarConfig.height.mini,
    enableMiniMode = false,
    miniThreshold = 200,
    disabled = false,
    scrollContainer = null,
  } = options;

  // State
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMini, setIsMini] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | 'none'>('none');
  const [scrollY, setScrollY] = useState(0);

  // Refs for scroll tracking
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  // Get scroll position (fallback to main-content scroll container)
  const getScrollY = useCallback(() => {
    if (scrollContainer) {
      return scrollContainer.scrollTop;
    }
    const main = document.getElementById('main-content');
    if (main) return main.scrollTop;
    return window.scrollY || document.documentElement.scrollTop;
  }, [scrollContainer]);

  // Handle scroll
  const handleScroll = useCallback(() => {
    if (disabled) return;

    if (!ticking.current) {
      window.requestAnimationFrame(() => {
        const currentY = getScrollY();
        const delta = currentY - lastScrollY.current;

        // Update scroll position
        setScrollY(currentY);

        // Determine direction
        if (delta > 0) {
          setScrollDirection('down');
        } else if (delta < 0) {
          setScrollDirection('up');
        }

        // Shrink/expand logic
        if (delta > 0 && currentY > threshold) {
          // Scrolling down past threshold - collapse
          setIsCollapsed(true);

          // Mini mode for very long scrolls
          if (enableMiniMode && currentY > miniThreshold) {
            setIsMini(true);
          }
        } else if (delta < 0) {
          // Scrolling up - expand
          setIsMini(false);
          if (currentY <= threshold) {
            setIsCollapsed(false);
          }
        }

        // At top of page - always expand
        if (currentY <= 0) {
          setIsCollapsed(false);
          setIsMini(false);
        }

        lastScrollY.current = currentY;
        ticking.current = false;
      });

      ticking.current = true;
    }
  }, [disabled, threshold, enableMiniMode, miniThreshold, getScrollY]);

  // Set up scroll listener
  useEffect(() => {
    if (disabled) return;

    const target = scrollContainer || document.getElementById('main-content') || window;
    target.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      target.removeEventListener('scroll', handleScroll);
    };
  }, [disabled, scrollContainer, handleScroll]);

  // Manual controls
  const expand = useCallback(() => {
    setIsCollapsed(false);
    setIsMini(false);
  }, []);

  const collapse = useCallback(() => {
    setIsCollapsed(true);
  }, []);

  const reset = useCallback(() => {
    setIsCollapsed(false);
    setIsMini(false);
    setScrollDirection('none');
    lastScrollY.current = 0;
  }, []);

  // Computed values
  const height = useMemo(() => {
    if (disabled) return expandedHeight;
    if (isMini) return miniHeight;
    if (isCollapsed) return collapsedHeight;
    return expandedHeight;
  }, [disabled, isMini, isCollapsed, expandedHeight, collapsedHeight, miniHeight]);

  const iconSize = useMemo(() => {
    if (disabled) return tabBarConfig.iconSize.expanded;
    if (isMini) return tabBarConfig.iconSize.mini;
    if (isCollapsed) return tabBarConfig.iconSize.collapsed;
    return tabBarConfig.iconSize.expanded;
  }, [disabled, isMini, isCollapsed]);

  const labelOpacity = useMemo(() => {
    if (disabled) return tabBarConfig.labelOpacity.expanded;
    if (isMini) return tabBarConfig.labelOpacity.mini;
    if (isCollapsed) return tabBarConfig.labelOpacity.collapsed;
    return tabBarConfig.labelOpacity.expanded;
  }, [disabled, isMini, isCollapsed]);

  return {
    isCollapsed,
    isMini,
    height,
    iconSize,
    labelOpacity,
    scrollDirection,
    scrollY,
    expand,
    collapse,
    reset,
  };
};

// =============================================================================
// SIMPLIFIED HOOK
// =============================================================================

/**
 * Simple boolean version for basic collapse detection
 */
export const useIsScrolled = (threshold: number = 50): boolean => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const main = document.getElementById('main-content');
    const target = main || window;

    const handleScroll = () => {
      const scrollY = main ? main.scrollTop : window.scrollY;
      setIsScrolled(scrollY > threshold);
    };

    target.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial state

    return () => target.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return isScrolled;
};

export default useScrollShrink;
