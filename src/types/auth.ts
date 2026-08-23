/**
 * Authentication Types for Dual-Access System
 */

/**
 * Access levels, from least to most privileged.
 * - 'invitado_especial': a "special guest" listed (and activated) in the
 *   Asesores sheet. Browses the catalog and can create/share client "Vitrina"
 *   links like staff, but has no editing/upload/admin powers.
 */
export type AccessLevel =
  | 'guest'
  | 'invitado_especial'
  | 'asesor'
  | 'embajador'
  | 'admin'
  | 'provider';

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
  isInvitadoEspecial: boolean;
  canViewPrices: boolean;
  canUseManualProduct: boolean;
  /** Can fix a Vitrina's sale-price multiplier (admin, embajador, invitado especial — NOT asesor). */
  canUseMultiplier: boolean;
  /** Can create/share client-facing "Vitrina" links (staff + invitado especial). */
  canShareVitrina: boolean;
  /** Can open the Cuentas hub and create client cotizaciones (staff + invitado especial). */
  canCreateCotizaciones: boolean;
}

export interface AuthContextType extends AuthState {
  loginAsGuest: () => void;
  logout: () => void;
}
