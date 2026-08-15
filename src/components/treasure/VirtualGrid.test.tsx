/**
 * VirtualGrid — el contrato de los hooks frente al vacío.
 *
 * Lo que se fija aquí: la rejilla puede pasar de "sin resultados" a "con
 * resultados" (y volver) sin violar las Rules of Hooks. Escribir en el buscador
 * cruza ese borde en cada tecla — un render con 0 items que ejecute menos hooks
 * que el siguiente tumba la página entera con el error #300 de React
 * ("Rendered more hooks than during the previous render"), que fue exactamente
 * lo que pasó en producción en /treasure?search=441.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import VirtualGrid from './VirtualGrid';
import type { TreasureItem } from '../../types';

vi.mock('../../contexts/PriceShareContext', () => ({
  usePriceShare: () => ({ shouldShowPrices: true }),
}));

// jsdom no trae ResizeObserver; la rejilla lo usa para medir su contenedor.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

const ITEM = { item: 441, name: 'Prueba' } as unknown as TreasureItem;

const noop = () => {};
const baseProps = {
  favorites: [] as number[],
  onItemClick: noop,
  onCertClick: noop,
  onToggleFavorite: noop,
  renderCard: () => <div data-testid="card" />,
};

describe('VirtualGrid', () => {
  it('sobrevive el ciclo vacío → con resultados → vacío sin romper hooks', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(noop);
    try {
      const { rerender } = render(<VirtualGrid {...baseProps} items={[]} />);

      expect(() => {
        rerender(<VirtualGrid {...baseProps} items={[ITEM]} />);
        rerender(<VirtualGrid {...baseProps} items={[]} />);
        rerender(<VirtualGrid {...baseProps} items={[ITEM]} />);
      }).not.toThrow();

      // React también reporta el cambio de orden como console.error antes de
      // lanzar — un render "que no lanza" pero deja esa advertencia sigue roto.
      const hookViolation = consoleError.mock.calls.find((args) =>
        String(args[0]).includes('change in the order of Hooks'),
      );
      expect(hookViolation).toBeUndefined();
    } finally {
      consoleError.mockRestore();
    }
  });
});
