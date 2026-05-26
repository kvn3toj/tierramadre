import { useId, useRef, useState } from "react";
import { Box } from "@mui/material";
import { Check, Plus } from "lucide-react";
import {
  COMPLEMENTOS,
  MINERALES,
  TECNICAS_JOYA,
  TIPOS_JOYA,
  type Complemento,
  type Mineral,
  type TipoJoya,
} from "../../../../data/vocabularies";
import { getFoto, fontFamilies } from "../../../../design-system";
import { FieldLabel } from "./FieldLabel";
import { SuggestInput } from "./SuggestInput";
import { NumberInputWithCalc } from "./NumberInputWithCalc";
import { SelectField } from "./SelectField";
import { spanishText } from "../utils/fieldLang";

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

/**
 * Chip multi-select with an inline "+ Otro" write-in. Vocabulary suggestions
 * render as toggle chips; any selected value not in the vocabulary (a custom
 * write-in, or one loaded from an edited record) renders as its own removable
 * chip so it round-trips. `onChange` always returns the full next array.
 */
function ChipMultiSelect({
  label,
  optionalText = "multi",
  options,
  selected,
  onChange,
  disabled,
}: {
  label: string;
  optionalText?: string;
  options: readonly string[];
  selected: readonly string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const foto = getFoto("light");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const customSelected = selected.filter(
    (s) => !(options as readonly string[]).includes(s),
  );

  const toggle = (item: string) => {
    if (disabled) return;
    onChange(
      selected.includes(item)
        ? selected.filter((x) => x !== item)
        : [...selected, item],
    );
  };

  const commitCustom = () => {
    const v = draft.trim();
    if (v && !selected.includes(v)) onChange([...selected, v]);
    setDraft("");
    setAdding(false);
  };

  const startAdding = () => {
    setAdding(true);
    window.setTimeout(() => inputRef.current?.focus(), 30);
  };

  return (
    <Box>
      <FieldLabel optional={optionalText}>{label}</FieldLabel>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          alignItems: "center",
        }}
      >
        {options.map((o) => (
          <ChipToggle
            key={o}
            label={o}
            selected={selected.includes(o)}
            disabled={disabled}
            onToggle={() => toggle(o)}
          />
        ))}
        {customSelected.map((o) => (
          <ChipToggle
            key={o}
            label={o}
            selected
            disabled={disabled}
            onToggle={() => toggle(o)}
          />
        ))}
        {adding ? (
          <Box
            sx={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
          >
            <Box
              component="input"
              ref={inputRef}
              type="text"
              value={draft}
              disabled={disabled}
              placeholder="Escribir…"
              aria-label={`${label} — escribir respuesta`}
              {...spanishText}
              onChange={(e) => setDraft((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitCustom();
                } else if (e.key === "Escape") {
                  setDraft("");
                  setAdding(false);
                }
              }}
              onBlur={() => {
                if (!draft.trim()) setAdding(false);
              }}
              sx={{
                width: 120,
                background: foto.surfaces.inset,
                border: `1px solid ${foto.accent.primary}`,
                borderRadius: "999px",
                padding: "5px 11px",
                fontSize: 11,
                color: foto.ink.primary,
                fontFamily: fontFamilies.system,
                outline: "none",
              }}
            />
            <Box
              component="button"
              type="button"
              onClick={commitCustom}
              disabled={disabled || !draft.trim()}
              aria-label="Agregar respuesta"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 26,
                height: 26,
                borderRadius: "999px",
                border: `1px solid ${foto.accent.primary}`,
                background: draft.trim()
                  ? foto.accent.primary
                  : foto.surfaces.inset,
                color: draft.trim() ? foto.ink.inverse : foto.ink.mute,
                cursor: draft.trim() ? "pointer" : "not-allowed",
                flexShrink: 0,
              }}
            >
              <Check size={13} strokeWidth={2.4} />
            </Box>
          </Box>
        ) : (
          <Box
            component="button"
            type="button"
            onClick={startAdding}
            disabled={disabled}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontFamily: fontFamilies.system,
              fontSize: 11,
              fontWeight: 500,
              padding: "6px 10px",
              borderRadius: "999px",
              border: `1px dashed ${foto.surfaces.edgeStrong}`,
              background: "transparent",
              color: foto.ink.secondary,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.55 : 1,
              transition: "border-color 120ms ease, color 120ms ease",
              "&:hover": disabled
                ? undefined
                : {
                    borderColor: foto.accent.primary,
                    color: foto.accent.deep,
                  },
            }}
          >
            <Plus size={12} strokeWidth={2} />
            Otro
          </Box>
        )}
      </Box>
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
          {...spanishText}
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
          {...spanishText}
          onChange={(e) =>
            onChange({ descripcion: (e.target as HTMLTextAreaElement).value })
          }
          sx={{ ...textInputSx, resize: "vertical", minHeight: 64 }}
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
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
            format="integer"
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
        <SelectField
          id={tipoJoyaId}
          label="Tipo de joya"
          value={value.tipoJoya}
          options={TIPOS_JOYA}
          placeholder="Elegir…"
          disabled={disabled}
          vocabularyKey="tipoJoya"
          onChange={(next) => onChange({ tipoJoya: next as TipoJoya | "" })}
        />
      </Box>

      <Box>
        <FieldLabel htmlFor={tecnicaId} optional="técnica">
          Técnica
        </FieldLabel>
        <SuggestInput
          id={tecnicaId}
          value={value.tecnica}
          onValueChange={(tecnica) => onChange({ tecnica })}
          suggestions={TECNICAS_JOYA}
          disabled={disabled}
          fieldLang={spanishText}
          sx={textInputSx}
        />
      </Box>

      <ChipMultiSelect
        label="Mineral"
        options={MINERALES}
        selected={value.minerales}
        disabled={disabled}
        onChange={(next) => onChange({ minerales: next as Mineral[] })}
      />

      <ChipMultiSelect
        label="Complemento"
        options={COMPLEMENTOS}
        selected={value.complementos}
        disabled={disabled}
        onChange={(next) => onChange({ complementos: next as Complemento[] })}
      />

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
          format="currency"
          ariaLabel="Precio público"
          disabled={disabled}
          calcVariant="neutral"
        />
      </Box>
    </Box>
  );
}

export default JoyaFields;
