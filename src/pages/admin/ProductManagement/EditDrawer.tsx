/**
 * EditDrawer — atelier editor for one product.
 *
 * Slides in from the right. The list stays visible behind it, like
 * turning a leather-bound ledger to a marked page while keeping a
 * finger between the other entries.
 *
 * Sections:
 *   Header — item stamp, status pip, name, sync indicator
 *   Identity — nombre, coleccion, caja, ubicacion
 *   Specifications — peso, color, calidad, talla, medidas, cantidad, categoria
 *   Pricing — precioCOP
 *   Status — estado (radio group with status pips)
 *   History — last edits (collapsed accordion)
 *   Footer — Cancel + Save (sticky)
 *
 * The drawer holds local state until the user presses Save; on Save it
 * calls the saveEdit mutation which patches the Convex mirror and fires
 * the pushToSheet action. Optimistic UI: the row in the list reflects
 * the change immediately because both list and drawer subscribe to the
 * same Convex query.
 *
 * Per Interface Design mandate:
 *   Intent — read context, edit precisely, save without leaving the ledger.
 *   Palette — panel/canvas/inset; status tint on header echoes the row.
 *   Depth — borders-only; hairlines for left edge, sections, footer.
 *   Surfaces — foto.surfaces.panel (drawer), .canvas (header), .inset (inputs).
 *   Typography — atelier.type.headline / .section / .label / .data.
 *   Spacing — 480px width; 24/20 padding; 32px section gap; 16px field gap.
 */

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Box, ButtonBase, Drawer, InputBase, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";
import { getAtelier, getFoto } from "../../../design-system";
import {
  convexApi,
  convexReady,
  useConvexQuery,
} from "../../../lib/convex-safe";
import { useProductLock } from "../../../hooks/useProductLock";
import { useDirtyGuard } from "../../../hooks/useDirtyGuard";
import ConfirmDialog from "../../../components/shared/ConfirmDialog";
import { StatusPip, type EstadoValue } from "./StatusPip";
import { AsesorMovementPanel } from "./AsesorMovementPanel";
// Phase G — create mode: typed payload for the "+ Nueva piedra" flow.
import type { NewProductInput } from "../../../utils/createProduct-validate";

interface DriveMedia {
  id: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  proxyUrl?: string;
  type: "image" | "video";
}

interface DriveFolderState {
  folderId: string | null;
  images: DriveMedia[];
  isLoading: boolean;
  error: string | null;
}

const EMPTY_DRIVE_STATE: DriveFolderState = {
  folderId: null,
  images: [],
  isLoading: false,
  error: null,
};

export interface EditDrawerProduct {
  itemId: string;
  rowIndex: number;
  nombre?: string;
  peso?: string;
  color?: string;
  calidad?: string;
  cantidad?: number;
  talla?: string;
  medidas?: string;
  categoria?: string;
  precioCOP?: number;
  ubicacion?: string;
  coleccion?: string;
  caja?: string;
  estado: EstadoValue;
  /**
   * When set, the product belongs to a Fotosíntesis lote. The public catalog
   * price is the precio embajador (col N), managed in Fotosíntesis; the
   * "Precio COP" field below (col L) is only an internal/base reference.
   * Drives the deep-link notice in the Precio section.
   */
  loteId?: string;
  syncStatus: "synced" | "pending" | "error";
  syncError?: string;
  lastPushedAt?: string;
}

export interface EditDrawerPatch {
  nombre?: string;
  peso?: string;
  color?: string;
  calidad?: string;
  cantidad?: number;
  talla?: string;
  medidas?: string;
  categoria?: string;
  precioCOP?: number;
  ubicacion?: string;
  coleccion?: string;
  caja?: string;
  estado?: EstadoValue;
}

interface EditDrawerProps {
  open: boolean;
  product: EditDrawerProduct | null;
  isSaving: boolean;
  onClose: () => void;
  /**
   * Phase G — create mode. In edit mode, `onSave(itemId, patch, "edit")`
   * passes only the diffed fields. In create mode the drawer hands the
   * full draft as a NewProductInput with `itemId` set from the dedicated
   * "Número" field; the parent calls `validateNewProduct` + the Convex
   * createProduct mutation. The single signature lets the parent keep one
   * handler for both flows and dispatch on `mode`.
   */
  onSave: (
    itemId: string | undefined,
    payloadOrPatch: EditDrawerPatch | NewProductInput,
    mode: "edit" | "create",
  ) => Promise<void> | void;
  /** "edit" (default) opens the drawer on an existing product; "create"
   *  opens an empty drawer for the "+ Nueva piedra" flow. */
  mode?: "edit" | "create";
  /** Triggered by the in-drawer "Resync ahora" button when a 409
   *  conflict ("sheet was reordered") is detected on the open product. */
  onResync?: () => Promise<void> | void;
  /** True while the parent's pullFromSheet is in flight. */
  isResyncing?: boolean;
}

/**
 * The api/admin-product-update endpoint throws this exact phrase
 * when the rowIndex no longer matches the column-A item id (sheet
 * was re-ordered between cron pulls). Used to flip the drawer footer
 * into the conflict-recovery banner.
 */
const CONFLICT_MARKER = "re-ordered";

interface DraftState {
  /** Phase G — create mode: itemId lives in the draft so the user can
   *  type a number for a new piece. In edit mode it's seeded from the
   *  product but never read out (the existing `product.itemId` is used
   *  by `onSave` directly). */
  itemId: string;
  nombre: string;
  peso: string;
  color: string;
  calidad: string;
  cantidad: string;
  talla: string;
  medidas: string;
  categoria: string;
  precioCOP: string;
  ubicacion: string;
  coleccion: string;
  caja: string;
  estado: EstadoValue;
}

function toDraft(p: EditDrawerProduct | null): DraftState {
  return {
    itemId: p?.itemId ?? "",
    nombre: p?.nombre ?? "",
    peso: p?.peso ?? "",
    color: p?.color ?? "",
    calidad: p?.calidad ?? "",
    cantidad: p?.cantidad != null ? String(p.cantidad) : "",
    talla: p?.talla ?? "",
    medidas: p?.medidas ?? "",
    categoria: p?.categoria ?? "",
    precioCOP: p?.precioCOP != null ? String(p.precioCOP) : "",
    ubicacion: p?.ubicacion ?? "",
    coleccion: p?.coleccion ?? "",
    caja: p?.caja ?? "",
    estado: p?.estado ?? "DISPONIBLE",
  };
}

