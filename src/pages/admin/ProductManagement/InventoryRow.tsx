/**
 * InventoryRow — one entry in the Fotosíntesis ledger.
 *
 * New column order (left → right), per the jeweler's reading sequence:
 *
 *   [bulk] [chroma] [carat] [thumb] [name + meta] [price] [pip]
 *
 * The chroma bar is a thin colored band sampled from the thumbnail's
 * dominant hue. The carat reads first (decision-driving), the thumbnail
 * confirms identity, and the status pip lives at the right edge as the
 * row's signature. The bulk checkbox column reserves space at the very
 * left and only fades in on hover/active so resting rows stay clean.
 *
 * Spec: docs/superpowers/specs/2026-05-06-fotosintesis-admin-redesign-design.md
 */

import { Box, ButtonBase, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  fontFamilies,
  getAtelier,
  type FotoTokens,
} from "../../../design-system";
import { StatusPip, type EstadoValue } from "./StatusPip";
import { ChromaBar } from "./ChromaBar";
// === Phase H — inline edit ===
import { InlineEditCell } from "./InlineEditCell";

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
  /** Dominant hex from `useChromaSamples` — colors the chroma bar. */
  chromaHex?: string;
  /** Fotosíntesis tokens — drives chroma fallback + status pip. */
  foto: FotoTokens;
  onOpen: (itemId: string) => void;
  /** Toggle the row's checkbox for the bulk action bar. */
  onToggleSelect: (itemId: string, next: boolean) => void;
  /** Click-to-retry handler for the sync mark when status === "error". */
  onRetry?: (itemId: string) => void;
  // === Phase H — inline edit ===
  /** Fired when an inline-edited cell commits. The page wires this to
   *  `saveEdit` so the patch persists optimistically + flushes to the
   *  sheet. Optional so existing call-sites without the handler still
   *  render (the inline cells fall back to display-only). */
  onInlineEdit?: (
    itemId: string,
    patch: Record<string, unknown>,
  ) => Promise<void>;
  // === Phase I — lock indicator ===
  /** When `true`, render a small gold dot after the status pip — the
   *  row is currently held open by another editor (drawer claim). The
   *  page-level `listActiveLocks` query feeds this; self-held locks
   *  are filtered out so it only fires on peer holds. */
  isLockedByOther?: boolean;
}

