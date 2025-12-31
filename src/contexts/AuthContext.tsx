/**
 * Authentication Context - Tiered Access System
 * Guest Mode: View-only access (no PIN required)
 * Full Mode: Complete access (PIN 5555 or Google auth with asesor/embajador role)
 * Admin Mode: Full access + Drive folder management (PIN 1234 or Google auth with admin role)
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { AuthState, AuthContextType, AccessLevel } from '../types/auth';
import { useGoogleAuth } from './GoogleAuthContext';

const FULL_PIN = '5555';
const ADMIN_PIN = '1234';
const STORAGE_KEY = 'tierra-madre-auth';

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
      return { isAuthenticated: true, accessLevel: 'full' };
    }

    return JSON.parse(stored) as StoredAuthState;
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { user: googleUser, isSignedIn: isGoogleSignedIn, isAuthorized: isGoogleAuthorized } = useGoogleAuth();

  const [authState, setAuthState] = useState<AuthState>(() => {
    const stored = getStoredAuth();
    if (stored) {
      return stored;
    }
    return { isAuthenticated: false, accessLevel: 'guest' };
  });

  // Sync with Google auth when user signs in/out
  useEffect(() => {
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
    }
  }, [isGoogleSignedIn, isGoogleAuthorized, googleUser?.accessLevel]);

  const loginAsGuest = useCallback(() => {
    const newState: AuthState = { isAuthenticated: true, accessLevel: 'guest' };
    setAuthState(newState);
    setStoredAuth(newState);
  }, []);

  const loginWithPin = useCallback((pin: string): boolean => {
    // Check for admin PIN first
    if (pin === ADMIN_PIN) {
      const newState: AuthState = { isAuthenticated: true, accessLevel: 'admin' };
      setAuthState(newState);
      setStoredAuth(newState);
      return true;
    }
    // Then check for full access PIN
    if (pin === FULL_PIN) {
      const newState: AuthState = { isAuthenticated: true, accessLevel: 'full' };
      setAuthState(newState);
      setStoredAuth(newState);
      return true;
    }
    return false;
  }, []);

  const upgradeToFull = useCallback((pin: string): boolean => {
    // Check for admin PIN first
    if (pin === ADMIN_PIN) {
      const newState: AuthState = { isAuthenticated: true, accessLevel: 'admin' };
      setAuthState(newState);
      setStoredAuth(newState);
      return true;
    }
    // Then check for full access PIN
    if (pin === FULL_PIN) {
      const newState: AuthState = { isAuthenticated: true, accessLevel: 'full' };
      setAuthState(newState);
      setStoredAuth(newState);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setAuthState({ isAuthenticated: false, accessLevel: 'guest' });
    clearStoredAuth();
  }, []);

  const value: AuthContextType = {
    ...authState,
    loginAsGuest,
    loginWithPin,
    upgradeToFull,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
