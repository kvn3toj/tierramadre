import { useId } from "react";
import { Box } from "@mui/material";
import { getFoto, fontFamilies } from "../../../../design-system";
import { FieldLabel } from "./FieldLabel";
import { NumberInputWithCalc } from "./NumberInputWithCalc";

/**
 * Insumo sub-form (Fotosíntesis v2 · Slice 2).
 *
 * Slice plan §2 deliverable #3:
 *   - cantidad (number)
 *   - costo unitario (number COP)
 *   - NO preponderancia field, NO precio público
 *
 * The server derives preponderancia from
 *   (cantidad × costoUnitario) / lot.costoTotalCOP × 100
 * so BR-2 still has a number, and `lots.close` skips BR-2 entirely for
 * insumo-only lots (see convex/lots.ts::close).
 */

export interface InsumoDraft {
  nombre: string;
  categoria: string;
  cantidad: number | "";
  costoUnitarioCOP: number | "";
}

export const EMPTY_INSUMO_DRAFT: InsumoDraft = {
  nombre: "",
  categoria: "",
  cantidad: "",
  costoUnitarioCOP: "",
};

interface InsumoFieldsProps {
  value: InsumoDraft;
  onChange: (patch: Partial<InsumoDraft>) => void;
  /** Lot.costoTotalCOP — used only to show "% del lote" hint to Maritza. */
  lotCostoTotalCOP: number;
  disabled?: boolean;
}

const COP_FORMATTER = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
const formatCOP = (v: number): string => COP_FORMATTER.format(v);

export function InsumoFields({
  value,
  onChange,
  lotCostoTotalCOP,
  disabled = false,
}: InsumoFieldsProps) {
  const foto = getFoto("light");
  const fieldGap = "16px";

  const nombreId = useId();
  const categoriaId = useId();
  const cantidadId = useId();
  const costoId = useId();

  const textInputSx = {
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
    "::placeholder": { color: foto.ink.mute },
  } as const;

  const cantidadNum = typeof value.cantidad === "number" ? value.cantidad : 0;
  const costoUnitNum =
    typeof value.costoUnitarioCOP === "number" ? value.costoUnitarioCOP : 0;
  const computedTotal = Math.round(cantidadNum * costoUnitNum);
  const lotPct =
    lotCostoTotalCOP > 0 ? (computedTotal / lotCostoTotalCOP) * 100 : 0;
  const totalSuffix =
    cantidadNum > 0 && costoUnitNum > 0
      ? `= ${formatCOP(computedTotal)}`
      : "= —";

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "1fr", gap: fieldGap }}>
      {/* Nombre */}
      <Box>
        <FieldLabel htmlFor={nombreId}>Nombre del insumo</FieldLabel>
        <Box
          component="input"
          id={nombreId}
          type="text"
          value={value.nombre}
          placeholder="Ej. cajita de cartón pequeña, bolsa pana negra"
          disabled={disabled}
          onChange={(e) =>
            onChange({ nombre: (e.target as HTMLInputElement).value })
          }
          sx={textInputSx}
        />
      </Box>

      {/* Categoría (free text) */}
      <Box>
        <FieldLabel htmlFor={categoriaId} optional="empaque, herramienta, etc.">
          Categoría
        </FieldLabel>
        <Box
          component="input"
          id={categoriaId}
          type="text"
          value={value.categoria}
          placeholder="empaque"
          disabled={disabled}
          onChange={(e) =>
            onChange({ categoria: (e.target as HTMLInputElement).value })
          }
          sx={textInputSx}
        />
      </Box>

      {/* Cantidad + Costo unitario row */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: fieldGap,
        }}
      >
        <Box>
          <FieldLabel htmlFor={cantidadId}>Cantidad</FieldLabel>
          <NumberInputWithCalc
            id={cantidadId}
            value={value.cantidad}
            onChange={(next) => onChange({ cantidad: next })}
            calcSuffix="u"
            calcVariant="neutral"
            placeholder="3"
            step={1}
            min={1}
            ariaLabel="Cantidad de unidades"
            disabled={disabled}
          />
        </Box>
        <Box>
          <FieldLabel htmlFor={costoId}>Costo unitario (COP)</FieldLabel>
          <NumberInputWithCalc
            id={costoId}
            value={value.costoUnitarioCOP}
            onChange={(next) => onChange({ costoUnitarioCOP: next })}
            calcSuffix={totalSuffix}
            calcVariant="accent"
            placeholder="5000"
            step={500}
            min={0}
            ariaLabel="Costo unitario en COP"
            disabled={disabled}
          />
        </Box>
      </Box>

      {/* Live derivation hint — shows how this maps to lote % */}
      {cantidadNum > 0 && costoUnitNum > 0 ? (
        <Box
          aria-live="polite"
          sx={{
            padding: "10px 14px",
            background: foto.surfaces.inset,
            border: `1px dashed ${foto.surfaces.edge}`,
            borderRadius: "9px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <Box
            sx={{
              fontSize: 11,
              color: foto.ink.tertiary,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              fontWeight: 500,
            }}
          >
            Total del insumo
          </Box>
          <Box
            sx={{
              fontFamily: fontFamilies.mono,
              fontVariantNumeric: "tabular-nums",
              fontSize: 13,
              color: foto.accent.deep,
              fontWeight: 600,
            }}
          >
            {formatCOP(computedTotal)}
            {lotCostoTotalCOP > 0 ? (
              <Box
                component="span"
                sx={{
                  marginLeft: "8px",
                  fontSize: 11,
                  color: foto.ink.tertiary,
                  fontWeight: 500,
                }}
              >
                · {lotPct.toFixed(1)}% del lote
              </Box>
            ) : null}
          </Box>
        </Box>
      ) : null}

      {/* Insumo-specific reassurance: BR-2 won't apply if all items are insumo */}
      <Box
        sx={{
          fontSize: 11,
          color: foto.ink.tertiary,
          lineHeight: 1.55,
          padding: "0 4px",
        }}
      >
        Los insumos no usan preponderancia: su costo se computa por cantidad ×
        unitario. Si el lote es <strong>solo</strong> insumos, no tiene que
        sumar 100% para cerrar.
      </Box>
    </Box>
  );
}

export default InsumoFields;
