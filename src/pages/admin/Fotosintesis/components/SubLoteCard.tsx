import { useState } from "react";
import { Box } from "@mui/material";
import { Link } from "react-router-dom";
import { Pencil, Archive, RotateCcw, ArrowRight } from "lucide-react";

import { getFoto, fontFamilies } from "../../../../design-system";
import { useConvexMutation, convexApi } from "../../../../lib/convex-safe";
import { useNotification } from "../../../../contexts/NotificationContext";
import type { Doc } from "../../../../../convex/_generated/dataModel";

const formatCOP = (n: number): string =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

interface SubLoteCardProps {
  subLote: Doc<"subLotes">;
  /** itemId → product, to resolve member names without extra queries. */
  productById: Map<string, Doc<"productInventory">>;
  onEdit: (subLote: Doc<"subLotes">) => void;
}

export function SubLoteCard({
  subLote,
  productById,
  onEdit,
}: SubLoteCardProps) {
  const foto = getFoto("light");
  const { notify } = useNotification();
  const setEstado = useConvexMutation(convexApi.subLotes.setEstado);
  const [busy, setBusy] = useState(false);

  const archived = subLote.estado === "archivada";

  const toggleEstado = async () => {
    setBusy(true);
    try {
      await setEstado({
        subLoteId: subLote.subLoteId,
        estado: archived ? "activa" : "archivada",
      });
      notify(
        archived
          ? `Sub-lote ${subLote.subLoteId} reactivado`
          : `Sub-lote ${subLote.subLoteId} archivado`,
        "info",
      );
    } catch (err) {
      notify(
        err instanceof Error
          ? err.message
          : "No pudimos actualizar el estado del sub-lote",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  const actionBtnSx = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontFamily: fontFamilies.system,
    fontSize: 12,
    fontWeight: 600,
    padding: "7px 12px",
    borderRadius: "8px",
    border: `1px solid ${foto.surfaces.rule}`,
    background: foto.surfaces.inset,
    color: foto.ink.secondary,
    cursor: busy ? "wait" : "pointer",
    "&:hover": { borderColor: foto.accent.primary, color: foto.accent.deep },
  } as const;

  return (
    <Box
      sx={{
        background: foto.surfaces.panel,
        border: `1px solid ${foto.surfaces.rule}`,
        borderRadius: "14px",
        padding: "18px 20px",
        opacity: archived ? 0.62 : 1,
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "12px",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Box
            sx={{
              fontSize: 11,
              fontFamily: fontFamilies.mono,
              color: foto.ink.tertiary,
            }}
          >
            {subLote.subLoteId}
          </Box>
          <Box
            sx={{
              fontSize: 16,
              fontWeight: 600,
              color: foto.ink.primary,
              letterSpacing: "-0.01em",
            }}
          >
            {subLote.nombre}
          </Box>
        </Box>
        <Box
          sx={{
            flexShrink: 0,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            padding: "4px 9px",
            borderRadius: "999px",
            color: archived ? foto.ink.tertiary : foto.accent.deep,
            background: archived ? foto.surfaces.inset : foto.accent.soft,
          }}
        >
          {archived ? "Archivada" : "Activa"}
        </Box>
      </Box>

      {/* Stats */}
      <Box sx={{ display: "flex", gap: "20px", alignItems: "baseline" }}>
        <Box>
          <Box
            sx={{
              fontSize: 20,
              fontWeight: 600,
              color: foto.ink.primary,
              fontFamily: fontFamilies.mono,
            }}
          >
            {subLote.unidades}
          </Box>
          <Box sx={{ fontSize: 11, color: foto.ink.tertiary }}>
            {subLote.unidades === 1 ? "ítem" : "ítems"}
          </Box>
        </Box>
        <Box>
          <Box
            sx={{
              fontSize: 20,
              fontWeight: 600,
              color: foto.ink.primary,
              fontFamily: fontFamilies.mono,
            }}
          >
            {formatCOP(subLote.totalCostoCOP)}
          </Box>
          <Box sx={{ fontSize: 11, color: foto.ink.tertiary }}>costo base</Box>
        </Box>
      </Box>

      {subLote.notas ? (
        <Box
          sx={{
            fontSize: 12.5,
            color: foto.ink.secondary,
            lineHeight: 1.5,
            fontStyle: "italic",
          }}
        >
          {subLote.notas}
        </Box>
      ) : null}

      {/* Member items */}
      {subLote.itemIds.length > 0 ? (
        <Box component="ul" role="list" sx={{ listStyle: "none", m: 0, p: 0 }}>
          {subLote.itemIds.map((itemId) => {
            const product = productById.get(itemId);
            return (
              <Box
                component="li"
                key={itemId}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  padding: "7px 0",
                  borderBottom: `1px solid ${foto.surfaces.edge}`,
                  "&:last-of-type": { borderBottom: "none" },
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Box
                    sx={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: foto.ink.primary,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {product?.nombre ?? `Ítem ${itemId}`}
                  </Box>
                  <Box
                    sx={{
                      fontSize: 10.5,
                      color: foto.ink.tertiary,
                      fontFamily: fontFamilies.mono,
                    }}
                  >
                    #{itemId} · {formatCOP(product?.costoBaseCOP ?? 0)}
                  </Box>
                </Box>
                {!archived ? (
                  <Box
                    component={Link}
                    to={`/admin/fotosintesis/sales/new?itemId=${encodeURIComponent(
                      itemId,
                    )}`}
                    sx={{
                      flexShrink: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: foto.accent.deep,
                      textDecoration: "none",
                      "&:hover": { color: foto.accent.primary },
                    }}
                  >
                    Vender
                    <ArrowRight size={12} strokeWidth={2} />
                  </Box>
                ) : null}
              </Box>
            );
          })}
        </Box>
      ) : (
        <Box sx={{ fontSize: 12, color: foto.ink.tertiary }}>
          Sin ítems en este grupo.
        </Box>
      )}

      {/* Actions */}
      <Box sx={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <Box
          component="button"
          type="button"
          onClick={() => onEdit(subLote)}
          sx={actionBtnSx}
        >
          <Pencil size={13} /> Editar
        </Box>
        <Box
          component="button"
          type="button"
          disabled={busy}
          onClick={() => void toggleEstado()}
          sx={actionBtnSx}
        >
          {archived ? <RotateCcw size={13} /> : <Archive size={13} />}
          {archived ? "Reactivar" : "Archivar"}
        </Box>
      </Box>
    </Box>
  );
}
