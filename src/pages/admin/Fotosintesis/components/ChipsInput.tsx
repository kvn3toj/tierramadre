import { useState, type KeyboardEvent } from "react";
import { Box } from "@mui/material";
import { X as XIcon } from "lucide-react";
import { getFoto } from "../../../../design-system";

interface ChipsInputProps {
  chips: string[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
  placeholder?: string;
  /** Disable when the slice doesn't expose this feature yet. */
  disabled?: boolean;
  ariaLabel?: string;
}

/**
 * Tag-style multi-value input (handoff §3.8). Enter adds a chip, Backspace on
 * empty input deletes the last. Slice-1 stub: callers pass chips=[] so the
 * pill row is hidden; full UX (lower-cased dup-check) lands in Slice 2.
 */
export function ChipsInput({
  chips,
  onAdd,
  onRemove,
  placeholder = "Añadir…",
  disabled = false,
  ariaLabel,
}: ChipsInputProps) {
  const foto = getFoto("light");
  const [draft, setDraft] = useState("");

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const exists = chips.some((c) => c.toLowerCase() === trimmed.toLowerCase());
    if (!exists) onAdd(trimmed);
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && draft === "" && chips.length > 0) {
      e.preventDefault();
      onRemove(chips[chips.length - 1]);
    } else if (e.key === ",") {
      e.preventDefault();
      commit();
    }
  };

  return (
    <Box
      aria-label={ariaLabel}
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: "6px",
        padding: "8px 10px",
        background: foto.surfaces.inset,
        border: `1px solid ${foto.surfaces.rule}`,
        borderRadius: "9px",
        minHeight: 40,
        "&:focus-within": {
          borderColor: foto.accent.primary,
          boxShadow: `0 0 0 3px ${foto.accent.glow}`,
        },
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? "none" : "auto",
      }}
    >
      {chips.map((chip) => (
        <Box
          key={chip}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "3px 6px 3px 10px",
            borderRadius: "6px",
            background: foto.surfaces.canvas,
            border: `1px solid ${foto.surfaces.edge}`,
            fontSize: 11.5,
            color: foto.ink.primary,
          }}
        >
          {chip}
          <Box
            component="button"
            type="button"
            aria-label={`Quitar ${chip}`}
            onClick={() => onRemove(chip)}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 16,
              height: 16,
              border: "none",
              background: "transparent",
              color: foto.ink.tertiary,
              cursor: "pointer",
              borderRadius: "4px",
              padding: 0,
              "&:hover": {
                background: foto.surfaces.inset2,
                color: foto.ink.primary,
              },
            }}
          >
            <XIcon size={12} />
          </Box>
        </Box>
      ))}
      <Box
        component="input"
        type="text"
        value={draft}
        placeholder={chips.length === 0 ? placeholder : ""}
        disabled={disabled}
        onChange={(e) => setDraft((e.target as HTMLInputElement).value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        sx={{
          flex: 1,
          minWidth: 0,
          border: "none",
          background: "transparent",
          outline: "none",
          fontSize: 13,
          color: foto.ink.primary,
          padding: "3px 4px",
          "::placeholder": { color: foto.ink.mute },
        }}
      />
    </Box>
  );
}

export default ChipsInput;
