import { useId } from "react";
import { Box } from "@mui/material";
import { getFoto, fontFamilies } from "../../../../design-system";
import {
  CALIDADES,
  CALIDAD_FACTORS,
  COLORS,
  CORTES,
  DEFAULT_CALIDAD,
  PROCEDENCIAS,
  TIPOS_ESMERALDA,
  TM_MARKUP_DEFAULT,
  suggestedPrecioPublicoCOP,
  type Corte,
  type GemaCalidad,
  type TipoEsmeralda,
} from "../../../../data/vocabularies";
import { FieldLabel } from "./FieldLabel";
import { SuggestInput } from "./SuggestInput";
import { NumberInputWithCalc } from "./NumberInputWithCalc";
import { SelectField } from "./SelectField";
import { spanishText, noSpellCheck } from "../utils/fieldLang";

export type { GemaCalidad } from "../../../../data/vocabularies";

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
  cantidad: number | "";
  tipoEsmeralda: TipoEsmeralda | "";
  corte: Corte | "";
  medidasAncho: string;
  medidasAlto: string;
  medidasCono: string;
  nivelRareza: number | "";
  calificacion: number | "";
}

export const EMPTY_GEMA_DRAFT: GemaDraft = {
  nombre: "",
  peso: "",
  color: "",
  calidad: DEFAULT_CALIDAD,
  procedencia: "Boyacá",
  preponderancia: "",
  precioPublicoCOP: "",
  cantidad: 1,
  tipoEsmeralda: "",
  corte: "",
  medidasAncho: "",
  medidasAlto: "",
  medidasCono: "",
  nivelRareza: "",
  calificacion: "",
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

function ScalePicker({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: number | "";
  onChange: (next: number | "") => void;
  disabled?: boolean;
}) {
  const foto = getFoto("light");
  return (
    <Box>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Box
        id={id}
        role="group"
        aria-label={label}
        sx={{ display: "flex", gap: "6px", flexWrap: "wrap" }}
      >
        {[1, 2, 3, 4, 5, 6].map((n) => {
          const active = value === n;
          return (
            <Box
              key={n}
              component="button"
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => onChange(active ? "" : n)}
              sx={{
                minWidth: 34,
                height: 34,
                borderRadius: "8px",
                border: `1px solid ${
                  active ? foto.accent.primary : foto.surfaces.rule
                }`,
                background: active ? foto.accent.soft : foto.surfaces.inset,
                color: active ? foto.accent.deep : foto.ink.secondary,
                fontFamily: fontFamilies.mono,
                fontSize: 12,
                fontWeight: active ? 600 : 500,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.55 : 1,
              }}
            >
              {n}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

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
  const calidadId = useId();
  const procedenciaId = useId();
  const preponderanciaId = useId();
  const precioPublicoId = useId();
  const cantidadId = useId();
  const tipoEsmeraldaId = useId();
  const corteId = useId();
  const medAnchoId = useId();
  const medAltoId = useId();
  const medConoId = useId();
  const rarezaId = useId();
  const calificacionId = useId();

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

  // Quality-based public price suggestion. Only computed when we have a
  // useful costoBase — otherwise the hint stays hidden (no placeholder).
  const calidadFactor = CALIDAD_FACTORS[value.calidad] ?? 1;
  const canSuggestPrecio =
    typeof value.preponderancia === "number" &&
    value.preponderancia > 0 &&
    lotCostoTotalCOP > 0;
  const suggestedPrecio = canSuggestPrecio
    ? suggestedPrecioPublicoCOP(computedCostoBaseCOP, value.calidad)
    : 0;
  const currentPrecio =
    typeof value.precioPublicoCOP === "number" ? value.precioPublicoCOP : 0;
  const suggestionMatches =
    canSuggestPrecio && Math.abs(currentPrecio - suggestedPrecio) <= 1;

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
          {...spanishText}
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
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
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
            {...noSpellCheck}
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
          <SelectField
            id={colorId}
            label="Color"
            value={value.color}
            options={COLORS}
            placeholder="Elegir color…"
            disabled={disabled}
            vocabularyKey="color"
            onChange={(next) => onChange({ color: next })}
          />
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: fieldGap,
        }}
      >
        <SelectField
          id={tipoEsmeraldaId}
          label="Tipo de esmeralda"
          value={value.tipoEsmeralda}
          options={TIPOS_ESMERALDA}
          placeholder="Elegir tipo…"
          disabled={disabled}
          vocabularyKey="tipoEsmeralda"
          onChange={(next) =>
            onChange({ tipoEsmeralda: next as TipoEsmeralda | "" })
          }
        />
        <SelectField
          id={corteId}
          label="Corte"
          value={value.corte}
          options={CORTES}
          placeholder="Elegir corte…"
          disabled={disabled}
          vocabularyKey="corte"
          onChange={(next) => onChange({ corte: next as Corte | "" })}
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", sm: "120px 1fr 1fr 1fr" },
          gap: fieldGap,
        }}
      >
        <Box>
          <FieldLabel htmlFor={cantidadId}>Cantidad</FieldLabel>
          <NumberInputWithCalc
            id={cantidadId}
            value={value.cantidad}
            onChange={(next) => onChange({ cantidad: next })}
            placeholder="1"
            step={1}
            min={1}
            format="integer"
            ariaLabel="Cantidad de piezas"
            disabled={disabled}
            calcSuffix="pzas"
            calcVariant="neutral"
          />
        </Box>
        <Box>
          <FieldLabel htmlFor={medAnchoId} optional="mm">
            Ancho
          </FieldLabel>
          <Box
            component="input"
            id={medAnchoId}
            type="text"
            value={value.medidasAncho}
            disabled={disabled}
            placeholder="5.2"
            {...noSpellCheck}
            onChange={(e) =>
              onChange({ medidasAncho: (e.target as HTMLInputElement).value })
            }
            sx={{
              ...textInputSx,
              fontFamily: fontFamilies.mono,
            }}
          />
        </Box>
        <Box>
          <FieldLabel htmlFor={medAltoId} optional="mm">
            Alto
          </FieldLabel>
          <Box
            component="input"
            id={medAltoId}
            type="text"
            value={value.medidasAlto}
            disabled={disabled}
            placeholder="7.1"
            {...noSpellCheck}
            onChange={(e) =>
              onChange({ medidasAlto: (e.target as HTMLInputElement).value })
            }
            sx={{
              ...textInputSx,
              fontFamily: fontFamilies.mono,
            }}
          />
        </Box>
        <Box>
          <FieldLabel htmlFor={medConoId} optional="mm">
            Cono
          </FieldLabel>
          <Box
            component="input"
            id={medConoId}
            type="text"
            value={value.medidasCono}
            disabled={disabled}
            placeholder="4.0"
            {...noSpellCheck}
            onChange={(e) =>
              onChange({ medidasCono: (e.target as HTMLInputElement).value })
            }
            sx={{
              ...textInputSx,
              fontFamily: fontFamilies.mono,
            }}
          />
        </Box>
      </Box>

      {/* Calidad — 19 vocabularies + write-in for grades not yet catalogued */}
      <SelectField
        id={calidadId}
        label="Calidad"
        value={value.calidad}
        options={CALIDADES}
        placeholder="Elegir calidad…"
        disabled={disabled}
        vocabularyKey="calidad"
        onChange={(next) => onChange({ calidad: next as GemaCalidad })}
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: fieldGap,
        }}
      >
        <ScalePicker
          id={rarezaId}
          label="Nivel de rareza (1–6)"
          value={value.nivelRareza}
          onChange={(next) => onChange({ nivelRareza: next })}
          disabled={disabled}
        />
        <ScalePicker
          id={calificacionId}
          label="Calificación (1–6)"
          value={value.calificacion}
          onChange={(next) => onChange({ calificacion: next })}
          disabled={disabled}
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
            {typeof value.preponderancia === "number" &&
            value.preponderancia > 0 ? (
              <Box component="span" sx={{ marginLeft: "6px", opacity: 0.85 }}>
                · ≈ {(value.preponderancia / 10).toFixed(1)}/10 en formulario
              </Box>
            ) : null}
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
          format="currency"
          placeholder="0"
          step={1000}
          min={0}
          ariaLabel="Precio público en COP"
          disabled={disabled}
        />
        {canSuggestPrecio ? (
          <Box
            sx={{
              marginTop: "6px",
              fontSize: 11,
              color: foto.ink.tertiary,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexWrap: "wrap",
              lineHeight: 1.5,
            }}
          >
            <Box component="span">Sugerido</Box>
            <Box
              component="span"
              sx={{
                fontFamily: fontFamilies.mono,
                fontVariantNumeric: "tabular-nums",
                color: foto.accent.deep,
                fontWeight: 500,
              }}
            >
              {formatCOP(suggestedPrecio)}
            </Box>
            <Box component="span">· calidad</Box>
            <Box
              component="span"
              sx={{
                fontFamily: fontFamilies.mono,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              ×{calidadFactor.toFixed(2)}
            </Box>
            <Box component="span">· markup</Box>
            <Box
              component="span"
              sx={{
                fontFamily: fontFamilies.mono,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              ×{TM_MARKUP_DEFAULT.toFixed(1)}
            </Box>
            {!disabled && !suggestionMatches ? (
              <>
                <Box component="span">·</Box>
                <Box
                  component="button"
                  type="button"
                  onClick={() =>
                    onChange({ precioPublicoCOP: suggestedPrecio })
                  }
                  aria-label={`Usar precio sugerido ${formatCOP(suggestedPrecio)}`}
                  sx={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    fontSize: 11,
                    fontFamily: fontFamilies.system,
                    color: foto.accent.deep,
                    fontWeight: 600,
                    cursor: "pointer",
                    textDecoration: "underline",
                    textDecorationThickness: "1px",
                    textUnderlineOffset: "2px",
                    "&:hover": {
                      color: foto.accent.primary,
                    },
                  }}
                >
                  Usar
                </Box>
              </>
            ) : null}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

export default GemaFields;
