import { useEffect, useId, useState } from "react";
import { Box, Dialog } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { X as XIcon } from "lucide-react";

import { getFoto, fontFamilies } from "../../../../design-system";
import { useConvexMutation, convexApi } from "../../../../lib/convex-safe";
import { useNotification } from "../../../../contexts/NotificationContext";
import type { Id } from "../../../../../convex/_generated/dataModel";

import { FieldLabel } from "./FieldLabel";
import { NumberInputWithCalc } from "./NumberInputWithCalc";
import { SegmentedControl } from "./SegmentedControl";
import { CreditoFields } from "./CreditoFields";
import { spanishText, noSpellCheck } from "../utils/fieldLang";
import { KbdKey } from "./KbdKey";

// Free text so an operator write-in round-trips when editing a lot.
// Canonical: contado | credito | esmereogenesis | bajo_pedido | consignacion.
type FormaPago = string;
// Canonical: efectivo | transferencia.
type MetodoContado = string;

interface LotRow {
  _id: string;
  loteId: string;
  fechaRecepcion: string;
  renombreLote?: string;
  tratamiento?: string;
  mina?: string;
  pesoTotalQuilates?: number;
  costoTotalCOP: number;
  unidadesDeclaradas: number;
  formaPago: FormaPago;
  metodoContado?: MetodoContado;
  fechaVencimiento?: string;
  numeroCuotas?: number;
  numeroFactura?: string;
  urlFactura?: string;
  notas?: string;
  estado: "abierto" | "cerrado" | "publicado" | "cancelado";
}

interface EditLotDrawerProps {
  open: boolean;
  onClose: () => void;
  lot: LotRow;
  /** Number of items already captured — clamps unidadesDeclaradas min. */
  itemsCount: number;
}

const COP_FORMATTER = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
const formatCOP = (n: number): string => COP_FORMATTER.format(n);

/**
 * Right-anchored drawer that exposes the full editable lot surface backed
 * by `convex/lots.ts#update`. Inline-edit on costo/unidades remains in
 * the LotMetaCard for one-tap changes — this drawer is for everything
 * else (factura, pago, vencimiento, peso, notas, fechaRecepcion).
 *
 * The drawer hydrates from the live `lot` prop every time it (re)opens so
 * upstream edits don't get clobbered when the user reopens without saving.
 */
