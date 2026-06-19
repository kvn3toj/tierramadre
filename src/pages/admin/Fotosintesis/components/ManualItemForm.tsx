import { useState } from "react";
import { Box } from "@mui/material";
import { Plus, X } from "lucide-react";
import { getFoto, fontFamilies } from "../../../../design-system";
import { FieldLabel } from "./FieldLabel";
import { NumberInputWithCalc } from "./NumberInputWithCalc";
import { spanishText } from "../utils/fieldLang";
import {
  buildManualSaleItem,
  isManualDraftComplete,
  type ManualSaleItem,
  type ManualSaleItemDraft,
} from "../utils/manualSaleItem";

interface ManualItemFormProps {
  /** Append a built manual item to the sale. */
  onAdd: (item: ManualSaleItem) => void;
  /** Generate an id for the new item (defaults to crypto.randomUUID). */
  makeId?: () => string;
}

const EMPTY_DRAFT: ManualSaleItemDraft = {
  nombre: "",
  descripcion: "",
  peso: "",
  precioCop: "",
};

/**
 * Inline "add a non-inventory line item" form for the venta (Kardex) flow —
 * ported from the cuentas/recibos manual-entry pattern. Lets the operator add
 * something not in productInventory (an accessory, a service, a piece not yet
 * captured). Collapsed behind a launcher until needed so the common
 * pick-from-inventory path stays uncluttered.
 */
export function ManualItemForm({ onAdd, makeId }: ManualItemFormProps) {
  const foto = getFoto("light");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ManualSaleItemDraft>(EMPTY_DRAFT);

  const complete = isManualDraftComplete(draft);

  const reset = () => setDraft(EMPTY_DRAFT);

  const handleAdd = () => {
    const id = (makeId ?? (() => crypto.randomUUID()))();
    const item = buildManualSaleItem(draft, id);
    if (!item) return;
    onAdd(item);
    reset();
    setOpen(false);
  };

  if (!open) {
    return (
      <Box
        component="button"
        type="button"
        onClick={() => setOpen(true)}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "9px 14px",
          borderRadius: "9px",
          border: `1px dashed ${foto.surfaces.edgeStrong}`,
          background: foto.surfaces.panel,
          color: foto.ink.secondary,
          fontSize: 12.5,
          fontWeight: 500,
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "background 120ms ease",
          "&:hover": { background: foto.surfaces.inset },
          "&:focus-visible": {
            outline: "none",
            boxShadow: `0 0 0 3px ${foto.accent.glow}`,
          },
        }}
      >
        <Plus size={15} aria-hidden />
        Agregar ítem manual (fuera de inventario)
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "14px 16px",
        borderRadius: "11px",
        border: `1px solid ${foto.accent.primary}`,
        background: foto.accent.soft,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <Box
          sx={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: foto.accent.deep,
          }}
        >
          Ítem manual
        </Box>
        <Box
          component="button"
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          aria-label="Cancelar ítem manual"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 26,
            height: 26,
            borderRadius: "7px",
            border: "none",
            background: "transparent",
            color: foto.ink.tertiary,
            cursor: "pointer",
            "&:hover": { color: foto.ink.primary },
          }}
        >
          <X size={15} strokeWidth={1.8} aria-hidden />
        </Box>
      </Box>

      <Box>
        <FieldLabel>Nombre</FieldLabel>
        <Box
          component="input"
          type="text"
          value={draft.nombre ?? ""}
          {...spanishText}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              nombre: (e.target as HTMLInputElement).value,
            }))
          }
          placeholder="Ej. Estuche de cuero, servicio de engaste…"
          aria-label="Nombre del ítem manual"
          sx={inputSx(foto)}
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: "12px",
        }}
      >
        <Box>
          <FieldLabel optional="opcional">Detalle</FieldLabel>
          <Box
            component="input"
            type="text"
            value={draft.descripcion ?? ""}
            {...spanishText}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                descripcion: (e.target as HTMLInputElement).value,
              }))
            }
            placeholder="Material, medida…"
            aria-label="Detalle del ítem manual"
            sx={inputSx(foto)}
          />
        </Box>
        <Box>
          <FieldLabel optional="opcional">Peso / material</FieldLabel>
          <Box
            component="input"
            type="text"
            value={draft.peso ?? ""}
            {...spanishText}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                peso: (e.target as HTMLInputElement).value,
              }))
            }
            placeholder="Ej. 2,5 ct · Plata"
            aria-label="Peso o material del ítem manual"
            sx={inputSx(foto)}
          />
        </Box>
      </Box>

      <Box>
        <FieldLabel>Precio (COP)</FieldLabel>
        <NumberInputWithCalc
          value={draft.precioCop ?? ""}
          onChange={(next) => setDraft((d) => ({ ...d, precioCop: next }))}
          format="currency"
          placeholder="Precio del ítem"
          step={1000}
          min={0}
          ariaLabel="Precio del ítem manual en pesos colombianos"
        />
      </Box>

      <Box
        component="button"
        type="button"
        onClick={handleAdd}
        disabled={!complete}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          padding: "10px 16px",
          borderRadius: "9px",
          border: "none",
          background: complete
            ? `linear-gradient(180deg, ${foto.accent.primary} 0%, ${foto.accent.deep} 100%)`
            : foto.surfaces.inset,
          color: complete ? foto.ink.inverse : foto.ink.mute,
          fontSize: 12.5,
          fontWeight: 600,
          cursor: complete ? "pointer" : "not-allowed",
          fontFamily: "inherit",
          transition: "background 120ms ease, transform 120ms ease",
          "&:hover:not(:disabled)": { transform: "translateY(-1px)" },
        }}
      >
        <Plus size={15} strokeWidth={2} aria-hidden />
        Agregar a la venta
      </Box>
    </Box>
  );
}

function inputSx(foto: ReturnType<typeof getFoto>) {
  return {
    width: "100%",
    background: foto.surfaces.inset,
    border: `1px solid ${foto.surfaces.rule}`,
    borderRadius: "9px",
    padding: "11px 14px",
    fontSize: 13,
    color: foto.ink.primary,
    fontFamily: fontFamilies.system,
    outline: "none",
    "&:focus": {
      borderColor: foto.accent.primary,
      boxShadow: `0 0 0 3px ${foto.accent.glow}`,
    },
    "::placeholder": { color: foto.ink.mute },
  } as const;
}

export default ManualItemForm;
