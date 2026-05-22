import { Box } from "@mui/material";
import {
  fontFamilies,
  emeraldCore,
  goldAccent,
} from "../../../../design-system";

// ─── Loose props ────────────────────────────────────────────────────────────
// We intentionally keep these shapes lightweight — the Kardex consumes data
// from several Convex queries (products.get, lots.getByLoteId, providers.get,
// clients.get, sales.peekNextSaleId) that each return their own typed shape.
// Rather than re-declare every field, we accept structural minimums.

export interface KardexItem {
  itemId: string;
  nombre?: string;
  color?: string;
  calidad?: string;
  peso?: string;
  medidas?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
}

export interface KardexLot {
  loteId?: string;
  fechaRecepcion?: string;
}

export interface KardexProvider {
  nombreORazonSocial?: string;
}

export interface KardexBuyer {
  nombre?: string;
  nit?: string;
  cedula?: string;
  email?: string;
  tipo?: "embajador" | "final";
}

export interface KardexSale {
  /** "V-0043" — preview from peekNextSaleId or persisted from sales row. */
  id: string;
  precioCop?: number;
  /** "contado" | "esmereogenesis" | "credito" */
  formaPago?: string;
  metodoContado?: string;
}

interface KardexPreviewProps {
  item: KardexItem | null | undefined;
  lot: KardexLot | null | undefined;
  provider: KardexProvider | null | undefined;
  buyer: KardexBuyer | null | undefined;
  sale: KardexSale;
  privacyOn: boolean;
}

const PAPER_BG = "#FBF8F1";
const PAPER_INK = "#1A1714";
const PAPER_INK_SOFT = "#5A4F45";
const PAPER_INK_MUTE = "#8C7F72";
const PAPER_RULE = "rgba(26, 23, 20, 0.12)";
const PAPER_RULE_SOFT = "rgba(26, 23, 20, 0.06)";

