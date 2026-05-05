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
 *   Surfaces — atelier.surfaces.panel (drawer), .canvas (header), .inset (inputs).
 *   Typography — atelier.type.headline / .section / .label / .data.
 *   Spacing — 480px width; 24/20 padding; 32px section gap; 16px field gap.
 */

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Box, ButtonBase, Drawer, InputBase, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { getAtelier } from "../../../design-system";
import { StatusPip, type EstadoValue } from "./StatusPip";

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
  onSave: (itemId: string, patch: EditDrawerPatch) => Promise<void>;
}

interface DraftState {
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
}: EditDrawerProps) {
  const theme = useTheme();
  const atelier = getAtelier(theme.palette.mode);
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

  const patch = useMemo(() => diffDraft(draft, product), [draft, product]);
  const hasChanges = Object.keys(patch).length > 0;

  if (!product) {
    return (
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            width: `${atelier.spacing.drawerWidth}px`,
            backgroundColor: atelier.surfaces.panel,
            borderLeft: `1px solid ${atelier.surfaces.edgeStrong}`,
          },
        }}
      />
    );
  }

  const headerTint =
    product.estado === "DISPONIBLE"
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
      onClose={isSaving ? undefined : onClose}
      PaperProps={{
        sx: {
          width: `${atelier.spacing.drawerWidth}px`,
          maxWidth: "100vw",
          backgroundColor: atelier.surfaces.panel,
          borderLeft: `1px solid ${atelier.surfaces.edgeStrong}`,
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
            backgroundColor: atelier.surfaces.canvas,
            backgroundImage: `linear-gradient(${headerTint}, ${headerTint})`,
            borderBottom: `1px solid ${atelier.surfaces.edgeStrong}`,
            px: `${atelier.spacing.drawerPaddingX}px`,
            pt: `${atelier.spacing.drawerPaddingY}px`,
            pb: `${atelier.spacing.drawerPaddingY}px`,
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "auto auto 1fr auto",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Typography
              component="span"
              sx={{
                ...atelier.type.data,
                color: atelier.ink.tertiary,
                fontSize: "14px",
              }}
            >
              {product.itemId.padStart(4, "0")}
            </Typography>
            <StatusPip estado={product.estado} />
            <Typography
              component="div"
              sx={{
                ...atelier.type.headline,
                color: atelier.ink.primary,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={product.nombre || `Item ${product.itemId}`}
            >
              {product.nombre || `Item ${product.itemId}`}
            </Typography>
            <CloseButton
              onClose={onClose}
              disabled={isSaving}
              atelier={atelier}
            />
          </Box>
          <SyncMeta product={product} atelier={atelier} />
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
          <Section title="Identidad" atelier={atelier}>
            <Field
              label="Nombre"
              value={draft.nombre}
              onChange={(v) => setDraft({ ...draft, nombre: v })}
              atelier={atelier}
              monospace={false}
            />
            <FieldGrid>
              <Field
                label="Colección"
                value={draft.coleccion}
                onChange={(v) => setDraft({ ...draft, coleccion: v })}
                atelier={atelier}
                monospace={false}
              />
              <Field
                label="Caja"
                value={draft.caja}
                onChange={(v) => setDraft({ ...draft, caja: v })}
                atelier={atelier}
                monospace
              />
            </FieldGrid>
            <Field
              label="Ubicación"
              value={draft.ubicacion}
              onChange={(v) => setDraft({ ...draft, ubicacion: v })}
              atelier={atelier}
              monospace={false}
            />
          </Section>

          <Section title="Especificaciones" atelier={atelier}>
            <FieldGrid>
              <Field
                label="Peso"
                value={draft.peso}
                onChange={(v) => setDraft({ ...draft, peso: v })}
                hint="Quilates o «Plata» / «Oro 18k»"
                atelier={atelier}
                monospace
              />
              <Field
                label="Cantidad"
                value={draft.cantidad}
                onChange={(v) =>
                  setDraft({ ...draft, cantidad: v.replace(/[^0-9]/g, "") })
                }
                atelier={atelier}
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
                monospace={false}
              />
              <Field
                label="Calidad"
                value={draft.calidad}
                onChange={(v) => setDraft({ ...draft, calidad: v })}
                atelier={atelier}
                monospace={false}
              />
            </FieldGrid>
            <FieldGrid>
              <Field
                label="Talla"
                value={draft.talla}
                onChange={(v) => setDraft({ ...draft, talla: v })}
                atelier={atelier}
                monospace
              />
              <Field
                label="Categoría"
                value={draft.categoria}
                onChange={(v) => setDraft({ ...draft, categoria: v })}
                atelier={atelier}
                monospace={false}
              />
            </FieldGrid>
            <Field
              label="Medidas"
              value={draft.medidas}
              onChange={(v) => setDraft({ ...draft, medidas: v })}
              hint="Largo × Ancho · descripción libre"
              atelier={atelier}
              monospace={false}
            />
          </Section>

          <Section title="Precio" atelier={atelier}>
            <Field
              label="Precio COP"
              value={draft.precioCOP}
              onChange={(v) =>
                setDraft({ ...draft, precioCOP: v.replace(/[^0-9]/g, "") })
              }
              hint="Solo número entero, sin separadores"
              atelier={atelier}
              monospace
              inputMode="numeric"
              prefix="$"
            />
          </Section>

          <Section title="Estado" atelier={atelier}>
            <EstadoRadio
              value={draft.estado}
              onChange={(v) => setDraft({ ...draft, estado: v })}
              atelier={atelier}
            />
          </Section>

          <Section title="Archivos" atelier={atelier}>
            <DriveFolderBlock state={driveState} atelier={atelier} />
          </Section>
        </Box>

        {/* FOOTER */}
        <Box
          sx={{
            borderTop: `1px solid ${atelier.surfaces.edgeStrong}`,
            backgroundColor: atelier.surfaces.canvas,
            px: `${atelier.spacing.drawerPaddingX}px`,
            py: "14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Typography
            sx={{ ...atelier.type.label, color: atelier.ink.tertiary }}
          >
            {hasChanges
              ? `${Object.keys(patch).length} cambio${Object.keys(patch).length === 1 ? "" : "s"} sin guardar`
              : "Sin cambios"}
          </Typography>
          <Box sx={{ display: "inline-flex", gap: 1 }}>
            <ButtonBase
              onClick={onClose}
              disabled={isSaving}
              disableRipple
              sx={{
                ...atelier.type.label,
                color: atelier.ink.secondary,
                px: "14px",
                py: "8px",
                borderRadius: "4px",
                border: `1px solid ${atelier.surfaces.edgeStrong}`,
                transition: atelier.motion.rowHover,
                "&:hover": { backgroundColor: atelier.surfaces.rowHover },
                "&:focus-visible": {
                  outline: `2px solid ${atelier.focus.ring}`,
                  outlineOffset: "2px",
                },
              }}
            >
              Cancelar
            </ButtonBase>
            <ButtonBase
              onClick={() => void onSave(product.itemId, patch)}
              disabled={!hasChanges || isSaving}
              disableRipple
              sx={{
                ...atelier.type.label,
                color: atelier.ink.inverse,
                backgroundColor:
                  !hasChanges || isSaving
                    ? atelier.ink.muted
                    : atelier.focus.ring,
                px: "14px",
                py: "8px",
                borderRadius: "4px",
                transition: atelier.motion.rowHover,
                "&:hover": {
                  backgroundColor:
                    !hasChanges || isSaving
                      ? atelier.ink.muted
                      : atelier.status.available.pip,
                },
                "&:focus-visible": {
                  outline: `2px solid ${atelier.focus.ring}`,
                  outlineOffset: "2px",
                },
              }}
            >
              {isSaving ? "Guardando…" : "Guardar"}
            </ButtonBase>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}

// =============================================================================
// SUB-COMPONENTS (file-private)
// =============================================================================

function Section({
  title,
  atelier,
  children,
}: {
  title: string;
  atelier: ReturnType<typeof getAtelier>;
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
          borderBottom: `1px solid ${atelier.surfaces.edge}`,
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
  monospace,
  inputMode,
  prefix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  atelier: ReturnType<typeof getAtelier>;
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
          backgroundColor: atelier.surfaces.inset,
          border: `1px solid ${atelier.surfaces.edge}`,
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
}: {
  value: EstadoValue;
  onChange: (v: EstadoValue) => void;
  atelier: ReturnType<typeof getAtelier>;
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
                ? atelier.surfaces.rowActive
                : atelier.surfaces.inset,
              border: `1px solid ${isSelected ? atelier.focus.ring : atelier.surfaces.edge}`,
              borderRadius: "4px",
              transition: atelier.motion.rowHover,
              textAlign: "left",
              cursor: "pointer",
              "&:hover": {
                backgroundColor: atelier.surfaces.rowHover,
              },
              "&:focus-visible": {
                outline: `2px solid ${atelier.focus.ring}`,
                outlineOffset: "2px",
              },
            }}
          >
            <StatusPip estado={opt.key} muted={!isSelected} />
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
}: {
  onClose: () => void;
  disabled: boolean;
  atelier: ReturnType<typeof getAtelier>;
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
          backgroundColor: atelier.surfaces.rowHover,
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
}: {
  state: DriveFolderState;
  atelier: ReturnType<typeof getAtelier>;
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
            backgroundColor: atelier.surfaces.inset,
            border: `1px solid ${atelier.surfaces.edge}`,
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
              backgroundColor: atelier.surfaces.rowHover,
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
                border: `1px solid ${atelier.surfaces.edge}`,
                borderRadius: "4px",
                backgroundColor: atelier.surfaces.inset,
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
                    border: `1px solid ${atelier.surfaces.edgeStrong}`,
                    backgroundColor: atelier.surfaces.panel,
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
