import { Box } from "@mui/material";
import { getFoto, fontFamilies } from "../../../../design-system";
import { parseCaratWeight, pricePerCarat } from "../utils/caratWeight";

const COP_FORMATTER = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

interface PricePerCaratHintProps {
  /** Price in COP — lot cost total or an item's public price. */
  priceCOP: number | "" | undefined | null;
  /**
   * Weight to divide by. A `number` is treated as carats; a `string` is parsed
   * loosely (ct / gr / kg, see {@link parseCaratWeight}).
   */
  peso: string | number | "" | undefined | null;
  /** Leading label. Defaults to "Precio por quilate". */
  label?: string;
}

/**
 * Subtle, read-only readout of price-per-carat shown beneath a price field.
 * Auto-derived from price ÷ weight; renders nothing until both are positive
 * and the weight resolves to carats, so it never shows a misleading "$0 / ct".
 */
export function PricePerCaratHint({
  priceCOP,
  peso,
  label = "Precio por quilate",
}: PricePerCaratHintProps) {
  const foto = getFoto("light");
  const perCarat = pricePerCarat(priceCOP, parseCaratWeight(peso));
  if (perCarat == null) return null;

  return (
    <Box
      aria-live="polite"
      sx={{
        marginTop: "6px",
        fontSize: 11,
        color: foto.ink.tertiary,
        display: "flex",
        alignItems: "center",
        gap: "6px",
        flexWrap: "wrap",
        lineHeight: 1.5,
      }}
    >
      <Box component="span">{label}</Box>
      <Box
        component="span"
        sx={{
          fontFamily: fontFamilies.mono,
          fontVariantNumeric: "tabular-nums",
          color: foto.accent.deep,
          fontWeight: 500,
        }}
      >
        {COP_FORMATTER.format(perCarat)}
      </Box>
      <Box component="span" sx={{ color: foto.ink.mute }}>
        / ct
      </Box>
    </Box>
  );
}

export default PricePerCaratHint;
