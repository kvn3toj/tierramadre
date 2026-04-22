import { useEffect, useState } from 'react';

export interface UseVaultReducedMotionReturn {
  /** True if the user has requested reduced motion at the OS level. */
  reducedMotion: boolean;
  /** True if continuous idle loops should run (reduced-motion off AND tab visible). */
  idleAnimationsAllowed: boolean;
}

const QUERY = '(prefers-reduced-motion: reduce)';

function readReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(QUERY).matches;
}

function readVisibility(): boolean {
  if (typeof document === 'undefined') return true;
  return document.visibilityState !== 'hidden';
}

export function useVaultReducedMotion(): UseVaultReducedMotionReturn {
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => readReducedMotion());
  const [visible, setVisible] = useState<boolean>(() => readVisibility());

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVis = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  return {
    reducedMotion,
    idleAnimationsAllowed: !reducedMotion && visible,
  };
}
