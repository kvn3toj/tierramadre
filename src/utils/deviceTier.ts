/**
 * Device Tier Detection Utility
 *
 * Detects device capabilities to adjust Liquid Glass effects
 * for optimal performance across different hardware.
 */

import type { DeviceTier } from "../design-system/tokens/liquid-glass";

// =============================================================================
// TYPES
// =============================================================================

export interface DeviceCapabilities {
  /** Number of logical CPU cores */
  cores: number;
  /** Device memory in GB (if available) */
  memory: number | null;
  /** Supports high refresh rate displays */
  hasProMotion: boolean;
  /** User prefers reduced motion */
  prefersReducedMotion: boolean;
  /** GPU renderer info (if available) */
  gpuRenderer: string | null;
  /** Is touch device */
  isTouchDevice: boolean;
  /** Supports backdrop-filter */
  supportsBackdropFilter: boolean;
}

export interface TierConfig {
  blur: boolean;
  specular: boolean;
  refraction: boolean;
  floatingLayers: boolean;
  dynamicTabBar: boolean;
  animations: boolean;
}

// =============================================================================
// TIER CONFIGURATIONS
// =============================================================================

export const tierConfigs: Record<DeviceTier, TierConfig> = {
  high: {
    blur: true,
    specular: true,
    refraction: false, // Disabled even on high tier
    floatingLayers: true,
    dynamicTabBar: false, // Tab bar always visible
    animations: true,
  },
  medium: {
    blur: true,
    specular: false, // Disabled for medium tier
    refraction: false,
    floatingLayers: false, // Disabled for medium tier
    dynamicTabBar: false,
    animations: true,
  },
  low: {
    blur: false,
    specular: false,
    refraction: false,
    floatingLayers: false,
    dynamicTabBar: false,
    animations: false,
  },
};

// =============================================================================
// DETECTION FUNCTIONS
// =============================================================================

/**
 * Get device capabilities
 */
export const getDeviceCapabilities = (): DeviceCapabilities => {
  // CPU cores
  const cores = navigator.hardwareConcurrency || 4;

  // Device memory (Chrome only)
  const memory =
    (navigator as unknown as { deviceMemory?: number }).deviceMemory || null;

  // High refresh rate detection (approximate)
  const hasProMotion =
    window.matchMedia("(min-resolution: 120dpi)").matches ||
    window.matchMedia("(prefers-color-scheme)").matches; // Proxy for modern device

  // Reduced motion preference
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  // GPU info (WebGL)
  let gpuRenderer: string | null = null;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (gl) {
      const debugInfo = (gl as WebGLRenderingContext).getExtension(
        "WEBGL_debug_renderer_info",
      );
      if (debugInfo) {
        gpuRenderer = (gl as WebGLRenderingContext).getParameter(
          debugInfo.UNMASKED_RENDERER_WEBGL,
        );
      }
    }
  } catch {
    // WebGL not available
  }

  // Touch device
  const isTouchDevice =
    "ontouchstart" in window || navigator.maxTouchPoints > 0;

  // Backdrop filter support
  const supportsBackdropFilter =
    CSS.supports("backdrop-filter", "blur(10px)") ||
    CSS.supports("-webkit-backdrop-filter", "blur(10px)");

  return {
    cores,
    memory,
    hasProMotion,
    prefersReducedMotion,
    gpuRenderer,
    isTouchDevice,
    supportsBackdropFilter,
  };
};

/**
 * Check if GPU is high-performance
 */
const isHighPerformanceGPU = (renderer: string | null): boolean => {
  if (!renderer) return false;

  const highPerformancePatterns = [
    /apple gpu/i,
    /apple m[1-9]/i,
    /nvidia/i,
    /radeon/i,
    /geforce/i,
    /adreno 6/i,
    /adreno 7/i,
    /mali-g7/i,
    /mali-g8/i,
  ];

  return highPerformancePatterns.some((pattern) => pattern.test(renderer));
};

/**
 * Check if GPU is low-performance
 */
