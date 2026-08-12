/**
 * Slug generator for asesor display names.
 *
 * Extracted from api/get-asesores.ts (N5, 2026-08 fix round 3) so
 * api/vault-unlock.ts can hand back a slug the client already understands
 * (VaultLockScreen.tsx parses `ambassador:<slug>` back into `ambassadorSlug`
 * for the UnlockMethod it reports) without a second, independently-drifting
 * copy of this exact algorithm. Do not swap this for a different slugifier
 * (e.g. src/utils/slugify.ts's `slugifyBuyerName`, used for Drive filenames)
 * — a different algorithm producing a different slug for the same name would
 * desync from `/ambassadors/:slug` routes and `useAsesores.ts`'s
 * `ambassadorVaultCodes` Map, which is keyed by THIS slug.
 */
export function slugifyAsesorName(displayName: string): string {
  return displayName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}
