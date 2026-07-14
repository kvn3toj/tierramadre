/**
 * useMyInvitations Hook
 *
 * Fetches invitations created by the current user via Convex reactive query.
 * Mutations still go through /api/invitations for auth validation.
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { useConvexQuery, convexApi, convexReady } from '../lib/convex-safe';
import { readFreshAuthToken } from '../utils/sessionToken';

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
  expired: number;
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

function toInvitation(doc: Record<string, unknown>): Invitation {
  return {
    invitationId: String(doc.invitationId ?? ''),
    shortCode: String(doc.shortCode ?? ''),
    guestName: (doc.guestName as string) ?? null,
    guestContact: (doc.guestContact as string) ?? null,
    contactType: (doc.contactType as string) ?? null,
    status: (doc.status as Invitation['status']) ?? 'pending',
    createdAt: String(doc.createdAt ?? ''),
    activatedAt: (doc.activatedAt as string) ?? null,
    expiresAt: (doc.expiresAt as string) ?? null,
    pricingMode: String(doc.pricingMode ?? 'with_prices'),
    guestCurrencyMode: (doc.guestCurrencyMode as string) ?? null,
    guestMultiplier:
      doc.guestMultiplier != null ? Number(doc.guestMultiplier) : null,
  };
}

export function useMyInvitations(
  creatorEmail: string | null | undefined,
): UseMyInvitationsReturn {
  const [mutatingCodes, setMutatingCodes] = useState<Set<string>>(new Set());

  // Always call useQuery unconditionally to respect Rules of Hooks.
  // When Convex is not ready (no generated API or no provider), useConvexQuery is null,
  // so we fall back to a no-op memoized empty array.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const convexData =
    convexReady && useConvexQuery
      ? // eslint-disable-next-line react-hooks/rules-of-hooks
        useConvexQuery(
          convexApi.invitations.listByCreator,
          creatorEmail ? { creatorEmail } : 'skip',
        )
      : undefined;

  const invitations: Invitation[] = useMemo(() => {
    if (!Array.isArray(convexData)) return [];
    return (convexData as Record<string, unknown>[]).map(toInvitation);
  }, [convexData]);

  const isLoading = convexReady && convexData === undefined && !!creatorEmail;

  const metrics = useMemo<InvitationMetrics>(() => {
    const active = invitations.filter((i) => i.status === 'active').length;
    const pending = invitations.filter((i) => i.status === 'pending').length;
    const expired = invitations.filter((i) => i.status === 'expired').length;
    return { total: invitations.length, active, pending, expired };
  }, [invitations]);

  const invitationsRef = useRef(invitations);
  invitationsRef.current = invitations;

  const updateMultiplier = useCallback(
    async (shortCode: string, multiplier: number): Promise<boolean> => {
      if (!creatorEmail) return false;
      const idToken = readFreshAuthToken();
      if (!idToken) return false;
      setMutatingCodes((prev) => new Set(prev).add(shortCode));
      try {
        const res = await fetch('/api/invitations?action=update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shortCode,
            idToken,
            fields: { guestMultiplier: multiplier },
          }),
        });
        const data = await res.json();
        return !!data.success;
      } catch {
        return false;
      } finally {
        setMutatingCodes((prev) => {
          const next = new Set(prev);
          next.delete(shortCode);
          return next;
        });
      }
    },
    [creatorEmail],
  );

  const expireInvitation = useCallback(
    async (shortCode: string): Promise<boolean> => {
      if (!creatorEmail) return false;
      const idToken = readFreshAuthToken();
      if (!idToken) return false;
      setMutatingCodes((prev) => new Set(prev).add(shortCode));
      try {
        const res = await fetch('/api/invitations?action=expire', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shortCode, idToken }),
        });
        const data = await res.json();
        return !!data.success;
      } catch {
        return false;
      } finally {
        setMutatingCodes((prev) => {
          const next = new Set(prev);
          next.delete(shortCode);
          return next;
        });
      }
    },
    [creatorEmail],
  );

  const refresh = useCallback(() => {
    // No-op with Convex reactive queries (auto-updating)
  }, []);

  return {
    invitations,
    metrics,
    isLoading,
    mutatingCodes,
    refresh,
    updateMultiplier,
    expireInvitation,
  };
}
