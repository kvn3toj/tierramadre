/**
 * GoogleAuthContext
 *
 * Google Sign-In authentication for user profiles.
 * Validates users against Google Sheets Asesores list.
 * Sets access level (admin/full/guest) based on user role.
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { googleLogout } from '@react-oauth/google';
import { createLogger } from '../utils/logger';
import type { AccessLevel } from '../types/auth';
import { STORAGE_KEYS } from '../constants/storage-keys';

const log = createLogger('Auth');

// =============================================================================
// TYPES
// =============================================================================

export interface GoogleUserProfile {
  id: string;
  email: string;
  name: string;
  givenName: string;
  familyName: string;
  picture: string;
  locale?: string;
  role?: string;
  accessLevel?: AccessLevel;
}

export interface UserPreferences {
  meditationReminderEnabled?: boolean;
  meditationReminderTime?: string;
  notificationsEnabled?: boolean;
  favoriteProducts?: number[];
  savedFacts?: number[];
  lastVisit?: string;
}

interface GoogleAuthContextType {
  user: GoogleUserProfile | null;
  preferences: UserPreferences;
  isSignedIn: boolean;
  isAuthorized: boolean;
  isLoading: boolean;
  authError: string | null;
  signIn: (credential: string) => Promise<void>;
  signOut: () => void;
  clearError: () => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  syncWithSheets: () => Promise<void>;
}

// =============================================================================
// STORAGE KEYS
// =============================================================================

const GOOGLE_USER_KEY = STORAGE_KEYS.GOOGLE_USER;
const GOOGLE_PREFS_KEY = STORAGE_KEYS.GOOGLE_PREFS;
const GOOGLE_TOKEN_KEY = STORAGE_KEYS.GOOGLE_TOKEN;

// =============================================================================
// CONTEXT
// =============================================================================

const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

interface GoogleAuthProviderProps {
  children: ReactNode;
  /** Called after sign-out to trigger GSI reload */
  onSignedOut?: () => void;
}

