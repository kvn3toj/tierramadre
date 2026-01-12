/**
 * useInvitation Hook
 *
 * Handles invitation link generation, validation, and guest registration.
 * Used by Embajadores/Admins to create shareable guest access links.
 *
 * NO JWT - Uses short codes and Google Sheets as source of truth.
 */

import { useState, useCallback } from 'react';
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
  isGenerating: boolean;
  isValidating: boolean;
  isRegistering: boolean;
  error: string | null;
  lastInvitation: InvitationData | null;
}

export const useInvitation = (): UseInvitationReturn => {
  // State kept for interface compatibility even though API is disabled
  const [error, setError] = useState<string | null>(null);
  const [lastInvitation] = useState<InvitationData | null>(null);

  const generateInvitation = useCallback(async (
    _options: GenerateInvitationOptions = {}
  ): Promise<InvitationData | null> => {
    // API endpoint temporarily disabled to stay within Vercel Hobby limit
    setError('Sistema de invitaciones temporalmente deshabilitado');
    return null;
  }, []);

  const validateInvitation = useCallback(async (_shortCode: string): Promise<ValidationResult> => {
    // API endpoint temporarily disabled to stay within Vercel Hobby limit
    return {
      success: false,
      isValid: false,
      status: 'expired',
      error: 'Sistema de invitaciones temporalmente deshabilitado',
    };
  }, []);

  const registerGuest = useCallback(async (
    _registration: GuestRegistration
  ): Promise<boolean> => {
    // API endpoint temporarily disabled to stay within Vercel Hobby limit
    setError('Sistema de invitaciones temporalmente deshabilitado');
    return false;
  }, []);

  return {
    generateInvitation,
    validateInvitation,
    registerGuest,
    isGenerating: false,
    isValidating: false,
    isRegistering: false,
    error,
    lastInvitation,
  };
};

export default useInvitation;
