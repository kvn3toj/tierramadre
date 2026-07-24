import { Box } from '@mui/material';
import {
  fontFamilies,
  emeraldCore,
  goldAccent,
} from '../../../../design-system';

// ─── Loose row shape ────────────────────────────────────────────────────────
// Mirrors one row returned by `asesorMovements.listByKardexEventId` (see
// convex/asesorMovements.ts). Kept structural/loose — same rationale as
// `KardexPreview`'s `KardexItem`: this preview only needs a handful of the
// fields on the full Convex document, and re-declaring the whole row shape
// here would drift the moment the schema grows.

export interface MovimientoKardexRow {
  itemId: string;
  itemNombre?: string;
  /** Already-proxied thumbnail URL for the piece (see `resolveItemThumbnail`).
   *  MUST be same-origin (`/api/serve-drive-image?fileId=…`), never a raw
   *  drive.google.com link: html2canvas taints the canvas on a cross-origin
   *  image and `captureNodeToPdf` then fails to rasterize. Optional — a row
   *  with no photo renders an empty paper well, not a broken image. */
  fotoUrl?: string;
  /** "entrega" (handoff to the asesor/comercializador) or "devolucion". */
  tipo: 'entrega' | 'devolucion';
  asesorNombre: string;
  cantidad?: number;
  /** Item price at movement time (COP). */
  precio?: number;
  /** ISO date (yyyy-mm-dd). */
  fecha: string;
  notas?: string;
  /** Shared condition text for the whole event, e.g. "Devolución
   *  obligatoria si no se vende". */
  condicion?: string;
  /** Person who physically handed over / received the item(s). */
  entregadoPorNombre?: string;
  /** Falls back for `entregadoPorNombre` when the paper record didn't name
   *  a separate handoff person — the operator who registered the movement. */
  registradoPorNombre?: string;
  kardexEventId?: string;
  movimientoId: string;
}

interface MovimientoKardexPreviewProps {
  /** Every row sharing one `kardexEventId` — one multi-item handoff/return
   *  event, mirroring one signed hoja manuscrita. Empty → "Sin ítems"
   *  placeholder. */
  rows: MovimientoKardexRow[];
  /** The event id, shown as the doc's "Carnet" identifier. Falls back to
   *  `rows[0].kardexEventId` when omitted. */
  kardexEventId?: string;
}

const PAPER_BG = '#FBF8F1';
const PAPER_INK = '#1A1714';
const PAPER_INK_SOFT = '#5A4F45';
const PAPER_INK_MUTE = '#8C7F72';
const PAPER_RULE = 'rgba(26, 23, 20, 0.12)';
const PAPER_RULE_SOFT = 'rgba(26, 23, 20, 0.06)';

/** Item table columns: thumb · nombre · cant. · precio · subtotal. One const so
 *  the header and the body rows can never drift out of alignment. */
const ITEM_GRID = '34px 1fr 60px 110px 110px';

