/**
 * LedgerHero — modern hero for /admin/products ("Fotosíntesis").
 *
 * Replaces the prior "antique editorial" composition (italic Cormorant
 * display, brass cropmarks, wax-stamp double frame, watermark gem,
 * paper grain, brass stars) with a cleaner contemporary admin aesthetic.
 *
 * Composition (contentMaxWidth 1240px):
 *   1. Top rail   — slim breadcrumb (left) · edition tag (right)
 *   2. Headline   — eyebrow chip · large sans display title · concise lead
 *                   · clean stat card on the right (xs: stacks below)
 *   3. Status row — 3 stat blocks (disponibles / con asesor / vendidas) +
 *                   proportional meter underneath
 *   4. Sub-rail   — sync state (left) · emerald CTA "Resincronizar" (right)
 *
 * Typography:
 *   - System (SF Pro / Inter fallback) for everything except the data digits
 *   - Numbers in SF Mono, tabular figures
 *   - No italics, no Cormorant, no brass stars
 *
 * Motion:
 *   - One short stagger on mount, all <300ms
 *   - Honors prefers-reduced-motion
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import {
  cssTransition,
  fontFamilies,
  radius,
  type getAtelier,
} from "../../../design-system";

type Atelier = ReturnType<typeof getAtelier>;

interface LedgerHeroProps {
  atelier: Atelier;
  total: number;
  available: number;
  consigned: number;
  sold: number;
  pending: number;
  errored: number;
  lastPull: string | null;
  isResyncing: boolean;
  onResync: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

const SANS = fontFamilies.system;
const MONO = fontFamilies.mono;

function relativeTime(iso: string | null): string {
  if (!iso) return "sin sincronizar";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "sin sincronizar";
  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (diffSec < 60) return "hace segundos";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  return `hace ${diffD} d`;
}

function toRoman(num: number): string {
  const map: Array<[number, string]> = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let n = num;
  let out = "";
  for (const [v, s] of map) {
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
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

// =============================================================================
// MAIN
// =============================================================================

export function LedgerHero({
  atelier,
  total,
  available,
  consigned,
  sold,
  pending,
  errored,
  lastPull,
  isResyncing,
  onResync,
}: LedgerHeroProps) {
  const animatedTotal = useCountUp(total);
  const editionYear = useMemo(() => new Date().getFullYear(), []);
  const volumeMark = useMemo(() => toRoman(editionYear), [editionYear]);

  const denom = available + consigned + sold || 1;
  const proportion = {
    available: (available / denom) * 100,
    consigned: (consigned / denom) * 100,
    sold: (sold / denom) * 100,
  };

  return (
    <Box
      component="header"
      aria-labelledby="ledger-hero-title"
      sx={{
        position: "relative",
        backgroundColor: atelier.surfaces.panel,
        borderBottom: `1px solid ${atelier.surfaces.edge}`,
      }}
    >
      <Box
        sx={{
          maxWidth: `${atelier.spacing.contentMaxWidth}px`,
          mx: "auto",
          px: { xs: 2, md: 3 },
          pt: { xs: 3, md: 4 },
          pb: { xs: 3, md: 3.5 },
          // Subtle stagger reveal on mount
          "& > *": {
            opacity: 0,
            animation: "ledgerHeroFade 360ms ease-out forwards",
          },
          "& > *:nth-of-type(1)": { animationDelay: "40ms" },
          "& > *:nth-of-type(2)": { animationDelay: "120ms" },
          "& > *:nth-of-type(3)": { animationDelay: "200ms" },
          "& > *:nth-of-type(4)": { animationDelay: "280ms" },
          "@keyframes ledgerHeroFade": {
            from: { opacity: 0, transform: "translateY(4px)" },
            to: { opacity: 1, transform: "translateY(0)" },
          },
          "@media (prefers-reduced-motion: reduce)": {
            "& > *": { opacity: 1, animation: "none" },
          },
        }}
      >
        {/* 1. TOP RAIL — breadcrumb / edition tag */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            mb: { xs: 3, md: 3.5 },
          }}
        >
          <Box
            component="nav"
            aria-label="Migas de pan"
            sx={{
              fontFamily: SANS,
              fontSize: "12px",
              fontWeight: 500,
              color: atelier.ink.tertiary,
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <RouterLink
              to="/cuentas"
              style={{
                color: "inherit",
                textDecoration: "none",
              }}
            >
              <Box
                component="span"
                sx={{
                  transition: cssTransition.colors,
                  "&:hover": { color: atelier.ink.primary },
                }}
              >
                Atelier
              </Box>
            </RouterLink>
            <Box component="span" aria-hidden sx={{ color: atelier.ink.muted }}>
              /
            </Box>
            <Box
              component="span"
              aria-current="page"
              sx={{ color: atelier.ink.secondary, fontWeight: 600 }}
            >
              Fotosíntesis
            </Box>
          </Box>

          <Box
            component="span"
            sx={{
              fontFamily: MONO,
              fontSize: "11px",
              fontWeight: 500,
              color: atelier.ink.muted,
              fontFeatureSettings: '"tnum" 1',
              letterSpacing: "0.04em",
            }}
          >
            VOL · {volumeMark} · {editionYear}
          </Box>
        </Box>

        {/* 2. HEADLINE BLOCK — eyebrow + title + lead + side stat card */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) auto" },
            gap: { xs: 3, md: 4 },
            alignItems: { md: "end" },
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            {/* Eyebrow chip — small emerald-accented label */}
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontFamily: SANS,
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: atelier.focus.ring,
                backgroundColor: `${atelier.focus.ring}1A`,
                border: `1px solid ${atelier.focus.ring}33`,
                borderRadius: radius.full,
                px: "10px",
                py: "4px",
                mb: { xs: 2, md: 2.5 },
              }}
            >
              <Box
                component="span"
                aria-hidden
                sx={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: atelier.focus.ring,
                  boxShadow: `0 0 0 3px ${atelier.focus.ring}26`,
                }}
              />
              Catálogo vivo
            </Box>

            <Typography
              component="h1"
              id="ledger-hero-title"
              sx={{
                fontFamily: SANS,
                fontWeight: 700,
                fontSize: { xs: "40px", sm: "52px", md: "64px" },
                lineHeight: 1.04,
                letterSpacing: "-0.025em",
                color: atelier.ink.primary,
                m: 0,
              }}
            >
              Fotosíntesis
            </Typography>

            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: { xs: "14px", md: "15px" },
                lineHeight: 1.55,
                fontWeight: 400,
                color: atelier.ink.secondary,
                maxWidth: "52ch",
                mt: { xs: 1.5, md: 2 },
              }}
            >
              Donde la hoja maestra se convierte en jardín. Cada gema absorbe
              firma, fecha y precio antes de regresar al libro vivo del atelier.
            </Typography>
          </Box>

          {/* Side stat card — clean, no double frame */}
          <Box
            aria-label={`${total} piezas en el espejo`}
            sx={{
              backgroundColor: atelier.surfaces.canvas,
              border: `1px solid ${atelier.surfaces.edgeStrong}`,
              borderRadius: radius.lg,
              px: { xs: 2.5, md: 3 },
              py: { xs: 2, md: 2.5 },
              minWidth: { xs: "100%", md: "240px" },
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <Box
              sx={{
                fontFamily: SANS,
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: atelier.ink.tertiary,
              }}
            >
              Total inscrito
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "baseline",
                gap: "8px",
              }}
            >
              <Box
                sx={{
                  fontFamily: MONO,
                  fontWeight: 600,
                  fontSize: { xs: "40px", md: "48px" },
                  lineHeight: 1,
                  color: atelier.ink.primary,
                  fontFeatureSettings: '"tnum" 1, "lnum" 1',
                  letterSpacing: "-0.02em",
                }}
              >
                {animatedTotal.toLocaleString("es-CO")}
              </Box>
              <Box
                sx={{
                  fontFamily: SANS,
                  fontSize: "13px",
                  fontWeight: 500,
                  color: atelier.ink.tertiary,
                }}
              >
                piezas
              </Box>
            </Box>
            <Box
              sx={{
                fontFamily: SANS,
                fontSize: "12px",
                fontWeight: 400,
                color: atelier.ink.muted,
              }}
            >
              {pending > 0 || errored > 0
                ? `${pending} pendientes · ${errored} con error`
                : "Espejo en sincronía"}
            </Box>
          </Box>
        </Box>

        {/* 3. STATUS ROW — three stat blocks + proportional meter */}
        <Box sx={{ mt: { xs: 4, md: 4.5 } }}>
          <Box
            role="list"
            aria-label="Distribución por estado"
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr 1fr 1fr" },
              gap: { xs: 1.5, sm: 3 },
              mb: 2,
            }}
          >
            <StatusStat
              atelier={atelier}
              count={available}
              total={total}
              label="Disponibles"
              color={atelier.status.available.pip}
            />
            <StatusStat
              atelier={atelier}
              count={consigned}
              total={total}
              label="Con asesor"
              color={atelier.status.consigned.pip}
            />
            <StatusStat
              atelier={atelier}
              count={sold}
              total={total}
              label="Vendidas"
              color={atelier.status.sold.pip}
            />
          </Box>

          <Box
            role="img"
            aria-label={`${available} disponibles, ${consigned} con asesor, ${sold} vendidas`}
            sx={{
              position: "relative",
              height: "8px",
              backgroundColor: atelier.surfaces.inset,
              borderRadius: radius.full,
              overflow: "hidden",
              display: "flex",
            }}
          >
            <MeterSegment
              percent={proportion.available}
              color={atelier.status.available.pip}
              delay={300}
            />
            <MeterSegment
              percent={proportion.consigned}
              color={atelier.status.consigned.pip}
              delay={400}
            />
            <MeterSegment
              percent={proportion.sold}
              color={atelier.status.sold.pip}
              delay={500}
            />
          </Box>
        </Box>

        {/* 4. SUB-RAIL — sync state · resync CTA */}
        <Box
          sx={{
            mt: { xs: 3, md: 3.5 },
            pt: 2,
            borderTop: `1px solid ${atelier.surfaces.edge}`,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: { xs: 2, md: 3 },
          }}
        >
          <SyncStat
            atelier={atelier}
            label="Última sincronía"
            value={relativeTime(lastPull)}
          />
          <SyncStat
            atelier={atelier}
            label="Pendientes"
            value={pending.toLocaleString("es-CO")}
            tone={pending > 0 ? "consigned" : undefined}
            mono
          />
          <SyncStat
            atelier={atelier}
            label="Con error"
            value={errored.toLocaleString("es-CO")}
            tone={errored > 0 ? "sold" : undefined}
            mono
          />

          <Box sx={{ flex: 1 }} />

          <ButtonBase
            onClick={onResync}
            disabled={isResyncing}
            disableRipple
            aria-label="Resincronizar inventario desde la hoja"
            sx={{
              fontFamily: SANS,
              fontSize: "13px",
              fontWeight: 600,
              letterSpacing: "-0.005em",
              color: isResyncing ? atelier.ink.muted : atelier.ink.inverse,
              backgroundColor: isResyncing
                ? atelier.surfaces.inset
                : atelier.focus.ring,
              border: `1px solid ${isResyncing ? atelier.surfaces.edgeStrong : atelier.focus.ring}`,
              borderRadius: radius.md,
              px: "16px",
              py: "9px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              cursor: isResyncing ? "default" : "pointer",
              transition: `${cssTransition.colors}, transform 80ms ease`,
              "&:hover": {
                backgroundColor: isResyncing
                  ? atelier.surfaces.inset
                  : atelier.focus.ring,
                filter: isResyncing ? "none" : "brightness(1.08)",
                transform: isResyncing ? "none" : "translateY(-1px)",
              },
              "&:active": {
                transform: "translateY(0)",
              },
              "&:focus-visible": {
                outline: `2px solid ${atelier.focus.ring}`,
                outlineOffset: "3px",
              },
              "&:disabled": {
                opacity: 0.7,
              },
            }}
          >
            <Box
              component="span"
              aria-hidden
              sx={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                border: `1.5px solid currentColor`,
                borderTopColor: "transparent",
                animation: isResyncing
                  ? "ledgerSpin 700ms linear infinite"
                  : "none",
                "@keyframes ledgerSpin": {
                  from: { transform: "rotate(0deg)" },
                  to: { transform: "rotate(360deg)" },
                },
              }}
            />
            {isResyncing ? "Sincronizando" : "Resincronizar"}
          </ButtonBase>
        </Box>
      </Box>
    </Box>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * StatusStat — clean stat block for the proportional meter.
 * Lays out: dot · count (display) · percent (mono small) · label.
 */
