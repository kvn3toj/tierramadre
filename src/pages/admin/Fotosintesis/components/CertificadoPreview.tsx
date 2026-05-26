// Cert always renders the buyer's FULL identification — the privacy toggle on
// the Kardex does not apply here; certificates are formal documents of record.

import { Box } from "@mui/material";
import {
  fontFamilies,
  emeraldCore,
  goldAccent,
} from "../../../../design-system";
import { isCertificadoApproved } from "../exportCertificado";
import type {
  KardexBuyer,
  KardexItem,
  KardexLot,
  KardexProvider,
  KardexSale,
} from "./KardexPreview";

interface CertificadoPreviewProps {
  item: KardexItem | null | undefined;
  lot: KardexLot | null | undefined;
  provider: KardexProvider | null | undefined;
  buyer: KardexBuyer | null | undefined;
  sale: KardexSale;
}

const PAPER_BG = "#FBF8F1";
const PAPER_INK = "#1A1714";
const PAPER_INK_SOFT = "#5A4F45";
const PAPER_INK_MUTE = "#8C7F72";
const PAPER_RULE = "rgba(26, 23, 20, 0.12)";
const PAPER_RULE_SOFT = "rgba(26, 23, 20, 0.06)";

function buyerLabel(buyer: KardexBuyer | null | undefined): string {
  if (!buyer) return "—";
  const id = buyer.nit ?? buyer.cedula;
  if (id) return `${buyer.nombre ?? "—"} · ${id}`;
  return buyer.nombre ?? "—";
}

/**
 * Editorial certificado de origen preview. Layout follows handoff §4.6.1:
 *  - Top stripe + brand head + cert ID
 *  - Product photo + name + procedencia
 *  - Specs grid (8 fields, full buyer identification)
 *  - Procedencia block (provider, lote, fecha)
 *  - Legal copy block (Q-6 — gated via VITE_CERT_LEGAL_APPROVED)
 *  - Footer: seal · QR · signature line
 */
export function CertificadoPreview({
  item,
  lot,
  provider,
  buyer,
  sale,
}: CertificadoPreviewProps) {
  const accent = emeraldCore.dark;
  const accentDeep = "#006B4A";
  const gold = goldAccent.primary;
  const approved = isCertificadoApproved();
  const photoUrl = item?.thumbnailUrl ?? item?.imageUrl;

  return (
    <Box
      component="article"
      aria-label={`Vista previa del Certificado ${sale.id}`}
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

      {/* Head */}
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
            Certificado de Origen
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
            Folio
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

      {/* Specs grid — full buyer ID always */}
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
        <SpecRow label="Beneficiario" value={buyerLabel(buyer)} />
        <SpecRow label="ID interno" value={item?.itemId ?? "—"} mono />
        <SpecRow label="Origen" value={provider?.nombreORazonSocial ?? "—"} />
        <SpecRow label="Lote" value={lot?.loteId ?? "—"} mono />
      </Box>

      {/* Legal copy block */}
      <Box
        sx={{
          marginTop: "18px",
          padding: "16px 18px",
          background: approved ? "transparent" : "rgba(212, 175, 55, 0.08)",
          border: approved
            ? `1px solid ${PAPER_RULE_SOFT}`
            : `1px dashed ${goldAccent.dark}`,
          borderRadius: "5px",
        }}
      >
        {approved ? (
          <Box
            sx={{
              fontSize: 11,
              lineHeight: 1.6,
              color: PAPER_INK_SOFT,
              fontStyle: "italic",
              whiteSpace: "pre-line",
            }}
          >
            {
              // Approved legal copy lives in `VITE_CERT_LEGAL_COPY` (multi-line
              // string). Falls back to a single-line placeholder if the build
              // somehow approved the flag without populating the copy.
              import.meta.env.VITE_CERT_LEGAL_COPY ??
                "Texto legal pendiente de carga — VITE_CERT_LEGAL_COPY no fue configurado."
            }
          </Box>
        ) : (
          <>
            <Box
              sx={{
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: goldAccent.dark,
                marginBottom: "6px",
              }}
            >
              Q-6 · Pendiente
            </Box>
            <Box
              sx={{
                fontSize: 11,
                lineHeight: 1.55,
                color: PAPER_INK_SOFT,
              }}
            >
              La copia legal del Certificado de Origen aún no fue aprobada por
              Maritza / asesoría jurídica. La descarga queda bloqueada hasta que
              se active <code>VITE_CERT_LEGAL_APPROVED=true</code>.
            </Box>
          </>
        )}
      </Box>

      {/* Footer: seal + QR + signature line */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr auto auto",
          gap: "18px",
          alignItems: "center",
          paddingTop: "20px",
          marginTop: "20px",
          borderTop: `1px solid ${PAPER_RULE}`,
        }}
      >
        <Box>
          <Box
            sx={{
              borderTop: `1px solid ${PAPER_INK_SOFT}`,
              paddingTop: "6px",
              fontSize: 10,
              color: PAPER_INK_SOFT,
              letterSpacing: "0.04em",
            }}
          >
            Firma · Tierra Madre Studio
          </Box>
        </Box>

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
}

function SpecRow({ label, value, mono = false }: SpecRowProps) {
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
          fontSize: 12.5,
          fontWeight: 500,
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

export default CertificadoPreview;
