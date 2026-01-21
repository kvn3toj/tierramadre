/**
 * Authentication Types for Dual-Access System
 */

export type AccessLevel = 'guest' | 'asesor' | 'embajador' | 'admin' | 'provider';

export interface AuthState {
  isAuthenticated: boolean;
  accessLevel: AccessLevel;
}

export interface Permission {
  canEdit: boolean;
  canUpload: boolean;
  canDownload: boolean;
  isAdmin: boolean;
  isProvider: boolean;
  isEmbajador: boolean;
  isAsesor: boolean;
  canViewPrices: boolean;
  canUseManualProduct: boolean;
}

export interface AuthContextType extends AuthState {
  loginAsGuest: () => void;
  logout: () => void;
}
