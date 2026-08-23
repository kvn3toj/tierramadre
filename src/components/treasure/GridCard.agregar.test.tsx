/**
 * GridCard — la regla de visibilidad del botón «Agregar».
 *
 * Lo que se fija aquí es dinero, no estética:
 *
 *   1. **Sin `onAddToCart` la tarjeta no cambia.** `GridCard` la comparten el
 *      catálogo autenticado, la vitrina pública y los perfiles de embajador.
 *      El botón es opt-in por superficie; si esta rama se rompiera, aparecería
 *      un camino de compra en pantallas internas donde el staff no es el
 *      comprador.
 *
 *   2. **Una pieza sin precio no se puede agregar.** «Consultar precio» es
 *      `precioCOP <= 0`, y el servidor la rechaza con `PRECIO_NO_DISPONIBLE`.
 *      Peor: `hayPiezaSinPrecio` bloquea la hoja de pago ENTERA, así que una
 *      sola pieza sin precio en el carrito impide pagar todo lo demás. El
 *      botón tiene que no existir, no fallar después.
 *
 *   3. **Un `estado` ausente NO oculta el botón.** Las filas de un invitado no
 *      traen `estado` (es un campo retenido por la proyección del catálogo).
 *      Tratar «ausente» como «no disponible» escondería el botón justo al
 *      público al que está dirigido — el mismo error que una vez hizo que la
 *      búsqueda reportara «0 tesoros disponibles» a todos los invitados.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { TreasureItem } from '../../types';

// Mismo patrón que `VirtualGrid.test.tsx`: la tarjeta lee cuatro contextos que
// no tienen nada que ver con la regla bajo prueba. Se sustituyen por sus
// valores neutros para que el test hable sólo de cuándo aparece «Agregar».
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

// jsdom no implementa matchMedia; `useReducedMotion` (dentro de
// ProgressiveImage) lo consulta al montar.
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

// Idem: la carga progresiva de la imagen observa el viewport.
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

// Las superficies públicas siempre pasan una etiqueta de precio ya resuelta
// (`formatVitrinaPrice`), así que `PriceDisplay` —y con él `CurrencyContext`—
// nunca entra en juego. El test usa el mismo camino que producción.
const PRECIO = '$1.716.000';

// `globals: false` en vitest.config.ts, así que el afterEach automático de
// Testing Library no se registra y el DOM del test anterior sobreviviría.
afterEach(cleanup);

describe('GridCard · botón «Agregar»', () => {
  it('no lo pinta sin `onAddToCart` — las pantallas internas no cambian', () => {
    render(<GridCard item={pieza()} onItemClick={noop} priceOverride={PRECIO} />);
    expect(screen.queryByRole('button', { name: /Agregar/i })).toBeNull();
  });

  it('lo pinta cuando la superficie lo pide y la pieza es vendible', () => {
    render(
      <GridCard
        item={pieza()}
        onItemClick={noop}
        onAddToCart={noop}
        priceOverride={PRECIO}
      />,
    );
    expect(
      screen.getByRole('button', { name: /Agregar Aura/i }),
    ).toBeTruthy();
  });

  it('no lo pinta con precio 0 — «Consultar precio» bloquearía la hoja entera', () => {
    render(
      <GridCard
        item={pieza({ precioCOP: 0 })}
        onItemClick={noop}
        onAddToCart={noop}
        priceOverride={PRECIO}
      />,
    );
    expect(screen.queryByRole('button', { name: /Agregar/i })).toBeNull();
  });

  it('no lo pinta para una pieza vendida', () => {
    render(
      <GridCard
        item={pieza({ estado: 'VENDIDA' as TreasureItem['estado'] })}
        onItemClick={noop}
        onAddToCart={noop}
        priceOverride={PRECIO}
      />,
    );
    expect(screen.queryByRole('button', { name: /Agregar/i })).toBeNull();
  });

  it('SÍ lo pinta con `estado` ausente: para un invitado ese campo viene retenido, y ausente significa desconocido', () => {
    render(
      <GridCard
        item={pieza({ estado: '' as TreasureItem['estado'] })}
        onItemClick={noop}
        onAddToCart={noop}
        priceOverride={PRECIO}
      />,
    );
    expect(
      screen.getByRole('button', { name: /Agregar Aura/i }),
    ).toBeTruthy();
  });

  it('agregar no navega a la pieza — la tarjeta entera es clickeable y se pisarían', () => {
    const onItemClick = vi.fn();
    const onAddToCart = vi.fn();
    render(
      <GridCard
        item={pieza()}
        onItemClick={onItemClick}
        onAddToCart={onAddToCart}
        priceOverride={PRECIO}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Agregar Aura/i }));
    expect(onAddToCart).toHaveBeenCalledTimes(1);
    expect(onItemClick).not.toHaveBeenCalled();
  });

  it('ya en el carrito cambia el rótulo en vez de ofrecer agregar de nuevo', () => {
    render(
      <GridCard
        item={pieza()}
        onItemClick={noop}
        onAddToCart={noop}
        isInCart
        priceOverride={PRECIO}
      />,
    );
    expect(screen.getByText('Agregada')).toBeTruthy();
  });
});
