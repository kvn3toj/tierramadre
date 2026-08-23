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

  it('normaliza {{message.attachments}} en la forma que GHL lo mande', async () => {
    const { normalizaAdjunto } = await import('../api/_lib/anima-turno.js');
    const U1 = 'https://services.leadconnectorhq.com/media/f1.jpg';
    const U2 = 'https://services.leadconnectorhq.com/media/f2.jpg';
    // Array real, string JSON, CSV, espacio/nueva línea, URL sola — SIEMPRE la primera URL.
    expect(normalizaAdjunto([U1, U2])).toBe(U1);
    expect(normalizaAdjunto(JSON.stringify([U1, U2]))).toBe(U1);
    expect(normalizaAdjunto(`${U1},${U2}`)).toBe(U1);
    expect(normalizaAdjunto(`${U1}\n${U2}`)).toBe(U1);
    expect(normalizaAdjunto(U1)).toBe(U1);
  });

  it('un adjunto vacío o ilegible queda en undefined — la PRESENCIA cambia el flujo en anima-bot', async () => {
    const { normalizaAdjunto } = await import('../api/_lib/anima-turno.js');
    for (const malo of [
      undefined,
      '',
      '  ',
      '[]',
      '[""]',
      '{{message.attachments}}', // el pill sin renderizar
      'sin adjunto',
      42,
      { url: 'https://x' },
    ]) {
      expect(normalizaAdjunto(malo), JSON.stringify(malo)).toBeUndefined();
    }
  });

  it('parseTurno pasa el adjunto normalizado al contrato de anima-bot', () => {
    const U = 'https://services.leadconnectorhq.com/media/f1.jpg';
    expect(parseTurno({ ...CUERPO, adjunto: `["${U}"]` })).toMatchObject({
      adjunto: U,
    });
    // Cliente sin foto: el campo ni aparece.
    const sin = parseTurno({ ...CUERPO, adjunto: '' });
    expect(sin?.adjunto).toBeUndefined();
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

describe('autorizacionValida — con o sin el esquema Bearer', () => {
  it('acepta "Bearer <secreto>" y el secreto crudo; rechaza lo demás', async () => {
    const { autorizacionValida } = await import('../api/_lib/anima-turno.js');
    expect(autorizacionValida('Bearer s3cr3t', 's3cr3t')).toBe(true);
    // El editor de pills de GHL no garantiza el prefijo — el crudo también vale.
    expect(autorizacionValida('s3cr3t', 's3cr3t')).toBe(true);
    expect(autorizacionValida('  s3cr3t  ', 's3cr3t')).toBe(true);
    expect(autorizacionValida('Bearer otro', 's3cr3t')).toBe(false);
    expect(autorizacionValida('otro', 's3cr3t')).toBe(false);
    expect(autorizacionValida(undefined, 's3cr3t')).toBe(false);
    expect(autorizacionValida('s3cr3t', undefined)).toBe(false);
    expect(autorizacionValida('', 's3cr3t')).toBe(false);
  });
});

describe('sendConversationMessage — el envío de sesión a GHL', () => {
  it('POST a /conversations/messages con Version y Bearer', async () => {
    const { sendConversationMessage, tipoDeCanal } =
      await import('../api/_lib/ghl-send.js');
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 201,
      json: async () => ({}),
    }));
    const r = await sendConversationMessage(
      { token: 'tok', fetchImpl },
      {
        type: tipoDeCanal('whatsapp')!,
        contactId: 'c1',
        message: 'hola 💚',
      },
    );
    expect(r).toEqual({ ok: true, status: 201 });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(
      'https://services.leadconnectorhq.com/conversations/messages',
    );
    expect(init?.headers?.Authorization).toBe('Bearer tok');
    expect(init?.headers?.Version).toBe('2021-07-28');
    expect(JSON.parse(init?.body ?? '')).toEqual({
      type: 'WhatsApp',
      contactId: 'c1',
      message: 'hola 💚',
    });
  });

  it('no lanza ante red muerta — devuelve ok:false', async () => {
    const { sendConversationMessage } = await import('../api/_lib/ghl-send.js');
    const fetchImpl = vi.fn(async () => {
      throw new Error('ECONNRESET');
    });
    const r = await sendConversationMessage(
      { token: 'tok', fetchImpl },
      { type: 'WhatsApp', contactId: 'c1', message: 'x' },
    );
    // Desde el PR #137 el fallo también trae `error` (la causa que GHL nombra).
    expect(r).toMatchObject({ ok: false, status: 0 });
    expect(r.error).toContain('ECONNRESET');
  });

  it('mapea los canales de anima-bot a los type de GHL', async () => {
    const { tipoDeCanal } = await import('../api/_lib/ghl-send.js');
    expect(tipoDeCanal('whatsapp')).toBe('WhatsApp');
    expect(tipoDeCanal('WhatsApp ')).toBe('WhatsApp');
    expect(tipoDeCanal('instagram')).toBe('IG');
    expect(tipoDeCanal('facebook')).toBe('FB');
    expect(tipoDeCanal('telegram')).toBeNull();
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

describe('adjuntoDesdeApi — el pill de GHL viene vacío y el proxy pregunta él mismo', () => {
  const U = 'https://services.leadconnectorhq.com/media/real.jpg';
  const AHORA = 1_755_720_000_000;

  function fetchDeGhl(mensajes: unknown[]) {
    return async (url: string) => ({
      ok: true,
      status: 200,
      json: async () =>
        url.includes('/conversations/search')
          ? { conversations: [{ id: 'c1', contactId: 'k1' }] }
          : { messages: { messages: mensajes, nextPage: false } },
    });
  }

  it('el último mensaje ENTRANTE trae attachments → primera URL', async () => {
    const { adjuntoDesdeApi } = await import('../api/_lib/anima-turno.js');
    const r = await adjuntoDesdeApi(
      {
        token: 't',
        locationId: 'l',
        fetchImpl: fetchDeGhl([
          {
            id: 'm3',
            direction: 'outbound',
            body: 'hola',
            dateAdded: new Date(AHORA).toISOString(),
          },
          {
            id: 'm2',
            direction: 'inbound',
            body: '',
            attachments: [U, 'https://x/otro.jpg'],
            dateAdded: new Date(AHORA - 5_000).toISOString(),
          },
        ]),
      },
      'k1',
      { nowMs: AHORA },
    );
    expect(r).toBe(U);
  });

  it('el último entrante NO trae attachments → undefined (nada de fotos viejas)', async () => {
    const { adjuntoDesdeApi } = await import('../api/_lib/anima-turno.js');
    const r = await adjuntoDesdeApi(
      {
        token: 't',
        locationId: 'l',
        fetchImpl: fetchDeGhl([
          {
            id: 'm2',
            direction: 'inbound',
            body: 'sin foto',
            dateAdded: new Date(AHORA - 5_000).toISOString(),
          },
          {
            id: 'm1',
            direction: 'inbound',
            body: '',
            attachments: [U],
            dateAdded: new Date(AHORA - 3 * 24 * 3600 * 1000).toISOString(),
          },
        ]),
      },
      'k1',
      { nowMs: AHORA },
    );
    expect(r).toBeUndefined();
  });

  it('un adjunto más viejo que la ventana no cuenta como "de este turno"', async () => {
    const { adjuntoDesdeApi } = await import('../api/_lib/anima-turno.js');
    const r = await adjuntoDesdeApi(
      {
        token: 't',
        locationId: 'l',
        fetchImpl: fetchDeGhl([
          {
            id: 'm1',
            direction: 'inbound',
            body: '',
            attachments: [U],
            dateAdded: new Date(AHORA - 60 * 60 * 1000).toISOString(),
          },
        ]),
      },
      'k1',
      { nowMs: AHORA },
    );
    expect(r).toBeUndefined();
  });

  it('sin conversaciones, o con la API caída, devuelve undefined sin tirar', async () => {
    const { adjuntoDesdeApi } = await import('../api/_lib/anima-turno.js');
    const sinConvos = await adjuntoDesdeApi(
      {
        token: 't',
        locationId: 'l',
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          json: async () => ({ conversations: [] }),
        }),
      },
      'k1',
      { nowMs: AHORA },
    );
    expect(sinConvos).toBeUndefined();

    const caida = await adjuntoDesdeApi(
      {
        token: 't',
        locationId: 'l',
        fetchImpl: async () => {
          throw new Error('boom');
        },
      },
      'k1',
      { nowMs: AHORA },
    );
    expect(caida).toBeUndefined();
  });
});
