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
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  syncWithSheets: () => Promise<void>;
}

// =============================================================================
// STORAGE KEYS
// =============================================================================

const GOOGLE_USER_KEY = 'tierramadre-google-user';
const GOOGLE_PREFS_KEY = 'tierramadre-google-prefs';
const GOOGLE_TOKEN_KEY = 'tierramadre-google-token';

// =============================================================================
// CONTEXT
// =============================================================================

const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

interface GoogleAuthProviderProps {
  children: ReactNode;
}

export function GoogleAuthProvider({ children }: GoogleAuthProviderProps) {
  const [user, setUser] = useState<GoogleUserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const loadStoredUser = () => {
      try {
        const storedUser = localStorage.getItem(GOOGLE_USER_KEY);
        const storedPrefs = localStorage.getItem(GOOGLE_PREFS_KEY);

        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          // User is authorized if they have a role (validated previously)
          setIsAuthorized(!!parsedUser.role);
        }
        if (storedPrefs) {
          setPreferences(JSON.parse(storedPrefs));
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

      // Validate user email against Asesores sheet first
      try {
        const validateResponse = await fetch(`/api/validate-user?email=${encodeURIComponent(profile.email)}`);
        const validateData = await validateResponse.json();

        if (validateData.success && validateData.isAuthorized) {
          // User is authorized as asesor/admin - add role and access level to profile
          profile.role = validateData.user.role;
          profile.accessLevel = validateData.user.accessLevel;
          setIsAuthorized(true);
          log.debug('User authorized:', { email: profile.email, role: profile.role, accessLevel: profile.accessLevel });
        } else {
          // Not found in Asesores, check Proveedores sheet
          log.debug('Not found in Asesores, checking Proveedores...');

          // TODO: REMOVE THIS - Temporary bypass for local testing
          const DEV_TEST_PROVIDER = true; // Set to false to disable bypass
          if (DEV_TEST_PROVIDER && import.meta.env.DEV) {
            log.warn('🧪 DEV MODE: Bypassing provider validation');
            profile.role = 'Proveedor';
            profile.accessLevel = 'provider';
            setIsAuthorized(true);
            setUser(profile);
            localStorage.setItem(GOOGLE_USER_KEY, JSON.stringify(profile));
            setIsLoading(false);
            return;
          }
          // END TEMPORARY BYPASS

          try {
            const providerResponse = await fetch(`/api/validate-provider?email=${encodeURIComponent(profile.email)}`);
            const providerData = await providerResponse.json();

            if (providerData.success && providerData.isProvider) {
              // User is authorized as provider
              profile.role = 'Proveedor';
              profile.accessLevel = 'provider';
              setIsAuthorized(true);
              log.debug('Provider authorized:', { email: profile.email, provider: providerData.provider?.name });
            } else {
              // User email not found in any authorized list
              setIsAuthorized(false);
              setAuthError('Tu correo no está registrado en el sistema. Contacta al administrador.');
              log.warn('User not authorized:', profile.email);
            }
          } catch (providerError) {
            log.error('Provider validation API error:', providerError);
            // User email not found in any authorized list
            setIsAuthorized(false);
            setAuthError('Tu correo no está registrado en el sistema. Contacta al administrador.');
            log.warn('User not authorized:', profile.email);
          }
        }
      } catch (validateError) {
        log.error('Validation API error:', validateError);
        // On API error, allow login but without special permissions
        profile.role = 'Invitado';
        profile.accessLevel = 'guest';
        setIsAuthorized(false);
        setAuthError('Error validando usuario. Acceso como invitado.');
      }

      // Store user and token
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
