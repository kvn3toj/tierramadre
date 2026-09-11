/**
 * Clientes autorregistrados (2026-09-09): un correo de Google que no está en
 * Asesores ni Proveedores entra como `cliente`. Ve precios, pero NUNCA lo
 * interno: su token de sesión lleva el sello `lvl: 'cliente'` y el resolvedor
 * de grants lo traduce a la proyección de vitrina sobre todo el catálogo.
 * Un token sin sello sigue siendo staff (compatibilidad con los ya emitidos).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  mintSessionToken,
  verifySessionToken,
  verifyAnySessionToken,
} from '../api/_lib/sessionToken';
import {
  verifySessionToken as verifySessionTokenConvex,
  verifyAnySessionToken as verifyAnySessionTokenConvex,
} from '../convex/_lib/sessionToken';
import { isStaffSession } from '../convex/_lib/requireStaffSession';
import { resolveGrant, bearerWasRejected } from '../api/_lib/catalogGrant';
import {
  projectForGrant,
  projectAsesoresForGrant,
} from '../api/_lib/catalogProjection';
import type { TreasureItem } from '../src/types/treasure';

const SECRET = 'test-admin-sync-token';
let saved: string | undefined;
beforeEach(() => {
  saved = process.env.ADMIN_SYNC_TOKEN;
  process.env.ADMIN_SYNC_TOKEN = SECRET;
});
afterEach(() => {
  if (saved === undefined) delete process.env.ADMIN_SYNC_TOKEN;
  else process.env.ADMIN_SYNC_TOKEN = saved;
});

const req = (headers = {}, query = {}) => ({ headers, query }) as never;
const neverCalled = vi.fn(async () => {
  throw new Error('vitrina lookup must not be called');
});

describe('session token con sello de cliente', () => {
  it('verifyAny round-trips lvl=cliente en Node y en el espejo Convex', async () => {
    const token = mintSessionToken('cliente@gmail.com', { lvl: 'cliente' })!;
    expect(verifyAnySessionToken(token)?.lvl).toBe('cliente');
    expect((await verifyAnySessionTokenConvex(token))?.lvl).toBe('cliente');
  });

  it('el verificador de STAFF rechaza el token sellado en Node y en Convex', async () => {
    // Ésta es la propiedad que mantiene ciertos todos los gates escritos
    // sobre la premisa "sólo el roster puede acuñar un tms1".
    const token = mintSessionToken('cliente@gmail.com', { lvl: 'cliente' })!;
    expect(verifySessionToken(token)).toBeNull();
    expect(await verifySessionTokenConvex(token)).toBeNull();
    expect(await isStaffSession(token)).toBe(false);
  });

  it('un token sin sello sigue siendo staff en los dos verificadores', async () => {
    const token = mintSessionToken('asesor@tierramadre.app')!;
    expect(verifySessionToken(token)?.email).toBe('asesor@tierramadre.app');
    expect(verifySessionToken(token)?.lvl).toBeUndefined();
    expect(await isStaffSession(token)).toBe(true);
  });
});

describe('resolveGrant para clientes', () => {
  it('token con lvl=cliente → grant cliente, no staff', async () => {
    const token = mintSessionToken('cliente@gmail.com', { lvl: 'cliente' });
    const g = await resolveGrant(req({ authorization: `Bearer ${token}` }), {
      lookupVitrina: neverCalled,
    });
    expect(g).toEqual({ kind: 'cliente' });
  });

  it('token sin sello sigue siendo staff', async () => {
    const token = mintSessionToken('asesor@tierramadre.app');
    const g = await resolveGrant(req({ authorization: `Bearer ${token}` }), {
      lookupVitrina: neverCalled,
    });
    expect(g).toEqual({ kind: 'staff' });
  });

  it('un bearer de cliente válido NO cuenta como rechazado (sin doble fetch)', async () => {
    const token = mintSessionToken('cliente@gmail.com', { lvl: 'cliente' });
    const r = req({ authorization: `Bearer ${token}` });
    const g = await resolveGrant(r, { lookupVitrina: neverCalled });
    expect(bearerWasRejected(r, g)).toBe(false);
  });
});

describe('projectForGrant para clientes', () => {
  const ROW = {
    item: 368,
    nombre: 'Venus',
    precioCOP: 1_000_000,
    precioInternacional: 250,
    cantidad: 1,
    estado: 'DISPONIBLE',
    ubicacion: 'Bóveda 2',
    asesor: 'Persona Real',
    costoTM: 400_000,
    caja: 'C-3',
  } as unknown as TreasureItem;

  it('da precio y disponibilidad, retiene ubicación/asesor/costo', () => {
    const [out] = projectForGrant([ROW], { kind: 'cliente' }) as Record<
      string,
      unknown
    >[];
    expect(out.precioCOP).toBe(1_000_000);
    expect(out.precioInternacional).toBe(250);
    expect(out.estado).toBe('DISPONIBLE');
    expect(out).not.toHaveProperty('ubicacion');
    expect(out).not.toHaveProperty('asesor');
    expect(out).not.toHaveProperty('costoTM');
    expect(out).not.toHaveProperty('caja');
  });

  it('el directorio de asesores queda en proyección pública', () => {
    const asesor = {
      id: '1',
      name: 'A',
      email: 'a@x.com',
      whatsapp: '3000000000',
      photoUrl: '',
    } as never;
    const [out] = projectAsesoresForGrant([asesor], { kind: 'cliente' }) as Record<
      string,
      unknown
    >[];
    expect(out).not.toHaveProperty('email');
  });
});
