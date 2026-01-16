/**
 * usePWAUpdate Hook
 *
 * Checks for app updates when the PWA comes to foreground.
 * Shows a toast notification when updates are available.
 *
 * IMPORTANT: This hook is ONLY active for installed PWA users.
 * Browser users will never see the update toast.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { isPWA, checkForUpdates } from '../utils/pwa';

interface UsePWAUpdateReturn {
  updateAvailable: boolean;
  showToast: boolean;
  dismissToast: () => void;
  checkNow: () => Promise<void>;
}

export function usePWAUpdate(): UsePWAUpdateReturn {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Cache PWA status on mount to avoid re-checking
  const isPWARef = useRef<boolean | null>(null);

  // Determine PWA status once on mount
  useEffect(() => {
    isPWARef.current = isPWA();
  }, []);

  const checkNow = useCallback(async () => {
    // Double-check we're in PWA mode before checking for updates
    if (isPWARef.current !== true) return;

    const hasUpdate = await checkForUpdates();
    setUpdateAvailable(hasUpdate);
    if (hasUpdate && !dismissed) {
      setShowToast(true);
    }
  }, [dismissed]);

  const dismissToast = useCallback(() => {
    setShowToast(false);
    setDismissed(true);
  }, []);

  // Check for updates on visibility change (when PWA comes to foreground)
  useEffect(() => {
    // Only check in PWA mode - exit early for browser users
    if (!isPWA()) {
      isPWARef.current = false;
      return;
    }

    isPWARef.current = true;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isPWARef.current) {
        // Small delay to ensure network is ready
        setTimeout(async () => {
          await checkNow();
        }, 1000);
      }
    };

    // Check on mount (only for PWA)
    checkNow();

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkNow]);

  return {
    updateAvailable,
    showToast,
    dismissToast,
    checkNow,
  };
}

export default usePWAUpdate;
