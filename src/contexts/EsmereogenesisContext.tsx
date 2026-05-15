/**
 * EsmereogenesisContext
 *
 * Holds the user's savings-with-purpose plans, persists them to localStorage,
 * and exposes mutation helpers (create, add aporte, claim, delete, demo seed).
 *
 * Persistence pattern follows useCart.ts:
 *   - useState init reads from localStorage synchronously (avoids first-paint blink)
 *   - useEffect mirrors state back to localStorage on every change
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { STORAGE_KEYS } from "../constants/storage-keys";
import type {
  Aporte,
  AporteType,
  DurationMonths,
  EsmereoHubMetrics,
  EsmereoPlan,
  EsmereoStorage,
} from "../types/esmereogenesis";
import {
  buildEmptyPlan,
  computeStreak,
  makeAporteId,
  seedDemoPlans,
  simulateAbonoBackend,
  weekStartISO,
} from "../data/esmereo-mock";
import type { TreasureItem } from "../types";
import { createLogger } from "../utils/logger";

const log = createLogger("Esmereo");

interface EsmereogenesisContextValue {
  plans: EsmereoPlan[];
  activePlans: EsmereoPlan[];
  completedPlans: EsmereoPlan[];
  hubMetrics: EsmereoHubMetrics;
  audioEnabled: boolean;
  hapticEnabled: boolean;
  hasPlans: boolean;

  /** Get an existing plan by id */
  getPlanById: (planId: string) => EsmereoPlan | undefined;
  /** Get an active plan attached to a given product (only the most-recent active) */
  getActivePlanForItem: (itemId: number) => EsmereoPlan | undefined;
  /** Get the most-recent plan for a given product regardless of state */
  getLatestPlanForItem: (itemId: number) => EsmereoPlan | undefined;

  /** Create and persist a new plan rooted on a product. Optional nickname
   *  surfaces in the hub card + garden header. */
  createPlan: (
    item: TreasureItem,
    durationMonths: DurationMonths,
    nickname?: string,
  ) => EsmereoPlan;
  /** Add an aporte. Returns the new total, completion flag, and graceApplied
   *  (true when this aporte just consumed a "Lluvia generosa" to save the
   *  streak through a missed week). */
  addAporte: (
    planId: string,
    amountCOP: number,
    type?: AporteType,
  ) => Promise<{
    plan: EsmereoPlan;
    aporte: Aporte;
    justCompleted: boolean;
    graceApplied: boolean;
  }>;
  /** Reverse a single aporte by id. Recomputes total + streak from scratch.
   *  If the plan was 'completed' and the removal drops total below target, the
   *  plan reverts to 'growing'. Refuses if the plan is already 'claimed'
   *  (the asesor handoff has happened, undoing would be dishonest). */
  removeAporte: (planId: string, aporteId: string) => void;
  /** Mark a completed plan as claimed (mock asesor handoff) */
  claimPlan: (planId: string) => void;
  /** Permanently remove a plan */
  deletePlan: (planId: string) => void;
  /** Seed three demo plans for showcase */
  seedDemo: (items: TreasureItem[]) => EsmereoPlan[];
  /** Wipe everything and reset audio/haptic toggles */
  resetAll: () => void;

  setAudioEnabled: (next: boolean) => void;
  setHapticEnabled: (next: boolean) => void;
}

const EsmereogenesisContext = createContext<
  EsmereogenesisContextValue | undefined
>(undefined);

const STORAGE_VERSION = 1 as const;

function readStoredPlans(): EsmereoPlan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ESMEREO_PLANS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as EsmereoStorage;
    if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.plans))
      return [];
    return parsed.plans;
  } catch (err) {
    log.error("Failed to read stored esmereo plans", err);
    return [];
  }
}

function readBoolPref(key: string, defaultValue: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return raw === "true";
  } catch {
    return defaultValue;
  }
}

function writeBoolPref(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? "true" : "false");
  } catch {
    /* swallow quota errors */
  }
}

function persistPlans(plans: EsmereoPlan[]): void {
  try {
    const data: EsmereoStorage = { version: STORAGE_VERSION, plans };
    localStorage.setItem(STORAGE_KEYS.ESMEREO_PLANS, JSON.stringify(data));
  } catch (err) {
    log.error("Failed to persist esmereo plans", err);
  }
}

