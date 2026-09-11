import { describe, it, expect } from 'vitest';
import {
  mensajeDeRespuesta,
  traducirMensaje,
} from '../src/components/checkout/mensajesCheckout';
import { translations } from '../src/locales';

describe('mensajeDeRespuesta', () => {
  it('éxito: entrega la url de pago', () => {
    const r = mensajeDeRespuesta(200, {
      success: true,
      data: { checkout_url: 'https://checkout.wompi.co/p/?x=1', reused: false },
    });
    expect(r.tono).toBe('exito');
    expect(r.url).toBe('https://checkout.wompi.co/p/?x=1');
  });

  it('reused NO es un error — sigue al mismo link', () => {
    const r = mensajeDeRespuesta(200, {
      success: true,
      data: { checkout_url: 'https://checkout.wompi.co/p/?x=1', reused: true },
    });
    expect(r.tono).toBe('exito');
    expect(r.url).toBe('https://checkout.wompi.co/p/?x=1');
  });

  it('pedido guardado sin link: aviso, nunca "error"', () => {
    const r = mensajeDeRespuesta(201, {
      success: true,
      data: { order_id: 'VB-0007', checkout_url: null, pending: true },
    });
    expect(r.tono).toBe('aviso');
    expect(r.texto).toMatch(/VB-0007/);
    expect(r.url).toBeUndefined();
  });

  it('ITEM_RESERVED nombra la pieza', () => {
    const r = mensajeDeRespuesta(409, {
      success: false,
      error: 'ITEM_RESERVED',
      sku: 'C-090',
    });
    expect(r.tono).toBe('error');
    expect(r.texto).toMatch(/C-090/);
  });

  it('PRODUCT_UNAVAILABLE dice que ya se vendió', () => {
    const r = mensajeDeRespuesta(409, {
      success: false,
      error: 'PRODUCT_UNAVAILABLE',
    });
    expect(r.tono).toBe('error');
    expect(r.texto).toMatch(/vendi/i);
  });

  it('PRECIO_NO_DISPONIBLE nombra la pieza — carrito mixto, no sólo un total en cero', () => {
    const r = mensajeDeRespuesta(409, {
      success: false,
      error: 'PRECIO_NO_DISPONIBLE',
      sku: 'C-090',
    });
    expect(r.tono).toBe('error');
    expect(r.texto).toMatch(/C-090/);
  });

  it('PRECIO_NO_DISPONIBLE sin sku cae al mensaje genérico, no revienta', () => {
    const r = mensajeDeRespuesta(409, {
      success: false,
      error: 'PRECIO_NO_DISPONIBLE',
    });
    expect(r.tono).toBe('error');
    expect(r.texto).toMatch(/precio/i);
  });

  it('ZERO_TOTAL — pieza sin precio, nunca un cobro legítimo', () => {
    const r = mensajeDeRespuesta(409, {
      success: false,
      error: 'ZERO_TOTAL',
    });
    expect(r.tono).toBe('error');
    expect(r.texto).toMatch(/precio/i);
  });

  it('ORIGEN_INVALIDO no ofrece reintentar sin markup', () => {
    const r = mensajeDeRespuesta(409, {
      success: false,
      error: 'ORIGEN_INVALIDO',
    });
    expect(r.tono).toBe('error');
    expect(r.texto).toMatch(/enlace/i);
  });

  it('400 muestra el mensaje del campo', () => {
    const r = mensajeDeRespuesta(400, {
      success: false,
      error: 'Missing contact.celular',
    });
    expect(r.tono).toBe('error');
    expect(r.texto).toMatch(/celular/i);
  });

  it('500 es genérico y no filtra nada', () => {
    const r = mensajeDeRespuesta(500, {
      success: false,
      error: 'Internal server error',
    });
    expect(r.tono).toBe('error');
    expect(r.texto).not.toMatch(/convex|http|stack/i);
  });

  it('un cuerpo irreconocible no revienta', () => {
    expect(mensajeDeRespuesta(200, null).tono).toBe('error');
    expect(mensajeDeRespuesta(200, 'texto').tono).toBe('error');
  });

  it('403 sin cuerpo JSON (bloqueo en el edge) no invita a reintentar y ofrece WhatsApp', () => {
    // El WAF de Vercel (regla checkout-publico-llaves-test) responde 403 con un
    // cuerpo que no es JSON — res.json() da null. Es un bloqueo que dura hasta
    // que alguien levante la regla: «intenta de nuevo en un momento» miente.
    const r = mensajeDeRespuesta(403, null);
    expect(r.tono).toBe('error');
    expect(r.texto).not.toMatch(/intenta de nuevo/i);
    expect(r.texto).toMatch(/whatsapp/i);
  });

  it('403 con cuerpo no-JSON (página HTML del edge) recibe el mismo trato', () => {
    const r = mensajeDeRespuesta(403, '<html>Forbidden</html>');
    expect(r.tono).toBe('error');
    expect(r.texto).not.toMatch(/intenta de nuevo/i);
    expect(r.texto).toMatch(/whatsapp/i);
  });

  it('403 con un error nombrado del endpoint NO se confunde con el edge', () => {
    // Si el endpoint algún día responde 403 con JSON y un código conocido,
    // el mensaje específico gana sobre el del bloqueo.
    const r = mensajeDeRespuesta(403, {
      success: false,
      error: 'ORIGEN_INVALIDO',
    });
    expect(r.texto).toMatch(/enlace/i);
  });
});

