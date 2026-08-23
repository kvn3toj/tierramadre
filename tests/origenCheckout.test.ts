/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  leerOrigen,
  guardarOrigenVitrina,
  limpiarOrigen,
  ORIGEN_VITRINA_KEY,
  ORIGEN_VITRINA_MULT_KEY,
} from '../src/utils/origenCheckout';
import { INVITATION_STORAGE_KEYS } from '../src/types/invitation';

describe('leerOrigen', () => {
  beforeEach(() => sessionStorage.clear());

  it('no devuelve origen cuando la sesión está vacía — el anónimo compra al precio base', () => {
    expect(leerOrigen()).toBeUndefined();
  });

  it('devuelve la vitrina cuando es lo único guardado', () => {
    guardarOrigenVitrina('AB3K9P', 2.6);
    expect(leerOrigen()).toEqual({
      tipo: 'vitrina',
      token: 'AB3K9P',
      multiplicador: 2.6,
    });
  });

  it('devuelve la invitación leyendo la clave que ya escribe InvitationPage', () => {
    sessionStorage.setItem(INVITATION_STORAGE_KEYS.TOKEN, 'SHORT42');
    expect(leerOrigen()).toEqual({ tipo: 'invitacion', token: 'SHORT42' });
  });

  it('la invitación gana sobre la vitrina: el precio de una persona concreta manda sobre un link reenviado', () => {
    guardarOrigenVitrina('AB3K9P', 2.6);
    sessionStorage.setItem(INVITATION_STORAGE_KEYS.TOKEN, 'SHORT42');
    expect(leerOrigen()).toEqual({ tipo: 'invitacion', token: 'SHORT42' });
  });

  it('ignora una cadena en blanco en vez de mandarla como token', () => {
    sessionStorage.setItem(INVITATION_STORAGE_KEYS.TOKEN, '   ');
    sessionStorage.setItem(ORIGEN_VITRINA_KEY, '  ');
    expect(leerOrigen()).toBeUndefined();
  });

  it('recorta los espacios del token guardado', () => {
    sessionStorage.setItem(ORIGEN_VITRINA_KEY, '  AB3K9P  ');
    expect(leerOrigen()?.token).toBe('AB3K9P');
  });

  it('sin multiplicador guardado cae a 1 — el precio base, no un NaN', () => {
    sessionStorage.setItem(ORIGEN_VITRINA_KEY, 'AB3K9P');
    expect(leerOrigen()?.multiplicador).toBe(1);
  });

  it('un multiplicador corrupto cae a 1 en vez de propagar NaN al total', () => {
    sessionStorage.setItem(ORIGEN_VITRINA_KEY, 'AB3K9P');
    sessionStorage.setItem(ORIGEN_VITRINA_MULT_KEY, 'basura');
    expect(leerOrigen()?.multiplicador).toBe(1);
  });
});

describe('guardarOrigenVitrina', () => {
  beforeEach(() => sessionStorage.clear());

  it('un token vacío borra el origen en vez de guardar basura', () => {
    guardarOrigenVitrina('AB3K9P', 2.6);
    guardarOrigenVitrina('');
    expect(leerOrigen()).toBeUndefined();
    expect(sessionStorage.getItem(ORIGEN_VITRINA_MULT_KEY)).toBeNull();
  });

  it('undefined también borra — es lo que llega de una lista de ids sin registro', () => {
    guardarOrigenVitrina('AB3K9P');
    guardarOrigenVitrina(undefined);
    expect(sessionStorage.getItem(ORIGEN_VITRINA_KEY)).toBeNull();
  });

  it('reemplaza el origen anterior en vez de acumular', () => {
    guardarOrigenVitrina('PRIMERA', 2.6);
    guardarOrigenVitrina('SEGUNDA', 1.4);
    expect(leerOrigen()).toEqual({
      tipo: 'vitrina',
      token: 'SEGUNDA',
      multiplicador: 1.4,
    });
  });
});

describe('limpiarOrigen', () => {
  beforeEach(() => sessionStorage.clear());

  it('borra la vitrina pero deja la invitación, que tiene su propio ciclo de vida', () => {
    guardarOrigenVitrina('AB3K9P', 2.6);
    sessionStorage.setItem(INVITATION_STORAGE_KEYS.TOKEN, 'SHORT42');
    limpiarOrigen();
    expect(sessionStorage.getItem(ORIGEN_VITRINA_KEY)).toBeNull();
    expect(leerOrigen()).toEqual({ tipo: 'invitacion', token: 'SHORT42' });
  });
});

describe('sessionStorage inaccesible (Safari privado, almacenamiento bloqueado)', () => {
  const original = Object.getOwnPropertyDescriptor(
    window,
    'sessionStorage',
  ) as PropertyDescriptor;

  const explotar = () => {
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new DOMException('acceso denegado', 'SecurityError');
      },
    });
  };

  afterEach(() => Object.defineProperty(window, 'sessionStorage', original));

  it('leerOrigen devuelve undefined en vez de lanzar — sin origen se cobra el precio base', () => {
    explotar();
    expect(() => leerOrigen()).not.toThrow();
    expect(leerOrigen()).toBeUndefined();
  });

  it('guardar y limpiar no lanzan: un fallo de almacenamiento nunca rompe el checkout', () => {
    explotar();
    expect(() => guardarOrigenVitrina('AB3K9P', 2.6)).not.toThrow();
    expect(() => limpiarOrigen()).not.toThrow();
  });
});
