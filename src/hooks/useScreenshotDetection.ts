import { useEffect, useCallback, useRef } from 'react';

interface ScreenshotDetectionOptions {
  onDetected?: () => void;
  detectPrintScreen?: boolean;
  detectVisibilityChange?: boolean;
  detectWindowBlur?: boolean;
}

/**
 * Hook to detect screenshot attempts via various browser events.
 *
 * Detection methods:
 * - PrintScreen key press (desktop)
 * - Visibility change (tab switch, app switch)
 * - Window blur (focus lost to another app)
 *
 * Note: These are deterrents, not foolproof protection.
 * Mobile screenshot buttons cannot be detected.
 */
export function useScreenshotDetection({
  onDetected,
  detectPrintScreen = true,
  detectVisibilityChange = true,
  detectWindowBlur = true,
}: ScreenshotDetectionOptions = {}) {
  const lastDetectionRef = useRef<number>(0);
  const DEBOUNCE_MS = 500; // Prevent multiple rapid triggers

  const handleDetection = useCallback(() => {
    const now = Date.now();
    if (now - lastDetectionRef.current < DEBOUNCE_MS) {
      return; // Debounce rapid triggers
    }
    lastDetectionRef.current = now;
    onDetected?.();
  }, [onDetected]);

  // Detect PrintScreen key
  useEffect(() => {
    if (!detectPrintScreen) return;

    const handleKeyUp = (e: KeyboardEvent) => {
      // PrintScreen key codes
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        handleDetection();

        // Attempt to clear clipboard (may not work in all browsers)
        try {
          navigator.clipboard.writeText('');
        } catch {
          // Clipboard API may not be available
        }
      }

      // Also detect common screenshot shortcuts
      // Windows: Win+Shift+S (Snipping Tool)
      // Mac: Cmd+Shift+3/4/5
      if (e.shiftKey && (e.metaKey || e.ctrlKey)) {
        if (['3', '4', '5', 's', 'S'].includes(e.key)) {
          handleDetection();
        }
      }
    };

    window.addEventListener('keyup', handleKeyUp);
    return () => window.removeEventListener('keyup', handleKeyUp);
  }, [detectPrintScreen, handleDetection]);

  // Detect visibility change (tab switch, minimize, app switch)
  useEffect(() => {
    if (!detectVisibilityChange) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleDetection();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [detectVisibilityChange, handleDetection]);

  // Detect window blur (focus lost to screenshot tool, etc.)
  useEffect(() => {
    if (!detectWindowBlur) return;

    const handleBlur = () => {
      handleDetection();
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [detectWindowBlur, handleDetection]);

  return { handleDetection };
}

export default useScreenshotDetection;
