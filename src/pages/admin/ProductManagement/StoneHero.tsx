/**
 * StoneHero — top card inside the Bandeja inspector.
 *
 * Surfaces the selected stone's image (or radial chroma fallback),
 * a procedencia · calidad chip, and a price/peso meta line. The
 * "Abrir editor" button is the explicit entry point into the
 * EditDrawer — row clicks no longer open the drawer.
 *
 * Spec: docs/superpowers/specs/2026-05-06-fotosintesis-admin-redesign-design.md
 */

import { Box, ButtonBase, Typography } from "@mui/material";
import { fontFamilies, type FotoTokens } from "../../../design-system";

const SANS = fontFamilies.system;
const MONO = fontFamilies.mono;

interface StoneHeroProps {
  foto: FotoTokens;
  itemId: string;
  nombre?: string;
  peso?: string;
  coleccion?: string;
  calidad?: string;
  precioCOP?: number;
  thumbnailUrl?: string;
  chromaHex?: string;
  onOpenEditor: () => void;
}

function formatPrice(n: number | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString("es-CO")}`;
}

export function StoneHero({
  foto,
  itemId,
  nombre,
  peso,
  coleccion,
  calidad,
  precioCOP,
  thumbnailUrl,
  chromaHex,
  onOpenEditor,
}: StoneHeroProps) {
  const procedencia = (coleccion ?? "").trim().split(/\s+/)[0] || null;
  const fallbackBg = chromaHex
    ? `radial-gradient(circle at 30% 30%, ${chromaHex}, ${foto.ink.primary} 80%)`
    : foto.surfaces.inset;
  return (
    <Box
      sx={{
        border: `1px solid ${foto.surfaces.rule}`,
        borderRadius: "12px",
        overflow: "hidden",
        backgroundColor: foto.surfaces.canvas,
      }}
    >
      <Box
        role="img"
        aria-label={
          nombre ? `Imagen de ${nombre}` : `Imagen de la piedra ${itemId}`
        }
        sx={{
          aspectRatio: "16 / 10",
          background: thumbnailUrl
            ? `center/cover no-repeat url(${thumbnailUrl})`
            : fallbackBg,
          position: "relative",
        }}
      >
        {procedencia && calidad && (
          <Box
            sx={{
              position: "absolute",
              bottom: 10,
              left: 10,
              fontFamily: SANS,
              fontSize: "8.5px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              fontWeight: 600,
              backgroundColor: "rgba(11, 16, 14, 0.62)",
              color: "#FFFFFF",
              px: "8px",
              py: "3px",
              borderRadius: "999px",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            {procedencia} · {calidad}
          </Box>
        )}
        {chromaHex && (
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              bottom: 10,
              right: 10,
              width: 60,
              height: 60,
              borderRadius: "50%",
              border: "1.5px solid rgba(255, 255, 255, 0.4)",
              boxShadow: "0 0 0 4px rgba(11, 16, 14, 0.18)",
              background: `radial-gradient(circle at 35% 35%, ${chromaHex} 8%, ${foto.ink.primary} 70%)`,
            }}
          />
        )}
      </Box>
      <Box
        sx={{
          p: 1.5,
          borderTop: `1px solid ${foto.surfaces.rule}`,
          display: "grid",
          gridTemplateColumns: "1fr auto",
          alignItems: "center",
          gap: 1.25,
          backgroundColor: foto.surfaces.canvas,
        }}
      >
        <Box>
          <Typography
            component="div"
            sx={{
              fontFamily: SANS,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "-0.015em",
              color: foto.ink.primary,
              lineHeight: 1.1,
            }}
          >
            {nombre || `Piedra ${itemId}`}
          </Typography>
          <Typography
            component="div"
            sx={{
              fontFamily: MONO,
              fontSize: 9.5,
              letterSpacing: "0.04em",
              color: foto.ink.tertiary,
              mt: 0.4,
            }}
          >
            {itemId}
            {peso ? ` · ${peso} ct` : ""}
            {precioCOP ? ` · ${formatPrice(precioCOP)}` : ""}
          </Typography>
        </Box>
        <ButtonBase
          data-bandeja-open-editor
          onClick={onOpenEditor}
          disableRipple
          sx={{
            backgroundColor: foto.accent.primary,
            color: foto.ink.inverse,
            borderRadius: "9px",
            px: "13px",
            py: "7px",
            fontFamily: SANS,
            fontSize: 10,
            fontWeight: 600,
            "&:focus-visible": {
              outline: `2px solid ${foto.accent.primary}`,
              outlineOffset: 2,
            },
          }}
        >
          Abrir editor
        </ButtonBase>
      </Box>
    </Box>
  );
}
