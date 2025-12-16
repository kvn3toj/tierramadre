/**
 * AmbassadorsPage Component
 *
 * Ambassadors page with PIN protection
 * - Shows VaultGate if locked
 * - Shows AmbassadorDirectory if unlocked
 */

import React from 'react';
import { useVaultAccess } from '../hooks/useVaultAccess';
import VaultGate from '../components/VaultGate';
import { AmbassadorDirectory } from '../components/ambassador';
import { Box } from '@mui/material';
import { Asesor } from '../hooks/useAsesores';

interface AmbassadorsPageProps {
  onViewProducts?: (asesor: Asesor) => void;
  onContact?: (asesor: Asesor) => void;
}

const AmbassadorsPage: React.FC<AmbassadorsPageProps> = ({ onViewProducts, onContact }) => {
  const { isUnlocked } = useVaultAccess();
  const [forceUnlocked, setForceUnlocked] = React.useState(false);

  return (
    <Box>
      {!isUnlocked && !forceUnlocked ? (
        <VaultGate
          variant="ambassadors"
          onUnlock={() => {
            setForceUnlocked(true);
          }}
        />
      ) : (
        <AmbassadorDirectory
          onViewProducts={onViewProducts}
          onContact={onContact}
        />
      )}
    </Box>
  );
};

export default AmbassadorsPage;
