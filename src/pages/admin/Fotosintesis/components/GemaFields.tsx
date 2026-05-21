import { useId } from "react";
import { Box } from "@mui/material";
import { getFoto, fontFamilies } from "../../../../design-system";
import { FieldLabel } from "./FieldLabel";
import { NumberInputWithCalc } from "./NumberInputWithCalc";
import { SegmentedControl } from "./SegmentedControl";

export type GemaCalidad = "AAA" | "AA" | "A" | "Comercial";

/**
 * State for the gem sub-form. Lives in the parent (CapturaLotePage) so we can
 * snapshot it for ⌘D duplicate and clear it on "guardar y siguiente". Peso is
 * a string because Maritza sometimes writes "Plata" or "fragmento" instead of
 * a number — we stuff it into `productInventory.peso` verbatim.
 */
export interface GemaDraft {
  nombre: string;
  peso: string;
  color: string;
  calidad: GemaCalidad;
  procedencia: string;
  preponderancia: number | "";
  precioPublicoCOP: number | "";
}

export const EMPTY_GEMA_DRAFT: GemaDraft = {
  nombre: "",
  peso: "",
  color: "",
  calidad: "AAA",
  procedencia: "Muzo",
  preponderancia: "",
  precioPublicoCOP: "",
};

interface GemaFieldsProps {
  value: GemaDraft;
  onChange: (patch: Partial<GemaDraft>) => void;
  /** lot.costoTotalCOP — used to compute the prep calc suffix in COP. */
  lotCostoTotalCOP: number;
  /** Helper text shown beneath preponderancia (overflow / hint). */
  preponderanciaHelper?: React.ReactNode;
  /** When true, prep helper is rendered in --err. */
  preponderanciaHelperAlert?: boolean;
  /** Disable all fields (offline / sync error). */
  disabled?: boolean;
}

const COP_FORMATTER = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const formatCOP = (value: number): string => COP_FORMATTER.format(value);

const CALIDAD_OPTIONS: Array<{ value: GemaCalidad; label: string }> = [
  { value: "AAA", label: "AAA" },
  { value: "AA", label: "AA" },
  { value: "A", label: "A" },
  { value: "Comercial", label: "Comercial" },
];

/**
 * Gema sub-form rendered under the TypeSelector in CapturaLote. Slice 1 only
 * exposes gem. Joya/Insumo fields land in Slice 2 (handoff §4.2).
 *
 * The parent owns the form state; this component is dumb — value + onChange.
 */
export function GemaFields({
  value,
  onChange,
  lotCostoTotalCOP,
  preponderanciaHelper,
  preponderanciaHelperAlert,
  disabled = false,
}: GemaFieldsProps) {
  const foto = getFoto("light");
  const fieldGap = "16px";

  const nombreId = useId();
  const pesoId = useId();
  const colorId = useId();
  const procedenciaId = useId();
  const preponderanciaId = useId();
  const precioPublicoId = useId();

  // Reuse a single styled text input "recipe" to keep visual parity with
  // NumberInputWithCalc's focus ring + inset background.
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

  // Live preponderancia calc (BR-5 mirror). When the user hasn't typed yet, we
  // show "—" so the suffix isn't a misleading "$0".
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
        <FieldLabel htmlFor={nombreId}>Nombre del ítem</FieldLabel>
        <Box
          component="input"
          id={nombreId}
          type="text"
          value={value.nombre}
          placeholder="Ej. Esmeralda Cushion Verde Profundo"
          disabled={disabled}
          onChange={(e) =>
            onChange({ nombre: (e.target as HTMLInputElement).value })
          }
          sx={textInputSx}
        />
      </Box>

      {/* Peso + Color row */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: fieldGap,
        }}
      >
        <Box>
          <FieldLabel htmlFor={pesoId} optional="ct, gr o texto libre">
            Peso
          </FieldLabel>
          <Box
            component="input"
            id={pesoId}
            type="text"
            value={value.peso}
            placeholder="2.5 ct"
            disabled={disabled}
            onChange={(e) =>
              onChange({ peso: (e.target as HTMLInputElement).value })
            }
            sx={{
              ...textInputSx,
              fontFamily: fontFamilies.mono,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.005em",
            }}
          />
        </Box>
        <Box>
          <FieldLabel htmlFor={colorId}>Color</FieldLabel>
          <Box
            component="input"
            id={colorId}
            type="text"
            value={value.color}
            placeholder="Verde profundo, sandía…"
            disabled={disabled}
            onChange={(e) =>
              onChange({ color: (e.target as HTMLInputElement).value })
            }
            sx={textInputSx}
          />
        </Box>
      </Box>

      {/* Calidad segmented */}
      <Box>
        <FieldLabel>Calidad</FieldLabel>
        <SegmentedControl
          ariaLabel="Calidad de la gema"
          options={CALIDAD_OPTIONS}
          value={value.calidad}
          onChange={(next) => onChange({ calidad: next as GemaCalidad })}
        />
      </Box>

      {/* Procedencia */}
      <Box>
        <FieldLabel htmlFor={procedenciaId}>Procedencia</FieldLabel>
        <Box
          component="input"
          id={procedenciaId}
          type="text"
          value={value.procedencia}
          placeholder="Muzo, Chivor, Coscuez…"
          disabled={disabled}
          onChange={(e) =>
            onChange({ procedencia: (e.target as HTMLInputElement).value })
          }
          sx={textInputSx}
        />
      </Box>

      {/* Preponderancia — live cost calc */}
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

      {/* Precio público — optional */}
      <Box>
        <FieldLabel
          htmlFor={precioPublicoId}
          optional="opcional, se puede definir luego"
        >
          Precio público sugerido (COP)
        </FieldLabel>
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
          placeholder="0"
          step={1000}
          min={0}
          ariaLabel="Precio público en COP"
          disabled={disabled}
        />
      </Box>
    </Box>
  );
}

export default GemaFields;
