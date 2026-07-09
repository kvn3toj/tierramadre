/**
 * AsesorMovementPanel — register + view the "entrega"/"devolución" kardex
 * for one product's consignment with an asesor.
 *
 * Self-contained: fetches its own product snapshot (asesorActual/estadoAsesor
 * aren't in the slimmed `EditDrawerProduct` the parent passes down) and its
 * own movement history, and calls `asesorMovements.registerHandoff` /
 * `registerReturn` directly. EditDrawer only needs to mount
 * `<AsesorMovementPanel itemId={product.itemId} />` — see the "Con asesor"
 * Section next to "Estado".
 *
 * Closes the gap from the 2026-07-09 audit: `estado: "ASESOR"` was already
 * settable from the Estado radio, but nothing recorded WHICH asesor holds
 * the piece, and the only way to set that was editing the Google Sheet
 * directly. This panel is the missing "who" + history, and pushes an
 * append-only row per movement to the "Movimientos Asesor" tab (see
 * convex/asesorMovements.ts).
 */

import { useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  ButtonBase,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { getAtelier, getFoto } from "../../../design-system";
import {
  convexApi,
  convexReady,
  useConvexQuery,
  useAuthedConvexAction,
} from "../../../lib/convex-safe";
import { useAsesores } from "../../../hooks/useAsesores";
import { useNotification } from "../../../contexts/NotificationContext";

interface AsesorMovementPanelProps {
  itemId: string;
  atelier: ReturnType<typeof getAtelier>;
  foto: ReturnType<typeof getFoto>;
}

interface MovementEntry {
  _id: string;
  tipo: "entrega" | "devolucion";
  asesorNombre: string;
  cantidad?: number;
  fecha: string;
  notas?: string;
  registradoPorEmail: string;
  estadoAnterior: string;
  estadoNuevo: string;
  syncStatus: "synced" | "pending" | "error";
}

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AsesorMovementPanel({
  itemId,
  atelier,
  foto,
}: AsesorMovementPanelProps) {
  const { notify } = useNotification();
  const { asesores } = useAsesores();

  const product = useConvexQuery(
    convexApi.products.get,
    convexReady ? { itemId } : "skip",
  ) as
    | { estado: string; asesorActual?: string; estadoAsesor?: string }
    | null
    | undefined;

  const movements = useConvexQuery(
    convexApi.asesorMovements.listByItem,
    convexReady ? { itemId, limit: 10 } : "skip",
  ) as MovementEntry[] | undefined;

  const registerHandoff = useAuthedConvexAction(
    convexApi.asesorMovements.registerHandoff,
  );
  const registerReturn = useAuthedConvexAction(
    convexApi.asesorMovements.registerReturn,
  );

  const [dialog, setDialog] = useState<"entrega" | "devolucion" | null>(null);
  const [asesorNombre, setAsesorNombre] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [fecha, setFecha] = useState(todayISODate());
  const [notas, setNotas] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const asesorOptions = useMemo(
    () => asesores.map((a) => a.name).filter(Boolean),
    [asesores],
  );

  if (!convexReady) return null;

  const estado = product?.estado;
  const asesorActual = product?.asesorActual;

  function openDialog(kind: "entrega" | "devolucion") {
    setDialog(kind);
    setAsesorNombre(kind === "devolucion" ? asesorActual ?? "" : "");
    setCantidad("");
    setFecha(todayISODate());
    setNotas("");
  }

  async function handleSubmit() {
    if (!dialog) return;
    if (!asesorNombre.trim()) {
      notify("El nombre del asesor es obligatorio", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const args = {
        itemId,
        asesorNombre: asesorNombre.trim(),
        cantidad: cantidad ? Number(cantidad) : undefined,
        fecha,
        notas: notas.trim() || undefined,
      };
      if (dialog === "entrega") {
        await registerHandoff(args);
        notify(`Entrega registrada con ${asesorNombre.trim()}`, "success");
      } else {
        await registerReturn(args);
        notify(`Devolución registrada`, "success");
      }
      setDialog(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(`No se pudo registrar el movimiento: ${msg}`, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {estado === "ASESOR" && asesorActual && (
        <Typography sx={{ ...atelier.type.meta, color: atelier.ink.primary }}>
          Actualmente con: <strong>{asesorActual}</strong>
        </Typography>
      )}

      <Box sx={{ display: "flex", gap: "8px" }}>
        {estado === "DISPONIBLE" && (
          <ActionButton
            atelier={atelier}
            foto={foto}
            onClick={() => openDialog("entrega")}
          >
            Entregar a asesor
          </ActionButton>
        )}
        {estado === "ASESOR" && (
          <ActionButton
            atelier={atelier}
            foto={foto}
            onClick={() => openDialog("devolucion")}
          >
            Registrar devolución
          </ActionButton>
        )}
        {estado !== "DISPONIBLE" && estado !== "ASESOR" && (
          <Typography sx={{ ...atelier.type.meta, color: atelier.ink.tertiary }}>
            {estado === "VENDIDA"
              ? "Ítem vendido — no aplica movimiento con asesor."
              : "Cambiá el estado a Disponible para poder entregarlo a un asesor."}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {movements === undefined && (
          <Typography sx={{ ...atelier.type.meta, color: atelier.ink.tertiary }}>
            Cargando movimientos…
          </Typography>
        )}
        {movements?.length === 0 && (
          <Typography sx={{ ...atelier.type.meta, color: atelier.ink.tertiary }}>
            Sin movimientos registrados con asesores.
          </Typography>
        )}
        {movements?.map((m) => (
          <Box
            key={m._id}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: "8px",
              py: "6px",
              borderBottom: `1px solid ${foto.surfaces.edge}`,
            }}
          >
            <Typography sx={{ ...atelier.type.meta, color: atelier.ink.primary }}>
              {m.tipo === "entrega" ? "→ Entrega a" : "← Devolución de"}{" "}
              <strong>{m.asesorNombre}</strong>
              {m.cantidad ? ` · x${m.cantidad}` : ""}
            </Typography>
            <Typography sx={{ ...atelier.type.meta, color: atelier.ink.tertiary }}>
              {m.fecha}
              {m.syncStatus === "error" ? " · error de sync" : ""}
              {m.syncStatus === "pending" ? " · sincronizando…" : ""}
            </Typography>
          </Box>
        ))}
      </Box>

      <Dialog open={dialog !== null} onClose={() => setDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {dialog === "entrega" ? "Entregar a asesor" : "Registrar devolución"}
        </DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}
        >
          <Autocomplete
            freeSolo
            options={asesorOptions}
            value={asesorNombre}
            onInputChange={(_, v) => setAsesorNombre(v)}
            renderInput={(params) => (
              <TextField {...params} label="Asesor" autoFocus size="small" />
            )}
          />
          <TextField
            label="Cantidad (opcional)"
            type="number"
            size="small"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
          <TextField
            label="Fecha"
            type="date"
            size="small"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Notas (opcional)"
            size="small"
            multiline
            minRows={2}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} variant="contained">
            {submitting ? "Guardando…" : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function ActionButton({
  atelier,
  foto,
  onClick,
  children,
}: {
  atelier: ReturnType<typeof getAtelier>;
  foto: ReturnType<typeof getFoto>;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      disableRipple
      sx={{
        ...atelier.type.label,
        color: atelier.ink.primary,
        px: "12px",
        py: "8px",
        borderRadius: "4px",
        border: `1px solid ${foto.surfaces.edge}`,
        backgroundColor: foto.surfaces.inset,
        transition: atelier.motion.rowHover,
        "&:hover": {
          borderColor: atelier.focus.ring,
        },
        "&:focus-visible": {
          outline: `2px solid ${atelier.focus.ring}`,
          outlineOffset: "2px",
        },
      }}
    >
      {children}
    </ButtonBase>
  );
}
