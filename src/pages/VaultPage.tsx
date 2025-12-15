/**
 * VaultPage Component
 *
 * Secret Vault page with PIN protection
 * - Shows VaultGate if locked
 * - Shows VaultBrowser (premium inventory) if unlocked
 */

import React from 'react';
import { useVaultAccess } from '../hooks/useVaultAccess';
import VaultGate from '../components/VaultGate';
import InventoryBrowser from '../components/InventoryBrowser';
import { Box } from '@mui/material';

const VaultPage: React.FC = () => {
  const { isUnlocked } = useVaultAccess();
  const [forceUnlocked, setForceUnlocked] = React.useState(false);

  // For now, we'll reuse InventoryBrowser but filter for vault-exclusive items
  // In the future, this can be a separate VaultBrowser component with enhanced UI
  return (
    <Box>
      {!isUnlocked && !forceUnlocked ? (
        <VaultGate onUnlock={() => {
          setForceUnlocked(true);
        }} />
      ) : (
        // For MVP: Show same inventory but with "Bóveda Secreta" context
        // TODO: Create VaultBrowser component with:
        // - Premium UI (more spacing, gold accents)
        // - Filter for items with isVaultExclusive: true
        // - Enhanced item cards with rarity indicators
        <InventoryBrowser />
      )}
    </Box>
  );
};

export default VaultPage;
