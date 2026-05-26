import { useMemo, type InputHTMLAttributes, type KeyboardEvent } from "react";
import { Box } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

type FieldLangProps = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  "lang" | "spellCheck" | "autoCapitalize" | "autoComplete"
>;

interface InlineSuggestInputProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  /** Vocabulary to complete from. The first case-insensitive prefix match wins. */
  suggestions: readonly string[];
  placeholder?: string;
  disabled?: boolean;
  /** Muted colour for the ghost suffix — pass the field's placeholder ink. */
  ghostColor: string;
  /** Shared text-input recipe (background, border, padding, font, focus ring). */
  sx?: SxProps<Theme>;
  /** Native lang/spell-check preset, spread onto the editable input. */
  fieldLang?: FieldLangProps;
  "aria-label"?: string;
}

/**
 * Text input with inline "ghost text" autocomplete: as the operator types, the
 * unaccepted remainder of the best vocabulary match trails the cursor in muted
 * ink (Gmail Smart Compose / shell autosuggest style). Accept the whole word
 * with **Tab**, or **→ / End** when the cursor is at the line end — otherwise
 * keep free-typing, the value is never constrained to the list.
 *
 * Replaces the native `<datalist>` dropdown, which renders inconsistently (and
 * not at all on iOS Safari). Implemented as two stacked `<input>`s so the text
 * lines up pixel-for-pixel: a non-interactive mirror underneath carries the
 * field chrome and paints `<typed><ghost suffix>` in the ghost colour; the real
 * input on top is transparent and paints the typed text in regular ink, so the
 * suffix peeks out exactly where the typing stops.
 */
export function InlineSuggestInput({
  id,
  value,
  onValueChange,
  suggestions,
  placeholder,
  disabled = false,
  ghostColor,
  sx,
  fieldLang,
  "aria-label": ariaLabel,
}: InlineSuggestInputProps) {
  const match = useMemo(() => {
    if (disabled || !value) return "";
    const lower = value.toLowerCase();
    const hit = suggestions.find((s) => {
      const sl = s.toLowerCase();
      return sl.startsWith(lower) && sl !== lower;
    });
    return hit ?? "";
  }, [disabled, value, suggestions]);

  const ghostSuffix = match ? match.slice(value.length) : "";

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!ghostSuffix) return;
    const el = e.currentTarget;
    const atEnd =
      el.selectionStart === value.length && el.selectionEnd === value.length;
    if (
      e.key === "Tab" ||
      ((e.key === "ArrowRight" || e.key === "End") && atEnd)
    ) {
      e.preventDefault();
      onValueChange(match);
    }
  };

  const base = sx as Record<string, unknown> | undefined;

  return (
    <Box sx={{ position: "relative", width: "100%" }}>
      {/* Mirror: field chrome + ghost text. Never focusable or interactive. */}
      <Box
        component="input"
        aria-hidden
        tabIndex={-1}
        readOnly
        disabled={disabled}
        value={value + ghostSuffix}
        spellCheck={false}
        sx={
          {
            ...base,
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            color: ghostColor,
            "&:focus": { boxShadow: "none" },
          } as SxProps<Theme>
        }
      />
      {/* Real input: transparent chrome so the mirror shows through. */}
      <Box
        component="input"
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-autocomplete="inline"
        {...fieldLang}
        onChange={(e) => onValueChange((e.target as HTMLInputElement).value)}
        onKeyDown={handleKeyDown}
        sx={
          {
            ...base,
            position: "relative",
            background: "transparent",
            backgroundColor: "transparent",
            borderColor: "transparent",
          } as SxProps<Theme>
        }
      />
    </Box>
  );
}
