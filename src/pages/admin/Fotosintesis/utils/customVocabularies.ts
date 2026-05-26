/**
 * customVocabularies — operator write-ins that grow a SelectField dropdown.
 *
 * When Maritza picks "Otra opción (escribir)…" in a Fotosíntesis dropdown and
 * commits a value that isn't in the canonical vocabulary, we remember it here
 * so it shows up as a real option the next time — no re-typing. Storage is
 * keyed by *vocabulary* (e.g. "color", "corte"), not by lote, so a custom
 * color typed in one lote is suggested across every lote on this browser.
 *
 * Backed by localStorage and exposed reactively via `useSyncExternalStore` so
 * every mounted SelectField for the same vocabulary updates the instant a new
 * value is committed. Reads are synchronous (no load flash) per the project's
 * anti-blinking rules.
 */

import { useSyncExternalStore } from "react";
import { STORAGE_KEYS } from "../../../../constants/storage-keys";

const EMPTY: readonly string[] = [];

// Snapshot cache keeps `getSnapshot` referentially stable between mutations —
// `useSyncExternalStore` loops forever if the snapshot is a fresh array each call.
const snapshotCache = new Map<string, readonly string[]>();
const listeners = new Set<() => void>();

function storageKey(vocabKey: string): string {
  return `${STORAGE_KEYS.FOTO_CUSTOM_VOCAB_PREFIX}${vocabKey}`;
}

function loadFromStorage(vocabKey: string): readonly string[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(storageKey(vocabKey));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const clean = parsed.filter(
        (v): v is string => typeof v === "string" && v.trim().length > 0,
      );
      return clean.length > 0 ? clean : EMPTY;
    }
  } catch {
    /* corrupt entry — fall through to empty */
  }
  return EMPTY;
}

function readSnapshot(vocabKey: string): readonly string[] {
  if (!snapshotCache.has(vocabKey)) {
    snapshotCache.set(vocabKey, loadFromStorage(vocabKey));
  }
  return snapshotCache.get(vocabKey) ?? EMPTY;
}

function persist(vocabKey: string, next: readonly string[]): void {
  snapshotCache.set(vocabKey, next.length > 0 ? next : EMPTY);
  if (typeof window !== "undefined") {
    try {
      if (next.length > 0) {
        window.localStorage.setItem(storageKey(vocabKey), JSON.stringify(next));
      } else {
        window.localStorage.removeItem(storageKey(vocabKey));
      }
    } catch {
      /* quota / private mode — keep the in-memory copy */
    }
  }
  listeners.forEach((notify) => notify());
}

/**
 * Remember a committed write-in for `vocabKey`. No-ops on blanks, single
 * characters, or values that already exist (case-insensitive) — including the
 * canonical vocabulary the caller can pass via `existing`.
 */
export function addCustomVocabularyOption(
  vocabKey: string,
  value: string,
  existing: readonly string[] = EMPTY,
): void {
  const trimmed = value.trim();
  if (trimmed.length < 2) return;
  const lower = trimmed.toLowerCase();
  const current = readSnapshot(vocabKey);
  if (current.some((v) => v.toLowerCase() === lower)) return;
  if (existing.some((v) => v.toLowerCase() === lower)) return;
  persist(vocabKey, [...current, trimmed]);
}

/** Forget a previously remembered write-in (e.g. a typo). */
export function removeCustomVocabularyOption(
  vocabKey: string,
  value: string,
): void {
  const current = readSnapshot(vocabKey);
  const next = current.filter((v) => v !== value);
  if (next.length !== current.length) persist(vocabKey, next);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Reactive list of custom write-ins for a vocabulary. Returns a stable empty
 * array when `vocabKey` is undefined (persistence opted out).
 */
export function useCustomVocabularyOptions(
  vocabKey: string | undefined,
): readonly string[] {
  return useSyncExternalStore(
    subscribe,
    () => (vocabKey ? readSnapshot(vocabKey) : EMPTY),
    () => EMPTY,
  );
}