// Phase G — create mode: shape the draft into a NewProductInput. Empty
// strings are passed through (validateNewProduct trims + drops them).
function draftToNewProduct(draft: DraftState): NewProductInput {
  const cantidadNum =
    draft.cantidad === "" ? undefined : Number(draft.cantidad);
  const precioNum =
    draft.precioCOP === "" ? undefined : Number(draft.precioCOP);
  return {
    itemId: draft.itemId,
    nombre: draft.nombre,
    peso: draft.peso,
    color: draft.color,
    calidad: draft.calidad,
    cantidad:
      cantidadNum !== undefined && Number.isFinite(cantidadNum)
        ? cantidadNum
        : undefined,
    talla: draft.talla,
    medidas: draft.medidas,
    categoria: draft.categoria,
    precioCOP:
      precioNum !== undefined && Number.isFinite(precioNum)
        ? precioNum
        : undefined,
    ubicacion: draft.ubicacion,
    coleccion: draft.coleccion,
    caja: draft.caja,
  };
}

function diffDraft(
  draft: DraftState,
  original: EditDrawerProduct | null,
): EditDrawerPatch {
  if (!original) return {};
  const patch: EditDrawerPatch = {};
  const ifChanged = <K extends keyof EditDrawerPatch>(
    key: K,
    nextValue: EditDrawerPatch[K],
    originalValue: EditDrawerPatch[K],
  ) => {
    if (nextValue !== originalValue) {
      patch[key] = nextValue;
    }
  };

  ifChanged("nombre", draft.nombre, original.nombre ?? "");
  ifChanged("peso", draft.peso, original.peso ?? "");
  ifChanged("color", draft.color, original.color ?? "");
  ifChanged("calidad", draft.calidad, original.calidad ?? "");
  ifChanged("talla", draft.talla, original.talla ?? "");
  ifChanged("medidas", draft.medidas, original.medidas ?? "");
  ifChanged("categoria", draft.categoria, original.categoria ?? "");
  ifChanged("ubicacion", draft.ubicacion, original.ubicacion ?? "");
  ifChanged("coleccion", draft.coleccion, original.coleccion ?? "");
  ifChanged("caja", draft.caja, original.caja ?? "");
  ifChanged("estado", draft.estado, original.estado);

  // Numeric fields — parse, only include if valid and changed
  const cantidadNum =
    draft.cantidad === "" ? undefined : Number(draft.cantidad);
  if (cantidadNum !== undefined && Number.isFinite(cantidadNum)) {
    if (cantidadNum !== (original.cantidad ?? -1)) {
      patch.cantidad = cantidadNum;
    }
  }
  const precioNum =
    draft.precioCOP === "" ? undefined : Number(draft.precioCOP);
  if (precioNum !== undefined && Number.isFinite(precioNum)) {
    if (precioNum !== (original.precioCOP ?? -1)) {
      patch.precioCOP = precioNum;
    }
  }

  return patch;
}

