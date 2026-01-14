/**
 * useNewProductNotification Hook
 *
 * Detects new products in treasure and shows notification.
 * Uses product IDs to accurately detect only truly new products.
 */

import { useEffect, useRef } from 'react';
import {
  checkNewProductsByIds,
  isNotificationEnabled,
} from '../services/notifications';
import { TreasureItem } from '../types';

interface UseNewProductNotificationOptions {
  /** All products loaded */
  products: TreasureItem[];
  /** Whether notifications are enabled */
  enabled?: boolean;
}

export function useNewProductNotification({
  products,
  enabled = true,
}: UseNewProductNotificationOptions) {
  const hasChecked = useRef(false);

  useEffect(() => {
    // Only check once per session
    if (hasChecked.current) return;

    // Wait for products to load
    if (products.length === 0) return;

    // Check if notifications are enabled
    if (!enabled || !isNotificationEnabled()) return;

    // Extract product IDs and check for new products
    const productIds = products.map(p => p.item);
    const newCount = checkNewProductsByIds(productIds);

    if (newCount > 0) {
      console.log(`[NewProductNotification] Found ${newCount} new products`);
    }

    hasChecked.current = true;
  }, [products, enabled]);

  return null;
}
