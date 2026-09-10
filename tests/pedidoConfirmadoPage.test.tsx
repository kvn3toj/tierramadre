/**
 * /pedido-confirmado/:saleId — las cinco pantallas, en el idioma del pago.
 *
 * ## Por qué es un test de página y no un Playwright
 *
 * Wompi redirige aquí desde fuera; el estado de la venta lo trae una
 * suscripción viva de Convex (`sales.estadoPublico`). El stub en memoria que
 * monta `VITE_TEST_MODE=1` no conoce ventas, y sembrar una de verdad sería
 * escribir en el deployment de PRODUCCIÓN. Así que el query se mockea y el
 * test entra al nivel de página, que es donde vive la máquina de estados.
 *
 * ## El control negativo
 *
 * `reservada` es el estado en el que aterriza el cliente que YA pagó, antes de
 * que el webhook llegue. Un test que sólo mirara «confirmada» pasaría igual si
 * la página tratara `reservada` como error, que es exactamente el fallo que
 * esta página existe para evitar. Por eso el caso `reservada` afirma, además
 * del titular de confirmación, que NO aparece el texto de cancelación — y hay
 * un caso con un estado inventado (`lo-que-sea`) que debe caer en el mismo
 * lugar.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { translations } from '../src/locales';
import { SESSION_KEYS } from '../src/constants/storage-keys';
import { formatCurrency } from '../src/utils/formatting';

/** El documento que devuelve `sales.estadoPublico`, cambiado por cada test. */
let saleDoc: Record<string, unknown> | null | undefined;

vi.mock('../src/lib/convex-safe', () => ({
  useConvexQuery: (_ref: unknown, args: unknown) =>
    args === 'skip' ? undefined : saleDoc,
  convexApi: { sales: { estadoPublico: 'sales:estadoPublico' } },
  convexReady: true,
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

import PedidoConfirmadoPage, {
  CONFIRMANDO_AVISO_MS,
} from '../src/pages/PedidoConfirmadoPage';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { ThemeProvider } from '../src/contexts/ThemeContext';

const SALE_ID = 'VB-0001';
const TOTAL = 186_030_176;

/**
 * `formatCurrency` usa el espacio duro que impone `Intl` en es-CO, y el
 * normalizador de Testing Library lo colapsa a espacio normal en el DOM. Sin
 * esto el test falla por el separador, no por la cifra.
 */
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

const es = translations.es.checkout;
const en = translations.en.checkout;
const fr = translations.fr.checkout;

/**
 * Los dos providers reales, en el mismo orden que `src/main.tsx` los monta por
 * encima de `InvitationRouter` — la ruta es pública, pero NO huérfana de tema
 * ni de idioma.
 */
function abrir(query = '') {
  return render(
    <LanguageProvider>
      <ThemeProvider>
        <MemoryRouter
          initialEntries={[`/pedido-confirmado/${SALE_ID}${query}`]}
        >
          <Routes>
            <Route
              path="/pedido-confirmado/:saleId"
              element={<PedidoConfirmadoPage />}
            />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </LanguageProvider>,
  );
}

beforeEach(() => {
  saleDoc = undefined;
  sessionStorage.clear();
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('PedidoConfirmadoPage — la máquina de cinco estados', () => {
  it('`undefined` es carga, no error', () => {
    saleDoc = undefined;
    abrir();
    expect(screen.getByText(es.pedidoLoadingBody)).toBeTruthy();
    expect(screen.queryByText(es.pedidoNotFoundTitle)).toBeNull();
  });

  it('`null` es «no encontramos ese pedido»', () => {
    saleDoc = null;
    abrir();
    expect(screen.getByText(es.pedidoNotFoundTitle)).toBeTruthy();
  });

  it('`reservada` es confirmación en curso — NUNCA cancelación', () => {
    saleDoc = { saleId: SALE_ID, estado: 'reservada', totalCOP: TOTAL };
    abrir();
    expect(screen.getByText(es.pedidoConfirmingTitle)).toBeTruthy();
    expect(screen.queryByText(es.pedidoCancelledTitle)).toBeNull();
  });

  it('un estado desconocido cae en confirmación, no en error', () => {
    saleDoc = { saleId: SALE_ID, estado: 'lo-que-sea', totalCOP: TOTAL };
    abrir();
    expect(screen.getByText(es.pedidoConfirmingTitle)).toBeTruthy();
    expect(screen.queryByText(es.pedidoNotFoundTitle)).toBeNull();
    expect(screen.queryByText(es.pedidoCancelledTitle)).toBeNull();
  });

  it('`confirmada` muestra el total en COP', () => {
    saleDoc = { saleId: SALE_ID, estado: 'confirmada', totalCOP: TOTAL };
    abrir();
    expect(screen.getByText(es.pedidoConfirmedTitle)).toBeTruthy();
    expect(screen.getByText(norm(formatCurrency(TOTAL, 'COP')))).toBeTruthy();
  });

  it('`cancelada` ofrece un WhatsApp que lleva el número del pedido', () => {
    saleDoc = { saleId: SALE_ID, estado: 'cancelada', totalCOP: TOTAL };
    abrir();
    expect(screen.getByText(es.pedidoCancelledTitle)).toBeTruthy();
    const enlace = screen.getByRole('link', { name: es.pedidoWhatsApp });
    const href = enlace.getAttribute('href') ?? '';
    expect(href).toContain('wa.me');
    expect(href).toContain(SALE_ID);
  });
});

describe('PedidoConfirmadoPage — la salida cuando el webhook no llega', () => {
  it(`a los ${CONFIRMANDO_AVISO_MS} ms aparece el aviso, y el titular no cambia`, () => {
    vi.useFakeTimers();
    saleDoc = { saleId: SALE_ID, estado: 'reservada', totalCOP: TOTAL };
    abrir();

    const avisoEsperado = es.pedidoSlowLine.replace('{saleId}', SALE_ID);
    expect(screen.queryByText(avisoEsperado)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(CONFIRMANDO_AVISO_MS);
    });

    expect(screen.getByText(avisoEsperado)).toBeTruthy();
    // El tono no se degrada: sigue siendo «estamos confirmando», no un error.
    expect(screen.getByText(es.pedidoConfirmingTitle)).toBeTruthy();
    expect(screen.getAllByRole('link', { name: es.pedidoWhatsApp }).length).toBe(
      1,
    );
  });
});

describe('PedidoConfirmadoPage — el idioma del pago', () => {
  it('`?lang=en` gana sobre el contexto', () => {
    saleDoc = { saleId: SALE_ID, estado: 'reservada', totalCOP: TOTAL };
    abrir('?lang=en');
    expect(screen.getByText(en.pedidoConfirmingTitle)).toBeTruthy();
    expect(screen.queryByText(es.pedidoConfirmingTitle)).toBeNull();
  });

  it('sin query, el handoff de sessionStorage manda', () => {
    sessionStorage.setItem(SESSION_KEYS.CHECKOUT_LANG, 'fr');
    saleDoc = { saleId: SALE_ID, estado: 'reservada', totalCOP: TOTAL };
    abrir();
    expect(screen.getByText(fr.pedidoConfirmingTitle)).toBeTruthy();
    expect(screen.queryByText(es.pedidoConfirmingTitle)).toBeNull();
  });
});
