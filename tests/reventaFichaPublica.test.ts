/**
 * La puerta pública de una pieza en reventa (2026-08-12).
 *
 * Verificado en navegador contra producción el 2026-08-11, con la pieza #291
 * ya activada por Kevin:
 *
 *   - con sesión, /product/291 redirige a /ambassadors/kevin-pineda-perez/
 *     product/291 y el CTA marca a la casa. Correcto.
 *   - SIN sesión no pasa nada de eso: /product/:itemId no renderiza
 *     ProductDetailPage sino PublicProductPage → VitrinaContent, que no sabía
 *     nada de reventa. Y ése es justo el visitante que importa: el enlace
 *     compartido por WhatsApp, que se abre sin iniciar sesión.
 *
 * Redirigirlo al perfil del embajador no sirve: esas rutas viven dentro de
 * AuthenticatedApp, así que un anónimo aterrizaría en la pantalla de login.
 * Por eso la reventa se resuelve EN la página pública.
 *
 * Lo que se fija aquí es la regla de negocio que no puede depender de la UI:
 * en una reventa la conversación es con la casa, aunque el enlace diga otra
 * cosa.
 */
import { describe, it, expect } from 'vitest';
import { buildResaleIndex, type ResaleOffer } from '../src/utils/productOffer';

const HOUSE = '573166279999';

const OFFER: ResaleOffer = {
  itemId: 291,
  asesorSlug: 'kevin-pineda-perez',
  asesorName: 'Kevin Pineda Perez',
};

/**
 * Espeja la decisión de VitrinaContent: `senderPhone` sale de useSenderPhone
 * (que respeta `?wa=` y `?a=`) salvo que la pieza esté en reventa.
 */
function resolveSenderPhone(
  senderPhoneFromLink: string,
  resale: ResaleOffer | undefined,
): string {
  return resale ? HOUSE : senderPhoneFromLink;
}

describe('a quién marca el botón de la ficha pública', () => {
  const index = buildResaleIndex([OFFER]);

  it('una pieza de la casa respeta el número del enlace', () => {
    const phone = resolveSenderPhone('573001112233', index.get(999));
    expect(phone).toBe('573001112233');
  });

  it('una pieza en reventa marca a la casa, no al embajador', () => {
    const phone = resolveSenderPhone('573001112233', index.get(291));
    expect(phone).toBe(HOUSE);
  });

  it('ni siquiera un ?a= o ?wa= del propio dueño le gana a la regla', () => {
    // Los parámetros los pone quien comparte el enlace. Si el embajador
    // comparte su pieza con su propio número, la venta se negocia igual con
    // nosotros: es la condición bajo la que se le permitió publicarla.
    for (const desdeElEnlace of ['573009998877', '', '570000000000']) {
      expect(resolveSenderPhone(desdeElEnlace, index.get(291))).toBe(HOUSE);
    }
  });

  it('sin ofertas activas nada cambia para el catálogo de la casa', () => {
    const vacio = buildResaleIndex([]);
    expect(resolveSenderPhone('573001112233', vacio.get(291))).toBe(
      '573001112233',
    );
  });
});
