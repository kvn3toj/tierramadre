/**
 * AsesorMovementPanel — register + view the "entrega"/"devolución" kardex
 * for one product's consignment with an asesor, and (2026-07-09) graduate a
 * consigned piece straight into a real sale.
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
 *
 * ASESOR vs CONSIGNACION (destino heuristic): as the operator types the
 * recipient name, we check it against the known asesores directory
 * (`useAsesores`, the same fuzzy `matchesAsesorName` the rest of the app
 * uses). A match ⇒ "asesor" (internal); no match ⇒ "consignación" (external
 * comercializador, no system account). This is a HEURISTIC — a typo'd asesor
 * name or one missing from the directory would default to "consignación" —
 * so the entrega dialog surfaces the detected destino and lets the operator
 * flip it before saving.
 *
 * Graduation ("Vender esta pieza"): this panel does NOT call a new mutation —
 * `sales.create`'s BR-6 already accepts ASESOR/CONSIGNACION items directly
 * (only a VENDIDA item is rejected), so there's no sale-creation logic to
 * duplicate. The button just deep-links to VentaPage with the item + the
 * ledger's last known price prefilled via `?itemId=&precio=&recipient=` —
 * VentaPage reads those once on mount (see its "graduation prefill" effect)
 * and the operator confirms/edits the rest (buyer, forma de pago) there.
 * Since this page (`/admin/products`) sits outside the FotosintesisLayout
 * route tree, we can't use the AI-copilot draft bus (`openDraftForm`) that
 * VentaPage also reads — plain query params instead.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import { getAtelier, getFoto } from '../../../design-system';
import {
  convexApi,
  convexReady,
  useConvexQuery,
  useAuthedConvexAction,
} from '../../../lib/convex-safe';
import { useAsesores } from '../../../hooks/useAsesores';
import { matchesAsesorName } from '../../../utils/asesorNameUtils';
import { useNotification } from '../../../contexts/NotificationContext';

interface AsesorMovementPanelProps {
  itemId: string;
  atelier: ReturnType<typeof getAtelier>;
  foto: ReturnType<typeof getFoto>;
}

interface MovementEntry {
  _id: string;
  tipo: 'entrega' | 'devolucion';
  asesorNombre: string;
  cantidad?: number;
  precio?: number;
  fecha: string;
  notas?: string;
  registradoPorEmail: string;
  estadoAnterior: string;
  estadoNuevo: string;
  syncStatus: 'synced' | 'pending' | 'error';
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
  const navigate = useNavigate();
  const { asesores } = useAsesores();

  const product = useConvexQuery(
    convexApi.products.get,
    convexReady ? { itemId } : 'skip',
  ) as
    | { estado: string; asesorActual?: string; estadoAsesor?: string }
    | null
    | undefined;

  const movements = useConvexQuery(
    convexApi.asesorMovements.listByItem,
    convexReady ? { itemId, limit: 10 } : 'skip',
  ) as MovementEntry[] | undefined;

  const registerHandoff = useAuthedConvexAction(
    convexApi.asesorMovements.registerHandoff,
  );
  const registerReturn = useAuthedConvexAction(
    convexApi.asesorMovements.registerReturn,
  );

  const [dialog, setDialog] = useState<'entrega' | 'devolucion' | null>(null);
  const [asesorNombre, setAsesorNombre] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [fecha, setFecha] = useState(todayISODate());
  const [notas, setNotas] = useState('');
  const [destinoOverride, setDestinoOverride] = useState<
    'asesor' | 'consignacion' | null
  >(null);
  const [submitting, setSubmitting] = useState(false);

  const asesorOptions = useMemo(
    () => asesores.map((a) => a.name).filter(Boolean),
    [asesores],
  );

  // Destino heuristic (see file header) — a match against the known asesores
  // directory means "asesor" (internal); no match means "consignación"
  // (external). `destinoOverride` lets the operator correct a wrong guess.
  const matchedAsesor = useMemo(() => {
    const trimmed = asesorNombre.trim();
    if (!trimmed) return undefined;
    return asesores.find((a) => matchesAsesorName(trimmed, a.name));
  }, [asesorNombre, asesores]);
  const detectedDestino: 'asesor' | 'consignacion' = matchedAsesor
    ? 'asesor'
    : 'consignacion';
  const resolvedDestino = destinoOverride ?? detectedDestino;

  if (!convexReady) return null;

  const estado = product?.estado;
  const asesorActual = product?.asesorActual;
  const isConsigned = estado === 'ASESOR' || estado === 'CONSIGNACION';

  // Most recent entrega's price — the graduation shortcut prefills VentaPage
  // with it so the operator doesn't have to re-type the consignment price.
  const lastEntregaPrecio = movements?.find(
    (m) => m.tipo === 'entrega',
  )?.precio;

  function openDialog(kind: 'entrega' | 'devolucion') {
    setDialog(kind);
    setAsesorNombre(kind === 'devolucion' ? (asesorActual ?? '') : '');
    setCantidad('');
    setFecha(todayISODate());
    setNotas('');
    setDestinoOverride(null);
  }

  function handleGraduateToSale() {
    const params = new URLSearchParams({ itemId });
    if (typeof lastEntregaPrecio === 'number' && lastEntregaPrecio > 0) {
      params.set('precio', String(lastEntregaPrecio));
    }
    if (asesorActual) params.set('recipient', asesorActual);
    navigate(`/admin/fotosintesis/sales/new?${params.toString()}`);
  }

  async function handleSubmit() {
    if (!dialog) return;
    if (!asesorNombre.trim()) {
      notify('El nombre del asesor es obligatorio', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const args = {
        itemId,
        asesorNombre: asesorNombre.trim(),
        asesorId: matchedAsesor?.id,
        destino: dialog === 'entrega' ? resolvedDestino : undefined,
        cantidad: cantidad ? Number(cantidad) : undefined,
        fecha,
        notas: notas.trim() || undefined,
      };
      if (dialog === 'entrega') {
        await registerHandoff(args);
        notify(`Entrega registrada con ${asesorNombre.trim()}`, 'success');
      } else {
        await registerReturn(args);
        notify(`Devolución registrada`, 'success');
      }
      setDialog(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(`No se pudo registrar el movimiento: ${msg}`, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {isConsigned && asesorActual && (
        <Typography sx={{ ...atelier.type.meta, color: atelier.ink.primary }}>
          Actualmente con: <strong>{asesorActual}</strong>{' '}
          {estado === 'CONSIGNACION' ? '(consignación externa)' : '(asesor)'}
        </Typography>
      )}

      <Box sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {estado === 'DISPONIBLE' && (
          <ActionButton
            atelier={atelier}
            foto={foto}
            onClick={() => openDialog('entrega')}
          >
            Entregar a asesor
          </ActionButton>
        )}
        {isConsigned && (
          <ActionButton
            atelier={atelier}
            foto={foto}
            onClick={() => openDialog('devolucion')}
          >
            Registrar devolución
          </ActionButton>
        )}
        {isConsigned && (
          <ActionButton
            atelier={atelier}
            foto={foto}
            onClick={handleGraduateToSale}
          >
            Vender esta pieza
          </ActionButton>
        )}
        {!isConsigned && estado !== 'DISPONIBLE' && (
          <Typography
            sx={{ ...atelier.type.meta, color: atelier.ink.tertiary }}
          >
            {estado === 'VENDIDA'
              ? 'Ítem vendido — no aplica movimiento con asesor.'
              : 'Cambiá el estado a Disponible para poder entregarlo a un asesor.'}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {movements === undefined && (
          <Typography
            sx={{ ...atelier.type.meta, color: atelier.ink.tertiary }}
          >
            Cargando movimientos…
          </Typography>
        )}
        {movements?.length === 0 && (
          <Typography
            sx={{ ...atelier.type.meta, color: atelier.ink.tertiary }}
          >
            Sin movimientos registrados con asesores.
          </Typography>
        )}
        {movements?.map((m) => (
          <Box
            key={m._id}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '8px',
              py: '6px',
              borderBottom: `1px solid ${foto.surfaces.edge}`,
            }}
          >
            <Typography
              sx={{ ...atelier.type.meta, color: atelier.ink.primary }}
            >
              {m.tipo === 'entrega' ? '→ Entrega a' : '← Devolución de'}{' '}
              <strong>{m.asesorNombre}</strong>
              {m.cantidad ? ` · x${m.cantidad}` : ''}
            </Typography>
            <Typography
              sx={{ ...atelier.type.meta, color: atelier.ink.tertiary }}
            >
              {m.fecha}
              {m.syncStatus === 'error' ? ' · error de sync' : ''}
              {m.syncStatus === 'pending' ? ' · sincronizando…' : ''}
            </Typography>
          </Box>
        ))}
      </Box>

      <Dialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {dialog === 'entrega' ? 'Entregar a asesor' : 'Registrar devolución'}
        </DialogTitle>
        <DialogContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            pt: '8px !important',
          }}
        >
          <Autocomplete
            freeSolo
            options={asesorOptions}
            value={asesorNombre}
            onInputChange={(_, v) => {
              setAsesorNombre(v);
              setDestinoOverride(null);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Recibe / entrega (asesor o comercializador)"
                autoFocus
                size="small"
              />
            )}
          />
          {dialog === 'entrega' && asesorNombre.trim() && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <Typography
                sx={{ ...atelier.type.meta, color: atelier.ink.tertiary }}
              >
                {resolvedDestino === 'asesor'
                  ? `Se registra como asesor interno${matchedAsesor ? ` (${matchedAsesor.name})` : ''}.`
                  : 'Se registra como comercializador externo (consignación).'}
              </Typography>
              <ButtonBase
                disableRipple
                onClick={() =>
                  setDestinoOverride(
                    resolvedDestino === 'asesor' ? 'consignacion' : 'asesor',
                  )
                }
                sx={{
                  ...atelier.type.meta,
                  color: atelier.focus.ring,
                  textDecoration: 'underline',
                  whiteSpace: 'nowrap',
                }}
              >
                Cambiar
              </ButtonBase>
            </Box>
          )}
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
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            variant="contained"
          >
            {submitting ? 'Guardando…' : 'Guardar'}
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
        px: '12px',
        py: '8px',
        borderRadius: '4px',
        border: `1px solid ${foto.surfaces.edge}`,
        backgroundColor: foto.surfaces.inset,
        transition: atelier.motion.rowHover,
        '&:hover': {
          borderColor: atelier.focus.ring,
        },
        '&:focus-visible': {
          outline: `2px solid ${atelier.focus.ring}`,
          outlineOffset: '2px',
        },
      }}
    >
      {children}
    </ButtonBase>
  );
}
