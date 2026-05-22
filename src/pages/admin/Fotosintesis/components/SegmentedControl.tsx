import { useId } from "react";
import { Box } from "@mui/material";
import { getFoto } from "../../../../design-system";

export interface SegmentedOption<TValue extends string = string> {
  value: TValue;
  label: React.ReactNode;
  /** When set, the option is rendered but cannot be selected. */
  disabled?: boolean;
}

interface SegmentedControlProps<TValue extends string = string> {
  options: SegmentedOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
  ariaLabel: string;
  /** Full width or hug to content. Defaults to hug. */
  block?: boolean;
}

/**
 * iOS-style segmented control. Built on a real <RadioGroup>-style fieldset for
 * a11y; the visible thumb is just a styled <label>. MUI's `<ToggleButtonGroup>`
 * doesn't match this aesthetic (handoff §3.5).
 */
export function SegmentedControl<TValue extends string = string>({
  options,
  value,
  onChange,
  ariaLabel,
  block = false,
}: SegmentedControlProps<TValue>) {
  const foto = getFoto("light");
  const groupName = useId();

  return (
    <Box
      role="radiogroup"
      aria-label={ariaLabel}
      sx={{
        display: "inline-flex",
        width: block ? "100%" : "auto",
        padding: "3px",
        gap: "2px",
        background: foto.surfaces.inset,
        border: `1px solid ${foto.surfaces.edge}`,
        borderRadius: "9px",
      }}
    >
      {options.map((opt) => {
        const isActive = value === opt.value;
        const inputId = `${groupName}-${opt.value}`;
        return (
          <Box
            key={opt.value}
            component="label"
            htmlFor={inputId}
            sx={{
              flex: block ? 1 : "0 0 auto",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "6px 14px",
              borderRadius: "7px",
              fontSize: 11.5,
              fontWeight: isActive ? 600 : 500,
              color: opt.disabled
                ? foto.ink.mute
                : isActive
                  ? foto.ink.primary
                  : foto.ink.secondary,
              background: isActive ? foto.surfaces.canvas : "transparent",
              boxShadow: isActive ? `0 1px 2px ${foto.surfaces.rule}` : "none",
              cursor: opt.disabled ? "not-allowed" : "pointer",
              transition: "background 120ms ease, color 120ms ease",
              userSelect: "none",
              opacity: opt.disabled ? 0.7 : 1,
            }}
          >
            <Box
              component="input"
              type="radio"
              id={inputId}
              name={groupName}
              value={opt.value}
              checked={isActive}
              disabled={opt.disabled}
              onChange={() => onChange(opt.value)}
              sx={{
                position: "absolute",
                opacity: 0,
                pointerEvents: "none",
                width: 0,
                height: 0,
              }}
            />
            {opt.label}
          </Box>
        );
      })}
    </Box>
  );
}

export default SegmentedControl;
