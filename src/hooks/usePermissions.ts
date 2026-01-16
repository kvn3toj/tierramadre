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
    const isEmbajador = accessLevel === 'embajador';
    const isAsesor = accessLevel === 'asesor';

    return {
      canEdit: !isGuest && !isProvider,
      canUpload: !isGuest,
      canDownload: !isGuest && !isProvider,
      isAdmin,
      isProvider,
      isEmbajador,
      isAsesor,
      canViewPrices: !isProvider,  // Providers cannot see prices
      canUseManualProduct: isAdmin || isEmbajador,  // Only admin and embajador can use manual products
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

/**
 * Check if user is staff (admin, embajador, asesor)
 * Staff can access features like product requests, not available to guests
 */
export const useIsStaff = (): boolean => {
  const { accessLevel } = useAuthContext();
  return accessLevel === 'admin' || accessLevel === 'embajador' || accessLevel === 'asesor';
};

/**
 * Hook for canUseManualProduct permission
 */
export const useCanUseManualProduct = (): boolean => {
  const { canUseManualProduct } = usePermissions();
  return canUseManualProduct;
};

/**
 * Hook for isEmbajador check
 */
export const useIsEmbajador = (): boolean => {
  const { isEmbajador } = usePermissions();
  return isEmbajador;
};

/**
 * Hook for isAsesor check
 */
export const useIsAsesor = (): boolean => {
  const { isAsesor } = usePermissions();
  return isAsesor;
};
