/**
 * AmbassadorsPage Component
 *
 * Ambassadors page with smart access control:
 * - If user has full access (logged in with home PIN), show directly
 * - If user is guest, show VaultGate PIN screen
 * - Vault PIN can also unlock for users who didn't use home PIN
 */

import React from 'react';
import { useAuthContext } from '../contexts/AuthContext';
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
  const { accessLevel } = useAuthContext();
  const { isUnlocked: isVaultUnlocked } = useVaultAccess();
  const [forceUnlocked, setForceUnlocked] = React.useState(false);

  // User has access if:
  // 1. They logged in with full access (home PIN 5555), OR
  // 2. They unlocked via VaultGate PIN (2024), OR
  // 3. They just unlocked via forceUnlocked state
  const hasAccess = accessLevel === 'full' || isVaultUnlocked || forceUnlocked;

  return (
    <Box>
      {!hasAccess ? (
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
