import { useCallback, useId } from "react";
import { Box } from "@mui/material";
import { getFoto, fontFamilies } from "../../../../design-system";
import { FieldLabel } from "./FieldLabel";
import { NumberInputWithCalc } from "./NumberInputWithCalc";
import { ChipsInput } from "./ChipsInput";

/**
 * Joya sub-form (Fotosíntesis v2 · Slice 2).
 *
 * Slice plan §2 deliverable #2:
 *   - tipo de joya (string)
 *   - peso en gramos (number)
 *   - técnica (string)
 *   - 5 base material chip slots + "+ agregar material" up to 10 total
 *   - preponderancia (% del lote) via NumberInputWithCalc
 *   - precio público sugerido (optional)
 *
 * Materials are owned by the parent (CapturaLotePage); this component only
 * renders the chip input and bubbles add/remove. The parent decides whether
 * a new chip name should be inserted into the Convex `materials` table
 * (auto-create on commit) — keeping the side effect out of this dumb form.
 */

export interface JoyaDraft {
  nombre: string;
  tipoJoya: string;
  pesoGramos: number | "";
  tecnica: string;
  materiales: string[];
  preponderancia: number | "";
  precioPublicoCOP: number | "";
}

export const EMPTY_JOYA_DRAFT: JoyaDraft = {
  nombre: "",
  tipoJoya: "",
  pesoGramos: "",
  tecnica: "",
  materiales: [],
  preponderancia: "",
  precioPublicoCOP: "",
};

export const JOYA_MATERIAL_CAP = 10;

interface JoyaFieldsProps {
  value: JoyaDraft;
  onChange: (patch: Partial<JoyaDraft>) => void;
  /** lot.costoTotalCOP — used to compute the prep calc suffix in COP. */
  lotCostoTotalCOP: number;
  /** Helper text shown beneath preponderancia (overflow / hint). */
  preponderanciaHelper?: React.ReactNode;
  /** When true, prep helper is rendered in --err. */
  preponderanciaHelperAlert?: boolean;
  /** Disable all fields (offline / sync error). */
  disabled?: boolean;
  /** Known materials catalog — used to suggest existing names below the chip input. */
  materialsCatalog?: string[];
}

const COP_FORMATTER = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
const formatCOP = (v: number): string => COP_FORMATTER.format(v);

export function JoyaFields({
  value,
  onChange,
  lotCostoTotalCOP,
  preponderanciaHelper,
  preponderanciaHelperAlert,
  disabled = false,
  materialsCatalog = [],
}: JoyaFieldsProps) {
  const foto = getFoto("light");
  const fieldGap = "16px";

  const nombreId = useId();
  const tipoJoyaId = useId();
  const pesoId = useId();
  const tecnicaId = useId();
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
    "::placeholder": { color: foto.ink.mute },
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

  const atCap = value.materiales.length >= JOYA_MATERIAL_CAP;

  const addMaterial = useCallback(
    (name: string) => {
      if (atCap) return;
      onChange({ materiales: [...value.materiales, name] });
    },
    [value.materiales, atCap, onChange],
  );
  const removeMaterial = useCallback(
    (name: string) => {
      onChange({ materiales: value.materiales.filter((m) => m !== name) });
    },
    [value.materiales, onChange],
  );

  // Catalog suggestions: show up to 6 materials that aren't already picked,
  // sorted alphabetically. Click a chip to add it without typing.
  const suggestions = materialsCatalog
    .filter(
      (m) =>
        !value.materiales.some(
          (existing) => existing.toLowerCase() === m.toLowerCase(),
        ),
    )
    .slice(0, 6);

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "1fr", gap: fieldGap }}>
      {/* Nombre */}
      <Box>
        <FieldLabel htmlFor={nombreId}>Nombre de la joya</FieldLabel>
        <Box
          component="input"
          id={nombreId}
          type="text"
          value={value.nombre}
          placeholder="Ej. Esperanza, Aurora, Cleopatra"
          disabled={disabled}
          onChange={(e) =>
            onChange({ nombre: (e.target as HTMLInputElement).value })
          }
          sx={textInputSx}
        />
      </Box>

      {/* Tipo de joya + Peso row */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: fieldGap,
        }}
      >
        <Box>
          <FieldLabel htmlFor={tipoJoyaId} optional="anillo, dije, cadena…">
            Tipo de joya
          </FieldLabel>
          <Box
            component="input"
            id={tipoJoyaId}
            type="text"
            value={value.tipoJoya}
            placeholder="anillo"
            disabled={disabled}
            onChange={(e) =>
              onChange({ tipoJoya: (e.target as HTMLInputElement).value })
            }
            sx={textInputSx}
          />
        </Box>
        <Box>
          <FieldLabel htmlFor={pesoId} optional="gramos">
            Peso
          </FieldLabel>
          <NumberInputWithCalc
            id={pesoId}
            value={value.pesoGramos}
            onChange={(next) => onChange({ pesoGramos: next })}
            calcSuffix="g"
            calcVariant="neutral"
            placeholder="11.2"
            step={0.1}
            min={0}
            ariaLabel="Peso en gramos"
            disabled={disabled}
          />
        </Box>
      </Box>

      {/* Técnica */}
      <Box>
        <FieldLabel htmlFor={tecnicaId} optional="tejido, soldadura, calado…">
          Técnica
        </FieldLabel>
        <Box
          component="input"
          id={tecnicaId}
          type="text"
          value={value.tecnica}
          placeholder="tejido inglés"
          disabled={disabled}
          onChange={(e) =>
            onChange({ tecnica: (e.target as HTMLInputElement).value })
          }
          sx={textInputSx}
        />
      </Box>

      {/* Materiales — ChipsInput + catalog suggestions */}
      <Box>
        <FieldLabel
          optional={
            atCap
              ? "tope 10 alcanzado"
              : `hasta ${JOYA_MATERIAL_CAP}, Enter para añadir`
          }
        >
          Materiales
        </FieldLabel>
        <ChipsInput
          chips={value.materiales}
          onAdd={addMaterial}
          onRemove={removeMaterial}
          disabled={disabled || atCap}
          placeholder={
            atCap ? "Tope de 10 materiales" : "Plata 925, esmeralda Muzo…"
          }
          ariaLabel="Materiales de la joya"
        />
        {suggestions.length > 0 && !atCap ? (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginTop: "8px",
            }}
            aria-label="Materiales sugeridos"
          >
            <Box
              sx={{
                fontSize: 9,
                fontWeight: 500,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: foto.ink.tertiary,
                alignSelf: "center",
                marginRight: "4px",
              }}
            >
              Sugeridos
            </Box>
            {suggestions.map((name) => (
              <Box
                component="button"
                type="button"
                key={name}
                onClick={() => addMaterial(name)}
                disabled={disabled}
                sx={{
                  border: `1px dashed ${foto.surfaces.rule}`,
                  background: foto.surfaces.canvas,
                  color: foto.ink.secondary,
                  fontSize: 11.5,
                  padding: "3px 9px",
                  borderRadius: "6px",
                  cursor: disabled ? "not-allowed" : "pointer",
                  font: "inherit",
                  transition: "background 120ms ease, border-color 120ms ease",
                  "&:hover": disabled
                    ? undefined
                    : {
                        background: foto.accent.soft,
                        borderColor: foto.accent.primary,
                        color: foto.accent.deep,
                      },
                }}
              >
                + {name}
              </Box>
            ))}
          </Box>
        ) : null}
      </Box>

      {/* Preponderancia */}
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
          placeholder="30"
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

export default JoyaFields;
