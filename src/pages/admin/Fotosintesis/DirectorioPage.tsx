import { Box } from "@mui/material";
import { getFoto } from "../../../design-system";

export default function FotosintesisDirectorioPage() {
  const foto = getFoto("light");
  return (
    <Box sx={{ padding: "36px 28px", color: foto.ink.primary }}>
      Directorio (en construcción — Slice 1 Day 5–6)
    </Box>
  );
}
