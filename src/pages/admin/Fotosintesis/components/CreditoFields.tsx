/**
 * Crédito + Esmereogénesis input panels for the Slice 3 Venta page.
 *
 * The Convex schema currently persists only `fechaVencimiento` and
 * `numeroCuotas` for these payment modes. `tasaInteres` (crédito) and
 * `observaciones` (esmereogénesis) are kept in component state but NOT sent
 * to `sales.create` today — they're informational helpers for the operator
 * so the printed Kardex still reflects the negotiated terms. When Maritza /
 * el contador decide the columns these should occupy in Sheets, extend the
 * schema in a follow-up PR.
 */

import { useMemo } from "react";
import { Box } from "@mui/material";
import { getFoto, fontFamilies } from "../../../../design-system";
import { FieldLabel } from "./FieldLabel";
import { spanishText } from "../utils/fieldLang";

function formatCop(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

// ─── Crédito ──────────────────────────────────────────────────────────────

interface CreditoFieldsProps {
  fechaVencimiento: string;
  setFechaVencimiento: (v: string) => void;
  numeroCuotas: number;
  setNumeroCuotas: (v: number) => void;
  /** Optional % (e.g., 1.5 means 1.5% / month). UI-only for now. */
  tasaInteres: number | "";
  setTasaInteres: (v: number | "") => void;
  /** Total COP to compute the per-cuota helper. */
  totalCop: number;
}

export function CreditoFields({
  fechaVencimiento,
  setFechaVencimiento,
  numeroCuotas,
  setNumeroCuotas,
  tasaInteres,
  setTasaInteres,
  totalCop,
}: CreditoFieldsProps) {
  const foto = getFoto("light");

  const cuotaMensual = useMemo(() => {
    if (totalCop <= 0 || numeroCuotas <= 0) return 0;
    const tasa = typeof tasaInteres === "number" ? tasaInteres / 100 : 0;
    if (tasa <= 0) return totalCop / numeroCuotas;
    // Simple interest amortization helper (informational only).
    const total = totalCop * (1 + tasa * numeroCuotas);
    return total / numeroCuotas;
  }, [totalCop, numeroCuotas, tasaInteres]);

  return (
    <Box
      sx={{
        padding: "16px 16px 18px",
        border: `1px solid ${foto.surfaces.rule}`,
        borderRadius: "11px",
        background: foto.surfaces.panel,
        marginTop: "14px",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
        gap: "14px",
      }}
    >
      <Box>
        <FieldLabel>Vencimiento ·</FieldLabel>
        <Box
          component="input"
          type="date"
          value={fechaVencimiento}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFechaVencimiento(e.target.value)
          }
          sx={inputBaseSx(foto)}
        />
      </Box>
      <Box>
        <FieldLabel>Cuotas</FieldLabel>
        <Box
          component="input"
          type="number"
          min={1}
          max={120}
          step={1}
          value={numeroCuotas}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) setNumeroCuotas(Math.max(1, Math.floor(n)));
          }}
          sx={{
            ...inputBaseSx(foto),
            fontFamily: fontFamilies.mono,
            fontVariantNumeric: "tabular-nums",
          }}
        />
      </Box>
      <Box>
        <FieldLabel>Tasa interés (%)</FieldLabel>
        <Box
          component="input"
          type="number"
          min={0}
          step={0.1}
          value={tasaInteres}
          placeholder="0"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const raw = e.target.value;
            if (raw === "") setTasaInteres("");
            else {
              const n = Number(raw);
              if (Number.isFinite(n) && n >= 0) setTasaInteres(n);
            }
          }}
          sx={{
            ...inputBaseSx(foto),
            fontFamily: fontFamilies.mono,
            fontVariantNumeric: "tabular-nums",
          }}
        />
        <Box
          sx={{
            fontSize: 11,
            color: foto.ink.tertiary,
            marginTop: "4px",
            lineHeight: 1.5,
          }}
        >
          Solo calcula la cuota; aún no se guarda.
        </Box>
      </Box>
      <Box
        sx={{
          gridColumn: "1 / -1",
          padding: "10px 13px",
          background: foto.accent.soft,
          border: `1px solid ${foto.accent.glow}`,
          borderRadius: "8px",
          fontSize: 12,
          color: foto.accent.deep,
          letterSpacing: "0.005em",
        }}
      >
        Cuota mensual estimada:{" "}
        <Box
          component="span"
          sx={{
            fontFamily: fontFamilies.mono,
            fontVariantNumeric: "tabular-nums",
            fontWeight: 600,
          }}
        >
          {formatCop(cuotaMensual)}
        </Box>{" "}
        · informativo, no se guarda en Convex.
      </Box>
    </Box>
  );
}

