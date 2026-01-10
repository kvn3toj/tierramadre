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
  PricingMode,
} from '../types/invitation';

interface UseInvitationReturn {
  generateInvitation: (options?: GenerateInvitationOptions) => Promise<InvitationData | null>;
  validateInvitation: (shortCode: string) => Promise<ValidationResult>;
  registerGuest: (registration: GuestRegistration) => Promise<boolean>;
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
        body: JSON.stringify({
          email: user.email,
          pricingMode: options.pricingMode || 'with_prices',
          guestName: options.guestName,
          guestContact: options.guestContact,
          contactType: options.contactType,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al generar invitacion');
      }

      const invitation: InvitationData = {
        token: data.shortCode, // Short code IS the token now
        url: data.url,
        shortCode: data.shortCode,
        shortUrl: data.shortUrl,
        createdAt: data.createdAt,
        durationHours: data.durationHours,
        pricingMode: data.pricingMode as PricingMode,
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

  const validateInvitation = useCallback(async (shortCode: string): Promise<ValidationResult> => {
    setIsValidating(true);
    setError(null);

    try {
      // Use 'code' param for the new Google Sheets-based validation
      const response = await fetch(`/api/validate-invitation?code=${encodeURIComponent(shortCode)}`);
      const data = await response.json();

      if (!data.success) {
        return {
          success: false,
          isValid: false,
          status: 'expired',
          error: data.error || 'Invitacion no valida',
        };
      }

      return {
        success: true,
        isValid: data.isValid,
        status: data.status,
        invitationId: data.invitationId,
        activatedAt: data.activatedAt,
        expiresAt: data.expiresAt,
        timeRemaining: data.timeRemaining,
        timeRemainingMinutes: data.timeRemainingMinutes,
        durationHours: data.durationHours,
        pricingMode: data.pricingMode as PricingMode,
        createdBy: data.createdBy,
        shortCode: data.shortCode,
        error: data.error,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error de conexion';
      setError(message);
      return {
        success: false,
        isValid: false,
        status: 'expired',
        error: message,
      };
    } finally {
      setIsValidating(false);
    }
  }, []);

  const registerGuest = useCallback(async (
    registration: GuestRegistration
  ): Promise<boolean> => {
    setIsRegistering(true);
    setError(null);

    try {
      const response = await fetch('/api/register-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registration),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al registrar invitado');
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      return false;
    } finally {
      setIsRegistering(false);
    }
  }, []);

  return {
    generateInvitation,
    validateInvitation,
    registerGuest,
    isGenerating,
    isValidating,
    isRegistering,
    error,
    lastInvitation,
  };
};

export default useInvitation;
