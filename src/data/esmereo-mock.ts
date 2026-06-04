/**
 * Esmereogénesis — mock data generator and transaction simulator.
 *
 * Frontend-only prototype. No real financial integration.
 */

import type {
  Aporte,
  AporteType,
  DurationMonths,
  EsmereoPlan,
  EsmereoStage,
  EsmereoState,
  ProductSnapshot,
} from "../types/esmereogenesis";
import type { TreasureItem } from "../types";

const MS_IN_WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * Map a 0..1 progress (and optional plan state) to a Bóveda growth stage.
 * Thresholds per the handoff spec §4: 0 → semilla, 1–24% → brote,
 * 25–69% → creciendo, 70–99% → radiante, 100% → eclosión. A completed/claimed
 * state forces "eclosion" even if float rounding lands just under 100%.
 */
export function stageForProgress(
  progress: number,
  state?: EsmereoState,
): EsmereoStage {
  if (state === "completed" || state === "claimed") return "eclosion";
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  if (pct <= 0) return "semilla";
  if (pct < 25) return "brote";
  if (pct < 70) return "creciendo";
  if (pct < 100) return "radiante";
  return "eclosion";
}

/** Returns the ISO timestamp of the Monday 00:00 of the week containing `date`. */
export function weekStartISO(
  date: Date | string | number = Date.now(),
): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}

