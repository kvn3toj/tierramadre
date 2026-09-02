/**
 * useVitrinaSelection — el estado del modo selección del catálogo.
 *
 * Lo que se fija acá:
 *
 *   1. **Salir limpia.** Semántica de la app de Fotos, y decisión de producto:
 *      una selección que sobrevive invisible al modo reaparecería la próxima
 *      vez que el asesor entre, con piezas de otro cliente adentro.
 *
 *   2. **La selección SOBREVIVE a los cambios de filtro.** Es el caso de uso
 *      literal: curar tres de Muzo y después dos de Chivor. Sólo se cae un id
 *      cuando la pieza desaparece del catálogo entero.
 *
 *   3. **El tope avisa de forma asertiva.** Un rechazo silencioso deja al
 *      asesor tocando una tarjeta que no responde, sin saber por qué.
 *
 *   4. **Sin permiso, el hook no hace nada.** La compuerta vive arriba
 *      (`useCanShareVitrina() && !providerMode`), pero el hook la respeta por
 *      su cuenta: un `enter()` que funcionara con `enabled:false` abriría el
 *      modo para un proveedor si alguien olvidara una condición en el JSX.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import type { TreasureItem } from '../src/types';

const announce = vi.fn();
const notify = vi.fn();

vi.mock('../src/components/shared/LiveRegion', () => ({
  useLiveRegion: () => ({ announce }),
}));
vi.mock('../src/contexts/NotificationContext', () => ({
  useNotification: () => ({ notify, confirmAction: async () => true }),
}));

const { useVitrinaSelection } =
  await import('../src/hooks/useVitrinaSelection');

function pieza(item: number, nombre = `Pieza ${item}`): TreasureItem {
  return { item, nombre, precioCOP: item * 1000 } as TreasureItem;
}

function mapa(...items: TreasureItem[]) {
  return new Map(items.map((i) => [i.item, i]));
}

const CATALOGO = mapa(pieza(7, 'Aura'), pieza(3, 'Venus'), pieza(9, 'Eco'));

beforeEach(() => {
  announce.mockClear();
  notify.mockClear();
});
afterEach(() => cleanup());

describe('useVitrinaSelection · entrar y salir', () => {
  it('arranca fuera del modo y sin nada seleccionado', () => {
    const { result } = renderHook(() =>
      useVitrinaSelection({ treasureMap: CATALOGO, enabled: true }),
    );
    expect(result.current.selectionMode).toBe(false);
    expect(result.current.count).toBe(0);
  });

  it('entra al modo y lo anuncia', () => {
    const { result } = renderHook(() =>
      useVitrinaSelection({ treasureMap: CATALOGO, enabled: true }),
    );
    act(() => result.current.enter());
    expect(result.current.selectionMode).toBe(true);
    expect(announce).toHaveBeenCalledWith(
      'Modo selección. Toca una pieza para seleccionarla.',
    );
  });

  it('salir LIMPIA la selección — no la deja invisible para el próximo cliente', () => {
    const { result } = renderHook(() =>
      useVitrinaSelection({ treasureMap: CATALOGO, enabled: true }),
    );
    act(() => result.current.enter());
    act(() => result.current.toggle(pieza(7, 'Aura')));
    act(() => result.current.toggle(pieza(3, 'Venus')));
    expect(result.current.count).toBe(2);

    act(() => result.current.exit());
    expect(result.current.selectionMode).toBe(false);
    expect(result.current.count).toBe(0);
    expect(result.current.ids).toEqual([]);
    expect(announce).toHaveBeenCalledWith('Modo selección cerrado.');
  });
});

describe('useVitrinaSelection · la compuerta de permiso', () => {
  it('con enabled:false, enter() no abre el modo', () => {
    const { result } = renderHook(() =>
      useVitrinaSelection({ treasureMap: CATALOGO, enabled: false }),
    );
    act(() => result.current.enter());
    expect(result.current.selectionMode).toBe(false);
    expect(announce).not.toHaveBeenCalled();
  });

  it('con enabled:false, toggle() no selecciona nada', () => {
    const { result } = renderHook(() =>
      useVitrinaSelection({ treasureMap: CATALOGO, enabled: false }),
    );
    act(() => result.current.toggle(pieza(7)));
    expect(result.current.count).toBe(0);
  });

  it('perder el permiso en caliente cierra el modo y limpia', () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useVitrinaSelection({ treasureMap: CATALOGO, enabled }),
      { initialProps: { enabled: true } },
    );
    act(() => result.current.enter());
    act(() => result.current.toggle(pieza(7, 'Aura')));
    expect(result.current.count).toBe(1);

    rerender({ enabled: false });
    expect(result.current.selectionMode).toBe(false);
    expect(result.current.count).toBe(0);
  });
});

describe('useVitrinaSelection · alternar y anunciar', () => {
  it('anuncia el nombre y el conteo al seleccionar y al quitar', () => {
    const { result } = renderHook(() =>
      useVitrinaSelection({ treasureMap: CATALOGO, enabled: true }),
    );
    act(() => result.current.enter());

    act(() => result.current.toggle(pieza(7, 'Aura')));
    expect(announce).toHaveBeenCalledWith('Aura seleccionada. 1 de 50.');

    act(() => result.current.toggle(pieza(7, 'Aura')));
    expect(announce).toHaveBeenCalledWith('Aura quitada. 0 de 50.');
  });

  it('idsSet refleja lo seleccionado — es lo que la grilla consulta por celda', () => {
    const { result } = renderHook(() =>
      useVitrinaSelection({ treasureMap: CATALOGO, enabled: true }),
    );
    act(() => result.current.enter());
    act(() => result.current.toggle(pieza(9, 'Eco')));
    expect(result.current.idsSet.has(9)).toBe(true);
    expect(result.current.idsSet.has(7)).toBe(false);
  });

  it('shareItems sale en el orden en que el asesor tocó', () => {
    const { result } = renderHook(() =>
      useVitrinaSelection({ treasureMap: CATALOGO, enabled: true }),
    );
    act(() => result.current.enter());
    act(() => result.current.toggle(pieza(9, 'Eco')));
    act(() => result.current.toggle(pieza(7, 'Aura')));
    expect(result.current.shareItems.map((s) => s.item)).toEqual([9, 7]);
    expect(result.current.shareItems[0].nombre).toBe('Eco');
  });
});

describe('useVitrinaSelection · el tope', () => {
  const CINCUENTA = mapa(
    ...Array.from({ length: 60 }, (_, i) => pieza(i + 1, `P${i + 1}`)),
  );

  it('rechaza la pieza 51, avisa de forma ASERTIVA y no crece', () => {
    const { result } = renderHook(() =>
      useVitrinaSelection({ treasureMap: CINCUENTA, enabled: true }),
    );
    act(() => result.current.enter());
    act(() => {
      for (let i = 1; i <= 50; i++) result.current.toggle(pieza(i, `P${i}`));
    });
    expect(result.current.count).toBe(50);
    expect(result.current.atCap).toBe(true);

    announce.mockClear();
    act(() => result.current.toggle(pieza(51, 'P51')));

    expect(result.current.count).toBe(50);
    expect(result.current.idsSet.has(51)).toBe(false);
    expect(announce).toHaveBeenCalledWith(
      'Ya tienes 50 piezas, el máximo para un enlace.',
      'assertive',
    );
  });

  it('en el tope todavía deja QUITAR', () => {
    const { result } = renderHook(() =>
      useVitrinaSelection({ treasureMap: CINCUENTA, enabled: true }),
    );
    act(() => result.current.enter());
    act(() => {
      for (let i = 1; i <= 50; i++) result.current.toggle(pieza(i, `P${i}`));
    });
    act(() => result.current.toggle(pieza(25, 'P25')));
    expect(result.current.count).toBe(49);
    expect(result.current.atCap).toBe(false);
  });
});

describe('useVitrinaSelection · poda', () => {
  it('deja caer la pieza que desaparece del catálogo', () => {
    const { result, rerender } = renderHook(
      ({ treasureMap }) => useVitrinaSelection({ treasureMap, enabled: true }),
      { initialProps: { treasureMap: CATALOGO } },
    );
    act(() => result.current.enter());
    act(() => result.current.toggle(pieza(7, 'Aura')));
    act(() => result.current.toggle(pieza(3, 'Venus')));
    expect(result.current.ids).toEqual([7, 3]);

    // La pieza 3 se vendió y salió del inventario.
    rerender({ treasureMap: mapa(pieza(7, 'Aura'), pieza(9, 'Eco')) });
    expect(result.current.ids).toEqual([7]);
  });

  it('un catálogo VACÍO (aún cargando) no borra la selección', () => {
    // La poda mira existencia, y "todavía no llegó" no es "ya no existe".
    // Sin esta guarda, un refetch que pase por [] en un frame vaciaría la
    // curaduría entera del asesor sin que él tocara nada.
    const { result, rerender } = renderHook(
      ({ treasureMap }) => useVitrinaSelection({ treasureMap, enabled: true }),
      { initialProps: { treasureMap: CATALOGO } },
    );
    act(() => result.current.enter());
    act(() => result.current.toggle(pieza(7, 'Aura')));

    rerender({ treasureMap: new Map<number, TreasureItem>() });
    expect(result.current.ids).toEqual([7]);
  });
});

describe('useVitrinaSelection · limpiar y deshacer', () => {
  it('clear vacía SIN salir del modo', () => {
    const { result } = renderHook(() =>
      useVitrinaSelection({ treasureMap: CATALOGO, enabled: true }),
    );
    act(() => result.current.enter());
    act(() => result.current.toggle(pieza(7, 'Aura')));
    act(() => result.current.clear());
    expect(result.current.count).toBe(0);
    expect(result.current.selectionMode).toBe(true);
  });

  it('undoClear restituye exactamente lo que había, en su orden', () => {
    const { result } = renderHook(() =>
      useVitrinaSelection({ treasureMap: CATALOGO, enabled: true }),
    );
    act(() => result.current.enter());
    act(() => result.current.toggle(pieza(9, 'Eco')));
    act(() => result.current.toggle(pieza(7, 'Aura')));
    act(() => result.current.clear());
    act(() => result.current.undoClear());
    expect(result.current.ids).toEqual([9, 7]);
  });
});

describe('useVitrinaSelection · el diálogo de acuñado', () => {
  it('cerrarlo CONSERVA la selección y el modo — el asesor ajusta y reenvía', () => {
    const { result } = renderHook(() =>
      useVitrinaSelection({ treasureMap: CATALOGO, enabled: true }),
    );
    act(() => result.current.enter());
    act(() => result.current.toggle(pieza(7, 'Aura')));
    act(() => result.current.openShare());
    expect(result.current.shareOpen).toBe(true);

    act(() => result.current.closeShare());
    expect(result.current.shareOpen).toBe(false);
    expect(result.current.count).toBe(1);
    expect(result.current.selectionMode).toBe(true);
  });
});
