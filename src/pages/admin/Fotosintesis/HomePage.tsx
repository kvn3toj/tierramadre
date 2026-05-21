import { Box } from "@mui/material";
import { getFoto } from "../../../design-system";

export default function FotosintesisHomePage() {
  const foto = getFoto("light");
  return (
    <Box sx={{ padding: "36px 28px", color: foto.ink.primary }}>
      Fotosíntesis · Inicio (en construcción — Slice 1 Day 2)
    </Box>
  );
}
