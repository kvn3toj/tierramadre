import { Box } from "@mui/material";
import { useParams } from "react-router-dom";
import { getFoto } from "../../../design-system";

export default function FotosintesisCapturaLotePage() {
  const foto = getFoto("light");
  const { loteId } = useParams();
  return (
    <Box sx={{ padding: "36px 28px", color: foto.ink.primary }}>
      Captura de lote · {loteId ?? "nuevo"} (en construcción — Slice 1 Day 3–4)
    </Box>
  );
}
