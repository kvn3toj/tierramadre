/**
 * AmbassadorsPage Component
 *
 * Content-first ambassador directory.
 * The IOSLayout banner provides the page title — no redundant chrome here.
 */

import React from 'react';
import { AmbassadorDirectory } from '../../components/ambassador';
import { Box } from '@mui/material';
import { Asesor } from '../../hooks/useAsesores';

interface AmbassadorsPageProps {
  onViewProducts?: (asesor: Asesor) => void;
}

const AmbassadorsPage: React.FC<AmbassadorsPageProps> = ({ onViewProducts }) => {
  return (
    <Box sx={{ pt: 0.5, maxWidth: { sm: 720, md: 840 }, mx: 'auto' }}>
      <AmbassadorDirectory onViewProducts={onViewProducts} />
    </Box>
  );
};

export default AmbassadorsPage;
