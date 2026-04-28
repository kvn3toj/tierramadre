/**
 * Esmereogénesis — Type definitions
 *
 * Method of conscious savings (NOT credit) where a user makes contributions
 * ("aportes") toward acquiring a specific emerald. The emerald visually
 * evolves from "covered in soil" to "fully alive" as the plan progresses.
 *
 * See: docs/superpowers/specs/2026-04-28-esmereogenesis-design.md
 */

export type EsmereoState =
  | 'empty'      // freshly created, no aportes yet
  | 'seeded'     // first aporte received
  | 'growing'    // active progress
  | 'completed'  // 100% reached
  | 'claimed';   // user requested asesor contact

export type DurationMonths = 3 | 6 | 9 | 12;

export type AporteType = 'suggested' | 'free';

export interface ProductSnapshot {
  /** Frozen at plan creation — protects against catalog changes */
  nombre: string;
  imagen: string;
  precioCOP: number;
  peso: string | number;
  color: string;
}

export interface Aporte {
  id: string;
  planId: string;
  amountCOP: number;
  /** ISO timestamp */
  createdAt: string;
  type: AporteType;
}

export interface StreakState {
  /** Consecutive weeks with at least one aporte */
  currentWeeks: number;
  longestWeeks: number;
  /** ISO timestamp of Monday of last aporte's week */
  lastAporteWeekStart: string;
}

export interface EsmereoPlan {
  id: string;
  itemId: number;
  productSnapshot: ProductSnapshot;
  /** Original target = precioCOP at creation */
  targetCOP: number;
  totalAbonadoCOP: number;
  durationMonths: DurationMonths;
  /** Sugerencia inicial = targetCOP / (durationMonths * 4) */
  weeklySuggestedCOP: number;
  /** ISO timestamps */
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  claimedAt?: string;
  state: EsmereoState;
  aportes: Aporte[];
  streak: StreakState;
}

/** Persisted shape inside localStorage */
export interface EsmereoStorage {
  version: 1;
  plans: EsmereoPlan[];
}

/** Aggregated view for the Hub global header */
export interface EsmereoHubMetrics {
  activeCount: number;
  completedCount: number;
  totalAbonadoCOP: number;
  totalTargetCOP: number;
  globalProgress: number; // 0-1
  globalStreak: number;
}

/** Phases of the cinematic abono sequence (kept here for cross-import safety) */
export type AbonoPhase =
  | 'idle'
  | 'anticipate'
  | 'droplet'
  | 'wash'
  | 'reveal'
  | 'bloom'
  | 'progress'
  | 'confirm'
  | 'release'
  | 'eclosion';
