/**
 * EsmereogenesisGardenPage
 *
 * Route: /esmereogenesis/:planId
 * The full immersive garden for a single plan. Orchestrates:
 *   - LivingEmerald + ProgressGardenRing (visual centerpiece)
 *   - Suggested rhythm + streak readout
 *   - "Regar mi esmeralda" CTA → triggers AbonoCinematic
 *   - Completed state → "Reclamar tu Esmeralda" → ClaimSheet
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  IconButton,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { ChevronLeft, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { useEsmereogenesis } from "../../contexts/EsmereogenesisContext";
import { useNotification } from "../../contexts/NotificationContext";
import { useCurrencyFormat } from "../../contexts/CurrencyContext";
import { useAbonoSimulation } from "../../hooks/useAbonoSimulation";
import { LivingEmerald } from "../../components/esmereogenesis/LivingEmerald";
import { ProgressGardenRing } from "../../components/esmereogenesis/ProgressGardenRing";
import { StreakIndicator } from "../../components/esmereogenesis/StreakIndicator";
import { AporteHistoryTimeline } from "../../components/esmereogenesis/AporteHistoryTimeline";
import { ClaimSheet } from "../../components/esmereogenesis/ClaimSheet";
import { AbonoCinematic } from "../../components/esmereogenesis/AbonoCinematic";
import { OnboardingCoachmarks } from "../../components/esmereogenesis/OnboardingCoachmarks";
import { GardenHero } from "../../components/esmereogenesis/GardenHero";
import { AporteSlider } from "../../components/esmereogenesis/AporteSlider";
import { CompletedCelebration } from "../../components/esmereogenesis/CompletedCelebration";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import { STORAGE_KEYS } from "../../constants/storage-keys";
import { emeraldCore } from "../../design-system/tokens/colors";
import { meshGradients } from "../../design-system/tokens/gradients";
import { whiteAlpha } from "../../design-system/utils/colorUtils";
import { useEsmereoThemeTokens } from "../../hooks/useEsmereoThemeTokens";
import type { EsmereoPlan } from "../../types/esmereogenesis";

const VISIBLE_HISTORY = 4;

interface CinematicData {
  plan: EsmereoPlan;
  amount: number;
  isCompletion: boolean;
  previousProgress: number;
  /** True when this aporte just consumed a Lluvia generosa grace — surfaces
   *  as a celebratory toast once the cinematic finishes. */
  graceApplied: boolean;
}

