/**
 * El mensaje de WhatsApp que lleva una selección a la casa.
 *
 * Sigue la forma de `src/components/vitrina/mensajeCotizacionVencida.ts`: un
 * módulo puro (sin React, sin Convex) con un constructor de texto y un
 * constructor de enlace, y un tope explícito de piezas nombradas para que el
 * mensaje nunca se corte a la mitad.
 *
 * DECISIÓN DE PRODUCTO, heredada de ese módulo: el mensaje nombra las piezas
 * pero NO lleva precios. Un precio dentro del mensaje es una cifra que la casa
 * tiene que honrar o explicar antes de saludar; el catálogo ya los muestra, y
 * quien escribe está pidiendo una conversación, no cerrando una compra.
 *
 * Las cadenas llegan traducidas desde `t.tienda.seleccion` — este módulo no
 * contiene texto de interfaz.
 */
import { houseWhatsAppLink } from '../constants/contact';

/** Tope de piezas NOMBRADAS. Por encima, el mensaje resume el resto. */
export const MAX_PIEZAS_EN_MENSAJE = 8;

export interface PiezaEnMensaje {
  /** Nombre ya traducido y ya compuesto con la montura si la tiene. */
  etiqueta: string;
}

export interface CopyMensaje {
  /** Encabezado en plural. */
  whatsappMessage: string;
  /** Encabezado en singular — clave aparte, nunca un motor de pluralización:
   *  el chino no ramifica singular y plural. */
  whatsappMessageOne: string;
  /** Cola con `{n}`, usada sólo si se superó el tope. */
  whatsappTail: string;
}

export function mensajeSeleccion(
  piezas: readonly PiezaEnMensaje[],
  copy: CopyMensaje,
): string {
  const encabezado =
    piezas.length === 1 ? copy.whatsappMessageOne : copy.whatsappMessage;
  if (piezas.length === 0) return encabezado;

  const nombradas = piezas.slice(0, MAX_PIEZAS_EN_MENSAJE);
  const lineas = nombradas.map((p) => `• ${p.etiqueta}`);
  const restantes = piezas.length - nombradas.length;
  const cola =
    restantes > 0 ? `\n${copy.whatsappTail.replace('{n}', String(restantes))}` : '';

  return `${encabezado}\n\n${lineas.join('\n')}${cola}`;
}

/** El enlace a la línea de la casa con el mensaje precargado. El visitante
 *  todavía tiene que pulsar enviar: `wa.me` no manda nada por su cuenta. */
export function enlaceSeleccion(
  piezas: readonly PiezaEnMensaje[],
  copy: CopyMensaje,
): string {
  return houseWhatsAppLink(mensajeSeleccion(piezas, copy));
}
