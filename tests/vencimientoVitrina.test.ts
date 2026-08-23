/**
 * Vencimiento de vitrinas — el reloj que convierte una cotización en un lead.
 *
 * Lo que se fija acá:
 *   1. El vencimiento cuelga de `createdAt`, no del despliegue. Es lo que hace
 *      que el parque de 48 links vivos se vacíe solo en vez de apagarse de
 *      golpe un martes.
 *   2. Un `expiraEn` explícito manda sobre el TTL, para que algún día se pueda
 *      elegir la duración al compartir sin tocar la constante.
 *   3. **Una fecha ilegible cuenta como VIGENTE.** Es la rama que más importa:
 *      dar por vencida una vitrina que no lo está le borra a un cliente el
 *      precio que le prometieron. El error barato es el otro.
 */
import { describe, it, expect } from 'vitest';
import {
  VITRINA_TTL_MS,
  venceEn,
  estaVencida,
  tiempoRestanteMs,
} from '../convex/_lib/vencimientoVitrina';

const DIA = 24 * 60 * 60 * 1000;
const CREADA = '2026-08-01T12:00:00.000Z';
const T0 = Date.parse(CREADA);

describe('venceEn', () => {
  it('cuelga del createdAt, no del momento del despliegue', () => {
    expect(venceEn({ createdAt: CREADA })).toBe(T0 + VITRINA_TTL_MS);
  });

  it('un expiraEn explícito manda sobre el TTL', () => {
    const explicito = '2026-08-05T00:00:00.000Z';
    expect(venceEn({ createdAt: CREADA, expiraEn: explicito })).toBe(
      Date.parse(explicito),
    );
  });

  it('devuelve null cuando no hay fecha con la que contar', () => {
    expect(venceEn({})).toBeNull();
    expect(venceEn({ createdAt: null })).toBeNull();
    expect(venceEn({ createdAt: '   ' })).toBeNull();
    expect(venceEn({ createdAt: 'no soy una fecha' })).toBeNull();
  });
});

describe('estaVencida', () => {
  it('sigue vigente el día anterior al vencimiento', () => {
    expect(estaVencida({ createdAt: CREADA }, T0 + VITRINA_TTL_MS - DIA)).toBe(
      false,
    );
  });

  it('vence exactamente al cumplirse el TTL, no un instante después', () => {
    expect(estaVencida({ createdAt: CREADA }, T0 + VITRINA_TTL_MS)).toBe(true);
  });

  it('sigue vencida mucho después', () => {
    expect(estaVencida({ createdAt: CREADA }, T0 + 365 * DIA)).toBe(true);
  });

  it('una fecha ilegible cuenta como VIGENTE — nunca le borra el precio a un cliente legítimo', () => {
    expect(estaVencida({ createdAt: 'basura' }, T0 + 365 * DIA)).toBe(false);
    expect(estaVencida({}, T0 + 365 * DIA)).toBe(false);
  });

  it('con TTL de 30 días, una vitrina de 29 días sobrevive y una de 31 no', () => {
    // Medido el 2026-08-23 sobre las 48 vivas: 8 de la última semana, 40 de
    // entre 8 y 30 días, ninguna más vieja. Con este TTL las de la semana
    // conservan ~3 semanas y sólo caen las que ya rozaban el mes — que es
    // exactamente lo que se quería, no un daño colateral.
    const ahora = Date.parse('2026-08-23T00:00:00.000Z');
    const hace = (d: number) => new Date(ahora - d * DIA).toISOString();
    expect(estaVencida({ createdAt: hace(29) }, ahora)).toBe(false);
    expect(estaVencida({ createdAt: hace(31) }, ahora)).toBe(true);
  });

  it('la de EXACTAMENTE 30 días vence — el borde cae del lado de vencida', () => {
    // No es un detalle: la vitrina más antigua medida tenía justo 30 días, así
    // que este borde decide si el despliegue apaga un link el primer día.
    const ahora = Date.parse('2026-08-23T00:00:00.000Z');
    expect(
      estaVencida({ createdAt: new Date(ahora - 30 * DIA).toISOString() }, ahora),
    ).toBe(true);
  });
});

describe('tiempoRestanteMs', () => {
  it('cuenta lo que queda', () => {
    expect(tiempoRestanteMs({ createdAt: CREADA }, T0 + DIA)).toBe(
      VITRINA_TTL_MS - DIA,
    );
  });

  it('nunca es negativo', () => {
    expect(tiempoRestanteMs({ createdAt: CREADA }, T0 + 365 * DIA)).toBe(0);
  });

  it('null cuando no se sabe', () => {
    expect(tiempoRestanteMs({}, T0)).toBeNull();
  });
});
