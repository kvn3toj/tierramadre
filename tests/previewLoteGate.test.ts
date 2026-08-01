/**
 * El candado de costo sobre el preview de W1.
 *
 * El preview devuelve la ESTRUCTURA de costos: el gasto fijo vigente, cuántos
 * lotes activos hay, K, el piso real y el margen. Eso no es lo mismo que el
 * precio. Un asesor necesita el precio para vender; darle K y el margen le dice
 * exactamente cuánto hay para descontar.
 *
 * Mientras fue una query pública, lo único que lo protegía era que solo la UI de
 * admin lo llamaba — y `AdminRoute` esconde botones, no protege el backend:
 * cualquiera con la URL del deployment puede llamar una query pública de Convex.
 *
 * Este archivo fija dos cosas: la decisión de autorización, y que el endpoint no
 * pueda volver a ser público sin que un test se ponga rojo.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROLES_COSTOS,
  esAutorizado,
  type AccessLevel,
} from '../convex/_lib/authz';

const TODOS_LOS_ROLES: AccessLevel[] = [
  'admin',
  'asesor',
  'embajador',
  'provider',
  'invitado_especial',
  'guest',
];

describe('ROLES_COSTOS — quién puede ver la estructura de costos', () => {
  it('admin sí', () => {
    expect(esAutorizado('admin', ROLES_COSTOS)).toBe(true);
  });

  it('NINGÚN otro rol, ni siquiera asesor', () => {
    // El asesor es el caso interesante: vende, así que la tentación de darle el
    // costo «para que negocie mejor» es real. Justamente por eso no lo tiene.
    const otros = TODOS_LOS_ROLES.filter((r) => r !== 'admin');
    for (const rol of otros) {
      expect(esAutorizado(rol, ROLES_COSTOS), rol).toBe(false);
    }
  });

  it('un rol desconocido tampoco entra — falla cerrado', () => {
    expect(esAutorizado('inventado' as AccessLevel, ROLES_COSTOS)).toBe(false);
  });

  it('la frontera tiene un solo dueño: la constante, no cada endpoint', () => {
    expect(ROLES_COSTOS).toEqual(['admin']);
  });
});

/**
 * Test de deriva sobre el archivo real — el mismo patrón que `saleSafe.test.ts`.
 *
 * Si alguien vuelve a exponer el preview como query pública (por comodidad, para
 * recuperar la reactividad), esto se pone rojo. Un test que solo mirara la
 * función pura no lo notaría: el agujero no está en la decisión, está en si
 * alguien la consulta.
 */
describe('el endpoint no puede volver a ser público', () => {
  const fuente = readFileSync(
    join(__dirname, '..', 'convex', 'precios.ts'),
    'utf8',
  );

  it('previewLote es una action, no una query', () => {
    expect(fuente).toMatch(/export const previewLote = action\(/);
    expect(fuente).not.toMatch(/export const previewLote = query\(/);
  });

  it('previewLote exige idToken', () => {
    const bloque = fuente.slice(fuente.indexOf('export const previewLote'));
    expect(bloque).toMatch(/idToken: v\.string\(\)/);
  });

  it('previewLote verifica el rol antes de leer datos', () => {
    const bloque = fuente.slice(fuente.indexOf('export const previewLote'));
    const posAuth = bloque.indexOf('requireAccessLevel');
    const posDatos = bloque.indexOf('runQuery');
    expect(posAuth).toBeGreaterThan(-1);
    expect(posDatos).toBeGreaterThan(-1);
    // El orden importa: autorizar DESPUÉS de leer sería filtrar y luego
    // preguntar.
    expect(posAuth).toBeLessThan(posDatos);
  });

  it('usa ROLES_COSTOS y no una lista suelta de roles', () => {
    const bloque = fuente.slice(fuente.indexOf('export const previewLote'));
    expect(bloque).toMatch(
      /requireAccessLevel\(idToken, \[\.\.\.ROLES_COSTOS\]\)/,
    );
  });

  it('la lógica de datos quedó en una internalQuery', () => {
    expect(fuente).toMatch(/export const _previewLote = internalQuery\(/);
  });

  it('ninguna otra query pública de este archivo devuelve el fijo vigente', () => {
    // `costoFijoUnitarioVigente` es un helper exportado para uso interno; lo que
    // no puede existir es un `export const ... = query(` que lo sirva.
    const queriesPublicas = fuente.match(/export const \w+ = query\(/g) ?? [];
    expect(queriesPublicas).toEqual([]);
  });
});