const isLowPerformanceGPU = (renderer: string | null): boolean => {
  if (!renderer) return false;

  const lowPerformancePatterns = [
    /intel.*hd/i,
    /intel.*uhd/i,
    /adreno 3/i,
    /adreno 4/i,
    /mali-4/i,
    /mali-t/i,
    /powervr/i,
    /swiftshader/i,
    /llvmpipe/i,
  ];

  return lowPerformancePatterns.some((pattern) => pattern.test(renderer));
};

// =============================================================================
// MAIN DETECTION FUNCTION
// =============================================================================

/**
 * Detect device tier based on hardware capabilities
 *
 * @returns 'high' | 'medium' | 'low'
 */
export const detectDeviceTier = (): DeviceTier => {
  const capabilities = getDeviceCapabilities();

  // Always return low if user prefers reduced motion
  if (capabilities.prefersReducedMotion) {
    return "low";
  }

  // No backdrop filter support = low tier
  if (!capabilities.supportsBackdropFilter) {
    return "low";
  }

  // Score-based evaluation
  let score = 0;

  // CPU cores (max 3 points)
  if (capabilities.cores >= 8) score += 3;
  else if (capabilities.cores >= 4) score += 2;
  else if (capabilities.cores >= 2) score += 1;

  // Memory (max 2 points)
  if (capabilities.memory) {
    if (capabilities.memory >= 8) score += 2;
    else if (capabilities.memory >= 4) score += 1;
  } else {
    // Assume medium if not available
    score += 1;
  }

  // GPU (max 3 points)
  if (isHighPerformanceGPU(capabilities.gpuRenderer)) {
    score += 3;
  } else if (isLowPerformanceGPU(capabilities.gpuRenderer)) {
    score += 0;
  } else {
    score += 1; // Unknown GPU, assume medium
  }

  // ProMotion / high refresh (1 point)
  if (capabilities.hasProMotion) score += 1;

  // Determine tier
  if (score >= 7) return "high";
  if (score >= 4) return "medium";
  return "low";
};

/**
 * Get tier configuration
 */
export const getTierConfig = (tier: DeviceTier): TierConfig => {
  return tierConfigs[tier];
};

/**
 * Get tier with override support
 */
export const getEffectiveTier = (
  override: DeviceTier | "auto" = "auto",
): DeviceTier => {
  if (override !== "auto") return override;
  return detectDeviceTier();
};

// =============================================================================
// CACHED DETECTION
// =============================================================================

let cachedTier: DeviceTier | null = null;
let cachedCapabilities: DeviceCapabilities | null = null;

/**
 * Get cached device tier (computed once)
 */
export const getCachedDeviceTier = (): DeviceTier => {
  if (cachedTier === null) {
    cachedTier = detectDeviceTier();
  }
  return cachedTier;
};

/**
 * Get cached device capabilities (computed once)
 */
export const getCachedCapabilities = (): DeviceCapabilities => {
  if (cachedCapabilities === null) {
    cachedCapabilities = getDeviceCapabilities();
  }
  return cachedCapabilities;
};

/**
 * Clear cache (useful for testing or when settings change)
 */
export const clearDeviceCache = (): void => {
  cachedTier = null;
  cachedCapabilities = null;
};

// =============================================================================
// BROWSER DETECTION (for OAuth compatibility)
// =============================================================================

export interface BrowserInfo {
  /** Is Telegram in-app browser */
  isTelegram: boolean;
  /** Is any in-app browser (Instagram, Facebook, etc.) */
  isInAppBrowser: boolean;
  /** Browser name for display */
  browserName: string | null;
}

/**
 * Detect if running in Telegram or other in-app browsers
 * These browsers have issues with Google OAuth popups/redirects
 */
