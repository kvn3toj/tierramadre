/**
 * GridCard — la tarjeta dentro del modo selección de vitrina.
 *
 * Lo que se fija acá:
 *
 *   1. **En modo, el toque NO navega.** Es la regla entera de la iniciativa: el
 *      viaje que estamos borrando es justamente "abrir la ficha, agregar,
 *      volver atrás". Si esta rama se rompiera, el modo selección sería un
 *      catálogo normal con casillas decorativas.
 *
 *   2. **Fuera del modo la tarjeta no cambia en nada.** `GridCard` la comparten
 *      el catálogo autenticado, la vitrina pública y los perfiles de embajador.
 *      Un `role="checkbox"` filtrado a la vitrina pública le anunciaría a un
 *      cliente que puede marcar piezas que no puede marcar.
 *
 *   3. **El rol es `checkbox` con `aria-checked`, no un `article` con clase.**
 *      Es la única forma de que un lector de pantalla diga "casilla, marcada".
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { TreasureItem } from '../../types';

// Mismos mocks que `GridCard.agregar.test.tsx`: la tarjeta lee cuatro contextos
// que no tienen nada que ver con la regla bajo prueba.
vi.mock('../../contexts/ThemeContext', () => ({
  useThemeMode: () => ({ mode: 'light' }),
}));
vi.mock('../../contexts/PriceShareContext', () => ({
  usePriceShare: () => ({ shouldShowPrices: true }),
}));
vi.mock('../../hooks/useRedesignVariant', () => ({
  useRedesignVariant: () => 'faithful',
}));
vi.mock('../../hooks/useResaleOffers', () => ({
  useResaleOffers: () => ({ resaleIndex: new Map() }),
}));

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
  root = null;
  rootMargin = '';
  thresholds = [];
}
Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserverStub,
});

const { default: GridCard } = await import('./GridCard');

function pieza(over: Partial<TreasureItem> = {}): TreasureItem {
  return {
    item: 324,
    nombre: 'Aura',
    peso: 2.1,
    color: 'Intense Green',
    calidad: 'AAA',
    cantidad: 1,
    talla: 'Emerald',
    medidas: '',
    precioCOP: 1716000,
    ubicacion: '',
    asesor: '',
    estado: 'DISPONIBLE',
    fechaIngreso: '',
    isJewelry: false,
    ...over,
  } as TreasureItem;
}

const noop = () => {};
const PRECIO = '$1.716.000';

afterEach(cleanup);

describe('GridCard · modo selección', () => {
  it('fuera del modo NO existe rol checkbox — la vitrina pública no cambia', () => {
    render(
      <GridCard item={pieza()} onItemClick={noop} priceOverride={PRECIO} />,
    );
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.getByRole('article')).toBeTruthy();
  });

  it('en modo la raíz es un checkbox sin marcar', () => {
    render(
      <GridCard
        item={pieza()}
        onItemClick={noop}
        selectionMode
        onToggleSelect={noop}
        priceOverride={PRECIO}
      />,
    );
    const box = screen.getByRole('checkbox');
    expect(box.getAttribute('aria-checked')).toBe('false');
    expect(box.getAttribute('aria-label')).toBe('Seleccionar Aura');
  });

  it('seleccionada, el checkbox está marcado y el aria ofrece quitarla', () => {
    render(
      <GridCard
        item={pieza()}
        onItemClick={noop}
        selectionMode
        isSelected
        onToggleSelect={noop}
        priceOverride={PRECIO}
      />,
    );
    const box = screen.getByRole('checkbox', { checked: true });
    expect(box.getAttribute('aria-label')).toBe('Quitar Aura');
  });

  it('el toque ALTERNA en vez de navegar — el viaje que la iniciativa borra', () => {
    const onItemClick = vi.fn();
    const onToggleSelect = vi.fn();
    render(
      <GridCard
        item={pieza()}
        onItemClick={onItemClick}
        selectionMode
        onToggleSelect={onToggleSelect}
        priceOverride={PRECIO}
      />,
    );
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onToggleSelect).toHaveBeenCalledTimes(1);
    expect(onToggleSelect).toHaveBeenCalledWith(
      expect.objectContaining({ item: 324 }),
    );
    expect(onItemClick).not.toHaveBeenCalled();
  });

  it('fuera del modo el toque SIGUE navegando', () => {
    const onItemClick = vi.fn();
    const onToggleSelect = vi.fn();
    render(
      <GridCard
        item={pieza()}
        onItemClick={onItemClick}
        onToggleSelect={onToggleSelect}
        priceOverride={PRECIO}
      />,
    );
    fireEvent.click(screen.getByRole('article'));
    expect(onItemClick).toHaveBeenCalledTimes(1);
    expect(onToggleSelect).not.toHaveBeenCalled();
  });

  it('el teclado alterna igual que el toque (Enter sobre la raíz)', () => {
    const onToggleSelect = vi.fn();
    render(
      <GridCard
        item={pieza()}
        onItemClick={noop}
        selectionMode
        onToggleSelect={onToggleSelect}
        priceOverride={PRECIO}
      />,
    );
    fireEvent.keyDown(screen.getByRole('checkbox'), { key: 'Enter' });
    expect(onToggleSelect).toHaveBeenCalledTimes(1);
  });

  it('el nombre del aria sale sin el prefijo de lote, como lo lee el ojo', () => {
    render(
      <GridCard
        item={pieza({ nombre: 'L:II-JA Anna Collar Esmeralda' })}
        onItemClick={noop}
        selectionMode
        onToggleSelect={noop}
        priceOverride={PRECIO}
      />,
    );
    expect(screen.getByRole('checkbox').getAttribute('aria-label')).toBe(
      'Seleccionar Anna Collar Esmeralda',
    );
  });

  it('el memo deja pasar el cambio de isSelected — si no, la casilla se congela', () => {
    // El comparador de `React.memo` devuelve true para todo lo que no enumera.
    // `isSelected` y `selectionMode` TIENEN que estar enumerados: sin eso, la
    // primera marca es la última que se ve.
    const { rerender } = render(
      <GridCard
        item={pieza()}
        onItemClick={noop}
        selectionMode
        isSelected={false}
        onToggleSelect={noop}
        priceOverride={PRECIO}
      />,
    );
    expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe(
      'false',
    );

    rerender(
      <GridCard
        item={pieza()}
        onItemClick={noop}
        selectionMode
        isSelected
        onToggleSelect={noop}
        priceOverride={PRECIO}
      />,
    );
    expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe(
      'true',
    );
  });

  it('el memo deja pasar la ENTRADA al modo', () => {
    const { rerender } = render(
      <GridCard
        item={pieza()}
        onItemClick={noop}
        onToggleSelect={noop}
        priceOverride={PRECIO}
      />,
    );
    expect(screen.queryByRole('checkbox')).toBeNull();

    rerender(
      <GridCard
        item={pieza()}
        onItemClick={noop}
        selectionMode
        onToggleSelect={noop}
        priceOverride={PRECIO}
      />,
    );
    expect(screen.getByRole('checkbox')).toBeTruthy();
  });
});
