/**
 * @vitest-environment jsdom
 *
 * Necesita `localStorage`. Se declara acá y no en `vitest.config.ts` para no tocar
 * configuración compartida por un solo archivo.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  guardarCredencial,
  leerCredencial,
  leerCredenciales,
  olvidarCredencial,
  guardarBorrador,
  leerBorrador,
  borrarBorrador,
} from '../src/pages/renacer/renacerApi';

/**
 * La regresión que este archivo existe para impedir (2026-09-01).
 *
 * Hasta hoy las credenciales de carnet vivían en UNA clave de `localStorage` que se
 * sobrescribía en cada registro exitoso. En una mesa de registro asistido —una raíz con un
 * solo teléfono inscribiendo a varias familias— la familia 2 borraba el carnet de la
 * familia 1, y así sucesivamente. El `cardToken` se entrega una única vez y **no hay
 * consulta del lado del servidor que lo devuelva**, así que el carnet no lo podía
 * recuperar nadie: ni la raíz, ni operaciones.
 *
 * Y el defecto caía justo sobre el registro asistido, que es la mitigación de equidad del
 * §9 — la que existe para quien no tiene teléfono propio.
 */

const c = (n: number) => ({ cardNumber: n, cardToken: `tok-${n}` });

beforeEach(() => {
  localStorage.clear();
});

describe('credenciales — varias familias en un solo teléfono', () => {
  it('guarda VARIAS y no pierde ninguna (el bug de la mesa de registro)', () => {
    guardarCredencial(c(111));
    guardarCredencial(c(112));
    guardarCredencial(c(113));

    const todas = leerCredenciales();
    expect(todas).toHaveLength(3);
    expect(todas.map((x) => x.cardNumber).sort((a, b) => a - b)).toEqual([111, 112, 113]);
    // El control negativo del bug viejo: la primera NO desapareció.
    expect(todas.find((x) => x.cardNumber === 111)?.cardToken).toBe('tok-111');
  });

  it('la "actual" es la última registrada, no la primera', () => {
    guardarCredencial(c(111));
    guardarCredencial(c(112));
    expect(leerCredencial()?.cardNumber).toBe(112);
  });

  it('re-guardar el mismo carnet lo actualiza sin duplicarlo', () => {
    guardarCredencial(c(111));
    guardarCredencial({ cardNumber: 111, cardToken: 'tok-nuevo' });
    const todas = leerCredenciales();
    expect(todas).toHaveLength(1);
    expect(todas[0]?.cardToken).toBe('tok-nuevo');
  });

  it('olvidar saca una sola y deja las demás (teléfono prestado o compartido)', () => {
    guardarCredencial(c(111));
    guardarCredencial(c(112));
    olvidarCredencial(112);
    expect(leerCredenciales().map((x) => x.cardNumber)).toEqual([111]);
  });

  it('migra el formato viejo de una sola credencial en vez de descartarlo', () => {
    // Un teléfono que ya venía usándose antes del cambio no puede perder su carnet.
    localStorage.setItem(
      'renacer:credencial',
      JSON.stringify({ cardNumber: 99, cardToken: 'tok-viejo' }),
    );
    expect(leerCredencial()?.cardNumber).toBe(99);

    // Y al guardar una nueva, la migrada sobrevive y la clave vieja se retira.
    guardarCredencial(c(100));
    expect(
      leerCredenciales()
        .map((x) => x.cardNumber)
        .sort((a, b) => a - b),
    ).toEqual([99, 100]);
    expect(localStorage.getItem('renacer:credencial')).toBeNull();
  });

  it('sin nada guardado no explota: devuelve lista vacía y null', () => {
    expect(leerCredenciales()).toEqual([]);
    expect(leerCredencial()).toBeNull();
  });

  it('basura en el almacenamiento no rompe la pantalla', () => {
    localStorage.setItem('renacer:credenciales', 'no soy json');
    expect(leerCredenciales()).toEqual([]);
    localStorage.setItem(
      'renacer:credenciales',
      JSON.stringify([{ roto: true }, c(5)]),
    );
    expect(leerCredenciales().map((x) => x.cardNumber)).toEqual([5]);
  });
});

describe('borrador — la entrevista sobrevive a un refresh', () => {
  it('guarda y restaura por código', () => {
    guardarBorrador(101, { nombre: 'Marta', edad: '41' });
    expect(leerBorrador<{ nombre: string }>(101)?.nombre).toBe('Marta');
  });

  it('dos entrevistas a medias en el mismo teléfono NO se pisan', () => {
    // Es el caso de la mesa de registro asistido, el mismo que rompía las credenciales.
    guardarBorrador(101, { nombre: 'Marta' });
    guardarBorrador(102, { nombre: 'Hernando' });
    expect(leerBorrador<{ nombre: string }>(101)?.nombre).toBe('Marta');
    expect(leerBorrador<{ nombre: string }>(102)?.nombre).toBe('Hernando');
  });

  it('se borra al terminar, y borrar uno no toca al otro', () => {
    guardarBorrador(101, { nombre: 'Marta' });
    guardarBorrador(102, { nombre: 'Hernando' });
    borrarBorrador(101);
    expect(leerBorrador(101)).toBeNull();
    expect(leerBorrador<{ nombre: string }>(102)?.nombre).toBe('Hernando');
  });

  it('un borrador inexistente devuelve null, no basura', () => {
    expect(leerBorrador(999)).toBeNull();
  });
});
