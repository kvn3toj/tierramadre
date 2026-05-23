import { useId } from "react";
import { Box } from "@mui/material";
import {
  COMPLEMENTOS,
  MINERALES,
  TIPOS_JOYA,
  type Complemento,
  type Mineral,
  type TipoJoya,
} from "../../../../data/vocabularies";
import { getFoto, fontFamilies } from "../../../../design-system";
import { FieldLabel } from "./FieldLabel";
import { NumberInputWithCalc } from "./NumberInputWithCalc";

export interface JoyaDraft {
  nombre: string;
  descripcion: string;
  cantidad: number | "";
  pesoGr: number | "";
  tipoJoya: TipoJoya | "";
  tecnica: string;
  minerales: Mineral[];
  complementos: Complemento[];
  preponderancia: number | "";
  precioPublicoCOP: number | "";
}

export const EMPTY_JOYA_DRAFT: JoyaDraft = {
  nombre: "",
  descripcion: "",
  cantidad: 1,
  pesoGr: "",
  tipoJoya: "",
  tecnica: "",
  minerales: [],
  complementos: [],
  preponderancia: "",
  precioPublicoCOP: "",
};

interface JoyaFieldsProps {
  value: JoyaDraft;
  onChange: (patch: Partial<JoyaDraft>) => void;
  lotCostoTotalCOP: number;
  preponderanciaHelper?: React.ReactNode;
  preponderanciaHelperAlert?: boolean;
  disabled?: boolean;
}

