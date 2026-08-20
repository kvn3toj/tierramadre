/**
 * Quién puede fijar un markup — la compuerta que decide el precio de venta
 * de una vitrina (el checkout cobra `vitrinas.multiplier`).
 *
 * Vive en su propio módulo, sin dependencias de React, a propósito: tanto el
 * hook de UI (`../hooks/usePermissions.ts`, que lo re-exporta) como el proxy
 * del servidor (`api/vitrina.ts`) importan ESTA misma función — nunca una
 * copia. `usePermissions.ts` no es importable desde `api/` (arrastra
 * `AuthContext.tsx`, que necesita `--jsx`, `lib: DOM` e `import.meta.env`,
 * ninguno configurado en `api/tsconfig.json`); este archivo, sin imports, sí
 * lo es. Dos copias de esta regla acabarían divergiendo, y la que importa es
 * la del servidor — la de la UI es solo cortesía.
 *
 * El asesor queda fuera aunque `canShareVitrina` lo incluya: compartir una
 * vitrina y ponerle precio dejan de ser el mismo permiso.
 */
export function puedeFijarMultiplicador(accessLevel: string): boolean {
  return (
    accessLevel === 'admin' ||
    accessLevel === 'embajador' ||
    accessLevel === 'invitado_especial'
  );
}
