import { useEffect, useId, useRef, useState } from "react";
import { Box } from "@mui/material";
import { ChevronDown } from "lucide-react";
import { getFoto, fontFamilies } from "../../../../design-system";
import { FieldLabel } from "./FieldLabel";
import { spanishText } from "../utils/fieldLang";

/**
 * Sentinel <option> value for the "write your own answer" entry. Picked to be
 * unlikely to collide with any real vocabulary string.
 */
const OTHER_SENTINEL = "__otro__";

interface SelectFieldProps {
  id?: string;
  label: string;
  /** Current field value. May be a vocabulary option OR a free-text custom value. */
  value: string;
  /** Canonical vocabulary suggestions. */
  options: readonly string[];
  placeholder: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  /**
   * When true (default), append an "Otra opción (escribir)…" entry to the
   * dropdown. Choosing it reveals a free-text input so the operator can save
   * an answer that isn't in `options`. Set false for closed vocabularies whose
   * values are coerced/validated downstream (e.g. calidad → normalizeCalidad).
   */
  allowOther?: boolean;
  /** Label for the write-in entry in the dropdown. */
  otherLabel?: string;
  /** Placeholder for the revealed free-text input. */
  otherPlaceholder?: string;
}

/**
 * Styled native <select> with an optional inline "escribir respuesta" escape
 * hatch. The component is controlled by `value`/`onChange`; "other mode" is
 * derived from the value so it round-trips cleanly when editing a record whose
 * stored value isn't in the current vocabulary.
 *
 * Extracted from GemaFields so the same dropdown — list + write-in — can be
 * reused across the Fotosíntesis capture sub-forms (handoff: dropdown coverage
 * gap, "Otro / escribir respuesta").
 */
export function SelectField({
  id,
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled,
  allowOther = true,
  otherLabel = "Otra opción (escribir)…",
  otherPlaceholder = "Escribir respuesta…",
}: SelectFieldProps) {
  const foto = getFoto("light");
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  const otherInputRef = useRef<HTMLInputElement | null>(null);
  // Marks the single render after the operator explicitly picks "Otra opción"
  // so the value→"" reset that follows doesn't bounce us back to list mode.
  const justPickedOther = useRef(false);

  const isKnown = (v: string): boolean =>
    (options as readonly string[]).includes(v);
  const valueIsCustom = value !== "" && !isKnown(value);

  const [otherMode, setOtherMode] = useState(valueIsCustom);

  // Keep "other mode" in sync with the external value. A known option always
  // wins back to list mode; a non-empty custom value forces write-in mode; an
  // empty value exits to list mode UNLESS the operator just picked "Otra
  // opción" this turn (in which case we stay, waiting for them to type).
  useEffect(() => {
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
  }, [value, options]);

  const selectValue = otherMode ? OTHER_SENTINEL : isKnown(value) ? value : "";

  const handleSelectChange = (next: string) => {
    if (next === OTHER_SENTINEL) {
      justPickedOther.current = true;
      setOtherMode(true);
      // Start the write-in empty unless we're already holding a custom value
      // (e.g. re-opening the write-in after editing).
      if (!valueIsCustom) onChange("");
      window.setTimeout(() => otherInputRef.current?.focus(), 30);
      return;
    }
    setOtherMode(false);
    onChange(next);
  };

  const backToList = () => {
    justPickedOther.current = false;
    setOtherMode(false);
    onChange("");
  };

  const fieldBaseSx = {
    width: "100%",
    background: foto.surfaces.inset,
    border: `1px solid ${foto.surfaces.rule}`,
    borderRadius: "9px",
    padding: "11px 14px",
    fontSize: 13.5,
    color: foto.ink.primary,
    fontFamily: fontFamilies.system,
    outline: "none",
    transition: "border-color 120ms ease, box-shadow 120ms ease",
    "&:focus": {
      borderColor: foto.accent.primary,
      boxShadow: `0 0 0 3px ${foto.accent.glow}`,
    },
    "::placeholder": {
      color: foto.ink.mute,
    },
  } as const;

  const selectSx = {
    ...fieldBaseSx,
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    paddingRight: "38px",
    cursor: disabled ? "not-allowed" : "pointer",
    backgroundImage: "none",
  } as const;

  return (
    <Box>
      <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
      <Box sx={{ position: "relative" }}>
        <Box
          component="select"
          id={fieldId}
          value={selectValue}
          disabled={disabled}
          onChange={(e) =>
            handleSelectChange((e.target as HTMLSelectElement).value)
          }
          sx={selectSx}
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
          {allowOther ? (
            <option value={OTHER_SENTINEL}>{otherLabel}</option>
          ) : null}
        </Box>
        <Box
          sx={{
            position: "absolute",
            right: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            color: foto.ink.tertiary,
            display: "flex",
          }}
          aria-hidden="true"
        >
          <ChevronDown size={16} strokeWidth={1.6} />
        </Box>
      </Box>

      {allowOther && otherMode ? (
        <Box sx={{ marginTop: "8px" }}>
          <Box
            component="input"
            ref={otherInputRef}
            type="text"
            value={value}
            disabled={disabled}
            placeholder={otherPlaceholder}
            aria-label={`${label} — escribir respuesta`}
            {...spanishText}
            onChange={(e) => onChange((e.target as HTMLInputElement).value)}
            sx={fieldBaseSx}
          />
          <Box
            component="button"
            type="button"
            onClick={backToList}
            disabled={disabled}
            sx={{
              marginTop: "6px",
              background: "transparent",
              border: "none",
              padding: 0,
              fontFamily: fontFamilies.system,
              fontSize: 11,
              fontWeight: 600,
              color: foto.accent.deep,
              cursor: disabled ? "not-allowed" : "pointer",
              "&:hover": { color: foto.accent.primary },
            }}
          >
            ← Elegir de la lista
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}

export default SelectField;
