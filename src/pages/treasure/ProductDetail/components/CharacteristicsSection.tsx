/**
 * CharacteristicsSection Component
 *
 * PUBLIC product characteristics captured in the Fotosíntesis admin and
 * surfaced to every catalog visitor (product decision 2026-06-30): mine origin
 * (`procedencia` / lot `mina`), `tratamiento` (treatment), jewelry detail
 * (`tipoJoya`, `tecnicaJoya`, `minerales`, `complementos`) and the evocative
 * `description` (sourced from the capture-time `observacion`).
 *
 * Unlike ProvenanceSection (admin-only lote/preponderancia/sync internals), this
 * section has NO role gate — these are buyer-facing disclosures. It is
 * absent-safe: renders NOTHING when none of its fields are present, so legacy
 * (non-Fotosíntesis) items and sparse rows self-hide with no layout shift.
 */

import React from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { Mountain, Droplets, Gem, Hammer, Layers, Boxes } from "lucide-react";
import { TreasureItem } from "../../../../types";
import { SpecRow } from "./SpecRow";

interface CharacteristicsSectionProps {
  product: TreasureItem;
}

const joinList = (arr?: string[]): string =>
  (arr ?? [])
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(", ");

export const CharacteristicsSection: React.FC<CharacteristicsSectionProps> = ({
  product,
}) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === "light";
  const secondaryTextColor = isLight
    ? "rgba(60, 60, 67, 0.6)"
    : "rgba(235, 235, 245, 0.6)";

  const origin = product.procedencia?.trim();
  const mina = product.mina?.trim();
  const tratamiento = product.tratamiento?.trim();
  const tipoJoya = product.isJewelry ? product.tipoJoya?.trim() : undefined;
  const tecnicaJoya = product.isJewelry
    ? product.tecnicaJoya?.trim()
    : undefined;
  const minerales = joinList(product.minerales);
  const complementos = joinList(product.complementos);
  const description = product.description?.trim();

  // Show a distinct "Mina" row only when the lot mine adds info beyond `origin`.
  const showMina =
    Boolean(mina) && mina!.toLowerCase() !== (origin ?? "").toLowerCase();

  const rows: { show: boolean }[] = [
    { show: Boolean(origin || mina) },
    { show: showMina },
    { show: Boolean(tratamiento) },
    { show: Boolean(tipoJoya) },
    { show: Boolean(tecnicaJoya) },
    { show: Boolean(minerales) },
    { show: Boolean(complementos) },
  ];
  const hasAnyRow = rows.some((r) => r.show);

  // Absent-safe: nothing to show → no section.
  if (!hasAnyRow && !description) return null;

  return (
    <Box sx={{ mb: 2 }}>
      <Typography
        sx={{
          fontSize: "13px",
          fontWeight: 600,
          color: secondaryTextColor,
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          mb: 0.5,
        }}
      >
        Características
      </Typography>

      {description && (
        <Typography
          sx={{
            fontSize: "15px",
            lineHeight: 1.5,
            color: theme.palette.text.secondary,
            fontStyle: "italic",
            mb: hasAnyRow ? 1.25 : 0,
          }}
        >
          {description}
        </Typography>
      )}

      {(origin || mina) && (
        <SpecRow
          icon={<Mountain size={18} />}
          label="Origen"
          value={origin || mina!}
        />
      )}

      {showMina && (
        <SpecRow icon={<Mountain size={18} />} label="Mina" value={mina!} />
      )}

      {tratamiento && (
        <SpecRow
          icon={<Droplets size={18} />}
          label="Tratamiento"
          value={tratamiento}
        />
      )}

      {tipoJoya && (
        <SpecRow
          icon={<Gem size={18} />}
          label="Tipo de joya"
          value={tipoJoya}
        />
      )}

      {tecnicaJoya && (
        <SpecRow
          icon={<Hammer size={18} />}
          label="Técnica"
          value={tecnicaJoya}
        />
      )}

      {minerales && (
        <SpecRow
          icon={<Layers size={18} />}
          label="Materiales"
          value={minerales}
        />
      )}

      {complementos && (
        <SpecRow
          icon={<Boxes size={18} />}
          label="Complementos"
          value={complementos}
          showBorder={false}
        />
      )}
    </Box>
  );
};

export default CharacteristicsSection;