function StatusStat({
  atelier,
  count,
  total,
  label,
  color,
}: {
  atelier: Atelier;
  count: number;
  total: number;
  label: string;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <Box
      role="listitem"
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        minWidth: 0,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Box
          aria-hidden
          sx={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: color,
            flexShrink: 0,
          }}
        />
        <Box
          component="span"
          sx={{
            fontFamily: SANS,
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: atelier.ink.tertiary,
          }}
        >
          {label}
        </Box>
      </Box>
      <Box
        sx={{ display: "flex", alignItems: "baseline", gap: "8px", ml: "16px" }}
      >
        <Box
          component="span"
          sx={{
            fontFamily: MONO,
            fontWeight: 600,
            fontSize: { xs: "22px", md: "26px" },
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
            color: atelier.ink.primary,
            fontFeatureSettings: '"tnum" 1, "lnum" 1',
          }}
        >
          {count.toLocaleString("es-CO")}
        </Box>
        <Box
          component="span"
          sx={{
            fontFamily: MONO,
            fontSize: "12px",
            fontWeight: 500,
            color: atelier.ink.muted,
            fontFeatureSettings: '"tnum" 1',
          }}
        >
          {pct}%
        </Box>
      </Box>
    </Box>
  );
}

/**
 * MeterSegment — animated portion of the proportional bar.
 */