export function EditDrawer({
  open,
  product,
  isSaving,
  onClose,
  onSave,
  // Phase G — create mode
  mode = "edit",
  onResync,
  isResyncing = false,
}: EditDrawerProps) {
  const theme = useTheme();
  const atelier = getAtelier(theme.palette.mode);
  const foto = getFoto(theme.palette.mode === "dark" ? "dark" : "light");
  const { lockedByOther } = useProductLock(product?.itemId, open);
  const [draft, setDraft] = useState<DraftState>(() => toDraft(product));
  const [driveState, setDriveState] =
    useState<DriveFolderState>(EMPTY_DRIVE_STATE);

  // Reset draft when the product changes
  useEffect(() => {
    setDraft(toDraft(product));
  }, [product?.itemId, product]);

  // Lazy-fetch Drive folder + media when drawer opens for a product
  useEffect(() => {
    if (!open || !product?.itemId) {
      setDriveState(EMPTY_DRIVE_STATE);
      return;
    }
    let cancelled = false;
    setDriveState({ folderId: null, images: [], isLoading: true, error: null });
    fetch(
      `/api/get-drive-images?itemNumber=${encodeURIComponent(product.itemId)}`,
    )
      .then((r) => r.json())
      .then(
        (data: {
          success?: boolean;
          folderId?: string | null;
          images?: DriveMedia[];
          error?: string;
        }) => {
          if (cancelled) return;
          if (data?.success === false) {
            setDriveState({
              folderId: null,
              images: [],
              isLoading: false,
              error: data.error ?? "Error",
            });
            return;
          }
          setDriveState({
            folderId: data.folderId ?? null,
            images: Array.isArray(data.images) ? data.images : [],
            isLoading: false,
            error: null,
          });
        },
      )
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "No se pudo cargar la carpeta";
        setDriveState({
          folderId: null,
          images: [],
          isLoading: false,
          error: message,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [open, product?.itemId]);

  // ─── Soft lock ──────────────────────────────────────────────────────
  // shared with the Fotosíntesis EditItemDrawer via useProductLock (called
  // above): both contend on the same productLocks row by itemId, so the two
  // editors can't silently clobber each other. `lockedByOther` is non-null
  // only when a DIFFERENT admin currently holds the lock.

  const patch = useMemo(() => diffDraft(draft, product), [draft, product]);
  const hasChanges = Object.keys(patch).length > 0;

  // C4 — guard the close/backdrop/Esc/Cancelar paths so the "N cambios sin
  // guardar" the footer already advertises aren't silently discarded. Reuses
  // the existing diff (hasChanges); create mode has no diff so it's unguarded.
  const {
    guardedClose,
    requestClose,
    confirmOpen,
    confirmDiscard,
    cancelDiscard,
  } = useDirtyGuard({ dirty: hasChanges, onClose, enabled: !isSaving });

  // Phase G — create mode: in create mode the drawer renders without a
  // product (we synthesize headers/footer from the draft). The empty
  // fallback only applies when *neither* a product nor create mode is
  // active — i.e. the drawer is mounted but has nothing to do.
  const isCreate = mode === "create";
  if (!product && !isCreate) {
    return (
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            width: `${atelier.spacing.drawerWidth}px`,
            backgroundColor: foto.surfaces.panel,
            borderLeft: `1px solid ${foto.surfaces.edgeStrong}`,
          },
        }}
      />
    );
  }

  const headerTint = !product
    ? "transparent"
    : product.estado === "DISPONIBLE"
      ? atelier.status.available.rowTint
      : product.estado === "VENDIDA"
        ? atelier.status.sold.rowTint
        : product.estado === "ASESOR"
          ? atelier.status.consigned.rowTint
          : "transparent";

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={isSaving ? undefined : guardedClose}
      PaperProps={{
        sx: {
          width: `${atelier.spacing.drawerWidth}px`,
          maxWidth: "100vw",
          backgroundColor: foto.surfaces.panel,
          borderLeft: `1px solid ${foto.surfaces.edgeStrong}`,
          boxShadow: "none",
        },
      }}
    >
      <Box
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* HEADER */}
        <Box
          sx={{
            backgroundColor: foto.surfaces.canvas,
            backgroundImage: `linear-gradient(${headerTint}, ${headerTint})`,
            borderBottom: `1px solid ${foto.surfaces.edgeStrong}`,
            px: `${atelier.spacing.drawerPaddingX}px`,
            pt: `${atelier.spacing.drawerPaddingY}px`,
            pb: `${atelier.spacing.drawerPaddingY}px`,
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: isCreate ? "1fr auto" : "auto auto 1fr auto",
              alignItems: "center",
              gap: 2,
            }}
          >
            {isCreate ? (
              <Typography
                component="div"
                sx={{
                  ...atelier.type.headline,
                  color: atelier.ink.primary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                Nueva piedra
              </Typography>
            ) : (
              <>
                <Typography
                  component="span"
                  sx={{
                    ...atelier.type.data,
                    color: atelier.ink.tertiary,
                    fontSize: "14px",
                  }}
                >
                  {product!.itemId.padStart(4, "0")}
                </Typography>
                <StatusPip estado={product!.estado} foto={foto} />
                <Typography
                  component="div"
                  sx={{
                    ...atelier.type.headline,
                    color: atelier.ink.primary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={product!.nombre || `Item ${product!.itemId}`}
                >
                  {product!.nombre || `Item ${product!.itemId}`}
                </Typography>
              </>
            )}
            <CloseButton
              onClose={requestClose}
              disabled={isSaving}
              atelier={atelier}
              foto={foto}
            />
          </Box>
          {!isCreate && product && (
            <SyncMeta product={product} atelier={atelier} />
          )}
          {isCreate && (
            <Typography
              sx={{
                ...atelier.type.meta,
                fontSize: "11px",
                color: atelier.ink.tertiary,
                mt: "8px",
              }}
            >
              Asigna un número y rellena los datos esenciales. Se anexará a la
              hoja al guardar.
            </Typography>
          )}
        </Box>

        {/* BODY (scrollable) */}
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            px: `${atelier.spacing.drawerPaddingX}px`,
            py: `${atelier.spacing.drawerPaddingY}px`,
          }}
        >
          <Section title="Identidad" atelier={atelier} foto={foto}>
            {/* Phase G — create mode: itemId field. Required & monospaced
                so the user types a clean numeric tag. */}
            {isCreate && (
              <Field
                label="Número"
                value={draft.itemId}
                onChange={(v) =>
                  setDraft({ ...draft, itemId: v.replace(/[^0-9]/g, "") })
                }
                hint="Número único de la piedra en la hoja"
                atelier={atelier}
                foto={foto}
                monospace
                inputMode="numeric"
              />
            )}
            <Field
              label="Nombre"
              value={draft.nombre}
              onChange={(v) => setDraft({ ...draft, nombre: v })}
              atelier={atelier}
              foto={foto}
              monospace={false}
            />
            <FieldGrid>
              <Field
                label="Colección"
                value={draft.coleccion}
                onChange={(v) => setDraft({ ...draft, coleccion: v })}
                atelier={atelier}
                foto={foto}
                monospace={false}
              />
              <Field
                label="Caja"
                value={draft.caja}
                onChange={(v) => setDraft({ ...draft, caja: v })}
                atelier={atelier}
                foto={foto}
                monospace
              />
            </FieldGrid>
            <Field
              label="Ubicación"
              value={draft.ubicacion}
              onChange={(v) => setDraft({ ...draft, ubicacion: v })}
              atelier={atelier}
              foto={foto}
              monospace={false}
            />
          </Section>

          <Section title="Especificaciones" atelier={atelier} foto={foto}>
            <FieldGrid>
              <Field
                label="Peso"
                value={draft.peso}
                onChange={(v) => setDraft({ ...draft, peso: v })}
                hint="Quilates o «Plata» / «Oro 18k»"
                atelier={atelier}
                foto={foto}
                monospace
              />
              <Field
                label="Cantidad"
                value={draft.cantidad}
                onChange={(v) =>
                  setDraft({ ...draft, cantidad: v.replace(/[^0-9]/g, "") })
                }
                atelier={atelier}
                foto={foto}
                monospace
                inputMode="numeric"
              />
            </FieldGrid>
            <FieldGrid>
              <Field
                label="Color"
                value={draft.color}
                onChange={(v) => setDraft({ ...draft, color: v })}
                atelier={atelier}
                foto={foto}
                monospace={false}
              />
              <Field
                label="Calidad"
                value={draft.calidad}
                onChange={(v) => setDraft({ ...draft, calidad: v })}
                atelier={atelier}
                foto={foto}
                monospace={false}
              />
            </FieldGrid>
            <FieldGrid>
              <Field
                label="Talla"
                value={draft.talla}
                onChange={(v) => setDraft({ ...draft, talla: v })}
                atelier={atelier}
                foto={foto}
                monospace
              />
              <Field
                label="Categoría"
                value={draft.categoria}
                onChange={(v) => setDraft({ ...draft, categoria: v })}
                atelier={atelier}
                foto={foto}
                monospace={false}
              />
            </FieldGrid>
            <Field
              label="Medidas"
              value={draft.medidas}
              onChange={(v) => setDraft({ ...draft, medidas: v })}
              hint="Largo × Ancho · descripción libre"
              atelier={atelier}
              foto={foto}
              monospace={false}
            />
          </Section>

          <Section title="Precio" atelier={atelier} foto={foto}>
            <Field
              label="Precio COP"
              value={draft.precioCOP}
              onChange={(v) =>
                setDraft({ ...draft, precioCOP: v.replace(/[^0-9]/g, "") })
              }
              hint="Solo número entero, sin separadores"
              atelier={atelier}
              foto={foto}
              monospace
              inputMode="numeric"
              prefix="$"
            />
            {/* F8 — para piezas que pertenecen a un lote de Fotosíntesis, este
                "Precio COP" (col L) es solo una referencia interna/base; el
                precio público del catálogo (precio embajador, col N) se
                gestiona en Fotosíntesis. El deep-link es el puente; aquí no se
                editan los precios por nivel. */}
            {!isCreate && product?.loteId && (
              <LotePriceNotice
                loteId={product.loteId}
                atelier={atelier}
                foto={foto}
              />
            )}
          </Section>

          {/* Phase G — create mode skips the Estado radio: new pieces
              always start as DISPONIBLE (the createProduct mutation
              hardcodes that estado). */}
          {!isCreate && (
            <Section title="Estado" atelier={atelier} foto={foto}>
              <EstadoRadio
                value={draft.estado}
                onChange={(v) => setDraft({ ...draft, estado: v })}
                atelier={atelier}
                foto={foto}
              />
            </Section>
          )}

          {!isCreate && product && (
            <Section title="Con asesor" atelier={atelier} foto={foto}>
              <AsesorMovementPanel
                itemId={product.itemId}
                atelier={atelier}
                foto={foto}
              />
            </Section>
          )}

          {/* Phase G — create mode: no lock banner, no Drive folder, no
              audit history (none of these exist for an unsaved row). */}
          {!isCreate && lockedByOther && (
            <LockBanner
              lockedBy={lockedByOther}
              atelier={atelier}
              foto={foto}
            />
          )}

          {!isCreate && (
            <Section title="Archivos" atelier={atelier} foto={foto}>
              <DriveFolderBlock
                state={driveState}
                atelier={atelier}
                foto={foto}
              />
            </Section>
          )}

          {!isCreate && product && (
            <Section title="Historial" atelier={atelier} foto={foto}>
              <HistorialBlock
                itemId={product.itemId}
                atelier={atelier}
                foto={foto}
              />
            </Section>
          )}
        </Box>

        {/* Conflict banner — appears just above the footer when the
            push failed because the sheet was re-ordered. Edit mode only. */}
        {!isCreate &&
          product &&
          product.syncStatus === "error" &&
          (product.syncError ?? "").includes(CONFLICT_MARKER) &&
          onResync && (
            <ConflictBanner
              message={product.syncError ?? ""}
              isResyncing={isResyncing}
              onResync={onResync}
              atelier={atelier}
              foto={foto}
            />
          )}

        {/* FOOTER */}
        <Box
          sx={{
            borderTop: `1px solid ${foto.surfaces.edgeStrong}`,
            backgroundColor: foto.surfaces.canvas,
            px: `${atelier.spacing.drawerPaddingX}px`,
            py: "14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
          }}
        >
          {/* Phase G — create mode: footer status text + button label
              flip to "create" semantics. Save is gated on a non-empty
              itemId; in edit mode it's gated on hasChanges + no foreign
              lock as before. */}
          <Typography
            sx={{ ...atelier.type.label, color: atelier.ink.tertiary }}
          >
            {isCreate
              ? draft.itemId.trim()
                ? `Nueva piedra · ${draft.itemId.trim()}`
                : "Asigna un número para crear"
              : hasChanges
                ? `${Object.keys(patch).length} cambio${Object.keys(patch).length === 1 ? "" : "s"} sin guardar`
                : "Sin cambios"}
          </Typography>
          <Box sx={{ display: "inline-flex", gap: 1 }}>
            <ButtonBase
              onClick={requestClose}
              disabled={isSaving}
              disableRipple
              sx={{
                ...atelier.type.label,
                color: atelier.ink.secondary,
                px: "14px",
                py: "8px",
                borderRadius: "4px",
                border: `1px solid ${foto.surfaces.edgeStrong}`,
                transition: atelier.motion.rowHover,
                "&:hover": { backgroundColor: foto.surfaces.rowHover },
                "&:focus-visible": {
                  outline: `2px solid ${atelier.focus.ring}`,
                  outlineOffset: "2px",
                },
              }}
            >
              Cancelar
            </ButtonBase>
            <ButtonBase
              onClick={() => {
                if (isCreate) {
                  void onSave(undefined, draftToNewProduct(draft), "create");
                } else if (product) {
                  void onSave(product.itemId, patch, "edit");
                }
              }}
              disabled={
                isSaving ||
                (isCreate
                  ? !draft.itemId.trim()
                  : !hasChanges || !!lockedByOther)
              }
              disableRipple
              sx={{
                ...atelier.type.label,
                color: atelier.ink.inverse,
                backgroundColor:
                  isSaving ||
                  (isCreate
                    ? !draft.itemId.trim()
                    : !hasChanges || !!lockedByOther)
                    ? atelier.ink.muted
                    : atelier.focus.ring,
                px: "14px",
                py: "8px",
                borderRadius: "4px",
                transition: atelier.motion.rowHover,
                "&:hover": {
                  backgroundColor:
                    isSaving ||
                    (isCreate
                      ? !draft.itemId.trim()
                      : !hasChanges || !!lockedByOther)
                      ? atelier.ink.muted
                      : atelier.status.available.pip,
                },
                "&:focus-visible": {
                  outline: `2px solid ${atelier.focus.ring}`,
                  outlineOffset: "2px",
                },
              }}
            >
              {isSaving
                ? isCreate
                  ? "Creando…"
                  : "Guardando…"
                : isCreate
                  ? "Crear y sincronizar"
                  : "Guardar"}
            </ButtonBase>
          </Box>
        </Box>
      </Box>

      {/* C4 — discard guard for close/backdrop/Esc/Cancelar while dirty. */}
      <ConfirmDialog
        open={confirmOpen}
        title="Descartar cambios"
        message={`Tenés ${Object.keys(patch).length} cambio${
          Object.keys(patch).length === 1 ? "" : "s"
        } sin guardar. ¿Querés descartarlos?`}
        confirmLabel="Descartar"
        cancelLabel="Seguir editando"
        onConfirm={confirmDiscard}
        onCancel={cancelDiscard}
      />
    </Drawer>
  );
}

