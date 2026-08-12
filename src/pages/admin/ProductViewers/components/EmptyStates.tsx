/**
 * EmptyStates Component
 * Empty states for no views and no cotizaciones.
 */

import React from 'react';
import { Eye, FileText } from 'lucide-react';
import { EmptyState } from '../../../../design-system';

interface NoViewsProps {
  isLight: boolean;
}

export const NoViews: React.FC<NoViewsProps> = () => {
  return (
    <EmptyState
      icon={Eye}
      title="Sin vistas registradas"
      subtitle="Este producto aún no ha sido visualizado"
      compact
    />
  );
};

interface NoCotizacionesProps {
  hasViews: boolean;
}

export const NoCotizaciones: React.FC<NoCotizacionesProps> = ({ hasViews }) => {
  if (!hasViews) {
    return null;
  }

  return (
    <EmptyState
      icon={FileText}
      title="Sin cotizaciones registradas"
      subtitle="Este producto aún no ha sido incluido en ninguna cotización"
      compact
    />
  );
};
