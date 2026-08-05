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
