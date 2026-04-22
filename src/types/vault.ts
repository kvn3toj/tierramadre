export type VaultSymbolId =
  | 'esmeralda'
  | 'sol'
  | 'luna'
  | 'montana'
  | 'rio'
  | 'arbol'
  | 'ojo'
  | 'estrella'
  | 'condor'
  | 'jaguar'
  | 'espiral'
  | 'corazon_verde';

export interface VaultSymbolMeta {
  id: VaultSymbolId;
  name: string;
  color: string;
}

export interface VaultCombination {
  outer: VaultSymbolId;
  inner: number; // 0..9
}

export type VaultState = 'idle' | 'unlocking' | 'error' | 'cooldown';

export type UnlockMethod =
  | { method: 'universal' }
  | { method: 'ambassador'; ambassadorSlug: string };
