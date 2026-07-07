/**
 * Authentication Context - Tiered Access System
 * Guest Mode: View-only access (invitation link)
 * Staff Mode: Google OAuth with role validation (asesor, embajador, admin)
 * Provider Mode: Google OAuth with provider validation
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
} from 'react';
import type { AuthState, AuthContextType, AccessLevel } from '../types/auth';
import { useGoogleAuth } from './GoogleAuthContext';
import { SESSION_KEYS, STORAGE_KEYS } from '../constants/storage-keys';

const STORAGE_KEY = SESSION_KEYS.AUTH;

interface StoredAuthState {
  isAuthenticated: boolean;
  accessLevel: AccessLevel;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const getStoredAuth = (): StoredAuthState | null => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    // Handle legacy format (just 'true' string)
    if (stored === 'true') {
      return { isAuthenticated: true, accessLevel: 'asesor' };
    }

    const parsed = JSON.parse(stored) as StoredAuthState;
    // Handle legacy 'full' value - treat as asesor for backward compatibility
    if (parsed.accessLevel === ('full' as AccessLevel)) {
      parsed.accessLevel = 'asesor';
    }
    return parsed;
  } catch {
    return null;
  }
};

const setStoredAuth = (state: StoredAuthState) => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const clearStoredAuth = () => {
  sessionStorage.removeItem(STORAGE_KEY);
};

/**
 * Check localStorage for a persisted guest invitation. If found, restore all
 * invitation keys into sessionStorage and return true.
 *
 * NOTE: this intentionally does NOT enforce `invitation-expires`. Active
 * invitations are treated as "no time limit" (the server's validate path
 * returns them valid with timeRemaining: null, and durationHours is 12 months),
 * so restore mirrors that. If expiry ever needs enforcing, gate it here AND in
 * the server validate path so client and server agree.
 */
const GUEST_PERSIST_KEY = 'tm_guest_invitation';

function restoreGuestSession(): boolean {
  try {
    const raw = localStorage.getItem(GUEST_PERSIST_KEY);
    if (!raw) return false;

    const data = JSON.parse(raw) as Record<string, string>;

    // Restore every key into sessionStorage so the rest of the app works
    for (const [key, value] of Object.entries(data)) {
      sessionStorage.setItem(key, value);
    }
    return true;
  } catch {
    return false;
  }
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const {
    user: googleUser,
    isSignedIn: isGoogleSignedIn,
    isAuthorized: isGoogleAuthorized,
    isLoading: isGoogleLoading,
  } = useGoogleAuth();

  const [authState, setAuthState] = useState<AuthState>(() => {
    const stored = getStoredAuth();
    if (stored) {
      return stored;
    }

    // Fallback: check if Google user exists in localStorage (persists across tabs)
    // This prevents WelcomeScreen flash while GoogleAuthContext re-validates
    try {
      const googleUser = localStorage.getItem(STORAGE_KEYS.GOOGLE_USER);
      if (googleUser) {
        const parsed = JSON.parse(googleUser);
        return {
          isAuthenticated: true,
          accessLevel: parsed.accessLevel || 'asesor',
        };
      }
    } catch {
      /* ignore parse errors */
    }

    // Check localStorage for a persisted guest invitation (survives new tabs)
    if (restoreGuestSession()) {
      return { isAuthenticated: true, accessLevel: 'guest' };
    }

    return { isAuthenticated: false, accessLevel: 'guest' };
  });

  // Sync with Google auth when user signs in/out
  // IMPORTANT: Wait for loading to complete to avoid race condition where
  // accessLevel is not yet set during async provider validation
  useEffect(() => {
    // Don't update auth state while Google auth is still loading
    if (isGoogleLoading) {
      return;
    }

    if (isGoogleSignedIn && isGoogleAuthorized && googleUser?.accessLevel) {
      // User signed in with Google and is authorized
      const newState: AuthState = {
        isAuthenticated: true,
        accessLevel: googleUser.accessLevel,
      };
      setAuthState(newState);
      setStoredAuth(newState);
    } else if (isGoogleSignedIn && !isGoogleAuthorized) {
      // User signed in but not authorized - guest mode
      const newState: AuthState = {
        isAuthenticated: true,
        accessLevel: 'guest',
      };
      setAuthState(newState);
      setStoredAuth(newState);
    } else if (!isGoogleSignedIn && !googleUser) {
      // Don't reset if there's an active guest invitation session
      // (restoreGuestSession already set auth from localStorage on mount)
      const hasGuestSession = localStorage.getItem(GUEST_PERSIST_KEY);
      if (!hasGuestSession) {
        setAuthState({ isAuthenticated: false, accessLevel: 'guest' });
        clearStoredAuth();
      }
    }
  }, [
    isGoogleSignedIn,
    isGoogleAuthorized,
    googleUser?.accessLevel,
    googleUser,
    isGoogleLoading,
  ]);

  const loginAsGuest = useCallback(() => {
    const newState: AuthState = { isAuthenticated: true, accessLevel: 'guest' };
    setAuthState(newState);
    setStoredAuth(newState);
  }, []);

  const logout = useCallback(() => {
    setAuthState({ isAuthenticated: false, accessLevel: 'guest' });
    clearStoredAuth();
    localStorage.removeItem(GUEST_PERSIST_KEY);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      ...authState,
      loginAsGuest,
      logout,
    }),
    [authState, loginAsGuest, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
