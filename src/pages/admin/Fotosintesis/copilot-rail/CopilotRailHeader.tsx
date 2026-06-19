import { Box, IconButton, Tooltip } from "@mui/material";
import { PanelRightClose, Sparkles } from "lucide-react";
import { getFoto } from "../../../../design-system";
import { KbdKey } from "../components/KbdKey";

/**
 * Top brand bar of the expanded Copilot rail. Chat controls (new chat, stop,
 * scroll) stay in CopilotPanel's snapshot strip; this header owns identity, the
 * ⌘J hint, and the collapse affordance.
 */
export function CopilotRailHeader({ onClose }: { onClose: () => void }) {
  const foto = getFoto("light");
  return (
    <Box
      sx={{
        padding: "18px 22px 14px",
        borderBottom: `1px solid ${foto.surfaces.rule}`,
        background: foto.surfaces.canvas,
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Box
          sx={{
            fontSize: "9px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: foto.ink.tertiary,
            fontWeight: 500,
          }}
        >
          Atelier · copiloto
        </Box>
        <Box
          component="h2"
          sx={{
            margin: "4px 0 0",
            fontSize: "18px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            color: foto.ink.primary,
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
          }}
        >
          <Sparkles size={16} strokeWidth={1.9} color={foto.accent.primary} />
          Fotosynthia
        </Box>
      </Box>
      <Box sx={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
        <Box
          sx={{
            display: { xs: "none", sm: "inline-flex" },
            alignItems: "center",
            gap: "4px",
            fontSize: "10px",
            color: foto.ink.tertiary,
          }}
        >
          <KbdKey size="sm">⌘</KbdKey>
          <KbdKey size="sm">J</KbdKey>
        </Box>
        <Tooltip title="Contraer (⌘J)" arrow placement="bottom">
          <IconButton
            aria-label="Contraer Fotosynthia"
            onClick={onClose}
            size="small"
            sx={{
              color: foto.ink.secondary,
              border: `1px solid ${foto.surfaces.edge}`,
              borderRadius: "8px",
              width: 32,
              height: 32,
              minWidth: 44,
              minHeight: 44,
              "&:hover": {
                background: foto.surfaces.inset,
                color: foto.ink.primary,
              },
              "&:focus-visible": {
                outline: "none",
                boxShadow: `0 0 0 3px ${foto.accent.glow}`,
              },
            }}
          >
            <PanelRightClose size={16} strokeWidth={1.8} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}

export default CopilotRailHeader;
