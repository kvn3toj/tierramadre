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


describe('VirtualGrid · plomería del modo selección', () => {
  it('le pasa isSelected a la celda — es lo que pinta la casilla', () => {
    const seen: { item: number; isSelected?: boolean }[] = [];
    render(
      <VirtualGrid
        {...baseProps}
        items={[ITEM]}
        selectionMode
        selectedIds={[441]}
        renderCard={(props) => {
          seen.push({ item: props.item.item, isSelected: props.isSelected });
          return <div data-testid="card" />;
        }}
      />,
    );
    expect(seen).toContainEqual({ item: 441, isSelected: true });
  });

  it('sin la pieza en selectedIds, la celda la recibe sin marcar', () => {
    const seen: { isSelected?: boolean }[] = [];
    render(
      <VirtualGrid
        {...baseProps}
        items={[ITEM]}
        selectionMode
        selectedIds={[]}
        renderCard={(props) => {
          seen.push({ isSelected: props.isSelected });
          return <div data-testid="card" />;
        }}
      />,
    );
    expect(seen.every((s) => s.isSelected === false)).toBe(true);
  });

  it('marcar una pieza EN CALIENTE repinta la celda — la trampa del cellProps rancio', () => {
    // `cellProps` es un useMemo. Si `selectedIds` no está en sus dependencias,
    // el objeto queda congelado y marcar una pieza no se ve: react-window
    // sigue repartiendo el Set viejo. Montar-desmontar no lo detecta; hay que
    // re-renderizar sobre la misma instancia.
    const marcas: (boolean | undefined)[] = [];
    // `renderCard` ESTABLE, a propósito. Una función inline nueva en cada
    // render está en las dependencias del useMemo y lo recalcularía sola,
    // dejando pasar el defecto que este test persigue: el test se pondría
    // verde sin que `selectedIds` estuviera en las dependencias.
    const renderCard = (props: { isSelected?: boolean }) => {
      marcas.push(props.isSelected);
      return <div data-testid="card" />;
    };
    // `items` también estable, por la misma razón: está en las dependencias.
    const items = [ITEM];
    const arbol = (ids: number[]) => (
      <VirtualGrid
        {...baseProps}
        items={items}
        selectionMode
        selectedIds={ids}
        renderCard={renderCard}
      />
    );
    const { rerender } = render(arbol([]));
    marcas.length = 0;
    rerender(arbol([441]));
    expect(marcas).toContain(true);
  });

  it('la fila espaciadora crece con bottomInset — si no, la última fila queda bajo la barra', () => {
    // `padding-bottom` no cuenta en el alto de scroll de react-window (por eso
    // la fila espaciadora existe). El alto de la barra tiene que entrar POR AHÍ
    // o la última pieza del catálogo queda permanentemente ilegible.
    const altoEspaciadora = (inset: number) => {
      const { container, unmount } = render(
        <VirtualGrid {...baseProps} items={[ITEM]} bottomInset={inset} />,
      );
      // La fila 2 es la espaciadora (1 ítem = 1 fila de contenido + 1 de aire).
      const celda = container.querySelector(
        '[role="row"][aria-rowindex="2"] > div',
      ) as HTMLElement | null;
      const h = celda?.style.height ?? null;
      unmount();
      return h;
    };
    // 80px es `layoutConstants.tabBarClearance`, el aire que ya existía.
    expect(altoEspaciadora(0)).toBe('80px');
    expect(altoEspaciadora(120)).toBe('200px');
  });
});

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
