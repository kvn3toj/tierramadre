/**
 * Authentication Types for Dual-Access System
 */

export type AccessLevel = 'guest' | 'full' | 'admin';

export interface AuthState {
  isAuthenticated: boolean;
  accessLevel: AccessLevel;
}

export interface Permission {
  canEdit: boolean;
  canUpload: boolean;
  canDownload: boolean;
  isAdmin: boolean;
}

export interface AuthContextType extends AuthState {
  loginAsGuest: () => void;
  loginWithPin: (pin: string) => boolean;
  upgradeToFull: (pin: string) => boolean;
  logout: () => void;
}
