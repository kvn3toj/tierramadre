/**
 * useCurrentAsesor Hook
 *
 * Centralizes "find logged-in user's asesor record" logic.
 * Matches the current Google user's email against the Asesores sheet.
 */

import { useMemo } from 'react';
import { useGoogleAuth } from '../contexts/GoogleAuthContext';
import { useAsesores, Asesor } from './useAsesores';
import { useTreasure } from './useTreasure';

interface UseCurrentAsesorReturn {
  asesor: Asesor | null;
  isLoading: boolean;
}

export function useCurrentAsesor(): UseCurrentAsesorReturn {
  const { user: googleUser } = useGoogleAuth();
  const { treasure } = useTreasure();
  const { asesores, isLoading } = useAsesores(treasure);

  const asesor = useMemo(() => {
    if (!googleUser?.email || !asesores.length) return null;
    const userEmail = googleUser.email.toLowerCase().trim();
    return asesores.find(a =>
      a.email?.toLowerCase().trim() === userEmail
    ) || null;
  }, [googleUser?.email, asesores]);

  return { asesor, isLoading };
}
