/**
 * EsmereogenesisGardenPage — Bóveda "Jardín" (single plan).
 *
 * Route: /esmereogenesis/:planId
 * Re-skinned to the approved prototype (docs/boveda-prototype PlanScreen): the
 * living gem + ring centerpiece, big serif %, suggested-rhythm chips + "Regar"
 * CTA, the stone's ficha, and the watering bitácora. All data/handlers (aporte
 * trigger, cinematic, claim, delete, onboarding, streak-grace toast) preserved.
 */

import { useEffect, useMemo, useState } from "react";
import { Trash2, Droplet } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEsmereogenesis } from "../../contexts/EsmereogenesisContext";
import { useNotification } from "../../contexts/NotificationContext";
import { useCurrencyFormat } from "../../contexts/CurrencyContext";
import { useTrackingDispatch } from "../../contexts/TrackingContext";
import { useAbonoSimulation } from "../../hooks/useAbonoSimulation";
import { useEsmereoTheme } from "../../contexts/EsmereoThemeContext";
import { LivingEmerald } from "../../components/esmereogenesis/LivingEmerald";
import StageChip from "../../components/esmereogenesis/StageChip";
import EsmereoThemeToggle from "../../components/esmereogenesis/EsmereoThemeToggle";
import {
  TopBar,
  Kicker,
  StreakFlame,
  WaterButton,
  AmountChips,
} from "../../components/esmereogenesis/BovedaUI";
import { useCountUp } from "../../components/esmereogenesis/useCountUp";
import { useEsmereoBp } from "../../components/esmereogenesis/useEsmereoBp";
import EsmereoSideNav from "../../components/esmereogenesis/EsmereoSideNav";
import { ClaimSheet } from "../../components/esmereogenesis/ClaimSheet";
import { AbonoCinematic } from "../../components/esmereogenesis/AbonoCinematic";
import { OnboardingCoachmarks } from "../../components/esmereogenesis/OnboardingCoachmarks";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import { stageForProgress } from "../../data/esmereo-mock";
import { STORAGE_KEYS } from "../../constants/storage-keys";
import type { EsmereoPlan } from "../../types/esmereogenesis";
import "../../components/esmereogenesis/boveda.css";

const VISIBLE_HISTORY = 4;
const MESES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];
const fmtAporteDate = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
};

interface CinematicData {
  plan: EsmereoPlan;
  amount: number;
  isCompletion: boolean;
  previousProgress: number;
  graceApplied: boolean;
}

