/**
 * ResaleBadge — el contrato mínimo del sello de procedencia.
 *
 * Lo que se fija aquí:
 *   1. Sin oferta NO se pinta nada. Es la mitad importante: este sello nombra
 *      al dueño de la pieza, así que pintarlo cuando no hay oferta publicaría
 *      de quién es una pieza que su dueño nunca ofreció. La contención del
 *      mapa de propiedad depende de esta rama.
 *   2. Con oferta, la tarjeta recorta a nombre de pila por espacio pero
 *      conserva la frase completa como nombre accesible — el sello no puede
 *      depender del ancho disponible para decir lo que dice.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ResaleBadge from './ResaleBadge';
import type { ResaleOffer } from '../../utils/productOffer';

const OFFER: ResaleOffer = {
  itemId: 101,
  asesorSlug: 'alvaro-pelaez',
  asesorName: 'Álvaro Pelaéz',
};

describe('ResaleBadge', () => {
  it('no pinta nada sin oferta', () => {
    const { container } = render(<ResaleBadge resale={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('nunca filtra el nombre del dueño cuando no hay oferta', () => {
    const { container } = render(<ResaleBadge resale={undefined} compact />);
    expect(container.textContent).not.toContain('Álvaro');
  });

  it('en la tarjeta recorta a nombre de pila', () => {
    render(<ResaleBadge resale={OFFER} compact />);
    expect(screen.getByText('De Álvaro')).toBeTruthy();
  });

  it('conserva la frase completa como nombre accesible', () => {
    // El Badge del DS pinta su icono con role="img" propio, así que se
    // consulta el envoltorio etiquetado en vez de por rol.
    const { container } = render(<ResaleBadge resale={OFFER} compact />);
    expect(
      container.querySelector(
        '[aria-label="De la colección de Álvaro Pelaéz"]',
      ),
    ).not.toBeNull();
  });

  it('en la ficha muestra la frase completa visible', () => {
    render(<ResaleBadge resale={OFFER} />);
    expect(screen.getByText('De la colección de Álvaro Pelaéz')).toBeTruthy();
  });

  it('tolera un nombre de una sola palabra', () => {
    render(<ResaleBadge resale={{ ...OFFER, asesorName: 'Isa' }} compact />);
    expect(screen.getByText('De Isa')).toBeTruthy();
  });
});
