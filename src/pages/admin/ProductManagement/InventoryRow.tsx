/**
 * InventoryRow — one entry in the atelier ledger.
 *
 * Layout (left → right):
 *   [item #] [pip column] [name + collection] ............ [weight] [price] [sync mark]
 *
 * The whole row is the click target. There is no "Edit" button — the row
 * itself opens the drawer, like turning a leather-bound ledger to a
 * marked page. Edit/delete is intentionally implicit: the gesture matches
 * the back-of-house feel.
 *
 * Per Interface Design mandate:
 *   Intent — scan and select. Find a stone fast, open it.
 *   Palette — canvas surfaces only; status tint is a 4% wash.
 *   Depth — borders-only; 1px bottom hairline; hover is color-only.
 *   Surfaces — atelier.surfaces.row / rowHover / rowActive (whisper-quiet).
 *   Typography — data mono for itemId/peso/precio; rowTitle for nombre.
 *   Spacing — atelier.spacing.rowPaddingY/X; min-height 48; pip column 16px.
 */

import { Box, ButtonBase, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { fontFamilies, getAtelier } from "../../../design-system";
import { StatusPip, type EstadoValue } from "./StatusPip";

export interface InventoryRowData {
  itemId: string;
  nombre?: string;
  peso?: string;
  color?: string;
  calidad?: string;
  precioCOP?: number;
  ubicacion?: string;
  coleccion?: string;
  estado: EstadoValue;
  syncStatus: "synced" | "pending" | "error";
}

interface InventoryRowProps {
  row: InventoryRowData;
  isActive: boolean;
  isSelected: boolean;
  thumbnailUrl?: string;
  onOpen: (itemId: string) => void;
  /** Toggle the row's checkbox for the bulk action bar. */
  onToggleSelect: (itemId: string, next: boolean) => void;
  /** Click-to-retry handler for the sync mark when status === "error". */
  onRetry?: (itemId: string) => void;
}

function formatPriceCOP(n?: number): string {
  if (n === undefined || n === null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatWeight(peso?: string): string {
  if (!peso) return "—";
  const trimmed = peso.trim();
  if (!trimmed) return "—";
  // Numeric carats — show as "1.85 ct"
  const n = Number(trimmed);
  if (Number.isFinite(n)) return `${n.toFixed(2)} ct`;
  return trimmed; // e.g., "Plata", "Oro 18k"
}

export function InventoryRow({
  row,
  isActive,
  isSelected,
  thumbnailUrl,
  onOpen,
  onToggleSelect,
  onRetry,
}: InventoryRowProps) {
  const theme = useTheme();
  const atelier = getAtelier(theme.palette.mode);

  // Status tint — barely-there wash (4-6% alpha over canvas)
  const tint =
    row.estado === "DISPONIBLE"
      ? atelier.status.available.rowTint
      : row.estado === "VENDIDA"
        ? atelier.status.sold.rowTint
        : row.estado === "ASESOR"
          ? atelier.status.consigned.rowTint
          : "transparent";

  const baseBg = isActive ? atelier.surfaces.rowActive : atelier.surfaces.row;

  return (
    <ButtonBase
      onClick={() => onOpen(row.itemId)}
      focusRipple={false}
      disableRipple
      sx={{
        display: "block",
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        backgroundColor: baseBg,
        backgroundImage: `linear-gradient(${tint}, ${tint})`,
        borderBottom: `1px solid ${atelier.surfaces.edge}`,
        // Selection mark — brass left border, kept transparent when not
        // selected so the row doesn't shift horizontally.
        borderLeft: `2px solid ${isSelected ? atelier.brass.base : "transparent"}`,
        transition: atelier.motion.rowHover,
        minHeight: `${atelier.spacing.rowMinHeight}px`,
        px: `${atelier.spacing.rowPaddingX}px`,
        py: `${atelier.spacing.rowPaddingY}px`,
        "&:hover": {
          backgroundColor: atelier.surfaces.rowHover,
        },
        "&:focus-visible": {
          outline: `2px solid ${atelier.focus.ring}`,
          outlineOffset: "-2px",
        },
      }}
    >
      <Box
        sx={{
          display: "grid",
          // Explicit track widths so weight/price columns don't grow with
          // content and shove the row past `contentMaxWidth`. The name
          // column uses `minmax(0, 1fr)` so it can shrink below its
          // intrinsic size and let the ellipsis kick in.
          gridTemplateColumns: {
            xs: "16px 56px 12px 32px minmax(0, 1fr) 84px 116px 10px",
            sm: "16px 64px 14px 32px minmax(0, 1fr) 92px 128px 12px",
            md: "20px 72px 16px 36px minmax(0, 1fr) 96px 136px 12px",
          },
          alignItems: "center",
          gap: { xs: 1.25, md: 1.75 },
          minWidth: 0,
        }}
      >
        {/* Selection checkbox — bulk-action toggle */}
        <SelectionCheckbox
          checked={isSelected}
          onToggle={(next) => onToggleSelect(row.itemId, next)}
          atelier={atelier}
          itemLabel={row.nombre || `Item ${row.itemId}`}
        />

        {/* Item number — parcel stamp */}
        <Typography
          component="span"
          sx={{
            ...atelier.type.data,
            color: atelier.ink.tertiary,
            textAlign: "right",
          }}
        >
          {row.itemId.padStart(4, "0")}
        </Typography>

        {/* Status pip column — the signature */}
        <StatusPip estado={row.estado} />

        {/* Thumbnail — square parcel stamp */}
        <Box
          sx={{
            width: "32px",
            height: "32px",
            borderRadius: "3px",
            border: `1px solid ${atelier.surfaces.edge}`,
            backgroundColor: atelier.surfaces.inset,
            overflow: "hidden",
            flexShrink: 0,
          }}
          aria-hidden
        >
          {thumbnailUrl ? (
            <Box
              component="img"
              src={thumbnailUrl}
              alt=""
              loading="lazy"
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : null}
        </Box>

        {/* Name + collection */}
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="div"
            sx={{
              ...atelier.type.rowTitle,
              fontFamily: fontFamilies.system,
              fontWeight: 600,
              color: atelier.ink.primary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={row.nombre || `Item ${row.itemId}`}
          >
            {row.nombre || `Item ${row.itemId}`}
          </Typography>
          {(row.coleccion || row.color || row.calidad) && (
            <Typography
              component="div"
              sx={{
                ...atelier.type.meta,
                fontFamily: fontFamilies.system,
                fontSize: "12px",
                fontWeight: 400,
                color: atelier.ink.tertiary,
                mt: "2px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {[row.coleccion, row.color, row.calidad]
                .filter(Boolean)
                .join(" · ")}
            </Typography>
          )}
        </Box>

        {/* Weight — tabular mono */}
        <Typography
          component="span"
          sx={{
            ...atelier.type.data,
            color: atelier.ink.secondary,
            textAlign: "right",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          {formatWeight(row.peso)}
        </Typography>

        {/* Price — tabular mono */}
        <Typography
          component="span"
          sx={{
            ...atelier.type.data,
            color: atelier.ink.primary,
            textAlign: "right",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          {formatPriceCOP(row.precioCOP)}
        </Typography>

        {/* Sync mark — tiny indicator at the very edge */}
        <SyncMark
          status={row.syncStatus}
          onRetry={onRetry ? () => onRetry(row.itemId) : undefined}
        />
      </Box>
    </ButtonBase>
  );
}

/**
 * SyncMark — a single dot indicating sync state at the row's edge.
 *
 * synced  → invisible spacer
 * pending → amber dot, gentle 1.4s opacity pulse (respects
 *           prefers-reduced-motion)
 * error   → oxblood dot. If `onRetry` is provided, the dot becomes a
 *           focusable button with a "Reintentar" tooltip; click stops
 *           propagation so the row's drawer doesn't also open.
 */
function SyncMark({
  status,
  onRetry,
}: {
  status: InventoryRowData["syncStatus"];
  onRetry?: () => void;
}) {
  const theme = useTheme();
  const atelier = getAtelier(theme.palette.mode);

  if (status === "synced") {
    return <Box sx={{ width: "4px", height: "4px", opacity: 0 }} aria-hidden />;
  }

  const isError = status === "error";
  const color = isError
    ? atelier.status.sold.pip
    : atelier.status.consigned.pip;
  const label = isError
    ? onRetry
      ? "Error de sincronización · click para reintentar"
      : "Error de sincronización"
    : "Pendiente de sincronizar";

  if (isError && onRetry) {
    return (
      <ButtonBase
        component="span"
        role="button"
        aria-label={label}
        title={label}
        disableRipple
        onClick={(e) => {
          e.stopPropagation();
          onRetry();
        }}
        sx={{
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: atelier.motion.rowHover,
          "&:hover .atelier-sync-dot": {
            transform: "scale(1.5)",
          },
          "&:focus-visible": {
            outline: `2px solid ${atelier.focus.ring}`,
            outlineOffset: "1px",
          },
        }}
      >
        <Box
          className="atelier-sync-dot"
          sx={{
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            backgroundColor: color,
            transition: "transform 120ms cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
        />
      </ButtonBase>
    );
  }

  // Non-interactive dot (pending, or error without retry handler)
  return (
    <Box
      role="img"
      aria-label={label}
      sx={{
        width: "4px",
        height: "4px",
        borderRadius: "50%",
        backgroundColor: color,
        animation:
          status === "pending"
            ? "atelierSyncPulse 1.4s cubic-bezier(0.4, 0, 0.6, 1) infinite"
            : "none",
        "@media (prefers-reduced-motion: reduce)": {
          animation: "none",
        },
        "@keyframes atelierSyncPulse": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.35 },
        },
      }}
    />
  );
}

/**
 * SelectionCheckbox — atelier checkbox for the row's bulk-select column.
 *
 * Stops propagation on click so toggling doesn't also open the drawer.
 * Resting state is the canvas surface with a hairline edge; checked
 * state fills with the focus ring (the only saturated emerald moment in
 * the panel) and an iron-gall (inverse) check mark.
 */
function SelectionCheckbox({
  checked,
  onToggle,
  atelier,
  itemLabel,
}: {
  checked: boolean;
  onToggle: (next: boolean) => void;
  atelier: ReturnType<typeof getAtelier>;
  itemLabel: string;
}) {
  return (
    <ButtonBase
      role="checkbox"
      aria-checked={checked}
      aria-label={`Seleccionar ${itemLabel}`}
      disableRipple
      onClick={(e) => {
        e.stopPropagation();
        onToggle(!checked);
      }}
      sx={{
        width: "16px",
        height: "16px",
        borderRadius: "3px",
        border: `1px solid ${
          checked ? atelier.focus.ring : atelier.surfaces.edgeStrong
        }`,
        backgroundColor: checked ? atelier.focus.ring : "transparent",
        transition: atelier.motion.rowHover,
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        "&:hover": {
          borderColor: checked ? atelier.focus.ring : atelier.brass.base,
        },
        "&:focus-visible": {
          outline: `2px solid ${atelier.focus.ring}`,
          outlineOffset: "2px",
        },
      }}
    >
      {checked && (
        <Box
          component="svg"
          viewBox="0 0 12 12"
          sx={{ width: "10px", height: "10px", color: atelier.ink.inverse }}
          aria-hidden
        >
          <path
            d="M2.5 6.2L5 8.5L9.5 4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Box>
      )}
    </ButtonBase>
  );
}
