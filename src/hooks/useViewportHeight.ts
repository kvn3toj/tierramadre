/**
 * useViewportHeight Hook
 * Fixes the iOS Safari 100vh bug where the address bar is not accounted for.
 *
 * The Problem:
 * On iOS Safari, 100vh includes the address bar height, causing content to be
 * hidden behind it. When the user scrolls, the address bar hides/shows,
 * causing layout shifts.
 *
 * The Solution:
 * Calculate the actual viewport height using window.innerHeight and set it
 * as a CSS custom property (--vh). Components can then use calc(var(--vh, 1vh) * 100)
 * instead of 100vh.
 *
 * Usage:
 * 1. Call useViewportHeight() once in your app root (App.tsx or Layout.tsx)
 * 2. Use CSS: height: calc(var(--vh, 1vh) * 100) instead of height: 100vh
 * 3. For partial heights: height: calc(var(--vh, 1vh) * 100 - 280px)
 *
 * @see https://css-tricks.com/the-trick-to-viewport-units-on-mobile/
 */

import { useEffect, useCallback } from 'react';

/**
 * Sets the --vh CSS custom property to the actual viewport height
 * Automatically updates on resize and orientation change
 */
export function useViewportHeight(): void {
  const setVH = useCallback(() => {
    // Calculate 1% of viewport height
    const vh = window.innerHeight * 0.01;

    // Set the CSS custom property on the document root
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }, []);

  useEffect(() => {
    // Set initial value
    setVH();

    // Update on resize (includes orientation changes)
    window.addEventListener('resize', setVH);

    // Also listen for orientation changes explicitly (iOS Safari)
    window.addEventListener('orientationchange', setVH);

    // Handle iOS Safari address bar show/hide
    // visualViewport API provides accurate viewport dimensions
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', setVH);
    }

    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', setVH);
      }
    };
  }, [setVH]);
}

/**
 * Get the current viewport height in pixels
 * Useful for components that need the actual pixel value
 */
export function getViewportHeight(): number {
  return window.innerHeight;
}

/**
 * CSS helper for using the --vh custom property
 * Returns a calc() expression that works with fallback
 *
 * @param multiplier - Percentage of viewport height (0-100)
 * @param offset - Optional pixel offset (e.g., for fixed headers)
 * @returns CSS calc() expression
 *
 * @example
 * // Full viewport height
 * vhCalc(100) // => 'calc(var(--vh, 1vh) * 100)'
 *
 * // Viewport minus 280px header
 * vhCalc(100, 280) // => 'calc(var(--vh, 1vh) * 100 - 280px)'
 */
export function vhCalc(multiplier: number, offset?: number): string {
  const base = `calc(var(--vh, 1vh) * ${multiplier})`;

  if (offset === undefined || offset === 0) {
    return base;
  }

  // Wrap in another calc for the offset
  return `calc(var(--vh, 1vh) * ${multiplier} - ${offset}px)`;
}

export default useViewportHeight;
