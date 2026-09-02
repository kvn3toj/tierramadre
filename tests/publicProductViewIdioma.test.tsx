/**
 * PublicProductView — los botones de la ficha hablan el idioma del enlace.
 *
 * Va en su propio archivo y no dentro de `vitrinaPageIdioma.test.tsx` porque
 * aquel sustituye `PublicProductView` por un espejo de sus props: allá se
 * prueba que la tabla BAJA, acá que se USA. Con el mock puesto no se puede
 * hacer lo segundo.
 *
 * El prop `tv` es opcional y cae al español. Eso no es indecisión: los tests
 * que ya existían (`publicProductViewCertificado`,
 * `publicProductViewOrdenPrecio`) montan esta vista sin `tv`, y el catálogo
 * público la usa igual. Un prop obligatorio los habría roto a todos para no
 * ganar nada — el default correcto ya es el español.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { translations } from '../src/locales';
import type { TreasureItem } from '../src/types';

vi.mock('../src/contexts/ThemeContext', () => ({
  useThemeMode: () => ({ mode: 'light' }),
}));
vi.mock('../src/hooks/useTRM', () => ({
  useTRM: () => ({ trmRate: 4000, isLoading: false }),
}));
vi.mock('../src/components/checkout/CheckoutSheet', () => ({
  default: () => null,
}));
vi.mock('../src/pages/treasure/ProductDetail/gemSheet/GemSheetParts', () => ({
  FormulaPanel: () => null,
  SpecGroups: () => null,
  GemStats: () => null,
  GemPills: () => null,
  RelatoBlock: () => null,
  TrustCard: () => null,
}));
vi.mock('../src/components/media/MediaGallery', () => ({
  default: () => null,
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
window.scrollTo = (() => {}) as unknown as typeof window.scrollTo;

import { PublicProductView } from '../src/pages/vitrina/PublicProductView';

const producto: TreasureItem = {
  item: 544,
  nombre: 'Viaje Estelar',
  peso: 4.1,
  precioCOP: 186_030_176,
  categoria: 'Gema',
  coleccion: 'DISPONIBLE',
  estado: 'DISPONIBLE',
} as TreasureItem;

const pricing = { multiplier: 1, currency: 'COP' as const };

afterEach(cleanup);

describe('PublicProductView — el idioma del enlace', () => {
  it('con `tv` en inglés los botones están en inglés', () => {
    render(
      <PublicProductView
        product={producto}
        pricing={pricing}
        senderPhone="573001234567"
        vitrinaToken="AB3K9P2Q4R7S"
        onAddToCart={() => {}}
        onBack={() => {}}
        tv={translations.en.vitrina}
      />,
    );

    const en = translations.en.vitrina;
    expect(
      screen.getByRole('button', { name: en.consultWhatsApp }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: en.pay })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: en.addToSelection }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: en.back })).toBeTruthy();
    expect(screen.getByText(en.price)).toBeTruthy();
    expect(screen.getByText(en.footerTagline)).toBeTruthy();

    // Y ni rastro del español — el control negativo.
    const es = translations.es.vitrina;
    expect(screen.queryByText(es.consultWhatsApp)).toBeNull();
    expect(screen.queryByText(es.footerTagline)).toBeNull();
  });

  it('sin `tv` sigue en español — el catálogo público no cambia', () => {
    render(
      <PublicProductView
        product={producto}
        pricing={pricing}
        senderPhone="573001234567"
        vitrinaToken="AB3K9P2Q4R7S"
        onAddToCart={() => {}}
        onBack={() => {}}
      />,
    );

    const es = translations.es.vitrina;
    expect(
      screen.getByRole('button', { name: es.consultWhatsApp }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: es.pay })).toBeTruthy();
    expect(screen.getByRole('button', { name: es.back })).toBeTruthy();
    expect(screen.getByText(es.footerTagline)).toBeTruthy();
  });

  it('«En tu selección» también se traduce cuando la pieza ya está en el carrito', () => {
    render(
      <PublicProductView
        product={producto}
        pricing={pricing}
        senderPhone="573001234567"
        onAddToCart={() => {}}
        isInCart
        tv={translations.en.vitrina}
      />,
    );

    expect(
      screen.getByRole('button', { name: translations.en.vitrina.inSelection }),
    ).toBeTruthy();
  });
});
