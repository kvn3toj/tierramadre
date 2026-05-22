import { Box } from "@mui/material";
import { useParams } from "react-router-dom";
import { getFoto } from "../../../design-system";

export default function FotosintesisLoteResumenPage() {
  const foto = getFoto("light");
  const { loteId } = useParams();
  return (
    <Box sx={{ padding: "36px 28px", color: foto.ink.primary }}>
      Cerrar lote · {loteId ?? "—"} (en construcción — Slice 2 Day 9)
    </Box>
  );
}
