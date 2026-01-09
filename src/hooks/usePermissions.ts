/**
 * usePermissions Hook - Check user permissions based on access level
 */

import { useMemo } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import type { Permission } from '../types/auth';

export const usePermissions = (): Permission => {
  const { accessLevel } = useAuthContext();

  return useMemo(() => {
    const isGuest = accessLevel === 'guest';
    const isAdmin = accessLevel === 'admin';
    const isProvider = accessLevel === 'provider';

    return {
      canEdit: !isGuest && !isProvider,
      canUpload: !isGuest,
      canDownload: !isGuest && !isProvider,
      isAdmin,
      isProvider,
      canViewPrices: !isProvider,  // Providers cannot see prices
    };
  }, [accessLevel]);
};

// Convenience hooks for specific permissions
export const useCanEdit = (): boolean => {
  const { canEdit } = usePermissions();
  return canEdit;
};

export const useCanUpload = (): boolean => {
  const { canUpload } = usePermissions();
  return canUpload;
};

export const useCanDownload = (): boolean => {
  const { canDownload } = usePermissions();
  return canDownload;
};

export const useIsAdmin = (): boolean => {
  const { isAdmin } = usePermissions();
  return isAdmin;
};

export const useIsProvider = (): boolean => {
  const { isProvider } = usePermissions();
  return isProvider;
};

export const useCanViewPrices = (): boolean => {
  const { canViewPrices } = usePermissions();
  return canViewPrices;
};
