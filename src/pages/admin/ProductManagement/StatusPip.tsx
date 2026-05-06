/**
 * StatusPip — the signature element of the Fotosíntesis row.
 *
 * A vertical column of three 6×6 squares. Only one is filled (the one
 * matching the product's `estado`); the others are hairline outlines.
 * Reads like the colored tab on a card-catalog index card.
 *
 * The pip is the ONLY saturated color in the row's right edge. Resist
 * the urge to add labels, gradients, or shadows.
 *
 * Per Interface Design mandate:
 *   Intent — distinguish status at a glance without using colored chips.
 *   Palette — three foto status colors (emerald / oxblood / amber).
 *   Depth — borders-only on empty pips; filled pip is solid.
 *   Surfaces — inherits row surface; no fill of its own.
 *   Typography — none (visual-only; aria-label provides the text).
 *   Spacing — 6×6 squares, 4px gap, total height ≈ 26px.
 */

import { Box } from "@mui/material";
import type { FotoTokens } from "../../../design-system";

export type EstadoValue = "DISPONIBLE" | "VENDIDA" | "ASESOR" | "";

interface StatusPipProps {
  estado: EstadoValue;
  /** Fotosíntesis tokens — drives the pip colors. */
  foto: FotoTokens;
  /** Forces a "muted" look for inactive rows (e.g., during a save) */
  muted?: boolean;
}

const ORDER: Array<{
  key: "available" | "sold" | "consigned";
  estado: EstadoValue;
}> = [
  { key: "available", estado: "DISPONIBLE" },
  { key: "consigned", estado: "ASESOR" },
  { key: "sold", estado: "VENDIDA" },
];

const LABELS: Record<EstadoValue, string> = {
  DISPONIBLE: "Disponible",
  ASESOR: "Con asesor",
  VENDIDA: "Vendida",
  "": "Sin estado",
};

export function StatusPip({ estado, foto, muted = false }: StatusPipProps) {
  const activeKey = ORDER.find((p) => p.estado === estado)?.key ?? null;
  const label = LABELS[estado] ?? "Sin estado";

  return (
    <Box
      role="img"
      aria-label={`Estado: ${label}`}
      sx={{
        display: "inline-flex",
        flexDirection: "column",
        gap: "4px",
        opacity: muted ? 0.4 : 1,
      }}
    >
      {ORDER.map(({ key }) => {
        const isActive = key === activeKey;
        const fillColor = foto.status[key];
        return (
          <Box
            key={key}
            sx={{
              width: "6px",
              height: "6px",
              borderRadius: "1px",
              backgroundColor: isActive ? fillColor : "transparent",
              border: isActive
                ? `1px solid ${fillColor}`
                : `1px solid ${foto.surfaces.edgeStrong}`,
              transition:
                "background-color 120ms ease, border-color 120ms ease",
            }}
          />
        );
      })}
    </Box>
  );
}
