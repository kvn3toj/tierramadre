/**
 * De una respuesta del endpoint a algo que una persona entiende.
 *
 * Está separado del componente porque los estados de error son la mitad del
 * trabajo y merecen prueba propia. Dos que se rompen si nadie los piensa:
 * `reused: true` NO es un error (es el doble clic, y todo salió bien), y un
 * 201 con `checkout_url: null` significa que el PEDIDO EXISTE aunque el
 * proveedor de pago fallara — decirle «error» a alguien cuyo pedido sí quedó
 * lo empuja a pedirlo otra vez.
 *
 * ── El `codigo`, y por qué el texto español sigue aquí (2026-09-09) ────────
 *
 * `texto` es español fijo y se queda: este módulo es puro, no conoce el
 * idioma del cliente, y un `texto` siempre presente es la red de seguridad
 * cuando la traducción no existe. Lo que se agregó es `codigo`: una etiqueta
 * estable de QUÉ pasó, más los datos que la frase necesita (`sku`, `pedido`).
 * `traducirMensaje(m, t.checkout)` los resuelve al idioma del cliente.
 *
 * Así, quien muestra el mensaje traduce; quien lo clasifica no tiene que
 * saber traducir. Y `codigo` es lo único que un componente debería mirar para
 * decidir: comparar `texto` contra una cadena en español es un bug esperando
 * el primer cliente que abrió la app en inglés.
 */
import type { Translations } from '../../locales';

/**
 * Qué pasó, en una etiqueta que no cambia con el idioma.
 *
 * `SERVIDOR_400` es el caso aparte: su `texto` es el mensaje que redactó el
 * servidor (p. ej. «Missing contact.celular»), no una frase nuestra, así que
 * no tiene traducción y `traducirMensaje` lo devuelve tal cual.
 */
export type CodigoCheckout =
  | 'GENERICO'
  | 'BLOQUEADO_EN_EDGE'
  | 'EXITO'
  | 'PEDIDO_SIN_LINK'
  | 'ITEM_RESERVED'
  | 'PRODUCT_UNAVAILABLE'
  | 'PRECIO_NO_DISPONIBLE'
  | 'ZERO_TOTAL'
  | 'ORIGEN_INVALIDO'
  | 'SERVIDOR_400';

export interface MensajeCheckout {
  tono: 'error' | 'aviso' | 'exito';
  texto: string;
  /** Sólo en éxito: a dónde mandar al cliente a pagar. */
  url?: string;
  /**
   * Qué pasó, independiente del idioma. Ver `CodigoCheckout`.
   *
   * `mensajeDeRespuesta` lo pone SIEMPRE, en todas sus ramas — trátalo como
   * obligatorio al leerlo. Es opcional en el tipo por una sola razón, y
   * temporal: `CheckoutSheet.tsx` todavía arma a mano un `MensajeCheckout`
   * para la red caída (su `catch`, hoy línea ~176), y ese literal no lleva
   * `codigo`. Ese texto es justamente el que reemplaza
   * `t.checkout.networkError`, así que el performer que migre CheckoutSheet
   * borra el literal y, en el mismo cambio, **vuelve este campo requerido**
   * (`codigo: CodigoCheckout`) para que el compilador exija clasificar todo
   * mensaje nuevo. Mientras siga opcional, un productor puede olvidarlo y
   * `traducirMensaje` caerá a `texto` en español sin que nadie se entere.
   */
  codigo?: CodigoCheckout;
  /**
   * La pieza que el servidor nombró, cuando la nombró. Sólo el SKU real —
   * nunca un relleno como «la pieza», porque el relleno también estaría en
   * español y se colaría dentro de una frase traducida.
   */
  sku?: string;
  /** El número de pedido que el servidor devolvió, cuando lo devolvió. */
  pedido?: string;
}

const GENERICO =
  'No pudimos completar el pedido. Intenta de nuevo en un momento.';

