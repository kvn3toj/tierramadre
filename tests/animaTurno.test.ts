import { describe, it, expect, vi } from 'vitest';
import {
  FALLBACK_TURNO,
  esTurnoRespuesta,
  parseTurno,
  reenviarTurno,
} from '../api/_lib/anima-turno.js';

const CUERPO = {
  canal: 'whatsapp',
  externalId: 'ghl-contact-1',
  mensaje: 'quiero un anillo',
};

describe('parseTurno — lo que manda la tool de María', () => {
  it('acepta el cuerpo mínimo y recorta los opcionales vacíos', () => {
    const t = parseTurno({ ...CUERPO, nombre: '  ', origen: 'pauta-x' });
    expect(t).toEqual({ ...CUERPO, origen: 'pauta-x' });
  });

  it('acepta mensaje vacío — el cliente pudo mandar solo una foto', () => {
    expect(parseTurno({ ...CUERPO, mensaje: '' })).toMatchObject({
      mensaje: '',
    });
  });

  it('rechaza cuerpos a medias en vez de crear leads fantasma', () => {
    for (const malo of [
      null,
      'texto',
      {},
      { canal: 'whatsapp' },
      { canal: 'whatsapp', externalId: ' ' },
      { canal: 'whatsapp', externalId: '1', mensaje: 42 },
    ]) {
      expect(parseTurno(malo), JSON.stringify(malo)).toBeNull();
    }
  });
});

describe('reenviarTurno — el túnel puede fallar de todas las formas', () => {
  const CFG = { upstream: 'https://tunel.trycloudflare.com/', secret: 's' };

  it('reenvía tal cual y devuelve la respuesta del cotizador', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ estado: 'pregunta', pregunta: '¿Qué pieza?' }),
    }));
    const r = await reenviarTurno({ ...CFG, fetchImpl }, CUERPO);

    expect(r).toEqual({ estado: 'pregunta', pregunta: '¿Qué pieza?' });
    const [url, init] = fetchImpl.mock.calls[0];
    // La barra final del upstream no puede producir //cotizador/turno.
    expect(url).toBe('https://tunel.trycloudflare.com/cotizador/turno');
    expect(init?.headers?.authorization).toBe('Bearer s');
    expect(JSON.parse(init?.body ?? '')).toEqual(CUERPO);
  });

  it('null si el upstream contesta un status raro', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 502,
      json: async () => ({}),
    }));
    expect(await reenviarTurno({ ...CFG, fetchImpl }, CUERPO)).toBeNull();
  });

  it('null si la respuesta no tiene forma de TurnoRespuesta', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ hola: true }),
    }));
    expect(await reenviarTurno({ ...CFG, fetchImpl }, CUERPO)).toBeNull();
  });

  it('null si la red explota — el handler decide el fallback, no esta capa', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    });
    expect(await reenviarTurno({ ...CFG, fetchImpl }, CUERPO)).toBeNull();
  });
});

describe('textoParaCliente — el único merge tag que el workflow envía', () => {
  it('pregunta → la pregunta; cotizacion/en_revision → el mensaje', async () => {
    const { textoParaCliente } = await import('../api/_lib/anima-turno.js');
    expect(
      textoParaCliente({ estado: 'pregunta', pregunta: '¿Qué pieza?' }),
    ).toBe('¿Qué pieza?');
    expect(
      textoParaCliente({ estado: 'cotizacion', mensaje: '¡Listo! 💚' }),
    ).toBe('¡Listo! 💚');
    expect(
      textoParaCliente({ estado: 'en_revision', mensaje: 'Dame un momento' }),
    ).toBe('Dame un momento');
  });

  it('sin_cotizacion o forma rara → vacío: el workflow NO envía nada', async () => {
    const { textoParaCliente } = await import('../api/_lib/anima-turno.js');
    expect(
      textoParaCliente({ estado: 'sin_cotizacion', mensaje: undefined }),
    ).toBe('');
    expect(textoParaCliente({ estado: 'pregunta', pregunta: 42 })).toBe('');
  });
});

describe('el fallback que oye María', () => {
  it('es un TurnoRespuesta válido, con estado que ella ya sabe decir', () => {
    expect(esTurnoRespuesta(FALLBACK_TURNO)).toBe(true);
    expect(FALLBACK_TURNO.estado).toBe('en_revision');
    expect(FALLBACK_TURNO.fallback).toBe(true);
    expect(FALLBACK_TURNO.mensaje.length).toBeGreaterThan(0);
  });
});
