/**
 * PublicProductView — el certificado llega al carrusel de la vitrina.
 *
 * La ficha interna (`/p/N`, ProductDetailPage) agrega el certificado como
 * última diapositiva desde 6828e1e; la vitrina compartida (`/v/<token>`) — la
 * superficie que un cliente real recibe — no lo hacía: sólo tenía el link
 * «Ver» de Trazabilidad. Detectado en el recorrido de UI del 2026-08-24
 * (docs/estado-sesiones.md, entrada 14:20, punto C).
 *
 * Mismas reglas que la ficha: sólo una imagen puede ser diapositiva (un PDF
 * queda link-only), y va al final para no correr los índices de las fotos.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { TreasureItem } from '../src/types';
import type { MediaItem } from '../src/components/media/types';

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
// La galería se sustituye por un espejo de su prop `media`: lo que se prueba
// es QUÉ diapositivas recibe, no cómo las pinta.
vi.mock('../src/components/media/MediaGallery', () => ({
  default: ({ media }: { media: MediaItem[] }) => (
    <div data-testid="gallery">
      {media.map((m) => (
        <span key={m.id} data-testid={`slide-${m.category}`} data-url={m.url} />
      ))}
    </div>
  ),
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

const base: TreasureItem = {
  item: 544,
  nombre: 'Viaje Estelar',
  peso: 4.1,
  precioCOP: 186_030_176,
  categoria: 'Gema',
  coleccion: 'DISPONIBLE',
  imagen: 'https://drive.google.com/uc?export=view&id=FOTO1',
} as TreasureItem;

const pricing = { multiplier: 1, currency: 'COP' as const };

afterEach(cleanup);

describe('PublicProductView — certificado en el carrusel de la vitrina', () => {
  it('con certificateUrl de imagen, la última diapositiva es el certificado', () => {
    render(
      <PublicProductView
        product={
          {
            ...base,
            certificateUrl:
              'https://drive.google.com/uc?export=view&id=CERT544',
          } as TreasureItem
        }
        pricing={pricing}
        senderPhone="573001234567"
      />,
    );
    const slides = screen
      .getAllByTestId(/^slide-/)
      .map((el) => el.getAttribute('data-testid'));
    expect(slides[slides.length - 1]).toBe('slide-certificate');
  });

  it('un certificado .pdf NO entra al carrusel (queda link-only)', () => {
    render(
      <PublicProductView
        product={
          {
            ...base,
            certificateUrl: 'https://example.com/cert-544.pdf',
          } as TreasureItem
        }
        pricing={pricing}
        senderPhone="573001234567"
      />,
    );
    expect(screen.queryByTestId('slide-certificate')).toBeNull();
  });

  it('sin certificateUrl el carrusel queda como estaba', () => {
    render(
      <PublicProductView
        product={base}
        pricing={pricing}
        senderPhone="573001234567"
      />,
    );
    expect(screen.queryByTestId('slide-certificate')).toBeNull();
    expect(screen.getByTestId('slide-hero')).toBeTruthy();
  });
});
