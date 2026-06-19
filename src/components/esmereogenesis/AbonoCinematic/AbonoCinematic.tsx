/**
 * AbonoCinematic
 *
 * Full-screen cinematic takeover that plays when the user confirms an aporte.
 * Renders the LivingEmerald at center and orchestrates phased visual layers
 * (droplet, wash, reveal, bloom, progress count-up, confirmation, release).
 *
 * The state mutation (addAporte) MUST already have happened by the time this
 * component is mounted with `active=true`. This component only renders the
 * ceremony based on the new plan state.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography, alpha } from "@mui/material";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Droplet, Sparkles, Check } from "lucide-react";
import { LivingEmerald } from "../LivingEmerald";
import type { LivingEmeraldPhase } from "../LivingEmerald";
import type { EsmereoPlan } from "../../../types/esmereogenesis";
import "../boveda.css";
import { useAbonoSequence } from "./useAbonoSequence";
import { emeraldCore, goldAccent } from "../../../design-system/tokens/colors";
import {
  emeraldGradients,
  radialGradients,
} from "../../../design-system/tokens/gradients";
import { whiteAlpha } from "../../../design-system/utils/colorUtils";
import { useCurrencyFormat } from "../../../contexts/CurrencyContext";
import { useEsmereogenesis } from "../../../contexts/EsmereogenesisContext";
import { useTrackingDispatch } from "../../../contexts/TrackingContext";

interface AbonoCinematicProps {
  /** Plan AFTER the aporte has been applied. */
  plan: EsmereoPlan;
  /** Aporte that was just added (used for amount display). */
  aporteAmount: number;
  /** True when this aporte crossed the 100% threshold. */
  isCompletion: boolean;
  /** Show the cinematic. When false → idle. */
  open: boolean;
  /** Called once the release phase finishes. */
  onComplete: () => void;
  /** Optional pre-aporte progress for animating the count-up correctly. */
  previousProgress?: number;
  /** Completion only: tap "Reclamar mi esmeralda" in the Eclosión ceremony. */
  onClaim?: () => void;
}

