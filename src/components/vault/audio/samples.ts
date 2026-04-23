// src/components/vault/audio/samples.ts
/**
 * Vault audio samples registry. Files live under public/audio/vault/.
 * Volúmenes definidos en el spec (sec 7). Si un archivo no existe,
 * useVaultAudio lo registra como missing y el sample queda mute (no error).
 */

export type VaultSampleId =
  | 'click-suizo'
  | 'thunk-mecanico'
  | 'crujido-swing'
  | 'pad-reveal'
  | 'shake-error';

export interface VaultSampleMeta {
  id: VaultSampleId;
  src: string;
  volume: number;
}

export const VAULT_SAMPLES: readonly VaultSampleMeta[] = [
  { id: 'click-suizo',     src: '/audio/vault/click-suizo.mp3',     volume: 0.35 },
  { id: 'thunk-mecanico',  src: '/audio/vault/thunk-mecanico.mp3',  volume: 0.40 },
  { id: 'crujido-swing',   src: '/audio/vault/crujido-swing.mp3',   volume: 0.45 },
  { id: 'pad-reveal',      src: '/audio/vault/pad-reveal.mp3',      volume: 0.30 },
  { id: 'shake-error',     src: '/audio/vault/shake-error.mp3',     volume: 0.35 },
] as const;

export const VAULT_AUDIO_STORAGE_KEY = 'tm:vault:audio';
