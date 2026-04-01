import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { useScreenshotDetection } from '../hooks/useScreenshotDetection';

interface ScreenProtectionContextType {
  isProtectionActive: boolean;
  triggerProtection: () => void;
}

const ScreenProtectionContext = createContext<ScreenProtectionContextType | undefined>(undefined);

const PROTECTION_DURATION_MS = 1000; // 1 second blur duration

interface ScreenProtectionProviderProps {
  children: ReactNode;
  enabled?: boolean;
}

/**
 * Provider that manages screen protection state globally.
 * When a screenshot attempt is detected, it triggers a brief blur state
 * that can be consumed by ProtectedContent components.
 */
export function ScreenProtectionProvider({
  children,
  enabled = true,
}: ScreenProtectionProviderProps) {
  const [isProtectionActive, setIsProtectionActive] = useState(false);

  const triggerProtection = useCallback(() => {
    if (!enabled) return;

    setIsProtectionActive(true);

    // Auto-reset after duration
    setTimeout(() => {
      setIsProtectionActive(false);
    }, PROTECTION_DURATION_MS);
  }, [enabled]);

  // Use the screenshot detection hook
  useScreenshotDetection({
    onDetected: triggerProtection,
    detectPrintScreen: enabled,
    detectVisibilityChange: enabled,
    detectWindowBlur: enabled,
  });

  const value = useMemo(
    () => ({ isProtectionActive, triggerProtection }),
    [isProtectionActive, triggerProtection]
  );

  return (
    <ScreenProtectionContext.Provider value={value}>
      {children}
    </ScreenProtectionContext.Provider>
  );
}

/**
 * Hook to access screen protection state.
 * Use this in components that need to respond to protection triggers.
 */
export function useScreenProtection() {
  const context = useContext(ScreenProtectionContext);
  if (context === undefined) {
    throw new Error('useScreenProtection must be used within a ScreenProtectionProvider');
  }
  return context;
}

export default ScreenProtectionContext;
