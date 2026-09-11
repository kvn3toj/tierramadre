/**
 * Los módulos puros que sostienen «Mi selección».
 *
 * Se prueba la ARITMÉTICA, no el render: la identidad de una pieza elegida, el
 * ida y vuelta del `?p=` que viaja por WhatsApp, el tope de la selección y el
 * tope del mensaje. Son las cuatro cosas que, si se rompen, rompen un enlace
 * ya compartido — y un enlace compartido no se puede volver a desplegar.
 *
 * Nada aquí monta React: `tiendaSeleccion.ts` y `tiendaWhatsApp.ts` son
 * módulos sin estado, y ésa es exactamente la propiedad que los hace
 * verificables sin un DOM.
 */
import { describe, expect, it } from 'vitest';
import { MAX_SELECCION } from '../../data/tienda';
import type { SeleccionItem } from '../../types/tienda';
import {
  alternar,
  claveDe,
  estaSeleccionada,
  parseSeleccionParam,
  serializeSeleccion,
} from '../../utils/tiendaSeleccion';
import {
  MAX_PIEZAS_EN_MENSAJE,
  mensajeSeleccion,
} from '../../utils/tiendaWhatsApp';

const COPY = {
  whatsappMessage: 'Hola, me interesan estas piezas:',
  whatsappMessageOne: 'Hola, me interesa esta pieza:',
  whatsappTail: '…y {n} más.',
};

/** Ocho piezas distintas: las dos familias con eje de metal por sus cuatro
 *  monturas. Es justo el tope, así que sirve para probar el borde. */
const OCHO: SeleccionItem[] = [
  { slug: 'anillo-compromiso', metal: 'plata-925' },
  { slug: 'anillo-compromiso', metal: 'oro-18k' },
  { slug: 'anillo-compromiso', metal: 'oro-blanco' },
  { slug: 'anillo-compromiso', metal: 'oro-rosa' },
  { slug: 'pulsera-infinito', metal: 'plata-925' },
  { slug: 'pulsera-infinito', metal: 'oro-18k' },
  { slug: 'pulsera-infinito', metal: 'oro-blanco' },
  { slug: 'pulsera-infinito', metal: 'oro-rosa' },
];

describe('claveDe', () => {
  it('distingue dos monturas del mismo diseño', () => {
    const plata: SeleccionItem = { slug: 'anillo-compromiso', metal: 'plata-925' };
    const oro: SeleccionItem = { slug: 'anillo-compromiso', metal: 'oro-18k' };
    expect(claveDe(plata)).not.toBe(claveDe(oro));
    expect(claveDe(plata)).toBe('anillo-compromiso:plata-925');
  });

  it('una pieza sin eje de metal es sólo su slug', () => {
    expect(claveDe({ slug: 'mapa-colombia', metal: null })).toBe('mapa-colombia');
  });

  it('estaSeleccionada mira la clave, no el objeto', () => {
    const seleccion: SeleccionItem[] = [
      { slug: 'anillo-compromiso', metal: 'oro-18k' },
    ];
    expect(
      estaSeleccionada(seleccion, { slug: 'anillo-compromiso', metal: 'oro-18k' }),
    ).toBe(true);
    expect(
      estaSeleccionada(seleccion, { slug: 'anillo-compromiso', metal: 'oro-rosa' }),
    ).toBe(false);
  });
});

