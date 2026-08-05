/**
 * Builds the RequestInit for catalog reads.
 *
 * Returns `undefined` when there is nothing to send, so anonymous requests
 * stay byte-identical to what they were before access control landed.
 */
import { readFreshAuthToken } from './sessionToken';

export function catalogRequestInit(): RequestInit | undefined {
  const token = readFreshAuthToken();
  if (!token) return undefined;
  return { headers: { Authorization: `Bearer ${token}` } };
}

/** Mirrors ID_LIST_RE in VitrinaPage.tsx:57 — id-lists prove nothing. */
const ID_LIST_RE = /^\d+([-,]\d+)*$/;

/**
 * Appends `?vitrina=<token>` for stateful share tokens only. Filtering
 * id-lists here saves a pointless round trip; the server rejects them too.
 */
export function catalogUrl(path: string, vitrinaToken?: string): string {
  if (!vitrinaToken || ID_LIST_RE.test(vitrinaToken)) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}vitrina=${encodeURIComponent(vitrinaToken)}`;
}