function MeterSegment({
  percent,
  color,
  delay,
}: {
  percent: number;
  color: string;
  delay: number;
}) {
  const [width, setWidth] = useState("0%");
  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setWidth(`${percent}%`);
      return;
    }
    const id = window.setTimeout(() => setWidth(`${percent}%`), delay);
    return () => window.clearTimeout(id);
  }, [percent, delay]);
  return (
    <Box
      sx={{
        height: "100%",
        width,
        backgroundColor: color,
        transition: "width 600ms cubic-bezier(0.2, 0.8, 0.2, 1)",
      }}
    />
  );
}

/**
 * SyncStat — minimal "label · value" pair for the sub-rail.
 */
function SyncStat({
  atelier,
  label,
  value,
  mono,
  tone,
}: {
  atelier: Atelier;
  label: string;
  value: string;
  mono?: boolean;
  tone?: "consigned" | "sold";
}) {
  const valueColor =
    tone === "sold"
      ? atelier.status.sold.pip
      : tone === "consigned"
        ? atelier.status.consigned.pip
        : atelier.ink.primary;
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: "8px",
      }}
    >
      <Box
        component="span"
        sx={{
          fontFamily: SANS,
          fontSize: "11px",
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: atelier.ink.tertiary,
        }}
      >
        {label}
      </Box>
      <Box
        component="span"
        sx={{
          fontFamily: mono ? MONO : SANS,
          fontSize: "13px",
          fontWeight: 600,
          color: valueColor,
          fontFeatureSettings: mono ? '"tnum" 1' : undefined,
        }}
      >
        {value}
      </Box>
    </Box>
  );
}