function ChipToggle({
  label,
  selected,
  onToggle,
  disabled,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const foto = getFoto("light");
  return (
    <Box
      component="button"
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onToggle}
      sx={{
        fontFamily: fontFamilies.system,
        fontSize: 11,
        fontWeight: selected ? 600 : 500,
        padding: "6px 10px",
        borderRadius: "999px",
        border: `1px solid ${
          selected ? foto.accent.primary : foto.surfaces.rule
        }`,
        background: selected ? foto.accent.soft : foto.surfaces.inset,
        color: selected ? foto.accent.deep : foto.ink.secondary,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {label}
    </Box>
  );
}

export function JoyaFields({
  value,
  onChange,
  lotCostoTotalCOP,
  preponderanciaHelper,
  preponderanciaHelperAlert,
  disabled = false,
}: JoyaFieldsProps) {
  const foto = getFoto("light");
  const nombreId = useId();
  const descripcionId = useId();
  const tipoJoyaId = useId();
  const tecnicaId = useId();
  const cantidadId = useId();
  const pesoGrId = useId();
  const preponderanciaId = useId();
  const precioId = useId();

  const prepNumeric =
    typeof value.preponderancia === "number" ? value.preponderancia : 0;
  const computedCostoBaseCOP = Math.round(
    lotCostoTotalCOP * (prepNumeric / 100),
  );

  const toggleList = <T extends string>(
    list: T[],
    item: T,
    key: "minerales" | "complementos",
  ) => {
    const next = list.includes(item)
      ? list.filter((x) => x !== item)
      : [...list, item];
    onChange({ [key]: next } as Partial<JoyaDraft>);
  };

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
    "&:focus": {
      borderColor: foto.accent.primary,
      boxShadow: `0 0 0 3px ${foto.accent.glow}`,
    },
  } as const;

  return (
    <Box sx={{ display: "grid", gap: "16px" }}>
      <Box>
        <FieldLabel htmlFor={nombreId}>Nombre sagrado</FieldLabel>
        <Box
          component="input"
          id={nombreId}
          type="text"
          value={value.nombre}
          disabled={disabled}
          onChange={(e) =>
            onChange({ nombre: (e.target as HTMLInputElement).value })
          }
          sx={textInputSx}
        />
      </Box>

      <Box>
        <FieldLabel htmlFor={descripcionId}>Descripción</FieldLabel>
        <Box
          component="textarea"
          id={descripcionId}
          value={value.descripcion}
          disabled={disabled}
          rows={2}
          onChange={(e) =>
            onChange({ descripcion: (e.target as HTMLTextAreaElement).value })
          }
          sx={{ ...textInputSx, resize: "vertical", minHeight: 64 }}
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "16px",
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
            ariaLabel="Cantidad"
            disabled={disabled}
            calcSuffix="pzas"
            calcVariant="neutral"
          />
        </Box>
        <Box>
          <FieldLabel htmlFor={pesoGrId}>Peso (gr)</FieldLabel>
          <NumberInputWithCalc
            id={pesoGrId}
            value={value.pesoGr}
            onChange={(next) => onChange({ pesoGr: next })}
            placeholder="0"
            step={0.1}
            min={0}
            ariaLabel="Peso en gramos"
            disabled={disabled}
            calcSuffix="gr"
            calcVariant="neutral"
          />
        </Box>
        <Box>
          <FieldLabel htmlFor={tipoJoyaId}>Tipo de joya</FieldLabel>
          <Box
            component="select"
            id={tipoJoyaId}
            value={value.tipoJoya}
            disabled={disabled}
            onChange={(e) =>
              onChange({
                tipoJoya: (e.target as HTMLSelectElement).value as TipoJoya | "",
              })
            }
            sx={textInputSx}
          >
            <option value="">Elegir…</option>
            {TIPOS_JOYA.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Box>
        </Box>
      </Box>

      <Box>
        <FieldLabel htmlFor={tecnicaId} optional="técnica">
          Técnica
        </FieldLabel>
        <Box
          component="input"
          id={tecnicaId}
          type="text"
          value={value.tecnica}
          disabled={disabled}
          onChange={(e) =>
            onChange({ tecnica: (e.target as HTMLInputElement).value })
          }
          sx={textInputSx}
        />
      </Box>

      <Box>
        <FieldLabel optional="multi">Mineral</FieldLabel>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {MINERALES.map((m) => (
            <ChipToggle
              key={m}
              label={m}
              selected={value.minerales.includes(m)}
              disabled={disabled}
              onToggle={() => toggleList(value.minerales, m, "minerales")}
            />
          ))}
        </Box>
      </Box>

      <Box>
        <FieldLabel optional="multi">Complemento</FieldLabel>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {COMPLEMENTOS.map((c) => (
            <ChipToggle
              key={c}
              label={c}
              selected={value.complementos.includes(c)}
              disabled={disabled}
              onToggle={() => toggleList(value.complementos, c, "complementos")}
            />
          ))}
        </Box>
      </Box>

      <Box>
        <FieldLabel htmlFor={preponderanciaId}>
          Preponderancia (% del lote)
        </FieldLabel>
        <NumberInputWithCalc
          id={preponderanciaId}
          value={value.preponderancia}
          onChange={(next) => onChange({ preponderancia: next })}
          calcSuffix={
            value.preponderancia === ""
              ? "= —"
              : `= ${new Intl.NumberFormat("es-CO", {
                  style: "currency",
                  currency: "COP",
                  maximumFractionDigits: 0,
                }).format(computedCostoBaseCOP)}`
          }
          calcVariant="accent"
          placeholder="33"
          step={0.1}
          min={0}
          max={100}
          ariaLabel="Preponderancia"
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
          >
            {preponderanciaHelper}
          </Box>
        ) : null}
      </Box>

      <Box>
        <FieldLabel htmlFor={precioId} optional="opcional">
          Precio público sugerido (COP)
        </FieldLabel>
        <NumberInputWithCalc
          id={precioId}
          value={value.precioPublicoCOP}
          onChange={(next) => onChange({ precioPublicoCOP: next })}
          placeholder="0"
          step={1000}
          min={0}
          ariaLabel="Precio público"
          disabled={disabled}
          calcVariant="neutral"
        />
      </Box>
    </Box>
  );
}

export default JoyaFields;
