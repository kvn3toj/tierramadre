/**
 * useInvitation Hook
 *
 * Handles invitation link generation and validation.
 * Used by Embajadores/Admins to create shareable guest access links.
 */

import { useState, useCallback } from 'react';
import { useGoogleAuth } from '../contexts/GoogleAuthContext';

interface InvitationData {
  token: string;
  url: string;
  createdAt: string;
  createdBy: {
    email: string;
    name: string;
    role: string;
  };
}

interface ValidationResult {
  isValid: boolean;
  status: 'pending' | 'active' | 'expired';
  activatedAt?: string;
  expiresAt?: string;
  timeRemaining?: number;
  timeRemainingMinutes?: number;
  createdBy?: string;
  error?: string;
}

interface UseInvitationReturn {
  generateInvitation: () => Promise<InvitationData | null>;
  validateInvitation: (token: string) => Promise<ValidationResult>;
  isGenerating: boolean;
  isValidating: boolean;
  error: string | null;
  lastInvitation: InvitationData | null;
}

export const useInvitation = (): UseInvitationReturn => {
  const { user } = useGoogleAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastInvitation, setLastInvitation] = useState<InvitationData | null>(null);

  const generateInvitation = useCallback(async (): Promise<InvitationData | null> => {
    if (!user?.email) {
      setError('Debes iniciar sesion para crear invitaciones');
      return null;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al generar invitacion');
      }

      const invitation: InvitationData = {
        token: data.token,
        url: data.url,
        createdAt: data.createdAt,
        createdBy: data.createdBy,
      };

      setLastInvitation(invitation);
      return invitation;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [user?.email]);

  const validateInvitation = useCallback(async (token: string): Promise<ValidationResult> => {
    setIsValidating(true);
    setError(null);

    try {
      const response = await fetch(`/api/validate-invitation?token=${encodeURIComponent(token)}`);
      const data = await response.json();

      if (!data.success) {
        return {
          isValid: false,
          status: 'expired',
          error: data.error || 'Invitacion no valida',
        };
      }

      return {
        isValid: data.isValid,
        status: data.status,
        activatedAt: data.activatedAt,
        expiresAt: data.expiresAt,
        timeRemaining: data.timeRemaining,
        timeRemainingMinutes: data.timeRemainingMinutes,
        createdBy: data.createdBy,
        error: data.error,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error de conexion';
      setError(message);
      return {
        isValid: false,
        status: 'expired',
        error: message,
      };
    } finally {
      setIsValidating(false);
    }
  }, []);

  return {
    generateInvitation,
    validateInvitation,
    isGenerating,
    isValidating,
    error,
    lastInvitation,
  };
};

export default useInvitation;
