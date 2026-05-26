import {
  useId,
  useMemo,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from "react";
import { Box } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { getFoto, fontFamilies } from "../../../../design-system";

type FieldLangProps = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  "lang" | "spellCheck" | "autoCapitalize" | "autoComplete"
>;

const MAX_OPTIONS = 8;

interface SuggestInputProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  /** Vocabulary offered below the field. Prefix matches rank above substring ones. */
  suggestions: readonly string[];
  placeholder?: string;
  disabled?: boolean;
  /** Shared text-input recipe (background, border, padding, font, focus ring). */
  sx?: SxProps<Theme>;
  /** Native lang/spell-check preset, spread onto the input. */
  fieldLang?: FieldLangProps;
  "aria-label"?: string;
}

/**
 * Text input with a tap-/click-able suggestion list that drops **below** the
 * field. As the operator types, the vocabulary is filtered (prefix matches
 * first, then substring matches) and the options appear in a floating panel;
 * focusing an empty field reveals the whole list. Selecting an option fills the
 * field, but free-typing is never constrained to the list.
 *
 * Replaces the native `<datalist>` dropdown, which renders inconsistently (and
 * not at all on iOS Safari). Colours are derived from the Fotosíntesis `foto`
 * tokens so the panel matches the surrounding form chrome.
 */
export function SuggestInput({
  id,
  value,
  onValueChange,
  suggestions,
  placeholder,
  disabled = false,
  sx,
  fieldLang,
  "aria-label": ariaLabel,
}: SuggestInputProps) {
  const foto = getFoto("light");
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return suggestions.slice(0, MAX_OPTIONS);
    const starts: string[] = [];
    const contains: string[] = [];
    for (const s of suggestions) {
      const sl = s.toLowerCase();
      if (sl.startsWith(q)) starts.push(s);
      else if (sl.includes(q)) contains.push(s);
    }
    return [...starts, ...contains].slice(0, MAX_OPTIONS);
  }, [value, suggestions]);

  // Hide the panel once the typed value already equals the only remaining match.
  const onlyExactMatch =
    matches.length === 1 &&
    matches[0].toLowerCase() === value.trim().toLowerCase();
  const showList = open && !disabled && matches.length > 0 && !onlyExactMatch;

  const select = (option: string) => {
    onValueChange(option);
    setOpen(false);
    setHighlight(-1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!showList) {
        setOpen(true);
        return;
      }
      setHighlight((h) => Math.min(h + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (showList && highlight >= 0) {
        e.preventDefault();
        select(matches[highlight]);
      }
    } else if (e.key === "Escape") {
      if (showList) {
        e.stopPropagation();
        setOpen(false);
        setHighlight(-1);
      }
    }
  };

  return (
    <Box sx={{ position: "relative", width: "100%" }}>
      <Box
        component="input"
        id={id}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          showList && highlight >= 0
            ? `${listboxId}-opt-${highlight}`
            : undefined
        }
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        {...fieldLang}
        onChange={(e) => {
          onValueChange((e.target as HTMLInputElement).value);
          setOpen(true);
          setHighlight(-1);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        sx={sx}
      />
      {showList && (
        <Box
          role="listbox"
          id={listboxId}
          sx={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 40,
            background: foto.surfaces.canvas,
            border: `1px solid ${foto.surfaces.rule}`,
            borderRadius: "9px",
            boxShadow: "0 8px 24px rgba(11, 16, 14, 0.14)",
            maxHeight: 224,
            overflowY: "auto",
            padding: "4px",
          }}
        >
          {matches.map((option, i) => (
            <Box
              key={option}
              id={`${listboxId}-opt-${i}`}
              role="option"
              aria-selected={i === highlight}
              // Keep focus on the input so onBlur doesn't fire before the click.
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => select(option)}
              sx={{
                padding: "9px 12px",
                borderRadius: "6px",
                fontSize: 13.5,
                fontFamily: fontFamilies.system,
                color: foto.ink.primary,
                cursor: "pointer",
                background: i === highlight ? foto.accent.soft : "transparent",
                transition: "background 100ms ease",
              }}
            >
              {option}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
