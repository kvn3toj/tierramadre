import { useId } from "react";
import { Box } from "@mui/material";
import { getFoto, fontFamilies } from "../../../../design-system";
import { FieldLabel } from "./FieldLabel";
import { SuggestInput } from "./SuggestInput";
import { NumberInputWithCalc } from "./NumberInputWithCalc";
import { PricePerCaratHint } from "./PricePerCaratHint";
import { spanishText, noSpellCheck } from "../utils/fieldLang";
import { PROCEDENCIAS } from "../../../../data/vocabularies";

/** Bruto sub-form draft — unworked rough parcel. */
export interface BrutoDraft {
  nombre: string;
  pesoTotal: string;
  procedencia: string;
  cantidadEstimada: number | "";
  rendimientoEsperado: number | "";
  preponderancia: number | "";
  precioPublicoCOP: number | "";
}

export const EMPTY_BRUTO_DRAFT: BrutoDraft = {
  nombre: "",
  pesoTotal: "",
  procedencia: "Boyacá",
  cantidadEstimada: "",
  rendimientoEsperado: "",
  preponderancia: "",
  precioPublicoCOP: "",
};

interface BrutoFieldsProps {
  value: BrutoDraft;
  onChange: (patch: Partial<BrutoDraft>) => void;
  lotCostoTotalCOP: number;
  preponderanciaHelper?: React.ReactNode;
  preponderanciaHelperAlert?: boolean;
  disabled?: boolean;
}

const COP_FORMATTER = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const formatCOP = (value: number): string => COP_FORMATTER.format(value);

