import { describe, it, expect } from 'vitest';
import { isRosterRowActive } from '../api/_lib/rosterStatus.js';

/**
 * La puerta activo/inactivo del padrón (api/validate.ts).
 *
 * El bug que fijan estos tests: el filtro era una LISTA NEGRA sin `.trim()`.
 *
 *   const estado = String(row[estadoIndex] || '').toLowerCase();
 *   if (estado === 'inactivo' || estado === 'inactive') continue;
 *
 * Sólo esas dos palabras exactas bloqueaban, así que dar de baja a alguien
 * escribiendo "Suspendido", "Inactiva" o —peor— "Inactivo " con un espacio al
 * final, lo dejaba con acceso y sin ninguna señal de error. Una puerta de
 * permisos tiene que fallar CERRADA.
 */

const OLD_DENYLIST = (raw: unknown) => {
  const estado = String(raw || '').toLowerCase(); // sin trim, tal cual era
  return !(estado === 'inactivo' || estado === 'inactive');
};

describe('isRosterRowActive', () => {
  describe('concede acceso', () => {
    it.each([
      'Activo',
      'activo',
      'ACTIVO',
      'Activo ',
      ' Activo',
      'Activa',
      'Actívo',
      'active',
    ])('%j → activo', (v) => expect(isRosterRowActive(v, true)).toBe(true));
  });

  describe('deniega acceso', () => {
    it.each([
      'Inactivo',
      'Inactivo ', // el espacio que antes dejaba entrar a la persona
      'INACTIVO',
      'Inactiva',
      'inactive',
      'Suspendido',
      'Retirado',
      'No activo',
      'Baja',
      '',
      '   ',
    ])('%j → inactivo', (v) => expect(isRosterRowActive(v, true)).toBe(false));

    it.each([[undefined], [null]])('%j → inactivo', (v) =>
      expect(isRosterRowActive(v, true)).toBe(false),
    );
  });

  describe('sin columna de estado', () => {
    // Exigir "activo" contra una columna que no existe dejaría fuera al padrón
    // entero: cambiaría un bug silencioso por un apagón total de los logins.
    it.each([[undefined], [''], ['lo que sea']])(
      'cuenta como activa aunque el valor sea %j',
      (v) => expect(isRosterRowActive(v, false)).toBe(true),
    );
  });

  describe('lo que la lista negra dejaba pasar', () => {
    // Cada uno de estos DEBERÍA denegar y antes concedía. Si algún día alguien
    // revierte a la lista negra, estos tests lo cazan.
    it.each([
      'Inactivo ',
      'Suspendido',
      'Retirado',
      'Inactiva',
      'No activo',
      '',
    ])('%j: antes concedía, ahora deniega', (v) => {
      expect(OLD_DENYLIST(v)).toBe(true); // el comportamiento viejo
      expect(isRosterRowActive(v, true)).toBe(false); // el nuevo
    });
  });

  describe('el padrón real del SOT v3 (auditado 2026-08-11)', () => {
    // Los 35 asesores traen exactamente estos dos valores: 31 y 4. El cambio a
    // lista blanca NO altera a nadie hoy — nadie queda fuera por este deploy.
    it('"Activo" (31 filas) sigue entrando', () =>
      expect(isRosterRowActive('Activo', true)).toBe(true));
    it('"Inactivo" (4 filas) sigue bloqueado', () =>
      expect(isRosterRowActive('Inactivo', true)).toBe(false));
  });
});