// ─── Esmereogénesis ───────────────────────────────────────────────────────

interface EsmereogenesisFieldsProps {
  plazoMeses: number | "";
  setPlazoMeses: (v: number | "") => void;
  numeroCuotas: number;
  setNumeroCuotas: (v: number) => void;
  observaciones: string;
  setObservaciones: (v: string) => void;
  /** Optional — when set, the field becomes required client-side. Server
   *  treats esmereogénesis identically to contado (BR-7 only fires for credito). */
  fechaVencimiento?: string;
  setFechaVencimiento?: (v: string) => void;
}

export function EsmereogenesisFields({
  plazoMeses,
  setPlazoMeses,
  numeroCuotas,
  setNumeroCuotas,
  observaciones,
  setObservaciones,
  fechaVencimiento,
  setFechaVencimiento,
}: EsmereogenesisFieldsProps) {
  const foto = getFoto("light");

  return (
    <Box
      sx={{
        padding: "16px 16px 18px",
        border: `1px solid ${foto.surfaces.rule}`,
        borderRadius: "11px",
        background: foto.surfaces.panel,
        marginTop: "14px",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        gap: "14px",
      }}
    >
      <Box>
        <FieldLabel>Plazo (meses)</FieldLabel>
        <Box
          component="input"
          type="number"
          min={1}
          max={120}
          step={1}
          value={plazoMeses}
          placeholder="12"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const raw = e.target.value;
            if (raw === "") setPlazoMeses("");
            else {
              const n = Number(raw);
              if (Number.isFinite(n) && n >= 1) setPlazoMeses(Math.floor(n));
            }
          }}
          sx={{
            ...inputBaseSx(foto),
            fontFamily: fontFamilies.mono,
            fontVariantNumeric: "tabular-nums",
          }}
        />
      </Box>
      <Box>
        <FieldLabel>Cuotas</FieldLabel>
        <Box
          component="input"
          type="number"
          min={1}
          max={120}
          step={1}
          value={numeroCuotas}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) setNumeroCuotas(Math.max(1, Math.floor(n)));
          }}
          sx={{
            ...inputBaseSx(foto),
            fontFamily: fontFamilies.mono,
            fontVariantNumeric: "tabular-nums",
          }}
        />
      </Box>
      {setFechaVencimiento ? (
        <Box sx={{ gridColumn: "1 / -1" }}>
          <FieldLabel>Vencimiento (opcional)</FieldLabel>
          <Box
            component="input"
            type="date"
            value={fechaVencimiento ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFechaVencimiento(e.target.value)
            }
            sx={inputBaseSx(foto)}
          />
        </Box>
      ) : null}
      <Box sx={{ gridColumn: "1 / -1" }}>
        <FieldLabel>Observaciones</FieldLabel>
        <Box
          component="textarea"
          rows={2}
          value={observaciones}
          {...spanishText}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setObservaciones(e.target.value)
          }
          placeholder="Condiciones acordadas, hitos del programa…"
          sx={{
            ...inputBaseSx(foto),
            resize: "none",
            minHeight: 64,
            lineHeight: 1.5,
          }}
        />
        <Box
          sx={{
            fontSize: 11,
            color: foto.ink.tertiary,
            marginTop: "4px",
            lineHeight: 1.5,
          }}
        >
          Informativo · no se guarda en Convex hasta que el contador defina la
          columna.
        </Box>
      </Box>
    </Box>
  );
}

function inputBaseSx(foto: ReturnType<typeof getFoto>) {
  return {
    border: `1px solid ${foto.surfaces.rule}`,
    borderRadius: "9px",
    background: foto.surfaces.canvas,
    padding: "11px 13px",
    fontFamily: fontFamilies.system,
    fontSize: "13.5px",
    color: foto.ink.primary,
    width: "100%",
    transition: "border-color 120ms ease, box-shadow 120ms ease",
    outline: "none",
    "&:focus": {
      borderColor: foto.accent.primary,
      boxShadow: `0 0 0 3px ${foto.accent.glow}`,
    },
    "&::placeholder": { color: foto.ink.mute },
  };
}
