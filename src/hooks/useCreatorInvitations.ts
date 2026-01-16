/**
 * useCreatorInvitations Hook
 *
 * Fetches invitations created by the current user (creator).
 * Used to validate client names in cotizacion against invited guests.
 */

import { useState, useEffect, useCallback } from 'react';
import type { CreatorInvitation, ListByCreatorResponse } from '../types/creatorInvitations';

interface UseCreatorInvitationsReturn {
  invitations: CreatorInvitation[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isInvitedGuest: (name: string) => boolean;
  findInvitationByName: (name: string) => CreatorInvitation | undefined;
}

export function useCreatorInvitations(
  creatorEmail: string | null | undefined
): UseCreatorInvitationsReturn {
  const [invitations, setInvitations] = useState<CreatorInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    if (!creatorEmail) {
      setInvitations([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/invitations?action=list-by-creator&creatorEmail=${encodeURIComponent(creatorEmail)}`
      );
      const data: ListByCreatorResponse = await response.json();

      if (data.success) {
        setInvitations(data.invitations);
      } else {
        setError(data.error || 'Error al cargar invitaciones');
        setInvitations([]);
      }
    } catch (err) {
      console.error('Error fetching creator invitations:', err);
      setError('Error de conexion');
      setInvitations([]);
    } finally {
      setIsLoading(false);
    }
  }, [creatorEmail]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const isInvitedGuest = useCallback(
    (name: string): boolean => {
      if (!name || name.length < 2) return false;
      const normalizedName = name.toLowerCase().trim();
      return invitations.some(
        (inv) => inv.guestName?.toLowerCase().trim() === normalizedName
      );
    },
    [invitations]
  );

  const findInvitationByName = useCallback(
    (name: string): CreatorInvitation | undefined => {
      if (!name || name.length < 2) return undefined;
      const normalizedName = name.toLowerCase().trim();
      return invitations.find(
        (inv) => inv.guestName?.toLowerCase().trim() === normalizedName
      );
    },
    [invitations]
  );

  return {
    invitations,
    isLoading,
    error,
    refresh: fetchInvitations,
    isInvitedGuest,
    findInvitationByName,
  };
}

export default useCreatorInvitations;