export const AbonoCinematic: React.FC<AbonoCinematicProps> = ({
  plan,
  aporteAmount,
  isCompletion,
  open,
  onComplete,
  previousProgress,
  onClaim,
}) => {
  const reducedMotion = useReducedMotion();
  const { hapticEnabled } = useEsmereogenesis();
  const { track } = useTrackingDispatch();
  const { formatCurrency } = useCurrencyFormat();

  const targetProgress =
    plan.targetCOP > 0 ? plan.totalAbonadoCOP / plan.targetCOP : 0;
  const fromProgress = useMemo(
    () =>
      previousProgress ??
      Math.max(0, targetProgress - aporteAmount / plan.targetCOP),
    [previousProgress, targetProgress, aporteAmount, plan.targetCOP],
  );
  const [animatedProgress, setAnimatedProgress] = useState(fromProgress);
  const [animatedAbonado, setAnimatedAbonado] = useState(
    plan.totalAbonadoCOP - aporteAmount,
  );
  // a11y: text fed into a visually-hidden aria-live region. Updated only at
  // the phases that carry meaningful new information — keeps announcements
  // sparse so screen readers don't read every frame.
  const [announcement, setAnnouncement] = useState("");

  const triggerHaptic = (pattern: number | number[]) => {
    if (!hapticEnabled) return;
    try {
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.vibrate === "function"
      ) {
        navigator.vibrate(pattern);
      }
    } catch {
      /* swallow */
    }
  };

  const { phase, skip } = useAbonoSequence({
    active: open,
    reducedMotion: !!reducedMotion,
    isCompletion,
    // Completion holds on the Eclosión ceremony until the user claims/dismisses.
    holdAtEclosion: true,
    onComplete,
    onPhaseChange: (next) => {
      switch (next) {
        case "anticipate":
          triggerHaptic(5);
          break;
        case "droplet":
          // First meaningful announcement — sets the SR-user's expectation
          // about what amount is being watered before the visual splash.
          setAnnouncement(
            `Regando ${formatCurrency(aporteAmount)} en tu esmeralda.`,
          );
          break;
        case "wash":
          triggerHaptic(15);
          break;
        case "progress":
          // Count-up animation 800 ms — matches phase duration. For reduced
          // motion this is also the first phase, so seed the announcement
          // here in case droplet never fired.
          rampProgress();
          if (!announcement) {
            setAnnouncement(
              `Regando ${formatCurrency(aporteAmount)} en tu esmeralda.`,
            );
          }
          break;
        case "confirm":
          triggerHaptic(25);
          setAnnouncement(
            `${formatCurrency(aporteAmount)} aportado. ${Math.round(
              targetProgress * 100,
            )} por ciento completado.`,
          );
          break;
        case "eclosion":
          triggerHaptic(isCompletion ? [25, 30, 35] : 25);
          setAnnouncement(
            "Tu esmeralda ha cobrado vida. Está lista para reclamar.",
          );
          break;
      }
    },
  });

  // Single rAF handle for the count-up ramp so a new ramp, a skip, or an unmount
  // can cancel any in-flight loop instead of leaving an orphan running setState.
  const rampRef = useRef<number | null>(null);
  const cancelRamp = () => {
    if (rampRef.current != null) {
      cancelAnimationFrame(rampRef.current);
      rampRef.current = null;
    }
  };

  const rampProgress = () => {
    cancelRamp();
    const start = performance.now();
    const duration = 850;
    const startProg = fromProgress;
    const endProg = targetProgress;
    const startAbon = plan.totalAbonadoCOP - aporteAmount;
    const endAbon = plan.totalAbonadoCOP;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.max(0, Math.min(1, elapsed / duration));
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOutQuad
      setAnimatedProgress(startProg + (endProg - startProg) * eased);
      setAnimatedAbonado(Math.round(startAbon + (endAbon - startAbon) * eased));
      if (t < 1) {
        rampRef.current = requestAnimationFrame(tick);
      } else {
        rampRef.current = null;
      }
    };
    rampRef.current = requestAnimationFrame(tick);
  };

  // Stop any in-flight count-up loop when the cinematic unmounts.
  useEffect(() => cancelRamp, []);

  const handleSkip = () => {
    if (phase === "idle" || phase === "release") return;
    track("esmereo_animation_skipped", { phase });
    cancelRamp();
    setAnimatedProgress(targetProgress);
    setAnimatedAbonado(plan.totalAbonadoCOP);
    skip();
  };

  // Reset internal progress when sequence starts
  useEffect(() => {
    if (open) {
      setAnimatedProgress(fromProgress);
      setAnimatedAbonado(plan.totalAbonadoCOP - aporteAmount);
      // Clear stale announcement so the new sequence reads fresh.
      setAnnouncement("");
    }
  }, [open, fromProgress, plan.totalAbonadoCOP, aporteAmount]);

  // Typewriter for the Eclosión headline. Reveals once the ceremony shows;
  // reduced motion renders it whole.
  const ECLOSION_HEADLINE = "Tu esmeralda ha cobrado vida";
  const [typed, setTyped] = useState("");
  const ceremonyActive =
    open && (phase === "eclosion" || (phase === "release" && isCompletion));
  useEffect(() => {
    if (!ceremonyActive) {
      setTyped("");
      return;
    }
    if (reducedMotion) {
      setTyped(ECLOSION_HEADLINE);
      return;
    }
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(ECLOSION_HEADLINE.slice(0, i));
      if (i >= ECLOSION_HEADLINE.length) window.clearInterval(id);
    }, 55);
    return () => window.clearInterval(id);
  }, [ceremonyActive, reducedMotion]);

  if (!open) return null;

  // Phase visibility helpers
  const isVisible = phase !== "idle";
  const showDroplet = phase === "droplet";
  const showWash = phase === "wash" || phase === "reveal";
  const showBloomBoost = phase === "bloom";
  const showProgressNumbers =
    phase === "progress" ||
    phase === "confirm" ||
    phase === "eclosion" ||
    phase === "release";
  const showConfirmation = phase === "confirm" || phase === "release";
  const showEclosion =
    phase === "eclosion" || (phase === "release" && isCompletion);

  // Map the ritual phase to the gem's own internal phase visuals (the prototype's
  // drop / splash / bloom / count / celebrate), so the LivingEmerald brightens,
  // ripples and blooms in sync with the takeover layers.
  const gemPhase: LivingEmeraldPhase =
    phase === "droplet"
      ? "drop"
      : phase === "wash" || phase === "reveal"
        ? "splash"
        : phase === "bloom"
          ? "bloom"
          : phase === "progress"
            ? "count"
            : phase === "confirm" || phase === "eclosion"
              ? "celebrate"
              : "idle";

  return (
    <AnimatePresence>
      {isVisible && (
        <Box
          component={motion.div}
          className="bov-root bov-screen"
          role="dialog"
          aria-modal="true"
          aria-label="Animación de aporte en curso. Toca o presiona Escape para saltar."
          tabIndex={-1}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          onClick={handleSkip}
          onKeyDown={(e) => {
            // Escape skips the ritual; during the held Eclosión it's a no-op
            // (the ceremony has explicit Reclamar / Seguir buttons).
            if (e.key === "Escape" && !showEclosion) {
              e.preventDefault();
              handleSkip();
            }
          }}
          // Inline position beats the imported `.bov-root { position: relative }`
          // (equal-specificity classes — CSS source order would otherwise win),
          // so the takeover always covers the screen.
          style={{ position: "fixed", inset: 0, zIndex: 1500 }}
          sx={{
            background: "var(--app-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            overflow: "hidden",
          }}
        >
          {/* a11y: visually-hidden live region that announces the meaningful
              phase transitions to screen readers. Lives at the top so the
              announcement node mounts before any visual layer. */}
          <Box
            role="status"
            aria-live="polite"
            aria-atomic="true"
            sx={{
              position: "absolute",
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: "hidden",
              clip: "rect(0 0 0 0)",
              whiteSpace: "nowrap",
              border: 0,
            }}
          >
            {announcement}
          </Box>

          {/* Backdrop dimming */}
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(circle at 50% 45%, ${alpha(emeraldCore.dark, 0.05)} 0%, ${alpha(emeraldCore.dark, 0.65)} 75%)`,
              pointerEvents: "none",
            }}
          />

          {/* Spotlight */}
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 520,
              height: 520,
              transform: "translate(-50%, -50%)",
              background: radialGradients.emeraldSpotlight,
              filter: "blur(20px)",
              opacity: showEclosion ? 1 : 0.7,
              transition: "opacity 0.6s ease-out",
              pointerEvents: "none",
            }}
          />

          {/* Center stage — anchored to the LivingEmerald wrapper so
              droplet/wash/numbers compose around the gem instead of around
              arbitrary % of the takeover. Gap is tightened so the gem stays
              the dominant subject of every phase. */}
          <Box
            sx={{
              position: "relative",
              width: "min(360px, 90vw)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: { xs: 2, sm: 2.5 },
              textAlign: "center",
              // Pad-top reserves space for the droplet so it doesn't get
              // chopped on short viewports.
              pt: { xs: 8, sm: 10 },
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Eclosion halo (only if completing) */}
            {showEclosion && (
              <Box
                component={motion.div}
                aria-hidden
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0.6, 1.4, 1.2], opacity: [0, 1, 0.8] }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: 320,
                  height: 320,
                  transform: "translate(-50%, -50%)",
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${alpha(goldAccent.primary, 0.6)} 0%, ${alpha(goldAccent.primary, 0)} 70%)`,
                  filter: "blur(8px)",
                  pointerEvents: "none",
                }}
              />
            )}

            {/* Droplet — falls from above the stage and lands just at the
                top of the LivingEmerald. Sized in pixel offsets so it lands
                on the gem regardless of viewport height. */}
            <AnimatePresence>
              {showDroplet && (
                <Box
                  component={motion.div}
                  initial={{ y: -120, opacity: 0, scale: 0.6 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 30, opacity: 0, scale: 0.4 }}
                  transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    color: goldAccent.primary,
                    filter: `drop-shadow(0 0 14px ${alpha(goldAccent.primary, 0.7)})`,
                    pointerEvents: "none",
                  }}
                >
                  <Droplet size={36} fill={goldAccent.primary} />
                </Box>
              )}
            </AnimatePresence>

            {/* Wash splash — perfectly centered over the LivingEmerald
                (which lives at the visual middle of the center stage). */}
            <AnimatePresence>
              {showWash && (
                <Box
                  component={motion.div}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1.6, opacity: [0, 1, 0] }}
                  transition={{ duration: 0.9 }}
                  sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "min(260px, 78vw)",
                    aspectRatio: "1 / 1",
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${alpha(goldAccent.light, 0.55)} 0%, ${alpha(emeraldCore.primary, 0.28)} 45%, transparent 80%)`,
                    pointerEvents: "none",
                    zIndex: 0,
                  }}
                />
              )}
            </AnimatePresence>

            {/* Center: LivingEmerald (ascends + blooms on Eclosión) */}
            <Box
              component={motion.div}
              animate={{
                scale: showBloomBoost
                  ? [1, 1.05, 1]
                  : showEclosion
                    ? [1, 1.08, 1.04]
                    : 1,
                y: showEclosion && !reducedMotion ? [0, -14, -10] : 0,
              }}
              transition={{
                duration: showEclosion ? 1.6 : 0.8,
                ease: "easeInOut",
              }}
              sx={{ position: "relative" }}
            >
              {/* Expanding golden rings + central glow */}
              {showEclosion && !reducedMotion && (
                <Box
                  aria-hidden
                  sx={{ position: "absolute", inset: 0, pointerEvents: "none" }}
                >
                  {[0, 0.5, 1].map((d, i) => (
                    <Box
                      key={i}
                      sx={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        width: 200,
                        height: 200,
                        borderRadius: "50%",
                        border: `1.5px solid ${alpha(goldAccent.light, 0.6)}`,
                        animation: `ecloRing 2.6s ease-out ${d}s infinite`,
                      }}
                    />
                  ))}
                  <Box
                    sx={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      width: 300,
                      height: 300,
                      borderRadius: "50%",
                      background: `radial-gradient(circle, ${alpha(goldAccent.primary, 0.5)}, ${alpha(emeraldCore.primary, 0.18)} 40%, transparent 70%)`,
                      filter: "blur(10px)",
                      animation: "ecloGlow 3s ease-in-out infinite",
                    }}
                  />
                </Box>
              )}
              <LivingEmerald
                imageSrc={plan.productSnapshot.imagen}
                corte={plan.productSnapshot.corte}
                progress={animatedProgress}
                state={
                  isCompletion && phase === "eclosion"
                    ? "completed"
                    : plan.state
                }
                size="lg"
                phase={gemPhase}
                isPulsing={false}
                recentAporteAt={Date.now()}
              />
            </Box>

            {/* Progress numbers */}
            <AnimatePresence>
              {showProgressNumbers && (
                <Box
                  component={motion.div}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  sx={{
                    color: "#FFFFFF",
                  }}
                >
                  <Typography
                    variant="h2"
                    sx={{
                      fontFamily: '"Playfair Display", serif',
                      fontWeight: 700,
                      lineHeight: 1,
                      textShadow: `0 4px 18px ${alpha(emeraldCore.dark, 0.7)}`,
                    }}
                  >
                    {Math.round(animatedProgress * 100)}%
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ opacity: 0.85, mt: 0.5, fontWeight: 600 }}
                  >
                    {formatCurrency(animatedAbonado)} /{" "}
                    {formatCurrency(plan.targetCOP)}
                  </Typography>
                </Box>
              )}
            </AnimatePresence>

            {/* Confirmation chip */}
            <AnimatePresence>
              {showConfirmation && !isCompletion && (
                <Box
                  component={motion.div}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1,
                    px: 2,
                    py: 1,
                    borderRadius: 999,
                    background: emeraldGradients.intense,
                    color: "#FFFFFF",
                    fontWeight: 700,
                    boxShadow: `0 12px 28px ${alpha(emeraldCore.dark, 0.5)}`,
                  }}
                >
                  <Check size={16} />
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, color: "inherit" }}
                  >
                    + {formatCurrency(aporteAmount)} abonado
                  </Typography>
                </Box>
              )}
            </AnimatePresence>

            {/* Eclosion message — the climax of the entire feature, so it
                gets a softer overline + Playfair italic headline that breathes
                instead of competing with the gem. */}
            <AnimatePresence>
              {showEclosion && (
                <Box
                  component={motion.div}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                  sx={{
                    color: "#FFFFFF",
                    textAlign: "center",
                    px: 1,
                  }}
                >
                  <Box
                    component={motion.div}
                    animate={{ rotate: [0, 360] }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    sx={{
                      display: "inline-flex",
                      mb: 1.25,
                      color: goldAccent.primary,
                    }}
                  >
                    <Sparkles size={36} />
                  </Box>
                  <Typography
                    variant="overline"
                    sx={{
                      display: "block",
                      color: alpha(goldAccent.light, 0.95),
                      fontWeight: 700,
                      letterSpacing: 2.4,
                      mb: 0.75,
                    }}
                  >
                    Eclosión
                  </Typography>
                  <Typography
                    aria-label={ECLOSION_HEADLINE}
                    sx={{
                      fontFamily: '"Playfair Display", serif',
                      fontWeight: 700,
                      fontStyle: "italic",
                      fontSize: { xs: 28, sm: 34 },
                      lineHeight: 1.15,
                      minHeight: "1.15em",
                      textShadow: `0 4px 22px ${alpha(emeraldCore.dark, 0.75)}`,
                    }}
                  >
                    {typed || " "}
                  </Typography>

                  {/* Reclamar / seguir admirándola */}
                  <Box
                    sx={{
                      mt: 3,
                      width: "100%",
                      maxWidth: 360,
                      mx: "auto",
                      px: 1,
                    }}
                  >
                    <button
                      className="tap"
                      onClick={() => (onClaim ? onClaim() : onComplete())}
                      style={{
                        width: "100%",
                        borderRadius: 999,
                        padding: "17px",
                        background: "var(--claim-bg)",
                        boxShadow: "0 0 40px -6px var(--gold)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: "var(--claim-ink)",
                          letterSpacing: "0.02em",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Reclamar mi esmeralda
                      </span>
                    </button>
                    <button
                      onClick={onComplete}
                      style={{
                        width: "100%",
                        marginTop: 12,
                        padding: "8px",
                        fontSize: 12.5,
                        color: "var(--ink-faint)",
                        letterSpacing: "0.04em",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Seguir admirándola
                    </button>
                  </Box>
                </Box>
              )}
            </AnimatePresence>
          </Box>

          {/* Skip hint — hidden during the held Eclosión (the ceremony has its
              own Reclamar / Seguir buttons). */}
          {phase !== "release" && !showEclosion && (
            <Box
              component={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.65 }}
              transition={{ delay: 1.5, duration: 0.6 }}
              sx={{
                position: "absolute",
                bottom: "calc(env(safe-area-inset-bottom, 0) + 24px)",
                left: "50%",
                transform: "translateX(-50%)",
                color: whiteAlpha(0.85),
                pointerEvents: "none",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 1,
              }}
            >
              Toca para continuar
            </Box>
          )}
        </Box>
      )}
    </AnimatePresence>
  );
};

export default AbonoCinematic;