// =============================================================================
// SUB-COMPONENTS (file-private)
// =============================================================================

function Section({
  title,
  atelier,
  foto,
  children,
}: {
  title: string;
  atelier: ReturnType<typeof getAtelier>;
  foto: ReturnType<typeof getFoto>;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ mb: `${atelier.spacing.sectionGap}px` }}>
      <Typography
        component="h3"
        sx={{
          ...atelier.type.section,
          color: atelier.ink.tertiary,
          mb: "12px",
          pb: "6px",
          borderBottom: `1px solid ${foto.surfaces.edge}`,
        }}
      >
        {title}
      </Typography>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: `${atelier.spacing.fieldGap}px`,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 2,
      }}
    >
      {children}
    </Box>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
  atelier,
  foto,
  monospace,
  inputMode,
  prefix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  atelier: ReturnType<typeof getAtelier>;
  foto: ReturnType<typeof getFoto>;
  monospace?: boolean;
  inputMode?: "numeric" | "decimal" | "text";
  prefix?: string;
}) {
  const inputStyle = monospace
    ? {
        ...atelier.type.data,
        color: atelier.ink.primary,
        flex: 1,
      }
    : {
        ...atelier.type.meta,
        color: atelier.ink.primary,
        flex: 1,
      };
  return (
    <Box>
      <Typography
        component="label"
        sx={{
          ...atelier.type.label,
          color: atelier.ink.tertiary,
          display: "block",
          mb: "6px",
        }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          backgroundColor: foto.surfaces.inset,
          border: `1px solid ${foto.surfaces.edge}`,
          borderRadius: "4px",
          px: "10px",
          py: "8px",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          transition: "border-color 120ms linear",
          "&:focus-within": {
            borderColor: atelier.focus.ring,
          },
        }}
      >
        {prefix && (
          <Typography
            component="span"
            sx={{ ...atelier.type.data, color: atelier.ink.tertiary }}
          >
            {prefix}
          </Typography>
        )}
        <InputBase
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange(e.target.value)
          }
          inputProps={{ "aria-label": label, inputMode }}
          sx={inputStyle}
          fullWidth
        />
      </Box>
      {hint && (
        <Typography
          sx={{
            ...atelier.type.meta,
            fontSize: "11px",
            color: atelier.ink.muted,
            mt: "4px",
          }}
        >
          {hint}
        </Typography>
      )}
    </Box>
  );
}

