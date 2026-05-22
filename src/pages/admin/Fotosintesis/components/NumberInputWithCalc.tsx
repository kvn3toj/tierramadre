import { useId } from "react";
import { Box } from "@mui/material";
import { getFoto, fontFamilies } from "../../../../design-system";

interface NumberInputWithCalcProps {
  value: number | "";
  onChange: (next: number | "") => void;
  /** Right-side computed text — e.g. "= $165.000 COP". */
  calcSuffix?: React.ReactNode;
  /** Accent → green suffix on accent-soft bg. Neutral → muted grey. */
  calcVariant?: "accent" | "neutral";
  placeholder?: string;
  step?: number;
  min?: number;
  max?: number;
  ariaLabel?: string;
  id?: string;
  /** Disable input — used during sync errors. */
  disabled?: boolean;
}

/**
 * Number input with a sibling computed-value suffix shown to the right
 * (handoff §3.7). When `calcVariant === "accent"` the suffix gets the soft
 * emerald wash; otherwise it's a muted grey hint.
 */
export function NumberInputWithCalc({
  value,
  onChange,
  calcSuffix,
  calcVariant = "neutral",
  placeholder,
  step = 0.1,
  min,
  max,
  ariaLabel,
  id,
  disabled = false,
}: NumberInputWithCalcProps) {
  const foto = getFoto("light");
  const fallbackId = useId();
  const inputId = id ?? fallbackId;

  const suffixBg =
    calcVariant === "accent" ? foto.accent.soft : foto.surfaces.inset;
  const suffixColor =
    calcVariant === "accent" ? foto.accent.deep : foto.ink.tertiary;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "stretch",
        background: foto.surfaces.inset,
        border: `1px solid ${foto.surfaces.rule}`,
        borderRadius: "9px",
        overflow: "hidden",
        "&:focus-within": {
          borderColor: foto.accent.primary,
          boxShadow: `0 0 0 3px ${foto.accent.glow}`,
        },
        transition: "border-color 120ms ease, box-shadow 120ms ease",
      }}
    >
      <Box
        component="input"
        id={inputId}
        type="number"
        inputMode="decimal"
        aria-label={ariaLabel}
        value={value}
        step={step}
        min={min}
        max={max}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          const raw = (e.target as HTMLInputElement).value;
          if (raw === "") {
            onChange("");
            return;
          }
          const parsed = Number(raw);
          if (!Number.isNaN(parsed)) onChange(parsed);
        }}
        sx={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          padding: "12px 14px",
          fontFamily: fontFamilies.mono,
          fontVariantNumeric: "tabular-nums",
          fontSize: 14,
          color: foto.ink.primary,
          letterSpacing: "-0.005em",
          minWidth: 0,
          "::placeholder": {
            color: foto.ink.mute,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif',
          },
          // hide native spinners
          "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button": {
            WebkitAppearance: "none",
            margin: 0,
          },
          MozAppearance: "textfield",
        }}
      />
      {calcSuffix ? (
        <Box
          aria-hidden
          sx={{
            display: "flex",
            alignItems: "center",
            padding: "0 14px",
            background: suffixBg,
            color: suffixColor,
            fontFamily: fontFamilies.mono,
            fontVariantNumeric: "tabular-nums",
            fontSize: 12.5,
            fontWeight: 500,
            borderLeft: `1px solid ${foto.surfaces.rule}`,
          }}
        >
          {calcSuffix}
        </Box>
      ) : null}
    </Box>
  );
}

export default NumberInputWithCalc;
