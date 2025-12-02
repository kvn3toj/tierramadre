/**
 * PWA Utilities
 * Detect and handle PWA-specific behaviors
 */

/**
 * Check if the app is running as an installed PWA
 */
export const isPWA = (): boolean => {
  // Check if running in standalone mode (iOS)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  // Check if added to home screen (iOS)
  const isIOSStandalone = (window.navigator as any).standalone === true;

  // Check if running as installed PWA (Android)
  const isAndroidPWA = window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches;

  return isStandalone || isIOSStandalone || isAndroidPWA;
};

/**
 * Get PWA install prompt availability
 */
export const canInstallPWA = (): boolean => {
  return !isPWA() && 'BeforeInstallPromptEvent' in window;
};

/**
 * Check if running on iOS
 */
export const isIOS = (): boolean => {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
};

/**
 * Check if running on iOS Safari
 */
export const isIOSSafari = (): boolean => {
  const ua = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const noChrome = !/CriOS|Chrome/.test(ua);

  return iOS && webkit && noChrome;
};

/**
 * Request fullscreen mode
 */
export const requestFullscreen = async (): Promise<void> => {
  const elem = document.documentElement;

  try {
    if (elem.requestFullscreen) {
      await elem.requestFullscreen();
    } else if ((elem as any).webkitRequestFullscreen) {
      await (elem as any).webkitRequestFullscreen();
    } else if ((elem as any).mozRequestFullScreen) {
      await (elem as any).mozRequestFullScreen();
    } else if ((elem as any).msRequestFullscreen) {
      await (elem as any).msRequestFullscreen();
    }
  } catch (error) {
    console.warn('Fullscreen request failed:', error);
  }
};

/**
 * Add to home screen instructions
 */
export const getInstallInstructions = (): string => {
  if (isIOSSafari()) {
    return 'Toca el botón "Compartir" y luego "Añadir a la pantalla de inicio"';
  }

  return 'Usa el menú de tu navegador para añadir esta app a tu pantalla de inicio';
};