function EstadoRadio({
  value,
  onChange,
  atelier,
  foto,
}: {
  value: EstadoValue;
  onChange: (v: EstadoValue) => void;
  atelier: ReturnType<typeof getAtelier>;
  foto: ReturnType<typeof getFoto>;
}) {
  const options: Array<{
    key: EstadoValue;
    label: string;
    description: string;
  }> = [
    {
      key: "DISPONIBLE",
      label: "Disponible",
      description: "En el inventario, lista para mostrar",
    },
    {
      key: "ASESOR",
      label: "Con asesor",
      description: "En consignación con un asesor",
    },
    {
      key: "VENDIDA",
      label: "Vendida",
      description: "Salida definitiva del inventario",
    },
  ];
  return (
    <Box
      role="radiogroup"
      aria-label="Estado del producto"
      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
    >
      {options.map((opt) => {
        const isSelected = value === opt.key;
        return (
          <ButtonBase
            key={opt.key}
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(opt.key)}
            disableRipple
            sx={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: 2,
              alignItems: "center",
              px: "12px",
              py: "10px",
              backgroundColor: isSelected
                ? foto.surfaces.rowActive
                : foto.surfaces.inset,
              border: `1px solid ${isSelected ? atelier.focus.ring : foto.surfaces.edge}`,
              borderRadius: "4px",
              transition: atelier.motion.rowHover,
              textAlign: "left",
              cursor: "pointer",
              "&:hover": {
                backgroundColor: foto.surfaces.rowHover,
              },
              "&:focus-visible": {
                outline: `2px solid ${atelier.focus.ring}`,
                outlineOffset: "2px",
              },
            }}
          >
            <StatusPip estado={opt.key} foto={foto} muted={!isSelected} />
            <Box>
              <Typography
                sx={{ ...atelier.type.label, color: atelier.ink.primary }}
              >
                {opt.label}
              </Typography>
              <Typography
                sx={{
                  ...atelier.type.meta,
                  fontSize: "11px",
                  color: atelier.ink.tertiary,
                  mt: "2px",
                }}
              >
                {opt.description}
              </Typography>
            </Box>
          </ButtonBase>
        );
      })}
    </Box>
  );
}

