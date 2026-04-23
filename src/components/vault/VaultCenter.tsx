// src/components/vault/VaultCenter.tsx
import type { VaultState, VaultSymbolMeta } from '../../types/vault';
import { VaultMonumentCenter } from './cinematic/VaultMonumentCenter';

interface VaultCenterProps {
  outerSymbol: VaultSymbolMeta;
  innerDigit: number;
  state: VaultState;
  cooldownSecondsLeft?: number;
}

function formatCooldown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * @deprecated Use `VaultMonumentCenter` directly. This file will be removed
 * once external consumers migrate. Maintained as a thin compatibility wrapper.
 */
export function VaultCenter({
  outerSymbol,
  innerDigit,
  state,
  cooldownSecondsLeft = 0,
}: VaultCenterProps) {
  const isCooldown = state === 'cooldown';
  return (
    <VaultMonumentCenter
      symbolName={outerSymbol.name}
      digit={innerDigit}
      highlighted={state === 'unlocking'}
      cooldownText={isCooldown ? formatCooldown(cooldownSecondsLeft) : undefined}
    />
  );
}
