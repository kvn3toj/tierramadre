/**
 * usePWAUpdate Hook
 *
 * Checks for app updates when the PWA comes to foreground.
 * Shows a toast notification when updates are available.
 */

import { useState, useEffect, useCallback } from 'react';
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

  const checkNow = useCallback(async () => {
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
    // Only check in PWA mode
    if (!isPWA()) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // Small delay to ensure network is ready
        setTimeout(async () => {
          await checkNow();
        }, 1000);
      }
    };

    // Check on mount
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
