/**
 * A1 — resolving the asesor's email column.
 *
 * The bug this pins down: `api/get-asesores.ts` used to locate the email with
 * `findColumnIndex(headers, ['instagram', 'ig', 'email'])`. Two things go
 * wrong with that list.
 *
 * 1. `findColumnIndex` matches on SUBSTRING (`header.includes(pattern)`), and
 *    `'ig'` is two characters. It matches `Codigo`, `Origen`, `Digital` and
 *    `Vigencia` — ordinary roster columns. `findColumnIndex` returns the FIRST
 *    match, so any of those sitting left of the real email column silently
 *    becomes the ambassador's "email".
 * 2. `'instagram'` is listed before `'email'`, so even a correctly-named
 *    Instagram column wins over a correctly-named Email column.
 *
 * Either way `email` ends up holding something that is not an email, and
 * `isProfileOwner` (AsesorProfilePage.tsx:170-175) compares the signed-in
 * Google address against it and returns false. The ambassador loses the edit
 * and favourites views on their own profile, with no error anywhere.
 */
import { describe, it, expect } from 'vitest';
import {
  resolveEmailColumnIndex,
  toAsesorEmail,
} from '../api/_lib/asesorEmail';

describe('resolveEmailColumnIndex', () => {
  it('picks the real email column, not a column that merely contains "ig"', () => {
    const headers = ['Nombre', 'Codigo', 'Origen', 'Email', 'Whatsapp'];
    expect(resolveEmailColumnIndex(headers)).toBe(3);
  });

  it('prefers Email over Instagram when the sheet has both', () => {
    const headers = ['Nombre', 'Instagram', 'Email'];
    expect(resolveEmailColumnIndex(headers)).toBe(2);
  });

  it('accepts the Spanish header', () => {
    expect(resolveEmailColumnIndex(['Nombre', 'Correo'])).toBe(1);
    expect(resolveEmailColumnIndex(['Nombre', 'Correo electronico'])).toBe(1);
    expect(resolveEmailColumnIndex(['Nombre', 'E-mail'])).toBe(1);
  });

  it('is not fooled by any of the real roster columns that contain "ig"', () => {
    for (const header of [
      'Codigo',
      'Origen',
      'Digital',
      'Vigencia',
      'Seguimiento',
    ]) {
      expect(resolveEmailColumnIndex(['Nombre', header])).toBe(-1);
    }
  });

  it('falls back to Instagram only when there is no email column at all', () => {
    // Legacy sheets stored the address in the Instagram column. That fallback
    // stays, or those rosters lose isOwner the day this ships.
    expect(resolveEmailColumnIndex(['Nombre', 'Instagram'])).toBe(1);
  });

  it('survives column reordering — the acceptance criterion', () => {
    const before = ['Nombre', 'Rol', 'Email', 'Whatsapp', 'Codigo'];
    const after = ['Codigo', 'Whatsapp', 'Nombre', 'Email', 'Rol'];
    expect(before[resolveEmailColumnIndex(before)]).toBe('Email');
    expect(after[resolveEmailColumnIndex(after)]).toBe('Email');
  });

  it('returns -1 when the sheet has no email-ish column', () => {
    expect(resolveEmailColumnIndex(['Nombre', 'Rol', 'Whatsapp'])).toBe(-1);
  });

  it('ignores blank headers without throwing', () => {
    expect(
      resolveEmailColumnIndex(['', null as unknown as string, 'Email']),
    ).toBe(2);
  });
});

describe('toAsesorEmail', () => {
  it('normalises a real address', () => {
    expect(toAsesorEmail('  Alvaro@TierraMadre.APP ')).toBe(
      'alvaro@tierramadre.app',
    );
  });

  it('rejects a value that is not an address', () => {
    // The second half of the defence: even if column resolution goes wrong,
    // an Instagram handle or a vault code must never be stored as `email`.
    // Returning null costs the same isOwner=false, but it does not put a
    // non-email into a field the staff projection exposes as one.
    expect(toAsesorEmail('@alvaro.esmeraldas')).toBeNull();
    expect(toAsesorEmail('TM-0042')).toBeNull();
    expect(toAsesorEmail('Bogota')).toBeNull();
    expect(toAsesorEmail('')).toBeNull();
    expect(toAsesorEmail(null)).toBeNull();
    expect(toAsesorEmail(undefined)).toBeNull();
    expect(toAsesorEmail(12345)).toBeNull();
  });

  it('rejects an address with spaces or a missing tld', () => {
    expect(toAsesorEmail('alvaro@tierramadre')).toBeNull();
    expect(toAsesorEmail('al varo@tierramadre.app')).toBeNull();
    expect(toAsesorEmail('alvaro@@tierramadre.app')).toBeNull();
  });
});
