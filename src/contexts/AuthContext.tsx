/**
 * Authentication Context - Tiered Access System
 * Guest Mode: View-only access (no PIN required)
 * Full Mode: Complete access (PIN 7777 asesores, PIN 3333 embajadores, or Google auth)
 * Admin Mode: Full access + Drive folder management (PIN 3011 or Google auth with admin role)
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { AuthState, AuthContextType, AccessLevel } from '../types/auth';
import { useGoogleAuth } from './GoogleAuthContext';

const ASSESSOR_PIN = '7777';    // Asesores
const AMBASSADOR_PIN = '3333';  // Embajadores
const ADMIN_PIN = '3011';
const PROVIDER_PIN = '1234';    // Proveedores (dev testing only)
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
  const { user: googleUser, isSignedIn: isGoogleSignedIn, isAuthorized: isGoogleAuthorized, isLoading: isGoogleLoading } = useGoogleAuth();

  const [authState, setAuthState] = useState<AuthState>(() => {
    const stored = getStoredAuth();
    if (stored) {
      return stored;
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
      // User signed out from Google - reset to unauthenticated
      setAuthState({ isAuthenticated: false, accessLevel: 'guest' });
      clearStoredAuth();
    }
  }, [isGoogleSignedIn, isGoogleAuthorized, googleUser?.accessLevel, googleUser, isGoogleLoading]);

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
    // Check for provider PIN (dev testing)
    if (pin === PROVIDER_PIN) {
      const newState: AuthState = { isAuthenticated: true, accessLevel: 'provider' };
      setAuthState(newState);
      setStoredAuth(newState);
      return true;
    }
    // Then check for full access PINs (assessors or ambassadors)
    if (pin === ASSESSOR_PIN || pin === AMBASSADOR_PIN) {
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
    // Then check for full access PINs (assessors or ambassadors)
    if (pin === ASSESSOR_PIN || pin === AMBASSADOR_PIN) {
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