export function EditLotDrawer({
  open,
  onClose,
  lot,
  itemsCount,
}: EditLotDrawerProps) {
  const foto = getFoto("light");
  const titleId = useId();
  const facturaUrlId = useId();
  const facturaNumId = useId();
  const notasId = useId();
  const fechaId = useId();
  const { notify } = useNotification();

  const updateLot = useConvexMutation(convexApi.lots.update);

  const [fechaRecepcion, setFechaRecepcion] = useState(lot.fechaRecepcion);
  const [renombreLote, setRenombreLote] = useState(lot.renombreLote ?? "");
  const [tratamiento, setTratamiento] = useState(lot.tratamiento ?? "");
  const [mina, setMina] = useState(lot.mina ?? "");
  const [costoTotalCOP, setCostoTotalCOP] = useState<number | "">(
    lot.costoTotalCOP,
  );
  const [unidadesDeclaradas, setUnidadesDeclaradas] = useState<number | "">(
    lot.unidadesDeclaradas,
  );
  const [pesoTotalQuilates, setPesoTotalQuilates] = useState<number | "">(
    lot.pesoTotalQuilates ?? "",
  );
  const [formaPago, setFormaPago] = useState<FormaPago>(lot.formaPago);
  const [metodoContado, setMetodoContado] = useState<MetodoContado>(
    lot.metodoContado ?? "transferencia",
  );
  const [creditoFechaVenc, setCreditoFechaVenc] = useState(
    lot.fechaVencimiento ?? "",
  );
  const [creditoCuotas, setCreditoCuotas] = useState(lot.numeroCuotas ?? 3);
  const [creditoTasa, setCreditoTasa] = useState<number | "">("");
  const [numeroFactura, setNumeroFactura] = useState(lot.numeroFactura ?? "");
  const [urlFactura, setUrlFactura] = useState(lot.urlFactura ?? "");
  const [notas, setNotas] = useState(lot.notas ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editable = lot.estado === "abierto";

  // Re-seed from the live lot whenever the drawer opens. We don't reset on
  // every prop change so the user can edit while a Convex subscription
  // re-fires; the next open re-syncs us to the canonical state.
  useEffect(() => {
    if (!open) return;
    setFechaRecepcion(lot.fechaRecepcion);
    setRenombreLote(lot.renombreLote ?? "");
    setTratamiento(lot.tratamiento ?? "");
    setMina(lot.mina ?? "");
    setCostoTotalCOP(lot.costoTotalCOP);
    setUnidadesDeclaradas(lot.unidadesDeclaradas);
    setPesoTotalQuilates(lot.pesoTotalQuilates ?? "");
    setFormaPago(lot.formaPago);
    setMetodoContado(lot.metodoContado ?? "transferencia");
    setCreditoFechaVenc(lot.fechaVencimiento ?? "");
    setCreditoCuotas(lot.numeroCuotas ?? 3);
    setNumeroFactura(lot.numeroFactura ?? "");
    setUrlFactura(lot.urlFactura ?? "");
    setNotas(lot.notas ?? "");
    setError(null);
  }, [open, lot]);

  const creditoComplete =
    formaPago !== "credito" ||
    (creditoFechaVenc.length > 0 && creditoCuotas > 0);

  const minUnidades = Math.max(1, itemsCount);

  const canSubmit =
    editable &&
    !submitting &&
    typeof costoTotalCOP === "number" &&
    costoTotalCOP > 0 &&
    typeof unidadesDeclaradas === "number" &&
    unidadesDeclaradas >= minUnidades &&
    creditoComplete;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const patch: Parameters<typeof updateLot>[0]["patch"] = {
        fechaRecepcion,
        renombreLote: renombreLote.trim() || undefined,
        tratamiento: tratamiento.trim() || undefined,
        mina: mina.trim() || undefined,
        costoTotalCOP: costoTotalCOP as number,
        unidadesDeclaradas: unidadesDeclaradas as number,
        formaPago,
        notas: notas.trim().length > 0 ? notas.trim() : undefined,
        numeroFactura:
          numeroFactura.trim().length > 0 ? numeroFactura.trim() : undefined,
        urlFactura:
          urlFactura.trim().length > 0 ? urlFactura.trim() : undefined,
        pesoTotalQuilates:
          typeof pesoTotalQuilates === "number" && pesoTotalQuilates > 0
            ? pesoTotalQuilates
            : undefined,
      };
      if (formaPago === "contado") {
        patch.metodoContado = metodoContado;
        patch.fechaVencimiento = undefined;
        patch.numeroCuotas = undefined;
      } else if (formaPago === "credito") {
        patch.fechaVencimiento = creditoFechaVenc;
        patch.numeroCuotas = creditoCuotas;
        patch.metodoContado = undefined;
      } else {
        patch.metodoContado = undefined;
        patch.fechaVencimiento = undefined;
        patch.numeroCuotas = undefined;
      }
      await updateLot({ id: lot._id as Id<"lots">, patch });
      notify(`Lote ${lot.loteId} actualizado`, "success");
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No pudimos guardar el lote",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleBodyKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleSubmit();
    }
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
    transition: "border-color 120ms ease, box-shadow 120ms ease",
    "&:focus": {
      borderColor: foto.accent.primary,
      boxShadow: `0 0 0 3px ${foto.accent.glow}`,
    },
    "::placeholder": { color: foto.ink.mute },
  } as const;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      aria-labelledby={titleId}
      aria-modal
      slotProps={{
        backdrop: {
          sx: {
            background: "rgba(11,16,14,0.32)",
            backdropFilter: "saturate(80%)",
          },
        },
      }}
      PaperProps={{
        sx: {
          position: "fixed",
          right: 0,
          top: 0,
          bottom: 0,
          margin: 0,
          width: 560,
          maxWidth: "calc(100vw - 24px)",
          height: "100vh",
          maxHeight: "100vh",
          borderRadius: 0,
          boxShadow: "-30px 0 80px rgba(11,16,14,0.18)",
          background: foto.surfaces.canvas,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "14px",
          padding: "22px 26px 18px",
          borderBottom: `1px solid ${foto.surfaces.rule}`,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Box
            sx={{
              fontSize: 9,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: foto.ink.tertiary,
              fontWeight: 500,
              fontFamily: fontFamilies.mono,
            }}
          >
            {lot.loteId}
          </Box>
          <Box
            id={titleId}
            component="h2"
            sx={{
              fontSize: "22px",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              marginTop: "6px",
              color: foto.ink.primary,
              lineHeight: 1.2,
            }}
          >
            Editar lote
          </Box>
          <Box
            sx={{
              fontSize: "12.5px",
              color: foto.ink.secondary,
              marginTop: "5px",
              lineHeight: 1.55,
            }}
          >
            {editable
              ? "Datos contables del encabezado. Sincroniza a Sheets al guardar."
              : "Lote cerrado — no se pueden editar los datos hasta reabrirlo."}
          </Box>
        </Box>
        <Box
          component="button"
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          sx={{
            width: 32,
            height: 32,
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: foto.ink.tertiary,
            cursor: "pointer",
            border: `1px solid ${foto.surfaces.edge}`,
            background: foto.surfaces.canvas,
            flexShrink: 0,
            transition: "background 120ms ease, color 120ms ease",
            "&:hover": {
              background: foto.surfaces.inset,
              color: foto.ink.primary,
            },
          }}
        >
          <XIcon size={14} strokeWidth={2} />
        </Box>
      </Box>

      {/* BODY */}
      <Box
        onKeyDown={handleBodyKeyDown}
        sx={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 26px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {/* Fecha + Peso */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
          }}
        >
          <Box>
            <FieldLabel htmlFor={fechaId}>Fecha de recepción</FieldLabel>
            <Box
              component="input"
              id={fechaId}
              type="date"
              value={fechaRecepcion}
              disabled={!editable}
              onChange={(e) =>
                setFechaRecepcion((e.target as HTMLInputElement).value)
              }
              sx={{
                ...textInputSx,
                fontFamily: fontFamilies.mono,
                fontVariantNumeric: "tabular-nums",
              }}
            />
          </Box>
          <Box>
            <FieldLabel optional="opcional, en quilates">Peso total</FieldLabel>
            <NumberInputWithCalc
              id="lote-peso"
              value={pesoTotalQuilates}
              onChange={setPesoTotalQuilates}
              placeholder="0"
              step={0.1}
              min={0}
              ariaLabel="Peso total del lote en quilates"
              calcSuffix={
                typeof pesoTotalQuilates === "number" && pesoTotalQuilates > 0
                  ? `${pesoTotalQuilates} ct`
                  : "= —"
              }
              calcVariant="neutral"
              disabled={!editable}
            />
          </Box>
        </Box>

        <Box>
          <FieldLabel optional="alias interno">Renombre del lote</FieldLabel>
          <Box
            component="input"
            type="text"
            value={renombreLote}
            disabled={!editable}
            {...spanishText}
            onChange={(e) =>
              setRenombreLote((e.target as HTMLInputElement).value)
            }
            sx={textInputSx}
          />
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
          }}
        >
          <Box>
            <FieldLabel optional="tratamiento">Tratamiento</FieldLabel>
            <Box
              component="input"
              type="text"
              value={tratamiento}
              disabled={!editable}
              {...spanishText}
              onChange={(e) =>
                setTratamiento((e.target as HTMLInputElement).value)
              }
              sx={textInputSx}
            />
          </Box>
          <Box>
            <FieldLabel optional="mina">Mina</FieldLabel>
            <Box
              component="input"
              type="text"
              value={mina}
              disabled={!editable}
              {...noSpellCheck}
              onChange={(e) => setMina((e.target as HTMLInputElement).value)}
              sx={textInputSx}
            />
          </Box>
        </Box>

        {/* Costo + Unidades */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
          }}
        >
          <Box>
            <FieldLabel>Costo total (COP)</FieldLabel>
            <NumberInputWithCalc
              id="lote-costo-edit"
              value={costoTotalCOP}
              onChange={setCostoTotalCOP}
              placeholder="0"
              step={1000}
              min={1}
              ariaLabel="Costo total del lote en COP"
              calcSuffix={
                typeof costoTotalCOP === "number" && costoTotalCOP > 0
                  ? formatCOP(costoTotalCOP)
                  : "= —"
              }
              calcVariant="neutral"
              disabled={!editable}
            />
          </Box>
          <Box>
            <FieldLabel>Unidades declaradas</FieldLabel>
            <NumberInputWithCalc
              id="lote-unidades-edit"
              value={unidadesDeclaradas}
              onChange={setUnidadesDeclaradas}
              placeholder={String(minUnidades)}
              step={1}
              min={minUnidades}
              ariaLabel="Unidades declaradas"
              calcSuffix={
                itemsCount > 0
                  ? `mín ${minUnidades} (${itemsCount} ya capturadas)`
                  : "ítems"
              }
              calcVariant="neutral"
              disabled={!editable}
            />
          </Box>
        </Box>

        {/* Forma de pago */}
        <Box>
          <FieldLabel>Forma de pago</FieldLabel>
          <SegmentedControl
            ariaLabel="Forma de pago"
            allowOther={editable}
            otherLabel="Otra…"
            otherPlaceholder="Escribir forma de pago…"
            options={[
              { value: "contado", label: "Contado", disabled: !editable },
              { value: "credito", label: "Crédito", disabled: !editable },
              {
                value: "esmereogenesis",
                label: "Esmereo",
                disabled: !editable,
              },
              {
                value: "bajo_pedido",
                label: "Bajo pedido",
                disabled: !editable,
              },
              { value: "consignacion", label: "Consign.", disabled: !editable },
            ]}
            value={formaPago}
            onChange={(next) => setFormaPago(next as FormaPago)}
          />
        </Box>

        {formaPago === "contado" ? (
          <Box>
            <FieldLabel>Método</FieldLabel>
            <SegmentedControl
              ariaLabel="Método de pago contado"
              allowOther={editable}
              otherLabel="Otro…"
              otherPlaceholder="Escribir método de pago…"
              options={[
                { value: "efectivo", label: "Efectivo", disabled: !editable },
                {
                  value: "transferencia",
                  label: "Transferencia",
                  disabled: !editable,
                },
              ]}
              value={metodoContado}
              onChange={(next) => setMetodoContado(next as MetodoContado)}
            />
          </Box>
        ) : null}

        {formaPago === "credito" ? (
          <CreditoFields
            fechaVencimiento={creditoFechaVenc}
            setFechaVencimiento={setCreditoFechaVenc}
            numeroCuotas={creditoCuotas}
            setNumeroCuotas={setCreditoCuotas}
            tasaInteres={creditoTasa}
            setTasaInteres={setCreditoTasa}
            totalCop={typeof costoTotalCOP === "number" ? costoTotalCOP : 0}
          />
        ) : null}

        {/* Factura */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "16px",
          }}
        >
          <Box>
            <FieldLabel htmlFor={facturaNumId} optional="número o referencia">
              Factura
            </FieldLabel>
            <Box
              component="input"
              id={facturaNumId}
              type="text"
              value={numeroFactura}
              disabled={!editable}
              placeholder="Ej. F-2026-0042"
              {...noSpellCheck}
              onChange={(e) =>
                setNumeroFactura((e.target as HTMLInputElement).value)
              }
              sx={{
                ...textInputSx,
                fontFamily: fontFamilies.mono,
              }}
            />
          </Box>
          <Box>
            <FieldLabel htmlFor={facturaUrlId} optional="link a Drive / PDF">
              URL de la factura
            </FieldLabel>
            <Box
              component="input"
              id={facturaUrlId}
              type="url"
              value={urlFactura}
              disabled={!editable}
              placeholder="https://drive.google.com/…"
              onChange={(e) =>
                setUrlFactura((e.target as HTMLInputElement).value)
              }
              sx={textInputSx}
            />
          </Box>
        </Box>

        {/* Notas */}
        <Box>
          <FieldLabel htmlFor={notasId} optional="opcional">
            Notas internas
          </FieldLabel>
          <Box
            component="textarea"
            id={notasId}
            value={notas}
            disabled={!editable}
            placeholder="Cualquier detalle del lote, condiciones, recordatorios…"
            {...spanishText}
            onChange={(e) => setNotas((e.target as HTMLTextAreaElement).value)}
            sx={{
              ...textInputSx,
              minHeight: "84px",
              resize: "vertical",
            }}
          />
        </Box>

        {error ? (
          <Box
            role="alert"
            sx={{
              background: alpha(foto.status.sold, 0.07),
              border: `1px solid ${alpha(foto.status.sold, 0.3)}`,
              borderRadius: "10px",
              padding: "11px 13px",
              fontSize: "12px",
              color: foto.status.sold,
              lineHeight: 1.5,
            }}
          >
            {error}
          </Box>
        ) : null}
      </Box>

      {/* FOOTER */}
      <Box
        sx={{
          padding: "18px 26px",
          borderTop: `1px solid ${foto.surfaces.rule}`,
          background: foto.surfaces.panel,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <Box
          sx={{
            fontSize: "11px",
            color: foto.ink.tertiary,
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            flexWrap: "wrap",
          }}
        >
          <KbdKey size="sm">Esc</KbdKey>
          <Box component="span">cierra</Box>
          <Box component="span">·</Box>
          <KbdKey size="sm">⌘</KbdKey>
          <KbdKey size="sm">↵</KbdKey>
          <Box component="span">guarda</Box>
        </Box>
        <Box sx={{ display: "flex", gap: "8px" }}>
          <Box
            component="button"
            type="button"
            onClick={onClose}
            disabled={submitting}
            sx={{
              fontFamily: fontFamilies.system,
              fontSize: "12.5px",
              fontWeight: 600,
              padding: "11px 18px",
              borderRadius: "9px",
              cursor: submitting ? "not-allowed" : "pointer",
              background: "transparent",
              color: foto.ink.secondary,
              border: `1px solid ${foto.surfaces.edgeStrong}`,
              transition: "background 120ms ease, color 120ms ease",
              "&:hover": {
                background: foto.surfaces.canvas,
                color: foto.ink.primary,
              },
              opacity: submitting ? 0.6 : 1,
            }}
          >
            Cancelar
          </Box>
          <Box
            component="button"
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            aria-busy={submitting}
            sx={{
              fontFamily: fontFamilies.system,
              fontSize: "12.5px",
              fontWeight: 600,
              padding: "11px 18px",
              borderRadius: "9px",
              cursor: canSubmit ? "pointer" : "not-allowed",
              background: foto.accent.primary,
              color: foto.ink.inverse,
              border: "1px solid transparent",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              transition: "background 120ms ease, transform 120ms ease",
              "&:hover": canSubmit
                ? {
                    background: foto.accent.deep,
                    transform: "translateY(-1px)",
                  }
                : undefined,
              opacity: canSubmit ? 1 : 0.55,
            }}
          >
            {submitting ? "Guardando…" : "Guardar cambios"}
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}

export default EditLotDrawer;