describe('parseSeleccionParam ↔ serializeSeleccion', () => {
  it('da la vuelta completa sobre la forma canónica', () => {
    const p = 'anillo-compromiso:oro-18k,mapa-colombia';
    expect(serializeSeleccion(parseSeleccionParam(p))).toBe(p);
  });

  it('normaliza y luego queda estable (parsear lo ya serializado no cambia nada)', () => {
    // Un slug con eje de metal y sin montura cae en la de por defecto, así que
    // la primera vuelta NORMALIZA; la segunda ya no puede mover nada.
    const unaVuelta = serializeSeleccion(parseSeleccionParam('anillo-compromiso'));
    expect(unaVuelta).toBe('anillo-compromiso:plata-925');
    expect(serializeSeleccion(parseSeleccionParam(unaVuelta))).toBe(unaVuelta);
  });

  it('ignora la montura pegada a una pieza que no tiene eje de metal', () => {
    expect(parseSeleccionParam('mapa-colombia:oro-18k')).toEqual([
      { slug: 'mapa-colombia', metal: null },
    ]);
  });

  it('descarta slugs inexistentes en vez de romper', () => {
    // El parámetro llega por enlaces pegados a mano y mensajes reenviados.
    expect(parseSeleccionParam('no-existe,mapa-colombia,')).toEqual([
      { slug: 'mapa-colombia', metal: null },
    ]);
  });

  it('descarta repetidos y respeta el tope de la selección', () => {
    expect(parseSeleccionParam('mapa-colombia,mapa-colombia')).toHaveLength(1);
    const demasiadas = [...OCHO, { slug: 'mapa-colombia', metal: null }] as const;
    expect(parseSeleccionParam(serializeSeleccion(demasiadas))).toHaveLength(
      MAX_SELECCION,
    );
  });

  it('sin parámetro devuelve una selección vacía', () => {
    expect(parseSeleccionParam(null)).toEqual([]);
    expect(parseSeleccionParam('')).toEqual([]);
  });
});

describe('alternar', () => {
  const pieza: SeleccionItem = { slug: 'mapa-colombia', metal: null };

  it('agrega lo que no estaba', () => {
    expect(alternar([], pieza)).toEqual([pieza]);
  });

  it('quita lo que ya estaba', () => {
    expect(alternar([pieza], pieza)).toEqual([]);
  });

  it('no muta la lista recibida', () => {
    const antes: SeleccionItem[] = [pieza];
    alternar(antes, { slug: 'manilla-colombia', metal: null });
    expect(antes).toEqual([pieza]);
  });

  it('llena, devuelve la MISMA lista — así el llamador sabe que topó', () => {
    expect(OCHO).toHaveLength(MAX_SELECCION);
    const resultado = alternar(OCHO, pieza);
    expect(resultado).toBe(OCHO);
  });

  it('llena, todavía deja quitar', () => {
    expect(alternar(OCHO, OCHO[0])).toHaveLength(MAX_SELECCION - 1);
  });
});

describe('mensajeSeleccion', () => {
  const piezas = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ etiqueta: `Pieza ${i + 1}` }));

  it('usa el encabezado singular con una sola pieza', () => {
    const msg = mensajeSeleccion(piezas(1), COPY);
    expect(msg.startsWith(COPY.whatsappMessageOne)).toBe(true);
    expect(msg).toContain('• Pieza 1');
  });

  it('nombra todas las piezas mientras quepan, sin cola', () => {
    const msg = mensajeSeleccion(piezas(MAX_PIEZAS_EN_MENSAJE), COPY);
    expect(msg.startsWith(COPY.whatsappMessage)).toBe(true);
    expect(msg.split('•')).toHaveLength(MAX_PIEZAS_EN_MENSAJE + 1);
    expect(msg).not.toContain('más.');
  });

  it('topa en MAX_PIEZAS_EN_MENSAJE y resume el resto en la cola', () => {
    const msg = mensajeSeleccion(piezas(MAX_PIEZAS_EN_MENSAJE + 3), COPY);
    expect(msg.split('•')).toHaveLength(MAX_PIEZAS_EN_MENSAJE + 1);
    expect(msg).toContain(`Pieza ${MAX_PIEZAS_EN_MENSAJE}`);
    expect(msg).not.toContain(`Pieza ${MAX_PIEZAS_EN_MENSAJE + 1}`);
    expect(msg.endsWith('…y 3 más.')).toBe(true);
  });

  it('el mensaje nunca lleva precios (decisión de producto, no un descuido)', () => {
    const msg = mensajeSeleccion([{ etiqueta: 'Anillo de Compromiso · Oro 18k' }], COPY);
    expect(msg).not.toMatch(/\$|COP|\d{3}\.\d{3}/);
  });

  it('sin piezas devuelve sólo el encabezado', () => {
    expect(mensajeSeleccion([], COPY)).toBe(COPY.whatsappMessage);
  });
});
