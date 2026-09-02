/**
 * /v/<token> — la página pública se abre en el idioma que eligió el asesor.
 *
 * ## Por qué es un test de página y no un Playwright
 *
 * El spec pide un e2e «si el e2e puede sembrar Convex». No puede: el stub en
 * memoria que `VITE_TEST_MODE=1` monta (`src/lib/convex-safe.test-stub.ts`,
 * el que hace posibles los specs de `e2e/`) **no conoce las vitrinas** — cero
 * ocurrencias de «vitrina» en el archivo, medido el 2026-09-01. Sembrar un
 * registro real, en cambio, sería escribir en el deployment de Convex de
 * PRODUCCIÓN, al que este repo apunta.
 *
 * Así que el test entra al nivel de página con el query mockeado, que es la
 * salida que el propio spec nombra. Lo que queda sin cubrir por esta decisión,
 * dicho en voz alta: que el `lang` grabado por el POST real vuelva por el
 * `getByToken` real. Las dos mitades sí están probadas por separado
 * (`tests/vitrina.test.ts` y `tests/vitrinaShareDialogIdioma.test.tsx`); lo que
 * falta es la costura, y es lo que verifica la prueba manual del PR.
 *
 * ## El control negativo
 *
 * Un test que sólo mira el caso en inglés pasaría igual si la página quedara
 * clavada en inglés para todos. Por eso `lang: 'es'` se afirma explícitamente
 * como caso propio, y la lista de ids también.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { translations } from '../src/locales';
import type { TreasureItem } from '../src/types';

/** El documento que devuelve `vitrinas.getByToken`, cambiado por cada test. */
let tokenDoc: Record<string, unknown> | null | undefined;

