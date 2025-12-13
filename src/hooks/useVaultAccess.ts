/**
 * useVaultAccess Hook
 *
 * Manages authentication and access control for the Secret Vault
 * - PIN-based authentication
 * - Attempt limiting (3 tries)
 * - Cooldown period after failed attempts
 * - Persistent unlock state
 */

import { useState, useEffect, useCallback } from 'react';

const VAULT_PIN = '2024'; // Default PIN - should be configurable
const MAX_ATTEMPTS = 3;
const COOLDOWN_MINUTES = 5;

const STORAGE_KEYS = {
  isUnlocked: 'vault-unlocked',
  attempts: 'vault-attempts',
  cooldownUntil: 'vault-cooldown',
};

interface VaultAccessState {
  isUnlocked: boolean;
  unlock: (pin: string) => Promise<{ success: boolean; message?: string }>;
  lock: () => void;
  remainingAttempts: number;
  cooldownUntil: Date | null;
  isCooldown: boolean;
}

export const useVaultAccess = (): VaultAccessState => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.isUnlocked);
    return stored === 'true';
  });

  const [attempts, setAttempts] = useState<number>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.attempts);
    return stored ? parseInt(stored, 10) : 0;
  });

  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.cooldownUntil);
    if (!stored) return null;
    const date = new Date(stored);
    return date > new Date() ? date : null;
  });

  // Check if currently in cooldown
  const isCooldown = cooldownUntil !== null && cooldownUntil > new Date();

  // Clear cooldown when it expires
  useEffect(() => {
    if (cooldownUntil && cooldownUntil <= new Date()) {
      setCooldownUntil(null);
      setAttempts(0);
      localStorage.removeItem(STORAGE_KEYS.cooldownUntil);
      localStorage.setItem(STORAGE_KEYS.attempts, '0');
    }
  }, [cooldownUntil]);

  // Persist state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.isUnlocked, isUnlocked.toString());
  }, [isUnlocked]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.attempts, attempts.toString());
  }, [attempts]);

  useEffect(() => {
    if (cooldownUntil) {
      localStorage.setItem(STORAGE_KEYS.cooldownUntil, cooldownUntil.toISOString());
    }
  }, [cooldownUntil]);

  const unlock = useCallback(
    async (pin: string): Promise<{ success: boolean; message?: string }> => {
      // Check cooldown
      if (isCooldown) {
        const minutesLeft = Math.ceil((cooldownUntil!.getTime() - Date.now()) / 60000);
        return {
          success: false,
          message: `Demasiados intentos fallidos. Intenta nuevamente en ${minutesLeft} minuto${minutesLeft > 1 ? 's' : ''}.`,
        };
      }

      // Validate PIN
      if (pin === VAULT_PIN) {
        setIsUnlocked(true);
        setAttempts(0);
        setCooldownUntil(null);
        localStorage.removeItem(STORAGE_KEYS.attempts);
        localStorage.removeItem(STORAGE_KEYS.cooldownUntil);
        return { success: true };
      }

      // Failed attempt
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        // Trigger cooldown
        const cooldown = new Date(Date.now() + COOLDOWN_MINUTES * 60 * 1000);
        setCooldownUntil(cooldown);
        return {
          success: false,
          message: `PIN incorrecto. Has excedido el número de intentos. Intenta nuevamente en ${COOLDOWN_MINUTES} minutos.`,
        };
      }

      return {
        success: false,
        message: `PIN incorrecto. Te quedan ${MAX_ATTEMPTS - newAttempts} intento${MAX_ATTEMPTS - newAttempts > 1 ? 's' : ''}.`,
      };
    },
    [attempts, isCooldown, cooldownUntil]
  );

  const lock = useCallback(() => {
    setIsUnlocked(false);
    setAttempts(0);
    setCooldownUntil(null);
    localStorage.removeItem(STORAGE_KEYS.isUnlocked);
    localStorage.removeItem(STORAGE_KEYS.attempts);
    localStorage.removeItem(STORAGE_KEYS.cooldownUntil);
  }, []);

  const remainingAttempts = isCooldown ? 0 : MAX_ATTEMPTS - attempts;

  return {
    isUnlocked,
    unlock,
    lock,
    remainingAttempts,
    cooldownUntil,
    isCooldown,
  };
};
