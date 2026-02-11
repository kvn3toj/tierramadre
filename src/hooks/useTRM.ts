/**
 * useTRM - Fetches the daily TRM (Tasa Representativa del Mercado) COP/USD rate
 *
 * - Synchronous localStorage cache loading (anti-blink)
 * - 12-hour cache TTL
 * - Fallback to 4200 COP/USD if API fails
 */

import { useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants/storage-keys';

const FALLBACK_RATE = 4200;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

interface TRMCache {
  rate: number;
  timestamp: number;
}

function readCache(): TRMCache | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRM_CACHE);
    if (!raw) return null;
    const parsed: TRMCache = JSON.parse(raw);
    if (parsed.rate && parsed.timestamp) return parsed;
    return null;
  } catch {
    return null;
  }
}

function writeCache(rate: number): void {
  try {
    const entry: TRMCache = { rate, timestamp: Date.now() };
    localStorage.setItem(STORAGE_KEYS.TRM_CACHE, JSON.stringify(entry));
  } catch {
    // Storage full - ignore
  }
}

function isCacheValid(cache: TRMCache): boolean {
  return Date.now() - cache.timestamp < CACHE_TTL_MS;
}

export function useTRM() {
  const [trmRate, setTrmRate] = useState<number>(() => {
    const cached = readCache();
    return cached ? cached.rate : FALLBACK_RATE;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const cached = readCache();
    return !cached || !isCacheValid(cached);
  });

  useEffect(() => {
    const cached = readCache();
    if (cached && isCacheValid(cached)) {
      setTrmRate(cached.rate);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchRate() {
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const copRate = data?.rates?.COP;
        if (copRate && typeof copRate === 'number' && !cancelled) {
          setTrmRate(copRate);
          writeCache(copRate);
        }
      } catch {
        // Keep current rate (cached or fallback)
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchRate();
    return () => { cancelled = true; };
  }, []);

  return { trmRate, isLoading };
}
