// src/components/vault/audio/useVaultAudio.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VAULT_AUDIO_STORAGE_KEY, VAULT_SAMPLES, type VaultSampleId } from './samples';

export interface UseVaultAudioReturn {
  enabled: boolean;
  toggle: () => void;
  play: (id: VaultSampleId) => Promise<void>;
}

const SAMPLE_BY_ID = new Map(VAULT_SAMPLES.map((s) => [s.id, s] as const));

function readEnabled(): boolean {
  try {
    return localStorage.getItem(VAULT_AUDIO_STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

function writeEnabled(v: boolean): void {
  try {
    localStorage.setItem(VAULT_AUDIO_STORAGE_KEY, v ? 'on' : 'off');
  } catch {
    /* no-op */
  }
}

type AudioCtxCtor = typeof AudioContext;

function getAudioContextCtor(): AudioCtxCtor | null {
  if (typeof window === 'undefined') return null;
  return (
    (window.AudioContext as AudioCtxCtor | undefined) ??
    ((window as unknown as { webkitAudioContext?: AudioCtxCtor }).webkitAudioContext ?? null)
  );
}

export function useVaultAudio(): UseVaultAudioReturn {
  const [enabled, setEnabled] = useState<boolean>(() => readEnabled());
  const ctxRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef<Map<VaultSampleId, AudioBuffer | 'missing'>>(new Map());

  // Cleanup on unmount
  useEffect(
    () => () => {
      ctxRef.current?.close().catch(() => {});
    },
    [],
  );

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      writeEnabled(next);
      return next;
    });
  }, []);

  const ensureCtx = useCallback((): AudioContext | null => {
    if (ctxRef.current) return ctxRef.current;
    const Ctor = getAudioContextCtor();
    if (!Ctor) return null;
    try {
      ctxRef.current = new Ctor();
    } catch {
      return null;
    }
    return ctxRef.current;
  }, []);

  const loadBuffer = useCallback(
    async (meta: { src: string; id: VaultSampleId }): Promise<AudioBuffer | null> => {
      const cached = buffersRef.current.get(meta.id);
      if (cached === 'missing') return null;
      if (cached) return cached;

      const ctx = ensureCtx();
      if (!ctx) {
        buffersRef.current.set(meta.id, 'missing');
        return null;
      }

      try {
        const res = await fetch(meta.src);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const arr = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(arr);
        buffersRef.current.set(meta.id, buf);
        return buf;
      } catch {
        buffersRef.current.set(meta.id, 'missing');
        return null;
      }
    },
    [ensureCtx],
  );

  const play = useCallback(
    async (id: VaultSampleId): Promise<void> => {
      if (!enabled) return;
      const meta = SAMPLE_BY_ID.get(id);
      if (!meta) return;

      const buf = await loadBuffer(meta);
      const ctx = ctxRef.current;
      if (!buf || !ctx) return;

      try {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const gain = ctx.createGain();
        gain.gain.value = meta.volume;
        src.connect(gain).connect(ctx.destination);
        src.start();
      } catch {
        /* swallow — never crash the unlock sequence due to audio */
      }
    },
    [enabled, loadBuffer],
  );

  return useMemo(() => ({ enabled, toggle, play }), [enabled, toggle, play]);
}
