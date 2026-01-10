/**
 * useAuth Hook - Access authentication state and methods
 */

import { useAuthContext } from '../contexts/AuthContext';
import { useGoogleAuth } from '../contexts/GoogleAuthContext';

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
  return accessLevel === 'full';
};

/**
 * Check if the current user is an Embajador (Ambassador)
 * Only Embajadores can see Comunidad TM prices and create invitation links
 */
export const useIsEmbajador = () => {
  const { user } = useGoogleAuth();
  const role = user?.role?.toLowerCase() || '';
  return role.includes('embajador') || role.includes('ambassador');
};

/**
 * Check if user can see Comunidad TM discounted prices
 * Only Embajadores and Admins can see these prices
 */
export const useCanSeeComunidadPrice = () => {
  const { accessLevel } = useAuthContext();
  const isEmbajador = useIsEmbajador();
  return isEmbajador || accessLevel === 'admin';
};

/**
 * Check if user can create invitation links
 * Only Embajadores and Admins can create invitations
 * Admins with PIN access can also create invitations (even without Google sign-in)
 */
export const useCanCreateInvitations = () => {
  const { accessLevel } = useAuthContext();
  const { isSignedIn, isAuthorized } = useGoogleAuth();
  const isEmbajador = useIsEmbajador();

  // Admin with PIN access can create invitations
  if (accessLevel === 'admin') {
    return true;
  }

  // Embajadores need Google sign-in
  return isSignedIn && isAuthorized && isEmbajador;
};
