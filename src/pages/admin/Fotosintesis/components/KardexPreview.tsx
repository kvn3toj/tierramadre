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

/** A sale line item: a {@link KardexItem} plus the tier-resolved price (COP)
 *  it contributes to the sale. Resolved upstream via `pickTierPrice`. */
export interface KardexLineItem extends KardexItem {
  precioCop?: number;
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
  // Canonical embajador | final; free text to accept a custom buyer write-in.
  tipo?: string;
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
  /** Ordered sale line items. Empty → "Sin ítems" placeholder; one → premium
   *  single layout; many → compact line-item list + totals. */
  items: KardexLineItem[];
  lot: KardexLot | null | undefined;
  provider: KardexProvider | null | undefined;
  buyer: KardexBuyer | null | undefined;
  sale: KardexSale;
  privacyOn: boolean;
  /** Σ per-item tier prices. Falls back to the local sum when omitted. */
  subtotalCop?: number;
  /** max(0, subtotal − total); a Descuento line renders only when > 0. */
  descuentoCop?: number;
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
  if (formaPago === "bajo_pedido") return "Bajo pedido";
  if (formaPago === "consignacion") return "Consignación";
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
 * Adapts to the line-item count:
 *   • 0 items  → a muted "Sin ítems" placeholder where the product block was.
 *   • 1 item   → the premium single layout (108px photo + 2-col specs grid).
 *   • >1 items → a compact line-item list, a meta block (Comprador / Forma de
 *                pago) and a "Resumen de montos" totals block (Subtotal,
 *                optional Descuento, emphasized Total).
 *
 * When `privacyOn`, the buyer label swaps to a muted "oculta en versión
 * pública" placeholder. Slice 1 PDF still includes the full version.
 * (Handoff §4.6.1)
 */
export function KardexPreview({
  items,
  lot,
  provider,
  buyer,
  sale,
  privacyOn,
  subtotalCop,
  descuentoCop,
}: KardexPreviewProps) {
  const accent = emeraldCore.dark;
  const accentDeep = "#006B4A";
  const gold = goldAccent.primary;

  const count = items.length;
  const single = count === 1 ? items[0] : null;
  const photoUrl = single?.thumbnailUrl ?? single?.imageUrl;

  // Totals (multi-item). Subtotal falls back to the local sum so a value always
  // renders even if the caller omits it. Descuento shows only when positive.
  const localSum = items.reduce(
    (acc, it) =>
      acc +
      (typeof it.precioCop === "number" && !Number.isNaN(it.precioCop)
        ? it.precioCop
        : 0),
    0,
  );
  const subtotal =
    typeof subtotalCop === "number" && !Number.isNaN(subtotalCop)
      ? subtotalCop
      : localSum;
  const descuento =
    typeof descuentoCop === "number" && !Number.isNaN(descuentoCop)
      ? descuentoCop
      : 0;

  const compradorValue = privacyOn ? (
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
  );

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

      {/* ── Body: 0 / 1 / many ─────────────────────────────────────────── */}
      {count === 0 ? (
        /* Empty placeholder where the product block would be */
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 120,
            marginBottom: "22px",
            borderRadius: "4px",
            border: `1px dashed ${PAPER_RULE}`,
            background: "#EFEAE0",
            color: PAPER_INK_MUTE,
            fontStyle: "italic",
            fontSize: 13,
            letterSpacing: "0.02em",
          }}
        >
          Sin ítems
        </Box>
      ) : single ? (
        /* ── Single item: premium layout ─────────────────────────────── */
        <>
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
                  {single.itemId ?? "—"}
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
                {single.nombre ?? "Ítem sin nombre"}
              </Box>
              <Box
                sx={{
                  fontSize: 12,
                  color: PAPER_INK_SOFT,
                  letterSpacing: "0.01em",
                }}
              >
                {[single.color, single.calidad].filter(Boolean).join(" · ") ||
                  "—"}
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
            <SpecRow label="Peso" value={single.peso ?? "—"} />
            <SpecRow label="Calidad" value={single.calidad ?? "—"} />
            <SpecRow label="Color" value={single.color ?? "—"} />
            <SpecRow label="Medidas" value={single.medidas ?? "—"} />
            <SpecRow label="Comprador" value={compradorValue} />
            <SpecRow label="ID interno" value={single.itemId ?? "—"} mono />
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
        </>
      ) : (
        /* ── Multiple items: line-item list + meta + totals ──────────── */
        <>
          {/* (a) Line-item list */}
          <Box
            sx={{
              paddingTop: "4px",
              borderTop: `1px solid ${PAPER_RULE_SOFT}`,
              marginBottom: "18px",
            }}
          >
            {items.map((it, idx) => {
              const thumb = it.thumbnailUrl ?? it.imageUrl;
              const specs = [it.color, it.calidad, it.peso, it.medidas]
                .filter(Boolean)
                .join(" · ");
              return (
                <Box
                  key={`${it.itemId}-${idx}`}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    paddingY: "10px",
                    borderBottom: `1px solid ${PAPER_RULE_SOFT}`,
                  }}
                >
                  {/* Thumbnail */}
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      flexShrink: 0,
                      borderRadius: "3px",
                      background: "#EFEAE0",
                      border: `1px solid ${PAPER_RULE}`,
                      overflow: "hidden",
                      position: "relative",
                      aspectRatio: "1 / 1",
                    }}
                  >
                    {thumb ? (
                      <Box
                        component="img"
                        src={thumb}
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
                          fontSize: 8.5,
                          letterSpacing: "0.1em",
                          textAlign: "center",
                          padding: "2px",
                          overflow: "hidden",
                        }}
                      >
                        {it.itemId ?? "—"}
                      </Box>
                    )}
                  </Box>

                  {/* Name + specs */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box
                      sx={{
                        fontFamily: fontFamilies.serif,
                        fontSize: 14.5,
                        fontWeight: 500,
                        letterSpacing: "-0.01em",
                        lineHeight: 1.25,
                        color: PAPER_INK,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {it.nombre ?? "Ítem sin nombre"}
                    </Box>
                    <Box
                      sx={{
                        fontSize: 10.5,
                        color: PAPER_INK_SOFT,
                        letterSpacing: "0.01em",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        marginTop: "2px",
                      }}
                    >
                      {specs || "—"}
                    </Box>
                  </Box>

                  {/* Per-item price */}
                  <Box
                    sx={{
                      flexShrink: 0,
                      fontFamily: fontFamilies.mono,
                      fontVariantNumeric: "tabular-nums",
                      fontSize: 12.5,
                      fontWeight: 500,
                      letterSpacing: "-0.005em",
                      color: PAPER_INK,
                      textAlign: "right",
                    }}
                  >
                    {formatCop(it.precioCop)}
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* (b) Meta: Comprador + Forma de pago */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              columnGap: "24px",
              rowGap: "12px",
              paddingBottom: "16px",
            }}
          >
            <SpecRow label="Comprador" value={compradorValue} />
            <SpecRow
              label="Forma de pago"
              value={formatPago(sale.formaPago, sale.metodoContado)}
            />
          </Box>

          {/* (c) Totals — "Resumen de montos" in the paper palette */}
          <Box
            sx={{
              paddingTop: "14px",
              paddingBottom: "4px",
              borderTop: `1px solid ${PAPER_RULE_SOFT}`,
              marginBottom: "6px",
            }}
          >
            <Box
              sx={{
                fontSize: 8.5,
                fontWeight: 500,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: PAPER_INK_MUTE,
                marginBottom: "10px",
              }}
            >
              Resumen de montos
            </Box>

            {/* Subtotal */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: descuento > 0 ? "6px" : "0",
              }}
            >
              <Box sx={{ fontSize: 12, color: PAPER_INK_SOFT }}>Subtotal</Box>
              <Box
                sx={{
                  fontFamily: fontFamilies.mono,
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 12.5,
                  fontWeight: 500,
                  letterSpacing: "-0.005em",
                  color: PAPER_INK,
                }}
              >
                {formatCop(subtotal)}
              </Box>
            </Box>

            {/* Descuento (only when positive) */}
            {descuento > 0 && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <Box sx={{ fontSize: 12, color: PAPER_INK_SOFT }}>
                  Descuento
                </Box>
                <Box
                  sx={{
                    fontFamily: fontFamilies.mono,
                    fontVariantNumeric: "tabular-nums",
                    fontSize: 12.5,
                    fontWeight: 500,
                    letterSpacing: "-0.005em",
                    color: PAPER_INK_SOFT,
                  }}
                >
                  −{formatCop(descuento)}
                </Box>
              </Box>
            )}

            {/* Divider */}
            <Box
              aria-hidden
              sx={{
                height: "1px",
                background: PAPER_RULE,
                marginTop: "12px",
                marginBottom: "12px",
              }}
            />

            {/* Total — emphasized */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <Box
                sx={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: accentDeep,
                }}
              >
                Total
              </Box>
              <Box
                sx={{
                  fontFamily: fontFamilies.mono,
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 19,
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  color: accentDeep,
                }}
              >
                {formatCop(sale.precioCop)}
              </Box>
            </Box>
          </Box>
        </>
      )}

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
