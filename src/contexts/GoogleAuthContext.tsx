/**
 * GoogleAuthContext
 *
 * Google Sign-In authentication for user profiles.
 * Works alongside existing PIN auth for access control.
 * Syncs user preferences with Google Sheets.
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { googleLogout } from '@react-oauth/google';

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
  isLoading: boolean;
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

  // Load user from localStorage on mount
  useEffect(() => {
    const loadStoredUser = () => {
      try {
        const storedUser = localStorage.getItem(GOOGLE_USER_KEY);
        const storedPrefs = localStorage.getItem(GOOGLE_PREFS_KEY);

        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        if (storedPrefs) {
          setPreferences(JSON.parse(storedPrefs));
        }
      } catch (error) {
        console.error('Error loading stored user:', error);
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
      console.error('Error decoding JWT:', error);
      return null;
    }
  };

  // Sign in with Google credential
  const signIn = useCallback(async (credential: string) => {
    setIsLoading(true);
    try {
      const profile = decodeJwt(credential);
      if (!profile) {
        throw new Error('Failed to decode credential');
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
        console.log('Using local preferences');
      }

      // Update last visit
      const newPrefs = { ...preferences, lastVisit: new Date().toISOString() };
      setPreferences(newPrefs);
      localStorage.setItem(GOOGLE_PREFS_KEY, JSON.stringify(newPrefs));
    } catch (error) {
      console.error('Sign in error:', error);
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
        console.log('Could not sync to server, saved locally');
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
      console.error('Sync error:', error);
    }
  }, [user]);

  const value: GoogleAuthContextType = {
    user,
    preferences,
    isSignedIn: !!user,
    isLoading,
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
  isLoading: false,
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
