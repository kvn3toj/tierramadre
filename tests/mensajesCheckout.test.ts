import { describe, it, expect } from 'vitest';
import { mensajeDeRespuesta } from '../src/components/checkout/mensajesCheckout';

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
