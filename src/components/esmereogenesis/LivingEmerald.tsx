/**
 * LivingEmerald — the living creature at the heart of Esmereogénesis (Bóveda).
 *
 * Ported from the approved prototype (docs/boveda-prototype). The hero is a
 * CSS-faceted gem (`LayeredCssGem`) wrapped in atmosphere — ambient light beam,
 * drifting particles, organic roots that bloom with progress, an emerald→gold
 * progress ring, a breathing/floating idle, tap-to-pet sparkle bursts, and the
 * 7-phase watering visuals (drop / splash / bloom / count / celebrate).
 *
 * Gem-slot priority:
 *   1. cut-character art (seed→grown crossfade) when `corte` maps to one,
 *   2. else the product photo (`imageSrc`) inside a disc,
 *   3. else the LayeredCssGem (the canonical, image-free hero).
 *
 * Renders inside a `.bov-root` ancestor (consumes the feature CSS vars + the
 * boveda.css keyframes). Gem core colours are literal hex so the gem looks
 * identical regardless. In light mode, `staged` adds the `.le-stage` halo +
 * pedestal so the hero reads like a showroom piece.
 */

import { useId, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { resolveCutCharacter } from "./cutCharacters";
import LayeredCssGem from "./LayeredCssGem";
import { stageForProgress } from "../../data/esmereo-mock";
import { STAGE_META } from "./stages";
import type { EsmereoState } from "../../types/esmereogenesis";

export type LivingEmeraldSize = "sm" | "md" | "lg" | "xl";
export type LivingEmeraldPhase =
  | "idle"
  | "drop"
  | "splash"
  | "bloom"
  | "count"
  | "celebrate";

interface LivingEmeraldProps {
  /** 0..1 */
  progress: number;
  /** Named size or a raw pixel diameter. */
  size?: LivingEmeraldSize | number;
  state?: EsmereoState;
  /** Watering-ritual visual phase (drives splash/bloom/celebrate overlays). */
  phase?: LivingEmeraldPhase;
  /** Cut/shape — when mapped to a character, replaces the CSS gem. */
  corte?: string;
  /** Optional product photo (used when no character maps). */
  imageSrc?: string;
  /** Idle breathe/float (default true). */
  isPulsing?: boolean;
  /** Timestamp of the last aporte — adds a ~30s glow boost. */
  recentAporteAt?: number;
  /** Show the emerald→gold progress ring (default true). */
  showRing?: boolean;
  /** Show the ambient light beam (default true; hero only). */
  showBeam?: boolean;
  /** Light-mode hero staging: cool halo + pedestal/reflection. Hero only. */
  staged?: boolean;
  /** Tap-to-pet: sparkle burst + spring scale. Makes the gem a button. */
  onPet?: () => void;
}

const SIZE_PX: Record<LivingEmeraldSize, number> = {
  sm: 96,
  md: 160,
  lg: 240,
  xl: 320,
};

const PAL = {
  bright: "#33C194",
  mid: "#00AE7A",
  deep: "#008C61",
  spark: "#EAFBF3",
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}
function buildCrystalFilter(progress: number): string {
  const p = clamp01(progress);
  return `brightness(${(0.5 + 0.7 * p).toFixed(2)}) saturate(${(0.3 + 0.9 * p).toFixed(2)}) contrast(${(0.9 + 0.25 * p).toFixed(2)}) blur(${Math.max(0, 0.5 - 0.5 * p).toFixed(2)}px)`;
}

// ── emerald→gold progress ring (glow) ─────────────────────────────
function Ring({
  size,
  pct,
  stroke = 3,
}: {
  size: number;
  pct: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2 - 2;
  const c = size / 2;
  const C = 2 * Math.PI * r;
  const uid = useId().replace(/:/g, "");
  return (
    <svg
      width={size}
      height={size}
      aria-hidden
      style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}
    >
      <defs>
        <linearGradient id={`br-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00AE7A" />
          <stop offset="62%" stopColor="#33C194" />
          <stop offset="100%" stopColor="#D4AF37" />
        </linearGradient>
        <filter id={`bg-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={stroke * 0.7} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={stroke}
      />
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={`url(#br-${uid})`}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${C * clamp01(pct)} ${C}`}
        filter={`url(#bg-${uid})`}
        style={{
          transition: "stroke-dasharray 1.1s cubic-bezier(.2,.85,.3,1)",
        }}
      />
    </svg>
  );
}

// ── roots / tendrils that grow with vitality ──────────────────────
function Roots({ size, vitality }: { size: number; vitality: number }) {
  const count =
    vitality < 0.12
      ? 0
      : vitality < 0.36
        ? 3
        : vitality < 0.68
          ? 4
          : vitality < 1
            ? 5
            : 6;
  if (count === 0) return null;
  const grow = 0.55 + Math.min(1, vitality) * 0.55;
  const w = size * 1.5;
  const h = size * 1.15;
  const cx = w / 2;
  const roots: {
    d: string;
    tipX: number;
    tipY: number;
    key: number;
    sw: number;
  }[] = [];
  for (let i = 0; i < count; i++) {
    if (i === 0) {
      const len = h * 0.78 * grow;
      roots.push({
        d: `M ${cx} 0 Q ${cx + 6} ${len * 0.55} ${cx} ${len}`,
        tipX: cx,
        tipY: len,
        key: i,
        sw: 1.7,
      });
    } else {
      const side = i % 2 ? -1 : 1;
      const rank = Math.ceil(i / 2);
      const spread = side * (w * 0.085 + rank * w * 0.085) * grow;
      const len = (h * 0.42 + rank * h * 0.12) * grow;
      const ctrlX = cx + spread * 0.32;
      roots.push({
        d: `M ${cx} ${h * 0.04} Q ${ctrlX} ${len * 0.46} ${cx + spread} ${len}`,
        tipX: cx + spread,
        tipY: len,
        key: i,
        sw: 1.4,
      });
    }
  }
  return (
    <svg
      width={w}
      height={h}
      aria-hidden
      style={{
        position: "absolute",
        left: "50%",
        top: "48%",
        transform: "translateX(-50%)",
        overflow: "visible",
        zIndex: 0,
        pointerEvents: "none",
      }}
    >
      <defs>
        <linearGradient id="bov-rootg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#33C194" stopOpacity="0.7" />
          <stop offset="55%" stopColor="#00AE7A" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#008C61" stopOpacity="0" />
        </linearGradient>
      </defs>
      {roots.map((r) => (
        <g key={r.key}>
          <path
            d={r.d}
            fill="none"
            stroke="url(#bov-rootg)"
            strokeWidth={r.sw}
            strokeLinecap="round"
            style={{ transition: "all .8s cubic-bezier(.2,.85,.3,1)" }}
          />
          <ellipse
            cx={r.tipX}
            cy={r.tipY}
            rx={3.4}
            ry={5}
            fill="#33C194"
            opacity="0.5"
            transform={`rotate(${r.tipX < cx ? -28 : 28} ${r.tipX} ${r.tipY})`}
            style={{ transition: "all .8s" }}
          />
          <circle
            cx={r.tipX}
            cy={r.tipY}
            r={1.6}
            fill="#F0CE86"
            opacity="0.9"
            style={{ transition: "all .8s" }}
          />
        </g>
      ))}
    </svg>
  );
}

type Burst = {
  id: number;
  x: number;
  y: number;
  sparks: { i: number; bx: number; by: number; gold: boolean }[];
};

export const LivingEmerald = ({
  progress,
  size = "lg",
  state,
  phase = "idle",
  corte,
  imageSrc,
  isPulsing = true,
  recentAporteAt,
  showRing = true,
  showBeam = true,
  staged = false,
  onPet,
}: LivingEmeraldProps) => {
  const reducedMotion = !!useReducedMotion();
  const px = typeof size === "number" ? size : SIZE_PX[size];
  const pct = clamp01(progress);
  const vitality = pct;
  const stage = stageForProgress(pct, state);
  const surge = phase === "splash" || phase === "bloom" || phase === "count";
  const gemBox = Math.round(px * (showRing ? 0.66 : 0.92));

  const [bursts, setBursts] = useState<Burst[]>([]);

  // Cut-character (preferred). null → photo, else CSS gem.
  const character = useMemo(() => resolveCutCharacter(corte), [corte]);
  const growth = smoothstep(clamp01((pct - 0.08) / 0.84));
  const hasCrossfade = Boolean(character?.seed && character?.grown);
  const [imageFailed, setImageFailed] = useState(false);
  const useImage = Boolean(imageSrc) && !imageFailed && !character;
  const useGem = !character && !useImage;
  const crystalFilter = buildCrystalFilter(pct);

  const recentBoost = useMemo(() => {
    if (!recentAporteAt) return 0;
    const elapsed = Date.now() - recentAporteAt;
    if (elapsed < 0 || elapsed > 30_000) return 0;
    return 1 - elapsed / 30_000;
  }, [recentAporteAt]);

  // particle stream (density scales with vitality)
  const pCount = reducedMotion ? 0 : Math.round(6 + vitality * 12);
  const motes = useMemo(
    () =>
      Array.from({ length: pCount }, (_, i) => ({
        left: 12 + Math.random() * 76,
        delay: (i / Math.max(1, pCount)) * 9,
        dur: 7 + Math.random() * 6,
        sz: 1.3 + Math.random() * 2.6,
        gold: i % 5 === 0,
        dx: (Math.random() * 2 - 1) * 26,
      })),
    [pCount],
  );

  const pet = (e: React.PointerEvent<HTMLDivElement>) => {
    onPet?.();
    if (reducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x =
      (((e.clientX ?? rect.left + rect.width / 2) - rect.left) / rect.width) *
      100;
    const y =
      (((e.clientY ?? rect.top + rect.height / 2) - rect.top) / rect.height) *
      100;
    const id = performance.now();
    const sparks = Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2 + Math.random();
      const dist = 34 + Math.random() * 26;
      return {
        i,
        bx: Math.cos(a) * dist,
        by: Math.sin(a) * dist,
        gold: i % 3 === 0,
      };
    });
    setBursts((b) => [...b, { id, x, y, sparks }]);
    window.setTimeout(
      () => setBursts((b) => b.filter((bb) => bb.id !== id)),
      800,
    );
  };

  const ariaLabel = `Esmeralda · ${STAGE_META[stage].label} · ${Math.round(pct * 100)}% regada`;

  return (
    <div
      role={onPet ? "button" : "img"}
      aria-label={ariaLabel}
      tabIndex={onPet ? 0 : undefined}
      onKeyDown={
        onPet
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPet();
              }
            }
          : undefined
      }
      style={{
        position: "relative",
        width: px,
        maxWidth: "100%",
        height: px * 1.18,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {/* light-mode hero staging (halo + pedestal/reflection) */}
      {showBeam && staged && <div className="le-stage" />}

      {/* light beam */}
      {showBeam && (
        <div
          className="anim-loop reduced-hide le-beam"
          aria-hidden
          style={{
            position: "absolute",
            top: "-16%",
            left: "50%",
            width: px * 1.15,
            height: px * 1.9,
            transformOrigin: "top center",
            background:
              "linear-gradient(180deg, rgba(51,193,148,0.28), rgba(0,174,122,0.10) 44%, transparent 78%)",
            clipPath: "polygon(36% 0, 64% 0, 90% 100%, 10% 100%)",
            filter: "blur(13px)",
            animation: reducedMotion
              ? "none"
              : "bovBeam 7s ease-in-out infinite",
            zIndex: 0,
          }}
        />
      )}

      {/* halo pulse */}
      <div
        className="anim-loop"
        aria-hidden
        style={{
          position: "absolute",
          width: px * 1.4,
          height: px * 1.4,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${PAL.mid}${surge ? "88" : "55"}, transparent 62%)`,
          filter: "blur(22px)",
          animation: reducedMotion ? "none" : "bovHalo 4s ease-in-out infinite",
          zIndex: 0,
          transition: "background .5s",
          opacity: 0.55 + recentBoost * 0.3,
        }}
      />

      {/* rising particles */}
      {motes.map((m, i) => (
        <span
          key={i}
          className="reduced-hide"
          aria-hidden
          style={{
            position: "absolute",
            bottom: "8%",
            left: m.left + "%",
            width: m.sz,
            height: m.sz,
            borderRadius: "50%",
            background: m.gold
              ? "var(--gold-bright, #F0CE86)"
              : "var(--spark, #EAFBF3)",
            boxShadow: m.gold
              ? "0 0 6px var(--gold, #D9A94B)"
              : `0 0 6px ${PAL.bright}`,
            opacity: 0,
            ["--dx" as string]: m.dx + "px",
            animation: reducedMotion
              ? "none"
              : `bovRise ${m.dur}s ease-in ${m.delay}s infinite`,
            zIndex: 1,
          }}
        />
      ))}

      {/* roots */}
      <div
        style={{
          position: "absolute",
          width: gemBox,
          height: gemBox,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1,
        }}
      >
        <Roots size={gemBox} vitality={vitality} />
      </div>

      {/* ring + gem (floating, breathing) */}
      <div
        style={{
          position: "relative",
          width: px,
          height: px,
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {showRing && <Ring size={px} pct={pct} />}
        <div
          className="anim-loop"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: reducedMotion
              ? "none"
              : "bovFloat 6s ease-in-out infinite",
          }}
        >
          <div
            className="anim-loop"
            style={{
              animation:
                reducedMotion || !isPulsing
                  ? "none"
                  : "bovBreathe 4.5s ease-in-out infinite",
            }}
          >
            <div
              onPointerDown={onPet ? pet : undefined}
              style={{
                cursor: onPet ? "pointer" : "default",
                animation:
                  phase === "bloom" && !reducedMotion
                    ? "bovBounce .6s cubic-bezier(.34,1.56,.64,1)"
                    : "none",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* ── the gem itself ── */}
              {character ? (
                <div
                  style={{
                    position: "relative",
                    width: gemBox,
                    height: gemBox,
                    filter: `drop-shadow(0 ${px * 0.02}px ${px * 0.06}px rgba(0,106,72,0.4)) drop-shadow(0 0 ${px * 0.1 + recentBoost * 28}px rgba(51,193,148,${0.25 + recentBoost * 0.4}))`,
                  }}
                >
                  <img
                    src={character.seed ?? character.grown}
                    alt=""
                    loading="lazy"
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      opacity: hasCrossfade ? 1 - growth : 1,
                      filter: character.seed ? "none" : crystalFilter,
                      transition: "opacity .6s ease-out, filter .6s ease-out",
                    }}
                  />
                  {hasCrossfade && (
                    <img
                      src={character.grown}
                      alt=""
                      loading="lazy"
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        opacity: growth,
                        transition: "opacity .6s ease-out",
                      }}
                    />
                  )}
                </div>
              ) : useImage ? (
                <div
                  style={{
                    width: gemBox,
                    height: gemBox,
                    borderRadius: "50%",
                    overflow: "hidden",
                    position: "relative",
                    background: `radial-gradient(circle at 50% 46%, ${PAL.bright} 0%, ${PAL.mid} 42%, ${PAL.deep} 76%, #03201a 100%)`,
                    boxShadow: `0 ${px * 0.05}px ${px * 0.18}px rgba(0,106,72,${0.35 + recentBoost * 0.2}), 0 0 ${px * 0.12 + recentBoost * 30}px rgba(51,193,148,${0.3 + recentBoost * 0.4})`,
                    transition: "box-shadow .6s ease-out",
                  }}
                >
                  <img
                    src={imageSrc}
                    alt=""
                    loading="lazy"
                    onError={() => setImageFailed(true)}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      filter: crystalFilter,
                      transition: "filter .6s ease-out",
                    }}
                  />
                </div>
              ) : (
                useGem && (
                  <LayeredCssGem
                    size={gemBox}
                    vitality={vitality}
                    surge={surge}
                    reducedMotion={reducedMotion}
                  />
                )
              )}

              {/* splash ripple */}
              {phase === "splash" && !reducedMotion && (
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: gemBox,
                    height: gemBox,
                    borderRadius: "50%",
                    border: "2px solid rgba(240,206,134,0.9)",
                    animation: "bovRipple .55s ease-out forwards",
                    pointerEvents: "none",
                  }}
                />
              )}
              {/* bloom surge ring */}
              {(phase === "bloom" || phase === "count") && !reducedMotion && (
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: gemBox * 1.1,
                    height: gemBox * 1.1,
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle, rgba(51,193,148,0.5), transparent 65%)",
                    animation: "bovSurge .7s ease-out forwards",
                    pointerEvents: "none",
                  }}
                />
              )}
              {/* celebrate sparkle crown */}
              {phase === "celebrate" &&
                !reducedMotion &&
                Array.from({ length: 10 }).map((_, i) => {
                  const a = (i / 10) * Math.PI * 2;
                  const d = gemBox * 0.62;
                  return (
                    <span
                      key={i}
                      aria-hidden
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background:
                          i % 2 ? "var(--gold-bright, #F0CE86)" : "#fff",
                        boxShadow: "0 0 6px var(--gold, #D9A94B)",
                        ["--bx" as string]: Math.cos(a) * d + "px",
                        ["--by" as string]: Math.sin(a) * d + "px",
                        animation: "bovBurst .7s ease-out forwards",
                        pointerEvents: "none",
                      }}
                    />
                  );
                })}
              {/* touch bursts */}
              {bursts.map((b) => (
                <span key={b.id} aria-hidden>
                  {b.sparks.map((s) => (
                    <span
                      key={s.i}
                      style={{
                        position: "absolute",
                        left: b.x + "%",
                        top: b.y + "%",
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: s.gold
                          ? "var(--gold-bright, #F0CE86)"
                          : "#fff",
                        boxShadow: s.gold
                          ? "0 0 6px var(--gold, #D9A94B)"
                          : "0 0 5px #fff",
                        ["--bx" as string]: s.bx + "px",
                        ["--by" as string]: s.by + "px",
                        animation: "bovBurst .7s ease-out forwards",
                        pointerEvents: "none",
                      }}
                    />
                  ))}
                </span>
              ))}

              {/* droplet falling */}
              {phase === "drop" && !reducedMotion && (
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: 16,
                    height: 20,
                    zIndex: 5,
                    animation: "bovDrop .6s cubic-bezier(.5,0,.9,.5) forwards",
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 20,
                      background:
                        "radial-gradient(circle at 38% 30%, #fff, var(--gold-bright, #F0CE86) 45%, var(--gold, #D9A94B) 100%)",
                      borderRadius: "50% 50% 50% 50% / 64% 64% 40% 40%",
                      boxShadow: "0 0 10px var(--gold, #D9A94B)",
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* mist */}
      <div
        className="anim-loop reduced-hide"
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 120,
          background:
            "radial-gradient(120% 80% at 50% 100%, rgba(51,193,148,0.22), transparent 70%)",
          filter: "blur(12px)",
          animation: reducedMotion
            ? "none"
            : "bovMist 14s ease-in-out infinite alternate",
          zIndex: 1,
        }}
      />
    </div>
  );
};

export default LivingEmerald;
