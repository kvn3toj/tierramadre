import { useEffect, useId, useMemo, useState } from "react";
import { Box, Dialog, Switch } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { FileText, Trash2, X as XIcon } from "lucide-react";

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
import { JoyaFields, EMPTY_JOYA_DRAFT, type JoyaDraft } from "./JoyaFields";
import { BrutoFields, EMPTY_BRUTO_DRAFT, type BrutoDraft } from "./BrutoFields";
import { KbdKey } from "./KbdKey";
import { PhotoDropzone, type DropzonePhoto } from "./PhotoDropzone";
import { spanishText } from "../utils/fieldLang";
import {
  inferItemTipo,
  gemaDraftFromProduct,
  gemaPatchFromDraft,
  joyaDraftFromProduct,
  joyaPatchFromDraft,
  brutoDraftFromProduct,
  brutoPatchFromDraft,
  type EditableTipo,
} from "../utils/buildLotItemPayload";
import {
  uploadFotosintesisImages,
  uploadFotosintesisCertificado,
} from "../utils/uploadItemMedia";
import { convertToProxyUrl } from "../../../../utils/driveUrl";

const TIPO_LABEL: Record<EditableTipo, string> = {
  gema: "Gema",
  joya: "Joya",
  bruto: "Bruto",
};

interface ProductInventoryRow {
  _id: string;
  itemId: string;
  tipo?: string;
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
  // Joya-specific
  tipoJoya?: string;
  tecnicaJoya?: string;
  minerales?: string[];
  complementos?: string[];
  // Bruto-specific
  cantidadEstimada?: number;
  rendimientoEsperado?: number;
  fotoUrl?: string;
  certificadoUrl?: string;
}

interface EditItemDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Linked productInventory.itemId — the natural key the drawer queries. */
  itemId: string;
  /** Lot id — drives the Drive upload path for replaced item photos. */
  loteId: string;
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
  /** When false, all gem fields are read-only and only the photo can change. */
  editable?: boolean;
}

/**
 * Right-anchored drawer that lets an admin edit every field of an already-
 * captured gema in any lot estado (abierto · cerrado · publicado). Reuses
 * GemaFields + a Reserva-oculta switch + an observación textarea so the form
 * looks identical to the wizard's left column.
 *
 * Submit hits `lotItems.updateGemaFields`, which patches productInventory and
 * (if preponderancia changed) recomputes the lotItem cost server-side.
 *
 * The delete affordance routes through `lotItems.remove`, which orphans the
 * product row rather than deleting it — keeping any sales referencing it safe.
 *
 * The `editable` prop is kept for future surfaces that may want a read-only
 * view (e.g. surfacing the drawer from a sales context); LoteResumenPage now
 * always passes `editable` so the studio can fix any field at any time.
 */
