/**
 * useMyInvitations Hook
 *
 * Fetches invitations created by the current user.
 * Returns invitation list + summary metrics.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

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
  mutatingCodes: Set<string>;
  refresh: () => void;
  updateMultiplier: (shortCode: string, multiplier: number) => Promise<boolean>;
  expireInvitation: (shortCode: string) => Promise<boolean>;
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
  const [mutatingCodes, setMutatingCodes] = useState<Set<string>>(new Set());

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

  // Ref tracks current invitations for revert in optimistic mutations (avoids stale closure)
  const invitationsRef = useRef(invitations);
  invitationsRef.current = invitations;

  const updateMultiplier = useCallback(async (shortCode: string, multiplier: number): Promise<boolean> => {
    if (!creatorEmail) return false;
    setMutatingCodes(prev => new Set(prev).add(shortCode));

    const prevInvitations = invitationsRef.current;
    setInvitations(prev => prev.map(inv =>
      inv.shortCode === shortCode ? { ...inv, guestMultiplier: multiplier } : inv
    ));

    try {
      const res = await fetch('/api/invitations?action=update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortCode, creatorEmail, fields: { guestMultiplier: multiplier } }),
      });
      const data = await res.json();
      if (!data.success) {
        setInvitations(prevInvitations);
        return false;
      }
      return true;
    } catch {
      setInvitations(prevInvitations);
      return false;
    } finally {
      setMutatingCodes(prev => { const next = new Set(prev); next.delete(shortCode); return next; });
    }
  }, [creatorEmail]);

  const expireInvitation = useCallback(async (shortCode: string): Promise<boolean> => {
    if (!creatorEmail) return false;
    setMutatingCodes(prev => new Set(prev).add(shortCode));

    const prevInvitations = invitationsRef.current;
    setInvitations(prev => prev.filter(inv => inv.shortCode !== shortCode));

    try {
      const res = await fetch('/api/invitations?action=expire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortCode, creatorEmail }),
      });
      const data = await res.json();
      if (!data.success) {
        setInvitations(prevInvitations);
        return false;
      }
      return true;
    } catch {
      setInvitations(prevInvitations);
      return false;
    } finally {
      setMutatingCodes(prev => { const next = new Set(prev); next.delete(shortCode); return next; });
    }
  }, [creatorEmail]);

  return { invitations, metrics, isLoading, mutatingCodes, refresh: fetchInvitations, updateMultiplier, expireInvitation };
}
