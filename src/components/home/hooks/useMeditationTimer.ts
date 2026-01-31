/**
 * useMeditationTimer Hook
 *
 * Manages meditation timer state with play/pause, progress tracking,
 * and completion handling.
 *
 * Designed by Aria - UX/UI Implementation Capitana
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { STORAGE_KEYS } from '../../../constants/storage-keys';

// =============================================================================
// TYPES
// =============================================================================

export interface MeditationTimerState {
  /** Elapsed time in seconds */
  elapsed: number;
  /** Is timer currently playing */
  isPlaying: boolean;
  /** Is meditation completed */
  isCompleted: boolean;
  /** Progress percentage (0-100) */
  progress: number;
  /** Time remaining in seconds */
  timeRemaining: number;
  /** Formatted elapsed time (MM:SS) */
  formattedElapsed: string;
  /** Formatted remaining time (MM:SS) */
  formattedRemaining: string;
}

export interface MeditationTimerActions {
  /** Start/resume the timer */
  play: () => void;
  /** Pause the timer */
  pause: () => void;
  /** Toggle play/pause */
  toggle: () => void;
  /** Reset timer to beginning */
  reset: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = STORAGE_KEYS.MEDITATIONS;

// =============================================================================
// HELPERS
// =============================================================================

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getCompletedCount = (): number => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? parseInt(saved, 10) : 0;
};

const incrementCompletedCount = (): number => {
  const newCount = getCompletedCount() + 1;
  localStorage.setItem(STORAGE_KEY, String(newCount));
  return newCount;
};

// =============================================================================
// HOOK
// =============================================================================

export const useMeditationTimer = (
  duration: number,
  onComplete?: () => void
): [MeditationTimerState, MeditationTimerActions, number] => {
  const [elapsed, setElapsed] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedCount, setCompletedCount] = useState(getCompletedCount);

  // Timer effect
  useEffect(() => {
    if (!isPlaying || elapsed >= duration) return;

    const timer = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1;

        // Check for completion
        if (next >= duration) {
          setIsPlaying(false);
          setIsCompleted(true);
          const newCount = incrementCompletedCount();
          setCompletedCount(newCount);
          onComplete?.();
          return duration;
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, elapsed, duration, onComplete]);

  // Memoized state values
  const progress = useMemo(
    () => Math.min((elapsed / duration) * 100, 100),
    [elapsed, duration]
  );

  const timeRemaining = useMemo(
    () => Math.max(duration - elapsed, 0),
    [duration, elapsed]
  );

  const formattedElapsed = useMemo(
    () => formatTime(elapsed),
    [elapsed]
  );

  const formattedRemaining = useMemo(
    () => formatTime(timeRemaining),
    [timeRemaining]
  );

  // Memoized actions
  const play = useCallback(() => {
    if (isCompleted) {
      // Reset if completed
      setElapsed(0);
      setIsCompleted(false);
    }
    setIsPlaying(true);
  }, [isCompleted]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const reset = useCallback(() => {
    setElapsed(0);
    setIsPlaying(false);
    setIsCompleted(false);
  }, []);

  // State object
  const state: MeditationTimerState = {
    elapsed,
    isPlaying,
    isCompleted,
    progress,
    timeRemaining,
    formattedElapsed,
    formattedRemaining,
  };

  // Actions object
  const actions: MeditationTimerActions = {
    play,
    pause,
    toggle,
    reset,
  };

  return [state, actions, completedCount];
};

export default useMeditationTimer;
