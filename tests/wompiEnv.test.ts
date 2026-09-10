import { describe, it, expect } from 'vitest';
import {
  wompiEnvFromCredential,
  wompiEnvFromBaseUrl,
  resolveWompiEnv,
} from '../api/_lib/wompiEnv';

describe('wompiEnvFromCredential — el prefijo dice el ambiente, el valor nunca se lee', () => {
  it('clasifica los cuatro prefijos de sandbox', () => {
    expect(wompiEnvFromCredential('pub_test_abc')).toBe('sandbox');
    expect(wompiEnvFromCredential('prv_test_abc')).toBe('sandbox');
    expect(wompiEnvFromCredential('test_integrity_abc')).toBe('sandbox');
    expect(wompiEnvFromCredential('test_events_abc')).toBe('sandbox');
  });

  it('clasifica los cuatro prefijos de producción', () => {
    expect(wompiEnvFromCredential('pub_prod_abc')).toBe('production');
    expect(wompiEnvFromCredential('prv_prod_abc')).toBe('production');
    expect(wompiEnvFromCredential('prod_integrity_abc')).toBe('production');
    expect(wompiEnvFromCredential('prod_events_abc')).toBe('production');
  });

  it('devuelve null para vacío, undefined o un valor sin prefijo conocido', () => {
    expect(wompiEnvFromCredential(undefined)).toBeNull();
    expect(wompiEnvFromCredential('')).toBeNull();
    expect(wompiEnvFromCredential('secret_x')).toBeNull();
  });
});

describe('wompiEnvFromBaseUrl', () => {
  it('reconoce sandbox y producción por el host', () => {
    expect(wompiEnvFromBaseUrl('https://sandbox.wompi.co/v1')).toBe('sandbox');
    expect(wompiEnvFromBaseUrl('https://production.wompi.co/v1')).toBe(
      'production',
    );
  });
  it('null si falta o no es un host de Wompi', () => {
    expect(wompiEnvFromBaseUrl(undefined)).toBeNull();
    expect(wompiEnvFromBaseUrl('https://api.mercadopago.com')).toBeNull();
  });
});

describe('resolveWompiEnv — las cinco variables viajan juntas, nunca mezcladas', () => {
  const sandbox = {
    WOMPI_PUBLIC_KEY: 'pub_test_a',
    WOMPI_PRIVATE_KEY: 'prv_test_a',
    WOMPI_INTEGRITY_SECRET: 'test_integrity_a',
    WOMPI_EVENTS_SECRET: 'test_events_a',
    WOMPI_BASE_URL: 'https://sandbox.wompi.co/v1',
  };
  const production = {
    WOMPI_PUBLIC_KEY: 'pub_prod_a',
    WOMPI_PRIVATE_KEY: 'prv_prod_a',
    WOMPI_INTEGRITY_SECRET: 'prod_integrity_a',
    WOMPI_EVENTS_SECRET: 'prod_events_a',
    WOMPI_BASE_URL: 'https://production.wompi.co/v1',
  };

  it('sandbox completo → ok/sandbox', () => {
    expect(resolveWompiEnv(sandbox)).toEqual({ status: 'ok', env: 'sandbox' });
  });

  it('producción completa → ok/production', () => {
    expect(resolveWompiEnv(production)).toEqual({
      status: 'ok',
      env: 'production',
    });
  });

  it('nada configurado → unset', () => {
    expect(resolveWompiEnv({})).toEqual({ status: 'unset' });
  });

  it('una llave de test contra la base de producción → mismatch, y nombra las variables', () => {
    const r = resolveWompiEnv({ ...production, WOMPI_PUBLIC_KEY: 'pub_test_a' });
    expect(r.status).toBe('mismatch');
    expect(r.detail).toContain('WOMPI_PUBLIC_KEY');
  });

  it('cuatro llaves prod con base sandbox → mismatch', () => {
    const r = resolveWompiEnv({
      ...production,
      WOMPI_BASE_URL: 'https://sandbox.wompi.co/v1',
    });
    expect(r.status).toBe('mismatch');
    expect(r.detail).toContain('WOMPI_BASE_URL');
  });

  it('faltan variables pero las presentes concuerdan → incomplete, nombrando las ausentes', () => {
    const r = resolveWompiEnv({
      WOMPI_PUBLIC_KEY: 'pub_prod_a',
      WOMPI_INTEGRITY_SECRET: 'prod_integrity_a',
    });
    expect(r.status).toBe('incomplete');
    expect(r.env).toBe('production');
    expect(r.missing).toEqual([
      'WOMPI_PRIVATE_KEY',
      'WOMPI_EVENTS_SECRET',
      'WOMPI_BASE_URL',
    ]);
  });

  it('un valor sin prefijo conocido no cuenta como señal (no provoca mismatch)', () => {
    // El test de `checkoutLink` usa `secret_x` como secreto de integridad —
    // un valor así es inclasificable, no contradictorio.
    const r = resolveWompiEnv({
      WOMPI_PUBLIC_KEY: 'pub_test_x',
      WOMPI_INTEGRITY_SECRET: 'secret_x',
    });
    expect(r.status).toBe('incomplete');
    expect(r.env).toBe('sandbox');
  });

  it('nunca incluye un valor de credencial en el resultado', () => {
    const r = resolveWompiEnv({ ...production, WOMPI_PUBLIC_KEY: 'pub_test_a' });
    expect(JSON.stringify(r)).not.toContain('pub_test_a');
    expect(JSON.stringify(r)).not.toContain('prv_prod_a');
  });
});