/**
 * El `codigo`, una vez por rama.
 *
 * `texto` es español y `tono` sólo dice de qué color pintar la alerta: el
 * único dato con el que un componente puede decidir algo es `codigo`. Si una
 * rama olvida ponerlo, `traducirMensaje` cae al español para siempre y nadie
 * lo nota — el mensaje sigue apareciendo, sólo en el idioma equivocado. Por
 * eso hay una prueba por rama y no una sola de muestra.
 */
describe('mensajeDeRespuesta — codigo por rama', () => {
  it('EXITO', () => {
    const r = mensajeDeRespuesta(200, {
      success: true,
      data: { checkout_url: 'https://checkout.wompi.co/p/?x=1' },
    });
    expect(r.codigo).toBe('EXITO');
  });

  it('PEDIDO_SIN_LINK — y guarda el número de pedido aparte del texto', () => {
    const r = mensajeDeRespuesta(201, {
      success: true,
      data: { order_id: 'VB-0007', checkout_url: null },
    });
    expect(r.codigo).toBe('PEDIDO_SIN_LINK');
    expect(r.pedido).toBe('VB-0007');
  });

  it('PEDIDO_SIN_LINK sin order_id no inventa un `pedido`', () => {
    // El relleno «tu pedido» vive en `texto` (español) a propósito: si viajara
    // en `pedido`, se colaría dentro de una frase en inglés.
    const r = mensajeDeRespuesta(201, {
      success: true,
      data: { checkout_url: null },
    });
    expect(r.codigo).toBe('PEDIDO_SIN_LINK');
    expect(r.pedido).toBeUndefined();
  });

  it('ITEM_RESERVED — y guarda el sku aparte del texto', () => {
    const r = mensajeDeRespuesta(409, {
      success: false,
      error: 'ITEM_RESERVED',
      sku: 'C-090',
    });
    expect(r.codigo).toBe('ITEM_RESERVED');
    expect(r.sku).toBe('C-090');
  });

  it('ITEM_RESERVED sin sku no inventa uno', () => {
    const r = mensajeDeRespuesta(409, {
      success: false,
      error: 'ITEM_RESERVED',
    });
    expect(r.codigo).toBe('ITEM_RESERVED');
    expect(r.sku).toBeUndefined();
  });

  it('PRODUCT_UNAVAILABLE', () => {
    const r = mensajeDeRespuesta(409, {
      success: false,
      error: 'PRODUCT_UNAVAILABLE',
    });
    expect(r.codigo).toBe('PRODUCT_UNAVAILABLE');
  });

  it('PRECIO_NO_DISPONIBLE con sku', () => {
    const r = mensajeDeRespuesta(409, {
      success: false,
      error: 'PRECIO_NO_DISPONIBLE',
      sku: 'C-090',
    });
    expect(r.codigo).toBe('PRECIO_NO_DISPONIBLE');
    expect(r.sku).toBe('C-090');
  });

  it('PRECIO_NO_DISPONIBLE sin sku conserva el codigo', () => {
    const r = mensajeDeRespuesta(409, {
      success: false,
      error: 'PRECIO_NO_DISPONIBLE',
    });
    expect(r.codigo).toBe('PRECIO_NO_DISPONIBLE');
    expect(r.sku).toBeUndefined();
  });

  it('ZERO_TOTAL', () => {
    const r = mensajeDeRespuesta(409, { success: false, error: 'ZERO_TOTAL' });
    expect(r.codigo).toBe('ZERO_TOTAL');
  });

  it('ORIGEN_INVALIDO', () => {
    const r = mensajeDeRespuesta(409, {
      success: false,
      error: 'ORIGEN_INVALIDO',
    });
    expect(r.codigo).toBe('ORIGEN_INVALIDO');
  });

  it('SERVIDOR_400 — el texto es del servidor, no nuestro', () => {
    const r = mensajeDeRespuesta(400, {
      success: false,
      error: 'Missing contact.celular',
    });
    expect(r.codigo).toBe('SERVIDOR_400');
  });

  it('BLOQUEADO_EN_EDGE — 403 sin cuerpo JSON', () => {
    expect(mensajeDeRespuesta(403, null).codigo).toBe('BLOQUEADO_EN_EDGE');
    expect(mensajeDeRespuesta(403, '<html>Forbidden</html>').codigo).toBe(
      'BLOQUEADO_EN_EDGE',
    );
  });

  it('GENERICO — 500, y cuerpo irreconocible que no es 403', () => {
    expect(
      mensajeDeRespuesta(500, {
        success: false,
        error: 'Internal server error',
      }).codigo,
    ).toBe('GENERICO');
    expect(mensajeDeRespuesta(200, null).codigo).toBe('GENERICO');
    expect(mensajeDeRespuesta(200, 'texto').codigo).toBe('GENERICO');
  });

  it('403 con un código conocido del endpoint NO es el del edge', () => {
    // La precedencia ya está probada para `texto` más arriba; sin la misma
    // prueba sobre `codigo`, reordenar los `if` la rompe en silencio y el
    // cliente lee «los pagos no están disponibles» cuando el problema real
    // era su enlace.
    const r = mensajeDeRespuesta(403, {
      success: false,
      error: 'ORIGEN_INVALIDO',
    });
    expect(r.codigo).toBe('ORIGEN_INVALIDO');
  });
});