function formatPriceCOP(n?: number): string {
  if (n === undefined || n === null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function InventoryRow({
  row,
  isActive,
  isSelected,
  thumbnailUrl,
  chromaHex,
  foto,
  onOpen,
  onToggleSelect,
  onRetry,
  onInlineEdit,
  isLockedByOther,
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

  const baseBg = isActive ? foto.surfaces.rowActive : foto.surfaces.row;
  const showCheckbox = isSelected || isActive;
  const caratNum = row.peso ? Number(row.peso) : NaN;
  const isCarat = Number.isFinite(caratNum) && caratNum > 0;

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
        borderBottom: `1px solid ${foto.surfaces.edge}`,
        transition: atelier.motion.rowHover,
        minHeight: `${atelier.spacing.rowMinHeight}px`,
        px: `${atelier.spacing.rowPaddingX}px`,
        py: `${atelier.spacing.rowPaddingY}px`,
        "&:hover": {
          backgroundColor: foto.surfaces.rowHover,
        },
        "&:hover .tm-row-bulk": {
          opacity: 1,
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
          // Column order: bulk | chroma | carat | thumb | name+meta | price | pip
          gridTemplateColumns: {
            xs: "20px 5px 56px 40px minmax(0, 1fr) 80px 56px",
            md: "20px 5px 64px 44px minmax(0, 1fr) 96px 60px",
          },
          alignItems: "center",
          gap: { xs: 1.25, md: 1.75 },
          minWidth: 0,
        }}
      >
        {/* Bulk checkbox — fades in on hover/active so resting rows stay
            clean. The reserved column keeps row width stable. */}
        <Box
          className="tm-row-bulk"
          sx={{
            opacity: showCheckbox ? 1 : 0,
            transition: "opacity 120ms ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SelectionCheckbox
            checked={isSelected}
            onToggle={(next) => onToggleSelect(row.itemId, next)}
            atelier={atelier}
            foto={foto}
            itemLabel={row.nombre || `Item ${row.itemId}`}
          />
        </Box>

        {/* Chroma bar — sampled hue or emerald fallback */}
        <ChromaBar hex={chromaHex} foto={foto} />

        {/* Carat — primary read. The image-health indicator (⊘) sits to
            the left of the carat number when no thumbnail is available,
            keeping the right-aligned carat as the dominant glyph. */}
        <Box
          sx={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "flex-end",
            gap: "4px",
            minWidth: 0,
          }}
        >
          {!thumbnailUrl && (
            <Box
              component="span"
              role="img"
              aria-label="Sin imagen"
              title="Sin imagen"
              data-image-health="missing"
              sx={{
                fontSize: "11px",
                lineHeight: 1,
                color: foto.ink.tertiary,
                opacity: 0.7,
                userSelect: "none",
              }}
            >
              {"⊘"}
            </Box>
          )}
          <Typography
            component="span"
            sx={{
              ...atelier.type.data,
              color: foto.ink.primary,
              textAlign: "right",
              whiteSpace: "nowrap",
            }}
          >
            {isCarat ? (
              <>
                {caratNum.toFixed(2)}
                <Box
                  component="span"
                  sx={{
                    ml: "3px",
                    fontSize: "10px",
                    letterSpacing: "0.08em",
                    color: foto.ink.tertiary,
                  }}
                >
                  CT
                </Box>
              </>
            ) : (
              (row.peso ?? "—")
            )}
          </Typography>
        </Box>

        {/* Thumbnail — 44×44 parcel stamp */}
        <Box
          sx={{
            width: "44px",
            height: "44px",
            borderRadius: "3px",
            border: `1px solid ${foto.surfaces.edge}`,
            backgroundColor: foto.surfaces.inset,
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

        {/* Name + meta line */}
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="div"
            sx={{
              ...atelier.type.rowTitle,
              fontFamily: fontFamilies.system,
              fontWeight: 600,
              color: foto.ink.primary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={row.nombre || `Item ${row.itemId}`}
          >
            {row.nombre || `Item ${row.itemId}`}
          </Typography>
          {/* Meta line — read-only summary. Inline editing for
              colección + ubicación was overlapping the static
              "[itemId] · CALIDAD · ASESOR" segments at narrow split
              widths (the editable cells were stretching beyond their
              grid slot). Both fields are now editable via the
              EditDrawer; only the price stays inline below. */}
          <Box
            sx={{
              ...atelier.type.meta,
              fontFamily: fontFamilies.system,
              fontSize: "12px",
              fontWeight: 400,
              color: foto.ink.tertiary,
              mt: "2px",
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
            title={[
              row.itemId.padStart(4, "0"),
              row.coleccion,
              row.calidad,
              row.ubicacion,
            ]
              .filter(Boolean)
              .join(" · ")}
          >
            {[
              row.itemId.padStart(4, "0"),
              row.coleccion,
              row.calidad,
              row.ubicacion,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Box>
        </Box>

        {/* === Phase H — inline edit ===
            Price — inline-edit cell. Display formats COP; raw is the
            numeric string. `parse` strips non-numeric chars and rejects
            non-positive values (returning `null` clears the field). */}
        <Box sx={{ minWidth: 0, textAlign: "right" }}>
          {onInlineEdit ? (
            <InlineEditCell
              foto={foto}
              display={formatPriceCOP(row.precioCOP)}
              rawValue={
                typeof row.precioCOP === "number" ? String(row.precioCOP) : ""
              }
              parse={(s) => {
                const n = Number(String(s).replace(/[^0-9.]/g, ""));
                return Number.isFinite(n) && n > 0 ? n : null;
              }}
              onSave={(next) =>
                onInlineEdit(row.itemId, {
                  precioCOP: next as number | null,
                })
              }
              ariaLabel={`Precio de ${row.nombre ?? row.itemId}`}
              type="number"
            />
          ) : (
            <Typography
              component="span"
              sx={{
                ...atelier.type.data,
                color: foto.ink.primary,
                textAlign: "right",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
            >
              {formatPriceCOP(row.precioCOP)}
            </Typography>
          )}
        </Box>

        {/* Status pip — the signature, kept at the row's right edge.
            Phase I: a 4×4 px gold dot follows the pip when another
            editor currently holds the soft lock for this row. */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "8px",
          }}
        >
          <StatusPip estado={row.estado} foto={foto} />
          {isLockedByOther && (
            <Box
              role="img"
              aria-label="Bloqueada por otra persona editora"
              title="Bloqueada por otra persona editora"
              data-lock-state="held-by-other"
              sx={{
                width: "4px",
                height: "4px",
                borderRadius: "50%",
                backgroundColor: atelier.brass.base,
                flexShrink: 0,
              }}
            />
          )}
          <SyncMark
            status={row.syncStatus}
            foto={foto}
            onRetry={onRetry ? () => onRetry(row.itemId) : undefined}
          />
        </Box>
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
  foto,
  onRetry,
}: {
  status: InventoryRowData["syncStatus"];
  foto: FotoTokens;
  onRetry?: () => void;
}) {
  const theme = useTheme();
  const atelier = getAtelier(theme.palette.mode);

  if (status === "synced") {
    return <Box sx={{ width: "4px", height: "4px", opacity: 0 }} aria-hidden />;
  }

  const isError = status === "error";
  const color = isError ? foto.status.sold : foto.status.consigned;
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
  foto,
  itemLabel,
}: {
  checked: boolean;
  onToggle: (next: boolean) => void;
  atelier: ReturnType<typeof getAtelier>;
  foto: FotoTokens;
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
          checked ? atelier.focus.ring : foto.surfaces.edgeStrong
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
