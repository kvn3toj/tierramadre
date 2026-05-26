import { useEffect, useId, useRef, useState } from "react";
import { Box } from "@mui/material";
import { getFoto, fontFamilies } from "../../../../design-system";

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
  /**
   * When true, append an "Otro" segment that reveals a free-text input so the
   * operator can save an answer that isn't in `options`. Use only for fields
   * whose backing column accepts free text (NOT for closed enums that drive ID
   * generation or control flow). "Other mode" is derived from the value, so a
   * stored custom value round-trips when editing a record.
   */
  allowOther?: boolean;
  /** Label for the appended write-in segment. */
  otherLabel?: string;
  /** Placeholder for the revealed free-text input. */
  otherPlaceholder?: string;
  /**
   * Optional transform applied to the write-in text before it's committed.
   * Used to keep custom values safe for downstream consumers — e.g. a sede
   * code that becomes an ID prefix must be an uppercase, dash-free token.
   */
  sanitizeOther?: (raw: string) => string;
}

/** Sentinel segment value for the "write your own answer" entry. */
const OTHER_SENTINEL = "__otro__";

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
  allowOther = false,
  otherLabel = "Otro",
  otherPlaceholder = "Escribir respuesta…",
  sanitizeOther,
}: SegmentedControlProps<TValue>) {
  const foto = getFoto("light");
  const groupName = useId();
  const otherInputRef = useRef<HTMLInputElement | null>(null);
  const justPickedOther = useRef(false);

  const isKnown = (v: string): boolean => options.some((o) => o.value === v);
  const valueIsCustom = allowOther && value !== "" && !isKnown(value);
  const [otherMode, setOtherMode] = useState(valueIsCustom);

  // Keep "other mode" in sync with the external value: a known option wins back
  // to list mode, a non-empty custom value forces write-in, and an empty value
  // exits — unless the operator just picked "Otro" this turn (awaiting input).
  useEffect(() => {
    if (!allowOther) return;
    if (isKnown(value)) {
      setOtherMode(false);
    } else if (value !== "") {
      setOtherMode(true);
    } else if (justPickedOther.current) {
      justPickedOther.current = false;
    } else {
      setOtherMode(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, allowOther]);

  const renderOptions: SegmentedOption<string>[] = allowOther
    ? [...options, { value: OTHER_SENTINEL, label: otherLabel }]
    : options;

  const activeSegment = otherMode ? OTHER_SENTINEL : value;

  const handlePick = (picked: string) => {
    if (picked === OTHER_SENTINEL) {
      justPickedOther.current = true;
      setOtherMode(true);
      if (!valueIsCustom) onChange("" as TValue);
      window.setTimeout(() => otherInputRef.current?.focus(), 30);
      return;
    }
    setOtherMode(false);
    onChange(picked as TValue);
  };

  const radioGroup = (
    <Box
      role="radiogroup"
      aria-label={ariaLabel}
      sx={{
        display: "inline-flex",
        // Wrap to a second row instead of forcing the parent grid cell wider
        // (grid items default to min-width:auto). Prevents horizontal overflow
        // when an allowOther control with many options lands in a 1fr column.
        flexWrap: "wrap",
        maxWidth: "100%",
        width: block ? "100%" : "auto",
        padding: "3px",
        gap: "2px",
        background: foto.surfaces.inset,
        border: `1px solid ${foto.surfaces.edge}`,
        borderRadius: "9px",
      }}
    >
      {renderOptions.map((opt) => {
        const isActive = activeSegment === opt.value;
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
              onChange={() => handlePick(opt.value)}
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

  if (!allowOther) return radioGroup;

  return (
    <Box sx={{ display: "block", maxWidth: "100%" }}>
      {radioGroup}
      {otherMode ? (
        <Box
          component="input"
          ref={otherInputRef}
          type="text"
          value={value}
          placeholder={otherPlaceholder}
          aria-label={`${ariaLabel} — escribir respuesta`}
          onChange={(e) => {
            const raw = (e.target as HTMLInputElement).value;
            onChange((sanitizeOther ? sanitizeOther(raw) : raw) as TValue);
          }}
          sx={{
            marginTop: "8px",
            width: "100%",
            background: foto.surfaces.inset,
            border: `1px solid ${foto.surfaces.rule}`,
            borderRadius: "9px",
            padding: "10px 13px",
            fontSize: 13,
            color: foto.ink.primary,
            fontFamily: fontFamilies.system,
            outline: "none",
            transition: "border-color 120ms ease, box-shadow 120ms ease",
            "&:focus": {
              borderColor: foto.accent.primary,
              boxShadow: `0 0 0 3px ${foto.accent.glow}`,
            },
            "::placeholder": { color: foto.ink.mute },
          }}
        />
      ) : null}
    </Box>
  );
}

export default SegmentedControl;
