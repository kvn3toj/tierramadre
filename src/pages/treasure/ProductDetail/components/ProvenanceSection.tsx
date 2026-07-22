/**
 * ProvenanceSection Component
 *
 * Admin-only lot TRACEABILITY for a Fotosíntesis-captured item: `loteId`
 * (internal lot id), `preponderancia` (the item's cost-weight share of its lot)
 * and the sync-status pill.
 *
 * ADMIN-ONLY by design: `loteId` and `preponderancia` are internal pricing /
 * traceability inputs, NOT projected into the public, anonymously-subscribed
 * `publishedCatalog` query — leaking them would expose internal state to every
 * catalog visitor's WebSocket payload. The whole section is gated behind
 * `isAdmin`; the parent only mounts it for admins and we hard-guard here too.
 *
 * NOTE: the customer-facing origin (`procedencia` / lot `mina`) is now PUBLIC
 * and lives in CharacteristicsSection — it was moved out of here on 2026-06-30.
 *
 * Absent-safe: renders NOTHING (returns null) when there is no lot/sync data to
 * show — so lote bundle cards and legacy items self-hide with no layout shift.
 */

import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { Boxes, Scale } from 'lucide-react';
import { TreasureItem } from '../../../../types';
import { SpecRow } from './SpecRow';
import { Badge } from '../../../../design-system';
import { getSyncStatusBadge } from '../../../../utils/syncStatus';

interface ProvenanceSectionProps {
  product: TreasureItem;
  /** Gate: only admins ever see provenance/sync internals. */
  isAdmin: boolean;
}

export const ProvenanceSection: React.FC<ProvenanceSectionProps> = ({
  product,
  isAdmin,
}) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const secondaryTextColor = isLight
    ? 'rgba(60, 60, 67, 0.6)'
    : 'rgba(235, 235, 245, 0.6)';

  // Hard guard: never render provenance internals to non-admins, even if the
  // parent forgets to gate.
  if (!isAdmin) return null;

  const loteId = product.loteId?.trim();
  const hasPreponderancia =
    typeof product.preponderancia === 'number' &&
    Number.isFinite(product.preponderancia);
  const syncStatus = product.syncStatus;

  const hasProvenance = Boolean(loteId || hasPreponderancia);

  // Absent-safe: nothing to show → no section (no empty box / layout shift).
  if (!hasProvenance && !syncStatus) return null;

  return (
    <Box sx={{ mb: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          mb: 0.5,
        }}
      >
        <Typography
          sx={{
            fontSize: '13px',
            fontWeight: 600,
            color: secondaryTextColor,
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
          }}
        >
          Trazabilidad
        </Typography>
        {syncStatus && (
          <Badge {...getSyncStatusBadge(syncStatus, product.syncError)} />
        )}
      </Box>

      {loteId && (
        <SpecRow
          icon={<Boxes size={18} />}
          label="Lote"
          value={loteId}
          showBorder={hasPreponderancia}
        />
      )}

      {hasPreponderancia && (
        // Stored as a percentage in (0, 100] (sum ≡ 100 per lot;
        // costoBaseCOP = costoTotalCOP × preponderancia / 100), so render the
        // value directly with "%" — do NOT scale by 100.
        <SpecRow
          icon={<Scale size={18} />}
          label="Preponderancia"
          value={`${product.preponderancia!.toFixed(1)}%`}
          showBorder={false}
        />
      )}
    </Box>
  );
};

export default ProvenanceSection;