export function makePlanId(): string {
  return `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function makeAporteId(): string {
  return `aporte_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function snapshotProduct(item: TreasureItem): ProductSnapshot {
  return {
    nombre: item.nombre,
    imagen: item.imagen ?? item.thumbnailUrl ?? "",
    precioCOP: item.precioCOP,
    peso: item.peso,
    color: item.color,
    // Cut/shape drives the Esmereogénesis cut-character; falls back to photo
    // when absent or unmapped.
    corte: item.talla?.trim() || undefined,
  };
}

export function calcWeeklySuggested(
  targetCOP: number,
  durationMonths: DurationMonths,
): number {
  // Approximate 4 weeks per month for the rhythm suggestion
  return Math.round(targetCOP / (durationMonths * 4));
}

export function buildEmptyPlan(
  item: TreasureItem,
  durationMonths: DurationMonths,
  nickname?: string,
): EsmereoPlan {
  const now = new Date().toISOString();
  const trimmedNickname = nickname?.trim();
  return {
    id: makePlanId(),
    itemId: item.item,
    productSnapshot: snapshotProduct(item),
    nickname:
      trimmedNickname && trimmedNickname.length > 0
        ? trimmedNickname
        : undefined,
    targetCOP: item.precioCOP,
    totalAbonadoCOP: 0,
    durationMonths,
    weeklySuggestedCOP: calcWeeklySuggested(item.precioCOP, durationMonths),
    createdAt: now,
    updatedAt: now,
    state: "empty",
    aportes: [],
    streak: {
      currentWeeks: 0,
      longestWeeks: 0,
      lastAporteWeekStart: "",
    },
  };
}

interface SyntheticAportesParams {
  planId: string;
  count: number;
  totalCOP: number;
  spreadWeeks: number;
  endingDaysAgo?: number;
}

/** Generates aportes spaced one per week ending some days ago for demo realism. */
function buildSyntheticAportes({
  planId,
  count,
  totalCOP,
  spreadWeeks,
  endingDaysAgo = 0,
}: SyntheticAportesParams): Aporte[] {
  if (count <= 0) return [];
  const baseAmount = Math.round(totalCOP / count);
  const remainder = totalCOP - baseAmount * count;
  const aportes: Aporte[] = [];
  const endTimestamp = Date.now() - endingDaysAgo * 24 * 60 * 60 * 1000;
  const stepMs = (spreadWeeks * MS_IN_WEEK) / Math.max(1, count - 1);

  for (let i = 0; i < count; i++) {
    const ts = endTimestamp - (count - 1 - i) * stepMs;
    const amount = i === count - 1 ? baseAmount + remainder : baseAmount;
    const type: AporteType = i % 3 === 0 ? "free" : "suggested";
    aportes.push({
      id: `${planId}_synth_${i}`,
      planId,
      amountCOP: amount,
      createdAt: new Date(ts).toISOString(),
      type,
    });
  }
  return aportes;
}

/** 30-day window during which a single grace can save a streak. */
const GRACE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export interface ComputeStreakResult {
  state: EsmereoPlan["streak"];
  /** True when this computation crossed a 2-week gap and *just* consumed a
   *  grace for it (i.e., the most recent aporte saved a streak). */
  graceApplied: boolean;
}

/** Compute streak state given a sorted list of aportes (older→newer).
 *
 *  `prevState.lastGraceAt` carries forward the cooldown of any previously
 *  consumed grace — without it, refreshing the page would let the next
 *  computation grant grace again for a gap that already used one. */
export function computeStreak(
  aportes: Aporte[],
  prevState?: { lastGraceAt?: string },
): ComputeStreakResult {
  if (aportes.length === 0) {
    return {
      state: {
        currentWeeks: 0,
        longestWeeks: 0,
        lastAporteWeekStart: "",
        lastGraceAt: prevState?.lastGraceAt,
      },
      graceApplied: false,
    };
  }
  const weekStarts = Array.from(
    new Set(aportes.map((a) => weekStartISO(a.createdAt))),
  ).sort();

  let longest = 1;
  let current = 1;
  let lastGraceAt = prevState?.lastGraceAt;
  let graceJustApplied = false;

  for (let i = 1; i < weekStarts.length; i++) {
    const prev = new Date(weekStarts[i - 1]).getTime();
    const cur = new Date(weekStarts[i]).getTime();
    const gapWeeks = Math.round((cur - prev) / MS_IN_WEEK);

    if (gapWeeks === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else if (gapWeeks === 2) {
      // Single missed week — eligible for Lluvia generosa if no grace was
      // consumed within the last 30 days (relative to the saved week).
      const graceAvailable =
        !lastGraceAt ||
        cur - new Date(lastGraceAt).getTime() >= GRACE_WINDOW_MS;
      if (graceAvailable) {
        current += 1;
        longest = Math.max(longest, current);
        lastGraceAt = weekStarts[i];
        if (i === weekStarts.length - 1) graceJustApplied = true;
      } else {
        current = 1;
      }
    } else {
      // Gap larger than 2 weeks — grace can't bridge it.
      current = 1;
    }
  }

  // Verify currentWeeks is still active (last week ≥ this week or last week)
  const lastWeek = weekStarts[weekStarts.length - 1];
  const thisWeek = weekStartISO();
  const lastWeekTs = new Date(lastWeek).getTime();
  const thisWeekTs = new Date(thisWeek).getTime();
  const weeksSince = Math.round((thisWeekTs - lastWeekTs) / MS_IN_WEEK);

  return {
    state: {
      currentWeeks: weeksSince <= 1 ? current : 0,
      longestWeeks: longest,
      lastAporteWeekStart: lastWeek,
      lastGraceAt,
    },
    graceApplied: graceJustApplied,
  };
}

interface DemoPlanRecipe {
  /** Approximate progress 0-1 */
  progress: number;
  durationMonths: DurationMonths;
  aporteCount: number;
  spreadWeeks: number;
  endingDaysAgo: number;
}

const DEMO_RECIPES: DemoPlanRecipe[] = [
  // Just sown
  {
    progress: 0.05,
    durationMonths: 6,
    aporteCount: 1,
    spreadWeeks: 1,
    endingDaysAgo: 1,
  },
  // Mid-progress, healthy streak
  {
    progress: 0.47,
    durationMonths: 6,
    aporteCount: 6,
    spreadWeeks: 5,
    endingDaysAgo: 0,
  },
  // Almost there
  {
    progress: 0.92,
    durationMonths: 9,
    aporteCount: 14,
    spreadWeeks: 13,
    endingDaysAgo: 2,
  },
];

/**
 * Picks 3 representative TreasureItems for the demo seed.
 * Prefers items with imagen + valid price + DISPONIBLE.
 */
function pickDemoItems(items: TreasureItem[]): TreasureItem[] {
  const usable = items.filter(
    (it) => !!it.imagen && it.precioCOP > 0 && it.estado === "DISPONIBLE",
  );
  if (usable.length === 0) return [];
  // Shuffle deterministically by item number
  const shuffled = [...usable].sort((a, b) => (a.item % 7) - (b.item % 7));
  return shuffled.slice(0, 3);
}

/**
 * Generates 3 demo plans illustrating distinct progress states (5%, 47%, 92%)
 * for showcase purposes. Returns [] if no usable treasure items are available.
 */
export function seedDemoPlans(items: TreasureItem[]): EsmereoPlan[] {
  const picks = pickDemoItems(items);
  if (picks.length === 0) return [];

  return picks.slice(0, DEMO_RECIPES.length).map((item, idx) => {
    const recipe = DEMO_RECIPES[idx];
    const plan = buildEmptyPlan(item, recipe.durationMonths);
    const totalAbonado = Math.round(plan.targetCOP * recipe.progress);
    const aportes = buildSyntheticAportes({
      planId: plan.id,
      count: recipe.aporteCount,
      totalCOP: totalAbonado,
      spreadWeeks: recipe.spreadWeeks,
      endingDaysAgo: recipe.endingDaysAgo,
    });
    const { state: streak } = computeStreak(aportes);
    return {
      ...plan,
      totalAbonadoCOP: totalAbonado,
      state: totalAbonado === 0 ? "empty" : "growing",
      aportes,
      streak,
      updatedAt: aportes[aportes.length - 1]?.createdAt ?? plan.updatedAt,
    };
  });
}

/**
 * Simulates a backend processing delay for an aporte.
 * Real implementation would POST to a backend endpoint.
 */
export async function simulateAbonoBackend(
  delayMs = 300,
  shouldFail = false,
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  if (shouldFail) {
    throw new Error("mock_failure");
  }
}