const EsmereogenesisGardenPage: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { notify } = useNotification();
  const { formatCurrency } = useCurrencyFormat();
  const { getPlanById, deletePlan } = useEsmereogenesis();
  const { trigger, isProcessing } = useAbonoSimulation();
  const theme = useTheme();
  // Desktop gets a larger centerpiece so the gem doesn't drown in white space
  // when the container expands to its lg/xl maxWidth.
  const isLargeUp = useMediaQuery(theme.breakpoints.up("lg"));
  const emeraldSize = isLargeUp ? "xl" : "lg";
  const ringSize = isLargeUp ? 400 : 320;
  const {
    isLight,
    headerBg,
    cardBg,
    cardBorder,
    headerBorder,
    cardShadow,
    titleColor,
    overlineColor,
    headlineColor,
    bodyColor,
    mutedColor,
  } = useEsmereoThemeTokens();

  const plan = planId ? getPlanById(planId) : undefined;

  const [aporteOpen, setAporteOpen] = useState(false);
  const [aporteAmount, setAporteAmount] = useState<number>(0);
  const [cinematic, setCinematic] = useState<CinematicData | null>(null);
  const [claimOpen, setClaimOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  // First-visit onboarding — initialised synchronously from localStorage so
  // the dialog doesn't pop in a frame late (consistent with the rest of the
  // app's anti-blink pattern).
  const [onboardingOpen, setOnboardingOpen] = useState<boolean>(() => {
    try {
      return !localStorage.getItem(STORAGE_KEYS.ESMEREO_ONBOARDING_SEEN);
    } catch {
      return false;
    }
  });
  const dismissOnboarding = () => {
    setOnboardingOpen(false);
    try {
      localStorage.setItem(STORAGE_KEYS.ESMEREO_ONBOARDING_SEEN, "1");
    } catch {
      /* private mode etc. — silent */
    }
  };

  // Sync slider value with current remaining whenever plan progress changes
  useEffect(() => {
    if (!plan) return;
    const remainingNow = plan.targetCOP - plan.totalAbonadoCOP;
    const initial = Math.min(
      plan.weeklySuggestedCOP,
      Math.max(10_000, remainingNow),
    );
    setAporteAmount(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    plan?.id,
    plan?.totalAbonadoCOP,
    plan?.weeklySuggestedCOP,
    plan?.targetCOP,
  ]);

  // Redirect if plan disappears
  useEffect(() => {
    if (planId && !plan) {
      notify("Esa Esmereogénesis no existe", "warning");
      navigate("/esmereogenesis", { replace: true });
    }
  }, [planId, plan, navigate, notify]);

  const progress = useMemo(
    () =>
      plan && plan.targetCOP > 0 ? plan.totalAbonadoCOP / plan.targetCOP : 0,
    [plan],
  );

  const remaining = useMemo(
    () => (plan ? Math.max(0, plan.targetCOP - plan.totalAbonadoCOP) : 0),
    [plan],
  );

  const isCompleted = plan?.state === "completed" || plan?.state === "claimed";
  const isClaimed = plan?.state === "claimed";

  if (!plan) return null;

  const productName = plan.productSnapshot.nombre
    .replace(/^L:.*?\s/, "")
    .replace(/^L:/, "")
    .trim();

  // Extracted so the failure toast can re-fire the exact same aporte via its
  // "Reintentar" action — the user shouldn't have to re-open the slider and
  // re-pick the amount after a transient error.
  const submitAporte = async (amount: number) => {
    const previousProgress = progress;
    const willComplete = plan.totalAbonadoCOP + amount >= plan.targetCOP;
    const isSuggested = amount === plan.weeklySuggestedCOP;
    const result = await trigger({
      planId: plan.id,
      amountCOP: amount,
      type: isSuggested ? "suggested" : "free",
    });
    if (!result) {
      notify(
        "No pudimos regar tu esmeralda. Algo falló en el proceso.",
        "error",
        {
          action: {
            label: "Reintentar",
            onClick: () => {
              void submitAporte(amount);
            },
          },
        },
      );
      return;
    }
    setCinematic({
      plan: result.plan,
      amount,
      isCompletion: result.justCompleted || willComplete,
      previousProgress,
      graceApplied: result.graceApplied,
    });
    setAporteOpen(false);
  };

  const handleAporteConfirm = () => {
    if (aporteAmount <= 0 || aporteAmount > remaining) {
      notify("Ajusta el monto antes de regar tu esmeralda", "warning");
      return;
    }
    void submitAporte(aporteAmount);
  };

  const handleCinematicComplete = () => {
    // Forest-style streak forgiveness — fire the celebratory toast once the
    // cinematic returns the user to the garden, so the two moments don't
    // collide. Suppressed on completion (the eclosion ceremony is its own
    // climax; a "rain delay" toast would dilute it).
    if (cinematic?.graceApplied && !cinematic.isCompletion) {
      notify(
        "Lluvia generosa · esta semana cuenta. Tu racha sigue creciendo.",
        "success",
        { durationMs: 5000 },
      );
    }
    setCinematic(null);
    setAporteOpen(false);
    // Slider value will auto-reset via the useEffect that watches plan.totalAbonadoCOP
  };

  const handleDelete = () => setDeleteConfirmOpen(true);
  const confirmDelete = () => {
    setDeleteConfirmOpen(false);
    deletePlan(plan.id);
    notify("Esmereogénesis eliminada", "info");
    navigate("/esmereogenesis", { replace: true });
  };

  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "100vh",
        background: meshGradients.emerald,
        // Honour bottom navigation + iOS home indicator so the timeline never
        // hides behind the global tab bar.
        pb: "calc(env(safe-area-inset-bottom, 0px) + 96px)",
      }}
    >
      {/* Header — feature identity strip, theme-aware glass. */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          pt: "calc(env(safe-area-inset-top, 0px) + 12px)",
          pb: 1.5,
          position: "sticky",
          top: 0,
          background: headerBg,
          backdropFilter: "blur(22px) saturate(160%)",
          WebkitBackdropFilter: "blur(22px) saturate(160%)",
          borderBottom: `1px solid ${headerBorder}`,
          boxShadow: isLight
            ? `0 1px 0 ${whiteAlpha(0.32)} inset`
            : `0 1px 0 ${alpha(emeraldCore.light, 0.12)} inset`,
          zIndex: 10,
        }}
      >
        <IconButton
          onClick={() => navigate("/esmereogenesis")}
          aria-label="Volver al jardín"
          sx={{ color: titleColor }}
        >
          <ChevronLeft />
        </IconButton>
        <Typography
          variant="h6"
          sx={{
            fontFamily: '"Playfair Display", serif',
            fontWeight: 700,
            color: titleColor,
            letterSpacing: 0.4,
            textShadow: isLight
              ? "none"
              : `0 2px 12px ${alpha(emeraldCore.dark, 0.6)}`,
          }}
        >
          Esmereogénesis
        </Typography>
        <IconButton
          onClick={handleDelete}
          aria-label="Eliminar plan"
          sx={{ color: alpha(titleColor, 0.78) }}
        >
          <Trash2 size={18} />
        </IconButton>
      </Box>

      <Box
        sx={{
          // Responsive container: phone is fluid, desktop breathes up to 1080px.
          // Previous hardcoded 720 left a thin mobile column on 1920px screens.
          maxWidth: { xs: "100%", sm: 720, lg: 920, xl: 1080 },
          mx: "auto",
          px: { xs: 2, md: 3, lg: 4 },
          py: 3,
        }}
      >
        <GardenHero nickname={plan.nickname} productName={productName} />

        {/* Two-column body at lg+ so the wider container actually breathes
            instead of leaving a single 920-px column stranded in the middle
            of a 1920-px screen. Below lg, everything stacks single-column. */}
        <Box
          sx={{
            display: { xs: "block", lg: "grid" },
            gridTemplateColumns: { lg: "minmax(0, 1fr) minmax(0, 1fr)" },
            columnGap: { lg: 4 },
            alignItems: { lg: "start" },
          }}
        >
          {/* Centerpiece — LivingEmerald + ring + numbers welded into a single
            stat group so the ring, the gem and the percentage read as one
            coherent ceremony, not three stacked widgets. */}
          <Box
            component={motion.section}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              mb: { xs: 3, md: 4, lg: 0 },
            }}
          >
            <Box
              sx={{
                position: "relative",
                // Fluid sizing so the ring breathes on phones (≤360 px) without
                // blowing past the viewport, and never goes bigger than the spec.
                width: "clamp(260px, 78vw, 320px)",
                aspectRatio: "1 / 1",
                mb: 2,
              }}
            >
              <ProgressGardenRing
                progress={progress}
                size={ringSize}
                strokeWidth={10}
                isComplete={isCompleted}
              />
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <LivingEmerald
                  imageSrc={plan.productSnapshot.imagen}
                  corte={plan.productSnapshot.corte}
                  progress={progress}
                  state={plan.state}
                  size={emeraldSize}
                  isPulsing={!isCompleted}
                />
              </Box>
            </Box>

            {/* Numbers — overline + dramatic % + amount stay tight to the gem
              so they read as the gem's own caption rather than dead space. */}
            <Typography
              variant="overline"
              sx={{
                color: overlineColor,
                fontWeight: 700,
                letterSpacing: 1.6,
                opacity: isLight ? 0.85 : 0.78,
                mb: 0.25,
              }}
            >
              {isCompleted ? "Eclosionada" : "Tu progreso"}
            </Typography>
            <Typography
              sx={{
                fontFamily: '"Playfair Display", serif',
                fontWeight: 700,
                color: headlineColor,
                lineHeight: 0.95,
                fontSize: { xs: 56, sm: 64, md: 72 },
                fontVariantNumeric: "tabular-nums",
                letterSpacing: -1,
                textShadow: isLight
                  ? `0 4px 18px ${alpha(emeraldCore.primary, 0.18)}`
                  : `0 4px 22px ${alpha(emeraldCore.dark, 0.7)}`,
              }}
            >
              {Math.round(progress * 100)}%
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: bodyColor,
                mt: 0.75,
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: 0.2,
                textAlign: "center",
              }}
            >
              {formatCurrency(plan.totalAbonadoCOP)}{" "}
              <Box component="span" sx={{ opacity: 0.7 }}>
                / {formatCurrency(plan.targetCOP)}
              </Box>
            </Typography>
          </Box>

          {/* Right column at lg+ — controls (rhythm, streak, regar/slider OR
            eclosionada) plus history. Below lg, this Box is just a passthrough
            so the visual flow stays vertical. */}
          <Box>
            {!isCompleted ? (
              <>
                {/* Rhythm + streak — theme-aware glass. */}
                <Box
                  sx={{
                    background: cardBg,
                    backdropFilter: "blur(16px) saturate(160%)",
                    WebkitBackdropFilter: "blur(16px) saturate(160%)",
                    border: `1px solid ${cardBorder}`,
                    borderRadius: 3,
                    p: { xs: 2, md: 2.5 },
                    mb: { xs: 2.5, md: 3 },
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    gap: { xs: 1.5, sm: 2 },
                    alignItems: { xs: "stretch", sm: "center" },
                    justifyContent: "space-between",
                    boxShadow: cardShadow,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="overline"
                      sx={{
                        color: overlineColor,
                        fontWeight: 700,
                        letterSpacing: 1.4,
                        opacity: isLight ? 0.85 : 0.78,
                      }}
                    >
                      Ritmo sugerido
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        color: headlineColor,
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                        lineHeight: 1.2,
                        textShadow: isLight
                          ? "none"
                          : `0 2px 12px ${alpha(emeraldCore.dark, 0.5)}`,
                      }}
                    >
                      {formatCurrency(plan.weeklySuggestedCOP)}{" "}
                      <Typography
                        component="span"
                        variant="body2"
                        sx={{ color: mutedColor, fontWeight: 500 }}
                      >
                        / semana
                      </Typography>
                    </Typography>
                  </Box>
                  <Box sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}>
                    <StreakIndicator
                      weeks={plan.streak.currentWeeks}
                      longest={plan.streak.longestWeeks}
                    />
                  </Box>
                </Box>

                {/* Regar CTA — wrapped in an emerald glow halo so it reads as
                the sacred act of the page, not just another pill button. */}
                <AporteSlider
                  open={aporteOpen}
                  plan={plan}
                  aporteAmount={aporteAmount}
                  setAporteAmount={setAporteAmount}
                  remaining={remaining}
                  isProcessing={isProcessing}
                  onOpen={() => setAporteOpen(true)}
                  onCancel={() => {
                    setAporteOpen(false);
                    setAporteAmount(plan.weeklySuggestedCOP);
                  }}
                  onConfirm={handleAporteConfirm}
                />
              </>
            ) : (
              <CompletedCelebration
                isClaimed={isClaimed}
                onClaim={() => setClaimOpen(true)}
              />
            )}

            {/* History — theme-aware glass. */}
            <Box
              sx={{
                background: cardBg,
                backdropFilter: "blur(14px) saturate(150%)",
                WebkitBackdropFilter: "blur(14px) saturate(150%)",
                border: `1px solid ${cardBorder}`,
                borderRadius: 3,
                p: 2.5,
                boxShadow: cardShadow,
              }}
            >
              <Typography
                variant="overline"
                sx={{
                  display: "block",
                  color: overlineColor,
                  fontWeight: 700,
                  letterSpacing: 1.4,
                  mb: 1.5,
                  opacity: isLight ? 0.85 : 0.85,
                }}
              >
                Tus aportes ({plan.aportes.length})
              </Typography>
              <AporteHistoryTimeline
                aportes={plan.aportes}
                limit={VISIBLE_HISTORY}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Cinematic overlay */}
      {cinematic && (
        <AbonoCinematic
          plan={cinematic.plan}
          aporteAmount={cinematic.amount}
          isCompletion={cinematic.isCompletion}
          previousProgress={cinematic.previousProgress}
          open={true}
          onComplete={handleCinematicComplete}
        />
      )}

      {/* Claim sheet */}
      <ClaimSheet
        open={claimOpen}
        onClose={() => setClaimOpen(false)}
        plan={plan}
      />

      {/* Destructive confirmation — replaces window.confirm so focus, styling
          and a11y stay inside the design system. */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="¿Eliminar esta Esmereogénesis?"
        message="Perderás el progreso, los aportes y la racha. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />

      {/* First-visit 3-step explainer (aporte sugerido · racha · eclosión).
          Dismiss persists to localStorage so it never reappears. */}
      <OnboardingCoachmarks open={onboardingOpen} onClose={dismissOnboarding} />
    </Box>
  );
};

export default EsmereogenesisGardenPage;
