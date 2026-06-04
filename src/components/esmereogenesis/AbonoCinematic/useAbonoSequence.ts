/**
 * useAbonoSequence
 *
 * Orchestrates the cinematic phases of an abono.
 * Pattern adapted from `useVaultCinematicSequence` (vault unlock sequence).
 *
 * Phase timeline (full motion):
 *   0.00 → anticipate  (500 ms)
 *   0.50 → droplet     (1000 ms)
 *   1.50 → wash        (1000 ms)
 *   2.50 → reveal      (1500 ms)
 *   4.00 → bloom       (1000 ms)
 *   5.00 → progress    (1000 ms)
 *   6.00 → confirm     (1000 ms)
 *   7.00 → release     (500 ms) → fires onComplete
 *
 * Reduced motion: collapses to confirm → release (≈400 ms total).
 *
 * Skip: callable from the consumer (tap-to-skip) — jumps to release immediately.
 *
 * Eclosion variant: when `isCompletion === true`, the `confirm` phase becomes
 * an extended `eclosion` phase (4 s) that the parent renders distinctly.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { AbonoPhase } from "../../../types/esmereogenesis";

const PHASE_DURATIONS_FULL = {
  anticipate: 500,
  droplet: 1000,
  wash: 1000,
  reveal: 1500,
  bloom: 1000,
  progress: 1000,
  confirm: 1000,
  eclosion: 4000,
  release: 500,
} as const;

const PHASE_DURATIONS_REDUCED = {
  anticipate: 0,
  droplet: 0,
  wash: 0,
  reveal: 0,
  bloom: 0,
  progress: 100,
  confirm: 200,
  eclosion: 800,
  release: 100,
} as const;

const SKIP_RELEASE_MS = 600;

export interface UseAbonoSequenceOptions {
  /** Whether the sequence is currently active. When false → resets to 'idle'. */
  active: boolean;
  reducedMotion: boolean;
  /** True when this aporte completes the plan — triggers eclosion variant. */
  isCompletion: boolean;
  /** Fired once after release phase finishes. */
  onComplete: () => void;
  /** Optional listener for each phase transition. */
  onPhaseChange?: (phase: AbonoPhase) => void;
  /**
   * When true AND isCompletion, the sequence holds on the `eclosion` phase
   * instead of auto-advancing to release/onComplete — the ceremony waits for the
   * user to claim or dismiss. `skip()` jumps straight to the held ceremony.
   */
  holdAtEclosion?: boolean;
}

export interface UseAbonoSequenceReturn {
  phase: AbonoPhase;
  /** Skip ahead to release phase. Safe to call multiple times. */
  skip: () => void;
}

export function useAbonoSequence({
  active,
  reducedMotion,
  isCompletion,
  onComplete,
  onPhaseChange,
  holdAtEclosion = false,
}: UseAbonoSequenceOptions): UseAbonoSequenceReturn {
  const hold = holdAtEclosion && isCompletion;
  const [phase, setPhase] = useState<AbonoPhase>("idle");
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const completedRef = useRef(false);
  const skippedRef = useRef(false);
  const phaseRef = useRef<AbonoPhase>("idle");

  // Notify on phase change
  useEffect(() => {
    phaseRef.current = phase;
    if (phase !== "idle") {
      onPhaseChange?.(phase);
    }
  }, [phase, onPhaseChange]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  const schedule = useCallback((at: number, fn: () => void) => {
    const t = setTimeout(fn, at);
    timersRef.current.push(t);
  }, []);

  const fireCompleteOnce = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  const skip = useCallback(() => {
    if (skippedRef.current || !active) return;
    skippedRef.current = true;
    clearTimers();
    if (hold) {
      // A completion that holds — jump to the held ceremony, don't auto-finish.
      setPhase("eclosion");
      return;
    }
    setPhase("release");
    schedule(SKIP_RELEASE_MS, fireCompleteOnce);
  }, [active, hold, clearTimers, schedule, fireCompleteOnce]);

  useEffect(() => {
    clearTimers();
    completedRef.current = false;
    skippedRef.current = false;

    if (!active) {
      setPhase("idle");
      return;
    }

    const d = reducedMotion ? PHASE_DURATIONS_REDUCED : PHASE_DURATIONS_FULL;

    if (reducedMotion) {
      // Collapsed timeline: progress → confirm/eclosion → release
      setPhase("progress");
      let cursor = d.progress;
      const climaxPhase: AbonoPhase = isCompletion ? "eclosion" : "confirm";
      const climaxDuration = isCompletion ? d.eclosion : d.confirm;
      schedule(cursor, () => setPhase(climaxPhase));
      cursor += climaxDuration;
      if (hold) return; // hold on the eclosión ceremony — no auto-finish
      schedule(cursor, () => setPhase("release"));
      cursor += d.release;
      schedule(cursor, fireCompleteOnce);
      return;
    }

    setPhase("anticipate");
    let cursor = d.anticipate;
    schedule(cursor, () => setPhase("droplet"));
    cursor += d.droplet;
    schedule(cursor, () => setPhase("wash"));
    cursor += d.wash;
    schedule(cursor, () => setPhase("reveal"));
    cursor += d.reveal;
    schedule(cursor, () => setPhase("bloom"));
    cursor += d.bloom;
    schedule(cursor, () => setPhase("progress"));
    cursor += d.progress;

    if (isCompletion) {
      schedule(cursor, () => setPhase("eclosion"));
      cursor += d.eclosion;
    } else {
      schedule(cursor, () => setPhase("confirm"));
      cursor += d.confirm;
    }

    if (hold) return clearTimers; // hold on the eclosión ceremony — no auto-finish

    schedule(cursor, () => setPhase("release"));
    cursor += d.release;
    schedule(cursor, fireCompleteOnce);

    return clearTimers;
  }, [
    active,
    reducedMotion,
    isCompletion,
    clearTimers,
    schedule,
    fireCompleteOnce,
  ]);

  // Cleanup on unmount
  useEffect(() => clearTimers, [clearTimers]);

  return { phase, skip };
}
