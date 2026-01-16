/**
 * useAuth Hook - Access authentication state and methods
 */

import { useAuthContext } from '../contexts/AuthContext';

export const useAuth = () => {
  return useAuthContext();
};

// Convenience hooks
export const useIsAuthenticated = () => {
  const { isAuthenticated } = useAuthContext();
  return isAuthenticated;
};

export const useAccessLevel = () => {
  const { accessLevel } = useAuthContext();
  return accessLevel;
};

export const useIsGuest = () => {
  const { accessLevel } = useAuthContext();
  return accessLevel === 'guest';
};

export const useHasFullAccess = () => {
  const { accessLevel } = useAuthContext();
  // Full access = asesor or embajador (staff members)
  return accessLevel === 'asesor' || accessLevel === 'embajador';
};

/**
 * Check if the current user is an Embajador (Ambassador)
 * Embajadores have higher permissions than Asesores
 */
export const useIsEmbajador = () => {
  const { accessLevel } = useAuthContext();
  return accessLevel === 'embajador';
};

/**
 * Check if the current user is an Asesor
 */
export const useIsAsesor = () => {
  const { accessLevel } = useAuthContext();
  return accessLevel === 'asesor';
};

/**
 * Check if user can see Comunidad TM discounted prices
 * Only Embajadores and Admins can see these prices
 */
export const useCanSeeComunidadPrice = () => {
  const { accessLevel } = useAuthContext();
  return accessLevel === 'embajador' || accessLevel === 'admin';
};

/**
 * Check if user can create invitation links
 * Admins, Embajadores, and Asesores can create invitations
 */
export const useCanCreateInvitations = () => {
  const { accessLevel } = useAuthContext();
  return accessLevel === 'admin' || accessLevel === 'embajador' || accessLevel === 'asesor';
};

/**
 * Check if guest can see prices
 * Guests invited with 'no_prices' mode cannot see prices
 * Non-guests always can see prices (unless other restrictions apply)
 */
export const useGuestCanSeePrices = () => {
  const { accessLevel } = useAuthContext();

  // Not a guest - can see prices
  if (accessLevel !== 'guest') {
    return true;
  }

  // Check guest pricing mode from sessionStorage
  if (typeof window !== 'undefined') {
    const pricingMode = sessionStorage.getItem('guest-pricing-mode');
    return pricingMode !== 'no_prices';
  }

  return true;
};
