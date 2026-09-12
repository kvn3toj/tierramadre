/**
 * `/cart` — el resumen dice la verdad sobre lo que se puede cobrar.
 *
 * ## Qué defiende exactamente
 *
 * El carrito viejo mostraba «$ 0» para una pieza sin precio y la sumaba al
 * total como si fuera un cobro de cero. El servidor la rechaza
 * (`ZERO_TOTAL` en `convex/ghl.ts`) y `hayPiezaSinPrecio` ya bloqueaba la
 * hoja, así que el cliente llegaba a «Pagar» para chocarse con un error que
 * la pantalla anterior podía haberle explicado. Este test fija las tres
 * cosas que hacen que eso no vuelva:
 *
 *   1. el conteo separa «piezas» de «piezas con precio»,
 *   2. la pieza sin precio se nombra («Sin precio cargado / Consultar») en vez
 *      de mentir con una cifra,
 *   3. «Pagar» no existe mientras haya una pieza sin precio — y sí existe en
 *      cuanto todas lo tienen. Las dos mitades se afirman: un test que sólo
 *      mirara la ausencia pasaría igual si el botón hubiera desaparecido para
 *      siempre.
 *
 * ## Y las tres ramas de WhatsApp
 *
 * `handleSendInquiry` ramifica en orden cliente → invitado → staff. El orden
 * es la parte frágil (un `isCliente` que se evalúe después del `isGuest`
 * manda al cliente registrado por la línea de su invitador), así que se
 * prueban las dos primeras ramas con el control negativo cruzado: cuando
 * dispara la casa, el invitador NO se llama.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { translations } from '../src/locales';
import type { CartItem } from '../src/types/cart';

const mocks = vi.hoisted(() => ({
  items: [] as CartItem[],
  esCliente: false,
  openWhatsAppToInviter: vi.fn(),
  openWhatsAppToHouse: vi.fn(),
  openWhatsAppToAdmin: vi.fn(),
  removeFromCart: vi.fn(),
  clearCart: vi.fn(),
}));

vi.mock('../src/hooks/useCart', () => ({
  useCart: () => ({
    cartItems: mocks.items,
    isInCart: () => false,
    addToCart: () => {},
    removeFromCart: mocks.removeFromCart,
    clearCart: mocks.clearCart,
    cartCount: mocks.items.length,
    getCartTotal: () => ({
      cop: mocks.items.reduce((s, i) => s + (i.precioCOP || 0), 0),
      usd: 0,
    }),
  }),
}));

vi.mock('../src/hooks/useAuth', () => ({
  useIsGuest: () => true,
  useIsCliente: () => mocks.esCliente,
  useGuestCanSeePrices: () => true,
}));

vi.mock('../src/hooks/usePermissions', () => ({
  useCanShareVitrina: () => false,
}));

vi.mock('../src/hooks/useWhatsAppContact', () => ({
  useWhatsAppContact: () => ({
    openWhatsAppToInviter: mocks.openWhatsAppToInviter,
    openWhatsAppToAdmin: mocks.openWhatsAppToAdmin,
    openWhatsAppToHouse: mocks.openWhatsAppToHouse,
    isLoading: false,
    error: null,
    admins: [],
    inviterName: 'María',
    hasInviter: true,
  }),
}));

vi.mock('../src/hooks/useCurrentAsesor', () => ({
  useCurrentAsesor: () => ({ asesor: null }),
}));

vi.mock('../src/contexts/CurrencyContext', () => ({
  useCurrency: () => ({ multiplier: 1 }),
  useCurrencyFormat: () => ({ formatCurrency: (n: number) => `$${n}` }),
}));

vi.mock('../src/contexts/ThemeContext', () => ({
  useThemeMode: () => ({ mode: 'light' }),
}));

// Los tres diálogos se apagan: acá se prueba la PÁGINA, y montarlos traería
// Convex y el formulario de pago a un test que no habla de ninguno.
vi.mock('../src/components/cart/AdminSelectDialog', () => ({
  default: () => null,
}));
vi.mock('../src/components/vitrina/VitrinaShareDialog', () => ({
  default: () => null,
}));
vi.mock('../src/components/checkout/CheckoutSheet', () => ({
  default: () => null,
}));

import CartPage from '../src/pages/CartPage';

const t = translations.es.cart;

const pieza = (
  item: number,
  nombre: string,
  precioCOP: number,
  extra: Partial<CartItem> = {},
): CartItem => ({
  itemId: item,
  item,
  nombre,
  precioCOP,
  addedAt: '2026-09-09T00:00:00.000Z',
  ...extra,
});

const CON_UNA_SIN_PRECIO: CartItem[] = [
  pieza(544, 'Viaje Estelar', 186_030_176, {
    peso: 4.1,
    certificateUrl: 'https://drive.example/cert-544',
  }),
  pieza(546, 'Alba Serena', 90_000_000, { peso: 2.5 }),
  pieza(548, 'Umbral', 0, { peso: 3 }),
];

const TODAS_CON_PRECIO: CartItem[] = CON_UNA_SIN_PRECIO.map((p) =>
  p.item === 548 ? { ...p, precioCOP: 42_000_000 } : p,
);

const montar = () =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <CartPage />
      </LanguageProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  mocks.items = CON_UNA_SIN_PRECIO;
  mocks.esCliente = false;
  mocks.openWhatsAppToInviter.mockReset();
  mocks.openWhatsAppToHouse.mockReset();
  mocks.openWhatsAppToAdmin.mockReset();
});

afterEach(cleanup);

describe('CartPage — el resumen de «Mi Selección»', () => {
  // El conteo aparece DOS veces a propósito (encabezado y tarjeta de resumen,
  // como en el mockup aprobado), así que se consulta dentro del resumen en vez
  // de con un `getByText` global — que se rompería por ambigüedad, no por
  // ausencia.
  it('cuenta las piezas y las piezas con precio por separado', () => {
    montar();

    expect(
      screen.getAllByText(t.piecesSelected.replace('{n}', '3')).length,
    ).toBeGreaterThan(0);

    const resumen = within(screen.getByTestId('cart-resumen'));
    expect(resumen.getByText(t.piecesSelected.replace('{n}', '3'))).toBeTruthy();
    expect(resumen.getByText(t.withPrice.replace('{n}', '2'))).toBeTruthy();
    expect(resumen.getByText(t.totalToCharge)).toBeTruthy();
    // El total excluye la pieza sin precio: 186.030.176 + 90.000.000.
    expect(resumen.getByText('$276030176')).toBeTruthy();
  });

  it('nombra la pieza sin precio en vez de mostrarle un cero', () => {
    montar();

    expect(screen.getByText(t.unpricedLabel)).toBeTruthy();
    expect(screen.getByText(t.unpricedAction)).toBeTruthy();
    expect(screen.getByText(t.unpricedNotice)).toBeTruthy();
  });

  it('sin precio en alguna pieza no hay «Pagar»', () => {
    montar();

    expect(screen.queryByRole('button', { name: t.pay })).toBeNull();
  });

  it('con todas las piezas cotizadas aparece «Pagar» y se va el aviso', () => {
    mocks.items = TODAS_CON_PRECIO;
    montar();

    expect(screen.getByRole('button', { name: t.pay })).toBeTruthy();
    expect(screen.queryByText(t.unpricedNotice)).toBeNull();
    expect(screen.queryByText(t.unpricedLabel)).toBeNull();
    expect(
      within(screen.getByTestId('cart-resumen')).getByText(
        t.withPrice.replace('{n}', '3'),
      ),
    ).toBeTruthy();
  });

  it('el invitado manda su consulta a quien lo invitó', () => {
    montar();

    fireEvent.click(screen.getByRole('button', { name: t.sendWhatsApp }));

    expect(mocks.openWhatsAppToInviter).toHaveBeenCalledWith(
      CON_UNA_SIN_PRECIO,
    );
    expect(mocks.openWhatsAppToHouse).not.toHaveBeenCalled();
  });

  it('el cliente registrado va a la línea de la casa, no a un invitador', () => {
    mocks.esCliente = true;
    montar();

    fireEvent.click(screen.getByRole('button', { name: t.sendWhatsApp }));

    expect(mocks.openWhatsAppToHouse).toHaveBeenCalledWith(CON_UNA_SIN_PRECIO);
    expect(mocks.openWhatsAppToInviter).not.toHaveBeenCalled();
  });
});