/**
 * La traducción, con el locale inglés de verdad.
 *
 * No usa un diccionario de mentira: pasa `translations.en.checkout`, el mismo
 * objeto que el componente le va a dar. Así una clave que alguien borre de
 * `en.ts` rompe ACÁ, y no en la pantalla de un cliente que ya puso su celular
 * para pagar.
 */
describe('traducirMensaje', () => {
  const en = translations.en.checkout;

  it('EXITO sale en inglés, no en español', () => {
    const m = mensajeDeRespuesta(200, {
      success: true,
      data: { checkout_url: 'https://checkout.wompi.co/p/?x=1' },
    });
    expect(traducirMensaje(m, en)).toBe(en.msgExito);
    expect(traducirMensaje(m, en)).not.toBe(m.texto);
  });

  it('ITEM_RESERVED interpola el sku dentro de la frase inglesa', () => {
    const m = mensajeDeRespuesta(409, {
      success: false,
      error: 'ITEM_RESERVED',
      sku: 'C-090',
    });
    const frase = traducirMensaje(m, en);
    expect(frase).toContain('C-090');
    expect(frase).not.toContain('{sku}');
    expect(frase).toBe(en.msgItemReserved.replace('{sku}', 'C-090'));
    // La prueba de que es inglés y no el `texto` de respaldo.
    expect(frase).not.toMatch(/está pagando/);
  });

  it('PRECIO_NO_DISPONIBLE con sku interpola; sin sku usa la frase sin sku', () => {
    const conSku = mensajeDeRespuesta(409, {
      success: false,
      error: 'PRECIO_NO_DISPONIBLE',
      sku: 'C-090',
    });
    expect(traducirMensaje(conSku, en)).toBe(
      en.msgPrecioNoDisponible.replace('{sku}', 'C-090'),
    );

    const sinSku = mensajeDeRespuesta(409, {
      success: false,
      error: 'PRECIO_NO_DISPONIBLE',
    });
    const frase = traducirMensaje(sinSku, en);
    expect(frase).toBe(en.msgPrecioNoDisponibleSinSku);
    expect(frase).not.toContain('{sku}');
  });

  it('PEDIDO_SIN_LINK interpola el número de pedido', () => {
    const m = mensajeDeRespuesta(201, {
      success: true,
      data: { order_id: 'VB-0007', checkout_url: null },
    });
    const frase = traducirMensaje(m, en);
    expect(frase).toBe(en.msgPedidoSinLink.replace('{pedido}', 'VB-0007'));
    expect(frase).toContain('VB-0007');
    expect(frase).not.toContain('{pedido}');
  });

  it('las demás ramas salen en inglés', () => {
    const casos: [Parameters<typeof mensajeDeRespuesta>, string][] = [
      [[403, null], en.msgBloqueadoEdge],
      [
        [409, { success: false, error: 'PRODUCT_UNAVAILABLE' }],
        en.msgProductUnavailable,
      ],
      [[409, { success: false, error: 'ZERO_TOTAL' }], en.msgZeroTotal],
      [
        [409, { success: false, error: 'ORIGEN_INVALIDO' }],
        en.msgOrigenInvalido,
      ],
      [
        [500, { success: false, error: 'Internal server error' }],
        en.msgGenerico,
      ],
    ];
    for (const [args, esperado] of casos) {
      expect(traducirMensaje(mensajeDeRespuesta(...args), en)).toBe(esperado);
    }
  });

  it('SERVIDOR_400 devuelve el texto del servidor tal cual, sin traducir', () => {
    const m = mensajeDeRespuesta(400, {
      success: false,
      error: 'Missing contact.celular',
    });
    expect(traducirMensaje(m, en)).toBe('Missing contact.celular');
  });

  it('una clave ausente o vacía cae al texto español, nunca a un hueco', () => {
    const m = mensajeDeRespuesta(409, {
      success: false,
      error: 'ITEM_RESERVED',
      sku: 'C-090',
    });
    const incompleto = { ...en, msgItemReserved: '' } as typeof en;
    expect(traducirMensaje(m, incompleto)).toBe(m.texto);
    // Y una plantilla que sí existe pero sin su dato: tampoco interpola vacío.
    const sinSku = mensajeDeRespuesta(409, {
      success: false,
      error: 'ITEM_RESERVED',
    });
    expect(traducirMensaje(sinSku, en)).toBe(sinSku.texto);
  });

  it('los seis idiomas traducen sin dejar marcadores sueltos', () => {
    const m = mensajeDeRespuesta(409, {
      success: false,
      error: 'ITEM_RESERVED',
      sku: 'C-090',
    });
    for (const code of ['es', 'en', 'fr', 'it', 'pt', 'zh'] as const) {
      const frase = traducirMensaje(m, translations[code].checkout);
      expect(frase, `${code} perdió el sku`).toContain('C-090');
      expect(frase, `${code} dejó el marcador sin resolver`).not.toContain(
        '{sku}',
      );
    }
  });
});
