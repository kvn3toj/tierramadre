import { Box } from "@mui/material";
import { useParams } from "react-router-dom";
import { getFoto } from "../../../design-system";

export default function FotosintesisVentaPage() {
  const foto = getFoto("light");
  const { saleId } = useParams();
  return (
    <Box sx={{ padding: "36px 28px", color: foto.ink.primary }}>
      Venta · {saleId ?? "nueva"} (en construcción — Slice 1 Day 5)
    </Box>
  );
}
