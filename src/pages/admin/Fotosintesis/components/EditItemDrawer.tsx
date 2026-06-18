import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Box, Dialog, Switch } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { FileText, Globe, Lock, Trash2, X as XIcon } from "lucide-react";

import { getFoto, fontFamilies } from "../../../../design-system";
import {
  useConvexMutation,
  useConvexQuery,
  convexApi,
} from "../../../../lib/convex-safe";
import { useNotification } from "../../../../contexts/NotificationContext";
import { useProductLock } from "../../../../hooks/useProductLock";
import { useDirtyGuard } from "../../../../hooks/useDirtyGuard";
import ConfirmDialog from "../../../../components/shared/ConfirmDialog";
import type { Id } from "../../../../../convex/_generated/dataModel";

import { FieldLabel } from "./FieldLabel";
import { GemaFields, EMPTY_GEMA_DRAFT, type GemaDraft } from "./GemaFields";
import { JoyaFields, EMPTY_JOYA_DRAFT, type JoyaDraft } from "./JoyaFields";
import {
  InsumoFields,
  EMPTY_INSUMO_DRAFT,
  type InsumoDraft,
} from "./InsumoFields";
import { KbdKey } from "./KbdKey";
import { PhotoDropzone, type DropzonePhoto } from "./PhotoDropzone";
import { PriceMultiplierField } from "./PriceMultiplierField";
import { spanishText } from "../utils/fieldLang";
import {
  inferItemTipo,
  gemaDraftFromProduct,
  gemaPatchFromDraft,
  joyaDraftFromProduct,
  joyaPatchFromDraft,
  insumoDraftFromProduct,
  insumoPatchFromDraft,
  tierPricePatch,
  type EditableTipo,
  type ItemPricingDraft,
} from "../utils/buildLotItemPayload";
import {
  uploadFotosintesisImages,
  uploadFotosintesisCertificado,
} from "../utils/uploadItemMedia";
import { convertToProxyUrl } from "../../../../utils/driveUrl";
import { itemEstadoCopy, type LotEstado } from "../utils/itemEstadoCopy";