const EsmereogenesisGardenPage = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { notify } = useNotification();
  const { formatCurrency } = useCurrencyFormat();
  const { track } = useTrackingDispatch();
  const { mode } = useEsmereoTheme();
  const { getPlanById, deletePlan } = useEsmereogenesis();
  const { trigger, isProcessing } = useAbonoSimulation();
  const bp = useEsmereoBp();

  const plan = planId ? getPlanById(planId) : undefined;

  const [aporteAmount, setAporteAmount] = useState<number>(0);
  const [cinematic, setCinematic] = useState<CinematicData | null>(null);
  const [claimOpen, setClaimOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [lastWateredAt, setLastWateredAt] = useState<number | undefined>();
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

  // Sync the picked amount with the suggested rhythm whenever the plan changes.
  useEffect(() => {
    if (!plan) return;
    const remainingNow = Math.max(0, plan.targetCOP - plan.totalAbonadoCOP);
    // Never default above what's left (a < 10k remainder must not snap to 10k).
    setAporteAmount(Math.min(plan.weeklySuggestedCOP, remainingNow));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    plan?.id,
    plan?.totalAbonadoCOP,
    plan?.weeklySuggestedCOP,
    plan?.targetCOP,
  ]);

  // Redirect if the plan disappears (invalid :planId, deleted, etc.)
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
  const displayAbonado = useCountUp(plan?.totalAbonadoCOP ?? 0);

  if (!plan) return null;

  const isCompleted = plan.state === "completed" || plan.state === "claimed";
  const isClaimed = plan.state === "claimed";
  const stage = stageForProgress(progress, plan.state);
  const productName = plan.productSnapshot.nombre
    .replace(/^L:.*?\s/, "")
    .replace(/^L:/, "")
    .trim();
  const weeksLeft =
    plan.weeklySuggestedCOP > 0
      ? Math.ceil(remaining / plan.weeklySuggestedCOP)
      : 0;
  const dispPct = plan.targetCOP > 0 ? displayAbonado / plan.targetCOP : 0;

  // Ficha rows from whatever the snapshot actually froze (origin/cert may be absent).
  const ficha: [string, string][] = [
    ["Ritmo sugerido", `${formatCurrency(plan.weeklySuggestedCOP)} / sem`],
    ...(remaining > 0
      ? ([
          ["Faltan", `${weeksLeft} ${weeksLeft === 1 ? "semana" : "semanas"}`],
        ] as [string, string][])
      : []),
    ...(plan.productSnapshot.peso
      ? ([["Peso", String(plan.productSnapshot.peso)]] as [string, string][])
      : []),
    ...(plan.productSnapshot.color
      ? ([["Color", plan.productSnapshot.color]] as [string, string][])
      : []),
    ...(plan.productSnapshot.corte
      ? ([["Talla", plan.productSnapshot.corte]] as [string, string][])
      : []),
  ];

  const log = [...plan.aportes].reverse().slice(0, VISIBLE_HISTORY);

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
            onClick: () => void submitAporte(amount),
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
  };

  const handleAporteConfirm = () => {
    if (aporteAmount <= 0 || aporteAmount > remaining) {
      notify("Ajusta el monto antes de regar tu esmeralda", "warning");
      return;
    }
    void submitAporte(aporteAmount);
  };

  const handleCinematicComplete = () => {
    if (cinematic?.graceApplied && !cinematic.isCompletion) {
      notify(
        "Lluvia generosa · esta semana cuenta. Tu racha sigue creciendo.",
        "success",
        { durationMs: 5000 },
      );
    }
    setLastWateredAt(Date.now());
    setCinematic(null);
  };

  const confirmDelete = () => {
    setDeleteConfirmOpen(false);
    deletePlan(plan.id);
    notify("Esmereogénesis eliminada", "info");
    navigate("/esmereogenesis", { replace: true });
  };

  const overlineStyle = {
    fontSize: 9.5,
    letterSpacing: "0.34em",
    textTransform: "uppercase" as const,
    color: "var(--ink-faint)",
  };

  return (
    <div
      className="bov-root bov-screen"
      data-theme={mode}
      data-bp={bp}
      style={{
        minHeight: "100vh",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)",
        paddingLeft: bp === "desktop" ? 92 : 0,
      }}
    >
      <div className="bov-vignette" />
      <EsmereoSideNav />
      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: bp === "mobile" ? 480 : bp === "ipad" ? 640 : 720,
          margin: "0 auto",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)",
        }}
      >
        <TopBar
          title="Jardín"
          sub="Esmereogénesis"
          onBack={() => navigate("/esmereogenesis")}
          backLabel="Volver al jardín"
          right={
            <div style={{ display: "flex", alignItems: "center" }}>
              <EsmereoThemeToggle />
              <button
                className="tap"
                onClick={() => setDeleteConfirmOpen(true)}
                aria-label="Eliminar plan"
                style={{
                  width: 38,
                  height: 38,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--ink-faint)",
                }}
              >
                <Trash2 size={18} strokeWidth={1.6} />
              </button>
            </div>
          }
        />

        {/* stage + gem + name */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ position: "relative", zIndex: 3, marginBottom: -6 }}>
            <StageChip stage={stage} />
          </div>
          <LivingEmerald
            imageSrc={plan.productSnapshot.imagen}
            corte={plan.productSnapshot.corte}
            progress={progress}
            state={plan.state}
            size={206}
            staged
            isPulsing={!isCompleted}
            recentAporteAt={lastWateredAt}
            onPet={() => track("esmereo_gem_petted", { planId: plan.id })}
          />
          <div
            style={{
              textAlign: "center",
              marginTop: -30,
              zIndex: 3,
              position: "relative",
            }}
          >
            <Kicker style={{ fontSize: 8.5 }}>Tu esmeralda</Kicker>
            <div
              className="serif"
              style={{ fontSize: 27, marginTop: 6, color: "var(--ink)" }}
            >
              {productName}
            </div>
          </div>
        </div>

        {/* big figure */}
        <div
          style={{
            textAlign: "center",
            marginTop: 14,
            position: "relative",
            zIndex: 3,
          }}
          aria-live="polite"
        >
          <div style={overlineStyle}>
            {isCompleted ? "Eclosionada" : "Tu progreso"}
          </div>
          <div
            className="serif"
            style={{
              fontSize: 72,
              lineHeight: 0.86,
              marginTop: 6,
              color: "var(--ink)",
              textShadow: "0 6px 34px rgba(11,92,70,0.6)",
            }}
          >
            {Math.round(dispPct * 100)}
            <span style={{ fontSize: 28, color: "var(--gold-bright)" }}>%</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 8 }}>
            {formatCurrency(displayAbonado)}{" "}
            <span style={{ color: "var(--ink-faint)" }}>
              / {formatCurrency(plan.targetCOP)}
            </span>
          </div>
        </div>

        {/* rhythm + CTA */}
        <div
          style={{ padding: "20px 24px 0", position: "relative", zIndex: 3 }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <StreakFlame weeks={plan.streak.currentWeeks} />
          </div>
          {remaining <= 0 ? (
            isClaimed ? (
              <WaterButton busy label="Esmeralda reclamada" />
            ) : (
              <WaterButton
                label="Reclamar mi esmeralda"
                onClick={() => setClaimOpen(true)}
              />
            )
          ) : (
            <>
              <AmountChips
                amount={aporteAmount}
                suggested={plan.weeklySuggestedCOP}
                remaining={remaining}
                onPick={setAporteAmount}
              />
              <div style={{ marginTop: 12 }}>
                <WaterButton
                  onClick={handleAporteConfirm}
                  busy={isProcessing}
                  sub={`Ritmo sugerido ${formatCurrency(plan.weeklySuggestedCOP)} / semana`}
                />
              </div>
            </>
          )}
        </div>

        {/* ficha de la piedra */}
        <div
          style={{ padding: "24px 26px 0", position: "relative", zIndex: 3 }}
        >
          {ficha.map(([k, v], i) => (
            <div
              key={k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "13px 0",
                borderTop: i === 0 ? "none" : "1px solid var(--line)",
              }}
            >
              <span
                style={{
                  fontSize: 9.5,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--ink-faint)",
                }}
              >
                {k}
              </span>
              <span
                className="serif"
                style={{
                  fontSize: 15,
                  whiteSpace: "nowrap",
                  color: "var(--ink)",
                }}
              >
                {v}
              </span>
            </div>
          ))}
        </div>

        {/* bitácora de riego */}
        <div
          style={{ padding: "22px 26px 0", position: "relative", zIndex: 3 }}
        >
          <Kicker style={{ fontSize: 8.5, marginBottom: 8 }}>
            Bitácora de riego · {plan.aportes.length}{" "}
            {plan.aportes.length === 1 ? "gota" : "gotas"}
          </Kicker>
          {log.length > 0 ? (
            log.map((a, i) => {
              const week = plan.aportes.length - i;
              return (
                <div
                  key={a.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "11px 0",
                    borderTop: i === 0 ? "none" : "1px solid var(--surface-2)",
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "rgba(47,174,134,0.16)",
                      border: "1px solid var(--accent-line)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                      flexShrink: 0,
                    }}
                  >
                    <Droplet
                      size={13}
                      strokeWidth={1.6}
                      color="var(--em-bright)"
                    />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--ink)",
                      }}
                    >
                      Semana {week}
                    </div>
                    <div style={{ fontSize: 10.5, color: "var(--ink-faint)" }}>
                      {fmtAporteDate(a.createdAt)} ·{" "}
                      {a.type === "suggested"
                        ? "Aporte sugerido"
                        : "Aporte libre"}
                    </div>
                  </div>
                  <span
                    className="serif"
                    style={{ fontSize: 14, color: "var(--ink-soft)" }}
                  >
                    +{formatCurrency(a.amountCOP)}
                  </span>
                </div>
              );
            })
          ) : (
            <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>
              Aún no has regado tu esmeralda. La primera gota la despierta.
            </div>
          )}
        </div>
      </div>

      {/* Cinematic overlay */}
      {cinematic && (
        <AbonoCinematic
          plan={cinematic.plan}
          aporteAmount={cinematic.amount}
          isCompletion={cinematic.isCompletion}
          previousProgress={cinematic.previousProgress}
          open
          onComplete={handleCinematicComplete}
          onClaim={() => {
            setCinematic(null);
            setClaimOpen(true);
          }}
        />
      )}

      <ClaimSheet
        open={claimOpen}
        onClose={() => setClaimOpen(false)}
        plan={plan}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="¿Eliminar esta Esmereogénesis?"
        message="Perderás el progreso, los aportes y la racha. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />

      <OnboardingCoachmarks open={onboardingOpen} onClose={dismissOnboarding} />
    </div>
  );
};

export default EsmereogenesisGardenPage;
