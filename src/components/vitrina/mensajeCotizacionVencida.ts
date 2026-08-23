/**
 * El mensaje de WhatsApp que convierte una cotización vencida en un lead.
 *
 * Cuando una vitrina vence, el link no muere: muestra las piezas que contenía
 * y ofrece pedir cotización nueva. Este módulo arma ese mensaje.
 *
 * ## Por qué el mensaje lleva los números de pieza
 *
 * Sin ellos, el cliente escribe «hola, vi unas esmeraldas» y alguien del
 * equipo tiene que reconstruir de memoria cuáles eran. Con ellos, la
 * conversación arranca sabiendo exactamente qué mirar — que es la única razón
 * por la que conservamos el registro de la vitrina vencida en vez de borrarlo.
 *
 * ## Por qué NO lleva el precio viejo
 *
 * Mostrarlo obliga a una de dos cosas malas: honrar un precio que ya no
 * queremos, o explicarle al cliente por qué cambió antes de siquiera saludar.
 * El número de pieza alcanza para que ambos sepan de qué se habla.
 *
 * Puro: sin React, sin Convex. Testeable de a un caso.
 */

export interface PiezaVencida {
  /** Número de la pieza, tal como lo ve el cliente. */
  item: number | string;
  nombre?: string;
}

/** Tope de piezas nombradas en el mensaje, para que WhatsApp no lo trunque. */
export const MAX_PIEZAS_EN_MENSAJE = 8;

/**
 * El texto que se precarga en WhatsApp.
 *
 * Con más de `MAX_PIEZAS_EN_MENSAJE` nombra las primeras y dice cuántas
 * faltan: un mensaje cortado a la mitad por el límite de la URL es peor que
 * uno que resume con honestidad.
 */
export function mensajeCotizacionVencida(piezas: PiezaVencida[]): string {
  const encabezado =
    'Hola, tenía una cotización de Tierra Mädre que ya venció. ¿Me la pueden actualizar?';

  if (piezas.length === 0) return encabezado;

  const nombradas = piezas.slice(0, MAX_PIEZAS_EN_MENSAJE);
  const lineas = nombradas.map((p) =>
    p.nombre ? `• ${p.nombre} (#${p.item})` : `• #${p.item}`,
  );

  const restantes = piezas.length - nombradas.length;
  const cola =
    restantes > 0
      ? `\n…y ${restantes} ${restantes === 1 ? 'pieza más' : 'piezas más'}.`
      : '';

  return `${encabezado}\n\n${lineas.join('\n')}${cola}`;
}

/** El `wa.me` listo para usar. El teléfono va sin `+` ni separadores. */
export function enlaceCotizacionVencida(
  telefono: string,
  piezas: PiezaVencida[],
): string {
  const limpio = telefono.replace(/\D/g, '');
  return `https://wa.me/${limpio}?text=${encodeURIComponent(
    mensajeCotizacionVencida(piezas),
  )}`;
}
