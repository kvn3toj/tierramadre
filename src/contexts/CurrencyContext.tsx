/**
 * CurrencyContext - COP/USD currency mode toggle
 *
 * - Gated to admins + whitelisted emails
 * - USD conversion: (precioCOP / TRM) * multiplier (x2/x3/x4, configurable by admin, default x4)
 * - Persists preference in localStorage, resets on user change
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useGoogleAuth } from './GoogleAuthContext';
import { useAuthContext } from './AuthContext';
import { useTRM } from '../hooks/useTRM';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { formatCurrency as _fmtCurrency, formatFullCurrency as _fmtFullCurrency } from '../utils/formatting';

type CurrencyMode = 'COP' | 'USD';
export type UsdMultiplier = 2 | 3 | 4;
const DEFAULT_MULTIPLIER: UsdMultiplier = 4;

interface CurrencyContextType {
  currency: CurrencyMode;
  toggleCurrency: () => void;
  canToggleCurrency: boolean;
  convertPrice: (precioCOP: number) => number;
  trmRate: number;
  isTrmLoading: boolean;
  multiplier: UsdMultiplier;
  setMultiplier: (value: UsdMultiplier) => void;
}

const AUTHORIZED_EMAILS = [
  'diamanteforbes@gmail.com',
  'juanmanuelescobarco@gmail.com',
  'ana.pelaezc@gmail.com',
  'isalavikinga@gmail.com',
  'mitchellmorenoinvestor@gmail.com',
];

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
}

/**
 * Convenience hook: returns currency-aware formatCurrency and formatFullCurrency.
 * Drop-in replacement — consumers just swap their import source.
 */
export function useCurrencyFormat() {
  const { currency, convertPrice } = useCurrency();

  const formatCurrency = useMemo(
    () => (value: number) => _fmtCurrency(convertPrice(value), currency),
    [currency, convertPrice],
  );

  const formatFullCurrency = useMemo(
    () => (value: number) => _fmtFullCurrency(convertPrice(value), currency),
    [currency, convertPrice],
  );

  return { formatCurrency, formatFullCurrency, currency, convertPrice };
}

interface CurrencyProviderProps {
  children: ReactNode;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
  const { user } = useGoogleAuth();
  const { accessLevel } = useAuthContext();
  const { trmRate, isLoading: isTrmLoading } = useTRM();

  const userEmail = user?.email?.toLowerCase() ?? '';
  const isAdmin = accessLevel === 'admin';
  const canToggleCurrency = isAdmin || AUTHORIZED_EMAILS.includes(userEmail);

  const [currency, setCurrency] = useState<CurrencyMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENCY_MODE);
      return saved === 'USD' ? 'USD' : 'COP';
    } catch {
      return 'COP';
    }
  });

  const [multiplier, setMultiplierState] = useState<UsdMultiplier>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENCY_MULTIPLIER);
      const parsed = saved ? Number(saved) : NaN;
      return (parsed === 2 || parsed === 3 || parsed === 4) ? parsed : DEFAULT_MULTIPLIER;
    } catch {
      return DEFAULT_MULTIPLIER;
    }
  });

  const setMultiplier = useCallback((value: UsdMultiplier) => {
    setMultiplierState(value);
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENCY_MULTIPLIER, String(value));
    } catch {
      // Ignore
    }
  }, []);

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
      return Math.round((precioCOP / trmRate) * multiplier);
    },
    [currency, trmRate, multiplier],
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
        multiplier,
        setMultiplier,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};
