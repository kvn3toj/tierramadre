/**
 * Price Share Context - User preference for sharing/showing prices
 *
 * Default: showPrices = false (prices private by default)
 * Only staff (asesor, embajador, admin) can toggle
 * Respects: Provider role restrictions and guest invitation modes
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useIsGuest } from '../hooks/useAuth';
import { useIsProvider } from '../hooks/usePermissions';
import { INVITATION_STORAGE_KEYS } from '../types/invitation';

interface PriceShareContextType {
  /** User preference to share/show prices */
  showPrices: boolean;
  /** Toggle function */
  togglePriceShare: () => void;
  /** Set explicit value */
  setPriceShare: (show: boolean) => void;
  /** True if user can toggle (staff only) */
  canToggle: boolean;
  /** True if prices should be shown (respects all restrictions) */
  shouldShowPrices: boolean;
}

const STORAGE_KEY = 'tierra-madre-share-prices';

const PriceShareContext = createContext<PriceShareContextType | undefined>(undefined);

export const usePriceShare = () => {
  const context = useContext(PriceShareContext);
  if (!context) {
    throw new Error('usePriceShare must be used within PriceShareProvider');
  }
  return context;
};

interface PriceShareProviderProps {
  children: ReactNode;
}

export const PriceShareProvider: React.FC<PriceShareProviderProps> = ({ children }) => {
  const isProvider = useIsProvider();
  const isGuest = useIsGuest();

  // Default: showPrices = false (prices private by default)
  const [showPrices, setShowPrices] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    // If no saved preference, default to false (prices private)
    return saved === 'true';
  });

  // Persist preference to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(showPrices));
  }, [showPrices]);

  // Check if guest was invited with 'no_prices' mode
  const guestHasNoPricesMode =
    isGuest && sessionStorage.getItem(INVITATION_STORAGE_KEYS.PRICING_MODE) === 'no_prices';

  // Check if guest was invited with 'with_prices' mode
  const guestHasPricesMode =
    isGuest && sessionStorage.getItem(INVITATION_STORAGE_KEYS.PRICING_MODE) === 'with_prices';

  // Only staff can toggle (not providers, not guests)
  const canToggle = !isProvider && !isGuest;

  // Final decision on showing prices:
  // - Providers: NEVER show prices (business rule)
  // - Guests: follow invitation mode (no toggle for them)
  // - Staff: respect user preference (toggle)
  const shouldShowPrices = (() => {
    if (isProvider) return false;
    if (isGuest) {
      // Guests follow their invitation setting
      if (guestHasNoPricesMode) return false;
      if (guestHasPricesMode) return true;
      // Default for guests without explicit mode
      return false;
    }
    // Staff: respect user preference
    return showPrices;
  })();

  const togglePriceShare = () => {
    if (canToggle) {
      setShowPrices((prev) => !prev);
    }
  };

  const setPriceShare = (show: boolean) => {
    if (canToggle) {
      setShowPrices(show);
    }
  };

  return (
    <PriceShareContext.Provider
      value={{
        showPrices,
        togglePriceShare,
        setPriceShare,
        canToggle,
        shouldShowPrices,
      }}
    >
      {children}
    </PriceShareContext.Provider>
  );
};
