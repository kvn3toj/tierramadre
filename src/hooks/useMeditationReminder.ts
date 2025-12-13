/**
 * useMeditationReminder Hook
 *
 * Manages daily meditation reminder notifications.
 * - Schedules notifications at user-chosen time
 * - Persists settings in localStorage
 * - Reschedules on app open
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getMeditationReminder,
  setMeditationReminder as saveMeditationReminder,
  clearMeditationReminder,
  getTimeUntilReminder,
  shouldShowReminderToday,
  showMeditationReminder,
  isNotificationEnabled,
} from '../services/notifications';

interface MeditationReminderState {
  enabled: boolean;
  hour: number;
  minute: number;
}

export function useMeditationReminder() {
  const [state, setState] = useState<MeditationReminderState>({
    enabled: false,
    hour: 8,
    minute: 0,
  });
  const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Load saved settings on mount
  useEffect(() => {
    const saved = getMeditationReminder();
    if (saved) {
      setState({
        enabled: saved.enabled,
        hour: saved.hour,
        minute: saved.minute,
      });
    }
  }, []);

  // Schedule reminder when settings change
  useEffect(() => {
    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }

    if (!state.enabled || !isNotificationEnabled()) {
      return;
    }

    const reminder = getMeditationReminder();
    if (!reminder || !shouldShowReminderToday(reminder)) {
      // Already shown today, schedule for tomorrow
      const msUntilReminder = getTimeUntilReminder(state.hour, state.minute);

      const id = setTimeout(() => {
        showMeditationReminder();
        // Schedule next day's reminder
        scheduleNextReminder();
      }, msUntilReminder);

      setTimeoutId(id);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [state.enabled, state.hour, state.minute]);

  const scheduleNextReminder = useCallback(() => {
    if (!state.enabled) return;

    const msUntilReminder = getTimeUntilReminder(state.hour, state.minute);
    const id = setTimeout(() => {
      showMeditationReminder();
      scheduleNextReminder();
    }, msUntilReminder);

    setTimeoutId(id);
  }, [state.enabled, state.hour, state.minute]);

  const setReminder = useCallback((hour: number, minute: number) => {
    const newState = { enabled: true, hour, minute };
    setState(newState);
    saveMeditationReminder({
      enabled: true,
      hour,
      minute,
    });
  }, []);

  const enableReminder = useCallback(() => {
    const newState = { ...state, enabled: true };
    setState(newState);
    saveMeditationReminder({
      enabled: true,
      hour: state.hour,
      minute: state.minute,
    });
  }, [state]);

  const disableReminder = useCallback(() => {
    setState(prev => ({ ...prev, enabled: false }));
    clearMeditationReminder();
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  }, [timeoutId]);

  const formatTime = useCallback((hour: number, minute: number) => {
    const h = hour % 12 || 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    const m = minute.toString().padStart(2, '0');
    return `${h}:${m} ${ampm}`;
  }, []);

  return {
    enabled: state.enabled,
    hour: state.hour,
    minute: state.minute,
    formattedTime: formatTime(state.hour, state.minute),
    setReminder,
    enableReminder,
    disableReminder,
    isNotificationEnabled: isNotificationEnabled(),
  };
}
