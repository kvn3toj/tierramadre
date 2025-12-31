/**
 * useNewProductNotification Hook
 *
 * Detects new products in treasure and shows notification.
 * Compares current count with stored count on each load.
 */

import { useEffect, useRef } from 'react';
import {
  checkNewProducts,
  isNotificationEnabled,
} from '../services/notifications';

interface UseNewProductNotificationOptions {
  productCount: number;
  enabled?: boolean;
}

export function useNewProductNotification({
  productCount,
  enabled = true,
}: UseNewProductNotificationOptions) {
  const hasChecked = useRef(false);

  useEffect(() => {
    // Only check once per session
    if (hasChecked.current) return;

    // Wait for products to load
    if (productCount === 0) return;

    // Check if notifications are enabled
    if (!enabled || !isNotificationEnabled()) return;

    // Check for new products
    const newCount = checkNewProducts(productCount);

    if (newCount > 0) {
      console.log(`[NewProductNotification] Found ${newCount} new products`);
    }

    hasChecked.current = true;
  }, [productCount, enabled]);

  return null;
}