/** Bruto sub-form: parcel-scale weight, expected yield, no calidad. */
export function BrutoFields({
  value,
  onChange,
  lotCostoTotalCOP,
  preponderanciaHelper,
  preponderanciaHelperAlert,
  disabled = false,
}: BrutoFieldsProps) {
  const foto = getFoto("light");
  const fieldGap = "16px";

  const nombreId = useId();
  const pesoId = useId();
  const procedenciaId = useId();
  const cantidadId = useId();
  const rendimientoId = useId();
  const preponderanciaId = useId();
  const precioPublicoId = useId();

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
    "::placeholder": {
      color: foto.ink.mute,
    },
  } as const;

  const prepNumeric =
    typeof value.preponderancia === "number" ? value.preponderancia : 0;
  const computedCostoBaseCOP = Math.round(
    lotCostoTotalCOP * (prepNumeric / 100),
  );
  const prepCalcSuffix =
    value.preponderancia === ""
      ? "= —"
      : `= ${formatCOP(computedCostoBaseCOP)}`;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: fieldGap,
      }}
    >
      {/* Nombre — full width */}
      <Box>
        <FieldLabel htmlFor={nombreId}>Nombre del parcel</FieldLabel>
        <Box
          component="input"
          id={nombreId}
          type="text"
          value={value.nombre}
          placeholder="Ej. Bruto Muzo lote azul"
          disabled={disabled}
          {...spanishText}
          onChange={(e) =>
            onChange({ nombre: (e.target as HTMLInputElement).value })
          }
          sx={textInputSx}
        />
      </Box>

      {/* Peso total — free-text parcel-scale */}
      <Box>
        <FieldLabel htmlFor={pesoId} optional="kg, gr o ct">
          Peso total
        </FieldLabel>
        <Box
          component="input"
          id={pesoId}
          type="text"
          value={value.pesoTotal}
          placeholder="12 kg"
          disabled={disabled}
          {...noSpellCheck}
          onChange={(e) =>
            onChange({ pesoTotal: (e.target as HTMLInputElement).value })
          }
          sx={{
            ...textInputSx,
            fontFamily: fontFamilies.mono,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.005em",
          }}
        />
      </Box>

      {/* Procedencia */}
      <Box>
        <FieldLabel htmlFor={procedenciaId}>Procedencia</FieldLabel>
        <SuggestInput
          id={procedenciaId}
          value={value.procedencia}
          onValueChange={(procedencia) => onChange({ procedencia })}
          suggestions={PROCEDENCIAS}
          placeholder="Muzo, Chivor, Coscuez…"
          disabled={disabled}
          fieldLang={noSpellCheck}
          sx={textInputSx}
        />
      </Box>

      {/* Cantidad estimada + Rendimiento esperado — two columns */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: fieldGap,
        }}
      >
        <Box>
          <FieldLabel htmlFor={cantidadId} optional="aprox.">
            Cantidad estimada
          </FieldLabel>
          <NumberInputWithCalc
            id={cantidadId}
            value={value.cantidadEstimada}
            onChange={(next) => onChange({ cantidadEstimada: next })}
            calcSuffix="piezas"
            calcVariant="neutral"
            format="integer"
            placeholder="80"
            step={1}
            min={0}
            ariaLabel="Cantidad estimada de piezas"
            disabled={disabled}
          />
        </Box>
        <Box>
          <FieldLabel htmlFor={rendimientoId} optional="proyección">
            Rendimiento esperado
          </FieldLabel>
          <NumberInputWithCalc
            id={rendimientoId}
            value={value.rendimientoEsperado}
            onChange={(next) => onChange({ rendimientoEsperado: next })}
            calcSuffix="%"
            calcVariant="neutral"
            placeholder="65"
            step={1}
            min={0}
            max={100}
            ariaLabel="Rendimiento esperado en porcentaje"
            disabled={disabled}
          />
        </Box>
      </Box>

      {/* Preponderancia — live cost calc (identical to GemaFields) */}
      <Box>
        <FieldLabel htmlFor={preponderanciaId}>
          Preponderancia (% del lote)
        </FieldLabel>
        <NumberInputWithCalc
          id={preponderanciaId}
          value={value.preponderancia}
          onChange={(next) => onChange({ preponderancia: next })}
          calcSuffix={prepCalcSuffix}
          calcVariant="accent"
          placeholder="33"
          step={0.1}
          min={0}
          max={100}
          ariaLabel="Preponderancia en porcentaje"
          disabled={disabled}
        />
        {preponderanciaHelper ? (
          <Box
            sx={{
              marginTop: "6px",
              fontSize: 11,
              color: preponderanciaHelperAlert
                ? foto.status.sold
                : foto.ink.tertiary,
            }}
            role={preponderanciaHelperAlert ? "alert" : undefined}
            aria-live={preponderanciaHelperAlert ? "polite" : undefined}
          >
            {preponderanciaHelper}
          </Box>
        ) : null}
      </Box>

      {/* Precio base interno (sheet col L) — referencia, NO es el precio
          público. El precio que ve el cliente es el embajador, editable en el
          drawer. */}
      <Box>
        <FieldLabel
          htmlFor={precioPublicoId}
          optional="interno, no es el precio público"
        >
          Precio base interno (COP)
        </FieldLabel>
        <Box
          sx={{
            fontSize: 11,
            color: foto.ink.tertiary,
            marginTop: "-2px",
            marginBottom: "8px",
            lineHeight: 1.45,
          }}
        >
          Referencia interna de costo/precio (columna L de la hoja). No se
          publica en el catálogo: el precio que ve el público es el embajador.
        </Box>
        <NumberInputWithCalc
          id={precioPublicoId}
          value={value.precioPublicoCOP}
          onChange={(next) => onChange({ precioPublicoCOP: next })}
          calcSuffix={
            typeof value.precioPublicoCOP === "number" &&
            value.precioPublicoCOP > 0
              ? formatCOP(value.precioPublicoCOP)
              : "= —"
          }
          calcVariant="neutral"
          format="currency"
          placeholder="0"
          step={1000}
          min={0}
          ariaLabel="Precio base interno en COP"
          disabled={disabled}
        />
        <PricePerCaratHint
          priceCOP={value.precioPublicoCOP}
          peso={value.pesoTotal}
        />
      </Box>
    </Box>
  );
}

export default BrutoFields;