function formatCop(value: number | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatFecha(fecha: string | undefined): string {
  if (!fecha) return '—';
  // ISO yyyy-mm-dd → dd/mm/yyyy, matching the paper record's date format.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
  if (!m) return fecha;
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
}

/**
 * "Kardex de movimientos con asesores" preview — the digital comprobante for
 * one multi-item entrega/devolución event (one `kardexEventId`, N items).
 * Pure visual — captured by `exportMovimientoKardexPdf` via html2canvas, same
 * pattern as `KardexPreview` (`captureNodeToPdf`).
 *
 * Replaces the "hoja manuscrita" paper record: date, who delivered, who
 * received, the shared condición, an item table, and a total (Σ precio — under
 * SOT v3 `precio` is the whole item's price, so it is NOT multiplied by
 * cantidad; see the lineTotals comment below).
 */
export function MovimientoKardexPreview({
  rows,
  kardexEventId,
}: MovimientoKardexPreviewProps) {
  const accent = emeraldCore.dark;
  const accentDeep = '#006B4A';
  const gold = goldAccent.primary;

  const first = rows[0];
  const tipo = first?.tipo ?? 'entrega';
  const isDevolucion = tipo === 'devolucion';
  const eventId = kardexEventId ?? first?.kardexEventId ?? '—';
  const title = isDevolucion
    ? 'Devolución de Inventario'
    : 'Entrega de Inventario';

  const entregoValue =
    first?.entregadoPorNombre || first?.registradoPorNombre || '—';
  const recibioValue = first?.asesorNombre || '—';
  const condicionValue = first?.condicion;
  const fechaValue = formatFecha(first?.fecha);

  // SOT v3: `precio` is the price of the WHOLE item (all its stones), so the
  // line subtotal IS the price — never precio × cantidad. `cantidad` is printed
  // on the comprobante as a count of pieces handed over, not as a multiplier.
  const lineTotals = rows.map((r) => {
    const cantidad =
      typeof r.cantidad === 'number' && !Number.isNaN(r.cantidad)
        ? r.cantidad
        : 1;
    const precio =
      typeof r.precio === 'number' && !Number.isNaN(r.precio) ? r.precio : 0;
    return { row: r, cantidad, subtotal: precio };
  });
  const total = lineTotals.reduce((acc, l) => acc + l.subtotal, 0);

  return (
    <Box
      component="article"
      aria-label={`Vista previa del Kardex de movimientos ${eventId}`}
      sx={{
        position: 'relative',
        background: PAPER_BG,
        borderRadius: '6px',
        padding: '32px 30px 26px',
        boxShadow:
          '0 12px 30px rgba(0, 0, 0, 0.35), 0 2px 6px rgba(0, 0, 0, 0.2)',
        color: PAPER_INK,
        fontFamily: fontFamilies.system,
        overflow: 'hidden',
      }}
    >
      {/* Top stripe */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 5,
          background: `linear-gradient(90deg, ${accent} 0%, ${gold} 50%, ${accentDeep} 100%)`,
        }}
      />

      {/* Brand band — mirrors KardexPreview / cuentas comprobante header. */}
      <Box
        sx={{
          textAlign: 'center',
          paddingBottom: '16px',
          marginBottom: '18px',
          borderBottom: `2px solid ${accent}`,
        }}
      >
        <Box
          component="img"
          src="/logo-tierra-madre.png"
          alt="Tierra Madre"
          sx={{
            height: 50,
            width: 'auto',
            objectFit: 'contain',
            display: 'inline-block',
          }}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <Box
          sx={{
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: PAPER_INK_MUTE,
            marginTop: '8px',
          }}
        >
          Esmeraldas Colombianas de Origen
        </Box>
      </Box>

      {/* Doc title + event ID */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px',
          paddingBottom: '14px',
          borderBottom: `1px solid ${PAPER_RULE}`,
        }}
      >
        <Box
          sx={{
            fontFamily: fontFamilies.serif,
            fontSize: 20,
            fontWeight: 500,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            color: PAPER_INK,
          }}
        >
          {title}
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Box
            sx={{
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: PAPER_INK_MUTE,
              marginBottom: '4px',
            }}
          >
            Evento
          </Box>
          <Box
            sx={{
              fontFamily: fontFamilies.mono,
              fontVariantNumeric: 'tabular-nums',
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: accentDeep,
              wordBreak: 'break-all',
              maxWidth: 220,
            }}
          >
            {eventId}
          </Box>
        </Box>
      </Box>

      {/* Meta: Fecha / Entregó / Recibió */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          columnGap: '24px',
          rowGap: '12px',
          paddingBottom: '16px',
          marginBottom: '16px',
          borderBottom: `1px solid ${PAPER_RULE_SOFT}`,
        }}
      >
        <SpecRow label="Fecha" value={fechaValue} mono />
        <SpecRow label="Entregó" value={entregoValue} />
        <SpecRow label="Recibió" value={recibioValue} />
      </Box>

      {/* Condición — only rendered when set, mirrors the manuscript's
          "Devolución obligatoria si no se vende" callout. */}
      {condicionValue && (
        <Box
          sx={{
            marginBottom: '18px',
            padding: '10px 14px',
            borderRadius: '4px',
            border: `1px dashed ${PAPER_RULE}`,
            background: '#EFEAE0',
            fontSize: 11.5,
            fontStyle: 'italic',
            color: PAPER_INK_SOFT,
            lineHeight: 1.4,
          }}
        >
          <Box
            component="span"
            sx={{
              fontSize: 8.5,
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: PAPER_INK_MUTE,
              fontStyle: 'normal',
              marginRight: '8px',
            }}
          >
            Condición
          </Box>
          {condicionValue}
        </Box>
      )}

      {/* Item table */}
      {rows.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 120,
            marginBottom: '22px',
            borderRadius: '4px',
            border: `1px dashed ${PAPER_RULE}`,
            background: '#EFEAE0',
            color: PAPER_INK_MUTE,
            fontStyle: 'italic',
            fontSize: 13,
            letterSpacing: '0.02em',
          }}
        >
          Sin ítems
        </Box>
      ) : (
        <Box sx={{ marginBottom: '18px' }}>
          {/* Header row */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: ITEM_GRID,
              gap: '12px',
              paddingBottom: '8px',
              borderBottom: `1px solid ${PAPER_RULE}`,
              fontSize: 8.5,
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: PAPER_INK_MUTE,
            }}
          >
            <Box />
            <Box>Ítem</Box>
            <Box sx={{ textAlign: 'right' }}>Cant.</Box>
            <Box sx={{ textAlign: 'right' }}>Precio</Box>
            <Box sx={{ textAlign: 'right' }}>Subtotal</Box>
          </Box>

          {lineTotals.map(({ row, cantidad, subtotal }, idx) => (
            <Box
              key={`${row.movimientoId || row.itemId}-${idx}`}
              sx={{
                display: 'grid',
                gridTemplateColumns: ITEM_GRID,
                gap: '12px',
                alignItems: 'center',
                paddingY: '9px',
                borderBottom: `1px solid ${PAPER_RULE_SOFT}`,
              }}
            >
              <ItemThumb fotoUrl={row.fotoUrl} />
              <Box sx={{ minWidth: 0 }}>
                <Box
                  sx={{
                    fontFamily: fontFamilies.serif,
                    fontSize: 13.5,
                    fontWeight: 500,
                    letterSpacing: '-0.01em',
                    lineHeight: 1.25,
                    color: PAPER_INK,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {row.itemNombre ?? 'Ítem sin nombre'}
                </Box>
                <Box
                  sx={{
                    fontFamily: fontFamilies.mono,
                    fontSize: 9.5,
                    color: PAPER_INK_MUTE,
                    letterSpacing: '0.02em',
                  }}
                >
                  {row.itemId}
                </Box>
              </Box>
              <Box
                sx={{
                  fontFamily: fontFamilies.mono,
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: 12,
                  color: PAPER_INK_SOFT,
                  textAlign: 'right',
                }}
              >
                {cantidad}
              </Box>
              <Box
                sx={{
                  fontFamily: fontFamilies.mono,
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: 12,
                  color: PAPER_INK_SOFT,
                  textAlign: 'right',
                }}
              >
                {formatCop(row.precio)}
              </Box>
              <Box
                sx={{
                  fontFamily: fontFamilies.mono,
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: PAPER_INK,
                  textAlign: 'right',
                }}
              >
                {formatCop(subtotal)}
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* Total */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          paddingTop: '6px',
          paddingBottom: '16px',
          marginBottom: '6px',
        }}
      >
        <Box
          sx={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: accentDeep,
          }}
        >
          {isDevolucion ? 'Total devuelto' : 'Total entregado'}
        </Box>
        <Box
          sx={{
            fontFamily: fontFamilies.mono,
            fontVariantNumeric: 'tabular-nums',
            fontSize: 19,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: accentDeep,
          }}
        >
          {formatCop(total)}
        </Box>
      </Box>

      {/* Cert footer: text + seal + QR placeholder — mirrors KardexPreview. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto',
          gap: '18px',
          alignItems: 'center',
          paddingTop: '16px',
          borderTop: `1px solid ${PAPER_RULE}`,
        }}
      >
        <Box
          sx={{
            fontSize: 10,
            lineHeight: 1.5,
            color: PAPER_INK_SOFT,
            fontStyle: 'italic',
          }}
        >
          Este comprobante certifica el movimiento de inventario referenciado
          entre Tierra Madre y el asesor/comercializador indicado. Trazabilidad
          completa disponible bajo solicitud al equipo Tierra Madre.
        </Box>

        {/* Circular seal */}
        <Box
          aria-hidden
          sx={{
            width: 58,
            height: 58,
            borderRadius: '50%',
            border: `1.5px solid ${accent}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: accentDeep,
            fontFamily: fontFamilies.serif,
            background: 'rgba(0, 140, 98, 0.04)',
          }}
        >
          <Box sx={{ fontSize: 8, letterSpacing: '0.22em', fontWeight: 600 }}>
            TM
          </Box>
          <Box
            sx={{
              fontFamily: fontFamilies.mono,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '-0.01em',
            }}
          >
            2026
          </Box>
        </Box>

        {/* QR placeholder (grid pattern, not a real QR). */}
        <Box
          aria-hidden
          sx={{
            width: 58,
            height: 58,
            borderRadius: '4px',
            background: `
              repeating-linear-gradient(0deg, ${PAPER_INK} 0 2px, transparent 2px 6px),
              repeating-linear-gradient(90deg, ${PAPER_INK} 0 2px, transparent 2px 6px)
            `,
            opacity: 0.18,
            border: `1px solid ${PAPER_RULE}`,
          }}
        />
      </Box>

      {/* Diamond flourish — the recibo's signature closing mark. */}
      <Box
        aria-hidden
        sx={{
          marginTop: '18px',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            background: accent,
            transform: 'rotate(45deg)',
          }}
        />
      </Box>
    </Box>
  );
}

/**
 * Per-row photo well. Mirrors `KardexPreview`'s sale-carnet thumbnail: fixed
 * square, `aspectRatio` reserved so the paper never reflows once the image
 * decodes, and `crossOrigin="anonymous"` because html2canvas taints the canvas
 * otherwise and `captureNodeToPdf` fails.
 *
 * No photo → an empty well, not a gap: the recipient signs a receipt whose
 * every line looks deliberate, and a missing photo reads as "sin foto", not as
 * a broken document.
 */
function ItemThumb({ fotoUrl }: { fotoUrl?: string }) {
  return (
    <Box
      sx={{
        width: 34,
        height: 34,
        aspectRatio: '1 / 1',
        borderRadius: '3px',
        background: '#EFEAE0',
        border: `1px solid ${PAPER_RULE}`,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {fotoUrl ? (
        <Box
          component="img"
          src={fotoUrl}
          alt=""
          crossOrigin="anonymous"
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : null}
    </Box>
  );
}

interface SpecRowProps {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

function SpecRow({ label, value, mono = false }: SpecRowProps) {
  return (
    <Box>
      <Box
        sx={{
          fontSize: 8.5,
          fontWeight: 500,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: PAPER_INK_MUTE,
          marginBottom: '3px',
        }}
      >
        {label}
      </Box>
      <Box
        sx={{
          fontFamily: mono ? fontFamilies.mono : fontFamilies.system,
          fontVariantNumeric: mono ? 'tabular-nums' : undefined,
          fontSize: 12.5,
          fontWeight: 500,
          color: PAPER_INK,
          letterSpacing: mono ? '-0.005em' : 'normal',
          lineHeight: 1.3,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </Box>
    </Box>
  );
}

export default MovimientoKardexPreview;
