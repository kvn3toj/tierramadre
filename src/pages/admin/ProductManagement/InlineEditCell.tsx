/**
 * InlineEditCell — click-to-edit row primitive.
 *
 * Display state shows the formatted value; clicking swaps to a focused
 * input. Pressing Enter (or blurring) commits via `onSave`; Escape
 * cancels and restores the prior raw value.
 *
 * The component stops click propagation in both states so editing a
 * cell does NOT also trigger the row's `onSelect` handler (which would
 * otherwise mount the Bandeja). See `InventoryRow`'s row click for the
 * upstream listener.
 *
 * Spec: docs/superpowers/specs/2026-05-06-fotosintesis-admin-redesign-design.md
 */

import { Box, ButtonBase } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { fontFamilies, type FotoTokens } from "../../../design-system";

const SANS = fontFamilies.system;

interface InlineEditCellProps {
  foto: FotoTokens;
  /** Display value (formatted). */
  display: string;
  /** Raw value passed to onSave. */
  rawValue: string;
  /** Validate + transform on save; throw to reject. */
  parse: (input: string) => string | number | null;
  onSave: (next: string | number | null) => Promise<void> | void;
  ariaLabel: string;
  type?: "text" | "number";
}

export function InlineEditCell({
  foto,
  display,
  rawValue,
  parse,
  onSave,
  ariaLabel,
  type = "text",
}: InlineEditCellProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(rawValue);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = async () => {
    if (!editing || busy) return;
    setBusy(true);
    try {
      const next = parse(value);
      await onSave(next);
    } finally {
      setBusy(false);
      setEditing(false);
    }
  };

  const cancel = () => {
    setValue(rawValue);
    setEditing(false);
  };

  if (!editing) {
    return (
      <ButtonBase
        data-inline-edit
        aria-label={ariaLabel}
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        disableRipple
        sx={{
          fontFamily: SANS,
          fontSize: 11,
          color: foto.ink.primary,
          textAlign: "right",
          width: "100%",
          py: 0.25,
          borderRadius: "4px",
          "&:hover": { backgroundColor: foto.surfaces.inset, cursor: "text" },
          "&:focus-visible": { outline: `2px solid ${foto.accent.primary}` },
        }}
      >
        {display || "—"}
      </ButtonBase>
    );
  }

  return (
    <Box
      component="input"
      ref={inputRef as never}
      type={type}
      value={value}
      disabled={busy}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setValue((e.target as HTMLInputElement).value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") cancel();
      }}
      onBlur={commit}
      sx={{
        fontFamily: SANS,
        fontSize: 11,
        color: foto.ink.primary,
        backgroundColor: foto.surfaces.inset,
        border: `1px solid ${foto.accent.primary}`,
        borderRadius: "4px",
        textAlign: "right",
        py: "2px",
        px: "6px",
        width: "100%",
      }}
    />
  );
}
