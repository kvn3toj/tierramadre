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

    return {
      canEdit: !isGuest,
      canUpload: !isGuest,
      canDownload: !isGuest,
      isAdmin,
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