export function GoogleAuthProvider({ children, onSignedOut }: GoogleAuthProviderProps) {
  const [user, setUser] = useState<GoogleUserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Load user from localStorage on mount and RE-VALIDATE against sheets
  useEffect(() => {
    const loadStoredUser = async () => {
      try {
        const storedUser = localStorage.getItem(GOOGLE_USER_KEY);
        const storedPrefs = localStorage.getItem(GOOGLE_PREFS_KEY);

        if (storedPrefs) {
          setPreferences(JSON.parse(storedPrefs));
        }

        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);

          // RE-VALIDATE user against sheets to ensure they're still authorized
          // This catches users who were removed from sheets after their last login
          log.debug('Re-validating stored user:', parsedUser.email);

          try {
            // Validate against both Asesores and Proveedores in one call
            const validateResponse = await fetch(`/api/validate?email=${encodeURIComponent(parsedUser.email)}&type=both`);
            const validateData = await validateResponse.json();

            if (validateData.success && validateData.isAuthorized && validateData.user) {
              // User found in Asesores - update role/accessLevel in case it changed
              parsedUser.role = validateData.user.role;
              parsedUser.accessLevel = validateData.user.accessLevel;
              setUser(parsedUser);
              setIsAuthorized(true);
              localStorage.setItem(GOOGLE_USER_KEY, JSON.stringify(parsedUser));
              log.debug('User re-validated successfully:', { email: parsedUser.email, role: parsedUser.role });
            } else if (validateData.success && validateData.isProvider && validateData.provider) {
              // User found in Proveedores
              parsedUser.role = 'Proveedor';
              parsedUser.accessLevel = 'provider';
              setUser(parsedUser);
              setIsAuthorized(true);
              localStorage.setItem(GOOGLE_USER_KEY, JSON.stringify(parsedUser));
              log.debug('Provider re-validated successfully:', parsedUser.email);
            } else {
              // User NO LONGER AUTHORIZED - force sign out silently
              log.warn('User no longer authorized - forcing sign out:', parsedUser.email);
              googleLogout();
              localStorage.removeItem(GOOGLE_USER_KEY);
              localStorage.removeItem(GOOGLE_PREFS_KEY);
              localStorage.removeItem(GOOGLE_TOKEN_KEY);
              setUser(null);
              setPreferences({});
              setIsAuthorized(false);
              onSignedOut?.();
              // No error message - just redirect to login screen
            }
          } catch (validationError) {
            // API error during re-validation - keep user logged in but mark as needing re-auth
            // This prevents locking out users due to temporary API issues
            log.error('Re-validation API error:', validationError);
            setUser(parsedUser);
            setIsAuthorized(!!parsedUser.role);
            log.warn('Could not re-validate user, keeping session (API error)');
          }
        }
      } catch (error) {
        log.error('Error loading stored user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredUser();
  }, []);

  // Decode JWT token to get user profile
  const decodeJwt = (token: string): GoogleUserProfile | null => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);

      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        givenName: payload.given_name || payload.name?.split(' ')[0] || '',
        familyName: payload.family_name || payload.name?.split(' ').slice(1).join(' ') || '',
        picture: payload.picture,
        locale: payload.locale,
      };
    } catch (error) {
      log.error('Error decoding JWT:', error);
      return null;
    }
  };

  // Sign in with Google credential
  const signIn = useCallback(async (credential: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const profile = decodeJwt(credential);
      if (!profile) {
        throw new Error('Failed to decode credential');
      }

      // Validate user email against both Asesores and Proveedores sheets
      try {
        const validateResponse = await fetch(`/api/validate?email=${encodeURIComponent(profile.email)}&type=both`);
        const validateData = await validateResponse.json();

        if (validateData.success && validateData.isAuthorized && validateData.user) {
          // User is authorized as asesor/admin
          profile.role = validateData.user.role;
          profile.accessLevel = validateData.user.accessLevel;
          setIsAuthorized(true);
          log.debug('User authorized:', { email: profile.email, role: profile.role, accessLevel: profile.accessLevel });
        } else if (validateData.success && validateData.isProvider && validateData.provider) {
          // User is authorized as provider
          profile.role = 'Proveedor';
          profile.accessLevel = 'provider';
          setIsAuthorized(true);
          log.debug('Provider authorized:', { email: profile.email, provider: validateData.provider?.name });
        } else {
          // User email not found in any authorized list - BLOCK ACCESS
          setIsAuthorized(false);
          setAuthError('Tu correo no está registrado en el sistema. Contacta al administrador.');
          log.warn('User not authorized - access blocked:', profile.email);
          setIsLoading(false);
          return; // Don't store user or continue
        }
      } catch (validateError) {
        log.error('Validation API error:', validateError);
        // API error - BLOCK ACCESS (don't allow guest fallback)
        setIsAuthorized(false);
        setAuthError('Error validando usuario. Intenta nuevamente.');
        setIsLoading(false);
        return; // Don't store user or continue
      }

      // Only reach here if user is authorized - store user and token
      setUser(profile);
      localStorage.setItem(GOOGLE_USER_KEY, JSON.stringify(profile));
      localStorage.setItem(GOOGLE_TOKEN_KEY, credential);

      // Try to load preferences from API
      try {
        const response = await fetch(`/api/user-prefs?userId=${profile.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.preferences) {
            setPreferences(data.preferences);
            localStorage.setItem(GOOGLE_PREFS_KEY, JSON.stringify(data.preferences));
          }
        }
      } catch {
        log.debug('Using local preferences');
      }

      // Update last visit
      const newPrefs = { ...preferences, lastVisit: new Date().toISOString() };
      setPreferences(newPrefs);
      localStorage.setItem(GOOGLE_PREFS_KEY, JSON.stringify(newPrefs));
    } catch (error) {
      log.error('Sign in error:', error);
      setAuthError('Error al iniciar sesión. Intenta nuevamente.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [preferences]);

  // Sign out
  const signOut = useCallback(() => {
    googleLogout();
    setUser(null);
    setPreferences({});
    setIsAuthorized(false);
    setAuthError(null);
    localStorage.removeItem(GOOGLE_USER_KEY);
    localStorage.removeItem(GOOGLE_PREFS_KEY);
    localStorage.removeItem(GOOGLE_TOKEN_KEY);
    onSignedOut?.();
  }, [onSignedOut]);

  // Clear auth error (for retry with different account)
  const clearError = useCallback(() => {
    setAuthError(null);
  }, []);

  // Update preferences
  const updatePreferences = useCallback(async (prefs: Partial<UserPreferences>) => {
    const newPrefs = { ...preferences, ...prefs };
    setPreferences(newPrefs);
    localStorage.setItem(GOOGLE_PREFS_KEY, JSON.stringify(newPrefs));

    // Sync to API if user is signed in
    if (user) {
      try {
        await fetch('/api/user-prefs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, preferences: newPrefs }),
        });
      } catch {
        log.debug('Could not sync to server, saved locally');
      }
    }
  }, [user, preferences]);

  // Force sync with server
  const syncWithSheets = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/user-prefs?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.preferences) {
          setPreferences(data.preferences);
          localStorage.setItem(GOOGLE_PREFS_KEY, JSON.stringify(data.preferences));
        }
      }
    } catch (error) {
      log.error('Sync error:', error);
    }
  }, [user]);

  const value: GoogleAuthContextType = {
    user,
    preferences,
    isSignedIn: !!user,
    isAuthorized,
    isLoading,
    authError,
    signIn,
    signOut,
    clearError,
    updatePreferences,
    syncWithSheets,
  };

  return <GoogleAuthContext.Provider value={value}>{children}</GoogleAuthContext.Provider>;
}

// =============================================================================
// HOOK
// =============================================================================

// Default stub when Google OAuth is not configured
const defaultContext: GoogleAuthContextType = {
  user: null,
  preferences: {},
  isSignedIn: false,
  isAuthorized: false,
  isLoading: false,
  authError: null,
  signIn: async () => {},
  signOut: () => {},
  clearError: () => {},
  updatePreferences: async () => {},
  syncWithSheets: async () => {},
};

export function useGoogleAuth() {
  const context = useContext(GoogleAuthContext);
  // Return stub if provider not available (Google OAuth not configured)
  if (context === undefined) {
    return defaultContext;
  }
  return context;
}
