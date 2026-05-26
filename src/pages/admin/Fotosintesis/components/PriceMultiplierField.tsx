import { useId } from "react";
import { Box, Slider } from "@mui/material";

import { getFoto, fontFamilies } from "../../../../design-system";
import { FieldLabel } from "./FieldLabel";
import { NumberInputWithCalc } from "./NumberInputWithCalc";
import {
  MIN_MULTIPLIER,
  MAX_MULTIPLIER,
  MULTIPLIER_STEP,
  clampMultiplier,
  priceFromMultiplier,
  multiplierFromPrice,
  formatMultiplier,
} from "../utils/priceMultiplier";

interface PriceMultiplierFieldProps {
  /** Uppercase label, e.g. "Precio embajador". */
  label: string;
  /** Right-aligned italic hint on the label row. */
  optional?: string;
  /** The item's base cost — what the multiplier scales. */
  baseCOP: number;
  /** Slider position used when no price is set yet. */
  defaultMultiplier?: number;
  /** Current committed price (COP) or "" when unset. */
  value: number | "";
  onChange: (next: number | "") => void;
  ariaLabel?: string;
}

/**
 * A price tier presented as an x1–x4 multiplier slider over the item's base
 * cost, paired with the editable number field. Dragging the slider auto-fills
 * the price (`base × multiplier`, rounded to the nearest 1.000); typing in the
 * field moves the slider back to the matching position. The readout shows the
 * true ratio — so a legacy price above x4 stays honest while the slider thumb
 * rests at the cap.
 *
 * When the item has no usable base cost the slider is hidden and only the raw
 * number field remains.
 */
export function PriceMultiplierField({
  label,
  optional,
  baseCOP,
  defaultMultiplier = 3,
  value,
  onChange,
  ariaLabel,
}: PriceMultiplierFieldProps) {
  const foto = getFoto("light");
  const sliderId = useId();
  const hasBase = baseCOP > 0;

  const trueRatio = multiplierFromPrice(baseCOP, value);
  const readoutMultiplier = trueRatio ?? defaultMultiplier;
  const sliderMultiplier = clampMultiplier(readoutMultiplier);

  const handleSlider = (_event: Event, next: number | number[]) => {
    const multiplier = Array.isArray(next) ? (next[0] ?? MIN_MULTIPLIER) : next;
    onChange(priceFromMultiplier(baseCOP, multiplier));
  };

  return (
    <Box>
      <FieldLabel htmlFor={sliderId} optional={optional}>
        {label}
      </FieldLabel>

      {hasBase ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            marginBottom: "8px",
            paddingLeft: "2px",
            // Let the row shrink below the slider's intrinsic size so the rail
            // never spills past its grid cell into the neighbouring column.
            minWidth: 0,
          }}
        >
          <Slider
            id={sliderId}
            value={sliderMultiplier}
            onChange={handleSlider}
            min={MIN_MULTIPLIER}
            max={MAX_MULTIPLIER}
            step={MULTIPLIER_STEP}
            marks
            aria-label={`Multiplicador · ${label}`}
            sx={{
              flex: 1,
              // A flex item keeps `min-width: auto` by default and refuses to
              // shrink below its content; 0 lets the slider track the cell width.
              minWidth: 0,
              color: foto.accent.primary,
              height: 4,
              padding: "12px 0",
              "& .MuiSlider-rail": {
                opacity: 1,
                backgroundColor: foto.surfaces.edgeStrong,
              },
              "& .MuiSlider-track": { border: "none" },
              "& .MuiSlider-thumb": {
                width: 15,
                height: 15,
                backgroundColor: "#fff",
                border: `2px solid ${foto.accent.primary}`,
                "&:hover, &.Mui-focusVisible": {
                  boxShadow: `0 0 0 6px ${foto.accent.glow}`,
                },
                "&.Mui-active": { boxShadow: `0 0 0 8px ${foto.accent.glow}` },
              },
              "& .MuiSlider-mark": {
                backgroundColor: foto.surfaces.rule,
                width: 1,
                height: 5,
              },
              "& .MuiSlider-markActive": {
                backgroundColor: foto.accent.soft,
              },
            }}
          />
          <Box
            aria-hidden
            sx={{
              minWidth: 38,
              textAlign: "right",
              fontFamily: fontFamilies.mono,
              fontVariantNumeric: "tabular-nums",
              fontSize: 12.5,
              fontWeight: 700,
              color: foto.accent.deep,
            }}
          >
            {formatMultiplier(readoutMultiplier)}
          </Box>
        </Box>
      ) : null}

      <NumberInputWithCalc
        value={value}
        onChange={onChange}
        step={1000}
        min={0}
        format="currency"
        ariaLabel={ariaLabel ?? label}
      />
    </Box>
  );
}

export default PriceMultiplierField;
