import { Box } from "@mui/material";
import { getFoto, fontFamilies } from "../../../../design-system";

interface KbdKeyProps {
  children: React.ReactNode;
  size?: "sm" | "md";
}

/**
 * Single keystroke glyph. Match `.chip kbd` and `.kbd-row kbd` in the previews:
 * inset background, hairline border, tiny tabular mono character.
 */
export function KbdKey({ children, size = "md" }: KbdKeyProps) {
  const foto = getFoto("light");
  const dims =
    size === "sm"
      ? { fontSize: 9.5, padding: "1.5px 5px", radius: "3px" }
      : { fontSize: 10, padding: "2px 6px", radius: "4px" };

  return (
    <Box
      component="kbd"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        fontFamily: fontFamilies.mono,
        fontSize: dims.fontSize,
        background: foto.surfaces.inset,
        border: `1px solid ${foto.surfaces.edge}`,
        boxShadow: `0 1px 0 ${foto.surfaces.rule}`,
        padding: dims.padding,
        borderRadius: dims.radius,
        color: foto.ink.secondary,
        lineHeight: 1,
      }}
    >
      {children}
    </Box>
  );
}

export default KbdKey;