// Un 403 cuyo cuerpo no es JSON viene del edge (Vercel WAF / BotID), no del
// endpoint: los errores propios del endpoint siempre traen JSON con `error`.
// Ese bloqueo dura hasta que alguien lo levante — «intenta de nuevo en un
// momento» invita a machacar un muro, así que el mensaje da la única salida
// que sí funciona.
const BLOQUEADO_EN_EDGE =
  'Los pagos en línea no están disponibles por el momento. Escríbenos por WhatsApp y completamos tu compra.';

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
  if (!raiz) {
    if (status === 403) {
      return {
        tono: 'error',
        texto: BLOQUEADO_EN_EDGE,
        codigo: 'BLOQUEADO_EN_EDGE',
      };
    }
    return { tono: 'error', texto: GENERICO, codigo: 'GENERICO' };
  }

  const data = comoObjeto(raiz.data) ?? raiz;
  const error = typeof raiz.error === 'string' ? raiz.error : '';

  if (status >= 200 && status < 300 && raiz.success === true) {
    const url = typeof data.checkout_url === 'string' ? data.checkout_url : '';
    if (url) {
      return {
        tono: 'exito',
        texto: 'Te llevamos a pagar…',
        url,
        codigo: 'EXITO',
      };
    }

    // El pedido quedó; sólo falta el link. Nunca «error».
    const orderId = typeof data.order_id === 'string' ? data.order_id : '';
    const pedido = orderId || 'tu pedido';
    return {
      tono: 'aviso',
      texto: `Guardamos ${pedido}, pero no pudimos abrir el pago. Te escribimos por WhatsApp para completarlo.`,
      codigo: 'PEDIDO_SIN_LINK',
      // Sin `order_id` no hay número que interpolar: `traducirMensaje` cae a
      // `texto`, que sí trae el relleno español. Un 2xx exitoso sin order_id
      // no debería existir; si existe, el cliente lee algo coherente.
      ...(orderId ? { pedido: orderId } : {}),
    };
  }

  if (error === 'ITEM_RESERVED') {
    const skuReal = typeof raiz.sku === 'string' && raiz.sku ? raiz.sku : '';
    const sku = skuReal || 'la pieza';
    return {
      tono: 'error',
      texto: `Alguien más está pagando ${sku} en este momento. Vuelve a intentar en unos minutos.`,
      codigo: 'ITEM_RESERVED',
      ...(skuReal ? { sku: skuReal } : {}),
    };
  }
  if (error === 'PRODUCT_UNAVAILABLE') {
    return {
      tono: 'error',
      texto: 'Esta pieza ya se vendió.',
      codigo: 'PRODUCT_UNAVAILABLE',
    };
  }
  if (error === 'PRECIO_NO_DISPONIBLE') {
    // Nombra la pieza cuando el servidor la mandó (siempre debería, ver
    // `api/checkout-create-order.ts`) — "no pudimos calcular el precio de
    // C-090" es mucho mejor que un fallo genérico para alguien que está
    // intentando pagarnos.
    const sku = typeof raiz.sku === 'string' && raiz.sku ? raiz.sku : '';
    return {
      tono: 'error',
      texto: sku
        ? `No pudimos calcular el precio de ${sku}. Escríbenos y te ayudamos a completar la compra.`
        : 'Una o más piezas no tienen precio asignado. Escríbenos y te ayudamos a completar la compra.',
      codigo: 'PRECIO_NO_DISPONIBLE',
      ...(sku ? { sku } : {}),
    };
  }
  if (error === 'ZERO_TOTAL') {
    return {
      tono: 'error',
      texto:
        'Una o más piezas no tienen precio asignado. Escríbenos y te ayudamos a completar la compra.',
      codigo: 'ZERO_TOTAL',
    };
  }
  if (error === 'ORIGEN_INVALIDO') {
    return {
      tono: 'error',
      texto:
        'El enlace por el que llegaste ya no es válido. Escríbenos y te ayudamos.',
      codigo: 'ORIGEN_INVALIDO',
    };
  }
  if (status === 400 && error) {
    return { tono: 'error', texto: error, codigo: 'SERVIDOR_400' };
  }
  return { tono: 'error', texto: GENERICO, codigo: 'GENERICO' };
}

/**
 * El mensaje en el idioma del cliente.
 *
 * `tc` es el bloque `checkout` del locale activo (`t.checkout`). Cuando la
 * clave falta o está vacía, o cuando el texto es del servidor
 * (`SERVIDOR_400`), devuelve `m.texto`: un mensaje en español es peor que uno
 * traducido, y muchísimo mejor que una frase con un hueco donde iba el dato.
 * Por eso una plantilla sin su valor (`{sku}` sin sku) también cae a `texto`
 * en vez de interpolar vacío.
 */
export function traducirMensaje(
  m: MensajeCheckout,
  tc: Translations['checkout'],
): string {
  // `Partial` a propósito: en tiempo de ejecución `tc` puede venir de un
  // locale al que le falte una clave nueva, y ese caso tiene que caer a
  // `texto`, no reventar.
  const dic = tc as Partial<Record<keyof Translations['checkout'], string>>;

  const frase = (clave: keyof Translations['checkout']): string => {
    const v = dic[clave];
    return typeof v === 'string' && v.trim() ? v : '';
  };

  const con = (
    clave: keyof Translations['checkout'],
    marcador: string,
    valor?: string,
  ): string => {
    const plantilla = frase(clave);
    if (!plantilla || !valor) return m.texto;
    return plantilla.split(marcador).join(valor);
  };

  switch (m.codigo) {
    case 'GENERICO':
      return frase('msgGenerico') || m.texto;
    case 'BLOQUEADO_EN_EDGE':
      return frase('msgBloqueadoEdge') || m.texto;
    case 'EXITO':
      return frase('msgExito') || m.texto;
    case 'PEDIDO_SIN_LINK':
      return con('msgPedidoSinLink', '{pedido}', m.pedido);
    case 'ITEM_RESERVED':
      return con('msgItemReserved', '{sku}', m.sku);
    case 'PRODUCT_UNAVAILABLE':
      return frase('msgProductUnavailable') || m.texto;
    case 'PRECIO_NO_DISPONIBLE':
      return m.sku
        ? con('msgPrecioNoDisponible', '{sku}', m.sku)
        : frase('msgPrecioNoDisponibleSinSku') || m.texto;
    case 'ZERO_TOTAL':
      return frase('msgZeroTotal') || m.texto;
    case 'ORIGEN_INVALIDO':
      return frase('msgOrigenInvalido') || m.texto;
    // El servidor redactó este texto; no es una frase nuestra que traducir.
    case 'SERVIDOR_400':
      return m.texto;
    default:
      return m.texto;
  }
}
