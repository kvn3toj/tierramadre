/**
 * De una respuesta del endpoint a algo que una persona entiende.
 *
 * Está separado del componente porque los estados de error son la mitad del
 * trabajo y merecen prueba propia. Dos que se rompen si nadie los piensa:
 * `reused: true` NO es un error (es el doble clic, y todo salió bien), y un
 * 201 con `checkout_url: null` significa que el PEDIDO EXISTE aunque el
 * proveedor de pago fallara — decirle «error» a alguien cuyo pedido sí quedó
 * lo empuja a pedirlo otra vez.
 */

export interface MensajeCheckout {
  tono: 'error' | 'aviso' | 'exito';
  texto: string;
  /** Sólo en éxito: a dónde mandar al cliente a pagar. */
  url?: string;
}

const GENERICO =
  'No pudimos completar el pedido. Intenta de nuevo en un momento.';

function comoObjeto(v: unknown): Record<string, unknown> | null {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

export function mensajeDeRespuesta(
  status: number,
  body: unknown,
): MensajeCheckout {
  const raiz = comoObjeto(body);
  if (!raiz) return { tono: 'error', texto: GENERICO };

  const data = comoObjeto(raiz.data) ?? raiz;
  const error = typeof raiz.error === 'string' ? raiz.error : '';

  if (status >= 200 && status < 300 && raiz.success === true) {
    const url = typeof data.checkout_url === 'string' ? data.checkout_url : '';
    if (url) return { tono: 'exito', texto: 'Te llevamos a pagar…', url };

    // El pedido quedó; sólo falta el link. Nunca «error».
    const pedido =
      typeof data.order_id === 'string' ? data.order_id : 'tu pedido';
    return {
      tono: 'aviso',
      texto: `Guardamos ${pedido}, pero no pudimos abrir el pago. Te escribimos por WhatsApp para completarlo.`,
    };
  }

  if (error === 'ITEM_RESERVED') {
    const sku =
      typeof raiz.sku === 'string' && raiz.sku ? raiz.sku : 'la pieza';
    return {
      tono: 'error',
      texto: `Alguien más está pagando ${sku} en este momento. Vuelve a intentar en unos minutos.`,
    };
  }
  if (error === 'PRODUCT_UNAVAILABLE') {
    return { tono: 'error', texto: 'Esta pieza ya se vendió.' };
  }
  if (error === 'ORIGEN_INVALIDO') {
    return {
      tono: 'error',
      texto:
        'El enlace por el que llegaste ya no es válido. Escríbenos y te ayudamos.',
    };
  }
  if (status === 400 && error) {
    return { tono: 'error', texto: error };
  }
  return { tono: 'error', texto: GENERICO };
}
