import { describe, it, expect, beforeEach } from 'vitest';
import { permitir, ipDe, _reiniciarLimites, LIMITES } from '../api/_lib/renacer-ratelimit';

describe('permitir — límite por IP y minuto', () => {
  beforeEach(() => _reiniciarLimites());

  it('deja pasar hasta el límite y frena el siguiente', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) expect(permitir('registro', '1.1.1.1', 5, t0 + i)).toBe(true);
    expect(permitir('registro', '1.1.1.1', 5, t0 + 10)).toBe(false);
  });

  it('otra IP y otra clave no comparten cuota (control negativo)', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) permitir('registro', '1.1.1.1', 5, t0 + i);
    expect(permitir('registro', '2.2.2.2', 5, t0 + 10)).toBe(true);
    expect(permitir('renacer-kit', '1.1.1.1', 5, t0 + 10)).toBe(true);
  });

  it('la ventana desliza: pasado el minuto vuelve a dejar pasar', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) permitir('registro', '1.1.1.1', 5, t0 + i);
    expect(permitir('registro', '1.1.1.1', 5, t0 + 30_000)).toBe(false);
    expect(permitir('registro', '1.1.1.1', 5, t0 + 60_001)).toBe(true);
  });

  it('los techos por endpoint son los esperados', () => {
    expect(LIMITES.registro).toBeLessThan(LIMITES.resolverCodigo);
    expect(LIMITES.voluntario).toBe(LIMITES.registro);
  });
});

describe('ipDe', () => {
  it('toma la primera IP de x-forwarded-for, si no x-real-ip, si no el socket', () => {
    const req = (headers: Record<string, string>, remote?: string) =>
      ({ headers, socket: { remoteAddress: remote } }) as never;
    expect(ipDe(req({ 'x-forwarded-for': '9.9.9.9, 10.0.0.1' }))).toBe('9.9.9.9');
    expect(ipDe(req({ 'x-real-ip': '8.8.8.8' }))).toBe('8.8.8.8');
    expect(ipDe(req({}, '127.0.0.1'))).toBe('127.0.0.1');
    expect(ipDe(req({}))).toBe('desconocida');
  });
});
