import { useEffect, useId, useMemo, useState } from "react";
import { Box, Dialog, Switch } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Trash2, X as XIcon } from "lucide-react";

import { getFoto, fontFamilies } from "../../../../design-system";
import {
  useConvexMutation,
  useConvexQuery,
  convexApi,
} from "../../../../lib/convex-safe";
import { useNotification } from "../../../../contexts/NotificationContext";
import type { Id } from "../../../../../convex/_generated/dataModel";

import { FieldLabel } from "./FieldLabel";
import { GemaFields, EMPTY_GEMA_DRAFT, type GemaDraft } from "./GemaFields";
import { KbdKey } from "./KbdKey";
import {
  gemaDraftFromProduct,
  gemaPatchFromDraft,
} from "../utils/buildLotItemPayload";

interface ProductInventoryRow {
  _id: string;
  itemId: string;
  nombre?: string;
  peso?: string;
  color?: string;
  calidad?: string;
  procedencia?: string;
  observacion?: string;
  precioCOP?: number;
  mostrarEnCatalogo?: boolean;
  cantidad?: number;
  talla?: string;
  medidas?: string;
  categoria?: string;
  tipoEsmeralda?: string;
  nivelRareza?: number;
  calificacion?: number;
}

interface EditItemDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Linked productInventory.itemId — the natural key the drawer queries. */
  itemId: string;
  /** Lot item record id — what updateGemaFields patches. */
  lotItemId: Id<"lotItems">;
  /** Current preponderancia from the lotItems row (kept in sync via the parent). */
  currentPreponderancia: number;
  /** Lot's total cost — drives the live "= COP" suffix on the preponderancia field. */
  lotCostoTotalCOP: number;
  /** Sum of preponderancia of sibling items (excluding this one) — for live overflow warning. */
  siblingPreponderanciaSum: number;
  /** Display label in the breadcrumb (e.g. "B-008 · 003"). */
  ticketLabel: string;
  /** When false, all fields are read-only (lot not abierto). */
  editable?: boolean;
}

/**
 * Right-anchored drawer that lets an admin edit every field of an already-
 * captured gema while the lot is still `abierto`. Reuses GemaFields + a
 * Reserva-oculta switch + an observación textarea so the form looks identical
 * to the wizard's left column.
 *
 * Submit hits `lotItems.updateGemaFields`, which patches productInventory and
 * (if preponderancia changed) recomputes the lotItem cost server-side.
 *
 * The delete affordance routes through `lotItems.remove`, which orphans the
 * product row rather than deleting it — keeping any sales referencing it safe.
 */
