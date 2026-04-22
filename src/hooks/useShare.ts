/**
 * useShare Hook
 * Provides Web Share API integration with clipboard fallback.
 *
 * Features:
 * - Native share dialog on supported devices (iOS Safari, Android Chrome)
 * - Clipboard fallback for desktop browsers
 * - Share product with pre-formatted text and URL
 * - Haptic feedback on successful share
 *
 * iOS HIG:
 * - Uses native share sheet for familiar UX
 * - Respects system dark mode in share UI
 */

import { useCallback, useMemo } from 'react';
import { TreasureItem } from '../types';
import { INVITATION_STORAGE_KEYS } from '../types/invitation';
import { triggerHaptic } from './useHaptics';
import { usePriceShare } from '../contexts/PriceShareContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatCurrency, formatCarats } from '../utils/formatting';
import { createLogger } from '../utils/logger';

const log = createLogger('useShare');

// Base URL for the Tierra Madre Studio app
const STUDIO_BASE_URL = 'https://tierra-madre-studio.vercel.app';

interface ShareData {
  title: string;
  text: string;
  url: string;
}

interface ShareResult {
  success: boolean;
  method: 'native' | 'clipboard' | 'failed';
  error?: Error;
}

interface UseShareOptions {
  /**
   * Enable haptic feedback on share
   * @default true
   */
  hapticFeedback?: boolean;
}

interface UseShareReturn {
  /**
   * Whether Web Share API is supported
   */
  isNativeShareSupported: boolean;

  /**
   * Share a product with native share or clipboard fallback
   */
  shareProduct: (product: TreasureItem) => Promise<ShareResult>;

  /**
   * Share custom content
   */
  share: (data: ShareData) => Promise<ShareResult>;

  /**
   * Copy text to clipboard
   */
  copyToClipboard: (text: string) => Promise<boolean>;

  /**
   * Generate shareable product URL
   */
  getProductUrl: (product: TreasureItem) => string;

  /**
   * Generate formatted share text for a product
   */
  getProductShareText: (product: TreasureItem) => string;
}

/**
 * Check if Web Share API is supported
 */
function checkShareSupport(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator;
}

/**
 * Format product details for sharing
 * Includes prices only when shouldShowPrices is true (user has share prices enabled)
 */
function formatProductShareText(product: TreasureItem, productUrl: string, includePrice: boolean, convertPrice?: (v: number) => number, currency?: 'COP' | 'USD'): string {
  const displayName = product.nombre.replace(/^L:.*?\s/, '').replace(/^L:/, '').trim();
  const weight = typeof product.peso === 'number' ? `${formatCarats(product.peso)} ct` : '';

  // Build share text with emoji for visual appeal
  // Brand identity: green heart instead of diamond for the share preview header.
  const lines = [
    `💚 ${displayName}`,
    ``,
    `✨ ${product.calidad} - ${product.color}`,
  ];

  if (weight) {
    lines.push(`⚖️ ${weight}`);
  }

  // Include price only when user has price sharing enabled
  if (includePrice && product.precioCOP) {
    const price = convertPrice ? convertPrice(product.precioCOP) : product.precioCOP;
    lines.push(`💰 ${formatCurrency(price, currency || 'COP')}`);
  }

  lines.push(``);
  lines.push(`🌿 Tierra Madre - Colombian Emeralds`);
  lines.push(``);
  lines.push(`🔗 ${productUrl}`);

  return lines.join('\n');
}

/**
 * Hook for sharing products and content
 *
 * @example
 * const { shareProduct, isNativeShareSupported } = useShare();
 *
 * const handleShare = async () => {
 *   const result = await shareProduct(product);
 *   if (result.success) {
 *     showToast('Compartido exitosamente');
 *   }
 * };
 */
export function useShare(options: UseShareOptions = {}): UseShareReturn {
  const { hapticFeedback = true } = options;
  const { shouldShowPrices } = usePriceShare();
  const { currency, convertPrice } = useCurrency();

  const isNativeShareSupported = useMemo(() => checkShareSupport(), []);

  /**
   * Generate product URL.
   * Appends ?invite={shortCode} when the current session has an active
   * invitation token so recipients can auto-validate guest access.
   */
  const getProductUrl = useCallback((product: TreasureItem): string => {
    const base = `${STUDIO_BASE_URL}/product/${product.item}`;
    const inviteToken = sessionStorage.getItem(INVITATION_STORAGE_KEYS.TOKEN);
    if (inviteToken) {
      return `${base}?invite=${encodeURIComponent(inviteToken)}`;
    }
    return base;
  }, []);

  /**
   * Generate formatted share text
   * Includes price when user has price sharing enabled
   */
  const getProductShareText = useCallback((product: TreasureItem): string => {
    const url = getProductUrl(product);
    return formatProductShareText(product, url, shouldShowPrices, convertPrice, currency);
  }, [getProductUrl, shouldShowPrices, convertPrice, currency]);

  /**
   * Copy text to clipboard
   */
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      if (hapticFeedback) {
        triggerHaptic('success');
      }
      return true;
    } catch (err) {
      log.debug('Clipboard write failed:', err);
      return false;
    }
  }, [hapticFeedback]);

  /**
   * Share custom content
   */
  const share = useCallback(async (data: ShareData): Promise<ShareResult> => {
    // Try native share first
    if (isNativeShareSupported) {
      try {
        await navigator.share({
          title: data.title,
          text: data.text,
          url: data.url,
        });

        if (hapticFeedback) {
          triggerHaptic('success');
        }

        return { success: true, method: 'native' };
      } catch (err) {
        // User cancelled or share failed
        if (err instanceof Error && err.name === 'AbortError') {
          log.debug('Share cancelled by user');
          return { success: false, method: 'native', error: err };
        }
        log.debug('Native share failed:', err);
      }
    }

    // Fallback to clipboard
    const shareText = `${data.title}\n\n${data.text}\n\n${data.url}`;
    const clipboardSuccess = await copyToClipboard(shareText);

    if (clipboardSuccess) {
      return { success: true, method: 'clipboard' };
    }

    return { success: false, method: 'failed' };
  }, [isNativeShareSupported, hapticFeedback, copyToClipboard]);

  /**
   * Share a product
   */
  const shareProduct = useCallback(async (product: TreasureItem): Promise<ShareResult> => {
    const displayName = product.nombre.replace(/^L:.*?\s/, '').replace(/^L:/, '').trim();
    const url = getProductUrl(product);
    const text = getProductShareText(product);

    return share({
      title: `${displayName} - Tierra Madre`,
      text,
      url,
    });
  }, [share, getProductUrl, getProductShareText]);

  return {
    isNativeShareSupported,
    shareProduct,
    share,
    copyToClipboard,
    getProductUrl,
    getProductShareText,
  };
}

export default useShare;
