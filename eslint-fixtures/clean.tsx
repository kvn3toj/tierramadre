import { getQuietEmerald } from '../src/design-system';

export function Clean() {
  const qe = getQuietEmerald('light');
  return { color: qe.accent, zIndexToken: 'var(--tm-z-base)' };
}
