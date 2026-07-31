/**
 * Ambassador vanity handles — the `andres` in `andres.tierramadre.app`.
 *
 * One source of truth shared by two consumers that must never disagree:
 *   - the profile edit UI (recommends a default, validates as you type)
 *   - `api/ambassador-subdomain.ts` (resolves an incoming Host to a slug)
 *
 * Keep this module dependency-free — the API imports it across the
 * src/ boundary, the same way `api/fotosintesis-ai.ts` imports
 * `src/pages/admin/Fotosintesis/copilot/flowSchemas`.
 */

export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 30;

/**
 * Subdomains that must never resolve to an ambassador: infra hostnames,
 * current app surfaces, and names a future product might want. The
 * resolver checks this list too, so a reserved host falls through to the
 * apex rather than rendering an empty profile.
 *
 * Adding a new top-level route or subdomain? Add it here in the same
 * commit, or an ambassador can claim it first.
 */
export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  // Infra / conventional
  'www',
  'app',
  'api',
  'admin',
  'cdn',
  'assets',
  'static',
  'mail',
  'email',
  'ftp',
  'ns',
  'ns1',
  'ns2',
  'mx',
  'smtp',
  'webmail',
  'vpn',
  'proxy',
  // Environments
  'dev',
  'test',
  'stage',
  'staging',
  'preview',
  'demo',
  'sandbox',
  'local',
  // Platform
  'vercel',
  'status',
  'health',
  'metrics',
  'analytics',
  'webhook',
  'webhooks',
  // Brand / product surfaces
  'tierramadre',
  'tierra',
  'madre',
  'studio',
  'ceo',
  'esmereogenesis',
  'fotosintesis',
  'coomunity',
  'esmeraldas',
  'emeralds',
  // Existing app routes (a handle must not shadow a path we already serve)
  'ambassadors',
  'embajadores',
  'treasure',
  'inventory',
  'product',
  'products',
  'cart',
  'cotizacion',
  'cot',
  'invite',
  'vitrina',
  'valuation',
  'cuentas',
  'provider',
  'proveedor',
  'solicitudes',
  'collection',
  'grupo',
  'boveda',
  // Generic
  'help',
  'support',
  'docs',
  'blog',
  'shop',
  'store',
  'about',
  'contact',
  'login',
  'logout',
  'signup',
  'register',
  'account',
  'profile',
  'settings',
  'search',
  'new',
  'null',
  'undefined',
]);

export type HandleRejection =
  | 'empty'
  | 'too-short'
  | 'too-long'
  | 'invalid-chars'
  | 'edge-dash'
  | 'reserved';

export type HandleValidation =
  | { valid: true }
  | { valid: false; reason: HandleRejection };

/**
 * Coerce arbitrary text into handle shape: strip Spanish diacritics
 * (Andrés → andres), lowercase, collapse anything else to single dashes.
 * Does NOT guarantee the result is valid — run `validateHandle` after.
 */
export function normalizeHandle(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, HANDLE_MAX_LENGTH)
    .replace(/-+$/g, '');
}

/**
 * Suggest a handle for a display name, shortest-first: "Andres Mauricio
 * Escobar Ramirez" → `andres`. Falls forward through name parts when the
 * first one is reserved or too short ("Ana Lucia" → `ana` is too short,
 * so `ana-lucia`), which is also what keeps two Andréses from both being
 * offered the same default — the second one just fails the uniqueness
 * check on save and gets asked to pick.
 */
export function recommendHandle(fullName: string | null | undefined): string {
  const parts = normalizeHandle(fullName).split('-').filter(Boolean);
  if (parts.length === 0) return '';

  let candidate = '';
  for (const part of parts) {
    candidate = candidate ? `${candidate}-${part}` : part;
    if (validateHandle(candidate).valid) return candidate;
  }
  // Every prefix was rejected (all parts reserved, or the whole name is
  // shorter than the minimum). Return what we have and let the UI show
  // the specific reason rather than silently inventing something.
  return candidate.slice(0, HANDLE_MAX_LENGTH);
}

/** Structural validation only — uniqueness is a server-side concern. */
export function validateHandle(handle: string): HandleValidation {
  if (!handle) return { valid: false, reason: 'empty' };
  if (handle.length < HANDLE_MIN_LENGTH)
    return { valid: false, reason: 'too-short' };
  if (handle.length > HANDLE_MAX_LENGTH)
    return { valid: false, reason: 'too-long' };
  // DNS labels are a-z 0-9 and dashes, and cannot start or end with a dash.
  if (!/^[a-z0-9-]+$/.test(handle))
    return { valid: false, reason: 'invalid-chars' };
  if (handle.startsWith('-') || handle.endsWith('-'))
    return { valid: false, reason: 'edge-dash' };
  if (RESERVED_HANDLES.has(handle)) return { valid: false, reason: 'reserved' };
  return { valid: true };
}

/** Spanish copy for each rejection, for the profile edit form. */
export const HANDLE_REJECTION_MESSAGES: Record<HandleRejection, string> = {
  empty: 'Escribe un enlace personal.',
  'too-short': `Mínimo ${HANDLE_MIN_LENGTH} caracteres.`,
  'too-long': `Máximo ${HANDLE_MAX_LENGTH} caracteres.`,
  'invalid-chars': 'Solo letras, números y guiones.',
  'edge-dash': 'No puede empezar ni terminar con guión.',
  reserved: 'Ese nombre está reservado, elige otro.',
};
