/**
 * useAbonoSimulation
 *
 * Thin wrapper around `EsmereogenesisContext.addAporte` that adds:
 *   - tracking event emission
 *   - URL flag override (?mockFail=1) for failure simulation
 *   - haptic vibration helpers
 *
 * The cinematic animation itself is owned by `<AbonoCinematic />`.
 * This hook only deals with state mutation + side effects orchestration.
 */

import { useCallback, useState } from "react";
import { useEsmereogenesis } from "../contexts/EsmereogenesisContext";
import { useTrackingDispatch } from "../contexts/TrackingContext";
import type { Aporte, AporteType, EsmereoPlan } from "../types/esmereogenesis";
import { createLogger } from "../utils/logger";

const log = createLogger("AbonoSim");

export interface AbonoOutcome {
  plan: EsmereoPlan;
  aporte: Aporte;
  justCompleted: boolean;
  /** True when this aporte consumed a "Lluvia generosa" grace to keep the
   *  streak alive through a missed week. Propagated from
   *  EsmereogenesisContext.addAporte. */
  graceApplied: boolean;
}

export interface AbonoTriggerInput {
  planId: string;
  amountCOP: number;
  type?: AporteType;
}

export interface UseAbonoSimulationReturn {
  trigger: (input: AbonoTriggerInput) => Promise<AbonoOutcome | null>;
  isProcessing: boolean;
  lastOutcome: AbonoOutcome | null;
  lastError: Error | null;
  vibrate: (pattern: number | number[]) => void;
}

function shouldForceFail(): boolean {
  try {
    return new URLSearchParams(window.location.search).get("mockFail") === "1";
  } catch {
    return false;
  }
}

export function useAbonoSimulation(): UseAbonoSimulationReturn {
  const { addAporte, hapticEnabled } = useEsmereogenesis();
  const { track } = useTrackingDispatch();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastOutcome, setLastOutcome] = useState<AbonoOutcome | null>(null);
  const [lastError, setLastError] = useState<Error | null>(null);

  const vibrate = useCallback(
    (pattern: number | number[]) => {
      if (!hapticEnabled) return;
      try {
        if (
          typeof navigator !== "undefined" &&
          typeof navigator.vibrate === "function"
        ) {
          navigator.vibrate(pattern);
        }
      } catch {
        /* not supported, swallow */
      }
    },
    [hapticEnabled],
  );

  const trigger = useCallback(
    async ({ planId, amountCOP, type = "free" }: AbonoTriggerInput) => {
      setIsProcessing(true);
      setLastError(null);
      try {
        if (shouldForceFail()) {
          throw new Error("mock_failure_via_url_flag");
        }
        const outcome = await addAporte(planId, amountCOP, type);
        setLastOutcome(outcome);

        track("esmereo_aporte_added", {
          planId,
          amountCOP,
          type,
          progress: outcome.plan.totalAbonadoCOP / outcome.plan.targetCOP,
          streak: outcome.plan.streak.currentWeeks,
          justCompleted: outcome.justCompleted,
        });

        if (outcome.justCompleted) {
          track("esmereo_completed", {
            planId,
            durationDays: Math.round(
              (Date.now() - new Date(outcome.plan.createdAt).getTime()) /
                (1000 * 60 * 60 * 24),
            ),
            totalAportes: outcome.plan.aportes.length,
            longestStreak: outcome.plan.streak.longestWeeks,
          });
        }

        return outcome;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        log.error("Abono simulation failed", error);
        setLastError(error);
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [addAporte, track],
  );

  return { trigger, isProcessing, lastOutcome, lastError, vibrate };
}
