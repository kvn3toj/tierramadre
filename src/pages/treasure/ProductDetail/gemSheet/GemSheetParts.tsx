/**
 * Quiet Emerald gem-sheet parts (DetailNew.dc.html).
 *
 * Focused presentational pieces for the redesigned product detail: Fórmula
 * panel, three spec groups (Identidad / Gema / Procedencia), Rareza + Calificación
 * stat cards, Minerales / Complementos pill chips, Relato, trust card, the literal
 * hero gallery (image well + accent pips + 46×46 thumbs), and the bottom price+CTA
 * bar. Each reads real product fields and self-hides what is absent.
 */
import React, { useState } from "react";
import { Box, Typography, ButtonBase } from "@mui/material";
import { ArrowRight } from "lucide-react";
import { useThemeMode } from "../../../../contexts/ThemeContext";
import { useCurrency } from "../../../../contexts/CurrencyContext";
import { getQuietEmerald, qeFont } from "../../../../design-system";
import { formatCarats } from "../../../../utils/formatting";
import type { TreasureItem } from "../../../../types";
import type { MediaItem } from "../../../../components/media/types";

const RAREZA_LABELS = [
  "",
  "Base",
  "Buena",
  "Notable",
  "Excepcional",
  "Legendaria",
];

// ---- shared atoms ---------------------------------------------------------

const Eyebrow: React.FC<{ children: React.ReactNode; color: string }> = ({
  children,
  color,
}) => (
  <Typography
    sx={{
      fontFamily: qeFont.mono,
      fontSize: 9,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color,
    }}
  >
    {children}
  </Typography>
);

// ---- Fórmula Tierra Madre panel ------------------------------------------

export const FormulaPanel: React.FC<{ product: TreasureItem }> = ({
  product,
}) => {
  const { mode } = useThemeMode();
  const qe = getQuietEmerald(mode);
  const line = [product.procedencia || product.mina, product.tipoEsmeralda]
    .filter(Boolean)
    .join(" · ");
  if (!line) return null;
  return (
    <Box
      sx={{
        mt: "14px",
        p: "12px 14px",
        borderRadius: "8px",
        bgcolor: qe.well,
      }}
    >
      <Eyebrow color={qe.subtle}>Fórmula Tierra Madre</Eyebrow>
      <Typography
        sx={{
          fontFamily: qeFont.serif,
          fontStyle: "italic",
          fontSize: 17,
          mt: "5px",
          lineHeight: 1.25,
          color: qe.text,
        }}
      >
        {line}
      </Typography>
    </Box>
  );
};

// ---- Spec groups (Identidad / Gema / Procedencia) -------------------------

interface Row {
  k: string;
  v: React.ReactNode;
}

