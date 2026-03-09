/**
 * useMyInvitations Hook
 *
 * Fetches invitations created by the current user.
 * Returns invitation list + summary metrics.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

const CACHE_KEY = 'tm-my-invitations';

export interface Invitation {
  invitationId: string;
  shortCode: string;
  guestName: string | null;
  guestContact: string | null;
  contactType: string | null;
  status: 'active' | 'pending' | 'expired';
  createdAt: string;
  activatedAt: string | null;
  expiresAt: string | null;
  pricingMode: string;
  guestCurrencyMode: string | null;
  guestMultiplier: number | null;
}

interface InvitationMetrics {
  total: number;
  active: number;
  pending: number;
}

interface UseMyInvitationsReturn {
  invitations: Invitation[];
  metrics: InvitationMetrics;
  isLoading: boolean;
  refresh: () => void;
}

export function useMyInvitations(creatorEmail: string | null | undefined): UseMyInvitationsReturn {
  const [invitations, setInvitations] = useState<Invitation[]>(() => {
    if (!creatorEmail) return [];
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchInvitations = useCallback(async () => {
    if (!creatorEmail) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/invitations?action=list-by-creator&creatorEmail=${encodeURIComponent(creatorEmail)}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (data.success && data.invitations) {
        setInvitations(data.invitations);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(data.invitations));
        } catch { /* storage full */ }
      }
    } catch {
      // Keep cached data
    } finally {
      setIsLoading(false);
    }
  }, [creatorEmail]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const metrics = useMemo<InvitationMetrics>(() => {
    const active = invitations.filter(i => i.status === 'active').length;
    const pending = invitations.filter(i => i.status === 'pending').length;
    return { total: invitations.length, active, pending };
  }, [invitations]);

  return { invitations, metrics, isLoading, refresh: fetchInvitations };
}
