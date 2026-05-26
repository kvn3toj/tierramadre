import { useId } from "react";
import { Box } from "@mui/material";
import {
  Lightbulb,
  Package,
  Search,
  Sparkles,
  Tag,
  Wrench,
} from "lucide-react";
import { getFoto, fontFamilies } from "../../../../design-system";
import { FieldLabel } from "./FieldLabel";
import { NumberInputWithCalc } from "./NumberInputWithCalc";
import { spanishText } from "../utils/fieldLang";

/**
 * Insumo sub-form draft — a workshop supply (loupe, cleaner, tool, gadget,
 * packaging). Deliberately minimal: a name, a category, how many, its share of
 * the lot cost, and an optional purchase cost. Everything maps onto columns the
 * inventory already has (`categoria`, `cantidad`, `precioPublicoCOP`), so no
 * schema change is needed.
 */
export interface InsumoDraft {
  nombre: string;
  categoria: string;
  cantidad: number | "";
  preponderancia: number | "";
  precioPublicoCOP: number | "";
}

export const EMPTY_INSUMO_DRAFT: InsumoDraft = {
  nombre: "",
  categoria: "",
  cantidad: "",
  preponderancia: "",
  precioPublicoCOP: "",
};

interface CategoriaOption {
  value: string;
  label: string;
  hint: string;
  Icon: typeof Wrench;
}

/** Quick-select categories. The `value` is stored verbatim in `categoria`. */
const INSUMO_CATEGORIAS: CategoriaOption[] = [
  { value: "Óptica", label: "Óptica", hint: "lupas, visores", Icon: Search },
  {
    value: "Limpieza",
    label: "Limpieza",
    hint: "limpiadores, paños",
    Icon: Sparkles,
  },
  {
    value: "Herramientas",
    label: "Herramientas",
    hint: "pinzas, alicates",
    Icon: Wrench,
  },
  {
    value: "Empaque",
    label: "Empaque",
    hint: "estuches, cajas",
    Icon: Package,
  },
  {
    value: "Gadgets",
    label: "Gadgets",
    hint: "básculas, linternas UV",
    Icon: Lightbulb,
  },
  { value: "Otro", label: "Otro", hint: "cualquier otro", Icon: Tag },
];

interface InsumoFieldsProps {
  value: InsumoDraft;
  onChange: (patch: Partial<InsumoDraft>) => void;
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

/** Compact icon-tile category picker, styled like the capture TypeSelector. */
function CategoriaPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const foto = getFoto("light");
  const groupName = useId();

  return (
    <Box
      component="fieldset"
      sx={{ border: "none", padding: 0, margin: 0, display: "block" }}
    >
      <Box
        component="legend"
        sx={{
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: foto.ink.tertiary,
          marginBottom: "6px",
          padding: 0,
        }}
      >
        Categoría
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            sm: "repeat(3, minmax(0, 1fr))",
          },
          gap: "8px",
        }}
      >
        {INSUMO_CATEGORIAS.map((opt) => {
          const isActive = value === opt.value;
          const inputId = `${groupName}-${opt.value}`;
          const Glyph = opt.Icon;
          return (
            <Box
              key={opt.value}
              component="label"
              htmlFor={inputId}
              sx={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 12px",
                borderRadius: "10px",
                border: `1px solid ${
                  isActive ? foto.accent.primary : foto.surfaces.rule
                }`,
                background: isActive ? foto.accent.soft : foto.surfaces.canvas,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.55 : 1,
                transition: "background 120ms ease, border-color 120ms ease",
                "&:hover": disabled
                  ? undefined
                  : { background: foto.accent.soft },
              }}
            >
              <Box
                component="input"
                type="radio"
                id={inputId}
                name={groupName}
                value={opt.value}
                checked={isActive}
                disabled={disabled}
                onChange={() => onChange(opt.value)}
                sx={{
                  position: "absolute",
                  opacity: 0,
                  pointerEvents: "none",
                  width: 0,
                  height: 0,
                }}
              />
              <Box
                aria-hidden
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: "8px",
                  background: isActive
                    ? foto.accent.primary
                    : foto.surfaces.inset,
                  color: isActive ? foto.ink.inverse : foto.ink.secondary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background 120ms ease, color 120ms ease",
                }}
              >
                <Glyph size={14} />
              </Box>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1px",
                  minWidth: 0,
                }}
              >
                <Box
                  sx={{
                    fontSize: 12.5,
                    fontWeight: isActive ? 600 : 500,
                    color: foto.ink.primary,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {opt.label}
                </Box>
                <Box
                  sx={{
                    fontSize: 10,
                    color: foto.ink.tertiary,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {opt.hint}
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

/**
 * Insumo sub-form: name + category tiles + quantity + preponderancia + optional
 * cost. Mirrors the BrutoFields layout/tokens so the capture pane stays
 * visually consistent across item types.
 */
export function InsumoFields({
  value,
  onChange,
  lotCostoTotalCOP,
  preponderanciaHelper,
  preponderanciaHelperAlert,
  disabled = false,
}: InsumoFieldsProps) {
  const foto = getFoto("light");
  const fieldGap = "16px";

  const nombreId = useId();
  const cantidadId = useId();
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
        <FieldLabel htmlFor={nombreId}>Nombre del insumo</FieldLabel>
        <Box
          component="input"
          id={nombreId}
          type="text"
          value={value.nombre}
          placeholder="Ej. Lupa triplete 10x"
          disabled={disabled}
          {...spanishText}
          onChange={(e) =>
            onChange({ nombre: (e.target as HTMLInputElement).value })
          }
          sx={textInputSx}
        />
      </Box>

      {/* Categoría — quick-select tiles */}
      <CategoriaPicker
        value={value.categoria}
        onChange={(categoria) => onChange({ categoria })}
        disabled={disabled}
      />

      {/* Cantidad + Preponderancia — two columns */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: fieldGap,
        }}
      >
        <Box>
          <FieldLabel htmlFor={cantidadId} optional="opcional">
            Cantidad
          </FieldLabel>
          <NumberInputWithCalc
            id={cantidadId}
            value={value.cantidad}
            onChange={(next) => onChange({ cantidad: next })}
            calcSuffix="uds"
            calcVariant="neutral"
            format="integer"
            placeholder="1"
            step={1}
            min={0}
            ariaLabel="Cantidad de unidades"
            disabled={disabled}
          />
        </Box>
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
            placeholder="100"
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
      </Box>

      {/* Costo — optional purchase cost */}
      <Box>
        <FieldLabel
          htmlFor={precioPublicoId}
          optional="opcional, costo de compra"
        >
          Costo (COP)
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
          ariaLabel="Costo en COP"
          disabled={disabled}
        />
      </Box>
    </Box>
  );
}

export default InsumoFields;
