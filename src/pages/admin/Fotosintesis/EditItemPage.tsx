import { Box } from "@mui/material";
import { ChevronLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { getFoto, fontFamilies } from "../../../design-system";
import { useConvexQuery, convexApi } from "../../../lib/convex-safe";
import type { Id } from "../../../../convex/_generated/dataModel";
import { EditItemDrawer } from "./components/EditItemDrawer";

/**
 * Dedicated, routed page for editing a single captured ítem — the full-page
 * replacement for the old right-anchored EditItemDrawer (better UX: own URL,
 * browser back, no overlay/focus-trap, room to breathe). Reached from both the
 * captura sidebar and the lote resumen via
 * `/admin/fotosintesis/lots/:loteId/items/:lotItemId/edit`.
 *
 * It re-derives the same props the drawer always took (lotItemId,
 * currentPreponderancia, siblingPreponderanciaSum, ticketLabel, lotEstado)
 * from the lot + its items, then renders EditItemDrawer in its `variant="page"`
 * chrome. "Volver" / save / delete all return to the lote's home surface.
 *
 * Dirty-guard scope: the drawer's useDirtyGuard protects the in-component exits
 * ("Volver", "Cancelar", Esc) and tab-close/refresh (beforeunload). As a routed
 * page, browser-Back / breadcrumb / global ⌘N·⌘V·⌘D still discard unsaved field
 * edits without a prompt — react-router `useBlocker` would close that gap, but it
 * requires a data router (the app uses <BrowserRouter>). Tracked as a follow-up.
 */
export default function EditItemPage() {
  const foto = getFoto("light");
  const navigate = useNavigate();
  const { loteId: loteIdParam, lotItemId: lotItemIdParam } = useParams();
  const loteId = loteIdParam ?? "";
  const lotItemId = lotItemIdParam ?? "";

  const lot = useConvexQuery(
    convexApi.lots.getByLoteId,
    loteId ? { loteId } : "skip",
  );
  const lotItems = useConvexQuery(
    convexApi.lotItems.listByLote,
    loteId ? { loteId } : "skip",
  );

  // Where "Volver" / save / delete return: abierto lots live in the capture
  // screen, closed/published lots in the resumen.
  const backTo =
    lot?.estado === "abierto"
      ? `/admin/fotosintesis/lots/${loteId}`
      : `/admin/fotosintesis/lots/${loteId}/close`;
  const goBack = () => navigate(backTo);

  if (lot === undefined || lotItems === undefined) {
    return (
      <Box
        sx={{ padding: "36px 28px", color: foto.ink.tertiary, fontSize: 13 }}
      >
        Cargando ítem…
      </Box>
    );
  }

  const editingItem = (lotItems ?? []).find((it) => it._id === lotItemId);

  if (!lot || !editingItem) {
    return (
      <Box sx={{ maxWidth: 820, margin: "0 auto", padding: "20px 26px" }}>
        <Box
          component="button"
          type="button"
          onClick={goBack}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            border: "none",
            background: "transparent",
            color: foto.ink.secondary,
            fontFamily: fontFamilies.system,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: "pointer",
            padding: "6px 8px",
            marginLeft: "-8px",
          }}
        >
          <ChevronLeft size={15} strokeWidth={2} />
          Volver
        </Box>
        <Box
          role="alert"
          sx={{ marginTop: "18px", fontSize: 13, color: foto.status.sold }}
        >
          No encontramos este ítem en el lote {loteId}.
        </Box>
      </Box>
    );
  }

  const editingIndex = (lotItems ?? []).findIndex(
    (it) => it._id === editingItem._id,
  );
  const siblingSum = (lotItems ?? [])
    .filter((it) => it._id !== editingItem._id)
    .reduce((s, it) => s + it.preponderancia, 0);

  return (
    <EditItemDrawer
      variant="page"
      open
      onClose={goBack}
      itemId={editingItem.itemId}
      loteId={loteId}
      lotItemId={editingItem._id as Id<"lotItems">}
      currentPreponderancia={editingItem.preponderancia}
      lotCostoTotalCOP={lot.costoTotalCOP}
      siblingPreponderanciaSum={siblingSum}
      ticketLabel={`${loteId} · ${String(editingIndex + 1).padStart(3, "0")}`}
      lotEstado={lot.estado}
      editable
    />
  );
}
