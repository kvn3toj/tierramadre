import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import { getFoto, fontFamilies } from "../../../../design-system";

/**
 * Display formatting (es-CO conventions: "." groups thousands, "," is the
 * decimal point):
 *  - `currency` / `integer` → live thousands grouping ("1.250.000"), no decimals.
 *  - `carat`                → always two decimals ("0,00", "2,50"), grouped int part.
 *  - `decimal`              → free decimals with comma separator (percentages, grams).
 */
type NumberFormat = "currency" | "carat" | "integer" | "decimal";

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
  /** Display formatting. Defaults to "decimal". */
  format?: NumberFormat;
}

const GROUP = ".";
const DECIMAL = ",";

/** Insert thousands separators into a bare digit string ("1250000" → "1.250.000"). */
const groupInteger = (digits: string): string =>
  digits.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP);

/**
 * Loose, locale-agnostic parser. Treats the *last* separator (either "." or
 * ",") as the decimal point and every earlier separator as grouping, so it
 * survives "1.250.000", "1250,5", "1250.5" and "2,50" alike.
 */
function parseLoose(raw: string): number | "" {
  const negative = /^\s*-/.test(raw);
  const body = raw.replace(/[^\d.,]/g, "");
  if (body === "") return "";
  // Decide which separator (if any) is the decimal point. A separator that
  // repeats is always grouping; otherwise the *last* one wins. So "1.250.000"
  // stays an integer, while "1.234,56" and "2.5" keep their decimals.
  const lastDot = body.lastIndexOf(".");
  const lastComma = body.lastIndexOf(",");
  const dotCount = (body.match(/\./g) ?? []).length;
  const commaCount = (body.match(/,/g) ?? []).length;
  let decIndex = -1;
  if (lastDot > lastComma && dotCount === 1) decIndex = lastDot;
  else if (lastComma > lastDot && commaCount === 1) decIndex = lastComma;
  const intPart =
    decIndex === -1
      ? body.replace(/\D/g, "")
      : body.slice(0, decIndex).replace(/\D/g, "");
  const fracPart =
    decIndex === -1 ? "" : body.slice(decIndex + 1).replace(/\D/g, "");
  if (intPart === "" && fracPart === "") return "";
  const n = Number(`${intPart || "0"}.${fracPart || "0"}`);
  if (!Number.isFinite(n)) return "";
  return negative ? -n : n;
}

/** Canonical formatted display for a committed numeric value. */
function formatValue(value: number | "", format: NumberFormat): string {
  if (value === "" || !Number.isFinite(value as number)) return "";
  const n = value as number;
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (format === "carat") {
    const [int, frac] = abs.toFixed(2).split(".");
    return `${sign}${groupInteger(int)}${DECIMAL}${frac}`;
  }
  if (format === "currency" || format === "integer") {
    return `${sign}${groupInteger(String(Math.round(abs)))}`;
  }
  // decimal — comma separator, decimals as-is. No thousands grouping here:
  // these are small magnitudes (percentages, grams) and skipping grouping keeps
  // the value perfectly round-trippable through parseLoose.
  const [int, frac = ""] = abs.toString().split(".");
  return `${sign}${int}${frac ? DECIMAL + frac : ""}`;
}

/** Caret position immediately after the `n`-th digit of `text`. */
function caretAfterNDigits(text: string, n: number): number {
  if (n <= 0) return 0;
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (/\d/.test(text[i])) {
      count++;
      if (count === n) return i + 1;
    }
  }
  return text.length;
}

/**
 * Number input with a sibling computed-value suffix shown to the right
 * (handoff §3.7). Renders as a formatted text field — a native `type="number"`
 * cannot show thousands separators — while still emitting a clean `number` to
 * the parent. When `calcVariant === "accent"` the suffix gets the soft emerald
 * wash; otherwise it's a muted grey hint.
 */
export function NumberInputWithCalc({
  value,
  onChange,
  calcSuffix,
  calcVariant = "neutral",
  placeholder,
  ariaLabel,
  id,
  disabled = false,
  format = "decimal",
}: NumberInputWithCalcProps) {
  const foto = getFoto("light");
  const fallbackId = useId();
  const inputId = id ?? fallbackId;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const focusedRef = useRef(false);
  const caretRef = useRef<number | null>(null);
  const [display, setDisplay] = useState<string>(() =>
    formatValue(value, format),
  );

  // Re-sync the visible text from the committed value whenever it changes
  // externally (draft reset, suggested-price "Usar", record load) — but never
  // while the field is focused, so we don't fight the operator's caret.
  useEffect(() => {
    if (!focusedRef.current) setDisplay(formatValue(value, format));
  }, [value, format]);

  // Restore the caret after a live-grouping reformat so inserting a digit
  // mid-number doesn't bounce the cursor to the end.
  useLayoutEffect(() => {
    if (caretRef.current != null && inputRef.current) {
      const pos = caretRef.current;
      inputRef.current.setSelectionRange(pos, pos);
      caretRef.current = null;
    }
  }, [display]);

  const grouped = format === "currency" || format === "integer";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const raw = el.value;
    if (grouped) {
      const caret = el.selectionStart ?? raw.length;
      const digitsBefore = (raw.slice(0, caret).match(/\d/g) ?? []).length;
      const digits = raw.replace(/\D/g, "");
      if (digits === "") {
        caretRef.current = 0;
        setDisplay("");
        onChange("");
        return;
      }
      const num = Number(digits);
      const formatted = groupInteger(String(num));
      caretRef.current = caretAfterNDigits(formatted, digitsBefore);
      setDisplay(formatted);
      onChange(Number.isFinite(num) ? num : "");
      return;
    }
    // carat / decimal — mirror the sanitised input while typing (so the
    // operator can freely enter the decimal part); canonical formatting is
    // applied on blur.
    const sanitized = raw.replace(/[^\d.,-]/g, "");
    setDisplay(sanitized);
    onChange(parseLoose(sanitized));
  };

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
        ref={inputRef}
        id={inputId}
        type="text"
        inputMode={grouped ? "numeric" : "decimal"}
        autoComplete="off"
        aria-label={ariaLabel}
        value={display}
        placeholder={placeholder}
        disabled={disabled}
        onChange={handleChange}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onBlur={() => {
          focusedRef.current = false;
          setDisplay(formatValue(value, format));
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