vi.mock('../src/lib/convex-safe', () => ({
  useConvexQuery: (_ref: unknown, args: unknown) =>
    args === 'skip' ? undefined : tokenDoc,
  convexApi: { vitrinas: { getByToken: 'vitrinas:getByToken' } },
  convexReady: true,
}));
vi.mock('../src/hooks/useTreasure', () => ({
  useTreasure: () => ({ treasure: catalogo, isLoadingSheets: false }),
}));
vi.mock('../src/hooks/useAsesores', () => ({
  useAsesores: () => ({ asesores: [] }),
}));
vi.mock('../src/hooks/useTRM', () => ({
  useTRM: () => ({ trmRate: 4000, isLoading: false }),
}));
vi.mock('../src/hooks/useCart', () => ({
  useCart: () => ({
    addToCart: () => {},
    isInCart: () => false,
    cartCount: 0,
  }),
}));
vi.mock('../src/hooks/useResaleOffers', () => ({
  useResaleOffers: () => ({ resaleIndex: new Map() }),
}));
vi.mock('../src/components/checkout/CarritoFlotante', () => ({
  default: () => null,
}));
// La grilla se sustituye por su nombre: lo que se prueba es el MARCO
// (caption, pantallas de estado, `lang` del documento), no cómo pinta la ficha.
vi.mock('../src/components/treasure/GridCard', () => ({
  default: ({ item }: { item: TreasureItem }) => (
    <div data-testid={`card-${item.item}`}>{item.nombre}</div>
  ),
}));
// Espeja la tabla de traducciones que recibe, para probar que baja por props
// y no se re-deriva adentro (dos derivaciones se separan con el tiempo).
vi.mock('../src/pages/vitrina/PublicProductView', () => ({
  PublicProductView: ({ tv }: { tv?: { consultWhatsApp: string } }) => (
    <div data-testid="ficha" data-consult={tv?.consultWhatsApp ?? 'SIN-TV'} />
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
window.scrollTo = (() => {}) as unknown as typeof window.scrollTo;

import VitrinaPage from '../src/pages/vitrina/VitrinaPage';

const catalogo = [
  {
    item: 544,
    nombre: 'Viaje Estelar',
    peso: 4.1,
    precioCOP: 186_030_176,
    categoria: 'Gema',
    coleccion: 'DISPONIBLE',
  },
  {
    item: 546,
    nombre: 'Aurora',
    peso: 2.2,
    precioCOP: 92_000_000,
    categoria: 'Gema',
    coleccion: 'DISPONIBLE',
  },
] as unknown as TreasureItem[];

function abrir(code: string) {
  return render(
    <MemoryRouter initialEntries={[`/v/${code}`]}>
      <Routes>
        <Route path="/v/:code" element={<VitrinaPage />} />
        <Route path="/v/:code/:itemId" element={<VitrinaPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const CAPTION_ES = translations.es.vitrina.caption.replace('{n}', '2');
const CAPTION_EN = translations.en.vitrina.caption.replace('{n}', '2');

beforeEach(() => {
  document.documentElement.lang = 'es';
  tokenDoc = undefined;
});
afterEach(cleanup);

describe('VitrinaPage — el idioma del enlace', () => {
  it('con `lang: "en"` el marco está en inglés y el documento dice `en`', () => {
    tokenDoc = {
      itemIds: [544, 546],
      currency: 'COP',
      multiplier: 1,
      lang: 'en',
    };
    abrir('AB3K9P2Q4R7S');

    expect(screen.getByText(CAPTION_EN)).toBeTruthy();
    expect(screen.queryByText(CAPTION_ES)).toBeNull();
    expect(document.documentElement.lang).toBe('en');
  });

  it('con `lang: "es"` el marco está en español y el documento dice `es` — control negativo', () => {
    tokenDoc = {
      itemIds: [544, 546],
      currency: 'COP',
      multiplier: 1,
      lang: 'es',
    };
    abrir('AB3K9P2Q4R7S');

    expect(screen.getByText(CAPTION_ES)).toBeTruthy();
    expect(screen.queryByText(CAPTION_EN)).toBeNull();
    expect(document.documentElement.lang).toBe('es');
  });

  it('un registro viejo SIN `lang` se lee como español — sin migrar una fila', () => {
    tokenDoc = { itemIds: [544, 546], currency: 'COP', multiplier: 1 };
    abrir('AB3K9P2Q4R7S');

    expect(screen.getByText(CAPTION_ES)).toBeTruthy();
    expect(document.documentElement.lang).toBe('es');
  });

  it('un enlace de lista de ids queda en español — no tiene registro ni idioma elegido', () => {
    tokenDoc = { itemIds: [999], lang: 'en' }; // no debe consultarse siquiera
    abrir('544-546');

    expect(screen.getByText(CAPTION_ES)).toBeTruthy();
    expect(document.documentElement.lang).toBe('es');
  });

  it('con una sola pieza usa la frase en singular', () => {
    tokenDoc = { itemIds: [544], currency: 'COP', multiplier: 1, lang: 'en' };
    abrir('AB3K9P2Q4R7S');

    // Con una sola pieza la página abre la ficha, no la grilla — así que lo que
    // se comprueba es que la tabla en inglés bajó por props.
    expect(screen.getByTestId('ficha').getAttribute('data-consult')).toBe(
      translations.en.vitrina.consultWhatsApp,
    );
  });

  it('la pantalla de VENCIDA también se traduce — el idioma sobrevive al vencimiento', () => {
    // Vencida: `getByToken` omite el precio pero conserva `lang`.
    tokenDoc = { itemIds: [544, 546], vencida: true, lang: 'en' };
    abrir('AB3K9P2Q4R7S');

    expect(screen.getByText(translations.en.vitrina.expiredTitle)).toBeTruthy();
    expect(screen.getByText(translations.en.vitrina.expiredCta)).toBeTruthy();
    expect(screen.queryByText(translations.es.vitrina.expiredTitle)).toBeNull();
    expect(document.documentElement.lang).toBe('en');
  });

  it('la pantalla de ENLACE NO DISPONIBLE queda en español cuando no hay registro', () => {
    // Sin registro no hay idioma elegido: el español es lo único honesto.
    tokenDoc = null;
    abrir('AB3K9P2Q4R7S');

    expect(
      screen.getByText(translations.es.vitrina.unavailableTitle),
    ).toBeTruthy();
  });

  it('al desmontar devuelve el `lang` del documento al valor que tenía', () => {
    document.documentElement.lang = 'fr';
    tokenDoc = {
      itemIds: [544, 546],
      currency: 'COP',
      multiplier: 1,
      lang: 'en',
    };
    const { unmount } = abrir('AB3K9P2Q4R7S');

    expect(document.documentElement.lang).toBe('en');
    unmount();
    // Un asesor que abre su propio enlace y vuelve a la app no debe quedarse
    // con el documento marcado en el idioma del cliente.
    expect(document.documentElement.lang).toBe('fr');
  });
});

/**
 * El requisito que NO tiene prueba automática acá y sí importa: la página no
 * llama a `setLanguage`. `LanguageContext` no se monta en esta superficie, así
 * que un llamado lanzaría («useLanguage must be used within LanguageProvider»)
 * y estos tests estarían rojos — pero eso es un accidente afortunado, no una
 * afirmación. Esto lo vuelve explícito.
 */
describe('VitrinaPage — no toca el idioma de la app del asesor', () => {
  it('no llama a `useLanguage()` ni a `setLanguage(...)`', async () => {
    const fuente = await import('node:fs').then((fs) =>
      fs.readFileSync('src/pages/vitrina/VitrinaPage.tsx', 'utf8'),
    );
    // Sintaxis de llamada, no la palabra suelta: los comentarios de este
    // archivo nombran `setLanguage` justamente para explicar por qué NO se
    // llama, y una búsqueda de subcadena castigaría esa explicación.
    expect(fuente).not.toMatch(/\buseLanguage\s*\(/);
    expect(fuente).not.toMatch(/\bsetLanguage\s*\(/);
    // Y tampoco lo importa, que es la única vía para llamarlo.
    expect(fuente).not.toMatch(/from\s+['"].*LanguageContext['"]/);
  });
});
