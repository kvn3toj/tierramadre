/**
 * CurrencyContext - COP/USD currency mode toggle
 *
 * - Gated to admins + whitelisted emails
 * - COP conversion: precioCOP * multiplier
 * - USD conversion: (precioCOP / TRM) * multiplier
 * - Multiplier (x1–x4 in 0.1 steps, configurable by admin, default x1) applies to both currencies
 * - Persists preference in localStorage, resets on user change
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useGoogleAuth } from './GoogleAuthContext';
import { useAuthContext } from './AuthContext';
import { useTRM } from '../hooks/useTRM';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { INVITATION_STORAGE_KEYS } from '../types/invitation';
import { formatCurrency as _fmtCurrency, formatFullCurrency as _fmtFullCurrency } from '../utils/formatting';
import { useConvexQuery, convexApi, convexReady } from '../lib/convex-safe';

type CurrencyMode = 'COP' | 'USD';
export type UsdMultiplier = number; // 1.0–4.0 in 0.1 steps
const DEFAULT_MULTIPLIER: UsdMultiplier = 1;
const MIN_MULTIPLIER = 1;
const MAX_MULTIPLIER = 4;
/** Clamp and round to nearest 0.1 */
function normalizeMultiplier(value: number): number {
  const clamped = Math.min(MAX_MULTIPLIER, Math.max(MIN_MULTIPLIER, value));
  return Math.round(clamped * 10) / 10;
}

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
  const { accessLevel, isAuthenticated } = useAuthContext();
  const { trmRate, isLoading: isTrmLoading } = useTRM();

  const userEmail = user?.email?.toLowerCase() ?? '';
  const isGuest = accessLevel === 'guest';
  const isStaff = accessLevel === 'admin' || accessLevel === 'embajador' || accessLevel === 'asesor';
  const canToggleCurrency = !isGuest && (isStaff || AUTHORIZED_EMAILS.includes(userEmail));

  const [currency, setCurrency] = useState<CurrencyMode>(() => {
    try {
      // Guests get currency from sessionStorage (set by InvitationPage)
      if (isGuest) {
        const guestCurrency = sessionStorage.getItem(INVITATION_STORAGE_KEYS.GUEST_CURRENCY_MODE);
        if (guestCurrency === 'USD') return 'USD';
        // Don't fall through to localStorage for guests — avoid stale asesor values
        return 'COP';
      }
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENCY_MODE);
      return saved === 'USD' ? 'USD' : 'COP';
    } catch {
      return 'COP';
    }
  });

  const [multiplier, setMultiplierState] = useState<UsdMultiplier>(() => {
    try {
      // Guests get multiplier from sessionStorage (set by InvitationPage)
      if (isGuest) {
        const guestMult = sessionStorage.getItem(INVITATION_STORAGE_KEYS.GUEST_MULTIPLIER);
        const guestParsed = guestMult ? Number(guestMult) : NaN;
        if (!isNaN(guestParsed) && guestParsed >= MIN_MULTIPLIER && guestParsed <= MAX_MULTIPLIER) return normalizeMultiplier(guestParsed);
        // Don't fall through to localStorage for guests — avoid stale asesor values
        return DEFAULT_MULTIPLIER;
      }
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENCY_MULTIPLIER);
      const parsed = saved ? Number(saved) : NaN;
      return (!isNaN(parsed) && parsed >= MIN_MULTIPLIER && parsed <= MAX_MULTIPLIER) ? normalizeMultiplier(parsed) : DEFAULT_MULTIPLIER;
    } catch {
      return DEFAULT_MULTIPLIER;
    }
  });

  const setMultiplier = useCallback((value: UsdMultiplier) => {
    setMultiplierState(value);
    // Only persist to localStorage for non-guest users (guests use ephemeral sessionStorage)
    if (!isGuest) {
      try {
        localStorage.setItem(STORAGE_KEYS.CURRENCY_MULTIPLIER, String(value));
      } catch {
        // Ignore
      }
    }
  }, [isGuest]);

  // Sync guest currency/multiplier from sessionStorage when guest access is granted.
  // Depends on isAuthenticated because accessLevel defaults to 'guest' (so isGuest
  // is true before login), but sessionStorage is only populated after loginAsGuest().
  useEffect(() => {
    if (!isGuest || !isAuthenticated) return;
    try {
      const guestCurrency = sessionStorage.getItem(INVITATION_STORAGE_KEYS.GUEST_CURRENCY_MODE);
      if (guestCurrency === 'USD') setCurrency('USD');
      const guestMult = sessionStorage.getItem(INVITATION_STORAGE_KEYS.GUEST_MULTIPLIER);
      const parsed = guestMult ? Number(guestMult) : NaN;
      if (!isNaN(parsed) && parsed >= MIN_MULTIPLIER && parsed <= MAX_MULTIPLIER) {
        setMultiplierState(normalizeMultiplier(parsed));
      }
    } catch {
      // Ignore
    }
  }, [isGuest, isAuthenticated]);

  // ─── Live sync: Convex subscription for guest multiplier ─────────
  // When the asesor changes guestMultiplier via updateMultiplier mutation,
  // this subscription updates the guest's CurrencyContext in <2s without page reload.
  const guestShortCode = isGuest
    ? (() => {
        try {
          return sessionStorage.getItem(INVITATION_STORAGE_KEYS.TOKEN);
        } catch {
          return null;
        }
      })()
    : null;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const liveInvitation = convexReady && useConvexQuery
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useConvexQuery(convexApi.invitations.getByShortCode, guestShortCode ? { shortCode: guestShortCode } : 'skip')
    : undefined;

  useEffect(() => {
    if (!isGuest || !liveInvitation) return;
    const liveDoc = liveInvitation as Record<string, unknown>;

    // Sync multiplier
    const rawMult = liveDoc.guestMultiplier;
    if (rawMult != null) {
      const liveMult = Number(rawMult);
      if (Number.isFinite(liveMult)) {
        const normalized = normalizeMultiplier(liveMult);
        if (normalized !== multiplier) {
          setMultiplierState(normalized);
          try {
            sessionStorage.setItem(INVITATION_STORAGE_KEYS.GUEST_MULTIPLIER, String(normalized));
          } catch { /* ignore */ }
        }
      }
    }

    // Sync currency mode
    const liveCurrency = liveDoc.guestCurrencyMode as string | null | undefined;
    if (liveCurrency === 'USD' && currency !== 'USD') {
      setCurrency('USD');
      try {
        sessionStorage.setItem(INVITATION_STORAGE_KEYS.GUEST_CURRENCY_MODE, 'USD');
      } catch { /* ignore */ }
    } else if (liveCurrency === 'COP' && currency !== 'COP') {
      setCurrency('COP');
      try {
        sessionStorage.setItem(INVITATION_STORAGE_KEYS.GUEST_CURRENCY_MODE, 'COP');
      } catch { /* ignore */ }
    }
  }, [isGuest, liveInvitation, multiplier, currency]);

  // Reset to COP if user changes and is not authorized (guests keep asesor-assigned currency)
  useEffect(() => {
    if (!isGuest && !canToggleCurrency && currency !== 'COP') {
      setCurrency('COP');
    }
  }, [isGuest, canToggleCurrency, currency]);

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
      if (!precioCOP) return precioCOP;
      if (currency === 'COP') return Math.round(precioCOP * multiplier);
      return Math.round((precioCOP / trmRate) * multiplier);
    },
    [currency, trmRate, multiplier],
  );

  const value = useMemo(() => ({
    currency,
    toggleCurrency,
    canToggleCurrency,
    convertPrice,
    trmRate,
    isTrmLoading,
    multiplier,
    setMultiplier,
  }), [currency, toggleCurrency, canToggleCurrency, convertPrice, trmRate, isTrmLoading, multiplier, setMultiplier]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};