function formatCop(value: number | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPago(formaPago?: string, metodoContado?: string): string {
  if (!formaPago) return "—";
  if (formaPago === "contado") {
    return metodoContado ? `Contado · ${metodoContado}` : "Contado";
  }
  if (formaPago === "esmereogenesis") return "Esmereogénesis";
  if (formaPago === "credito") return "Crédito";
  return formaPago;
}

function buyerLabel(buyer: KardexBuyer | null | undefined): string {
  if (!buyer) return "—";
  const id = buyer.nit ?? buyer.cedula;
  if (id) return `${buyer.nombre ?? "—"} · ${id}`;
  return buyer.nombre ?? "—";
}

/**
 * Editorial "carnet" preview for the sale. Pure visual — captured by
 * html2canvas via `exportCarnet`. Lives on the dark sale-page right pane.
 *
 * When `privacyOn`, the buyer ID row swaps to a muted "oculta en versión
 * pública" placeholder. Slice 1 PDF still includes the full version.
 * (Handoff §4.6.1)
 */
export function KardexPreview({
  item,
  lot,
  provider,
  buyer,
  sale,
  privacyOn,
}: KardexPreviewProps) {
  const accent = emeraldCore.dark;
  const accentDeep = "#006B4A";
  const gold = goldAccent.primary;

  const photoUrl = item?.thumbnailUrl ?? item?.imageUrl;

  return (
    <Box
      component="article"
      aria-label={`Vista previa del Kardex ${sale.id}`}
      sx={{
        position: "relative",
        background: PAPER_BG,
        borderRadius: "6px",
        padding: "32px 30px 26px",
        boxShadow:
          "0 12px 30px rgba(0, 0, 0, 0.35), 0 2px 6px rgba(0, 0, 0, 0.2)",
        color: PAPER_INK,
        fontFamily: fontFamilies.system,
        overflow: "hidden",
      }}
    >
      {/* Top stripe */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 5,
          background: `linear-gradient(90deg, ${accent} 0%, ${gold} 50%, ${accentDeep} 100%)`,
        }}
      />

      {/* Head: brand TM + carnet ID */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "16px",
          marginBottom: "20px",
          paddingBottom: "14px",
          borderBottom: `1px solid ${PAPER_RULE}`,
        }}
      >
        <Box>
          <Box
            sx={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: PAPER_INK_MUTE,
              marginBottom: "6px",
            }}
          >
            Tierra Madre
          </Box>
          <Box
            sx={{
              fontFamily: fontFamilies.serif,
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              color: PAPER_INK,
            }}
          >
            Kardex de venta
          </Box>
        </Box>
        <Box sx={{ textAlign: "right" }}>
          <Box
            sx={{
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: PAPER_INK_MUTE,
              marginBottom: "4px",
            }}
          >
            Carnet
          </Box>
          <Box
            sx={{
              fontFamily: fontFamilies.mono,
              fontVariantNumeric: "tabular-nums",
              fontSize: 20,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: PAPER_INK,
            }}
          >
            {sale.id}
          </Box>
        </Box>
      </Box>

      {/* Product block */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "108px 1fr",
          gap: "18px",
          alignItems: "center",
          marginBottom: "22px",
        }}
      >
        <Box
          sx={{
            width: 108,
            height: 108,
            borderRadius: "4px",
            background: "#EFEAE0",
            border: `1px solid ${PAPER_RULE}`,
            overflow: "hidden",
            position: "relative",
            aspectRatio: "1 / 1",
          }}
        >
          {photoUrl ? (
            <Box
              component="img"
              src={photoUrl}
              alt=""
              crossOrigin="anonymous"
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <Box
              aria-hidden
              sx={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: PAPER_INK_MUTE,
                fontFamily: fontFamilies.mono,
                fontSize: 11,
                letterSpacing: "0.18em",
              }}
            >
              {item?.itemId ?? "—"}
            </Box>
          )}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Box
            sx={{
              fontFamily: fontFamilies.serif,
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              color: PAPER_INK,
              marginBottom: "6px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item?.nombre ?? "Ítem sin nombre"}
          </Box>
          <Box
            sx={{
              fontSize: 12,
              color: PAPER_INK_SOFT,
              letterSpacing: "0.01em",
            }}
          >
            {[item?.color, item?.calidad].filter(Boolean).join(" · ") || "—"}
          </Box>
        </Box>
      </Box>

      {/* Specs grid (2-col, 8 specs) */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          rowGap: "12px",
          columnGap: "24px",
          paddingTop: "16px",
          paddingBottom: "16px",
          borderTop: `1px solid ${PAPER_RULE_SOFT}`,
          borderBottom: `1px solid ${PAPER_RULE_SOFT}`,
        }}
      >
        <SpecRow label="Peso" value={item?.peso ?? "—"} />
        <SpecRow label="Calidad" value={item?.calidad ?? "—"} />
        <SpecRow label="Color" value={item?.color ?? "—"} />
        <SpecRow label="Medidas" value={item?.medidas ?? "—"} />
        <SpecRow
          label="Comprador"
          value={
            privacyOn ? (
              <Box
                component="span"
                sx={{
                  fontStyle: "italic",
                  color: PAPER_INK_MUTE,
                  letterSpacing: "0.01em",
                }}
              >
                — oculta en versión pública —
              </Box>
            ) : (
              buyerLabel(buyer)
            )
          }
        />
        <SpecRow label="ID interno" value={item?.itemId ?? "—"} mono />
        <SpecRow
          label="Precio"
          value={formatCop(sale.precioCop)}
          mono
          emphasis
        />
        <SpecRow
          label="Forma de pago"
          value={formatPago(sale.formaPago, sale.metodoContado)}
        />
      </Box>

      {/* Lineage footer (provider + lot) */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          marginTop: "14px",
          marginBottom: "20px",
          fontSize: 11,
          color: PAPER_INK_SOFT,
          letterSpacing: "0.01em",
        }}
      >
        <Box>
          <Box
            sx={{
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: PAPER_INK_MUTE,
              marginBottom: "2px",
            }}
          >
            Origen
          </Box>
          {provider?.nombreORazonSocial ?? "Tierra Madre"}
        </Box>
        <Box sx={{ textAlign: "right" }}>
          <Box
            sx={{
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: PAPER_INK_MUTE,
              marginBottom: "2px",
            }}
          >
            Lote
          </Box>
          <Box
            component="span"
            sx={{
              fontFamily: fontFamilies.mono,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {lot?.loteId ?? "—"}
          </Box>
        </Box>
      </Box>

      {/* Cert footer: text + seal + QR placeholder */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr auto auto",
          gap: "18px",
          alignItems: "center",
          paddingTop: "16px",
          borderTop: `1px solid ${PAPER_RULE}`,
        }}
      >
        <Box
          sx={{
            fontSize: 10,
            lineHeight: 1.5,
            color: PAPER_INK_SOFT,
            fontStyle: "italic",
          }}
        >
          Este Kardex certifica la procedencia y autenticidad del ítem
          referenciado. Trazabilidad completa disponible bajo solicitud al
          equipo Tierra Madre.
        </Box>

        {/* Circular seal */}
        <Box
          aria-hidden
          sx={{
            width: 58,
            height: 58,
            borderRadius: "50%",
            border: `1.5px solid ${accent}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: accentDeep,
            fontFamily: fontFamilies.serif,
            background: "rgba(0, 140, 98, 0.04)",
          }}
        >
          <Box sx={{ fontSize: 8, letterSpacing: "0.22em", fontWeight: 600 }}>
            TM
          </Box>
          <Box
            sx={{
              fontFamily: fontFamilies.mono,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "-0.01em",
            }}
          >
            2026
          </Box>
        </Box>

        {/* QR placeholder (grid pattern, not a real QR — Slice 3) */}
        <Box
          aria-hidden
          sx={{
            width: 58,
            height: 58,
            borderRadius: "4px",
            background: `
              repeating-linear-gradient(0deg, ${PAPER_INK} 0 2px, transparent 2px 6px),
              repeating-linear-gradient(90deg, ${PAPER_INK} 0 2px, transparent 2px 6px)
            `,
            opacity: 0.18,
            border: `1px solid ${PAPER_RULE}`,
          }}
        />
      </Box>
    </Box>
  );
}

interface SpecRowProps {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  emphasis?: boolean;
}

function SpecRow({
  label,
  value,
  mono = false,
  emphasis = false,
}: SpecRowProps) {
  return (
    <Box>
      <Box
        sx={{
          fontSize: 8.5,
          fontWeight: 500,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: PAPER_INK_MUTE,
          marginBottom: "3px",
        }}
      >
        {label}
      </Box>
      <Box
        sx={{
          fontFamily: mono ? fontFamilies.mono : fontFamilies.system,
          fontVariantNumeric: mono ? "tabular-nums" : undefined,
          fontSize: emphasis ? 14 : 12.5,
          fontWeight: emphasis ? 600 : 500,
          color: PAPER_INK,
          letterSpacing: mono ? "-0.005em" : "normal",
          lineHeight: 1.3,
        }}
      >
        {value}
      </Box>
    </Box>
  );
}

export default KardexPreview;