function CloseButton({
  onClose,
  disabled,
  atelier,
  foto,
}: {
  onClose: () => void;
  disabled: boolean;
  atelier: ReturnType<typeof getAtelier>;
  foto: ReturnType<typeof getFoto>;
}) {
  return (
    <ButtonBase
      onClick={onClose}
      disabled={disabled}
      disableRipple
      aria-label="Cerrar editor"
      sx={{
        width: "32px",
        height: "32px",
        borderRadius: "4px",
        color: atelier.ink.secondary,
        transition: atelier.motion.rowHover,
        "&:hover": {
          backgroundColor: foto.surfaces.rowHover,
          color: atelier.ink.primary,
        },
        "&:focus-visible": {
          outline: `2px solid ${atelier.focus.ring}`,
          outlineOffset: "2px",
        },
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 24 24"
        sx={{ width: "16px", height: "16px" }}
        aria-hidden
      >
        <path
          d="M6 6L18 18M6 18L18 6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      </Box>
    </ButtonBase>
  );
}

function SyncMeta({
  product,
  atelier,
}: {
  product: EditDrawerProduct;
  atelier: ReturnType<typeof getAtelier>;
}) {
  const status = product.syncStatus;
  const text =
    status === "synced"
      ? product.lastPushedAt
        ? `Última escritura · ${new Date(product.lastPushedAt).toLocaleString("es-CO")}`
        : "Sincronizado con la hoja"
      : status === "pending"
        ? "Sincronización pendiente"
        : product.syncError
          ? `Error: ${product.syncError}`
          : "Error de sincronización";

  const color =
    status === "synced"
      ? atelier.ink.tertiary
      : status === "pending"
        ? atelier.status.consigned.pip
        : atelier.status.sold.pip;

  return (
    <Typography
      sx={{
        ...atelier.type.meta,
        fontSize: "11px",
        color,
        mt: "8px",
      }}
    >
      {text}
    </Typography>
  );
}

function DriveFolderBlock({
  state,
  atelier,
  foto,
}: {
  state: DriveFolderState;
  atelier: ReturnType<typeof getAtelier>;
  foto: ReturnType<typeof getFoto>;
}) {
  const folderUrl = state.folderId
    ? `https://drive.google.com/drive/folders/${state.folderId}`
    : null;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: `${atelier.spacing.fieldGap}px`,
      }}
    >
      {folderUrl ? (
        <ButtonBase
          component="a"
          href={folderUrl}
          target="_blank"
          rel="noopener noreferrer"
          disableRipple
          sx={{
            ...atelier.type.label,
            color: atelier.ink.primary,
            backgroundColor: foto.surfaces.inset,
            border: `1px solid ${foto.surfaces.edge}`,
            borderRadius: "4px",
            px: "12px",
            py: "10px",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            alignSelf: "flex-start",
            textTransform: "none",
            transition: atelier.motion.rowHover,
            "&:hover": {
              backgroundColor: foto.surfaces.rowHover,
              borderColor: atelier.brass.soft,
            },
            "&:focus-visible": {
              outline: `2px solid ${atelier.focus.ring}`,
              outlineOffset: "2px",
            },
          }}
        >
          <Box
            component="svg"
            viewBox="0 0 24 24"
            sx={{ width: "14px", height: "14px", flexShrink: 0 }}
            aria-hidden
          >
            <path
              d="M3 7L9 7L11 5L21 5L21 19L3 19Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Box>
          <Typography
            component="span"
            sx={{ ...atelier.type.label, color: "inherit" }}
          >
            Abrir carpeta en Drive
          </Typography>
          <Box
            component="svg"
            viewBox="0 0 24 24"
            sx={{
              width: "12px",
              height: "12px",
              flexShrink: 0,
              color: atelier.ink.tertiary,
            }}
            aria-hidden
          >
            <path
              d="M14 5L19 5L19 10M19 5L11 13M5 19L19 19"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Box>
        </ButtonBase>
      ) : null}

      {state.isLoading ? (
        <Typography sx={{ ...atelier.type.meta, color: atelier.ink.tertiary }}>
          Cargando archivos…
        </Typography>
      ) : state.error ? (
        <Typography
          sx={{ ...atelier.type.meta, color: atelier.status.sold.pip }}
        >
          {state.error}
        </Typography>
      ) : !folderUrl ? (
        <Typography sx={{ ...atelier.type.meta, color: atelier.ink.tertiary }}>
          Sin carpeta en Drive todavía.
        </Typography>
      ) : state.images.length === 0 ? (
        <Typography sx={{ ...atelier.type.meta, color: atelier.ink.tertiary }}>
          La carpeta está vacía.
        </Typography>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
            gap: "8px",
          }}
        >
          {state.images.map((media) => (
            <ButtonBase
              key={media.id}
              component="a"
              href={media.url}
              target="_blank"
              rel="noopener noreferrer"
              disableRipple
              aria-label={media.name}
              title={media.name}
              sx={{
                position: "relative",
                aspectRatio: "1 / 1",
                overflow: "hidden",
                border: `1px solid ${foto.surfaces.edge}`,
                borderRadius: "4px",
                backgroundColor: foto.surfaces.inset,
                display: "block",
                transition: atelier.motion.rowHover,
                "&:hover": { borderColor: atelier.brass.soft },
                "&:focus-visible": {
                  outline: `2px solid ${atelier.focus.ring}`,
                  outlineOffset: "2px",
                },
              }}
            >
              <Box
                component="img"
                src={media.thumbnailUrl}
                alt={media.name}
                loading="lazy"
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
              {media.type === "video" && (
                <Box
                  sx={{
                    position: "absolute",
                    bottom: "4px",
                    right: "4px",
                    width: "20px",
                    height: "20px",
                    borderRadius: "2px",
                    border: `1px solid ${foto.surfaces.edgeStrong}`,
                    backgroundColor: foto.surfaces.panel,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                    color: atelier.ink.primary,
                  }}
                >
                  <Box
                    component="svg"
                    viewBox="0 0 24 24"
                    sx={{ width: "10px", height: "10px" }}
                    aria-hidden
                  >
                    <path d="M8 5L19 12L8 19Z" fill="currentColor" />
                  </Box>
                </Box>
              )}
            </ButtonBase>
          ))}
        </Box>
      )}
    </Box>
  );
}

/**
 * HistorialBlock — vertical ledger of recent edits for the open product.
 *
 * Sources `convex/products.ts → editHistory({ itemId })`. The mirror keeps
 * the last 20 audit rows; we render the last 5 by default with a
 * "Mostrar más" toggle to expand. Each entry: status mark + editor name
 * (or email) + relative timestamp + a tabular `field: before → after`
 * stack of the changes recorded in that edit.
 */
function HistorialBlock({
  itemId,
  atelier,
  foto,
}: {
  itemId: string;
  atelier: ReturnType<typeof getAtelier>;
  foto: ReturnType<typeof getFoto>;
}) {
  const [showAll, setShowAll] = useState(false);
  const history = useConvexQuery(
    convexApi.products.editHistory,
    convexReady ? { itemId } : "skip",
  ) as Array<HistoryEntry> | undefined;

  if (!convexReady) {
    return (
      <Typography sx={{ ...atelier.type.meta, color: atelier.ink.tertiary }}>
        Convex no está configurado.
      </Typography>
    );
  }

  if (history === undefined) {
    return (
      <Typography sx={{ ...atelier.type.meta, color: atelier.ink.tertiary }}>
        Cargando historial…
      </Typography>
    );
  }

  if (history.length === 0) {
    return (
      <Typography sx={{ ...atelier.type.meta, color: atelier.ink.tertiary }}>
        Aún no hay ediciones registradas para esta pieza.
      </Typography>
    );
  }

  const visible = showAll ? history : history.slice(0, 5);
  const hiddenCount = history.length - visible.length;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          position: "relative",
        }}
      >
        {visible.map((entry, idx) => (
          <HistorialEntry
            key={entry._id}
            entry={entry}
            isLast={idx === visible.length - 1}
            atelier={atelier}
            foto={foto}
          />
        ))}
      </Box>
      {hiddenCount > 0 && !showAll && (
        <ButtonBase
          onClick={() => setShowAll(true)}
          disableRipple
          sx={{
            ...atelier.type.label,
            color: atelier.ink.tertiary,
            alignSelf: "flex-start",
            px: "8px",
            py: "4px",
            borderRadius: "4px",
            transition: atelier.motion.rowHover,
            textDecoration: "underline",
            textUnderlineOffset: "2px",
            textDecorationColor: atelier.brass.soft,
            "&:hover": {
              color: atelier.ink.primary,
              textDecorationColor: atelier.ink.primary,
            },
            "&:focus-visible": {
              outline: `2px solid ${atelier.focus.ring}`,
              outlineOffset: "2px",
            },
          }}
        >
          Mostrar {hiddenCount} más
        </ButtonBase>
      )}
      {showAll && history.length > 5 && (
        <ButtonBase
          onClick={() => setShowAll(false)}
          disableRipple
          sx={{
            ...atelier.type.label,
            color: atelier.ink.tertiary,
            alignSelf: "flex-start",
            px: "8px",
            py: "4px",
            borderRadius: "4px",
            transition: atelier.motion.rowHover,
            textDecoration: "underline",
            textUnderlineOffset: "2px",
            textDecorationColor: atelier.brass.soft,
            "&:hover": {
              color: atelier.ink.primary,
              textDecorationColor: atelier.ink.primary,
            },
            "&:focus-visible": {
              outline: `2px solid ${atelier.focus.ring}`,
              outlineOffset: "2px",
            },
          }}
        >
          Ocultar
        </ButtonBase>
      )}
    </Box>
  );
}

