// src/components/vault/cinematic/useVaultCinematicSequence.ts
import { useEffect, useRef, useState } from 'react';
import { vaultDurations } from '../../../design-system';
import type { VaultState } from '../../../types/vault';

export type CinematicPhase =
  | 'idle'
  | 'anticipate'
  | 'confirm'
  | 'release'
  | 'swing'
  | 'reveal'
  | 'dolly'
  | 'failure'
  | 'cooldown';

export interface UseVaultCinematicSequenceOptions {
  state: VaultState | 'unlocked';
  reducedMotion: boolean;
  /** Called once when the visual sequence is "ready to hand over" (200 ms before container fades out). */
  onSequenceComplete: () => void;
}

export interface UseVaultCinematicSequenceReturn {
  phase: CinematicPhase;
}

/**
 * Drives the cinematic phases of the vault unlock sequence.
 * Listens to the upstream VaultState and schedules timed transitions.
 */
export function useVaultCinematicSequence({
  state,
  reducedMotion,
  onSequenceComplete,
}: UseVaultCinematicSequenceOptions): UseVaultCinematicSequenceReturn {
  const [phase, setPhase] = useState<CinematicPhase>('idle');
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const completedRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    clearTimers();
    completedRef.current = false;

    if (state === 'idle') {
      setPhase('idle');
      return;
    }

    if (state === 'cooldown') {
      setPhase('cooldown');
      return;
    }

    if (state === 'error') {
      setPhase('failure');
      return;
    }

    if (state === 'unlocking' || state === 'unlocked') {
      runSuccessSequence(reducedMotion);
    }
  }, [state, reducedMotion]);

  function clearTimers() {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  }

  function schedule(at: number, fn: () => void) {
    const t = setTimeout(fn, at);
    timers.current.push(t);
  }

  function fireCompleteOnce() {
    if (completedRef.current) return;
    completedRef.current = true;
    onSequenceComplete();
  }

  function runSuccessSequence(reduced: boolean) {
    if (reduced) {
      // Skip anticipate; collapse to: confirm → release → swing → reveal
      setPhase('confirm');
      schedule(vaultDurations.reducedConfirmMs, () => setPhase('release'));
      schedule(
        vaultDurations.reducedConfirmMs + vaultDurations.reducedReleaseMs,
        () => setPhase('swing'),
      );
      schedule(
        vaultDurations.reducedConfirmMs +
          vaultDurations.reducedReleaseMs +
          vaultDurations.reducedSwingMs,
        () => setPhase('reveal'),
      );
      schedule(vaultDurations.reducedMotionTotalMs, fireCompleteOnce);
      return;
    }

    setPhase('anticipate');
    schedule(vaultDurations.anticipateMs, () => setPhase('confirm'));
    schedule(vaultDurations.anticipateMs + vaultDurations.confirmMs, () =>
      setPhase('release'),
    );
    schedule(
      vaultDurations.anticipateMs + vaultDurations.confirmMs + vaultDurations.releaseMs,
      () => setPhase('swing'),
    );
    schedule(
      vaultDurations.anticipateMs +
        vaultDurations.confirmMs +
        vaultDurations.releaseMs +
        vaultDurations.swingMs,
      () => setPhase('reveal'),
    );
    const dollyStartMs =
      vaultDurations.anticipateMs +
      vaultDurations.confirmMs +
      vaultDurations.releaseMs +
      vaultDurations.swingMs +
      vaultDurations.revealMs;
    schedule(dollyStartMs, () => setPhase('dolly'));
    // Fire onSequenceComplete 200 ms before the dolly (and the full sequence) ends,
    // so the parent can crossfade out without a perceptible gap. See spec section 5.3.
    const completeAtMs =
      dollyStartMs + vaultDurations.dollyMs - (vaultDurations.sequenceTotalMs - vaultDurations.unlockCallbackOffsetMs);
    schedule(completeAtMs, fireCompleteOnce);
  }

  return { phase };
}