const SpecGroup: React.FC<{ title: string; rows: Row[] }> = ({
  title,
  rows,
}) => {
  const { mode } = useThemeMode();
  const qe = getQuietEmerald(mode);
  const present = rows.filter(
    (r) => r.v !== undefined && r.v !== null && r.v !== "",
  );
  if (present.length === 0) return null;
  return (
    <Box sx={{ mt: "16px" }}>
      <Box sx={{ mb: "2px" }}>
        <Eyebrow color={qe.accent}>{title}</Eyebrow>
      </Box>
      {present.map((r) => (
        <Box
          key={r.k}
          sx={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: "12px",
            py: "8px",
            borderTop: `1px solid ${qe.hairline}`,
          }}
        >
          <Typography
            sx={{
              flex: "none",
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: qe.subtle,
              fontFamily: qeFont.ui,
            }}
          >
            {r.k}
          </Typography>
          <Typography
            sx={{
              textAlign: "right",
              fontSize: 12.5,
              color: qe.text,
              fontWeight: 500,
              fontFamily: qeFont.ui,
            }}
          >
            {r.v}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

export const SpecGroups: React.FC<{ product: TreasureItem }> = ({
  product: p,
}) => {
  const peso =
    typeof p.peso === "number" ? `${formatCarats(p.peso)} ct` : undefined;
  const identidad: Row[] = [
    { k: "Pieza", v: p.isJewelry ? p.tipoJoya || "Joya" : "Esmeralda natural" },
    {
      k: "Categoría",
      v: p.categoria || (p.isJewelry ? "Joyería" : "Gema suelta"),
    },
    { k: "Colección", v: p.coleccion },
    {
      k: "Cantidad",
      v: `${p.cantidad} ${p.cantidad === 1 ? "unidad" : "unidades"}`,
    },
  ];
  const gema: Row[] = [
    { k: "Peso", v: peso },
    { k: "Color", v: p.color },
    { k: "Calidad", v: p.calidad },
    { k: "Talla", v: p.talla },
    { k: "Tipo", v: p.isJewelry ? p.metalType : p.tipoEsmeralda },
    { k: "Medidas", v: p.medidas },
  ];
  const procedencia: Row[] = [
    { k: "Origen", v: p.procedencia },
    { k: "Mina", v: p.mina },
    { k: "País", v: p.procedencia || p.mina ? "Colombia" : undefined },
  ];
  return (
    <Box>
      <SpecGroup title="Identidad" rows={identidad} />
      <SpecGroup title="Gema" rows={gema} />
      <SpecGroup title="Procedencia" rows={procedencia} />
    </Box>
  );
};

// ---- Rareza dots + Calificación stat cards --------------------------------

export const GemStats: React.FC<{ product: TreasureItem }> = ({
  product: p,
}) => {
  const { mode } = useThemeMode();
  const qe = getQuietEmerald(mode);
  const hasRareza = typeof p.nivelRareza === "number" && p.nivelRareza > 0;
  const hasCalif = typeof p.calificacion === "number" && p.calificacion > 0;
  if (!hasRareza && !hasCalif) return null;

  const card = {
    flex: 1,
    p: "11px 12px",
    borderRadius: "8px",
    bgcolor: qe.well,
  } as const;

  return (
    <Box sx={{ mt: "18px", display: "flex", gap: "10px" }}>
      {hasRareza && (
        <Box sx={card}>
          <Eyebrow color={qe.subtle}>Rareza</Eyebrow>
          <Box sx={{ display: "flex", gap: "5px", mt: "9px" }}>
            {[1, 2, 3, 4, 5].map((i) => {
              const on = i <= (p.nivelRareza ?? 0);
              return (
                <Box
                  key={i}
                  sx={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    bgcolor: on ? qe.accent : "transparent",
                    border: `1px solid ${on ? qe.accent : qe.border}`,
                  }}
                />
              );
            })}
          </Box>
          <Typography
            sx={{
              fontSize: 10.5,
              color: qe.muted,
              mt: "8px",
              fontFamily: qeFont.ui,
            }}
          >
            Nivel {p.nivelRareza} · {RAREZA_LABELS[p.nivelRareza ?? 0] || "—"}
          </Typography>
        </Box>
      )}
      {hasCalif && (
        <Box sx={card}>
          <Eyebrow color={qe.subtle}>Calificación</Eyebrow>
          <Typography
            sx={{
              fontFamily: qeFont.serif,
              fontSize: 30,
              lineHeight: 1,
              fontWeight: 500,
              mt: "5px",
              color: qe.text,
            }}
          >
            {p.calificacion}
            <Box component="span" sx={{ fontSize: 14, color: qe.subtle }}>
              {" "}
              / 10
            </Box>
          </Typography>
          <Typography
            sx={{
              fontSize: 10.5,
              color: qe.muted,
              mt: "5px",
              fontFamily: qeFont.ui,
            }}
          >
            Gemología TM
          </Typography>
        </Box>
      )}
    </Box>
  );
};

// ---- Pill chips (minerales / complementos) --------------------------------

const PillRow: React.FC<{ title: string; items: string[] }> = ({
  title,
  items,
}) => {
  const { mode } = useThemeMode();
  const qe = getQuietEmerald(mode);
  if (!items || items.length === 0) return null;
  return (
    <Box sx={{ mt: "16px" }}>
      <Box sx={{ mb: "9px" }}>
        <Eyebrow color={qe.accent}>{title}</Eyebrow>
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
        {items.map((it) => (
          <Box
            key={it}
            sx={{
              px: "11px",
              py: "5px",
              borderRadius: "999px",
              border: `1px solid ${qe.border}`,
              fontSize: 11,
              color: qe.muted,
              fontFamily: qeFont.ui,
            }}
          >
            {it}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export const GemPills: React.FC<{ product: TreasureItem }> = ({
  product: p,
}) => (
  <>
    <PillRow
      title={p.isJewelry ? "Materiales" : "Minerales asociados"}
      items={p.minerales ?? []}
    />
    <PillRow title="Complementos" items={p.complementos ?? []} />
  </>
);

// ---- Relato ---------------------------------------------------------------

export const RelatoBlock: React.FC<{ product: TreasureItem }> = ({
  product: p,
}) => {
  const { mode } = useThemeMode();
  const qe = getQuietEmerald(mode);
  if (!p.description) return null;
  return (
    <Box sx={{ mt: "18px" }}>
      <Box sx={{ mb: "7px" }}>
        <Eyebrow color={qe.accent}>Relato</Eyebrow>
      </Box>
      <Typography
        sx={{
          fontSize: 12.5,
          lineHeight: 1.6,
          color: qe.muted,
          fontFamily: qeFont.ui,
          textWrap: "pretty",
        }}
      >
        {p.description}
      </Typography>
    </Box>
  );
};

// ---- Trust card -----------------------------------------------------------

export const TrustCard: React.FC<{ product: TreasureItem }> = ({
  product: p,
}) => {
  const { mode } = useThemeMode();
  const qe = getQuietEmerald(mode);
  const hasCert = !!p.certificateUrl || !!p.certifications;
  if (!hasCert) return null;
  const openCert = () => {
    if (p.certificateUrl) window.open(p.certificateUrl, "_blank", "noopener");
  };
  return (
    <Box
      sx={{
        mt: "18px",
        p: "13px 14px",
        borderRadius: "8px",
        border: `1px solid ${qe.hairline}`,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: "7px" }}>
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            bgcolor: qe.accentPure,
          }}
        />
        <Typography
          sx={{
            fontSize: 11,
            color: qe.accent,
            fontWeight: 600,
            fontFamily: qeFont.ui,
          }}
        >
          Trazabilidad ADN de Paz · Verificado
        </Typography>
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mt: "10px",
          pt: "10px",
          borderTop: `1px solid ${qe.hairline}`,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: 11,
              color: qe.text,
              fontWeight: 500,
              fontFamily: qeFont.ui,
            }}
          >
            Certificado TM-CGL · 2026
          </Typography>
          <Typography
            sx={{
              fontFamily: qeFont.mono,
              fontSize: 9,
              color: qe.subtle,
              mt: "2px",
            }}
          >
            Gemología · Cadena de custodia
          </Typography>
        </Box>
        {p.certificateUrl && (
          <ButtonBase
            onClick={openCert}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: 11,
              color: qe.accent,
              fontWeight: 500,
              fontFamily: qeFont.ui,
            }}
          >
            Ver
            <ArrowRight size={13} strokeWidth={1.8} />
          </ButtonBase>
        )}
      </Box>
    </Box>
  );
};

// ---- Literal hero gallery (image well + pips + 46×46 thumbs) --------------

export const GemLiteralGallery: React.FC<{
  media: MediaItem[];
  productName: string;
  onIndexChange?: (i: number) => void;
}> = ({ media, productName, onIndexChange }) => {
  const { mode } = useThemeMode();
  const qe = getQuietEmerald(mode);
  const [index, setIndex] = useState(0);
  const items = media.length > 0 ? media : [];
  const active = items[Math.min(index, items.length - 1)];

  const select = (i: number) => {
    setIndex(i);
    onIndexChange?.(i);
  };

  if (!active) {
    return (
      <Box
        sx={{
          aspectRatio: "4 / 3",
          borderRadius: "6px",
          bgcolor: qe.well,
        }}
      />
    );
  }

  return (
    <Box>
      <Box
        sx={{
          position: "relative",
          aspectRatio: "4 / 3",
          borderRadius: "6px",
          overflow: "hidden",
          bgcolor: qe.well,
        }}
      >
        {active.type === "video" ? (
          <Box
            component="video"
            src={`${active.url}#t=0.001`}
            poster={active.thumbnailUrl}
            controls
            playsInline
            preload="metadata"
            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Box
            component="img"
            src={active.url}
            alt={active.alt || productName}
            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
        {items.length > 1 && (
          <Box
            sx={{
              position: "absolute",
              bottom: 9,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: "5px",
            }}
          >
            {items.map((_, i) => (
              <Box
                key={i}
                sx={{
                  width: i === index ? 14 : 5,
                  height: 3,
                  borderRadius: "2px",
                  bgcolor: i === index ? qe.accent : qe.border,
                  transition: "width 200ms",
                }}
              />
            ))}
          </Box>
        )}
      </Box>

      {items.length > 1 && (
        <Box sx={{ display: "flex", gap: "8px", mt: "10px", flexWrap: "wrap" }}>
          {items.map((m, i) => (
            <ButtonBase
              key={m.id}
              onClick={() => select(i)}
              aria-label={`Imagen ${i + 1}`}
              sx={{
                width: 46,
                height: 46,
                borderRadius: "4px",
                overflow: "hidden",
                bgcolor: qe.well,
                border: `1px solid ${i === index ? qe.accent : qe.border}`,
              }}
            >
              <Box
                component="img"
                src={m.thumbnailUrl || m.url}
                alt=""
                sx={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </ButtonBase>
          ))}
        </Box>
      )}
    </Box>
  );
};

// ---- Bottom price + CTA bar -----------------------------------------------

const formatMoney = (value: number, currency: "COP" | "USD") =>
  new Intl.NumberFormat(currency === "USD" ? "en-US" : "es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export const GemBottomBar: React.FC<{
  precioCOP: number;
  precioInternacional?: number;
  shouldShowPrices: boolean;
  ctaLabel: string;
  onCta: () => void;
  disabled?: boolean;
}> = ({
  precioCOP,
  precioInternacional,
  shouldShowPrices,
  ctaLabel,
  onCta,
  disabled,
}) => {
  const { mode } = useThemeMode();
  const qe = getQuietEmerald(mode);
  const { currency, convertPrice, trmRate } = useCurrency();
  const rawCOP = precioCOP || precioInternacional || 0;
  // convertPrice applies the per-guest price multiplier; derive BOTH lines from
  // it so the secondary equivalence never disagrees with the headline.
  const activeVal = convertPrice(rawCOP);
  const main = formatMoney(activeVal, currency);
  const secondary =
    currency === "USD"
      ? `COP ${new Intl.NumberFormat("es-CO").format(Math.round(activeVal * trmRate))}`
      : `USD ${new Intl.NumberFormat("en-US").format(
          Math.round(trmRate > 0 ? activeVal / trmRate : 0),
        )}`;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        mt: "22px",
        pt: "14px",
        borderTop: `1px solid ${qe.hairline}`,
      }}
    >
      {shouldShowPrices && (
        <Box sx={{ flex: "none" }}>
          <Typography
            sx={{
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: "-0.2px",
              color: qe.text,
              fontFamily: qeFont.ui,
              lineHeight: 1.1,
            }}
          >
            {main}
          </Typography>
          <Typography
            sx={{
              fontFamily: qeFont.mono,
              fontSize: 9,
              color: qe.subtle,
              mt: "1px",
            }}
          >
            {secondary}
          </Typography>
        </Box>
      )}
      <ButtonBase
        onClick={onCta}
        disabled={disabled}
        sx={{
          flex: 1,
          height: 46,
          borderRadius: "8px",
          bgcolor: disabled ? qe.border : qe.accentStrong,
          color: disabled ? qe.subtle : qe.onAccent,
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.01em",
          fontFamily: qeFont.ui,
          transition: "background-color 160ms",
          "&:hover": { bgcolor: disabled ? qe.border : qe.accent },
        }}
      >
        {ctaLabel}
      </ButtonBase>
    </Box>
  );
};
