/**
 * PWA Utilities
 * Detect and handle PWA-specific behaviors
 */

// Declare the global version variable from index.html
declare global {
  interface Window {
    __TM_VERSION__?: string;
    __TM_VERSION_READY__?: boolean;
  }
}

/**
 * Check if the app is running as an installed PWA
 */
export const isPWA = (): boolean => {
  // Check if running in standalone mode (iOS)
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

  // Check if added to home screen (iOS)
  const isIOSStandalone = (window.navigator as any).standalone === true;

  // Check if running as installed PWA (Android)
  const isAndroidPWA =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches;

  return isStandalone || isIOSStandalone || isAndroidPWA;
};

/**
 * Get PWA install prompt availability
 */
export const canInstallPWA = (): boolean => {
  return !isPWA() && "BeforeInstallPromptEvent" in window;
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
    console.warn("Fullscreen request failed:", error);
  }
};

/**
 * Add to home screen instructions
 */
export const getInstallInstructions = (): string => {
  if (isIOSSafari()) {
    return 'Toca el botón "Compartir" y luego "Añadir a la pantalla de inicio"';
  }

  return "Usa el menú de tu navegador para añadir esta app a tu pantalla de inicio";
};

/**
 * Force hide address bar on iOS (especially iPad)
 * Call this on page load and scroll events
 */
export const hideIOSAddressBar = (): void => {
  if (!isIOS() || isPWA()) return;

  // Scroll trick to hide Safari address bar
  window.scrollTo(0, 1);

  // Additional trick for iPad
  setTimeout(() => {
    window.scrollTo(0, 0);
  }, 0);
};

/**
 * Initialize PWA-specific behaviors
 */
export const initPWA = (): void => {
  if (!isPWA()) return;

  // Prevent zooming on iPad
  document.addEventListener("gesturestart", (e) => {
    e.preventDefault();
  });

  // Allow the native context menu ("segundo clic" / right-click / iOS long
  // press) on editable fields so the browser's spell-check correction
  // suggestions stay reachable. Block it elsewhere to deter long-press image
  // saving. `closest()` keeps the exemption working even when the event
  // target is a node nested inside the field.
  document.addEventListener("contextmenu", (e) => {
    const target = e.target as HTMLElement | null;
    const isEditable = !!target?.closest(
      'input, textarea, [contenteditable=""], [contenteditable="true"]',
    );
    if (!isEditable) {
      e.preventDefault();
    }
  });

  // Lock viewport height for iPad
  const setVH = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
  };

  setVH();
  window.addEventListener("resize", setVH);
  window.addEventListener("orientationchange", setVH);

  // CRITICAL: Prevent links from opening in Safari
  // This keeps navigation within the PWA
  document.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");

      if (anchor && anchor.href) {
        const url = new URL(anchor.href, window.location.origin);

        // If it's an internal link (same origin)
        if (url.origin === window.location.origin) {
          // Check if it has target="_blank" or download attribute
          if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
            return; // Let it open normally
          }

          // Prevent default behavior that might trigger Safari
          // React Router will handle the navigation
        }
      }
    },
    true,
  ); // Use capture phase

  // Prevent window.open from breaking out of PWA
  const originalOpen = window.open;
  window.open = function (
    url?: string | URL,
    target?: string,
    features?: string,
  ) {
    if (typeof url === "string" && url.startsWith(window.location.origin)) {
      // Internal link - use navigation instead
      window.location.href = url;
      return null;
    }
    // External link - allow normal behavior
    return originalOpen.call(window, url, target, features);
  };
};

/**
 * Check if a new version is available
 * Compares version.json on server with current app version
 * @returns Promise<boolean> - true if update available
 *
 * IMPORTANT: Only returns true if:
 * 1. Both versions are valid strings
 * 2. Versions actually differ (not just undefined/null mismatch)
 * 3. Remote version appears to be newer (higher number suffix)
 */
export const checkForUpdates = async (): Promise<boolean> => {
  try {
    // Don't check if we don't have a current version
    const currentVersion = window.__TM_VERSION__;
    if (!currentVersion || typeof currentVersion !== "string") {
      return false;
    }

    const response = await fetch("/version.json?_t=" + Date.now(), {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();

    // Validate remote version
    if (!data.version || typeof data.version !== "string") {
      return false;
    }

    // Exact match - no update needed
    if (data.version === currentVersion) {
      return false;
    }

    // Additional validation: ensure remote version looks newer
    // Version format: YYYY.MM.DD.N (e.g., 2026.01.16.901)
    // Only show update if remote version is actually higher
    const currentParts = currentVersion.split(".").map(Number);
    const remoteParts = data.version.split(".").map(Number);

    // Compare each part: year, month, day, build number
    for (
      let i = 0;
      i < Math.max(currentParts.length, remoteParts.length);
      i++
    ) {
      const currentPart = currentParts[i] || 0;
      const remotePart = remoteParts[i] || 0;

      if (remotePart > currentPart) {
        return true; // Remote is newer
      }
      if (remotePart < currentPart) {
        return false; // Current is newer (shouldn't happen, but safeguard)
      }
    }

    // Versions are equal (shouldn't reach here due to exact match check above)
    return false;
  } catch {
    // Network error or offline - no update available
    return false;
  }
};

/**
 * Get current and remote version info
 */
export const getVersionInfo = async (): Promise<{
  current: string;
  remote: string | null;
  updateAvailable: boolean;
}> => {
  const current = window.__TM_VERSION__ || "unknown";

  try {
    const response = await fetch("/version.json?_t=" + Date.now(), {
      cache: "no-store",
    });
    const data = await response.json();

    return {
      current,
      remote: data.version || null,
      updateAvailable: data.version !== current,
    };
  } catch {
    return {
      current,
      remote: null,
      updateAvailable: false,
    };
  }
};

/**
 * Force refresh the PWA to load new version
 * Clears caches and reloads the page
 */
export const forceRefreshPWA = async (): Promise<void> => {
  // Clear any remaining caches
  if ("caches" in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    } catch {
      // Ignore cache clearing errors
    }
  }

  // Force reload bypassing cache
  window.location.replace(window.location.pathname + "?_refresh=" + Date.now());
};
