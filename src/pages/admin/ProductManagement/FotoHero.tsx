// src/pages/admin/ProductManagement/FotoHero.tsx
import { Box, ButtonBase, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { fontFamilies, type FotoTokens } from "../../../design-system";

const SANS = fontFamilies.system;
const MONO = fontFamilies.mono;

interface FotoHeroProps {
  foto: FotoTokens;
  total: number;
  available: number;
  consigned: number;
  sold: number;
  /** Last 8 weekly sold counts (sparkline). */
  sparkline: number[];
  lastPull: string | null;
  isResyncing: boolean;
  onResync: () => void;
  onCreateNew: () => void;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "sin sincronizar";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "sin sincronizar";
  const diffMin = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (diffMin < 1) return "hace segundos";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  return `hace ${Math.round(diffH / 24)} d`;
}

function useCountUp(target: number, durationMs = 700): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || target <= 0) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs]);
  return value;
}

export function FotoHero({
  foto,
  total,
  available,
  consigned,
  sold,
  sparkline,
  lastPull,
  isResyncing,
  onResync,
  onCreateNew,
}: FotoHeroProps) {
  const animatedTotal = useCountUp(total);
  const sparkMax = useMemo(() => Math.max(1, ...sparkline), [sparkline]);

  return (
    <Box
      component="section"
      aria-label="Resumen del catálogo"
      sx={{
        backgroundColor: foto.surfaces.canvas,
        borderBottom: `1px solid ${foto.surfaces.edge}`,
        px: { xs: 2.5, md: 3 },
        py: { xs: 2.5, md: 3 },
      }}
    >
      <Box
        sx={{
          maxWidth: 1280,
          mx: "auto",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr auto" },
          gap: 2.5,
          alignItems: "end",
        }}
      >
        <Box>
          <Box
            component={RouterLink}
            to="/admin"
            sx={{
              display: "inline-block",
              fontFamily: SANS,
              fontSize: "9px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: foto.ink.tertiary,
              textDecoration: "none",
              mb: 1,
              fontWeight: 500,
              "&:hover": { color: foto.ink.secondary },
            }}
          >
            Atelier · Inventario
          </Box>
          <Typography
            component="h1"
            sx={{
              fontFamily: SANS,
              fontSize: { xs: "26px", md: "32px" },
              fontWeight: 600,
              letterSpacing: "-0.035em",
              color: foto.ink.primary,
              lineHeight: 1,
              m: 0,
            }}
          >
            Fotosíntesis
          </Typography>

          <Box
            sx={{
              mt: 2.25,
              pt: 2,
              borderTop: `1px solid ${foto.surfaces.edge}`,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "auto 1fr auto" },
              gap: { xs: 2, sm: 4 },
              alignItems: "center",
            }}
          >
            <Box>
              <Box
                sx={{
                  fontFamily: MONO,
                  fontSize: "40px",
                  fontWeight: 400,
                  letterSpacing: "-0.045em",
                  color: foto.ink.primary,
                  lineHeight: 0.9,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {animatedTotal.toLocaleString("es-CO")}
              </Box>
              <Box
                sx={{
                  fontFamily: SANS,
                  fontSize: "9px",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: foto.ink.tertiary,
                  mt: 0.75,
                  fontWeight: 500,
                }}
              >
                en el espejo
              </Box>
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-end",
                gap: "3px",
                height: "38px",
              }}
              aria-hidden
            >
              {sparkline.map((v, i) => (
                <Box
                  key={i}
                  sx={{
                    width: "5px",
                    height: `${Math.max(8, (v / sparkMax) * 100)}%`,
                    backgroundColor: foto.accent.primary,
                    opacity: 0.2 + (i / sparkline.length) * 0.8,
                    borderRadius: "1px",
                  }}
                />
              ))}
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: "7px",
                alignItems: { xs: "flex-start", sm: "flex-end" },
                fontFamily: SANS,
                fontSize: "10px",
                color: foto.ink.secondary,
              }}
            >
              {[
                {
                  label: "Disponibles",
                  value: available,
                  color: foto.status.available,
                },
                {
                  label: "Con asesor",
                  value: consigned,
                  color: foto.status.consigned,
                },
                { label: "Vendidas", value: sold, color: foto.status.sold },
              ].map((item) => (
                <Box
                  key={item.label}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <Box component="span">{item.label}</Box>
                  <Box
                    component="span"
                    sx={{
                      fontFamily: MONO,
                      fontWeight: 500,
                      color: foto.ink.primary,
                      minWidth: "32px",
                      textAlign: "right",
                    }}
                  >
                    {item.value.toLocaleString("es-CO")}
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      backgroundColor: item.color,
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
            alignItems: "flex-end",
            minWidth: 168,
          }}
        >
          <ButtonBase
            data-foto-create
            onClick={onCreateNew}
            disableRipple
            sx={{
              backgroundColor: foto.ink.primary,
              color: foto.ink.inverse,
              borderRadius: "10px",
              px: "18px",
              py: "10px",
              fontFamily: SANS,
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "-0.005em",
              "&:focus-visible": {
                outline: `2px solid ${foto.accent.primary}`,
                outlineOffset: "2px",
              },
            }}
          >
            + Nueva piedra
          </ButtonBase>
          <ButtonBase
            data-foto-resync
            onClick={onResync}
            disabled={isResyncing}
            disableRipple
            sx={{
              border: `1px solid ${foto.surfaces.edgeStrong}`,
              borderRadius: "10px",
              px: "14px",
              py: "8px",
              fontFamily: SANS,
              fontSize: "10px",
              fontWeight: 500,
              color: foto.ink.primary,
              "&:disabled": { opacity: 0.5 },
              "&:focus-visible": {
                outline: `2px solid ${foto.accent.primary}`,
                outlineOffset: "2px",
              },
            }}
          >
            {isResyncing ? "Sincronizando…" : "Resincronizar"}
          </ButtonBase>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontFamily: SANS,
              fontSize: "9px",
              letterSpacing: "0.06em",
              color: foto.ink.tertiary,
            }}
          >
            <Box
              component="span"
              sx={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                backgroundColor: foto.accent.primary,
                animation: "fotoPulse 1.8s ease-in-out infinite",
                "@keyframes fotoPulse": { "50%": { opacity: 0.4 } },
              }}
            />
            Sincronizado · {relativeTime(lastPull)}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
