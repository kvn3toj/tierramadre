import { describe, it, expect } from 'vitest';
import { puedeFijarMultiplicador } from '../src/hooks/usePermissions';

describe('puedeFijarMultiplicador', () => {
  it('admin y embajador pueden', () => {
    expect(puedeFijarMultiplicador('admin')).toBe(true);
    expect(puedeFijarMultiplicador('embajador')).toBe(true);
  });

  it('el invitado especial puede — decisión explícita del dueño', () => {
    expect(puedeFijarMultiplicador('invitado_especial')).toBe(true);
  });

  it('el asesor NO puede, aunque sí pueda compartir vitrinas', () => {
    expect(puedeFijarMultiplicador('asesor')).toBe(false);
  });

  it('invitado y proveedor no pueden', () => {
    expect(puedeFijarMultiplicador('guest')).toBe(false);
    expect(puedeFijarMultiplicador('provider')).toBe(false);
  });

  it('un nivel desconocido no puede', () => {
    expect(puedeFijarMultiplicador('')).toBe(false);
    expect(puedeFijarMultiplicador('otra-cosa')).toBe(false);
  });
});
