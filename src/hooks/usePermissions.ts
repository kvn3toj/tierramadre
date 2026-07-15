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
    // "Special guest": can browse + share Vitrinas, but is NOT staff — treated
    // like a guest for editing/upload/download so it gains no admin powers.
    const isInvitadoEspecial = accessLevel === 'invitado_especial';
    const isStaff = isAdmin || isEmbajador || isAsesor;

    return {
      canEdit: !isGuest && !isProvider && !isInvitadoEspecial,
      canUpload: !isGuest && !isInvitadoEspecial,
      canDownload: !isGuest && !isProvider && !isInvitadoEspecial,
      isAdmin,
      isProvider,
      isEmbajador,
      isAsesor,
      isInvitadoEspecial,
      canViewPrices: !isProvider, // Providers cannot see prices
      canUseManualProduct: isAdmin || isEmbajador, // Only admin and embajador can use manual products
      // Sharing a client Vitrina is allowed for staff AND special guests.
      canShareVitrina: isStaff || isInvitadoEspecial,
      // Creating client cotizaciones is allowed for staff AND special guests.
      // (Manual-entry cotizaciones stay admin/embajador — see canUseManualProduct.)
      canCreateCotizaciones: isStaff || isInvitadoEspecial,
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
  return (
    accessLevel === 'admin' ||
    accessLevel === 'embajador' ||
    accessLevel === 'asesor'
  );
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

/**
 * Hook for isInvitadoEspecial check ("special guest" from the Asesores sheet)
 */
export const useIsInvitadoEspecial = (): boolean => {
  const { isInvitadoEspecial } = usePermissions();
  return isInvitadoEspecial;
};

/**
 * Whether the current user can create/share a client-facing "Vitrina" link.
 * True for staff (admin, embajador, asesor) and for special guests.
 */
export const useCanShareVitrina = (): boolean => {
  const { canShareVitrina } = usePermissions();
  return canShareVitrina;
};

/**
 * Whether the current user can open the Cuentas hub and create client
 * cotizaciones. True for staff (admin, embajador, asesor) and special guests.
 */
export const useCanCreateCotizaciones = (): boolean => {
  const { canCreateCotizaciones } = usePermissions();
  return canCreateCotizaciones;
};