export function EditItemDrawer({
  open,
  onClose,
  itemId,
  loteId,
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
  const certificadoId = useId();
  const { notify } = useNotification();

  const product = useConvexQuery(convexApi.products.get, { itemId }) as
    | ProductInventoryRow
    | null
    | undefined;
  const updateGemaFields = useConvexMutation(
    convexApi.lotItems.updateGemaFields,
  );
  const updateMedia = useConvexMutation(convexApi.lotItems.updateMedia);
  const removeLotItem = useConvexMutation(convexApi.lotItems.remove);

  // The drawer renders the sub-form that matches the item's kind. `tipo` is
  // inferred from the loaded product (stored `tipo` when present, else the
  // populated type-specific fields). We keep one draft per kind and only the
  // matching one is hydrated + submitted.
  const tipo: EditableTipo = useMemo(
    () => (product ? inferItemTipo(product) : "gema"),
    [product],
  );

  const [draft, setDraft] = useState<GemaDraft>(
    () =>
      ({
        ...EMPTY_GEMA_DRAFT,
        preponderancia: currentPreponderancia,
      }) as GemaDraft,
  );
  const [joyaDraft, setJoyaDraft] = useState<JoyaDraft>(
    () =>
      ({
        ...EMPTY_JOYA_DRAFT,
        preponderancia: currentPreponderancia,
      }) as JoyaDraft,
  );
  const [brutoDraft, setBrutoDraft] = useState<BrutoDraft>(
    () =>
      ({
        ...EMPTY_BRUTO_DRAFT,
        preponderancia: currentPreponderancia,
      }) as BrutoDraft,
  );
  const [observacion, setObservacion] = useState("");
  const [mostrarEnCatalogo, setMostrarEnCatalogo] = useState(false);
  // Item photo (hero). Seeded from the saved Drive URL; a freshly dropped file
  // carries `file` so submit knows to upload it. Photos are editable in any lot
  // estado — see the `updateMedia` mutation.
  const [photos, setPhotos] = useState<DropzonePhoto[]>([]);
  const [initialFotoUrl, setInitialFotoUrl] = useState<string | undefined>(
    undefined,
  );
  // Certificate (PDF / image). Like the photo, it's editable in any lot estado
  // via `updateMedia`. A freshly chosen file uploads on save.
  const [certificadoFile, setCertificadoFile] = useState<File | null>(null);
  const [initialCertificadoUrl, setInitialCertificadoUrl] = useState<
    string | undefined
  >(undefined);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Revoke any object URLs we created for previews so we don't leak blobs.
  const revokeLocalPreviews = (list: DropzonePhoto[]) => {
    for (const p of list) {
      if (p.url.startsWith("blob:")) URL.revokeObjectURL(p.url);
    }
  };

  // Hydrate the local draft from the latest mirror values every time the
  // drawer (re)opens or the underlying product row changes. We only reset
  // while the drawer is closed → reopened to avoid clobbering in-flight edits.
  useEffect(() => {
    if (!open) return;
    if (!product) return;
    const t = inferItemTipo(product);
    if (t === "joya") {
      setJoyaDraft({
        ...joyaDraftFromProduct(product),
        preponderancia: currentPreponderancia,
      });
    } else if (t === "bruto") {
      setBrutoDraft({
        ...brutoDraftFromProduct(product),
        preponderancia: currentPreponderancia,
      });
    } else {
      setDraft({
        ...gemaDraftFromProduct(product),
        preponderancia: currentPreponderancia,
      });
    }
    // For a joya the stored free text round-trips through JoyaFields'
    // `descripcion`, so the shared observación textarea is hidden + left empty.
    setObservacion(t === "joya" ? "" : (product.observacion ?? ""));
    setMostrarEnCatalogo(product.mostrarEnCatalogo ?? false);
    setPhotos((prev) => {
      revokeLocalPreviews(prev);
      return product.fotoUrl
        ? [
            {
              id: "existing-foto",
              // Route the saved Drive URL through the proxy so it renders.
              url: convertToProxyUrl(product.fotoUrl) ?? product.fotoUrl,
            },
          ]
        : [];
    });
    setInitialFotoUrl(product.fotoUrl);
    setCertificadoFile(null);
    setInitialCertificadoUrl(product.certificadoUrl);
    setError(null);
    setConfirmDelete(false);
  }, [open, product, currentPreponderancia]);

  // Reset the confirm-delete prompt + drop any local previews on close.
  useEffect(() => {
    if (!open) {
      setConfirmDelete(false);
      setCertificadoFile(null);
      setPhotos((prev) => {
        revokeLocalPreviews(prev);
        return [];
      });
    }
  }, [open]);

  // The active draft drives the shared preponderancia + name validation,
  // regardless of which sub-form is rendered.
  const activeDraft: GemaDraft | JoyaDraft | BrutoDraft =
    tipo === "joya" ? joyaDraft : tipo === "bruto" ? brutoDraft : draft;
  const activeNombre = activeDraft.nombre;
  const activePreponderancia = activeDraft.preponderancia;

  const prepNumeric =
    typeof activePreponderancia === "number" ? activePreponderancia : 0;
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

  // A dropped file means "upload + replace"; an emptied dropzone over a saved
  // photo means "clear". Either is a photo change the operator can save even
  // when the lot is closed.
  const pendingPhotoFile = photos.find((p) => p.file)?.file;
  const photoRemoved = !!initialFotoUrl && photos.length === 0;
  const photoChanged = !!pendingPhotoFile || photoRemoved;
  const certificadoChanged = !!certificadoFile;

  const canSubmit =
    !!product &&
    !saving &&
    !deleting &&
    (editable
      ? activeNombre.trim().length > 0 &&
        typeof activePreponderancia === "number" &&
        activePreponderancia > 0 &&
        overflow <= 0.01
      : photoChanged || certificadoChanged);

  const handleSubmit = async () => {
    if (!canSubmit || !product) return;
    setSaving(true);
    setError(null);
    try {
      // 1. Resolve the next photo URL: upload a dropped file, or clear it.
      let nextFotoUrl: string | undefined;
      if (pendingPhotoFile) {
        nextFotoUrl = await uploadFotosintesisImages(
          [pendingPhotoFile],
          loteId,
          itemId,
        );
      } else if (photoRemoved) {
        nextFotoUrl = ""; // empty string clears the field server-side
      }

      // 2. Resolve the next certificate URL: upload a freshly chosen file.
      let nextCertificadoUrl: string | undefined;
      if (certificadoFile) {
        nextCertificadoUrl = await uploadFotosintesisCertificado(
          certificadoFile,
          loteId,
          itemId,
        );
      }

      if (editable) {
        // Open/editable lot — persist every field of the matching sub-form
        // (photo + certificate folded into the same patch).
        const patch: Record<string, unknown> =
          tipo === "joya"
            ? joyaPatchFromDraft(joyaDraft, mostrarEnCatalogo)
            : tipo === "bruto"
              ? brutoPatchFromDraft(brutoDraft, observacion, mostrarEnCatalogo)
              : gemaPatchFromDraft(draft, observacion, mostrarEnCatalogo);
        if (nextFotoUrl !== undefined) patch.fotoUrl = nextFotoUrl;
        if (nextCertificadoUrl !== undefined)
          patch.certificadoUrl = nextCertificadoUrl;
        const result = await updateGemaFields({ lotItemId, patch });
        if (result.changed === false) {
          notify("Sin cambios para guardar", "info");
        } else {
          const count = result.changedFields?.length ?? 0;
          notify(
            `Ítem #${product.itemId} actualizado · ${count} campo${count === 1 ? "" : "s"}`,
            "success",
          );
        }
      } else {
        // Closed/published lot — only media (foto + certificado) can change.
        if (nextFotoUrl === undefined && nextCertificadoUrl === undefined) {
          notify("Sin cambios para guardar", "info");
          onClose();
          return;
        }
        const result = await updateMedia({
          lotItemId,
          fotoUrl: nextFotoUrl,
          certificadoUrl: nextCertificadoUrl,
        });
        if (result.changed === false) {
          notify("Sin cambios para guardar", "info");
        } else {
          notify(`Media del ítem #${product.itemId} actualizada`, "success");
        }
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
          width: { xs: "100vw", sm: 560 },
          maxWidth: "100vw",
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
            {product ? `${ticketLabel} · ${TIPO_LABEL[tipo]}` : ticketLabel}
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
            {product
              ? `Editar ${TIPO_LABEL[tipo].toLowerCase()}`
              : "Editar ítem"}
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
              : "Lote cerrado — foto y certificado sí se pueden actualizar."}
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
            minWidth: 44,
            minHeight: 44,
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
            {tipo === "joya" ? (
              <JoyaFields
                value={joyaDraft}
                onChange={(patch) =>
                  setJoyaDraft((prev) => ({ ...prev, ...patch }))
                }
                lotCostoTotalCOP={lotCostoTotalCOP}
                preponderanciaHelper={prepHelper?.text}
                preponderanciaHelperAlert={prepHelper?.alert}
                disabled={!editable}
              />
            ) : tipo === "bruto" ? (
              <BrutoFields
                value={brutoDraft}
                onChange={(patch) =>
                  setBrutoDraft((prev) => ({ ...prev, ...patch }))
                }
                lotCostoTotalCOP={lotCostoTotalCOP}
                preponderanciaHelper={prepHelper?.text}
                preponderanciaHelperAlert={prepHelper?.alert}
                disabled={!editable}
              />
            ) : (
              <GemaFields
                value={draft}
                onChange={(patch) =>
                  setDraft((prev) => ({ ...prev, ...patch }))
                }
                lotCostoTotalCOP={lotCostoTotalCOP}
                preponderanciaHelper={prepHelper?.text}
                preponderanciaHelperAlert={prepHelper?.alert}
                disabled={!editable}
              />
            )}

            <Box>
              <FieldLabel optional="opcional">Foto del ítem</FieldLabel>
              <PhotoDropzone
                photos={photos}
                onAdd={(files) => {
                  const f = files[0];
                  if (!f) return;
                  setPhotos((prev) => {
                    revokeLocalPreviews(prev);
                    return [
                      {
                        id: `${f.name}-${f.lastModified}`,
                        url: URL.createObjectURL(f),
                        file: f,
                      },
                    ];
                  });
                }}
                onRemove={() =>
                  setPhotos((prev) => {
                    revokeLocalPreviews(prev);
                    return [];
                  })
                }
                hint="Reemplazá la foto principal del ítem. Se sube a Drive al guardar."
              />
            </Box>

            {/* Certificado — editable in any lot estado, like the photo. */}
            <Box>
              <FieldLabel htmlFor={certificadoId} optional="PDF o imagen">
                Certificado
              </FieldLabel>
              {initialCertificadoUrl && !certificadoFile ? (
                <Box
                  component="a"
                  href={
                    convertToProxyUrl(initialCertificadoUrl) ??
                    initialCertificadoUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: foto.accent.deep,
                    textDecoration: "none",
                    marginBottom: "8px",
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  <FileText size={13} strokeWidth={2} />
                  Ver certificado actual
                </Box>
              ) : null}
              <Box
                component="input"
                id={certificadoId}
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => {
                  const f = (e.target as HTMLInputElement).files?.[0];
                  setCertificadoFile(f ?? null);
                }}
                sx={{
                  width: "100%",
                  fontSize: 12,
                  color: foto.ink.secondary,
                }}
              />
              <Box
                sx={{
                  fontSize: 11,
                  color: foto.ink.tertiary,
                  marginTop: "4px",
                  lineHeight: 1.45,
                }}
              >
                {certificadoFile
                  ? `Listo para subir: ${certificadoFile.name}`
                  : initialCertificadoUrl
                    ? "Elegí un archivo para reemplazar el certificado."
                    : "Adjuntá el certificado gemológico. Se sube a Drive al guardar."}
              </Box>
            </Box>

            {tipo !== "joya" ? (
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
                  {...spanishText}
                  onChange={(e) =>
                    setObservacion((e.target as HTMLTextAreaElement).value)
                  }
                  sx={textInputSx}
                />
              </Box>
            ) : null}

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
