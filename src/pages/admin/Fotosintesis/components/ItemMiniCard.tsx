import { Box } from "@mui/material";
import { Check } from "lucide-react";
import { getFoto, fontFamilies } from "../../../../design-system";

export type ItemMiniState = "done" | "active" | "pending";

interface ItemMiniCardProps {
  /** Sequential ID — "B-008 · 001". */
  ticketId: string;
  /** Item human name. */
  name: string;
  /** Short metadata line — "2.5 ct · sandía · Sup A". */
  meta?: React.ReactNode;
  /** Preponderance percent shown right-side. */
  preponderancia?: number;
  /** Cost shown right-side (already formatted). */
  cost?: React.ReactNode;
  state: ItemMiniState;
  onClick?: () => void;
}

/**
 * Bandeja card per handoff §3.11. Three states color the left chip and the
 * border. Click navigates to that item in CapturaLote.
 */
export function ItemMiniCard({
  ticketId,
  name,
  meta,
  preponderancia,
  cost,
  state,
  onClick,
}: ItemMiniCardProps) {
  const foto = getFoto("light");

  const stateMeta: Record<
    ItemMiniState,
    { chip: string; chipColor: string; border: string; opacity: number }
  > = {
    done: {
      chip: foto.accent.primary,
      chipColor: foto.ink.inverse,
      border: foto.surfaces.edge,
      opacity: 1,
    },
    active: {
      chip: foto.surfaces.canvas,
      chipColor: foto.accent.primary,
      border: foto.accent.primary,
      opacity: 1,
    },
    pending: {
      chip: foto.surfaces.inset,
      chipColor: foto.ink.tertiary,
      border: foto.surfaces.edge,
      opacity: 0.78,
    },
  };
  const s = stateMeta[state];

  return (
    <Box
      component={onClick ? "button" : "div"}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      sx={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        gap: "12px",
        width: "100%",
        padding: "10px 12px",
        background:
          state === "active" ? foto.accent.soft : foto.surfaces.canvas,
        border: `1px solid ${s.border}`,
        borderRadius: "11px",
        textAlign: "left",
        font: "inherit",
        color: "inherit",
        cursor: onClick ? "pointer" : "default",
        opacity: s.opacity,
        transition: "background 120ms ease, border-color 120ms ease",
        "&:hover": onClick ? { background: foto.surfaces.panel } : undefined,
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: s.chip,
          color: s.chipColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 600,
          border:
            state === "active" ? `1.5px solid ${foto.accent.primary}` : "none",
        }}
      >
        {state === "done" ? <Check size={14} strokeWidth={2.5} /> : null}
        {state === "active" ? (
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: foto.accent.primary,
            }}
          />
        ) : null}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Box
          sx={{
            fontFamily: fontFamilies.mono,
            fontVariantNumeric: "tabular-nums",
            fontSize: 10.5,
            color: foto.ink.tertiary,
            letterSpacing: "-0.005em",
          }}
        >
          {ticketId}
        </Box>
        <Box
          sx={{
            fontSize: 13,
            fontWeight: 600,
            color: foto.ink.primary,
            letterSpacing: "-0.01em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </Box>
        {meta ? (
          <Box
            sx={{
              fontSize: 11,
              color: foto.ink.tertiary,
              marginTop: "2px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {meta}
          </Box>
        ) : null}
      </Box>
      <Box sx={{ textAlign: "right" }}>
        {typeof preponderancia === "number" ? (
          <Box
            sx={{
              fontFamily: fontFamilies.mono,
              fontVariantNumeric: "tabular-nums",
              fontSize: 13,
              fontWeight: 600,
              color: foto.accent.deep,
              letterSpacing: "-0.005em",
            }}
          >
            {Math.round(preponderancia * 10) / 10}%
          </Box>
        ) : null}
        {cost ? (
          <Box
            sx={{
              fontFamily: fontFamilies.mono,
              fontVariantNumeric: "tabular-nums",
              fontSize: 10.5,
              color: foto.ink.tertiary,
              marginTop: "2px",
            }}
          >
            {cost}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

export default ItemMiniCard;
