/**
 * PublicProductView — el precio tiene que aparecer ANTES de la ficha técnica,
 * también en móvil.
 *
 * Lo que se fija aquí es la relación entre dos hechos: el botón «Pagar» es
 * sticky (visible todo el tiempo en el layout compacto), así que el cliente
 * puede llegar al botón de pago sin haber cruzado nunca el precio si éste
 * vive al final del scroll. El layout ancho (md+) ya ordena nombre → precio →
 * CTA → ficha; el compacto tenía el precio DESPUÉS de la ficha completa
 * (detectado en el recorrido de UI del 2026-08-24, docs/estado-sesiones.md).
 *
 * El test afirma orden del DOM, no píxeles: en jsdom `matchMedia` devuelve
 * `matches: false`, así que `useMediaQuery(up('md'))` es `false` y se renderiza
 * el layout compacto — exactamente la rama bajo prueba.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { TreasureItem } from '../src/types';

vi.mock('../src/contexts/ThemeContext', () => ({
  useThemeMode: () => ({ mode: 'light' }),
}));
vi.mock('../src/hooks/useTRM', () => ({
  useTRM: () => ({ trmRate: 4000, isLoading: false }),
}));
// La galería y la hoja de pago no participan del orden bajo prueba; se
// sustituyen por marcadores para que el test no dependa de sus internals.
vi.mock('../src/components/media/MediaGallery', () => ({
  default: () => <div data-testid="gallery" />,
}));
vi.mock('../src/components/checkout/CheckoutSheet', () => ({
  default: () => null,
}));
// La ficha técnica sí participa: un solo marcador al inicio basta para saber
// dónde empieza. El resto de las piezas se anulan.
vi.mock('../src/pages/treasure/ProductDetail/gemSheet/GemSheetParts', () => ({
  FormulaPanel: () => <div data-testid="spec-sheet-start" />,
  SpecGroups: () => null,
  GemStats: () => null,
  GemPills: () => null,
  RelatoBlock: () => null,
  TrustCard: () => null,
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

import { PublicProductView } from '../src/pages/vitrina/PublicProductView';

const pieza: TreasureItem = {
  item: 544,
  nombre: 'Viaje Estelar',
  peso: 4.1,
  precioCOP: 186_030_176,
  categoria: 'Gema',
  coleccion: 'DISPONIBLE',
} as TreasureItem;

afterEach(cleanup);

describe('PublicProductView — orden del precio en el layout compacto', () => {
  it('el precio aparece ANTES de la ficha técnica', () => {
    render(
      <PublicProductView
        product={pieza}
        pricing={{ multiplier: 1, currency: 'COP' }}
        senderPhone="573001234567"
        vitrinaToken="TOKEN123"
      />,
    );

    const precio = screen.getByText('Precio');
    const ficha = screen.getByTestId('spec-sheet-start');

    // DOCUMENT_POSITION_FOLLOWING: `ficha` viene después de `precio`.
    expect(
      precio.compareDocumentPosition(ficha) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('una pieza sin precio no rompe el layout (no hay bloque de precio)', () => {
    render(
      <PublicProductView
        product={{ ...pieza, precioCOP: 0 } as TreasureItem}
        pricing={{ multiplier: 1, currency: 'COP' }}
        senderPhone="573001234567"
        vitrinaToken="TOKEN123"
      />,
    );
    expect(screen.queryByText('Precio')).toBeNull();
    expect(screen.getByTestId('spec-sheet-start')).toBeTruthy();
  });
});
