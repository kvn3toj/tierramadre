import { Box } from "@mui/material";
import { getFoto } from "../../../../design-system";
import { KbdKey } from "./KbdKey";

export interface Shortcut {
  /** Label like "Duplicar ítem". */
  label: string;
  /** Keys like ["⌘", "D"]. */
  keys: string[];
}

interface ShortcutTableProps {
  title?: string;
  shortcuts: Shortcut[];
}

/**
 * 2-col grid of label + chord — bandejas use this to surface keyboard
 * shortcuts at the bottom of each page (handoff §3.12).
 */
export function ShortcutTable({ title, shortcuts }: ShortcutTableProps) {
  const foto = getFoto("light");
  return (
    <Box
      sx={{
        padding: "14px 16px",
        borderTop: `1px solid ${foto.surfaces.edge}`,
      }}
    >
      {title ? (
        <Box
          sx={{
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: foto.ink.tertiary,
            marginBottom: "10px",
          }}
        >
          {title}
        </Box>
      ) : null}
      <Box
        component="dl"
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          rowGap: "8px",
          columnGap: "16px",
          margin: 0,
        }}
      >
        {shortcuts.map((s) => (
          <Box key={s.label} sx={{ display: "contents" }}>
            <Box
              component="dt"
              sx={{
                fontSize: 11.5,
                color: foto.ink.secondary,
                minWidth: 0,
                overflowWrap: "anywhere",
              }}
            >
              {s.label}
            </Box>
            <Box
              component="dd"
              sx={{
                display: "flex",
                gap: "4px",
                margin: 0,
              }}
            >
              {s.keys.map((k, idx) => (
                <KbdKey key={`${s.label}-${idx}`} size="sm">
                  {k}
                </KbdKey>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default ShortcutTable;
