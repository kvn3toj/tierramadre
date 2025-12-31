/**
 * useDeviceInfo Hook
 * Provides detailed device and browser detection for cross-platform testing.
 *
 * This hook detects:
 * - Device type (iOS, Android, Desktop)
 * - Browser type (Safari, Chrome, Firefox, etc.)
 * - PWA standalone mode
 * - Safe area support (notch detection)
 * - Device pixel ratio (for responsive images)
 * - Viewport dimensions
 * - Touch capability
 * - Current breakpoint (MUI compatible)
 *
 * Usage:
 * const { isIOS, isSafari, viewport, breakpoint } = useDeviceInfo();
 */

import { useState, useEffect } from 'react';

export interface DeviceInfo {
  // Platform Detection
  isIOS: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
  isMobile: boolean;
  isTablet: boolean;

  // Browser Detection
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isEdge: boolean;

  // PWA & App Mode
  isStandalone: boolean;
  isPWA: boolean;

  // Device Capabilities
  hasNotch: boolean;
  hasSafeArea: boolean;
  hasTouch: boolean;
  dpr: number;

  // Viewport Info
  viewport: {
    width: number;
    height: number;
  };

  // MUI-compatible breakpoint
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl';

  // Orientation
  isPortrait: boolean;
  isLandscape: boolean;

  // User Agent (for debugging)
  userAgent: string;
}

/**
 * Get the current MUI breakpoint based on viewport width
 */
function getBreakpoint(width: number): DeviceInfo['breakpoint'] {
  if (width < 600) return 'xs';
  if (width < 900) return 'sm';
  if (width < 1200) return 'md';
  if (width < 1536) return 'lg';
  return 'xl';
}

/**
 * Detect if device is a tablet based on screen size and user agent
 */
function detectTablet(ua: string, width: number): boolean {
  const isIPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document);
  const isAndroidTablet = /Android/.test(ua) && !/Mobile/.test(ua);
  const isSizeBasedTablet = width >= 600 && width <= 1024;

  return isIPad || isAndroidTablet || (isSizeBasedTablet && 'ontouchend' in document);
}

/**
 * Get device info from window/navigator APIs
 */
function getDeviceInfo(): DeviceInfo {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const width = typeof window !== 'undefined' ? window.innerWidth : 0;
  const height = typeof window !== 'undefined' ? window.innerHeight : 0;

  // Platform detection
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document);
  const isAndroid = /Android/.test(ua);
  const isTablet = detectTablet(ua, width);
  const isMobile = (isIOS || isAndroid) && !isTablet;
  const isDesktop = !isMobile && !isTablet;

  // Browser detection
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua) && !/Chromium/.test(ua);
  const isChrome = /Chrome/.test(ua) && !/Chromium/.test(ua) && !/Edg/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isEdge = /Edg/.test(ua);

  // PWA / Standalone mode
  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true);
  const isPWA = isStandalone;

  // Device capabilities
  const hasTouch =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const hasSafeArea =
    typeof CSS !== 'undefined' &&
    CSS.supports('padding-top: env(safe-area-inset-top)');

  // Notch detection (iPhone X and later, iPad Pro with Face ID)
  const hasNotch = hasSafeArea && isIOS && (width >= 375 || height >= 812);

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;

  // Orientation
  const isPortrait = height > width;
  const isLandscape = width > height;

  return {
    isIOS,
    isAndroid,
    isDesktop,
    isMobile,
    isTablet,
    isSafari,
    isChrome,
    isFirefox,
    isEdge,
    isStandalone,
    isPWA,
    hasNotch,
    hasSafeArea,
    hasTouch,
    dpr,
    viewport: { width, height },
    breakpoint: getBreakpoint(width),
    isPortrait,
    isLandscape,
    userAgent: ua,
  };
}

/**
 * Hook to get device information with reactive updates
 * Updates on resize and orientation change
 */
export function useDeviceInfo(): DeviceInfo {
  const [info, setInfo] = useState<DeviceInfo>(() => getDeviceInfo());

  useEffect(() => {
    const handleResize = () => {
      setInfo(getDeviceInfo());
    };

    // Listen for resize and orientation changes
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Also listen to visual viewport changes (iOS Safari)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  return info;
}

/**
 * Get static device info (non-reactive, for SSR or initial render)
 */
export function getStaticDeviceInfo(): DeviceInfo {
  return getDeviceInfo();
}

/**
 * Debug helper - returns formatted device info for logging
 */
export function formatDeviceInfo(info: DeviceInfo): string {
  return `
Device Info:
  Platform: ${info.isIOS ? 'iOS' : info.isAndroid ? 'Android' : 'Desktop'}
  Type: ${info.isMobile ? 'Mobile' : info.isTablet ? 'Tablet' : 'Desktop'}
  Browser: ${info.isSafari ? 'Safari' : info.isChrome ? 'Chrome' : info.isFirefox ? 'Firefox' : info.isEdge ? 'Edge' : 'Unknown'}
  PWA: ${info.isPWA ? 'Yes' : 'No'}
  Notch: ${info.hasNotch ? 'Yes' : 'No'}
  Touch: ${info.hasTouch ? 'Yes' : 'No'}
  DPR: ${info.dpr}x
  Viewport: ${info.viewport.width}×${info.viewport.height}
  Breakpoint: ${info.breakpoint}
  Orientation: ${info.isPortrait ? 'Portrait' : 'Landscape'}
`.trim();
}

export default useDeviceInfo;
