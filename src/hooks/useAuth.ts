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
  return accessLevel === 'full';
};
