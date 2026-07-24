/**
 * Fotosíntesis · Movimientos con asesores — the multi-item "hoja manuscrita"
 * replacement.
 *
 * Registers ONE kardex event (one recipient, one date, one signature) that
 * moves N inventory items between `DISPONIBLE` and `ASESOR`/`CONSIGNACION`
 * (2026-07-09: which of the two depends on whether the typed recipient
 * matches a known asesor — see the `destino` heuristic below) in a single
 * submit, via `asesorMovements.registerHandoffBatch` /
 * `registerReturnBatch` (convex/asesorMovements.ts). Mirrors the two
 * motivating paper records from the team's Anima notes: a 5-item delivery to
 * Pablo Loaiza (mixed consignación/vendido) and a 7-item delivery to
 * Mauricio Echeverry (7x consignación, one shared condición, one total).
 *
 * NOT the single-item flow — that lives in
 * `src/pages/admin/ProductManagement/AsesorMovementPanel.tsx` (mounted
 * inside EditDrawer's "Con asesor" section) and stays untouched. This page
 * is the standalone, batch-first entry point reachable from the Fotosíntesis
 * nav (`/admin/fotosintesis/movimientos`).
 *
 * The batch action is NOT all-or-nothing — a per-item failure (e.g. an item
 * already with another asesor) is collected in `failed` while the rest of
 * the batch still goes through. The result panel below the form always
 * shows both lists plus the resulting `kardexEventId`, which a parallel
 * effort uses to render a printable comprobante.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Autocomplete,
  Box,
  Button,
  IconButton,
  Link as MuiLink,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  FileDown,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react';
import { getFoto, fontFamilies } from '../../../design-system';
import {
  convexApi,
  convexReady,
  useConvexQuery,
  useAuthedConvexAction,
} from '../../../lib/convex-safe';
import { FotoTopbar, FOTO_TOPBAR_HEIGHT } from './components/FotoTopbar';
import { useAsesores } from '../../../hooks/useAsesores';
import { matchesAsesorName } from '../../../utils/asesorNameUtils';
import { useNotification } from '../../../contexts/NotificationContext';
import { MovimientoKardexPreview } from './components/MovimientoKardexPreview';
import { resolveItemThumbnail } from './utils/resolveThumbnail';
import { exportAndUploadMovimientoKardexPdf } from './exportMovimientoKardexPdf';
import { comprobanteFilename } from './comprobanteFilename';

type Mode = 'entrega' | 'devolucion';

interface CandidateItem {
  itemId: string;
  nombre: string;
  precioSugerido?: number;
}

interface ItemRowState {
  key: string;
  itemId: string;
  nombre: string;
  cantidad: string;
  precio: string;
  notas: string;
}

interface BatchOkEntry {
  itemId: string;
  movementId: string;
  movimientoId: string;
}
interface BatchFailedEntry {
  itemId: string;
  error: string;
}
interface BatchOutcome {
  kardexEventId: string;
  ok: BatchOkEntry[];
  failed: BatchFailedEntry[];
}

const COP_FORMATTER = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

function formatCop(value: number): string {
  return COP_FORMATTER.format(value);
}

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

function newRowKey(): string {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyRow(): ItemRowState {
  return {
    key: newRowKey(),
    itemId: '',
    nombre: '',
    cantidad: '',
    precio: '',
    notas: '',
  };
}

export default function MovimientosKardexPage() {
  const foto = getFoto('light');
  const { notify } = useNotification();
  const { asesores } = useAsesores();
  // Reprint mode: /admin/fotosintesis/movimientos?kardexEventId=KDX-... looks
  // up an ALREADY-registered event (e.g. one entered outside this form, or a
  // past submit) and offers the same PDF comprobante generation — doesn't
  // require re-running the batch submit.
  const [searchParams] = useSearchParams();
  const lookupKardexEventId = searchParams.get('kardexEventId')?.trim() || null;
  // Deep-link seed from the QR scanner: /admin/fotosintesis/movimientos?itemId=B-001-G1
  // pre-fills row 1 with this item once its candidate data resolves — same
  // "enrich a deep-linked stub" pattern VentaPage.tsx uses for the same param.
  const seedItemId = searchParams.get('itemId')?.trim() || null;

  const [mode, setMode] = useState<Mode>('entrega');
  const [asesorNombre, setAsesorNombre] = useState('');
  const [fecha, setFecha] = useState(todayISODate());
  const [condicion, setCondicion] = useState('');
  const [entregadoPorNombre, setEntregadoPorNombre] = useState('');
  // ASESOR vs CONSIGNACION heuristic (mirrors AsesorMovementPanel) — a match
  // against the known asesores directory means "asesor" (internal); no match
  // means "consignación" (external comercializador). `destinoOverride` lets
  // the operator correct a wrong guess before submitting.
  const [destinoOverride, setDestinoOverride] = useState<
    'asesor' | 'consignacion' | null
  >(null);
  const [rows, setRows] = useState<ItemRowState[]>([emptyRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<BatchOutcome | null>(null);
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const asesorOptions = useMemo(
    () => asesores.map((a) => a.name).filter(Boolean),
    [asesores],
  );

  const matchedAsesor = useMemo(() => {
    const trimmed = asesorNombre.trim();
    if (!trimmed) return undefined;
    return asesores.find((a) => matchesAsesorName(trimmed, a.name));
  }, [asesorNombre, asesores]);
  const detectedDestino: 'asesor' | 'consignacion' = matchedAsesor
    ? 'asesor'
    : 'consignacion';
  const resolvedDestino = destinoOverride ?? detectedDestino;

  // ── Candidate item pools ────────────────────────────────────────────────
  // Entrega: any DISPONIBLE item, fetched once (client-filtered per row by
  // typed text) rather than one reactive query per row.
  const disponibles = useConvexQuery(
    convexApi.products.list,
    convexReady && mode === 'entrega' ? { estado: 'DISPONIBLE' } : 'skip',
  ) as
    | Array<{
        itemId: string;
        nombre: string;
        precioFinalCOP?: number;
        precioCOP?: number;
      }>
    | undefined;

  // Devolución: only items CURRENTLY with this asesor. `products.list`
  // doesn't expose `asesorActual`, so we derive "currently held" from this
  // asesor's own movement history — the latest movement per item tells us
  // whether it's still out with them (tipo "entrega") or already back
  // ("devolucion"). Cross-referenced against the live ASESOR pool so an
  // item some OTHER asesor now holds never shows up here.
  const asesorTrimmed = asesorNombre.trim();
  const asesorMovementHistory = useConvexQuery(
    convexApi.asesorMovements.listByAsesor,
    convexReady && mode === 'devolucion' && asesorTrimmed
      ? { asesorNombre: asesorTrimmed, limit: 300 }
      : 'skip',
  ) as
    | Array<{
        itemId: string;
        tipo: 'entrega' | 'devolucion';
        _creationTime: number;
      }>
    | undefined;
  // Two separate queries — `products.list` only accepts one `estado` at a
  // time — merged below so a devolución candidate can come from either an
  // internal asesor OR an external comercializador's consignment.
  const enAsesor = useConvexQuery(
    convexApi.products.list,
    convexReady && mode === 'devolucion' ? { estado: 'ASESOR' } : 'skip',
  ) as
    | Array<{
        itemId: string;
        nombre: string;
        precioFinalCOP?: number;
        precioCOP?: number;
      }>
    | undefined;
  const enConsignacion = useConvexQuery(
    convexApi.products.list,
    convexReady && mode === 'devolucion' ? { estado: 'CONSIGNACION' } : 'skip',
  ) as
    | Array<{
        itemId: string;
        nombre: string;
        precioFinalCOP?: number;
        precioCOP?: number;
      }>
    | undefined;

  const currentlyHeldItemIds = useMemo(() => {
    if (!asesorMovementHistory) return new Set<string>();
    const latestByItem = new Map<string, 'entrega' | 'devolucion'>();
    // listByAsesor is already `.order('desc')` — first occurrence per
    // itemId is the most recent movement.
    for (const m of asesorMovementHistory) {
      if (!latestByItem.has(m.itemId)) latestByItem.set(m.itemId, m.tipo);
    }
    const held = new Set<string>();
    for (const [itemId, tipo] of latestByItem) {
      if (tipo === 'entrega') held.add(itemId);
    }
    return held;
  }, [asesorMovementHistory]);

  const candidatePool: CandidateItem[] = useMemo(() => {
    if (mode === 'entrega') {
      return (disponibles ?? []).map((p) => ({
        itemId: p.itemId,
        nombre: p.nombre,
        precioSugerido: p.precioFinalCOP ?? p.precioCOP,
      }));
    }
    return [...(enAsesor ?? []), ...(enConsignacion ?? [])]
      .filter((p) => currentlyHeldItemIds.has(p.itemId))
      .map((p) => ({
        itemId: p.itemId,
        nombre: p.nombre,
        precioSugerido: p.precioFinalCOP ?? p.precioCOP,
      }));
  }, [mode, disponibles, enAsesor, enConsignacion, currentlyHeldItemIds]);

  const seededRef = useRef(false);
  useEffect(() => {
    if (!seedItemId || seededRef.current || mode !== 'entrega') return;
    const match = candidatePool.find((c) => c.itemId === seedItemId);
    if (!match) return;
    seededRef.current = true;
    setRows([
      {
        key: newRowKey(),
        itemId: match.itemId,
        nombre: match.nombre,
        cantidad: '',
        precio: match.precioSugerido ? String(match.precioSugerido) : '',
        notas: '',
      },
    ]);
  }, [seedItemId, mode, candidatePool]);

  // Resolves either from a just-completed submit (outcome) or a
  // `?kardexEventId=` lookup (reprint mode) — whichever is present.
  const activeKardexEventId =
    outcome && outcome.ok.length > 0
      ? outcome.kardexEventId
      : lookupKardexEventId;

  const kardexEventRows = useConvexQuery(
    convexApi.asesorMovements.listByKardexEventId,
    convexReady && activeKardexEventId
      ? { kardexEventId: activeKardexEventId }
      : 'skip',
  ) as
    | Array<{
        itemId: string;
        itemNombre?: string;
        tipo: 'entrega' | 'devolucion';
        asesorNombre: string;
        cantidad?: number;
        precio?: number;
        fecha: string;
        notas?: string;
        condicion?: string;
        entregadoPorNombre?: string;
        registradoPorNombre?: string;
        kardexEventId?: string;
        movimientoId: string;
      }>
    | undefined;

  // ── Photos for the comprobante ───────────────────────────────────────────
  // `asesorMovements` rows carry no photo — the ledger stores the movement,
  // not the piece. Join productInventory for each item's `fotoUrl`, the same
  // way the sale carnet resolves its thumbnails.
  const kardexItemIds = useMemo(
    () => [...new Set((kardexEventRows ?? []).map((r) => r.itemId))],
    [kardexEventRows],
  );

  const kardexProducts = useConvexQuery(
    convexApi.products.getManyByItemIds,
    convexReady && kardexItemIds.length > 0
      ? { itemIds: kardexItemIds }
      : 'skip',
  ) as Array<{ itemId: string; fotoUrl?: string }> | undefined;

  const kardexRowsWithFotos = useMemo(() => {
    const rows = kardexEventRows ?? [];
    if (!kardexProducts?.length) return rows;
    const fotoByItemId = new Map(
      kardexProducts.map((p) => [p.itemId, p.fotoUrl]),
    );
    return rows.map((r) => ({
      ...r,
      // resolveItemThumbnail routes the Drive URL through our own
      // /api/serve-drive-image proxy. That is load-bearing, not cosmetic: a
      // raw drive.google.com src taints html2canvas's canvas and the PDF
      // export fails outright. No batch fallback here — a consignment
      // comprobante shows the piece's own photo or none.
      fotoUrl: resolveItemThumbnail(
        fotoByItemId.get(r.itemId),
        r.itemId,
        undefined,
      ),
    }));
  }, [kardexEventRows, kardexProducts]);

  async function handleGenerateComprobante() {
    if (!activeKardexEventId || !previewRef.current) return;
    setGeneratingPdf(true);
    let url: string;
    try {
      url = await exportAndUploadMovimientoKardexPdf(
        previewRef.current,
        comprobanteFilename(activeKardexEventId),
      );
    } catch (err) {
      // The PDF itself was never generated/uploaded — this is a real failure,
      // there's nothing in Drive and nothing to show the operator.
      const msg = err instanceof Error ? err.message : String(err);
      notify(`No se pudo generar el comprobante: ${msg}`, 'error');
      setGeneratingPdf(false);
      return;
    }
    setComprobanteUrl(url);
    try {
      // Persist BEFORE notifying success: the URL used to live only here, in
      // React state, and died with the tab. If this throws, the PDF is still
      // in Drive and the link above already works — only the DB stamp failed.
      await persistComprobanteUrl({
        kardexEventId: activeKardexEventId,
        comprobanteUrl: url,
      });
      notify('Comprobante generado y archivado', 'success');
    } catch (err) {
      // The PDF exists and the link works — only the archive step failed.
      // Regenerating is a valid retry (it'll orphan this Drive file), not a
      // required rescue: tell the operator the truth instead of "failed".
      const msg = err instanceof Error ? err.message : String(err);
      notify(
        `Comprobante generado (el enlace ya funciona), pero no quedó archivado en el kardex: ${msg}. El bot de Telegram no lo va a encontrar así.`,
        'warning',
      );
    } finally {
      setGeneratingPdf(false);
    }
  }

  const registerHandoffBatch = useAuthedConvexAction(
    convexApi.asesorMovements.registerHandoffBatch,
  );
  const registerReturnBatch = useAuthedConvexAction(
    convexApi.asesorMovements.registerReturnBatch,
  );
  const persistComprobanteUrl = useAuthedConvexAction(
    convexApi.asesorMovements.setComprobanteUrl,
  );

  const selectedItemIds = useMemo(
    () => new Set(rows.map((r) => r.itemId).filter(Boolean)),
    [rows],
  );

  const total = useMemo(
    () =>
      // SOT v3: `precio` is seeded from precioFinalCOP, which is the price of
      // the WHOLE item (all its stones) — not a per-unit price. So the line
      // total IS the price; multiplying by `cantidad` double-counted. `cantidad`
      // is still captured and persisted on the movement as a record of how many
      // pieces changed hands, but it is not a price multiplier.
      rows.reduce((sum, r) => {
        const precio = Number(r.precio);
        if (!Number.isFinite(precio) || precio <= 0) return sum;
        return sum + precio;
      }, 0),
    [rows],
  );

  function updateRow(key: string, patch: Partial<ItemRowState>) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(key: string) {
    setRows((prev) =>
      prev.length > 1 ? prev.filter((r) => r.key !== key) : prev,
    );
  }

  function handleModeChange(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setRows([emptyRow()]);
    setOutcome(null);
    setDestinoOverride(null);
  }

  const validRows = rows.filter((r) => r.itemId.trim());
  const canSubmit =
    !submitting && asesorTrimmed.length > 0 && validRows.length > 0;

  async function handleSubmit() {
    if (!canSubmit) {
      if (!asesorTrimmed)
        notify('El nombre del asesor es obligatorio', 'warning');
      else if (validRows.length === 0)
        notify('Agregá al menos un ítem con código válido', 'warning');
      return;
    }
    setSubmitting(true);
    setOutcome(null);
    setComprobanteUrl(null);
    try {
      const shared = {
        asesorNombre: asesorTrimmed,
        asesorId: matchedAsesor?.id,
        destino: mode === 'entrega' ? resolvedDestino : undefined,
        fecha,
        condicion: condicion.trim() || undefined,
        entregadoPorNombre: entregadoPorNombre.trim() || undefined,
        items: validRows.map((r) => ({
          itemId: r.itemId.trim(),
          cantidad: r.cantidad ? Number(r.cantidad) : undefined,
          precio: r.precio ? Number(r.precio) : undefined,
          notas: r.notas.trim() || undefined,
        })),
      };
      const result =
        mode === 'entrega'
          ? await registerHandoffBatch(shared)
          : await registerReturnBatch(shared);
      setOutcome(result);
      if (result.failed.length === 0) {
        notify(
          `${result.ok.length} ítem(s) ${mode === 'entrega' ? 'entregados' : 'devueltos'} — kardex ${result.kardexEventId}`,
          'success',
        );
        setRows([emptyRow()]);
      } else {
        notify(
          `${result.ok.length} ok, ${result.failed.length} con error — revisá el detalle`,
          'warning',
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(`No se pudo registrar el movimiento: ${msg}`, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (!convexReady) return null;

  const labelSx = {
    fontFamily: fontFamilies.mono,
    fontSize: '10.5px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: foto.ink.tertiary,
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: foto.surfaces.canvas,
        color: foto.ink.primary,
      }}
    >
      <FotoTopbar
        crumbs={[
          { label: 'Fotosíntesis', to: '/admin/fotosintesis' },
          { label: 'Movimientos' },
        ]}
      />

      <Box
        sx={{
          maxWidth: 780,
          margin: '0 auto',
          padding: `${FOTO_TOPBAR_HEIGHT + 24}px 20px 80px`,
          display: 'flex',
          flexDirection: 'column',
          gap: '22px',
        }}
      >
        <Box>
          <Typography
            sx={{ fontSize: '20px', fontWeight: 600, color: foto.ink.primary }}
          >
            Movimientos con asesores
          </Typography>
          <Typography
            sx={{ fontSize: '13px', color: foto.ink.tertiary, mt: '4px' }}
          >
            Registrá una entrega o devolución de varios ítems en un solo evento
            — reemplaza la hoja manuscrita.
          </Typography>
        </Box>

        <ToggleButtonGroup
          exclusive
          value={mode}
          onChange={(_, v) => v && handleModeChange(v)}
          sx={{
            alignSelf: 'flex-start',
            '& .MuiToggleButton-root': {
              textTransform: 'none',
              fontSize: '13px',
              fontWeight: 600,
              px: '14px',
              py: '6px',
              color: foto.ink.secondary,
              borderColor: foto.surfaces.edgeStrong,
              gap: '6px',
              '&.Mui-selected': {
                background: foto.accent.soft,
                color: foto.accent.deep,
                borderColor: foto.accent.primary,
              },
            },
          }}
        >
          <ToggleButton value="entrega">
            <ArrowUpFromLine size={14} strokeWidth={1.8} />
            Entrega
          </ToggleButton>
          <ToggleButton value="devolucion">
            <ArrowDownToLine size={14} strokeWidth={1.8} />
            Devolución
          </ToggleButton>
        </ToggleButtonGroup>

        {/* ── Shared recipient / event fields ── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: '14px',
            padding: '16px',
            borderRadius: '10px',
            border: `1px solid ${foto.surfaces.edge}`,
            background: foto.surfaces.panel,
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
                size="small"
                autoFocus
              />
            )}
          />
          {mode === 'entrega' && asesorTrimmed && (
            <Box
              sx={{
                gridColumn: { xs: '1', sm: '2' },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <Typography
                sx={{
                  fontSize: '11.5px',
                  color: foto.ink.tertiary,
                }}
              >
                {resolvedDestino === 'asesor'
                  ? `Asesor interno${matchedAsesor ? ` (${matchedAsesor.name})` : ''}`
                  : 'Comercializador externo (consignación)'}
              </Typography>
              <MuiLink
                component="button"
                type="button"
                onClick={() =>
                  setDestinoOverride(
                    resolvedDestino === 'asesor' ? 'consignacion' : 'asesor',
                  )
                }
                sx={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}
              >
                Cambiar
              </MuiLink>
            </Box>
          )}
          <TextField
            label="Fecha"
            type="date"
            size="small"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Condición (opcional)"
            size="small"
            placeholder="Ej. Devolución obligatoria si no se vende"
            value={condicion}
            onChange={(e) => setCondicion(e.target.value)}
          />
          <TextField
            label="Entregado por (opcional)"
            size="small"
            placeholder="Quién lo entregó físicamente"
            value={entregadoPorNombre}
            onChange={(e) => setEntregadoPorNombre(e.target.value)}
          />
        </Box>

        {/* ── Item rows ── */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Box sx={labelSx}>Ítems ({rows.length})</Box>
          {rows.map((row) => {
            const rowOptions = candidatePool.filter(
              (c) => c.itemId === row.itemId || !selectedItemIds.has(c.itemId),
            );
            const selected =
              rowOptions.find((c) => c.itemId === row.itemId) ?? null;
            return (
              <Box
                key={row.key}
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '10px',
                  alignItems: 'flex-start',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${foto.surfaces.edge}`,
                  background: foto.surfaces.canvas,
                }}
              >
                <Autocomplete<CandidateItem>
                  options={rowOptions}
                  value={selected}
                  getOptionLabel={(o) =>
                    typeof o === 'string' ? o : `${o.itemId} — ${o.nombre}`
                  }
                  isOptionEqualToValue={(o, v) => o.itemId === v.itemId}
                  onChange={(_, next) =>
                    updateRow(row.key, {
                      itemId: next?.itemId ?? '',
                      nombre: next?.nombre ?? '',
                      precio:
                        row.precio || !next?.precioSugerido
                          ? row.precio
                          : String(next.precioSugerido),
                    })
                  }
                  sx={{ flex: '1 1 260px', minWidth: 220 }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Ítem"
                      size="small"
                      placeholder="Buscar por código o nombre"
                    />
                  )}
                  noOptionsText={
                    mode === 'devolucion' && !asesorTrimmed
                      ? 'Ingresá primero el asesor'
                      : 'Sin resultados'
                  }
                />
                <TextField
                  label="Cant."
                  type="number"
                  size="small"
                  value={row.cantidad}
                  onChange={(e) =>
                    updateRow(row.key, { cantidad: e.target.value })
                  }
                  sx={{ width: 90 }}
                />
                <TextField
                  label="Precio (COP)"
                  type="number"
                  size="small"
                  value={row.precio}
                  onChange={(e) =>
                    updateRow(row.key, { precio: e.target.value })
                  }
                  sx={{ width: 150 }}
                />
                <TextField
                  label="Notas"
                  size="small"
                  value={row.notas}
                  onChange={(e) =>
                    updateRow(row.key, { notas: e.target.value })
                  }
                  sx={{ flex: '1 1 180px', minWidth: 160 }}
                />
                <IconButton
                  aria-label="Quitar ítem"
                  size="small"
                  disabled={rows.length === 1}
                  onClick={() => removeRow(row.key)}
                  sx={{ color: foto.ink.tertiary, mt: '4px' }}
                >
                  <Trash2 size={16} strokeWidth={1.8} />
                </IconButton>
              </Box>
            );
          })}
          <Button
            onClick={addRow}
            startIcon={<Plus size={16} strokeWidth={1.8} />}
            sx={{
              alignSelf: 'flex-start',
              textTransform: 'none',
              fontSize: '13px',
              color: foto.accent.deep,
            }}
          >
            Agregar ítem
          </Button>
        </Box>

        {/* ── Total + submit ── */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderRadius: '10px',
            border: `1px solid ${foto.surfaces.edge}`,
            background: foto.surfaces.inset,
          }}
        >
          <Box>
            <Box sx={labelSx}>Total</Box>
            <Typography sx={{ fontSize: '18px', fontWeight: 700 }}>
              {formatCop(total)}
            </Typography>
          </Box>
          <Button
            variant="contained"
            disabled={!canSubmit}
            onClick={handleSubmit}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              background: foto.accent.primary,
              '&:hover': { background: foto.accent.deep },
            }}
          >
            {submitting
              ? 'Guardando…'
              : mode === 'entrega'
                ? 'Registrar entrega'
                : 'Registrar devolución'}
          </Button>
        </Box>

        {/* ── Result panel ── */}
        {outcome && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '16px',
              borderRadius: '10px',
              border: `1px solid ${foto.surfaces.edge}`,
              background: foto.surfaces.panel,
            }}
          >
            <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>
              Kardex{' '}
              <Box
                component="span"
                sx={{ fontFamily: fontFamilies.mono, color: foto.accent.deep }}
              >
                {outcome.kardexEventId}
              </Box>
            </Typography>
            {outcome.ok.map((o) => (
              <Box
                key={o.itemId}
                sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <CheckCircle2
                  size={14}
                  strokeWidth={1.8}
                  color={foto.accent.primary}
                />
                <Typography
                  sx={{ fontSize: '12.5px', color: foto.ink.secondary }}
                >
                  {o.itemId} — {o.movimientoId}
                </Typography>
              </Box>
            ))}
            {outcome.failed.map((f) => (
              <Box
                key={f.itemId}
                sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <XCircle size={14} strokeWidth={1.8} color={foto.status.sold} />
                <Typography
                  sx={{ fontSize: '12.5px', color: foto.ink.secondary }}
                >
                  {f.itemId} — {f.error}
                </Typography>
              </Box>
            ))}

            {outcome.ok.length > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  mt: '4px',
                  pt: '10px',
                  borderTop: `1px solid ${foto.surfaces.edge}`,
                }}
              >
                <Button
                  size="small"
                  variant="outlined"
                  disabled={generatingPdf || !kardexEventRows?.length}
                  onClick={handleGenerateComprobante}
                  startIcon={<FileDown size={14} strokeWidth={1.8} />}
                  sx={{ textTransform: 'none', fontSize: '12.5px' }}
                >
                  {generatingPdf ? 'Generando…' : 'Generar comprobante PDF'}
                </Button>
                {comprobanteUrl && (
                  <MuiLink
                    href={comprobanteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ fontSize: '12.5px' }}
                  >
                    Ver comprobante
                  </MuiLink>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* Reprint mode: ?kardexEventId=KDX-... looks up an event that was
            registered elsewhere (e.g. directly against Convex) and offers
            the same PDF comprobante generation, without a fresh submit. */}
        {!outcome && lookupKardexEventId && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '16px',
              borderRadius: '10px',
              border: `1px solid ${foto.surfaces.edge}`,
              background: foto.surfaces.panel,
            }}
          >
            <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>
              Kardex{' '}
              <Box
                component="span"
                sx={{ fontFamily: fontFamilies.mono, color: foto.accent.deep }}
              >
                {lookupKardexEventId}
              </Box>
              {kardexEventRows && (
                <Box
                  component="span"
                  sx={{
                    ml: '8px',
                    fontSize: '12px',
                    fontWeight: 400,
                    color: foto.ink.tertiary,
                  }}
                >
                  ({kardexEventRows.length} ítem
                  {kardexEventRows.length === 1 ? '' : 's'})
                </Box>
              )}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Button
                size="small"
                variant="outlined"
                disabled={generatingPdf || !kardexEventRows?.length}
                onClick={handleGenerateComprobante}
                startIcon={<FileDown size={14} strokeWidth={1.8} />}
                sx={{ textTransform: 'none', fontSize: '12.5px' }}
              >
                {generatingPdf ? 'Generando…' : 'Generar comprobante PDF'}
              </Button>
              {comprobanteUrl && (
                <MuiLink
                  href={comprobanteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ fontSize: '12.5px' }}
                >
                  Ver comprobante
                </MuiLink>
              )}
            </Box>
          </Box>
        )}

        {/* Off-screen render target for the PDF capture — same pattern as
            VentaDetailPage's hidden kardexRef box. */}
        {activeKardexEventId && (
          <Box
            sx={{ position: 'absolute', left: '-9999px', top: 0 }}
            aria-hidden
          >
            <Box ref={previewRef}>
              <MovimientoKardexPreview
                rows={kardexRowsWithFotos}
                kardexEventId={activeKardexEventId}
              />
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
