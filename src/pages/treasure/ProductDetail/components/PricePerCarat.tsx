/**
 * PricePerCarat Component
 *
 * Shows the price-per-carat (/ct) line beneath the main price on the detail
 * page. A secondary, quiet figure — the headline stays the total price.
 *
 * Correctness rules:
 *  - R2: the per-carat figure is computed from the BASE COP price
 *    (precioCOP / carats via `pricePerCaratCOP`) and passed through the currency
 *    `convertPrice` EXACTLY ONCE before formatting. `convertPrice` multiplies by
 *    the x2/x3/x4 multiplier and is NOT idempotent, so we never feed it an
 *    already-converted value.
 *  - R6: only render /ct when it is meaningful —
 *      • peso is numeric carats (`pricePerCaratCOP` returns null for jewelry
 *        strings like "Plata"/"Oro 18k"),
 *      • carats > 0 (the helper guards divide-by-zero),
 *      • cantidad === 1 — a bundle/lote price ÷ per-piece carats is meaningless,
 *        so we suppress it for multi-piece rows.
 *  - PriceShareContext gating (provider/guest/preference) is respected; the
 *    parent only mounts this inside the `shouldShowPrices` block, and we re-check
 *    here as a guard.
 *
 * Absent-safe: returns null whenever a per-carat figure doesn't apply, so it
 * never adds an empty line or causes layout shift (anti-blinking rules).
 */

import React from "react";
import { Typography } from "@mui/material";
import { useCurrency } from "../../../../contexts/CurrencyContext";
import { usePriceShare } from "../../../../contexts/PriceShareContext";
import {
  pricePerCaratCOP,
  formatFullCurrency,
} from "../../../../utils/formatting";
import { iosSemanticColors } from "../../../../design-system";

interface PricePerCaratProps {
  /** Base COP price of the piece (`product.precioCOP`). */
  precioCOP: number;
  /** Peso field — numeric for gems, descriptive string for jewelry. */
  peso: string | number;
  /** Piece count. /ct is only meaningful for a single piece (cantidad === 1). */
  cantidad: number;
}

export const PricePerCarat: React.FC<PricePerCaratProps> = ({
  precioCOP,
  peso,
  cantidad,
}) => {
  const { currency, convertPrice } = useCurrency();
  const { shouldShowPrices } = usePriceShare();

  // R6: a per-carat figure is meaningless for a bundle/multi-piece row.
  if (cantidad !== 1) return null;
  // Provider/guest/preference gating (re-check; parent also gates).
  if (!shouldShowPrices) return null;

  // R2 + R6: compute /ct in COP first (null for jewelry / carats<=0 / no price),
  // THEN convert exactly once.
  const ppcCOP = pricePerCaratCOP(precioCOP, peso);
  if (ppcCOP === null) return null;

  const label = `${formatFullCurrency(convertPrice(ppcCOP), currency)} / ct`;

  return (
    <Typography
      sx={(theme) => ({
        fontSize: "13px",
        fontWeight: 400,
        color:
          iosSemanticColors.secondaryLabel[
            theme.palette.mode === "dark" ? "dark" : "light"
          ],
        letterSpacing: "-0.01em",
        mt: 0.5,
        fontFeatureSettings: '"tnum"',
      })}
    >
      {label}
    </Typography>
  );
};

export default PricePerCarat;
