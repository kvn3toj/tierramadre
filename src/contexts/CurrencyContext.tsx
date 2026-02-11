/**
 * CurrencyContext - COP/USD currency mode toggle
 *
 * - Gated to specific user (Diamanteforbes@gmail.com)
 * - USD conversion: (precioCOP / TRM) * 4
 * - Persists preference in localStorage, resets on user change
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useGoogleAuth } from './GoogleAuthContext';
import { useTRM } from '../hooks/useTRM';
import { STORAGE_KEYS } from '../constants/storage-keys';

type CurrencyMode = 'COP' | 'USD';

interface CurrencyContextType {
  currency: CurrencyMode;
  toggleCurrency: () => void;
  canToggleCurrency: boolean;
  convertPrice: (precioCOP: number) => number;
  trmRate: number;
  isTrmLoading: boolean;
}

const AUTHORIZED_EMAIL = 'diamanteforbes@gmail.com';

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
}

interface CurrencyProviderProps {
  children: ReactNode;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
  const { user } = useGoogleAuth();
  const { trmRate, isLoading: isTrmLoading } = useTRM();

  const userEmail = user?.email?.toLowerCase() ?? '';
  const canToggleCurrency = userEmail === AUTHORIZED_EMAIL;

  const [currency, setCurrency] = useState<CurrencyMode>(() => {
    if (!canToggleCurrency) return 'COP';
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENCY_MODE);
      return saved === 'USD' ? 'USD' : 'COP';
    } catch {
      return 'COP';
    }
  });

  // Reset to COP if user changes and is not authorized
  useEffect(() => {
    if (!canToggleCurrency && currency !== 'COP') {
      setCurrency('COP');
    }
  }, [canToggleCurrency, currency]);

  // Persist preference
  useEffect(() => {
    if (canToggleCurrency) {
      try {
        localStorage.setItem(STORAGE_KEYS.CURRENCY_MODE, currency);
      } catch {
        // Ignore
      }
    }
  }, [currency, canToggleCurrency]);

  const toggleCurrency = useCallback(() => {
    if (canToggleCurrency) {
      setCurrency((prev) => (prev === 'COP' ? 'USD' : 'COP'));
    }
  }, [canToggleCurrency]);

  const convertPrice = useCallback(
    (precioCOP: number): number => {
      if (currency === 'COP' || !precioCOP) return precioCOP;
      return Math.round((precioCOP / trmRate) * 4);
    },
    [currency, trmRate],
  );

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        toggleCurrency,
        canToggleCurrency,
        convertPrice,
        trmRate,
        isTrmLoading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};
