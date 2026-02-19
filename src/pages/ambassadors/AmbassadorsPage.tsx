/**
 * AmbassadorsPage Component
 *
 * Public ambassadors directory - no PIN required.
 * Shows embajadores from Google Sheets.
 */

import React from 'react';
import { AmbassadorDirectory } from '../../components/ambassador';
import { Box } from '@mui/material';
import { Asesor } from '../../hooks/useAsesores';

interface AmbassadorsPageProps {
  onViewProducts?: (asesor: Asesor) => void;
  onContact?: (asesor: Asesor) => void;
}

const AmbassadorsPage: React.FC<AmbassadorsPageProps> = ({ onViewProducts, onContact }) => {
  return (
    <Box>
      <AmbassadorDirectory
        onViewProducts={onViewProducts}
        onContact={onContact}
      />
    </Box>
  );
};

export default AmbassadorsPage;