const TIPO_LABEL: Record<EditableTipo, string> = {
  gema: "Gema",
  joya: "Joya",
  insumo: "Insumo",
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
  // Catalog tiers — the prices the public catalog actually reads.
  // precioEmbajadorCOP (sheet col N) is the public price; precioConscienteCOP
  // (col O) is the preferential tier. products.get returns the full doc, so
  // these always exist at runtime — the interface just under-declared them.
  precioEmbajadorCOP?: number;
  precioConscienteCOP?: number;
  // Cost basis (lot cost × preponderancia, sheet col M) — base for the tier
  // multipliers when in-session preponderancia is 0/empty.
  costoBaseCOP?: number;
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
  // Legacy bruto-only metadata. Rough stones now edit as gemas (see
  // inferItemTipo), so these are no longer surfaced; they're kept on the row so
  // inferItemTipo can read them and the gema patch leaves them untouched.
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
  /** Lot lifecycle estado — drives the estado-aware catalog banner (C9). */
  lotEstado: LotEstado;
  /** When false, all gem fields are read-only and only the photo can change. */
  editable?: boolean;
  /**
   * Fotosynthia v2 — an AI edit patch merged on top of the hydrated draft when
   * the drawer opens (before the dirty baseline is captured). Keys are field
   * names (EDIT_PATCH_KEYS); preponderancia and photos are ignored. The human
   * reviews + Guardar.
   */
  editDraftOverride?: Record<string, unknown>;
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
  lotEstado,
  editable = true,
  editDraftOverride,
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

  // C3 — shared soft lock by itemId. If another admin (e.g. via the
  // ProductManagement EditDrawer) currently holds this row, Save + Delete are
  // disabled so we never clobber their edit. Same productLocks row, either side.
  const { lockedByOther } = useProductLock(itemId, open);
  const lockMinutesLeft = useMemo(() => {
    if (!lockedByOther) return null;
    const ms = Date.parse(lockedByOther.expiresAt);
    if (!Number.isFinite(ms)) return null;
    return Math.max(0, Math.ceil((ms - Date.now()) / 60000));
  }, [lockedByOther]);

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
  const [insumoDraft, setInsumoDraft] = useState<InsumoDraft>(
    () =>
      ({
        ...EMPTY_INSUMO_DRAFT,
        preponderancia: currentPreponderancia,
      }) as InsumoDraft,
  );
  const [observacion, setObservacion] = useState("");
  const [mostrarEnCatalogo, setMostrarEnCatalogo] = useState(false);
  // Catalog tiers (Goal F2) — a SHARED value (sibling of observación /
  // mostrarEnCatalogo), not a sub-form draft. Seeded from the product in the
  // hydrate effect and folded into the dirty baseline so any tier edit arms the
  // discard guard. Insumos never render these, so they stay ""/"".
  const [pricing, setPricing] = useState<ItemPricingDraft>({
    precioEmbajadorCOP: "",
    precioConscienteCOP: "",
  });
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
  // C4 — baseline snapshot of the editable fields captured when the drawer
  // opens. We compare the live values against this (not the live Convex prop)
  // so a background edit by another admin can't trip a false discard prompt.
  const baselineRef = useRef<string | null>(null);
  // Hydrate (seed + baseline) ONCE per open session per item — keyed on the
  // edited itemId. Without this, a reactive `product` re-emit (a concurrent
  // admin save or the mirror cron) would re-run the seed effect, clobber the
  // operator's in-flight edits AND reset the baseline so the dirty guard reads
  // clean — silently discarding work with no discard prompt. (Review fix.)
  const hydratedKeyRef = useRef<string | null>(null);

  // Revoke any object URLs we created for previews so we don't leak blobs.
  const revokeLocalPreviews = (list: DropzonePhoto[]) => {
    for (const p of list) {
      if (p.url.startsWith("blob:")) URL.revokeObjectURL(p.url);
    }
  };

  // Hydrate the local draft from the mirror once per open session (per item).
  // We deliberately do NOT re-seed on later `product`/`currentPreponderancia`
  // re-emits while open — that would clobber unsaved edits and reset the dirty
  // baseline (see hydratedKeyRef). The drawer re-syncs on the next open.
  useEffect(() => {
    if (!open) {
      hydratedKeyRef.current = null;
      return;
    }
    if (!product) return;
    if (hydratedKeyRef.current === itemId) return;
    hydratedKeyRef.current = itemId;
    const t = inferItemTipo(product);
    let seededActive: GemaDraft | JoyaDraft | InsumoDraft;
    if (t === "joya") {
      const d = {
        ...joyaDraftFromProduct(product),
        preponderancia: currentPreponderancia,
      };
      setJoyaDraft(d);
      seededActive = d;
    } else if (t === "insumo") {
      const d = {
        ...insumoDraftFromProduct(product),
        preponderancia: currentPreponderancia,
      };
      setInsumoDraft(d);
      seededActive = d;
    } else {
      const d = {
        ...gemaDraftFromProduct(product),
        preponderancia: currentPreponderancia,
      };
      setDraft(d);
      seededActive = d;
    }
    // For a joya the stored free text round-trips through JoyaFields'
    // `descripcion`, so the shared observación textarea is hidden + left empty.
    let seededObservacion = t === "joya" ? "" : (product.observacion ?? "");
    let seededMostrar = product.mostrarEnCatalogo ?? false;
    // F2 — seed the catalog tiers from the persisted product. An unset tier
    // hydrates as "" (not 0) so the omit-on-blank submit rule never re-sends a
    // price the operator didn't touch.
    const seededPricing: ItemPricingDraft = {
      precioEmbajadorCOP: product.precioEmbajadorCOP ?? "",
      precioConscienteCOP: product.precioConscienteCOP ?? "",
    };
    // Fotosynthia v2 — merge an AI edit patch ON TOP of the hydrated values,
    // BEFORE the baseline is captured below so dirty detection stays correct.
    // preponderancia (lot-derived) and photos are never touched.
    if (editDraftOverride) {
      const o: Record<string, unknown> = { ...editDraftOverride };
      delete o.preponderancia;
      if (typeof o.observacion === "string") {
        seededObservacion = o.observacion;
      }
      delete o.observacion;
      if (typeof o.mostrarEnCatalogo === "boolean") {
        seededMostrar = o.mostrarEnCatalogo;
      }
      delete o.mostrarEnCatalogo;
      if (typeof o.precioEmbajadorCOP === "number") {
        seededPricing.precioEmbajadorCOP = o.precioEmbajadorCOP;
      }
      delete o.precioEmbajadorCOP;
      if (typeof o.precioConscienteCOP === "number") {
        seededPricing.precioConscienteCOP = o.precioConscienteCOP;
      }
      delete o.precioConscienteCOP;
      // Remaining keys belong to the active sub-form draft. Re-set it so the
      // form reflects the merge (last setState wins over the seed above).
      if (t === "joya") {
        seededActive = {
          ...(seededActive as JoyaDraft),
          ...(o as Partial<JoyaDraft>),
        };
        setJoyaDraft(seededActive as JoyaDraft);
      } else if (t === "insumo") {
        seededActive = {
          ...(seededActive as InsumoDraft),
          ...(o as Partial<InsumoDraft>),
        };
        setInsumoDraft(seededActive as InsumoDraft);
      } else {
        seededActive = {
          ...(seededActive as GemaDraft),
          ...(o as Partial<GemaDraft>),
        };
        setDraft(seededActive as GemaDraft);
      }
    }
    setObservacion(seededObservacion);
    setMostrarEnCatalogo(seededMostrar);
    setPricing(seededPricing);
    // C4 — capture the dirty baseline from the same seeded values so it can
    // never drift from what we just hydrated into the form.
    baselineRef.current = JSON.stringify({
      draft: seededActive,
      observacion: seededObservacion,
      mostrarEnCatalogo: seededMostrar,
      pricing: seededPricing,
    });
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
  }, [open, product, itemId, currentPreponderancia, editDraftOverride]);

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
  const activeDraft: GemaDraft | JoyaDraft | InsumoDraft =
    tipo === "joya" ? joyaDraft : tipo === "insumo" ? insumoDraft : draft;
  const activeNombre = activeDraft.nombre;
  const activePreponderancia = activeDraft.preponderancia;

  const prepNumeric =
    typeof activePreponderancia === "number" ? activePreponderancia : 0;
  // F2 — base cost the catalog-tier multipliers scale. Recomputed live from the
  // in-session preponderancia (so dragging prep updates the suggested tier) and
  // falls back to the persisted costoBaseCOP when prep is 0/empty.
  const liveCostoBaseCOP = useMemo(
    () =>
      lotCostoTotalCOP > 0 && prepNumeric > 0
        ? Math.round(lotCostoTotalCOP * (prepNumeric / 100))
        : (product?.costoBaseCOP ?? 0),
    [lotCostoTotalCOP, prepNumeric, product?.costoBaseCOP],
  );
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

  // C4 — dirty when the live editable state diverges from the open-time
  // baseline (or a new photo/certificate is staged). Gated on `open` so a
  // closed drawer never keeps the beforeunload guard armed.
  const editSnapshot = JSON.stringify({
    draft: activeDraft,
    observacion,
    mostrarEnCatalogo,
    pricing,
  });
  const fieldsDirty =
    baselineRef.current !== null && editSnapshot !== baselineRef.current;
  const dirty =
    open && ((editable && fieldsDirty) || photoChanged || certificadoChanged);
  const {
    guardedClose,
    requestClose,
    confirmOpen,
    confirmDiscard,
    cancelDiscard,
  } = useDirtyGuard({ dirty, onClose, enabled: !saving && !deleting });

  const canSubmit =
    !!product &&
    !saving &&
    !deleting &&
    !lockedByOther &&
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
            : tipo === "insumo"
              ? insumoPatchFromDraft(
                  insumoDraft,
                  observacion,
                  mostrarEnCatalogo,
                )
              : gemaPatchFromDraft(draft, observacion, mostrarEnCatalogo);
        // F2 — fold in the catalog tiers (precioEmbajadorCOP /
        // precioConscienteCOP). tierPricePatch omits blank tiers so a no-op
        // never clears a stored price; insumos never expose the editors and
        // keep ""/"", so we also gate the merge as belt-and-suspenders.
        if (tipo !== "insumo") {
          Object.assign(
            patch,
            tierPricePatch(
              pricing.precioEmbajadorCOP,
              pricing.precioConscienteCOP,
            ),
          );
        }
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
    if (!editable || deleting || lockedByOther) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await removeLotItem({ lotItemId });
      notify(`Ítem #${itemId} eliminado del lote`, "success");
      // C7 — if removing this stone broke the lot's 100% preponderancia sum on
      // a closed/published lot, surface it instead of letting it pass silently.
      if (res?.warning) notify(res.warning, "warning");
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
      onClose={guardedClose}
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
            {itemEstadoCopy(lotEstado).subtitle}
          </Box>
        </Box>
        <Box
          component="button"
          type="button"
          onClick={requestClose}
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
        {lockedByOther ? (
          <Box
            role="status"
            aria-live="polite"
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              background: foto.surfaces.inset,
              border: `1px solid ${foto.surfaces.rule}`,
              borderLeft: `3px solid ${foto.status.sold}`,
              borderRadius: "10px",
              padding: "11px 13px",
            }}
          >
            <Lock
              size={15}
              strokeWidth={2}
              style={{ marginTop: 1, color: foto.status.sold, flexShrink: 0 }}
            />
            <Box
              sx={{ fontSize: 12, color: foto.ink.secondary, lineHeight: 1.5 }}
            >
              <Box
                component="span"
                sx={{ fontWeight: 600, color: foto.ink.primary }}
              >
                {lockedByOther.holderName?.trim() || lockedByOther.holderEmail}
              </Box>{" "}
              está editando este ítem
              {lockMinutesLeft != null
                ? ` (su sesión expira en ${lockMinutesLeft} min)`
                : ""}
              . Guardado deshabilitado para no sobrescribir sus cambios.
            </Box>
          </Box>
        ) : null}
        {/* C9 — estado-aware banner: tells the operator whether this edit is a
            private fix (cerrado) or an instant public-catalog change (publicado).
            role="note" (not a live region) so it doesn't compete with the lock
            banner's aria-live announcement; the two use different accents. */}
        {(() => {
          const estadoCopy = itemEstadoCopy(lotEstado);
          if (!estadoCopy.banner) return null;
          const accent =
            estadoCopy.tone === "emerald"
              ? foto.accent.primary
              : foto.ink.tertiary;
          return (
            <Box
              role="note"
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                background: foto.surfaces.inset,
                border: `1px solid ${foto.surfaces.rule}`,
                borderLeft: `3px solid ${accent}`,
                borderRadius: "10px",
                padding: "11px 13px",
              }}
            >
              <Globe
                size={15}
                strokeWidth={2}
                style={{ marginTop: 1, color: accent, flexShrink: 0 }}
              />
              <Box
                sx={{
                  fontSize: 12,
                  color: foto.ink.secondary,
                  lineHeight: 1.5,
                }}
              >
                {estadoCopy.banner}
              </Box>
            </Box>
          );
        })()}
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
            ) : tipo === "insumo" ? (
              <InsumoFields
                value={insumoDraft}
                onChange={(patch) =>
                  setInsumoDraft((prev) => ({ ...prev, ...patch }))
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

            {/* F2 — Precios del catálogo. ONE shared tier editor for every
                item kind except insumos (internal supplies never reach the
                public catalog). The base/col-L price stays in the sub-form
                above; these two tiers are the ones the customer actually sees.
                Hidden in read-only media-only sessions so we never surface a
                non-functional slider. */}
            {editable && tipo !== "insumo" ? (
              <Box>
                <FieldLabel>Precios del catálogo</FieldLabel>
                <Box
                  sx={{
                    fontSize: 11.5,
                    color: foto.ink.tertiary,
                    marginTop: "-2px",
                    marginBottom: "10px",
                    lineHeight: 1.45,
                  }}
                >
                  El cliente paga el{" "}
                  <Box
                    component="span"
                    sx={{ fontWeight: 600, color: foto.ink.secondary }}
                  >
                    precio embajador
                  </Box>
                  . El precio base de arriba es solo referencia interna.
                </Box>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "minmax(0, 1fr) minmax(0, 1fr)",
                    },
                    gap: "16px",
                  }}
                >
                  <PriceMultiplierField
                    label="Precio embajador"
                    optional="público"
                    baseCOP={liveCostoBaseCOP}
                    defaultMultiplier={2.5}
                    value={pricing.precioEmbajadorCOP}
                    onChange={(next) =>
                      setPricing((prev) => ({
                        ...prev,
                        precioEmbajadorCOP: next,
                      }))
                    }
                    ariaLabel="Precio embajador en COP — precio público"
                  />
                  <PriceMultiplierField
                    label="Precio consciente"
                    optional="consciente"
                    baseCOP={liveCostoBaseCOP}
                    defaultMultiplier={3}
                    value={pricing.precioConscienteCOP}
                    onChange={(next) =>
                      setPricing((prev) => ({
                        ...prev,
                        precioConscienteCOP: next,
                      }))
                    }
                    ariaLabel="Precio clientes conscientes en COP"
                  />
                </Box>
              </Box>
            ) : null}

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
          disabled={!editable || deleting || !product || !!lockedByOther}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontFamily: fontFamilies.system,
            fontSize: "12.5px",
            fontWeight: 600,
            padding: "11px 14px",
            borderRadius: "9px",
            cursor:
              editable && !deleting && !lockedByOther
                ? "pointer"
                : "not-allowed",
            background: confirmDelete
              ? foto.status.sold
              : alpha(foto.status.sold, 0.08),
            color: confirmDelete ? foto.ink.inverse : foto.status.sold,
            border: `1px solid ${
              confirmDelete ? foto.status.sold : alpha(foto.status.sold, 0.32)
            }`,
            transition: "background 120ms ease, color 120ms ease",
            opacity: editable && !lockedByOther ? 1 : 0.4,
            "&:hover":
              editable && !lockedByOther
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
            onClick={requestClose}
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

      {/* C4 — discard guard for close/backdrop/Esc/Cancelar while dirty. */}
      <ConfirmDialog
        open={confirmOpen}
        title="Descartar cambios"
        message="Tenés cambios sin guardar en este ítem. ¿Querés descartarlos?"
        confirmLabel="Descartar"
        cancelLabel="Seguir editando"
        onConfirm={confirmDiscard}
        onCancel={cancelDiscard}
      />
    </Dialog>
  );
}

export default EditItemDrawer;
