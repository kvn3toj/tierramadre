/**
 * useInvitation Hook
 *
 * Handles invitation link generation, validation, and guest registration.
 * Used by Embajadores/Admins to create shareable guest access links.
 *
 * NO JWT - Uses short codes and Google Sheets as source of truth.
 */

import { useState, useCallback } from 'react';
import { useGoogleAuth } from '../contexts/GoogleAuthContext';
import type {
  InvitationData,
  ValidationResult,
  GenerateInvitationOptions,
  GuestRegistration,
} from '../types/invitation';

interface UseInvitationReturn {
  generateInvitation: (options?: GenerateInvitationOptions) => Promise<InvitationData | null>;
  validateInvitation: (shortCode: string) => Promise<ValidationResult>;
  registerGuest: (registration: GuestRegistration) => Promise<boolean>;
  clearLastInvitation: () => void;
  isGenerating: boolean;
  isValidating: boolean;
  isRegistering: boolean;
  error: string | null;
  lastInvitation: InvitationData | null;
}

export const useInvitation = (): UseInvitationReturn => {
  const { user } = useGoogleAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastInvitation, setLastInvitation] = useState<InvitationData | null>(null);

  const generateInvitation = useCallback(async (
    options: GenerateInvitationOptions = {}
  ): Promise<InvitationData | null> => {
    if (!user) {
      setError('Debes iniciar sesión para generar invitaciones');
      return null;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/invitations?action=generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorEmail: user.email,
          creatorName: user.name,
          creatorRole: user.role,
          pricingMode: options.pricingMode || 'with_prices',
          guestName: options.guestName,
          guestContact: options.guestContact,
          contactType: options.contactType,
        }),
      });

      const data = await response.json();

      if (data.success && data.invitation) {
        setLastInvitation(data.invitation);
        return data.invitation;
      }

      setError(data.error || 'Error al generar invitación');
      return null;
    } catch (err) {
      console.error('Generate invitation error:', err);
      setError('Error de conexión. Intenta nuevamente.');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [user]);

  const validateInvitation = useCallback(async (shortCode: string): Promise<ValidationResult> => {
    setIsValidating(true);
    setError(null);

    try {
      const response = await fetch(`/api/invitations?action=validate&code=${encodeURIComponent(shortCode)}`);
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Invitación inválida');
      }

      return data;
    } catch (err) {
      console.error('Validate invitation error:', err);
      const errorResult: ValidationResult = {
        success: false,
        isValid: false,
        status: 'expired',
        error: 'Error de conexión. Intenta nuevamente.',
      };
      setError(errorResult.error || null);
      return errorResult;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const clearLastInvitation = useCallback(() => {
    setLastInvitation(null);
    setError(null);
  }, []);

  const registerGuest = useCallback(async (
    registration: GuestRegistration
  ): Promise<boolean> => {
    setIsRegistering(true);
    setError(null);

    try {
      const response = await fetch('/api/invitations?action=register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registration),
      });

      const data = await response.json();

      if (data.success) {
        return true;
      }

      setError(data.error || 'Error al registrar invitado');
      return false;
    } catch (err) {
      console.error('Register guest error:', err);
      setError('Error de conexión. Intenta nuevamente.');
      return false;
    } finally {
      setIsRegistering(false);
    }
  }, []);

  return {
    generateInvitation,
    validateInvitation,
    registerGuest,
    clearLastInvitation,
    isGenerating,
    isValidating,
    isRegistering,
    error,
    lastInvitation,
  };
};

export default useInvitation;
