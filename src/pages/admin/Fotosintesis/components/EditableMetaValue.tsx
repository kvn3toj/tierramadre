import { useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import { Check, Pencil, X } from "lucide-react";
import { getFoto, fontFamilies } from "../../../../design-system";

interface EditableMetaValueProps {
  value: number;
  /** Display formatter — e.g. formatCOP, or `${n}`. */
  format: (n: number) => string;
  onCommit: (next: number) => Promise<void> | void;
  /** Disable the edit affordance (e.g. lot is not 'abierto'). */
  disabled?: boolean;
  /** Helper text shown under the editor while open. */
  helper?: React.ReactNode;
  /** Min / max guards (client-side; server re-validates). */
  min?: number;
  max?: number;
  step?: number;
  ariaLabel?: string;
  /** Treat numbers like prices (no decimals) vs counts. */
  variant?: "currency" | "count";
}

/**
 * Inline-edit primitive for the lot meta card rows. Click the value (or
 * press Enter while focused) → number input + ✓/× buttons. Designed to
 * sit inside an existing right-aligned mono cell without changing its
 * width when idle.
 */
export function EditableMetaValue({
  value,
  format,
  onCommit,
  disabled = false,
  helper,
  min,
  max,
  step,
  ariaLabel,
  variant = "currency",
}: EditableMetaValueProps) {
  const foto = getFoto("light");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(String(value));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset draft when the underlying value changes while the editor is closed.
  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const open = () => {
    if (disabled) return;
    setDraft(String(value));
    setError(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setDraft(String(value));
    setError(null);
  };

  const commit = async () => {
    const next = Number(draft);
    if (!Number.isFinite(next)) {
      setError("Número inválido");
      return;
    }
    if (typeof min === "number" && next < min) {
      setError(`Mínimo ${min}`);
      return;
    }
    if (typeof max === "number" && next > max) {
      setError(`Máximo ${max}`);
      return;
    }
    if (next === value) {
      cancel();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onCommit(next);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos guardar");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          justifyContent: "flex-end",
        }}
      >
        <Box
          component="button"
          type="button"
          onClick={open}
          disabled={disabled}
          aria-label={ariaLabel ? `Editar ${ariaLabel}` : "Editar valor"}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            border: "none",
            background: "transparent",
            padding: "2px 4px",
            margin: "-2px -4px",
            borderRadius: "5px",
            color: "inherit",
            fontFamily: "inherit",
            fontSize: "inherit",
            fontWeight: "inherit",
            cursor: disabled ? "default" : "pointer",
            transition: "background 100ms ease",
            "&:hover": disabled ? undefined : { background: foto.accent.soft },
            "&:focus-visible": {
              outline: "none",
              boxShadow: `0 0 0 2px ${foto.accent.glow}`,
            },
          }}
        >
          <Box component="span">{format(value)}</Box>
          {!disabled ? (
            <Pencil
              size={11}
              strokeWidth={1.8}
              aria-hidden
              style={{ opacity: 0.55 }}
            />
          ) : null}
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "4px",
      }}
    >
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "stretch",
          gap: "4px",
        }}
      >
        <Box
          component="input"
          ref={inputRef}
          type="number"
          inputMode={variant === "count" ? "numeric" : "decimal"}
          value={draft}
          step={step ?? (variant === "currency" ? 1000 : 1)}
          min={min}
          max={max}
          aria-label={ariaLabel ?? "Editar valor"}
          onChange={(e) => setDraft((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void commit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          sx={{
            width: 120,
            background: foto.surfaces.canvas,
            border: `1px solid ${foto.accent.primary}`,
            borderRadius: "6px",
            padding: "4px 8px",
            fontFamily: fontFamilies.mono,
            fontVariantNumeric: "tabular-nums",
            fontSize: 12,
            fontWeight: 500,
            color: foto.ink.primary,
            textAlign: "right",
            outline: "none",
            "&:focus": {
              boxShadow: `0 0 0 3px ${foto.accent.glow}`,
            },
          }}
        />
        <Box
          component="button"
          type="button"
          onClick={() => void commit()}
          disabled={saving}
          aria-label="Confirmar cambio"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 26,
            height: 26,
            border: "none",
            borderRadius: "6px",
            background: foto.accent.primary,
            color: foto.ink.inverse,
            cursor: saving ? "wait" : "pointer",
            "&:hover:not(:disabled)": { background: foto.accent.deep },
          }}
        >
          <Check size={13} strokeWidth={2} />
        </Box>
        <Box
          component="button"
          type="button"
          onClick={cancel}
          disabled={saving}
          aria-label="Cancelar edición"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 26,
            height: 26,
            border: `1px solid ${foto.surfaces.rule}`,
            borderRadius: "6px",
            background: foto.surfaces.canvas,
            color: foto.ink.secondary,
            cursor: saving ? "wait" : "pointer",
            "&:hover:not(:disabled)": { background: foto.surfaces.inset },
          }}
        >
          <X size={13} strokeWidth={2} />
        </Box>
      </Box>
      {error ? (
        <Box
          role="alert"
          sx={{
            fontSize: 10.5,
            color: foto.status.sold,
            fontFamily: fontFamilies.system,
            maxWidth: 220,
            textAlign: "right",
          }}
        >
          {error}
        </Box>
      ) : helper ? (
        <Box
          sx={{
            fontSize: 10.5,
            color: foto.ink.tertiary,
            fontFamily: fontFamilies.system,
            maxWidth: 220,
            textAlign: "right",
          }}
        >
          {helper}
        </Box>
      ) : null}
    </Box>
  );
}

export default EditableMetaValue;