export const detectBrowser = (): BrowserInfo => {
  const ua = navigator.userAgent || "";

  // Telegram WebView detection
  const isTelegram =
    /TelegramBot|Telegram/i.test(ua) ||
    // Telegram iOS/Android WebView
    /Telegram/i.test(ua) ||
    // Additional Telegram detection via window object
    typeof (window as unknown as { TelegramWebviewProxy?: unknown })
      .TelegramWebviewProxy !== "undefined";

  // Other in-app browsers that have OAuth issues
  const isInstagram = /Instagram/i.test(ua);
  const isFacebook = /FBAN|FBAV|FB_IAB/i.test(ua);
  const isSnapchat = /Snapchat/i.test(ua);
  const isTwitter = /Twitter/i.test(ua);
  const isLinkedIn = /LinkedInApp/i.test(ua);
  const isLine = /Line\//i.test(ua);
  const isWeChat = /MicroMessenger/i.test(ua);
  const isTikTok = /musical_ly|BytedanceWebview|ByteLocale/i.test(ua);
  const isPinterest = /Pinterest/i.test(ua);
  const isDiscord = /DiscordBot|Discord\//i.test(ua);
  const isKakaoTalk = /KAKAOTALK/i.test(ua);
  const isWhatsApp = /WhatsApp/i.test(ua);

  // Generic Android WebView: "; wv)" UA marker. Apps embedding WebView often
  // can't complete the GIS popup → postMessage handshake.
  const isAndroidWebView = /Android/i.test(ua) && /; wv\)/i.test(ua);

  // Generic iOS WKWebView heuristic: iOS device but no Safari token
  // (real Safari includes "Safari/" while WKWebView usually doesn't).
  // Excludes Chrome/Firefox/Edge on iOS which have their own tokens.
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const hasSafari = /Safari\//i.test(ua);
  const hasIOSChromeOrFF = /CriOS|FxiOS|EdgiOS/i.test(ua);
  const isIOSWebView = isIOS && !hasSafari && !hasIOSChromeOrFF;

  const isInAppBrowser =
    isTelegram ||
    isInstagram ||
    isFacebook ||
    isSnapchat ||
    isTwitter ||
    isLinkedIn ||
    isLine ||
    isWeChat ||
    isTikTok ||
    isPinterest ||
    isDiscord ||
    isKakaoTalk ||
    isWhatsApp ||
    isAndroidWebView ||
    isIOSWebView;

  // Determine browser name for user-friendly message
  let browserName: string | null = null;
  if (isTelegram) browserName = "Telegram";
  else if (isInstagram) browserName = "Instagram";
  else if (isFacebook) browserName = "Facebook";
  else if (isSnapchat) browserName = "Snapchat";
  else if (isTwitter) browserName = "Twitter/X";
  else if (isLinkedIn) browserName = "LinkedIn";
  else if (isLine) browserName = "Line";
  else if (isWeChat) browserName = "WeChat";
  else if (isTikTok) browserName = "TikTok";
  else if (isPinterest) browserName = "Pinterest";
  else if (isDiscord) browserName = "Discord";
  else if (isKakaoTalk) browserName = "KakaoTalk";
  else if (isWhatsApp) browserName = "WhatsApp";
  else if (isAndroidWebView || isIOSWebView) browserName = "WebView";

  return {
    isTelegram,
    isInAppBrowser,
    browserName,
  };
};

// Cache browser detection (doesn't change during session)
let cachedBrowserInfo: BrowserInfo | null = null;

export const getCachedBrowserInfo = (): BrowserInfo => {
  if (cachedBrowserInfo === null) {
    cachedBrowserInfo = detectBrowser();
  }
  return cachedBrowserInfo;
};

// =============================================================================
// COMPOSITE EXPORT
// =============================================================================

export const deviceTier = {
  detect: detectDeviceTier,
  getCapabilities: getDeviceCapabilities,
  getConfig: getTierConfig,
  getEffective: getEffectiveTier,
  getCached: getCachedDeviceTier,
  getCachedCapabilities,
  clearCache: clearDeviceCache,
  configs: tierConfigs,
  // Browser detection
  detectBrowser,
  getCachedBrowserInfo,
} as const;

export default deviceTier;