export function EditItemDrawer({
  open,
  onClose,
  itemId,
  lotItemId,
  currentPreponderancia,
  lotCostoTotalCOP,
  siblingPreponderanciaSum,
  ticketLabel,
  editable = true,
}: EditItemDrawerProps) {
  const foto = getFoto("light");
  const titleId = useId();
  const observacionId = useId();
  const { notify } = useNotification();

  const product = useConvexQuery(convexApi.products.get, { itemId }) as
    | ProductInventoryRow
    | null
    | undefined;
  const updateGemaFields = useConvexMutation(
    convexApi.lotItems.updateGemaFields,
  );
  const removeLotItem = useConvexMutation(convexApi.lotItems.remove);

  const [draft, setDraft] = useState<GemaDraft>(() => ({
    ...EMPTY_GEMA_DRAFT,
    preponderancia: currentPreponderancia,
  } as GemaDraft));
  const [observacion, setObservacion] = useState("");
  const [mostrarEnCatalogo, setMostrarEnCatalogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate the local draft from the latest mirror values every time the
  // drawer (re)opens or the underlying product row changes. We only reset
  // while the drawer is closed → reopened to avoid clobbering in-flight edits.
  useEffect(() => {
    if (!open) return;
    if (!product) return;
    setDraft({
      ...gemaDraftFromProduct(product),
      preponderancia: currentPreponderancia,
    });
    setObservacion(product.observacion ?? "");
    setMostrarEnCatalogo(product.mostrarEnCatalogo ?? false);
    setError(null);
    setConfirmDelete(false);
  }, [open, product, currentPreponderancia]);

  // Reset the confirm-delete prompt whenever the drawer closes.
  useEffect(() => {
    if (!open) setConfirmDelete(false);
  }, [open]);

  const prepNumeric =
    typeof draft.preponderancia === "number" ? draft.preponderancia : 0;
  const projectedSum = siblingPreponderanciaSum + prepNumeric;
  const overflow = projectedSum - 100;
  const prepHelper = useMemo<{
    text: React.ReactNode;
    alert: boolean;
  } | null>(() => {
    if (overflow > 0.01) {
      return {
        text: `Excede el 100% del lote por ${(Math.round(overflow * 10) / 10).toFixed(1)}%. Bajá la preponderancia o ajustá otro ítem.`,
        alert: true,
      };
    }
    return null;
  }, [overflow]);

  const canSubmit =
    editable &&
    !!product &&
    draft.nombre.trim().length > 0 &&
    typeof draft.preponderancia === "number" &&
    draft.preponderancia > 0 &&
    overflow <= 0.01 &&
    !saving &&
    !deleting;

  const handleSubmit = async () => {
    if (!canSubmit || !product) return;
    setSaving(true);
    setError(null);
    try {
      const result = await updateGemaFields({
        lotItemId,
        patch: gemaPatchFromDraft(draft, observacion, mostrarEnCatalogo),
      });
      if (result.changed === false) {
        notify("Sin cambios para guardar", "info");
      } else {
        const count = result.changedFields?.length ?? 0;
        notify(
          `Ítem #${product.itemId} actualizado · ${count} campo${count === 1 ? "" : "s"}`,
          "success",
        );
      }
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No pudimos guardar";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editable || deleting) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await removeLotItem({ lotItemId });
      notify(`Ítem #${itemId} eliminado del lote`, "success");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No pudimos eliminar";
      setError(msg);
      setDeleting(false);
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
    resize: "vertical" as const,
    minHeight: "78px",
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
            {ticketLabel}
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
            Editar ítem
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
              ? "Cambios persisten en Convex y se sincronizan a la planilla."
              : "Lote cerrado — los campos están en sólo lectura."}
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
        {product === undefined ? (
          <Box
            sx={{
              color: foto.ink.tertiary,
              fontSize: 13,
              padding: "32px 0",
              textAlign: "center",
            }}
          >
            Cargando ítem…
          </Box>
        ) : product === null ? (
          <Box
            role="alert"
            sx={{
              background: alpha(foto.status.sold, 0.07),
              border: `1px solid ${alpha(foto.status.sold, 0.3)}`,
              borderRadius: "10px",
              padding: "11px 13px",
              fontSize: "12px",
              color: foto.status.sold,
            }}
          >
            No encontramos el ítem #{itemId} en el inventario.
          </Box>
        ) : (
          <>
            <GemaFields
              value={draft}
              onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
              lotCostoTotalCOP={lotCostoTotalCOP}
              preponderanciaHelper={prepHelper?.text}
              preponderanciaHelperAlert={prepHelper?.alert}
              disabled={!editable}
            />

            <Box>
              <FieldLabel htmlFor={observacionId} optional="opcional">
                Observación
              </FieldLabel>
              <Box
                component="textarea"
                id={observacionId}
                value={observacion}
                placeholder="Cualquier detalle libre — talla del corte, particularidades, intenciones de venta…"
                disabled={!editable}
                onChange={(e) =>
                  setObservacion((e.target as HTMLTextAreaElement).value)
                }
                sx={textInputSx}
              />
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "16px",
                padding: "14px 16px",
                background: foto.surfaces.inset,
                border: `1px solid ${foto.surfaces.rule}`,
                borderRadius: "11px",
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Box
                  sx={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: foto.ink.primary,
                  }}
                >
                  Visible en el catálogo público
                </Box>
                <Box
                  sx={{
                    fontSize: 11.5,
                    color: foto.ink.tertiary,
                    marginTop: "2px",
                    lineHeight: 1.45,
                  }}
                >
                  Si está apagado, el ítem queda como reserva oculta hasta que
                  publiques el lote.
                </Box>
              </Box>
              <Switch
                checked={mostrarEnCatalogo}
                disabled={!editable}
                onChange={(e) => setMostrarEnCatalogo(e.target.checked)}
                inputProps={{
                  "aria-checked": mostrarEnCatalogo,
                  "aria-label": "Visible en catálogo",
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
          </>
        )}
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
          component="button"
          type="button"
          onClick={() => void handleDelete()}
          disabled={!editable || deleting || !product}
          aria-pressed={confirmDelete}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontFamily: fontFamilies.system,
            fontSize: "12.5px",
            fontWeight: 600,
            padding: "11px 14px",
            borderRadius: "9px",
            cursor: editable && !deleting ? "pointer" : "not-allowed",
            background: confirmDelete
              ? foto.status.sold
              : alpha(foto.status.sold, 0.08),
            color: confirmDelete ? foto.ink.inverse : foto.status.sold,
            border: `1px solid ${
              confirmDelete ? foto.status.sold : alpha(foto.status.sold, 0.32)
            }`,
            transition: "background 120ms ease, color 120ms ease",
            opacity: editable ? 1 : 0.4,
            "&:hover": editable
              ? {
                  background: foto.status.sold,
                  color: foto.ink.inverse,
                }
              : undefined,
          }}
        >
          <Trash2 size={13} strokeWidth={2} />
          {deleting
            ? "Eliminando…"
            : confirmDelete
              ? "Confirmar eliminación"
              : "Eliminar ítem"}
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <Box
            sx={{
              fontSize: "11px",
              color: foto.ink.tertiary,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              marginRight: "4px",
            }}
          >
            <KbdKey size="sm">Esc</KbdKey>
            <Box component="span">cierra</Box>
            <Box component="span">·</Box>
            <KbdKey size="sm">⌘</KbdKey>
            <KbdKey size="sm">↵</KbdKey>
            <Box component="span">guarda</Box>
          </Box>
          <Box
            component="button"
            type="button"
            onClick={onClose}
            disabled={saving || deleting}
            sx={{
              fontFamily: fontFamilies.system,
              fontSize: "12.5px",
              fontWeight: 600,
              padding: "11px 18px",
              borderRadius: "9px",
              cursor: saving || deleting ? "not-allowed" : "pointer",
              background: "transparent",
              color: foto.ink.secondary,
              border: `1px solid ${foto.surfaces.edgeStrong}`,
              transition: "background 120ms ease, color 120ms ease",
              "&:hover": {
                background: foto.surfaces.canvas,
                color: foto.ink.primary,
              },
              opacity: saving || deleting ? 0.6 : 1,
            }}
          >
            Cancelar
          </Box>
          <Box
            component="button"
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            aria-busy={saving}
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
            {saving ? "Guardando…" : "Guardar cambios"}
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}

export default EditItemDrawer;