interface HistoryChange {
  field: string;
  before: string | number | null;
  after: string | number | null;
}

interface HistoryEntry {
  _id: string;
  _creationTime: number;
  itemId: string;
  editorEmail: string;
  editorName?: string;
  editedAt: string;
  changes: HistoryChange[];
  status: "saved" | "pending" | "failed";
  error?: string;
}

const FIELD_LABELS: Record<string, string> = {
  nombre: "Nombre",
  peso: "Peso",
  color: "Color",
  calidad: "Calidad",
  cantidad: "Cantidad",
  talla: "Talla",
  medidas: "Medidas",
  categoria: "Categoría",
  precioCOP: "Precio COP",
  ubicacion: "Ubicación",
  coleccion: "Colección",
  caja: "Caja",
  estado: "Estado",
};

function relativeFromNow(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const sec = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (sec < 60) return "hace segundos";
  const min = Math.round(sec / 60);
  if (min < 60) return `hace ${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  const day = Math.round(hr / 24);
  if (day < 30) return `hace ${day} d`;
  return new Date(iso).toLocaleDateString("es-CO");
}

function formatHistoryValue(v: string | number | null): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return v.toLocaleString("es-CO");
  return v;
}

function HistorialEntry({
  entry,
  isLast,
  atelier,
  foto,
}: {
  entry: HistoryEntry;
  isLast: boolean;
  atelier: ReturnType<typeof getAtelier>;
  foto: ReturnType<typeof getFoto>;
}) {
  const statusColor =
    entry.status === "saved"
      ? atelier.status.available.pip
      : entry.status === "pending"
        ? atelier.status.consigned.pip
        : atelier.status.sold.pip;
  const editorLabel = entry.editorName?.trim() || entry.editorEmail;

  return (
    <Box
      role="listitem"
      sx={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        columnGap: "10px",
      }}
    >
      {/* Timeline rail: marker + connecting line */}
      <Box
        aria-hidden
        sx={{
          position: "relative",
          width: "10px",
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Box
          sx={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: statusColor,
            mt: "5px",
            flexShrink: 0,
          }}
        />
        {!isLast && (
          <Box
            sx={{
              flex: 1,
              width: "1px",
              backgroundColor: foto.surfaces.edge,
              mt: "4px",
            }}
          />
        )}
      </Box>

      {/* Entry content */}
      <Box sx={{ pb: "10px", minWidth: 0 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Typography
            component="span"
            sx={{
              ...atelier.type.label,
              color: atelier.ink.primary,
              textTransform: "none",
              letterSpacing: 0,
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={editorLabel}
          >
            {editorLabel}
          </Typography>
          <Typography
            component="span"
            sx={{
              ...atelier.type.meta,
              fontSize: "11px",
              color: atelier.ink.tertiary,
              flexShrink: 0,
            }}
            title={new Date(entry.editedAt).toLocaleString("es-CO")}
          >
            {relativeFromNow(entry.editedAt)}
          </Typography>
        </Box>

        {entry.status === "failed" && entry.error && (
          <Typography
            sx={{
              ...atelier.type.meta,
              fontSize: "11px",
              color: atelier.status.sold.pip,
              mt: "2px",
            }}
          >
            {entry.error}
          </Typography>
        )}

        <Box
          component="ul"
          sx={{
            listStyle: "none",
            p: 0,
            m: 0,
            mt: "6px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          {entry.changes.map((c, i) => (
            <Box
              component="li"
              key={`${entry._id}-${c.field}-${i}`}
              sx={{
                display: "grid",
                gridTemplateColumns: "minmax(72px, auto) 1fr",
                columnGap: "8px",
                alignItems: "baseline",
              }}
            >
              <Typography
                component="span"
                sx={{
                  ...atelier.type.label,
                  color: atelier.ink.tertiary,
                }}
              >
                {FIELD_LABELS[c.field] ?? c.field}
              </Typography>
              <Typography
                component="span"
                sx={{
                  ...atelier.type.data,
                  fontSize: "11px",
                  color: atelier.ink.secondary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={`${formatHistoryValue(c.before)} → ${formatHistoryValue(c.after)}`}
              >
                <Box
                  component="span"
                  sx={{
                    color: atelier.ink.muted,
                    textDecoration: "line-through",
                  }}
                >
                  {formatHistoryValue(c.before)}
                </Box>
                <Box
                  component="span"
                  sx={{ mx: "6px", color: atelier.ink.tertiary }}
                >
                  →
                </Box>
                <Box component="span" sx={{ color: atelier.ink.primary }}>
                  {formatHistoryValue(c.after)}
                </Box>
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

/**
 * ConflictBanner — appears just above the footer when admin-product-update
 * returned 409 ("sheet was re-ordered, resync first"). Surfaces the error
 * message inline with a "Resync ahora" call-to-action that fires the
 * parent's pullFromSheet. Borders-only depth, oxblood-tinted top edge to
 * match the row's error pip without introducing a new color.
 */
function ConflictBanner({
  message,
  isResyncing,
  onResync,
  atelier,
  foto,
}: {
  message: string;
  isResyncing: boolean;
  onResync: () => Promise<void> | void;
  atelier: ReturnType<typeof getAtelier>;
  foto: ReturnType<typeof getFoto>;
}) {
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        borderTop: `1px solid ${atelier.status.sold.pip}`,
        borderBottom: `1px solid ${foto.surfaces.edge}`,
        backgroundColor: atelier.status.sold.rowTint,
        px: `${atelier.spacing.drawerPaddingX}px`,
        py: "12px",
        display: "flex",
        gap: "12px",
        alignItems: "flex-start",
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: "8px",
          height: "8px",
          borderRadius: "1px",
          backgroundColor: atelier.status.sold.pip,
          flexShrink: 0,
          mt: "5px",
        }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          component="div"
          sx={{
            ...atelier.type.label,
            color: atelier.ink.primary,
            mb: "4px",
          }}
        >
          Resync necesario
        </Typography>
        <Typography
          sx={{
            ...atelier.type.meta,
            fontSize: "11px",
            color: atelier.ink.secondary,
            mb: "8px",
          }}
        >
          La hoja se reordenó después de la última sincronización. Vuelve a
          sincronizar antes de guardar.
        </Typography>
        <Typography
          sx={{
            ...atelier.type.data,
            fontSize: "11px",
            color: atelier.ink.tertiary,
            mb: "10px",
          }}
        >
          {message}
        </Typography>
        <ButtonBase
          onClick={() => void onResync()}
          disabled={isResyncing}
          disableRipple
          sx={{
            ...atelier.type.label,
            color: atelier.ink.inverse,
            backgroundColor: isResyncing
              ? atelier.ink.muted
              : atelier.focus.ring,
            borderRadius: "4px",
            px: "12px",
            py: "6px",
            transition: atelier.motion.rowHover,
            "&:hover": {
              backgroundColor: isResyncing
                ? atelier.ink.muted
                : atelier.status.available.pip,
            },
            "&:focus-visible": {
              outline: `2px solid ${atelier.focus.ring}`,
              outlineOffset: "2px",
            },
          }}
        >
          {isResyncing ? "Sincronizando…" : "Resync ahora"}
        </ButtonBase>
      </Box>
    </Box>
  );
}

/**
 * LockBanner — advisory mark that another admin currently holds the
 * 5-min soft lock on this row. Sits above the "Archivos" section so the
 * editor sees it before scrolling into the metadata. Atelier-pure: amber
 * (consigned) pip color borrowed from the status palette, hairline
 * border with an emphasized left edge, ledger meta typography. The
 * minute counter ticks every 30s so the "expires in N min" stays
 * roughly honest while the drawer is open.
 */
function LockBanner({
  lockedBy,
  atelier,
  foto,
}: {
  lockedBy: { holderEmail: string; holderName?: string; expiresAt: string };
  atelier: ReturnType<typeof getAtelier>;
  foto: ReturnType<typeof getFoto>;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const name = lockedBy.holderName?.trim() || lockedBy.holderEmail;
  const expiresAtMs = Date.parse(lockedBy.expiresAt);
  const minutesLeft = Number.isFinite(expiresAtMs)
    ? Math.max(0, Math.ceil((expiresAtMs - now) / 60_000))
    : 0;
  const expiryText =
    minutesLeft >= 1
      ? `expira en ${minutesLeft} min`
      : "expira en menos de 1 min";

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        mb: `${atelier.spacing.sectionGap}px`,
        border: `1px solid ${foto.surfaces.edgeStrong}`,
        borderLeft: `2px solid ${atelier.status.consigned.pip}`,
        backgroundColor: atelier.status.consigned.rowTint,
        borderRadius: "4px",
        px: "14px",
        py: "10px",
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: "8px",
          height: "8px",
          borderRadius: "1px",
          backgroundColor: atelier.status.consigned.pip,
          flexShrink: 0,
          mt: "5px",
        }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            ...atelier.type.label,
            color: atelier.ink.tertiary,
            mb: "2px",
          }}
        >
          En edición
        </Typography>
        <Typography
          sx={{
            ...atelier.type.meta,
            color: atelier.ink.primary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={`${name} · ${expiryText}`}
        >
          <Box component="span" sx={{ fontWeight: 600 }}>
            {name}
          </Box>{" "}
          está editando ·{" "}
          <Box component="span" sx={{ color: atelier.ink.tertiary }}>
            {expiryText}
          </Box>
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * LotePriceNotice — F8 bridge. Items belonging to a Fotosíntesis lote publish
 * their public catalog price as the *precio embajador* (SOT col N), managed
 * inside Fotosíntesis — not as the "Precio COP" field above (col L), which for
 * lote items is only an internal/base reference. Editing "Precio COP" here
 * would look successful but never move the price customers actually see, so
 * this notice names that gap and deep-links to the lote resumen (the `/close`
 * route, where the embajador/consciente prices are edited).
 *
 * Atelier-pure styling, echoing LockBanner: hairline border with an emerald
 * left edge (informational bridge, not a status pip) and ledger meta type.
 */
function LotePriceNotice({
  loteId,
  atelier,
  foto,
}: {
  loteId: string;
  atelier: ReturnType<typeof getAtelier>;
  foto: ReturnType<typeof getFoto>;
}) {
  return (
    <Box
      role="note"
      sx={{
        mt: "10px",
        border: `1px solid ${foto.surfaces.edgeStrong}`,
        borderLeft: `2px solid ${foto.accent.primary}`,
        backgroundColor: foto.surfaces.inset,
        borderRadius: "4px",
        px: "14px",
        py: "10px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <Typography sx={{ ...atelier.type.label, color: atelier.ink.tertiary }}>
        Esta pieza pertenece a un lote
      </Typography>
      <Typography sx={{ ...atelier.type.meta, color: atelier.ink.secondary }}>
        El precio público del catálogo es el{" "}
        <Box
          component="span"
          sx={{ fontWeight: 600, color: atelier.ink.primary }}
        >
          precio embajador
        </Box>
        , que se gestiona en Fotosíntesis. Este{" "}
        <Box component="span" sx={{ fontWeight: 600 }}>
          Precio COP
        </Box>{" "}
        es solo una referencia interna o de base y no cambia lo que ven los
        clientes.
      </Typography>
      <Box
        component={RouterLink}
        to={`/admin/fotosintesis/lots/${loteId}/close`}
        sx={{
          ...atelier.type.label,
          alignSelf: "flex-start",
          color: foto.accent.primary,
          textDecoration: "none",
          fontWeight: 600,
          mt: "2px",
          "&:hover": { color: foto.accent.deep },
          "&:focus-visible": {
            outline: `2px solid ${foto.accent.primary}`,
            outlineOffset: "2px",
            borderRadius: "2px",
          },
        }}
      >
        Gestionar precio en Fotosíntesis →
      </Box>
    </Box>
  );
}
