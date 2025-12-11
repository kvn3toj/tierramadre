/**
 * Authentication Types for Dual-Access System
 */

export type AccessLevel = 'guest' | 'full';

export interface AuthState {
  isAuthenticated: boolean;
  accessLevel: AccessLevel;
}

export interface Permission {
  canEdit: boolean;
  canUpload: boolean;
  canDownload: boolean;
}

export interface AuthContextType extends AuthState {
  loginAsGuest: () => void;
  loginWithPin: (pin: string) => boolean;
  upgradeToFull: (pin: string) => boolean;
  logout: () => void;
}
