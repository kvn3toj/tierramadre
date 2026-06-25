/**
 * ProvenanceSection Component
 *
 * Shows lot / origin provenance for a Fotosíntesis-captured item, plus the
 * admin-only sync status pill.
 *
 * ADMIN-ONLY by design (R5): `procedencia` (mine origin), `loteId` (internal lot
 * id) and `preponderancia` (the item's cost-weight share of its lot) live in the
 * admin-only `products.get` document and are intentionally NOT projected into the
 * public, anonymously-subscribed `publishedCatalog` query — leaking them would
 * expose internal state to every catalog visitor's WebSocket payload. So this
 * whole section is gated behind `isAdmin`; the parent only mounts it for admins,
 * and we hard-guard here as a second line of defense.
 *
 * `procedencia` is a free-text field with no marketing-vocabulary enforcement
 * (it is synced to the internal SOT Inventario tab), so even the origin string is
 * treated as internal and kept admin-only rather than shown to all roles.
 *
 * Absent-safe: renders NOTHING (returns null) when there is no provenance and no
 * sync status to show — so lote bundle cards (which carry none of these fields)
 * and legacy items self-hide with no empty section or layout shift.
 */

import React from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { Mountain, Boxes, Scale } from "lucide-react";
import { TreasureItem } from "../../../../types";
import { SpecRow } from "./SpecRow";
import { SyncStatusBadge } from "../../../../components/shared/SyncStatusBadge";

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
  const isLight = theme.palette.mode === "light";
  const secondaryTextColor = isLight
    ? "rgba(60, 60, 67, 0.6)"
    : "rgba(235, 235, 245, 0.6)";

  // Hard guard: never render provenance internals to non-admins, even if the
  // parent forgets to gate.
  if (!isAdmin) return null;

  const origin = product.procedencia?.trim();
  const loteId = product.loteId?.trim();
  const hasPreponderancia =
    typeof product.preponderancia === "number" &&
    Number.isFinite(product.preponderancia);
  const syncStatus = product.syncStatus;

  const hasProvenance = Boolean(origin || loteId || hasPreponderancia);

  // Absent-safe: nothing to show → no section (no empty box / layout shift).
  if (!hasProvenance && !syncStatus) return null;

  return (
    <Box sx={{ mb: 2 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          mb: 0.5,
        }}
      >
        <Typography
          sx={{
            fontSize: "13px",
            fontWeight: 600,
            color: secondaryTextColor,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
          }}
        >
          Procedencia
        </Typography>
        {syncStatus && (
          <SyncStatusBadge status={syncStatus} error={product.syncError} />
        )}
      </Box>

      {origin && (
        <SpecRow icon={<Mountain size={18} />} label="Origen" value={origin} />
      )}

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
