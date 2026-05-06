/**
 * PatronCard — proportional bar chart of "coincidencias" (90 d).
 *
 * Two variants:
 *   - "selected": patrones for the currently-active stone (procedencia ·
 *     calidad · carat-bucket combos with non-zero counts).
 *   - "global": top combos across the whole catalog when no row is selected.
 *
 * Surfaces the median price of the matched combos as a footer line.
 *
 * Spec: docs/superpowers/specs/2026-05-06-fotosintesis-admin-redesign-design.md
 */

import { Box, Typography } from "@mui/material";
import { fontFamilies, type FotoTokens } from "../../../design-system";
import type { PatronResult } from "../../../hooks/usePatrones";

const SANS = fontFamilies.system;
const MONO = fontFamilies.mono;

interface PatronCardProps {
  foto: FotoTokens;
  data: PatronResult | undefined;
  variant: "selected" | "global";
}

function formatPriceShort(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString("es-CO")}`;
}

export function PatronCard({ foto, data, variant }: PatronCardProps) {
  const title =
    variant === "selected" ? "Patrones · coincidencias" : "Patrones · catálogo";
  const subtitle = "90 d";
  const max = data?.combos.reduce((m, c) => Math.max(m, c.count), 0) ?? 1;
  const median = data?.combos
    .filter((c) => c.medianPriceCOP !== null)
    .reduce(
      (acc, c, _, arr) =>
        arr.length ? Math.round(acc + (c.medianPriceCOP ?? 0) / arr.length) : 0,
      0,
    );
  return (
    <Box
      sx={{
        border: `1px solid ${foto.surfaces.rule}`,
        borderRadius: "11px",
        p: "13px 15px",
        backgroundColor: foto.surfaces.canvas,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1.25,
        }}
      >
        <Typography
          component="div"
          sx={{
            fontFamily: SANS,
            fontSize: 9,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: foto.ink.tertiary,
            fontWeight: 500,
          }}
        >
          {title}
        </Typography>
        <Typography
          component="div"
          sx={{ fontFamily: SANS, fontSize: 9, color: foto.ink.tertiary }}
        >
          {subtitle}
        </Typography>
      </Box>
      {!data && (
        <Typography
          sx={{ fontFamily: SANS, fontSize: 10, color: foto.ink.tertiary }}
        >
          Cargando…
        </Typography>
      )}
      {data && data.combos.length === 0 && (
        <Typography
          sx={{ fontFamily: SANS, fontSize: 10, color: foto.ink.tertiary }}
        >
          Sin coincidencias en 90 d
        </Typography>
      )}
      {data &&
        data.combos.length > 0 &&
        data.combos.map((c) => (
          <Box
            key={c.key}
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 70px 24px",
              alignItems: "center",
              gap: 1.25,
              py: 0.5,
              fontFamily: SANS,
              fontSize: 10,
              color: foto.ink.primary,
            }}
          >
            <Box>{c.label}</Box>
            <Box
              sx={{
                height: 4,
                backgroundColor: foto.surfaces.inset,
                borderRadius: 2,
                position: "relative",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  width: `${(c.count / max) * 100}%`,
                  backgroundColor: foto.accent.primary,
                  borderRadius: 2,
                }}
              />
            </Box>
            <Box sx={{ fontFamily: MONO, fontWeight: 600, textAlign: "right" }}>
              {c.count}
            </Box>
          </Box>
        ))}
      {data && data.combos.length > 0 && (
        <Box
          sx={{
            mt: 1,
            pt: 1,
            borderTop: `1px solid ${foto.surfaces.edge}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            fontFamily: SANS,
            fontSize: 10,
            color: foto.ink.secondary,
          }}
        >
          <Box>Precio mediano del patrón</Box>
          <Box
            sx={{
              fontFamily: MONO,
              fontWeight: 600,
              fontSize: 12,
              color: foto.ink.primary,
            }}
          >
            {formatPriceShort(median ? Math.round(median) : null)}
          </Box>
        </Box>
      )}
    </Box>
  );
}