export const EsmereogenesisProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [plans, setPlans] = useState<EsmereoPlan[]>(() => readStoredPlans());
  const [audioEnabled, setAudioEnabledState] = useState<boolean>(() =>
    readBoolPref(STORAGE_KEYS.ESMEREO_AUDIO_ENABLED, true),
  );
  const [hapticEnabled, setHapticEnabledState] = useState<boolean>(() =>
    readBoolPref(STORAGE_KEYS.ESMEREO_HAPTIC_ENABLED, true),
  );

  // Mirror plans to localStorage on every change
  useEffect(() => {
    persistPlans(plans);
  }, [plans]);

  const setAudioEnabled = useCallback((next: boolean) => {
    setAudioEnabledState(next);
    writeBoolPref(STORAGE_KEYS.ESMEREO_AUDIO_ENABLED, next);
  }, []);

  const setHapticEnabled = useCallback((next: boolean) => {
    setHapticEnabledState(next);
    writeBoolPref(STORAGE_KEYS.ESMEREO_HAPTIC_ENABLED, next);
  }, []);

  const getPlanById = useCallback(
    (planId: string) => plans.find((p) => p.id === planId),
    [plans],
  );

  const getActivePlanForItem = useCallback(
    (itemId: number) =>
      plans
        .filter(
          (p) =>
            p.itemId === itemId &&
            p.state !== "completed" &&
            p.state !== "claimed",
        )
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0],
    [plans],
  );

  const getLatestPlanForItem = useCallback(
    (itemId: number) =>
      plans
        .filter((p) => p.itemId === itemId)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0],
    [plans],
  );

  const createPlan = useCallback(
    (
      item: TreasureItem,
      durationMonths: DurationMonths,
      nickname?: string,
    ): EsmereoPlan => {
      const fresh = buildEmptyPlan(item, durationMonths, nickname);
      setPlans((prev) => [...prev, fresh]);
      log.info("Plan created", {
        id: fresh.id,
        itemId: fresh.itemId,
        durationMonths,
        hasNickname: Boolean(fresh.nickname),
      });
      return fresh;
    },
    [],
  );

  const addAporte = useCallback(
    async (
      planId: string,
      amountCOP: number,
      type: AporteType = "free",
    ): Promise<{
      plan: EsmereoPlan;
      aporte: Aporte;
      justCompleted: boolean;
      graceApplied: boolean;
    }> => {
      const existing = plans.find((p) => p.id === planId);
      if (!existing) {
        throw new Error(`Plan ${planId} not found`);
      }
      if (existing.state === "claimed") {
        throw new Error(`Plan ${planId} already claimed`);
      }

      // Simulate backend processing
      await simulateAbonoBackend();

      const aporte: Aporte = {
        id: makeAporteId(),
        planId,
        amountCOP,
        createdAt: new Date().toISOString(),
        type,
      };

      const newAportes = [...existing.aportes, aporte];
      const newTotal = Math.min(
        existing.totalAbonadoCOP + amountCOP,
        existing.targetCOP,
      );
      const justCompleted =
        existing.totalAbonadoCOP < existing.targetCOP &&
        newTotal >= existing.targetCOP;
      const nextState = justCompleted ? "completed" : "growing";
      const nowISO = new Date().toISOString();
      // Carry the previous grace cooldown forward so the same gap can't keep
      // re-consuming grace on every recompute (e.g., after a page refresh).
      const { state: streak, graceApplied } = computeStreak(newAportes, {
        lastGraceAt: existing.streak.lastGraceAt,
      });

      const updated: EsmereoPlan = {
        ...existing,
        totalAbonadoCOP: newTotal,
        aportes: newAportes,
        streak,
        state: nextState,
        updatedAt: nowISO,
        completedAt: justCompleted ? nowISO : existing.completedAt,
      };

      setPlans((prev) => prev.map((p) => (p.id === planId ? updated : p)));
      log.info("Aporte added", {
        planId,
        amountCOP,
        progress: newTotal / existing.targetCOP,
        justCompleted,
        graceApplied,
      });
      return { plan: updated, aporte, justCompleted, graceApplied };
    },
    [plans],
  );

  const removeAporte = useCallback((planId: string, aporteId: string) => {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== planId) return p;
        if (p.state === "claimed") {
          log.warn("removeAporte refused — plan already claimed", { planId });
          return p;
        }
        const idx = p.aportes.findIndex((a) => a.id === aporteId);
        if (idx === -1) {
          log.warn("removeAporte: aporte not found", { planId, aporteId });
          return p;
        }
        const newAportes = p.aportes.filter((a) => a.id !== aporteId);
        const newTotal = newAportes.reduce((sum, a) => sum + a.amountCOP, 0);
        // Recompute streak from scratch (no prevState carry — undoing the
        // aporte that consumed grace must also free the cooldown).
        const { state: streak } = computeStreak(newAportes);
        const wasCompleted = p.state === "completed";
        const stillCompleted = newTotal >= p.targetCOP;
        const nextState = wasCompleted && !stillCompleted ? "growing" : p.state;
        return {
          ...p,
          aportes: newAportes,
          totalAbonadoCOP: newTotal,
          streak,
          state: nextState,
          updatedAt: new Date().toISOString(),
          completedAt:
            wasCompleted && !stillCompleted ? undefined : p.completedAt,
        };
      }),
    );
    log.info("Aporte removed", { planId, aporteId });
  }, []);

  const claimPlan = useCallback((planId: string) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? { ...p, state: "claimed", claimedAt: new Date().toISOString() }
          : p,
      ),
    );
    log.info("Plan claimed", { planId });
  }, []);

  const deletePlan = useCallback((planId: string) => {
    setPlans((prev) => prev.filter((p) => p.id !== planId));
    log.info("Plan deleted", { planId });
  }, []);

  const seedDemo = useCallback((items: TreasureItem[]): EsmereoPlan[] => {
    const demos = seedDemoPlans(items);
    if (demos.length === 0) {
      log.warn("seedDemo aborted: no usable treasure items");
      return [];
    }
    setPlans((prev) => [...prev, ...demos]);
    return demos;
  }, []);

  const resetAll = useCallback(() => {
    setPlans([]);
    log.info("Esmereo state reset");
  }, []);

  const activePlans = useMemo(
    () => plans.filter((p) => p.state !== "completed" && p.state !== "claimed"),
    [plans],
  );
  const completedPlans = useMemo(
    () => plans.filter((p) => p.state === "completed" || p.state === "claimed"),
    [plans],
  );

  const hubMetrics = useMemo<EsmereoHubMetrics>(() => {
    const totalAbonadoCOP = plans.reduce(
      (sum, p) => sum + p.totalAbonadoCOP,
      0,
    );
    const totalTargetCOP = plans.reduce((sum, p) => sum + p.targetCOP, 0);
    const globalProgress =
      totalTargetCOP > 0 ? totalAbonadoCOP / totalTargetCOP : 0;
    const thisWeek = weekStartISO();
    const globalStreak = activePlans
      .filter((p) => p.streak.lastAporteWeekStart === thisWeek)
      .reduce((max, p) => Math.max(max, p.streak.currentWeeks), 0);

    return {
      activeCount: activePlans.length,
      completedCount: completedPlans.length,
      totalAbonadoCOP,
      totalTargetCOP,
      globalProgress,
      globalStreak,
    };
  }, [plans, activePlans, completedPlans]);

  const value = useMemo<EsmereogenesisContextValue>(
    () => ({
      plans,
      activePlans,
      completedPlans,
      hubMetrics,
      audioEnabled,
      hapticEnabled,
      hasPlans: plans.length > 0,
      getPlanById,
      getActivePlanForItem,
      getLatestPlanForItem,
      createPlan,
      addAporte,
      removeAporte,
      claimPlan,
      deletePlan,
      seedDemo,
      resetAll,
      setAudioEnabled,
      setHapticEnabled,
    }),
    [
      plans,
      activePlans,
      completedPlans,
      hubMetrics,
      audioEnabled,
      hapticEnabled,
      getPlanById,
      getActivePlanForItem,
      getLatestPlanForItem,
      createPlan,
      addAporte,
      removeAporte,
      claimPlan,
      deletePlan,
      seedDemo,
      resetAll,
      setAudioEnabled,
      setHapticEnabled,
    ],
  );

  return (
    <EsmereogenesisContext.Provider value={value}>
      {children}
    </EsmereogenesisContext.Provider>
  );
};

export function useEsmereogenesis(): EsmereogenesisContextValue {
  const ctx = useContext(EsmereogenesisContext);
  if (!ctx) {
    throw new Error(
      "useEsmereogenesis must be used within EsmereogenesisProvider",
    );
  }
  return ctx;
}
