/**
 * useProductView - Track product views with session deduplication
 *
 * Fires a view event once per product per session.
 * Uses sessionStorage to prevent counting refreshes or back-navigation.
 * Includes user identity (name, email) when available.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useGoogleAuth } from '../contexts/GoogleAuthContext';

const VIEWS_STORAGE_KEY = 'tm_product_views';

/**
 * Check if this product was already viewed this session
 */
function hasViewedThisSession(itemId: number): boolean {
  try {
    const viewed = sessionStorage.getItem(VIEWS_STORAGE_KEY);
    if (!viewed) return false;
    const viewedItems: number[] = JSON.parse(viewed);
    return viewedItems.includes(itemId);
  } catch {
    return false;
  }
}

/**
 * Mark product as viewed this session
 */
function markAsViewed(itemId: number): void {
  try {
    const viewed = sessionStorage.getItem(VIEWS_STORAGE_KEY);
    const viewedItems: number[] = viewed ? JSON.parse(viewed) : [];
    if (!viewedItems.includes(itemId)) {
      viewedItems.push(itemId);
      sessionStorage.setItem(VIEWS_STORAGE_KEY, JSON.stringify(viewedItems));
    }
  } catch {
    // Silently fail if sessionStorage is not available
  }
}

interface UserInfo {
  name?: string;
  email?: string;
  accessLevel?: string;
}

/**
 * Track a product view (fire and forget)
 * NOTE: API endpoint temporarily disabled to stay within Vercel Hobby limit
 */
async function trackView(
  _itemId: number,
  _productName: string,
  _referrer: string,
  _userInfo?: UserInfo
): Promise<void> {
  // API endpoint temporarily disabled - tracking silently skipped
  // To re-enable: upgrade to Vercel Pro or restore api/track-product-view.js
}

interface UseProductViewOptions {
  itemId: number;
  productName: string;
  /** Set to false to disable tracking (e.g., for admins) */
  enabled?: boolean;
}

/**
 * Hook to track product views
 *
 * @example
 * useProductView({
 *   itemId: product.item,
 *   productName: product.nombre,
 * });
 */
export function useProductView({
  itemId,
  productName,
  enabled = true,
}: UseProductViewOptions): void {
  const location = useLocation();
  const hasTracked = useRef(false);
  const { user } = useGoogleAuth();

  useEffect(() => {
    // Skip if disabled or already tracked this render cycle
    if (!enabled || hasTracked.current) return;

    // Skip if no valid itemId
    if (!itemId || itemId <= 0) return;

    // Skip if already viewed this session
    if (hasViewedThisSession(itemId)) return;

    // Mark as tracked for this render cycle
    hasTracked.current = true;

    // Mark as viewed in session storage
    markAsViewed(itemId);

    // Determine referrer from previous location or document.referrer
    const referrer = location.state?.from || document.referrer || 'direct';
    const cleanReferrer = referrer.replace(window.location.origin, '');

    // Get user info if available
    const userInfo: UserInfo | undefined = user ? {
      name: user.name,
      email: user.email,
      accessLevel: user.accessLevel,
    } : undefined;

    // Track the view (fire and forget)
    trackView(itemId, productName, cleanReferrer || 'direct', userInfo);
  }, [itemId, productName, enabled, location.state, user]);
}

export default useProductView;
